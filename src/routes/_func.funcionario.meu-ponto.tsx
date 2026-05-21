import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, LogIn, Coffee, Sunrise, LogOut } from "lucide-react";

export const Route = createFileRoute("/_func/funcionario/meu-ponto")({
  head: () => ({ meta: [{ title: "Meu Ponto" }] }),
  component: MyClockPage,
});

const SEQUENCE = ["entrada", "saida_almoco", "retorno_almoco", "saida"] as const;
type EntryType = (typeof SEQUENCE)[number];

const META: Record<EntryType, { label: string; icon: typeof LogIn; tone: string }> = {
  entrada: { label: "Entrada", icon: LogIn, tone: "text-success" },
  saida_almoco: { label: "Saída para almoço", icon: Coffee, tone: "text-warning" },
  retorno_almoco: { label: "Retorno do almoço", icon: Sunrise, tone: "text-primary" },
  saida: { label: "Saída final", icon: LogOut, tone: "text-destructive" },
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
    toast.success(`${META[nextType].label} registrada!`);
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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground capitalize">{dateStr}</p>
        <h1 className="font-display text-2xl font-semibold">
          Olá, {profile?.full_name?.split(" ")[0]} 👋
        </h1>
      </div>

      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="font-mono text-5xl font-semibold tracking-tight">
          {now.toLocaleTimeString("pt-BR")}
        </div>
        {employee?.active === false ? (
          <p className="mt-6 text-sm text-destructive">
            Sua conta está inativa. Contate o administrador.
          </p>
        ) : nextType ? (
          <>
            <p className="mt-4 text-sm text-muted-foreground">Próximo registro:</p>
            <p className={`mt-1 text-lg font-semibold ${META[nextType].tone}`}>
              {META[nextType].label}
            </p>
            <Button
              size="lg"
              onClick={punch}
              disabled={punching}
              className="mt-6 h-14 w-full max-w-xs text-base shadow-[var(--shadow-glow)]"
            >
              <Clock className="mr-2 h-5 w-5" />
              {punching ? "Registrando..." : "Registrar Ponto"}
            </Button>
          </>
        ) : (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-success/15 px-4 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Ponto completo do dia
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="mb-4 font-display text-base font-semibold">Hoje</h2>
        <div className="space-y-2">
          {SEQUENCE.map((t) => {
            const entry = todayEntries?.find((e) => e.entry_type === t);
            const Icon = META[t].icon;
            return (
              <div
                key={t}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card/30 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${entry ? META[t].tone : "text-muted-foreground"}`} />
                  <span className={entry ? "" : "text-muted-foreground"}>{META[t].label}</span>
                </div>
                <span className="font-mono text-sm">
                  {entry
                    ? new Date(entry.entry_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/50 pt-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Total trabalhado</div>
            <div className="font-mono text-base font-semibold">{formatDur(totalWorkedMs)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Saldo do dia</div>
            <div
              className={`font-mono text-base font-semibold ${
                balance >= 0 ? "text-success" : "text-warning"
              }`}
            >
              {balance >= 0 ? "+" : "-"}
              {formatDur(Math.abs(balance))}
            </div>
          </div>
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
