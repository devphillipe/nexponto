import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Calendar, Search } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/pontos")({
  head: () => ({ meta: [{ title: "Pontos — NexPonto Admin" }] }),
  component: PontosPage,
});

const TYPE_LABEL: Record<string, string> = {
  entrada: "Entrada",
  saida_almoco: "Saída Almoço",
  retorno_almoco: "Retorno Almoço",
  saida: "Saída Final",
};

function PontosPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["time-entries", date],
    staleTime: 1000 * 60, // 1 minute
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Registros de Ponto</h1>
          <p className="text-muted-foreground mt-2">Visualize e audite todas as batidas por dia.</p>
        </div>
        <div className="glass-card p-2 rounded-2xl flex items-center gap-3">
           <Calendar className="h-4 w-4 text-primary ml-2" />
           <Input 
             type="date" 
             value={date} 
             onChange={(e) => setDate(e.target.value)} 
             className="bg-transparent border-none text-sm font-semibold focus-visible:ring-0"
           />
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-[2rem] border border-border/40">
        {isLoading ? (
          <div className="p-16 text-center text-sm text-muted-foreground animate-pulse">Carregando registros...</div>
        ) : !data?.length ? (
          <div className="p-20 text-center space-y-4">
             <div className="h-16 w-16 bg-muted/30 rounded-full grid place-items-center mx-auto">
                <Clock className="h-8 w-8 text-muted-foreground" />
             </div>
             <p className="text-muted-foreground">Nenhum ponto registrado nesta data.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 bg-muted/20 text-left text-[11px] uppercase font-bold tracking-widest text-muted-foreground">
              <tr>
                <th className="px-8 py-4">Horário</th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Tipo de Registro</th>
                <th className="px-6 py-4 text-right">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {data.map((e: any) => (
                <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-8 py-5 font-mono font-semibold text-primary">
                    {new Date(e.entry_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-5 font-bold">{e.employees?.full_name}</td>
                  <td className="px-6 py-5 text-muted-foreground font-medium">
                    {TYPE_LABEL[e.entry_type]}
                  </td>
                  <td className="px-6 py-5 text-right text-xs font-bold text-muted-foreground">
                    <span className={`px-3 py-1 rounded-full ${e.source === "manual_admin" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                      {e.source === "manual_admin" ? "Admin" : "Auto"}
                    </span>
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
