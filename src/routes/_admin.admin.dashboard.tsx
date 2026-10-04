import { createFileRoute } from "@tanstack/react-router";
import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Users, Clock, CheckCircle2, AlertCircle, ArrowUpRight, TrendingUp, TrendingDown, Activity, CheckCircle } from "lucide-react";
import { CardSkeleton } from "@/components/SkeletonLoader";
import { useNavigate } from "@tanstack/react-router";

import { useMemo } from "react";
import { format } from "date-fns";
import { worksOn } from "@/lib/work-days";
import { getBrazilNationalHoliday } from "@/lib/brazil-national-holidays";
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
      const today = format(new Date(), "yyyy-MM-dd");
      const todayDate = new Date(`${today}T12:00:00`);
      const monthStart = today.slice(0, 8) + "01";
      const nationalHoliday = getBrazilNationalHoliday(today);

      const [emps, activeEmployees, todayEntries, recentActivities, monthHires, todayEntradas, todayAbsences] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", profile!.tenant_id),
        supabase
          .from("employees")
          .select("id, work_days, hire_date")
          .eq("tenant_id", profile!.tenant_id)
          .eq("active", true),
        supabase
          .from("time_entries")
          .select("id, notes, is_adjustment")
          .eq("tenant_id", profile!.tenant_id)
          .eq("entry_date", today),
        supabase
          .from("time_entries")
          .select("id, entry_at, entry_type, notes, is_adjustment, employees(full_name)")
          .eq("tenant_id", profile!.tenant_id)
          .order("entry_at", { ascending: false })
          .limit(20),
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", profile!.tenant_id)
          .gte("hire_date", monthStart),
        supabase
          .from("time_entries")
          .select("employee_id")
          .eq("tenant_id", profile!.tenant_id)
          .eq("entry_date", today)
          .eq("entry_type", "entrada"),
        supabase
          .from("absences")
          .select("employee_id")
          .eq("tenant_id", profile!.tenant_id)
          .eq("absence_date", today),
      ]);

      const activeList = activeEmployees.data ?? [];
      const activeCount = activeList.length;
      const absentToday = new Set((todayAbsences.data ?? []).map((a: any) => a.employee_id));
      const scheduledToday = nationalHoliday
        ? []
        : activeList.filter((e: any) => {
            const hired = !e.hire_date || String(e.hire_date).slice(0, 10) <= today;
            return hired && worksOn(e.work_days, todayDate) && !absentToday.has(e.id);
          });

      const withEntrada = new Set((todayEntradas.data ?? []).map((e: any) => e.employee_id));
      const presentScheduled = scheduledToday.filter((e: any) => withEntrada.has(e.id)).length;
      const pendencias = Math.max(0, scheduledToday.length - presentScheduled);
      const validTodayPunches = (todayEntries.data ?? []).filter(
        (e: any) => !(e.is_adjustment && e.notes?.startsWith("ABONO:")),
      ).length;
      const validRecentActivities = (recentActivities.data ?? [])
        .filter((e: any) => !(e.is_adjustment && e.notes?.startsWith("ABONO:")))
        .slice(0, 10);

      return {
        total: emps.count ?? 0,
        active: activeCount,
        scheduledToday: scheduledToday.length,
        presentScheduled,
        todayPunches: validTodayPunches,
        recentActivities: validRecentActivities,
        monthHires: monthHires.count ?? 0,
        pendencias,
        nationalHoliday: nationalHoliday?.name ?? null,
      };
    },
  });

  const cards = useMemo(() => {
    const pend = stats?.pendencias ?? 0;
    return [
      {
        label: "Total Equipe",
        value: stats?.total ?? "—",
        icon: Users,
        trend: (stats?.monthHires ?? 0) > 0 ? `+${stats!.monthHires} este mês` : "Sem admissões no mês",
        color: "text-primary",
      },
      {
        label: "Colaboradores Ativos",
        value: stats?.active ?? "—",
        icon: CheckCircle2,
        trend: (stats?.total ?? 0) > (stats?.active ?? 0) ? `${(stats?.total ?? 0) - (stats?.active ?? 0)} inativo(s)` : "Todos ativos",
        color: "text-success",
      },
      { label: "Batidas Hoje", value: stats?.todayPunches ?? "—", icon: Clock, trend: "Tempo real", color: "text-primary" },
      {
        label: "Pendências",
        value: pend,
        icon: AlertCircle,
        trend: stats?.nationalHoliday
          ? "Feriado nacional"
          : pend > 0
            ? "Sem entrada prevista"
            : "Tudo em dia",
        color: pend > 0 ? "text-warning" : "text-muted-foreground",
      },
    ];
  }, [stats]);

  const attendance = useMemo(() => {
    if (stats?.nationalHoliday) {
      return {
        label: `Feriado nacional · ${stats.nationalHoliday}`,
        icon: CheckCircle2,
        tone: "bg-primary/10 border-primary/20 text-primary shadow-none",
      };
    }
    const scheduled = stats?.scheduledToday ?? 0;
    const present = stats?.presentScheduled ?? 0;
    if (!scheduled) {
      return { label: "Sem jornada prevista hoje", icon: Activity, tone: "bg-slate-50 border-border text-muted-foreground shadow-none" };
    }
    const rate = present / scheduled;
    if (rate >= 1) {
      return { label: "Equipe prevista em dia", icon: CheckCircle2, tone: "bg-success/10 border-success/20 text-success shadow-success/5" };
    }
    if (rate >= 0.5) {
      return { label: `${present}/${scheduled} com entrada registrada`, icon: Activity, tone: "bg-primary/10 border-primary/20 text-primary shadow-primary/5" };
    }
    return { label: `${present}/${scheduled} com entrada registrada`, icon: AlertCircle, tone: "bg-warning/10 border-warning/20 text-warning shadow-warning/5" };
  }, [stats]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="text-left">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Olá, {profile?.full_name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-2 md:mt-3 text-base md:text-xl font-medium">Aqui está o resumo do seu escritório hoje.</p>
        </div>
        <div className={`flex items-center self-start gap-3 px-5 py-2.5 rounded-2xl border text-sm font-bold shadow-sm ${attendance.tone}`}>
           <attendance.icon className="h-4 w-4" />
           {attendance.label}
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <div key={c.label} className="glass-card rounded-2xl md:rounded-2xl p-6 md:p-8 group hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 border border-border hover:border-primary/20">
              <div className="mb-4 md:mb-6 flex items-center justify-between">
                <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl bg-gradient-to-br from-muted to-transparent ${c.color} group-hover:scale-110 group-hover:bg-primary/5 transition-all duration-500`}>
                  <c.icon className="h-6 w-6 md:h-7 md:w-7" />
                </div>
                <ArrowUpRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-500" />
              </div>
              <div className="space-y-1 md:space-y-2">
                <span className="text-[10px] md:text-xs font-bold tracking-tight text-muted-foreground opacity-80">
                  {c.label}
                </span>
                <div className="font-display text-3xl md:text-5xl font-extrabold tracking-tighter text-foreground">{c.value}</div>
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
        <div className="lg:col-span-2 glass-card rounded-2xl md:rounded-2xl p-6 md:p-10 border border-border shadow-sm">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Resumo de Atividades</h2>
              <button 
                onClick={() => navigate({ to: "/admin/pontos" })}
                className="text-[10px] md:text-sm font-extrabold tracking-tight text-primary hover:text-primary/80 transition-colors group flex items-center gap-2"
              >
                Ver completo <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
           </div>
           
           <div className="space-y-6">
              {!stats?.recentActivities?.length ? (
                <div className="text-center py-10 text-muted-foreground">Nenhuma atividade recente.</div>
              ) : (
                stats.recentActivities.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-6 p-6 rounded-[2rem] bg-slate-50 border border-border/20 hover:bg-slate-50 hover:border-primary/10 transition-all duration-300 group">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center font-extrabold text-primary group-hover:scale-105 transition-transform">
                      {item.employees?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-foreground mb-0.5 group-hover:text-primary transition-colors">Registro de Ponto - {item.employees?.full_name}</div>
                      <div className="text-sm text-muted-foreground font-medium">
                        {TYPE_LABEL[item.entry_type]} registrado às {format(new Date(item.entry_at), "HH:mm 'de' dd/MM", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="text-[10px] font-extrabold tracking-tight text-success bg-success/10 px-4 py-1.5 rounded-full border border-success/20">
                      Sincronizado
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>

        <div className="glass-card rounded-2xl md:rounded-2xl p-6 md:p-10 flex flex-col justify-between border border-border shadow-sm bg-gradient-to-br from-primary/[0.02] to-transparent">
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