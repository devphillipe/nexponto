import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";

export const Route = createFileRoute("/_func/funcionario/historico")({
  head: () => ({ meta: [{ title: "Histórico" }] }),
  component: HistoryPage,
});

const TYPE_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida_almoco: "Saída almoço",
  retorno_almoco: "Retorno almoço",
  saida: "Saída",
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

  // group by date
  const grouped: Record<string, typeof entries> = {};
  (entries ?? []).forEach((e) => {
    (grouped[e.entry_date] ||= [] as any).push(e);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Histórico</h1>
        <p className="text-sm text-muted-foreground">Seus últimos 100 registros.</p>
      </div>

      {isLoading ? (
        <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      ) : !entries?.length ? (
        <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">
          Nenhum registro ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="glass-card rounded-xl p-5">
              <div className="mb-3 text-sm font-semibold capitalize">
                {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="space-y-1.5">
                {items!.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-md bg-card/40 px-3 py-2 text-sm"
                  >
                    <span>{TYPE_LABEL[e.entry_type]}</span>
                    <div className="flex items-center gap-3">
                      {e.source === "manual_admin" && (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
                          Ajustado por admin
                        </span>
                      )}
                      <span className="font-mono">
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
          ))}
        </div>
      )}
    </div>
  );
}
