import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_admin/admin/pontos")({
  head: () => ({ meta: [{ title: "Pontos — Admin" }] }),
  component: PontosPage,
});

const TYPE_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida_almoco: "Saída almoço",
  retorno_almoco: "Retorno almoço",
  saida: "Saída",
};

function PontosPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["time-entries", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, entry_date, entry_at, entry_type, source, employees(full_name)")
        .eq("entry_date", date)
        .order("entry_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Registros de ponto</h1>
          <p className="text-sm text-muted-foreground">Visualize as batidas por dia.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d">Data</Label>
          <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : !data?.length ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum registro neste dia.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-card/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Funcionário</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Origem</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e: any) => (
                <tr key={e.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-mono">
                    {new Date(e.entry_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium">{e.employees?.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {TYPE_LABEL[e.entry_type]}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {e.source === "manual_admin" ? "Manual (admin)" : "Automático"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
