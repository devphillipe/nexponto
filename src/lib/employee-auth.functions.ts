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

async function findActiveEmployeeLinksByCpf(cpf: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("id, user_id, tenant_id, full_name, active, tenants(name)")
    .eq("cpf", cpf)
    .eq("active", true);

  if (error) throw new Error("Não foi possível localizar o vínculo.");
  return data ?? [];
}

async function getAuthEmail(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

export const signInEmployeeWithCpf = createServerFn({ method: "POST" })
  .inputValidator((data) => SignInSchema.parse(data))
  .handler(async ({ data }) => {
    const generic = "CPF ou senha inválidos.";
    const links = await findActiveEmployeeLinksByCpf(data.cpf);
    if (!links.length) throw new Error(generic);

    const candidateUserIds = Array.from(new Set(links.map((link) => link.user_id)));
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let matchedUserId: string | null = null;
    let matchedSession: { access_token: string; refresh_token: string } | null = null;

    for (const userId of candidateUserIds) {
      const email = await getAuthEmail(userId);
      if (!email) continue;

      const { data: signIn, error } = await client.auth.signInWithPassword({
        email,
        password: data.password,
      });

      if (!error && signIn.session) {
        matchedUserId = userId;
        matchedSession = {
          access_token: signIn.session.access_token,
          refresh_token: signIn.session.refresh_token,
        };
        break;
      }
    }

    if (!matchedUserId || !matchedSession) throw new Error(generic);

    const memberships = links
      .filter((link) => link.user_id === matchedUserId)
      .map((link) => ({
        employee_id: link.id,
        tenant_id: link.tenant_id,
        tenant_name: (link as any).tenants?.name ?? "Escritório",
      }));

    return {
      ...matchedSession,
      memberships,
    };
  });

export const requestEmployeePasswordResetByCpf = createServerFn({ method: "POST" })
  .inputValidator((data) => ResetSchema.parse(data))
  .handler(async ({ data }) => {
    const links = await findActiveEmployeeLinksByCpf(data.cpf);
    const userIds = Array.from(new Set(links.map((link) => link.user_id)));

    // Always report success to avoid CPF/account enumeration.
    // In the normal multi-vínculo model every CPF maps to one auth identity.
    if (userIds.length !== 1) {
      return { sent: true, email: null as string | null };
    }

    const email = await getAuthEmail(userIds[0]!);
    if (!email) return { sent: true, email: null as string | null };

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await client.auth.resetPasswordForEmail(email, {
      redirectTo: data.redirectTo,
    });

    return { sent: true, email: null as string | null };
  });
