import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { normalizeWorkDays, formatWorkDays } from "@/lib/work-days";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_func/funcionario/resumo")({
  head: () => ({
    meta: [
      { title: "Meu Resumo de Horas — NexPonto" },
      {
        name: "description",
        content:
          "Acompanhe suas horas acumuladas no mês, saldo de banco de horas e o resumo semanal da sua jornada.",
      },
      { property: "og:title", content: "Meu Resumo de Horas — NexPonto" },
      {
        property: "og:description",
        content: "Horas acumuladas no mês, saldo e resumo semanal da sua jornada.",
      },
    ],
  }),
  component: SummaryPage,
});

type Entry = { entry_date: string; entry_at: string; entry_type: string };

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatDur(ms: number) {
  const total = Math.max(0, Math.round(ms / 60000));
  return `${pad(Math.floor(total / 60))}h${pad(total % 60)}`;
}

function workedForDay(items: Entry[]) {
  const get = (t: string) => items.find((e) => e.entry_type === t)?.entry_at;
  const e1 = get("entrada");
  const sa = get("saida_almoco");
  const ra = get("retorno_almoco");
  const sf = get("saida");
  if (!e1) return 0;
  if (!sa && !ra) {
    if (!sf) return 0;
    return Math.max(0, new Date(sf).getTime() - new Date(e1).getTime());
  }
  let total = 0;
  if (sa) total += new Date(sa).getTime() - new Date(e1).getTime();
  if (ra && sf) total += new Date(sf).getTime() - new Date(ra).getTime();
  return Math.max(0, total);
}

function SummaryPage() {
  const { data: profile } = useProfile();

  const { data: employee } = useQuery({
    queryKey: ["my-employee"],
    staleTime: 1000 * 60 * 60,
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, tenant_id, daily_hours, work_days")
        .eq("user_id", profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["my-month-summary", employee?.id, ymd(monthStart)],
    staleTime: 1000 * 60,
    enabled: !!employee,
    queryFn: async () => {
      const from = ymd(monthStart);
      const to = ymd(new Date());
      const [entriesRes, absRes] = await Promise.all([
        supabase
          .from("time_entries")
          .select("entry_date, entry_at, entry_type")
          .eq("employee_id", employee!.id)
          .gte("entry_date", from)
          .lte("entry_date", to)
          .order("entry_at"),
        supabase
          .from("absences")
          .select("absence_date, reason")
          .eq("employee_id", employee!.id)
          .gte("absence_date", from)
          .lte("absence_date", to),
      ]);
      if (entriesRes.error) throw entriesRes.error;
      return {
        entries: (entriesRes.data ?? []) as Entry[],
        absences: absRes.data ?? [],
      };
    },
  });

  const daily = (employee?.daily_hours ?? 8) * 3600_000;

  const stats = useMemo(() => {
    const entries = data?.entries ?? [];
    const absent = new Set((data?.absences ?? []).map((a: any) => a.absence_date));
    const byDay = new Map<string, Entry[]>();
    entries.forEach((e) => {
      const arr = byDay.get(e.entry_date) ?? [];
      arr.push(e);
      byDay.set(e.entry_date, arr);
    });

    const today = new Date();
    const workDays = normalizeWorkDays((employee as any)?.work_days);
    const days: { date: string; worked: number; expected: number; off: boolean }[] = [];
    for (
      let d = new Date(monthStart);
      d <= today;
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    ) {
      const key = ymd(d);
      const isOff = !workDays.includes(d.getDay());
      const worked = workedForDay(byDay.get(key) ?? []);
      const isToday = key === ymd(today);
      const expected = isOff || absent.has(key) || isToday ? 0 : daily;
      days.push({ date: key, worked, expected, off: isOff });
    }

    const worked = days.reduce((s, d) => s + d.worked, 0);
    const expected = days.reduce((s, d) => s + d.expected, 0);
    const daysWorked = days.filter((d) => d.worked > 0).length;

    // Semana atual (segunda a domingo)
    const wd = (today.getDay() + 6) % 7;
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - wd);
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
      const key = ymd(d);
      const found = days.find((x) => x.date === key);
      return {
        date: key,
        label: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i],
        future: d > today,
        worked: found?.worked ?? 0,
        expected: found?.expected ?? 0,
        off: found ? found.off : !workDays.includes(d.getDay()),
      };
    });

    const weekWorked = week.reduce((s, d) => s + d.worked, 0);
    const weekExpected = week.reduce((s, d) => s + d.expected, 0);

    return {
      worked,
      expected,
      balance: worked - expected,
      daysWorked,
      absences: absent.size,
      week,
      weekWorked,
      weekBalance: weekWorked - weekExpected,
    };
  }, [data, daily, monthStart, employee]);

  const monthLabel = monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const positive = stats.balance >= 0;
  const maxWeek = Math.max(daily, ...stats.week.map((d) => d.worked)) || 1;

  return (
    <div className="space-y-4 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Meu Resumo</h1>
        <p className="text-muted-foreground text-sm capitalize">{monthLabel}</p>
      </div>

      {isLoading ? (
        <div className="glass-card rounded-3xl p-12 text-center text-sm text-muted-foreground animate-pulse">
          Calculando suas horas...
        </div>
      ) : (
        <>
          {/* Saldo principal */}
          <section
            className={`glass-card rounded-3xl p-6 border ${
              positive ? "border-success/30" : "border-warning/30"
            }`}
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[9px] uppercase font-extrabold tracking-[0.2em] text-muted-foreground mb-1">
                  Saldo do mês
                </div>
                <div
                  className={`font-mono text-4xl font-extrabold tracking-tighter ${
                    positive ? "text-success" : "text-warning"
                  }`}
                >
                  {positive ? "+" : "−"}
                  {formatDur(Math.abs(stats.balance))}
                </div>
              </div>
              <div
                className={`h-14 w-14 shrink-0 rounded-2xl grid place-items-center ${
                  positive ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}
              >
                {positive ? (
                  <TrendingUp className="h-7 w-7" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-7 w-7" aria-hidden="true" />
                )}
              </div>
            </div>

            <div
              className={`mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm leading-relaxed ${
                positive ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}
            >
              {positive ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <p className="font-medium">
                {positive ? (
                  <>
                    Você tem <strong>{formatDur(stats.balance)}</strong> de horas extras acumuladas
                    neste mês.
                  </>
                ) : (
                  <>
                    Você precisa repor <strong>{formatDur(Math.abs(stats.balance))}</strong> para
                    ficar em dia com sua jornada.
                  </>
                )}
              </p>
            </div>
          </section>

          {/* Cards do mês */}
          <section className="grid grid-cols-2 gap-3">
            <Stat
              label="Horas trabalhadas"
              value={formatDur(stats.worked)}
              icon={<Clock className="h-5 w-5" />}
            />
            <Stat
              label="Horas previstas"
              value={formatDur(stats.expected)}
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <Stat label="Dias com registro" value={String(stats.daysWorked)} />
            <Stat label="Faltas / abonos" value={String(stats.absences)} />
          </section>

          {/* Resumo semanal */}
          <section className="glass-card rounded-3xl p-5 space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-bold tracking-tight">Resumo da semana</h2>
              <span
                className={`font-mono text-sm font-extrabold ${
                  stats.weekBalance >= 0 ? "text-success" : "text-warning"
                }`}
              >
                {stats.weekBalance >= 0 ? "+" : "−"}
                {formatDur(Math.abs(stats.weekBalance))}
              </span>
            </div>

            <p className="text-xs text-muted-foreground -mt-2">
              Total trabalhado: <strong className="text-foreground">{formatDur(stats.weekWorked)}</strong>
            </p>

            <ul className="space-y-2">
              {stats.week.map((d) => {
                const pct = Math.min(100, (d.worked / maxWeek) * 100);
                const ok = d.worked >= d.expected && d.expected > 0;
                return (
                  <li key={d.date} className="flex items-center gap-3">
                    <span className="w-9 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {d.label}
                    </span>
                    <div className="h-2.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ok ? "bg-success" : d.worked > 0 ? "bg-primary" : "bg-transparent"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`w-14 shrink-0 text-right font-mono text-xs font-bold ${
                        d.worked > 0 ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      {d.worked > 0 ? formatDur(d.worked) : d.off ? "Folga" : d.future ? "—" : "00h00"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-4">
            Sua escala: <strong>{formatWorkDays((employee as any)?.work_days)}</strong> · Jornada diária
            prevista: <strong>{employee?.daily_hours ?? 8} horas</strong>. O dia de hoje só entra no
            saldo após o fechamento. Divergências? Fale com seu supervisor.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[8px] uppercase font-extrabold tracking-[0.18em] text-muted-foreground mb-1">
          {label}
        </div>
        <div className="font-mono text-xl font-extrabold truncate">{value}</div>
      </div>
      {icon ? (
        <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 text-primary grid place-items-center">
          {icon}
        </div>
      ) : null}
    </div>
  );
}
