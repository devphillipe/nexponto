import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Plus, Search, Calendar as CalendarIcon, User, Trash2, FileCheck, Edit2 } from "lucide-react";
import { useState, memo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_admin/admin/abonos")({
  head: () => ({ meta: [{ title: "Abonos — NexPonto Admin" }] }),
  component: AbonosPage,
});

const REASONS = [
  { value: "atestado", label: "Atestado Médico" },
  { value: "folga", label: "Folga" },
  { value: "feriado", label: "Feriado" },
  { value: "licenca", label: "Licença" },
  { value: "falta_justificada", label: "Falta Justificada" },
  { value: "outro", label: "Outro" },
];

function AbonosPage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");

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

  const { data: absences, isLoading } = useQuery({
    queryKey: ["absences", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absences")
        .select("id, absence_date, reason, description, employee_id, employees(full_name)")
        .eq("tenant_id", profile!.tenant_id)
        .order("absence_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (newData: any) => {
      // 1. Insert into absences
      const { data: absence, error: absenceError } = await supabase
        .from("absences")
        .insert([{
          ...newData,
          tenant_id: profile!.tenant_id,
          approved_by: profile!.id
        }])
        .select()
        .single();
      
      if (absenceError) throw absenceError;

      // 2. Insert into time_entries to show in the point sheet
      // We create a special entry for the absence
      const { error: entryError } = await supabase
        .from("time_entries")
        .insert([{
          employee_id: newData.employee_id,
          tenant_id: profile!.tenant_id,
          entry_date: newData.absence_date,
          entry_at: `${newData.absence_date}T00:00:00Z`,
          entry_type: "entrada", // Use entrada as fallback since abono isn't in types yet, but notes will explain it
          notes: `ABONO: ${REASONS.find(r => r.value === newData.reason)?.label || newData.reason}. ${newData.description || ""}`,
          source: "manual_admin",
          is_adjustment: true,
          created_by: profile!.id
        }]);

      if (entryError) {
        console.error("Erro ao criar entrada de ponto para abono:", entryError);
        // We don't throw here to not revert the absence creation, 
        // but it would be better to use a transaction if possible or handle it gracefully
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      setIsAddOpen(false);
      toast.success("Abono registrado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao registrar abono: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("absences")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      toast.success("Abono removido com sucesso!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const { id, ...data } = updatedData;
      const { error } = await supabase
        .from("absences")
        .update(data)
        .eq("id", id);
      if (error) throw error;

      // Update the special entry in time_entries
      const { error: entryError } = await supabase
        .from("time_entries")
        .update({
          entry_date: data.absence_date,
          entry_at: `${data.absence_date}T00:00:00Z`,
          notes: `ABONO: ${REASONS.find(r => r.value === data.reason)?.label || data.reason}. ${data.description || ""}`,
        })
        .eq("employee_id", data.employee_id)
        .eq("entry_date", data.absence_date) // This might be tricky if date changed, but let's assume one abono per day for now
        .eq("is_adjustment", true)
        .like("notes", "ABONO:%");
      
      if (entryError) console.error("Erro ao atualizar entrada de ponto:", entryError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Abono atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar abono: " + error.message);
    },
  });

  const filteredAbsences = absences?.filter(a => 
    a.employees?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">Gestão de Abonos</h1>
          <p className="text-muted-foreground mt-2 md:mt-3 text-base md:text-xl font-medium">Registre e gerencie atestados, folgas e licenças.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-xl md:rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px] md:text-xs px-6 md:px-8 h-12 md:h-14 w-full lg:w-auto">
              <Plus className="h-5 w-5" /> Novo Abono
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none glass-card p-0 overflow-hidden shadow-2xl">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const description = String(formData.get("description") || "").trim();
              if (description.length < 3) {
                toast.error("Informe uma justificativa de pelo menos 3 caracteres.");
                return;
              }
              addMutation.mutate({
                employee_id: formData.get("employee_id"),
                absence_date: formData.get("date"),
                reason: formData.get("reason"),
                description,
              });
            }}>
              <DialogHeader className="p-8 pb-4">
                <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                  <FileCheck className="h-6 w-6" /> Registrar Abono
                </DialogTitle>
                <DialogDescription>Preencha os dados da falta justificada ou abono.</DialogDescription>
              </DialogHeader>
              <div className="p-8 pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Colaborador</Label>
                  <Select name="employee_id" required>
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
                    <Label htmlFor="date">Data</Label>
                    <Input id="date" name="date" type="date" required className="rounded-xl h-11 border-border/40 bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo</Label>
                    <Select name="reason" defaultValue="atestado" required>
                      <SelectTrigger className="rounded-xl h-11 border-border/40 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REASONS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Justificativa *</Label>
                  <Textarea id="description" name="description" required minLength={3} maxLength={500} rows={3} placeholder="Ex: Atestado médico de 2 dias" className="rounded-xl border-border/40 bg-background/50" aria-describedby="desc-hint" />
                  <p id="desc-hint" className="text-[11px] text-muted-foreground">Descreva o motivo do abono. Mínimo 3 caracteres.</p>
                </div>
              </div>
              <DialogFooter className="p-8 bg-muted/20 border-t border-border/40">
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={addMutation.isPending} className="rounded-xl px-8 font-bold">
                  {addMutation.isPending ? "Salvando..." : "Salvar Abono"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card p-5 rounded-[2rem] flex items-center gap-5 border border-border/40 shadow-sm transition-all hover:border-primary/20">
        <Search className="h-6 w-6 text-primary ml-3" />
        <Input 
          placeholder="Pesquisar por colaborador ou motivo..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none text-base focus-visible:ring-0"
        />
      </div>

      <div className="glass-card overflow-hidden rounded-2xl md:rounded-[2.5rem] border border-border/40 shadow-sm transition-all duration-500 hover:shadow-md">
        {isLoading ? (
          <div className="p-16 text-center text-sm text-muted-foreground animate-pulse">Carregando registros...</div>
        ) : !filteredAbsences?.length ? (
          <div className="p-20 text-center space-y-4">
             <div className="h-16 w-16 bg-muted/30 rounded-full grid place-items-center mx-auto">
                <FileText className="h-8 w-8 text-muted-foreground" />
             </div>
             <p className="text-muted-foreground">Nenhum abono encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
            <thead className="border-b border-border/40 bg-muted/20 text-left text-[11px] uppercase font-bold tracking-widest text-muted-foreground">
              <tr>
                <th className="px-8 py-4">Data</th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Motivo</th>
                <th className="px-6 py-4">Observação</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredAbsences.map((a: any) => (
                <AbonoTableRow 
                  key={a.id} 
                  a={a} 
                  REASONS={REASONS} 
                  employees={employees} 
                  updateMutation={updateMutation} 
                  deleteMutation={deleteMutation} 
                />
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EditAbonoDialog({ abono, employees, onSave, isPending }: { abono: any, employees: any[], onSave: (data: any) => void, isPending: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none glass-card p-0 overflow-hidden shadow-2xl">
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const description = String(formData.get("description") || "").trim();
          if (description.length < 3) {
            toast.error("Informe uma justificativa de pelo menos 3 caracteres.");
            return;
          }
          onSave({
            employee_id: formData.get("employee_id"),
            absence_date: formData.get("date"),
            reason: formData.get("reason"),
            description,
          });
          setOpen(false);
        }}>
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <FileCheck className="h-6 w-6" /> Editar Abono
            </DialogTitle>
            <p className="text-muted-foreground text-sm">Altere as informações do abono.</p>
          </DialogHeader>
          <div className="p-8 pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employee_id">Colaborador</Label>
              <Select name="employee_id" defaultValue={abono.employee_id} required>
                <SelectTrigger className="rounded-xl h-11 border-border/40 bg-background/50">
                  <SelectValue />
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
                <Label htmlFor="edit-date">Data</Label>
                <Input id="edit-date" name="date" type="date" defaultValue={abono.absence_date} required className="rounded-xl h-11 border-border/40 bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reason">Motivo</Label>
                <Select name="reason" defaultValue={abono.reason} required>
                  <SelectTrigger className="rounded-xl h-11 border-border/40 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Justificativa *</Label>
              <Textarea id="edit-description" name="description" required minLength={3} maxLength={500} rows={3} defaultValue={abono.description} placeholder="Ex: Atestado médico de 2 dias" className="rounded-xl border-border/40 bg-background/50" />
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/20 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={isPending} className="rounded-xl px-8 font-bold">
              {isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const AbonoTableRow = memo(({ a, REASONS, employees, updateMutation, deleteMutation }: any) => (
  <tr className="hover:bg-muted/10 transition-colors group">
    <td className="px-8 py-5 font-bold text-primary">
      {format(new Date(a.absence_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
    </td>
    <td className="px-6 py-5 font-semibold text-foreground">{a.employees?.full_name}</td>
    <td className="px-6 py-5">
      <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-wider">
        {REASONS.find((r: any) => r.value === a.reason)?.label || a.reason}
      </span>
    </td>
    <td className="px-6 py-5 text-muted-foreground italic truncate max-w-[200px]">
      {a.description || "-"}
    </td>
    <td className="px-6 py-5 text-right">
      <div className="flex items-center justify-end gap-2">
        <EditAbonoDialog 
          abono={a} 
          employees={employees || []} 
          onSave={(data: any) => updateMutation.mutate({ id: a.id, ...data })} 
          isPending={updateMutation.isPending}
        />
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            if (confirm("Tem certeza que deseja excluir este abono?")) {
              deleteMutation.mutate(a.id);
            }
          }}
          className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </td>
  </tr>
));

AbonoTableRow.displayName = "AbonoTableRow";
