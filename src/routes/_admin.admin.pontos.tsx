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
import { Clock, Calendar, Plus, Trash2, Edit2, History, User, ChevronDown, ChevronRight, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo, memo } from "react";
import { format } from "date-fns";
import { worksOn, formatWorkDays } from "@/lib/work-days";
import { LocationDialog } from "@/components/LocationDialog";

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
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  const toggleEmployee = (name: string) => {
    const next = new Set(expandedEmployees);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpandedEmployees(next);
  };

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, daily_hours, work_days")
        .eq("tenant_id", profile!.tenant_id)
        .eq("active", true)
        .order("full_name");
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
        .select("id, entry_date, entry_at, entry_type, source, is_adjustment, notes, employee_id, latitude, longitude, employees(id, full_name)")
        .eq("tenant_id", profile!.tenant_id)
        .eq("entry_date", date)
        .order("entry_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: absencesData } = useQuery({
    queryKey: ["absences", date, profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absences")
        .select("*, employees(id, full_name)")
        .eq("tenant_id", profile!.tenant_id)
        .eq("absence_date", date);
      if (error) throw error;
      return data;
    },
  });

  const groupedData = useMemo(() => {
    const acc: any = {};
    
    data?.forEach((entry: any) => {
      const name = entry.employees?.full_name || "Sem Nome";
      if (!acc[name]) acc[name] = { entries: [], absences: [] };
      acc[name].entries.push(entry);
    });

    absencesData?.forEach((abs: any) => {
      const name = abs.employees?.full_name || "Sem Nome";
      if (!acc[name]) acc[name] = { entries: [], absences: [] };
      acc[name].absences.push(abs);
    });

    return acc;
  }, [data, absencesData]);

  const addMutation = useMutation({
    mutationFn: async (newData: any) => {
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
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const batchMutation = useMutation({
    mutationFn: async (payload: BatchPontoPayload) => {
      const rows: any[] = [];
      for (const emp of payload.employees) {
        for (const d of emp.dates) {
          for (const [type, time] of Object.entries(emp.times)) {
            if (!time) continue;
            const timePart = time.length === 5 ? `${time}:00` : time;
            rows.push({
              employee_id: emp.id,
              tenant_id: profile!.tenant_id,
              entry_date: d,
              entry_at: new Date(`${d}T${timePart}`).toISOString(),
              entry_type: type,
              notes: payload.notes,
              source: "manual_admin",
              is_adjustment: true,
              created_by: profile!.id,
            });
          }
        }
      }
      if (!rows.length) throw new Error("Nenhum registro para salvar.");
      const { error } = await supabase.from("time_entries").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      setIsBatchOpen(false);
      toast.success(count === 1 ? "Ponto registrado!" : `${count} registros criados!`);
    },
    onError: (error: any) => toast.error("Erro ao registrar: " + error.message),
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">Registros de Ponto</h1>
          <p className="text-muted-foreground mt-2 md:mt-3 text-base md:text-xl font-medium">Visualize e audite todas as batidas em tempo real.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="glass-card p-2 md:p-3 rounded-xl md:rounded-2xl flex items-center gap-4 h-12 md:h-14 border border-border/40 shadow-sm transition-all hover:border-primary/30 w-full sm:w-auto">
            <Calendar className="h-4 md:h-5 w-4 md:w-5 text-primary ml-2 md:ml-3" />
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="bg-transparent border-none text-sm md:text-base font-bold focus-visible:ring-0 w-full sm:w-40 md:w-44 p-0 h-auto"
            />
          </div>

          <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-xl md:rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px] md:text-xs px-6 md:px-8 h-12 md:h-14 w-full sm:w-auto">
                <Plus className="h-5 w-5" /> Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px] rounded-[2rem] border-none glass-card p-0 overflow-hidden max-h-[90dvh] overflow-y-auto">
              <BatchPontoForm
                employees={(employees as any) || []}
                defaultDate={date}
                isPending={batchMutation.isPending}
                onCancel={() => setIsBatchOpen(false)}
                onSubmit={(p) => batchMutation.mutate(p)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditingEntry(null);
          }}>
            <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none glass-card p-0 overflow-hidden">

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const notes = String(formData.get("notes") || "").trim();
                if (!notes) {
                  toast.error("Informe uma justificativa para o registro manual.");
                  return;
                }
                addMutation.mutate({
                  employee_id: formData.get("employee_id"),
                  entry_date: formData.get("entry_date"),
                  entry_time: formData.get("entry_time"),
                  entry_type: formData.get("entry_type"),
                  notes,
                });
              }}>
                <DialogHeader className="p-8 pb-4">
                  <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                    {editingEntry ? <Edit2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                    {editingEntry ? "Ajustar Ponto" : "Registrar Ponto"}
                  </DialogTitle>
                  <DialogDescription>
                    Registros manuais ficam marcados como ajuste e exigem justificativa.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-8 pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_id_field">Colaborador *</Label>
                    <Select name="employee_id" defaultValue={editingEntry?.employee_id} required>
                      <SelectTrigger id="employee_id_field" className="rounded-xl h-11 border-border/40 bg-background/50">
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
                      <Label htmlFor="entry_date">Data *</Label>
                      <Input id="entry_date" name="entry_date" type="date" defaultValue={editingEntry?.entry_date || date} required className="rounded-xl h-11 border-border/40 bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="entry_time">Horário *</Label>
                      <Input id="entry_time" name="entry_time" type="time" step="1" inputMode="numeric" defaultValue={editingEntry ? format(new Date(editingEntry.entry_at), "HH:mm:ss") : ""} required className="rounded-xl h-11 border-border/40 bg-background/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entry_type_field">Tipo de Registro *</Label>
                    <Select name="entry_type" defaultValue={editingEntry?.entry_type || "entrada"} required>
                      <SelectTrigger id="entry_type_field" className="rounded-xl h-11 border-border/40 bg-background/50">
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
                    <Label htmlFor="notes">Justificativa *</Label>
                    <Input id="notes" name="notes" required minLength={3} maxLength={300} placeholder="Motivo do ajuste manual" defaultValue={editingEntry?.notes || ""} className="rounded-xl h-11 border-border/40 bg-background/50" aria-describedby="notes-hint" />
                    <p id="notes-hint" className="text-[11px] text-muted-foreground">Obrigatória para registros manuais. Mínimo 3 caracteres.</p>
                  </div>
                </div>
                <DialogFooter className="p-8 bg-muted/20 border-t border-border/40">
                  <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl">Cancelar</Button>
                  <Button type="submit" disabled={addMutation.isPending} aria-busy={addMutation.isPending} className="rounded-xl px-8 font-bold">
                    {addMutation.isPending ? "Salvando..." : "Salvar Registro"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="glass-card p-16 text-center text-sm text-muted-foreground animate-pulse rounded-[2rem]">Carregando registros...</div>
        ) : !Object.keys(groupedData).length ? (
          <div className="glass-card p-20 text-center space-y-4 rounded-[2rem]">
             <div className="h-16 w-16 bg-muted/30 rounded-full grid place-items-center mx-auto">
                <Clock className="h-8 w-8 text-muted-foreground" />
             </div>
             <p className="text-muted-foreground">Nenhum ponto registrado nesta data.</p>
          </div>
        ) : (
          Object.entries(groupedData).map(([employeeName, group]: [string, any]) => {
            const isExpanded = expandedEmployees.has(employeeName);
            const totalItems = group.entries.length + group.absences.length;
            return (
              <div key={employeeName} className="glass-card overflow-hidden rounded-2xl md:rounded-[2.5rem] border border-border/40 bg-background/20 backdrop-blur-xl shadow-sm transition-all duration-500 hover:shadow-md hover:border-primary/10">
                <div 
                  className="px-6 md:px-10 py-5 md:py-7 border-b border-border/20 bg-muted/5 flex items-center justify-between cursor-pointer group"
                  onClick={() => toggleEmployee(employeeName)}
                >
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="h-10 md:h-14 w-10 md:w-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary transition-transform group-hover:scale-105">
                      {isExpanded ? <ChevronDown className="h-5 md:h-6 w-5 md:w-6" /> : <ChevronRight className="h-5 md:h-6 w-5 md:w-6" />}
                    </div>
                    <div>
                      <h3 className="font-display text-lg md:text-2xl font-bold tracking-tight text-foreground">{employeeName}</h3>
                      <div className="flex items-center gap-2 md:gap-3 mt-0.5 md:mt-1">
                        <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-muted-foreground opacity-80">{totalItems} registro(s)</span>
                        <div className="h-1 w-1 rounded-full bg-border"></div>
                        <span className="text-[9px] md:text-xs font-bold text-primary">Visualizar</span>
                      </div>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="bg-muted/5 text-left text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        <tr>
                          <th className="px-8 py-4">Horário / Tipo</th>
                          <th className="px-6 py-4">Detalhes</th>
                          <th className="px-6 py-4">Origem</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {group.absences.map((a: any) => (
                          <AbsenceEntryRow key={a.id} a={a} />
                        ))}
                        {group.entries.sort((a: any, b: any) => new Date(a.entry_at).getTime() - new Date(b.entry_at).getTime()).map((e: any) => (
                          <PointEntryRow 
                            key={e.id} 
                            e={e} 
                            TYPE_LABEL={TYPE_LABEL} 
                            handleEdit={handleEdit} 
                            deleteMutation={deleteMutation} 
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

type EmpOption = { id: string; full_name: string; daily_hours: number | null; work_days?: number[] | null };
type TimesMap = Record<string, string>;
type BatchPontoPayload = {
  employees: { id: string; times: TimesMap; dates: string[] }[];
  notes: string;
};

const FULL_SEQUENCE = ["entrada", "saida_almoco", "retorno_almoco", "saida"];
const SHORT_SEQUENCE = ["entrada", "saida"];

const DEFAULT_TIMES: TimesMap = {
  entrada: "08:00",
  saida_almoco: "12:00",
  retorno_almoco: "13:00",
  saida: "17:00",
};

function sequenceFor(emp: EmpOption) {
  return emp.daily_hours != null && Number(emp.daily_hours) < 8 ? SHORT_SEQUENCE : FULL_SEQUENCE;
}

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

function BatchPontoForm({
  employees,
  defaultDate,
  isPending,
  onCancel,
  onSubmit,
}: {
  employees: EmpOption[];
  defaultDate: string;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (payload: BatchPontoPayload) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [times, setTimes] = useState<Record<string, TimesMap>>({});
  const [empSearch, setEmpSearch] = useState("");
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState("");
  const [followScale, setFollowScale] = useState(true);
  const [standard, setStandard] = useState<TimesMap>({ ...DEFAULT_TIMES });
  const [notes, setNotes] = useState("");

  const filtered = employees.filter((e) => e.full_name.toLowerCase().includes(empSearch.toLowerCase()));
  const allSelected = filtered.length > 0 && filtered.every((e) => selected.includes(e.id));
  const allDates = buildDateRange(startDate, endDate);
  const datesFor = (emp: EmpOption) => (followScale ? allDates.filter((d) => worksOn(emp.work_days, d)) : allDates);

  const defaultsFor = (emp: EmpOption): TimesMap => {
    const seq = sequenceFor(emp);
    const map: TimesMap = {};
    seq.forEach((t) => (map[t] = standard[t] || ""));
    return map;
  };

  const select = (emp: EmpOption) => {
    setSelected((prev) => [...prev, emp.id]);
    setTimes((prev) => ({ ...prev, [emp.id]: prev[emp.id] || defaultsFor(emp) }));
  };

  const toggle = (emp: EmpOption) => {
    if (selected.includes(emp.id)) setSelected((prev) => prev.filter((i) => i !== emp.id));
    else select(emp);
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !filtered.some((e) => e.id === id)));
    } else {
      const add = filtered.filter((e) => !selected.includes(e.id));
      setSelected((prev) => Array.from(new Set([...prev, ...add.map((e) => e.id)])));
      setTimes((prev) => {
        const next = { ...prev };
        add.forEach((e) => (next[e.id] = next[e.id] || defaultsFor(e)));
        return next;
      });
    }
  };

  const applyStandardToAll = () => {
    setTimes((prev) => {
      const next = { ...prev };
      employees.filter((e) => selected.includes(e.id)).forEach((e) => (next[e.id] = defaultsFor(e)));
      return next;
    });
    toast.success("Horário padrão aplicado a todos os selecionados.");
  };

  const selectedEmployees = employees.filter((e) => selected.includes(e.id));
  const punchesPerDay = (e: EmpOption) => Object.values(times[e.id] || {}).filter(Boolean).length;
  const total = selectedEmployees.reduce((acc, e) => acc + punchesPerDay(e) * datesFor(e).length, 0);

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!selectedEmployees.length) return toast.error("Selecione ao menos um colaborador.");
        if (!allDates.length) return toast.error("Selecione ao menos uma data válida.");
        if (notes.trim().length < 3) return toast.error("Informe uma justificativa de pelo menos 3 caracteres.");
        if (!total) return toast.error("Informe ao menos um horário.");
        onSubmit({
          employees: selectedEmployees.map((e) => ({ id: e.id, times: times[e.id] || {}, dates: datesFor(e) })),
          notes: notes.trim(),
        });
      }}
    >
      <DialogHeader className="p-6 md:p-8 pb-4">
        <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          <Users className="h-6 w-6" /> Registrar Ponto em Lote
        </DialogTitle>
        <DialogDescription>
          Registre um ou vários dias para um ou vários colaboradores, com horários individuais.
        </DialogDescription>
      </DialogHeader>

      <div className="p-6 md:p-8 pt-4 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="batch-start">Data inicial *</Label>
            <Input id="batch-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl h-11 border-border/40 bg-background/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batch-end">Data final (opcional)</Label>
            <Input id="batch-end" type="date" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl h-11 border-border/40 bg-background/50" />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={followScale} onCheckedChange={(v) => setFollowScale(v === true)} />
          <span className="text-sm text-muted-foreground">Seguir a escala de cada colaborador — dias fora da escala não recebem registros</span>
        </label>

        <div className="space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Horário padrão</Label>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-bold" onClick={applyStandardToAll}>
              Aplicar a todos
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FULL_SEQUENCE.map((t) => (
              <div key={t} className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{TYPE_LABEL[t]}</span>
                <Input
                  type="time"
                  value={standard[t] || ""}
                  onChange={(e) => setStandard((prev) => ({ ...prev, [t]: e.target.value }))}
                  className="rounded-xl h-10 border-border/40 bg-background/50"
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Colaboradores com jornada menor que 8h recebem apenas entrada e saída.
          </p>
        </div>

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
            className="rounded-xl h-11 border-border/40 bg-background/50"
          />
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border/40 bg-background/40 divide-y divide-border/20">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum colaborador encontrado.</p>
            ) : (
              filtered.map((emp) => {
                const isOn = selected.includes(emp.id);
                const seq = sequenceFor(emp);
                return (
                  <div key={emp.id} className="px-4 py-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={isOn} onCheckedChange={() => toggle(emp)} />
                      <span className="text-sm font-medium flex-1">{emp.full_name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {emp.daily_hours ? `${Number(emp.daily_hours)}h` : "—"}
                      </span>
                    </label>
                    {isOn && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
                        {seq.map((t) => (
                          <div key={t} className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{TYPE_LABEL[t]}</span>
                            <Input
                              type="time"
                              value={times[emp.id]?.[t] || ""}
                              onChange={(e) =>
                                setTimes((prev) => ({
                                  ...prev,
                                  [emp.id]: { ...(prev[emp.id] || {}), [t]: e.target.value },
                                }))
                              }
                              className="rounded-lg h-10 border-border/40 bg-background/50 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="batch-notes">Justificativa *</Label>
          <Textarea
            id="batch-notes"
            required
            minLength={3}
            maxLength={500}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Ajuste de ponto por falha no aplicativo"
            className="rounded-xl border-border/40 bg-background/50"
          />
        </div>

        {total > 0 && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
            <span className="font-bold text-primary">{total}</span> batida(s) serão criadas —{" "}
            {selectedEmployees.length} colaborador(es) × {dates.length} dia(s).
          </div>
        )}
      </div>

      <DialogFooter className="p-6 md:p-8 bg-muted/20 border-t border-border/40">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl">Cancelar</Button>
        <Button type="submit" disabled={isPending || total === 0} className="rounded-xl px-8 font-bold">
          {isPending ? "Salvando..." : total > 1 ? `Salvar ${total} batidas` : "Salvar Registro"}
        </Button>
      </DialogFooter>
    </form>
  );
}


const PointEntryRow = memo(({ e, TYPE_LABEL, handleEdit, deleteMutation }: any) => (
  <tr className="hover:bg-muted/10 transition-colors group">
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
    <td className="px-6 py-5 text-muted-foreground font-medium">
      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
        e.entry_type === 'entrada' ? 'bg-success/10 text-success' :
        e.entry_type === 'saida' ? 'bg-destructive/10 text-destructive' :
        'bg-primary/10 text-primary'
      }`}>
        {TYPE_LABEL[e.entry_type]}
      </span>
    </td>
    <td className="px-6 py-5">
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${e.source === "manual_admin" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
        {e.source === "manual_admin" ? "Admin" : "App"}
      </span>
    </td>
    <td className="px-6 py-5 text-right space-x-2 whitespace-nowrap">
      {e.latitude != null && e.longitude != null && (
        <LocationDialog
          latitude={Number(e.latitude)}
          longitude={Number(e.longitude)}
          label={`${TYPE_LABEL[e.entry_type]} — ${new Date(e.entry_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
        />
      )}
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
));

PointEntryRow.displayName = "PointEntryRow";

const AbsenceEntryRow = memo(({ a }: any) => (
  <tr className="bg-primary/5 hover:bg-primary/10 transition-colors group">
    <td className="px-8 py-5">
      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground uppercase whitespace-nowrap">
        ABONO: {a.reason}
      </span>
    </td>
    <td className="px-6 py-5 text-muted-foreground italic">
      {a.description || "Sem justificativa"}
    </td>
    <td className="px-6 py-5">
      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
        Admin
      </span>
    </td>
    <td className="px-6 py-5 text-right">
      <span className="text-xs text-muted-foreground whitespace-nowrap">Gerenciado em Abonos</span>
    </td>
  </tr>
));

AbsenceEntryRow.displayName = "AbsenceEntryRow";
