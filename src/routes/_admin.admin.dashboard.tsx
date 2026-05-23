import { createFileRoute } from "@tanstack/react-router";
import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Users, Clock, CheckCircle2, AlertCircle, ArrowUpRight, TrendingUp, CheckCircle } from "lucide-react";
import { CardSkeleton } from "@/components/SkeletonLoader";
import { useNavigate } from "@tanstack/react-router";

import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TYPE_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida_almoco: "Saída Almoço",
  retorno_almoco: "Retorno Almoço",
  saida: "Saída Final",
};

export const Route = createFileRoute("/_admin/admin/dashboard")({
  head: () => ({ meta: [{ title: "Painel — NexPonto" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [emps, actives, todayEntries, recentActivities] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", profile!.tenant_id),
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile!.tenant_id)
          .eq("active", true),
        supabase
          .from("time_entries")
          .select("employee_id", { count: "exact", head: true })
          .eq("tenant_id", profile!.tenant_id)
          .eq("entry_date", today),
        supabase
          .from("time_entries")
          .select("id, entry_at, entry_type, employees(full_name)")
          .eq("tenant_id", profile!.tenant_id)
          .order("entry_at", { ascending: false })
          .limit(5),
      ]);
      return {
        total: emps.count ?? 0,
        active: actives.count ?? 0,
        todayPunches: todayEntries.count ?? 0,
        recentActivities: recentActivities.data ?? [],
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="text-left">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Olá, {profile?.full_name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-2 md:mt-3 text-base md:text-xl font-medium">Aqui está o resumo do seu escritório hoje.</p>
        </div>
        <div className="flex items-center self-start gap-3 px-5 py-2.5 bg-primary/10 rounded-2xl border border-primary/20 text-primary text-sm font-bold shadow-sm shadow-primary/5">
           <TrendingUp className="h-4 w-4" />
           Produtividade em alta
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <div key={c.label} className="glass-card rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 group hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 border border-border/40 hover:border-primary/20">
              <div className="mb-4 md:mb-6 flex items-center justify-between">
                <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl bg-gradient-to-br from-muted to-transparent ${c.color} group-hover:scale-110 group-hover:bg-primary/5 transition-all duration-500`}>
                  <c.icon className="h-6 w-6 md:h-7 md:w-7" />
                </div>
                <ArrowUpRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-500" />
              </div>
              <div className="space-y-1 md:space-y-2">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-80">
                  {c.label}
                </span>
                <div className="font-display text-3xl md:text-5xl font-black tracking-tighter text-foreground">{c.value}</div>
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
        <div className="lg:col-span-2 glass-card rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 border border-border/40 shadow-sm">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Resumo de Atividades</h2>
              <button 
                onClick={() => navigate({ to: "/admin/pontos" })}
                className="text-[10px] md:text-sm font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors group flex items-center gap-2"
              >
                Ver completo <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
           </div>
           
           <div className="space-y-6">
              {!stats?.recentActivities?.length ? (
                <div className="text-center py-10 text-muted-foreground">Nenhuma atividade recente.</div>
              ) : (
                stats.recentActivities.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-6 p-6 rounded-[2rem] bg-muted/10 border border-border/20 hover:bg-muted/20 hover:border-primary/10 transition-all duration-300 group">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center font-black text-primary group-hover:scale-105 transition-transform">
                      {item.employees?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-foreground mb-0.5 group-hover:text-primary transition-colors">Registro de Ponto - {item.employees?.full_name}</div>
                      <div className="text-sm text-muted-foreground font-medium">
                        {TYPE_LABEL[item.entry_type]} registrado às {format(new Date(item.entry_at), "HH:mm 'de' dd/MM", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-success bg-success/10 px-4 py-1.5 rounded-full border border-success/20">
                      Sincronizado
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>

        <div className="glass-card rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 flex flex-col justify-between border border-border/40 shadow-sm bg-gradient-to-br from-primary/[0.02] to-transparent">
          <div>
            <h2 className="mb-6 md:mb-8 font-display text-2xl md:text-3xl font-bold tracking-tight">Configuração</h2>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-8 md:mb-10 font-medium">
              Seu escritório está configurado corretamente. Veja o que você pode fazer agora:
            </p>
            <ul className="space-y-6">
              <li className="flex items-start gap-3 group">
                <div className="mt-1 h-5 w-5 rounded-full bg-success/20 border border-success/40 flex items-center justify-center shrink-0 group-hover:bg-success transition-colors">
                  <CheckCircle className="h-3 w-3 text-success group-hover:text-success-foreground" />
                </div>
                <div>
                  <strong className="text-sm block">Gerenciar Equipe</strong>
                  <p className="text-xs text-muted-foreground mt-0.5">Cadastre novos funcionários e cargos.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="mt-1 h-5 w-5 rounded-full bg-success/20 border border-success/40 flex items-center justify-center shrink-0 group-hover:bg-success transition-colors">
                   <CheckCircle className="h-3 w-3 text-success group-hover:text-success-foreground" />
                </div>
                <div>
                  <strong className="text-sm block">Auditoria de Pontos</strong>
                  <p className="text-xs text-muted-foreground mt-0.5">Valide e corrija batidas pendentes.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="mt-1 h-5 w-5 rounded-full bg-success/20 border border-success/40 flex items-center justify-center shrink-0 group-hover:bg-success transition-colors">
                   <CheckCircle className="h-3 w-3 text-success group-hover:text-success-foreground" />
                </div>
                <div>
                  <strong className="text-sm block">Configurações de Jornada</strong>
                  <p className="text-xs text-muted-foreground mt-0.5">Defina horários e tolerâncias.</p>
                </div>
              </li>
            </ul>
          </div>
          
        </div>
      </div>
    </div>
  );
}