import { createFileRoute } from "@tanstack/react-router";
import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Calendar, Clock, ChevronRight, History } from "lucide-react";

export const Route = createFileRoute("/_func/funcionario/historico")({
  head: () => ({ meta: [{ title: "Meu Histórico — NexPonto" }] }),
  component: HistoryPage,
});

const TYPE_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida_almoco: "Saída Almoço",
  retorno_almoco: "Retorno Almoço",
  saida: "Saída Final",
};

const TYPE_COLOR: Record<string, string> = {
  entrada: "text-success",
  saida_almoco: "text-warning",
  retorno_almoco: "text-primary",
  saida: "text-destructive",
};

function HistoryPage() {
  const { data: profile } = useProfile();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["my-history", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", profile!.id)
        .maybeSingle();
      if (!emp) return [];
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, entry_date, entry_at, entry_type, source")
        .eq("employee_id", emp.id)
        .order("entry_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const grouped = useMemo(() => {
    const res: Record<string, typeof entries> = {};
    (entries ?? []).forEach((e) => {
      (res[e.entry_date] ||= [] as any).push(e);
    });
    return res;
  }, [entries]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Histórico</h1>
        <p className="text-muted-foreground mt-1">Seus últimos registros de ponto sincronizados.</p>
      </div>

      {isLoading ? (
        <div className="glass-card rounded-[2rem] p-20 text-center text-sm text-muted-foreground animate-pulse">
          Carregando histórico...
        </div>
      ) : !entries?.length ? (
        <div className="glass-card rounded-[2rem] p-20 text-center space-y-4">
           <div className="h-16 w-16 bg-muted/30 rounded-full grid place-items-center mx-auto">
              <History className="h-8 w-8 text-muted-foreground" />
           </div>
           <p className="text-muted-foreground">Você ainda não possui registros.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped as Record<string, any[]>).map(([date, items]) => (
            <div key={date} className="glass-card rounded-[2rem] p-6 border border-border/40 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20"></div>
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-xl bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                   </div>
                   <span className="font-bold text-sm capitalize">
                    {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}
                   </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                   {items?.length} registros
                </span>
              </div>
              
              <div className="space-y-2">
                {items!.map((e) => (
                  <div
                    key={e.id}
                    className="group flex items-center justify-between rounded-[1.25rem] bg-muted/10 hover:bg-muted/20 border border-transparent hover:border-border/40 px-5 py-4 transition-all"
                  >
                    <div className="flex items-center gap-4">
                       <div className={`h-2 w-2 rounded-full ${TYPE_COLOR[e.entry_type] || "bg-muted"}`}></div>
                       <span className="font-bold text-sm">{TYPE_LABEL[e.entry_type]}</span>
                       {e.source === "manual_admin" && (
                        <span className="rounded-full bg-warning/10 border border-warning/20 px-2.5 py-0.5 text-[10px] font-bold text-warning uppercase tracking-tighter">
                          Ajustado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-base text-primary/80">
                        {new Date(e.entry_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
