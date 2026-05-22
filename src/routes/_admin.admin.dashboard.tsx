import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Users, Clock, CheckCircle2, AlertCircle, ArrowUpRight, TrendingUp } from "lucide-react";
import { CardSkeleton } from "@/components/SkeletonLoader";

export const Route = createFileRoute("/_admin/admin/dashboard")({
  head: () => ({ meta: [{ title: "Painel — NexPonto" }] }),
  component: Dashboard,
});

import { useMemo } from "react";

function Dashboard() {
  const { data: profile } = useProfile();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  const cards = useMemo(() => [
    { label: "Total Equipe", value: stats?.total ?? "—", icon: Users, trend: "+2 este mês", color: "text-primary" },
    { label: "Colaboradores Ativos", value: stats?.active ?? "—", icon: CheckCircle2, trend: "Status: OK", color: "text-success" },
    { label: "Batidas Hoje", value: stats?.todayPunches ?? "—", icon: Clock, trend: "Tempo real", color: "text-primary" },
    { label: "Pendências", value: "0", icon: AlertCircle, trend: "Tudo em dia", color: "text-muted-foreground" },
  ], [stats]);

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Bem-vindo, {profile?.full_name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground mt-1 text-lg">Aqui está o resumo do seu escritório hoje.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20 text-primary text-sm font-semibold">
           <TrendingUp className="h-4 w-4" />
           Produtividade em alta
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <div key={c.label} className="glass-card rounded-3xl p-6 group hover:-translate-y-1 transition-all duration-300">
              <div className="mb-4 flex items-center justify-between">
                <div className={`p-3 rounded-2xl bg-muted/50 ${c.color} group-hover:scale-110 transition-transform`}>
                  <c.icon className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">
                  {c.label}
                </span>
                <div className="font-display text-4xl font-bold tracking-tight">{c.value}</div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                 <div className="h-1.5 w-1.5 rounded-full bg-success"></div>
                 {c.trend}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 glass-card rounded-3xl p-8">
           <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-bold">Resumo de Atividades</h2>
              <button className="text-sm font-bold text-primary hover:underline">Ver relatório completo</button>
           </div>
           
           <div className="space-y-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/40 hover:bg-muted/30 transition-colors cursor-default">
                   <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center font-bold text-primary">
                      {item === 1 ? "JD" : item === 2 ? "MA" : "RS"}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">Registro de Ponto - {item === 1 ? "João Silva" : item === 2 ? "Maria Santos" : "Ricardo Oliveira"}</div>
                      <div className="text-xs text-muted-foreground">Entrada registrada às 08:0{item} AM</div>
                   </div>
                   <div className="text-xs font-bold text-success bg-success/10 px-3 py-1 rounded-full">
                      Sincronizado
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="glass-card rounded-3xl p-8 flex flex-col justify-between">
          <div>
            <h2 className="mb-6 font-display text-2xl font-bold">Configuração</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              Seu escritório está configurado corretamente. Veja o que você pode fazer agora:
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 group">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary group-hover:bg-primary-foreground"></div>
                </div>
                <div>
                  <strong className="text-sm block">Gerenciar Equipe</strong>
                  <p className="text-xs text-muted-foreground mt-0.5">Cadastre novos funcionários e cargos.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors">
                   <div className="h-1.5 w-1.5 rounded-full bg-primary group-hover:bg-primary-foreground"></div>
                </div>
                <div>
                  <strong className="text-sm block">Auditoria de Pontos</strong>
                  <p className="text-xs text-muted-foreground mt-0.5">Valide e corrija batidas pendentes.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors">
                   <div className="h-1.5 w-1.5 rounded-full bg-primary group-hover:bg-primary-foreground"></div>
                </div>
                <div>
                  <strong className="text-sm block">Configurações de Jornada</strong>
                  <p className="text-xs text-muted-foreground mt-0.5">Defina horários e tolerâncias.</p>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="mt-10 p-4 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
             <div className="font-bold text-sm mb-1">NexPonto Pro</div>
             <p className="text-[11px] opacity-90 leading-tight">Você está no plano gratuito. Desbloqueie relatórios avançados em PDF.</p>
             <button className="mt-3 w-full bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg py-2 text-xs font-bold transition-all">Fazer Upgrade</button>
          </div>
        </div>
      </div>
    </div>
  );
}
