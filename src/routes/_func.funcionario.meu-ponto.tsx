import { createFileRoute } from "@tanstack/react-router";
import { memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, LogIn, Coffee, Sunrise, LogOut, MapPin, Smartphone } from "lucide-react";

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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function MyClockPage() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [now, setNow] = useState(new Date());
  const [punching, setPunching] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const { data: employee } = useQuery({
    queryKey: ["my-employee"],
    staleTime: 1000 * 60 * 60, // 1 hour (employee info rarely changes)
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, tenant_id, active, daily_hours")
        .eq("user_id", profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: todayEntries } = useQuery({
    queryKey: ["my-today", employee?.id],
    staleTime: 1000 * 30, // 30 seconds
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("entry_type, entry_at, source")
        .eq("employee_id", employee!.id)
        .eq("entry_date", todayStr())
        .order("entry_at");
      if (error) throw error;
      return data;
    },
  });

  const done = new Set(todayEntries?.map((e) => e.entry_type) ?? []);
  const nextType: EntryType | null = SEQUENCE.find((t) => !done.has(t)) ?? null;

  async function punch() {
    if (!employee || !nextType) return;
    setPunching(true);
    const { error } = await supabase.from("time_entries").insert({
      tenant_id: employee.tenant_id,
      employee_id: employee.id,
      entry_type: nextType,
      source: "automatico",
      user_agent: navigator.userAgent,
    });
    setPunching(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${META[nextType].label} registrada com sucesso!`);
    qc.invalidateQueries({ queryKey: ["my-today"] });
  }

  const totalWorkedMs = computeWorked(todayEntries ?? []);
  const dailyTarget = (employee?.daily_hours ?? 8) * 3600_000;
  const balance = totalWorkedMs - dailyTarget;

  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center md:text-left space-y-2">
        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground">
          Olá, {profile?.full_name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground text-xl font-medium capitalize opacity-80">{dateStr}</p>
      </div>

      <div className="glass-card rounded-[3rem] p-12 text-center relative overflow-hidden group border border-border/40 shadow-2xl shadow-primary/5">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>
        
        <div className="mb-8 space-y-2">
           <div className="font-mono text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-primary drop-shadow-sm select-none">
             {now.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}<span className="text-2xl sm:text-4xl md:text-5xl opacity-30">:{now.toLocaleTimeString("pt-BR", { second: '2-digit' })}</span>
           </div>
           <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <MapPin className="h-3 w-3" /> Localização: Escritório Central
           </div>
        </div>

        {employee?.active === false ? (
          <div className="p-6 rounded-3xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-bold text-destructive">
              CONTA INATIVA. Contate o administrador do sistema.
            </p>
          </div>
        ) : nextType ? (
          <div className="max-w-md mx-auto space-y-8">
            <div className="p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-muted/20 border border-border/20 relative shadow-inner">
               <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-background border border-border text-[9px] font-black uppercase tracking-[0.2em] text-primary shadow-sm">
                 Próximo Registro
               </span>
               <div className={`text-xl sm:text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 sm:gap-4 ${META[nextType].tone}`}>
                  {(() => {
                    const Icon = META[nextType].icon;
                    return <Icon className="h-8 w-8" />;
                  })()}
                  {META[nextType].label}
               </div>
            </div>

            <Button
              size="lg"
              onClick={punch}
              disabled={punching}
              className="premium-button h-20 sm:h-24 w-full rounded-2xl sm:rounded-[2rem] text-xl sm:text-2xl font-black uppercase tracking-widest gap-3 sm:gap-4 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <Smartphone className="h-7 w-7" />
              {punching ? "Sincronizando..." : "Registrar Agora"}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Certifique-se de que está no seu local de trabalho.
            </p>
          </div>
        ) : (
          <div className="py-10 space-y-4">
            <div className="h-24 w-24 rounded-full bg-success/10 border-4 border-success/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
               <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <h2 className="text-2xl font-bold">Jornada Concluída!</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Você já realizou todos os registros obrigatórios para o dia de hoje.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-card rounded-2xl md:rounded-[2rem] p-6 md:p-8">
          <h2 className="mb-6 font-display text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Histórico de Hoje
          </h2>
          <div className="space-y-3">
            {SEQUENCE.map((t) => {
              const entry = todayEntries?.find((e) => e.entry_type === t);
              const Icon = META[t].icon;
              return (
                <div
                  key={t}
                  className={`flex items-center justify-between rounded-2xl px-5 py-4 transition-all ${
                    entry 
                      ? `${META[t].bg} border border-border/10` 
                      : "bg-muted/10 border border-border/5 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${entry ? "bg-background/40" : "bg-muted/10"}`}>
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

        <div className="glass-card rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 flex flex-col border border-border/40 shadow-sm transition-all hover:shadow-md">
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight text-foreground">Resumo da Jornada</h2>
          
          <div className="space-y-4 sm:space-y-6 flex-1">
             <div className="flex items-center justify-between p-5 sm:p-7 rounded-xl sm:rounded-[2rem] bg-muted/10 border border-border/20 group hover:bg-muted/20 transition-all">
                <div>
                   <div className="text-[9px] sm:text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground opacity-70 mb-1 sm:mb-2">Tempo Trabalhado</div>
                   <div className="font-mono text-2xl sm:text-4xl font-black text-foreground">{formatDur(totalWorkedMs)}</div>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center text-primary group-hover:scale-110 transition-transform">
                   <Clock className="h-7 w-7" />
                </div>
             </div>

             <div className="flex items-center justify-between p-5 sm:p-7 rounded-xl sm:rounded-[2rem] bg-muted/10 border border-border/20 group hover:bg-muted/20 transition-all">
                <div>
                   <div className="text-[9px] sm:text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground opacity-70 mb-1 sm:mb-2">Saldo do Dia</div>
                   <div
                    className={`font-mono text-2xl sm:text-4xl font-black ${
                      balance >= 0 ? "text-success" : "text-warning"
                    }`}
                   >
                    {balance >= 0 ? "+" : "-"}{formatDur(Math.abs(balance))}
                   </div>
                </div>
                <div className={`h-14 w-14 rounded-2xl grid place-items-center group-hover:scale-110 transition-transform ${balance >= 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                   <CheckCircle2 className="h-7 w-7" />
                </div>
             </div>
          </div>
          
          <p className="mt-8 text-[11px] text-muted-foreground text-center leading-relaxed">
            Sua jornada diária prevista é de <strong>{employee?.daily_hours || 8} horas</strong>. <br />
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
  if (e1 && sa) total += new Date(sa).getTime() - new Date(e1).getTime();
  else if (e1 && !sa && !ra) total += Date.now() - new Date(e1).getTime();
  if (ra && sf) total += new Date(sf).getTime() - new Date(ra).getTime();
  else if (ra && !sf) total += Date.now() - new Date(ra).getTime();
  return Math.max(0, total);
}

function formatDur(ms: number) {
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}
