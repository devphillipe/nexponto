import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const workDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1, "Selecione ao menos um dia de trabalho.")
  .max(7)
  .transform((v) => Array.from(new Set(v)).sort((a, b) => a - b));

const CreateEmployeeSchema = z.object({
  work_days: workDaysSchema.optional(),
  full_name: z.string().min(2).max(120),
  email: z.string().email().max(180),
  password: z.string().min(8).max(72),
  cpf: z.string().max(20).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  position: z.string().max(80).optional().nullable(),
  department: z.string().max(80).optional().nullable(),
  hire_date: z.string().optional().nullable(),
  daily_hours: z.number().min(1).max(24).optional().nullable(),
});

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateEmployeeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get admin's tenant + verify admin role using the authed client (RLS).
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    if (profErr || !profile) throw new Error("Perfil não encontrado.");

    const { data: roles, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", profile.tenant_id);
    if (roleErr) throw new Error(roleErr.message);
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Apenas administradores podem cadastrar funcionários.");
    }

    const tenantId = profile.tenant_id;

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("default_daily_hours")
      .eq("id", tenantId)
      .single();
    if (tenantErr) throw new Error(tenantErr.message);
    const defaultDailyHours = tenant?.default_daily_hours ?? 8;

    // Create auth user with provisional password (email auto-confirmed in config).
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { signup_type: "employee", full_name: data.full_name },
      });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Falha ao criar usuário.");
    }
    const newUserId = created.user.id;

    try {
      const { error: pErr } = await supabaseAdmin.from("profiles").insert({
        id: newUserId,
        tenant_id: tenantId,
        full_name: data.full_name,
        email: data.email,
      });
      if (pErr) throw pErr;

      const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
        user_id: newUserId,
        tenant_id: tenantId,
        role: "employee",
      });
      if (rErr) throw rErr;

      const { error: eErr } = await supabaseAdmin.from("employees").insert({
        tenant_id: tenantId,
        user_id: newUserId,
        full_name: data.full_name,
        email: data.email,
        cpf: data.cpf,
        phone: data.phone,
        position: data.position,
        department: data.department,
        hire_date: data.hire_date || null,
        daily_hours: data.daily_hours ?? defaultDailyHours,
        work_days: data.work_days ?? [1, 2, 3, 4, 5],
        active: true,
      });
      if (eErr) throw eErr;
    } catch (e) {
      // Roll back the auth user if downstream inserts failed.
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      throw e instanceof Error ? e : new Error("Falha ao cadastrar funcionário.");
    }

    return { ok: true, user_id: newUserId };
  });

export const toggleEmployeeActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ employee_id: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();
    if (profileError || !profile?.tenant_id) throw new Error("Perfil não encontrado.");

    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", profile.tenant_id);
    if (roleError) throw new Error(roleError.message);
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Apenas administradores podem alterar o status do funcionário.");
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("tenant_id")
      .eq("id", data.employee_id)
      .single();
    if (employeeError || !employee) throw new Error("Funcionário não encontrado.");
    if (employee.tenant_id !== profile.tenant_id) throw new Error("Acesso negado.");

    const { error } = await supabase
      .from("employees")
      .update({ active: data.active })
      .eq("id", data.employee_id)
      .eq("tenant_id", profile.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      id: z.string().uuid(),
      full_name: z.string().min(2).max(120),
      email: z.string().email().max(180),
      cpf: z.string().max(20).optional().nullable(),
      phone: z.string().max(30).optional().nullable(),
      position: z.string().max(80).optional().nullable(),
      department: z.string().max(80).optional().nullable(),
      hire_date: z.string().optional().nullable(),
      daily_hours: z.number().min(1).max(24).optional().nullable(),
      work_days: workDaysSchema.optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify admin role and get admin's tenant
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (profErr || !profile?.tenant_id) {
      throw new Error("Perfil ou escritório não encontrado.");
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", profile.tenant_id);
    
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Apenas administradores podem editar funcionários.");
    }

    const adminTenantId = profile.tenant_id;

    // Get the employee and ensure they belong to the same tenant
    const { data: employee, error: empErr } = await supabase
      .from("employees")
      .select("user_id, tenant_id")
      .eq("id", data.id)
      .single();
    
    if (empErr || !employee) throw new Error("Funcionário não encontrado.");
    if (employee.tenant_id !== adminTenantId) {
      throw new Error("Acesso negado: o funcionário pertence a outro escritório.");
    }

    // Update auth user (email only; password is managed by the employee in their profile)
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      employee.user_id,
      { email: data.email },
    );
    if (authErr) throw new Error(authErr.message);


    // Update profile
    await supabaseAdmin.from("profiles").update({
      full_name: data.full_name,
      email: data.email,
    }).eq("id", employee.user_id);

    // Update employee record
    const { error: finalErr } = await supabaseAdmin.from("employees").update({
      full_name: data.full_name,
      email: data.email,
      cpf: data.cpf,
      phone: data.phone,
      position: data.position,
      department: data.department,
      hire_date: data.hire_date || null,
      daily_hours: data.daily_hours ?? null,
      ...(data.work_days ? { work_days: data.work_days } : {}),
    }).eq("id", data.id);

    if (finalErr) throw new Error(finalErr.message);

    return { ok: true };
  });
