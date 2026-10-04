import { createFileRoute } from "@tanstack/react-router";
import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Calendar, Clock, ChevronDown, History } from "lucide-react";
import { LocationDialog } from "@/components/LocationDialog";

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
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

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
        .select("id, entry_date, entry_at, entry_type, source, latitude, longitude")
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

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Histórico</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Seus últimos registros de ponto sincronizados.</p>
      </div>

      {isLoading ? (
        <div className="glass-card rounded-[1.5rem] sm:rounded-2xl p-12 sm:p-20 text-center text-sm text-muted-foreground animate-pulse">
          Carregando histórico...
        </div>
      ) : !entries?.length ? (
        <div className="glass-card rounded-[1.5rem] sm:rounded-2xl p-12 sm:p-20 text-center space-y-4">
           <div className="h-12 w-12 sm:h-16 sm:w-16 bg-muted/30 rounded-full grid place-items-center mx-auto">
              <History className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
           </div>
           <p className="text-muted-foreground">Você ainda não possui registros.</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {Object.entries(grouped as Record<string, any[]>).map(([date, items]) => {
            const isExpanded = expandedDays[date] !== false; // Default expanded for now, or true? User said "permitir expandir e recolher", implying they might be closed by default or open. Let's do open by default but toggleable.
            
            return (
              <div key={date} className="glass-card rounded-[1.5rem] sm:rounded-2xl border border-border overflow-hidden relative transition-all duration-300">
                <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-primary/20"></div>
                
                <button 
                  onClick={() => toggleDay(date)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between gap-3 p-4 sm:p-6 min-h-[3.25rem] hover:bg-muted/5 active:bg-muted/10 transition-colors text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="p-2 shrink-0 rounded-xl bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <span className="truncate font-bold text-sm sm:text-base capitalize">
                      {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-muted-foreground">
                       {items?.length} registros
                    </span>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[1000px] opacity-100 pb-6" : "max-h-0 opacity-0"}`}>
                  <div className="space-y-2 px-4 sm:px-6">
                    {items!.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between rounded-[1rem] sm:rounded-[1.25rem] bg-muted/10 border border-transparent px-4 sm:px-5 py-3 sm:py-4"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                           <div className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${TYPE_COLOR[e.entry_type] || "bg-muted"}`}></div>
                           <span className="font-bold text-xs sm:text-sm">{TYPE_LABEL[e.entry_type]}</span>
                           {e.source === "manual_admin" && (
                            <span className="rounded-full bg-warning/10 border border-warning/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-warning uppercase tracking-tighter">
                              Ajustado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                          {e.latitude != null && e.longitude != null && (
                            <LocationDialog
                              latitude={Number(e.latitude)}
                              longitude={Number(e.longitude)}
                              label={`${TYPE_LABEL[e.entry_type]} — ${new Date(e.entry_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                            />
                          )}
                          <span className="font-mono font-bold text-sm sm:text-base text-primary/80">
                            {new Date(e.entry_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
