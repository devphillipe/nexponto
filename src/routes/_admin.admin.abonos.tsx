import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Plus, Search, Calendar as CalendarIcon, User, Trash2, FileCheck, Edit2 } from "lucide-react";
import { useState, memo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { worksOn } from "@/lib/work-days";

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
        .select("id, full_name, work_days")
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
    mutationFn: async (payload: { employees: { id: string; dates: string[] }[]; reason: string; description: string }) => {
      const { employees: selectedEmployees, reason, description } = payload;
      const reasonLabel = REASONS.find((r) => r.value === reason)?.label || reason;

      const absenceRows = selectedEmployees.flatMap(({ id: employee_id, dates }) =>
        dates.map((absence_date) => ({
          employee_id,
          absence_date,
          reason: reason as any,
          description,
          tenant_id: profile!.tenant_id,
          approved_by: profile!.id,
        }))
      );

      const { error: absenceError } = await supabase.from("absences").insert(absenceRows);
      if (absenceError) throw absenceError;

      const entryRows = absenceRows.map((a) => ({
        employee_id: a.employee_id,
        tenant_id: profile!.tenant_id,
        entry_date: a.absence_date,
        entry_at: `${a.absence_date}T00:00:00Z`,
        entry_type: "entrada" as any,
        notes: `ABONO: ${reasonLabel}. ${description || ""}`,
        source: "manual_admin" as any,
        is_adjustment: true,
        created_by: profile!.id,
      }));

      const { error: entryError } = await supabase.from("time_entries").insert(entryRows);
      if (entryError) console.error("Erro ao criar entradas de ponto para abono:", entryError);

      return absenceRows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      setIsAddOpen(false);
      toast.success(count === 1 ? "Abono registrado com sucesso!" : `${count} abonos registrados com sucesso!`);
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
            <Button size="lg" className="rounded-xl md:rounded-2xl shadow-sm shadow-primary/20 font-extrabold tracking-tight text-[10px] md:text-xs px-6 md:px-8 h-12 md:h-14 w-full lg:w-auto">
              <Plus className="h-5 w-5" /> Novo Abono
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] rounded-2xl border-none glass-card p-0 overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto">
            <BatchAbonoForm
              employees={employees || []}
              isPending={addMutation.isPending}
              onCancel={() => setIsAddOpen(false)}
              onSubmit={(payload) => addMutation.mutate(payload)}
            />
          </DialogContent>

        </Dialog>
      </div>

      <div className="glass-card p-5 rounded-2xl flex items-center gap-5 border border-border shadow-sm transition-all hover:border-primary/20">
        <Search className="h-6 w-6 text-primary ml-3" />
        <Input 
          placeholder="Pesquisar por colaborador ou motivo..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none text-base focus-visible:ring-0"
        />
      </div>

      <div className="glass-card overflow-hidden rounded-2xl md:rounded-2xl border border-border shadow-sm transition-all duration-500 hover:shadow-md">
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
            <thead className="border-b border-border bg-muted/20 text-left text-[11px] uppercase font-bold tracking-widest text-muted-foreground">
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

type BatchPayload = { employees: { id: string; dates: string[] }[]; reason: string; description: string };

function buildDateRange(start: string, end: string): string[] {
  if (!start) return [];
  const finish = end && end >= start ? end : start;
  const dates: string[] = [];
  const cursor = new Date(start + "T12:00:00");
  const last = new Date(finish + "T12:00:00");
  while (cursor <= last && dates.length < 366) {
    dates.push(format(cursor, "yyyy-MM-dd"));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function BatchAbonoForm({
  employees,
  isPending,
  onCancel,
  onSubmit,
}: {
  employees: { id: string; full_name: string; work_days?: number[] | null }[];
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (payload: BatchPayload) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [followScale, setFollowScale] = useState(true);
  const [reason, setReason] = useState("atestado");
  const [description, setDescription] = useState("");

  const filteredEmployees = employees.filter((e) =>
    e.full_name.toLowerCase().includes(empSearch.toLowerCase())
  );
  const allSelected = filteredEmployees.length > 0 && filteredEmployees.every((e) => selected.includes(e.id));
  const allDates = buildDateRange(startDate, endDate);
  const datesFor = (emp: { work_days?: number[] | null }) =>
    followScale ? allDates.filter((d) => worksOn(emp.work_days, d)) : allDates;
  const total = selected.reduce(
    (acc, id) => acc + datesFor(employees.find((e) => e.id === id) || { work_days: null }).length,
    0
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const toggleAll = () =>
    setSelected((prev) =>
      allSelected
        ? prev.filter((id) => !filteredEmployees.some((e) => e.id === id))
        : Array.from(new Set([...prev, ...filteredEmployees.map((e) => e.id)]))
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected.length) return toast.error("Selecione ao menos um colaborador.");
        if (!allDates.length) return toast.error("Selecione ao menos uma data válida.");
        if (description.trim().length < 3) return toast.error("Informe uma justificativa de pelo menos 3 caracteres.");
        onSubmit({
          employees: selected.map((id) => ({
            id,
            dates: datesFor(employees.find((e) => e.id === id) || { work_days: null }),
          })),
          reason,
          description: description.trim(),
        });
      }}
    >
      <DialogHeader className="p-6 md:p-8 pb-4">
        <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          <FileCheck className="h-6 w-6" /> Registrar Abono
        </DialogTitle>
        <DialogDescription>Abone um ou vários dias para um ou vários colaboradores.</DialogDescription>
      </DialogHeader>

      <div className="p-6 md:p-8 pt-4 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Colaboradores ({selected.length} selecionados)</Label>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-bold" onClick={toggleAll}>
              {allSelected ? "Limpar seleção" : "Selecionar todos"}
            </Button>
          </div>
          <Input
            placeholder="Buscar colaborador..."
            value={empSearch}
            onChange={(e) => setEmpSearch(e.target.value)}
            className="rounded-xl h-11 border-border bg-background/50"
          />
          <div className="max-h-52 overflow-y-auto rounded-xl border border-border bg-background/40 divide-y divide-border/20">
            {filteredEmployees.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum colaborador encontrado.</p>
            ) : (
              filteredEmployees.map((emp) => (
                <label
                  key={emp.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                >
                  <Checkbox checked={selected.includes(emp.id)} onCheckedChange={() => toggle(emp.id)} />
                  <span className="text-sm font-medium">{emp.full_name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Data inicial</Label>
            <Input
              id="start-date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl h-11 border-border bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">Data final (opcional)</Label>
            <Input
              id="end-date"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl h-11 border-border bg-background/50"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={followScale} onCheckedChange={(v) => setFollowScale(v === true)} />
          <span className="text-sm text-muted-foreground">Seguir a escala de cada colaborador — dias fora da escala não recebem abono</span>
        </label>

        <div className="space-y-2">
          <Label htmlFor="reason">Motivo</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="rounded-xl h-11 border-border bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Justificativa *</Label>
          <Textarea
            id="description"
            required
            minLength={3}
            maxLength={500}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Atestado médico de 2 dias"
            className="rounded-xl border-border bg-background/50"
          />
        </div>

        {total > 0 && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
            <span className="font-bold text-primary">{total}</span> abono(s) serão criados —{" "}
            {selected.length} colaborador(es), {allDates.length} dia(s) no período
            {followScale ? " (seguindo a escala de cada um)" : ""}.
          </div>
        )}
      </div>

      <DialogFooter className="p-6 md:p-8 bg-muted/20 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl">Cancelar</Button>
        <Button type="submit" disabled={isPending || total === 0} className="rounded-xl px-8 font-bold">
          {isPending ? "Salvando..." : total > 1 ? `Salvar ${total} abonos` : "Salvar Abono"}
        </Button>
      </DialogFooter>
    </form>
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
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-none glass-card p-0 overflow-hidden shadow-2xl">
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
                <SelectTrigger className="rounded-xl h-11 border-border bg-background/50">
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
                <Input id="edit-date" name="date" type="date" defaultValue={abono.absence_date} required className="rounded-xl h-11 border-border bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reason">Motivo</Label>
                <Select name="reason" defaultValue={abono.reason} required>
                  <SelectTrigger className="rounded-xl h-11 border-border bg-background/50">
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
              <Textarea id="edit-description" name="description" required minLength={3} maxLength={500} rows={3} defaultValue={abono.description} placeholder="Ex: Atestado médico de 2 dias" className="rounded-xl border-border bg-background/50" />
            </div>
          </div>
          <DialogFooter className="p-8 bg-muted/20 border-t border-border">
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
