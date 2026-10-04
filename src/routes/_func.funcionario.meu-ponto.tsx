import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, LogIn, Coffee, Sunrise, LogOut, MapPin, Smartphone } from "lucide-react";
import { getCurrentCoords } from "@/lib/geolocation";
import { registerOwnPunch } from "@/lib/time-entry.functions";
import { useEmployeeMembership } from "@/lib/employee-membership";

export const Route = createFileRoute("/_func/funcionario/meu-ponto")({
  head: () => ({ meta: [{ title: "Registrar Ponto — NexPonto" }] }),
  component: MyClockPage,
});

const SEQUENCE = ["entrada", "saida_almoco", "retorno_almoco", "saida"] as const;
type EntryType = (typeof SEQUENCE)[number];

const META: Record<EntryType, { label: string; icon: typeof LogIn; tone: string; bg: string }> = {
  entrada: { label: "Entrada", icon: LogIn, tone: "text-success", bg: "bg-success/10" },
  saida_almoco: { label: "Saída Almoço", icon: Coffee, tone: "text-warning", bg: "bg-warning/10" },
  retorno_almoco: { label: "Retorno Almoço", icon: Sunrise, tone: "text-primary", bg: "bg-primary/10" },
  saida: { label: "Saída Final", icon: LogOut, tone: "text-destructive", bg: "bg-destructive/10" },
};

function dateInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function MyClockPage() {
  const qc = useQueryClient();
  const registerPunch = useServerFn(registerOwnPunch);
  const { data: profile } = useProfile();
  const [now, setNow] = useState(new Date());
  const [punching, setPunching] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const { selected: employee, loading: membershipLoading } = useEmployeeMembership();

  const effectiveDailyHours =
    employee?.daily_hours ?? employee?.tenant_default_daily_hours ?? 8;
  const tenantTimeZone = employee?.tenant_timezone || "America/Sao_Paulo";
  const currentEntryDate = dateInTimeZone(tenantTimeZone);

  const { data: todayEntries } = useQuery({
    queryKey: ["my-today", employee?.id, currentEntryDate],
    staleTime: 1000 * 30, // 30 seconds
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("entry_type, entry_at, source")
        .eq("employee_id", employee!.id)
        .eq("entry_date", currentEntryDate)
        .order("entry_at");
      if (error) throw error;
      return data;
    },
  });

  // Jornadas menores que 8h não têm intervalo de almoço: só entrada e saída.
  const hasLunch = effectiveDailyHours >= 8;
  const sequence: readonly EntryType[] = hasLunch
    ? SEQUENCE
    : (["entrada", "saida"] as const);

  const done = new Set(todayEntries?.map((e) => e.entry_type) ?? []);
  const nextType: EntryType | null = sequence.find((t) => !done.has(t)) ?? null;

  async function punch() {
    if (!employee || !nextType) return;
    setPunching(true);
    try {
      // Captura a localização sem bloquear a batida: se o GPS for negado
      // ou der timeout, o ponto é registrado normalmente sem coordenadas.
      const coords = await getCurrentCoords();
      const result = await registerPunch({
        data: {
          tenant_id: employee.tenant_id,
          user_agent: navigator.userAgent,
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        },
      });
      const recordedType = result.entry_type as EntryType;
      toast.success(`${META[recordedType].label} registrada com sucesso!`);
      qc.invalidateQueries({ queryKey: ["my-today"] });
      qc.invalidateQueries({ queryKey: ["my-month-summary"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o ponto.");
    } finally {
      setPunching(false);
    }
  }

  if (membershipLoading || !employee) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground animate-pulse">
        Carregando vínculo...
      </div>
    );
  }

  const totalWorkedMs = computeWorked(todayEntries ?? []);
  const dailyTarget = effectiveDailyHours * 3600_000;
  const balance = totalWorkedMs - dailyTarget;

  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="text-center md:text-left space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Bom dia, {profile?.full_name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground text-sm font-medium capitalize opacity-80">{dateStr}</p>
      </div>

      <div className="glass-card rounded-2xl p-6 text-center relative overflow-hidden group border border-border shadow-sm">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>
        
        <div className="mb-4 space-y-1">
           <div
             className="font-mono text-5xl sm:text-6xl font-extrabold tracking-tighter text-primary drop-shadow-sm select-none"
             aria-live="off"
             aria-label={`Horário atual ${now.toLocaleTimeString("pt-BR")}`}
           >
             {now.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}<span className="text-2xl sm:text-3xl opacity-30">:{now.toLocaleTimeString("pt-BR", { second: '2-digit' })}</span>
           </div>
           <div className="flex items-center justify-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/60">
              <MapPin className="h-2.5 w-2.5" aria-hidden="true" /> Escritório Central
           </div>
        </div>

        {employee?.active === false ? (
          <div role="alert" className="p-6 rounded-3xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-bold text-destructive">
              CONTA INATIVA. Contate o administrador do sistema.
            </p>
          </div>
        ) : nextType ? (
          <div className="max-w-md mx-auto space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-border relative" aria-live="polite">
               <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background border border-border text-[8px] font-extrabold uppercase tracking-[0.15em] text-primary shadow-sm">
                 Próximo Registro
               </span>
               <div className={`text-xl font-extrabold uppercase tracking-tighter flex items-center justify-center gap-3 ${META[nextType].tone}`}>
                  {(() => {
                    const Icon = META[nextType].icon;
                    return <Icon className="h-5 w-5" aria-hidden="true" />;
                  })()}
                  {META[nextType].label}
               </div>
            </div>

            <Button
              size="lg"
              onClick={punch}
              disabled={punching}
              aria-busy={punching}
              aria-label={`Registrar ${META[nextType].label} agora`}
              className="premium-button min-h-14 sm:min-h-16 w-full rounded-2xl text-lg font-extrabold tracking-tight gap-3 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <Smartphone className="h-5 w-5" aria-hidden="true" />
              {punching ? "Sincronizando..." : `Registrar ${META[nextType].label}`}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Certifique-se de que está no seu local de trabalho.
            </p>
          </div>
        ) : (
          <div className="py-10 space-y-4" role="status" aria-live="polite">
            <div className="h-24 w-24 rounded-full bg-success/10 border-4 border-success/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
               <CheckCircle2 className="h-12 w-12 text-success" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold">Jornada Concluída!</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Você já realizou todos os registros obrigatórios para o dia de hoje.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-6 font-display text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Histórico de Hoje
          </h2>
          <div className="space-y-3">
            {sequence.map((t) => {
              const entry = todayEntries?.find((e) => e.entry_type === t);
              const Icon = META[t].icon;
              return (
                <div
                  key={t}
                  className={`flex items-center justify-between rounded-2xl px-5 py-4 transition-all ${
                    entry 
                      ? `${META[t].bg} border border-border/10` 
                      : "bg-slate-50 border border-border/5 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${entry ? "bg-background/40" : "bg-slate-50"}`}>
                      <Icon className={`h-5 w-5 ${entry ? META[t].tone : "opacity-30"}`} />
                    </div>
                    <span className={`font-bold text-sm ${entry ? "" : "opacity-50"}`}>{META[t].label}</span>
                  </div>
                  <span className="font-mono font-bold">
                    {entry
                      ? new Date(entry.entry_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex flex-col border border-border shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold tracking-tight text-foreground">Resumo da Jornada</h2>
          
          <div className="space-y-3 flex-1">
             <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-border group hover:bg-slate-50 transition-all">
                <div>
                   <div className="text-[8px] uppercase font-extrabold tracking-[0.2em] text-muted-foreground opacity-70 mb-1">Tempo Trabalhado</div>
                   <div className="font-mono text-2xl font-extrabold text-foreground">{formatDur(totalWorkedMs)}</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary group-hover:scale-110 transition-transform">
                   <Clock className="h-5 w-5" />
                </div>
             </div>

             <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-border group hover:bg-slate-50 transition-all">
                <div>
                   <div className="text-[8px] uppercase font-extrabold tracking-[0.2em] text-muted-foreground opacity-70 mb-1">Saldo do Dia</div>
                   <div
                    className={`font-mono text-2xl font-extrabold ${
                      balance >= 0 ? "text-success" : "text-warning"
                    }`}
                   >
                    {balance >= 0 ? "+" : "-"}{formatDur(Math.abs(balance))}
                   </div>
                </div>
                <div className={`h-10 w-10 rounded-xl grid place-items-center group-hover:scale-110 transition-transform ${balance >= 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                   <CheckCircle2 className="h-5 w-5" />
                </div>
             </div>
          </div>
          
          <p className="mt-8 text-[11px] text-muted-foreground text-center leading-relaxed">
            Sua jornada diária prevista é de <strong>{effectiveDailyHours} horas</strong>. <br />
            Qualquer divergência, procure o seu supervisor.
          </p>
        </div>
      </div>
    </div>
  );
}

function computeWorked(entries: { entry_type: string; entry_at: string }[]) {
  const get = (t: string) => entries.find((e) => e.entry_type === t)?.entry_at;
  const e1 = get("entrada"),
    sa = get("saida_almoco"),
    ra = get("retorno_almoco"),
    sf = get("saida");
  let total = 0;
  if (e1 && !sa && !ra) {
    // Jornada sem almoço: entrada -> saída (ou em andamento)
    total += (sf ? new Date(sf).getTime() : Date.now()) - new Date(e1).getTime();
    return Math.max(0, total);
  }
  if (e1 && sa) total += new Date(sa).getTime() - new Date(e1).getTime();
  if (ra && sf) total += new Date(sf).getTime() - new Date(ra).getTime();
  else if (ra && !sf) total += Date.now() - new Date(ra).getTime();
  return Math.max(0, total);
}

function formatDur(ms: number) {
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}
