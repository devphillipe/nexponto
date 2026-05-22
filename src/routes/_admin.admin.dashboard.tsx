import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Users, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Admin" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useProfile();

  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [emps, actives, todayEntries] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }),
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("active", true),
        supabase
          .from("time_entries")
          .select("employee_id", { count: "exact", head: true })
          .eq("entry_date", today),
      ]);
      return {
        total: emps.count ?? 0,
        active: actives.count ?? 0,
        todayPunches: todayEntries.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Funcionários", value: stats?.total ?? "—", icon: Users },
    { label: "Ativos", value: stats?.active ?? "—", icon: CheckCircle2 },
    { label: "Batidas hoje", value: stats?.todayPunches ?? "—", icon: Clock },
    { label: "Pendências", value: "—", icon: AlertCircle },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Painel do escritório,</p>
        <h1 className="font-display text-3xl font-semibold">{profile?.tenant_name}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass-card rounded-xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {c.label}
              </span>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="font-display text-3xl font-semibold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-6">
        <h2 className="mb-2 font-display text-lg font-semibold">Próximos passos</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>1. Cadastre funcionários em <strong className="text-foreground">Funcionários → Novo</strong>.</li>
          <li>2. Compartilhe e-mail + senha provisória com cada funcionário.</li>
          <li>3. Acompanhe as batidas em <strong className="text-foreground">Pontos</strong>.</li>
        </ul>
      </div>
    </div>
  );
}
