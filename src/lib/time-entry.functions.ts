import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PunchSchema = z.object({
  tenant_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  user_agent: z.string().max(500).optional(),
});

const FULL_SEQUENCE = ["entrada", "saida_almoco", "retorno_almoco", "saida"] as const;
const SHORT_SEQUENCE = ["entrada", "saida"] as const;

function localDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const registerOwnPunch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => PunchSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, tenant_id, active, daily_hours")
      .eq("user_id", userId)
      .eq("tenant_id", data.tenant_id)
      .maybeSingle();

    if (employeeError) throw new Error(employeeError.message);
    if (!employee) throw new Error("Funcionário não encontrado.");
    if (!employee.active) throw new Error("Sua conta está inativa.");

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("timezone, default_daily_hours")
      .eq("id", employee.tenant_id)
      .single();

    if (tenantError) throw new Error(tenantError.message);

    const now = new Date();
    const timezone = tenant?.timezone || "America/Sao_Paulo";
    const entryDate = localDateInTimeZone(now, timezone);
    const dailyHours = employee.daily_hours ?? tenant?.default_daily_hours ?? 8;
    const sequence = dailyHours >= 8 ? FULL_SEQUENCE : SHORT_SEQUENCE;

    const { data: entries, error: entriesError } = await supabase
      .from("time_entries")
      .select("entry_type")
      .eq("employee_id", employee.id)
      .eq("entry_date", entryDate);

    if (entriesError) throw new Error(entriesError.message);

    const done = new Set((entries ?? []).map((entry) => entry.entry_type));
    const nextType = sequence.find((type) => !done.has(type));

    if (!nextType) {
      throw new Error("Todos os registros obrigatórios de hoje já foram realizados.");
    }

    const { error: insertError } = await supabase.from("time_entries").insert({
      tenant_id: employee.tenant_id,
      employee_id: employee.id,
      entry_type: nextType,
      entry_at: now.toISOString(),
      entry_date: entryDate,
      source: "automatico",
      created_by: userId,
      user_agent: data.user_agent ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    });

    if (insertError) throw new Error(insertError.message);

    return {
      ok: true,
      entry_type: nextType,
      entry_at: now.toISOString(),
      entry_date: entryDate,
    };
  });
