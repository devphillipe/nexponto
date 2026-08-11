import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const onlyDigits = (v: string) => v.replace(/\D+/g, "");

const CpfSchema = z.string().transform(onlyDigits).pipe(z.string().length(11));

const SignInSchema = z.object({
  cpf: CpfSchema,
  password: z.string().min(1).max(72),
});

const ResetSchema = z.object({
  cpf: CpfSchema,
  redirectTo: z.string().url().max(500),
});

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "seu e-mail";
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(user.length - 2, 2))}@${domain}`;
}

/** Resolve the employee's account email from CPF using admin access (never returned raw). */
async function findEmployeeByCpf(cpf: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("employees")
    .select("user_id, email, active")
    .eq("cpf", cpf)
    .maybeSingle();
  if (!data || !data.active) return null;
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user_id);
  if (!roles?.some((r) => r.role === "employee")) return null;
  return data;
}

export const signInEmployeeWithCpf = createServerFn({ method: "POST" })
  .inputValidator((data) => SignInSchema.parse(data))
  .handler(async ({ data }) => {
    const generic = "CPF ou senha inválidos.";
    const employee = await findEmployeeByCpf(data.cpf);
    if (!employee) throw new Error(generic);

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signIn, error } = await client.auth.signInWithPassword({
      email: employee.email,
      password: data.password,
    });
    if (error || !signIn.session) throw new Error(generic);

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });

export const requestEmployeePasswordResetByCpf = createServerFn({ method: "POST" })
  .inputValidator((data) => ResetSchema.parse(data))
  .handler(async ({ data }) => {
    const employee = await findEmployeeByCpf(data.cpf);
    // Always report success to avoid CPF enumeration.
    if (!employee) return { sent: true, email: null as string | null };

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await client.auth.resetPasswordForEmail(employee.email, {
      redirectTo: data.redirectTo,
    });
    return { sent: true, email: maskEmail(employee.email) };
  });
