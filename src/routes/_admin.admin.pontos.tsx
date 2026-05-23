import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, Calendar, Plus, Search, Trash2, Edit2, History, User } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";

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
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("tenant_id", profile!.tenant_id)
        .eq("active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["time-entries", date, profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, entry_date, entry_at, entry_type, source, is_adjustment, notes, employee_id, employees(full_name)")
        .eq("tenant_id", profile!.tenant_id)
        .eq("entry_date", date)
        .order("entry_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (newData: any) => {
      // Ensure we don't have double seconds if entry_time already includes them
      const timePart = newData.entry_time.split(':').length === 2 ? `${newData.entry_time}:00` : newData.entry_time;
      const entry_at = `${newData.entry_date}T${timePart}`;
      
      const payload = {
        employee_id: newData.employee_id,
        tenant_id: profile!.tenant_id,
        entry_date: newData.entry_date,
        entry_at: new Date(entry_at).toISOString(),
        entry_type: newData.entry_type,
        notes: newData.notes,
        source: "manual_admin",
        is_adjustment: !!editingEntry,
        created_by: profile!.id,
      };

      if (editingEntry) {
        const { error } = await supabase
          .from("time_entries")
          .update(payload as any)
          .eq("id", editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("time_entries")
          .insert([payload as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      setIsAddOpen(false);
      setEditingEntry(null);
      toast.success(editingEntry ? "Registro atualizado!" : "Ponto registrado!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Registro removido!");
    },
  });

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Registros de Ponto</h1>
          <p className="text-muted-foreground mt-2">Visualize, ajuste e audite todas as batidas.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="glass-card p-2 rounded-2xl flex items-center gap-3 h-12">
            <Calendar className="h-4 w-4 text-primary ml-2" />
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="bg-transparent border-none text-sm font-semibold focus-visible:ring-0 w-36"
            />
          </div>

          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditingEntry(null);
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-12 px-6 gap-2 font-bold shadow-lg shadow-primary/20">
                <Plus className="h-5 w-5" /> Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none glass-card p-0 overflow-hidden">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addMutation.mutate({
                  employee_id: formData.get("employee_id"),
                  entry_date: formData.get("entry_date"),
                  entry_time: formData.get("entry_time"),
                  entry_type: formData.get("entry_type"),
                  notes: formData.get("notes"),
                });
              }}>
                <DialogHeader className="p-8 pb-4">
                  <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                    {editingEntry ? <Edit2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                    {editingEntry ? "Ajustar Ponto" : "Registrar Ponto"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingEntry ? "Corrija os dados do registro selecionado." : "Lançamento manual de batida de ponto."}
                  </DialogDescription>
                </DialogHeader>
                <div className="p-8 pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Colaborador</Label>
                    <Select name="employee_id" defaultValue={editingEntry?.employee_id} required>
                      <SelectTrigger className="rounded-xl h-11 border-border/40 bg-background/50">
                        <SelectValue placeholder="Selecione o funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input name="entry_date" type="date" defaultValue={editingEntry?.entry_date || date} required className="rounded-xl h-11 border-border/40 bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Horário</Label>
                      <Input name="entry_time" type="time" step="1" defaultValue={editingEntry ? format(new Date(editingEntry.entry_at), "HH:mm:ss") : ""} required className="rounded-xl h-11 border-border/40 bg-background/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Registro</Label>
                    <Select name="entry_type" defaultValue={editingEntry?.entry_type || "entrada"} required>
                      <SelectTrigger className="rounded-xl h-11 border-border/40 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABEL).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input name="notes" placeholder="Motivo do ajuste..." defaultValue={editingEntry?.notes || ""} className="rounded-xl h-11 border-border/40 bg-background/50" />
                  </div>
                </div>
                <DialogFooter className="p-8 bg-muted/20 border-t border-border/40">
                  <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancelar</Button>
                  <Button type="submit" disabled={addMutation.isPending} className="rounded-xl px-8 font-bold">
                    {addMutation.isPending ? "Salvando..." : "Salvar Registro"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
                <th className="px-6 py-4">Origem</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {data.map((e: any) => (
                <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-8 py-5 font-mono font-bold text-primary flex items-center gap-2">
                    {new Date(e.entry_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                    {e.is_adjustment && (
                      <span title="Registro Ajustado">
                        <History className="h-3 w-3 text-warning" />
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 font-semibold">{e.employees?.full_name}</td>
                  <td className="px-6 py-5 text-muted-foreground font-medium">
                    {TYPE_LABEL[e.entry_type]}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${e.source === "manual_admin" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                      {e.source === "manual_admin" ? "Admin" : "App"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(e)} className="h-8 w-8 rounded-lg text-primary/60 hover:text-primary hover:bg-primary/10">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        if (confirm("Excluir este registro permanentemente?")) {
                          deleteMutation.mutate(e.id);
                        }
                      }}
                      className="h-8 w-8 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
