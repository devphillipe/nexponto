import { createFileRoute } from "@tanstack/react-router";
import { memo, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createEmployee, toggleEmployeeActive, updateEmployee } from "@/lib/employees.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Mail, User, Briefcase, Calendar, ShieldCheck, Search, Edit2 } from "lucide-react";
import { TableSkeleton } from "@/components/SkeletonLoader";
import { CpfInput, PhoneInput, DateBrInput } from "@/components/forms/SpecializedInputs";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { cpfSchema, phoneSchema, emailSchema, strongPasswordSchema } from "@/lib/validators";
import { dateBrToIso, dateIsoToBr, isValidDateBr } from "@/lib/masks";
import {
  DEFAULT_WORK_DAYS,
  WEEK_DAYS,
  formatWorkDays,
  normalizeWorkDays,
} from "@/lib/work-days";
import { z } from "zod";

function WorkDaysPicker({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const toggle = (d: number) =>
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort((a, b) => a - b));

  return (
    <fieldset className="space-y-2 rounded-2xl border border-border/40 bg-muted/10 p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Dias de trabalho
      </legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Dias de trabalho">
        {WEEK_DAYS.map((d) => {
          const on = value.includes(d.value);
          return (
            <button
              key={d.value}
              type="button"
              id={`${idPrefix}-wd-${d.value}`}
              aria-pressed={on}
              aria-label={d.long}
              onClick={() => toggle(d.value)}
              className={`h-10 min-w-[3rem] rounded-xl border px-3 text-xs font-bold uppercase tracking-wide transition-all ${
                on
                  ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                  : "border-border/40 bg-background/60 text-muted-foreground hover:border-primary/30"
              }`}
            >
              {d.short}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] font-bold" onClick={() => onChange([...DEFAULT_WORK_DAYS])}>
          Seg a Sex
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] font-bold" onClick={() => onChange([0, 1, 2, 3, 4, 5, 6])}>
          Todos os dias
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg text-[11px] font-bold" onClick={() => onChange([])}>
          Limpar
        </Button>
        {value.length === 0 && (
          <span className="text-xs font-medium text-destructive" role="alert">
            Selecione ao menos um dia.
          </span>
        )}
      </div>
    </fieldset>
  );
}

export const Route = createFileRoute("/_admin/admin/funcionarios")({
  head: () => ({ meta: [{ title: "Funcionários — NexPonto Admin" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const qc = useQueryClient();
  const toggleFn = useServerFn(toggleEmployeeActive);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, email, cpf, phone, position, department, active, daily_hours, work_days, hire_date")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  async function handleToggle(id: string, active: boolean) {
    try {
      await toggleFn({ data: { employee_id: id, active } });
      toast.success(active ? "Colaborador reativado" : "Colaborador desativado");
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const filtered = useMemo(() => {
    return employees?.filter(e => 
      e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">Equipe</h1>
          <p className="text-muted-foreground mt-2 md:mt-3 text-base md:text-xl font-medium">Gerencie os colaboradores do seu escritório.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input 
              placeholder="Buscar colaborador..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 md:h-14 w-full sm:w-64 md:w-80 bg-muted/10 border-border/40 rounded-xl md:rounded-2xl transition-all hover:border-primary/20 focus:sm:w-80 md:focus:w-96 font-medium"
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-xl md:rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px] md:text-xs px-6 md:px-8 h-12 md:h-14 w-full sm:w-auto">
                <Plus className="mr-2 h-5 w-5" /> Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-primary/20 rounded-[2rem]">
              <div className="bg-primary/5 p-8 border-b border-primary/10">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display font-bold">Cadastrar Colaborador</DialogTitle>
                  <p className="text-muted-foreground text-sm mt-1">Preencha os dados abaixo para gerar as credenciais de acesso.</p>
                </DialogHeader>
              </div>
              <div className="p-8">
                <NewEmployeeForm onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["employees"] }); }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-[2.5rem] border border-border/40 shadow-sm transition-all duration-500 hover:shadow-md">
        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : !filtered?.length ? (
          <div className="p-20 text-center space-y-4">
             <div className="h-20 w-20 bg-muted/30 rounded-[1.5rem] grid place-items-center mx-auto mb-2">
                <User className="h-10 w-10 text-muted-foreground" />
             </div>
             <p className="text-muted-foreground font-medium">
               {searchTerm ? "Nenhum colaborador encontrado para esta busca." : "Sua equipe está vazia. Comece cadastrando alguém!"}
             </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
            <thead className="border-b border-border/40 bg-muted/20 text-left text-[11px] uppercase font-bold tracking-widest text-muted-foreground">
              <tr>
                <th className="px-8 py-4">Nome & Contato</th>
                <th className="px-6 py-4">Departamento / Cargo</th>
                <th className="px-6 py-4">Jornada Diária</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.map((e: any) => (
                <EmployeeTableRow 
                  key={e.id} 
                  e={e} 
                  handleToggle={handleToggle} 
                  qc={qc} 
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

const newEmployeeSchema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo.").max(120),
  email: emailSchema,
  password: strongPasswordSchema,
  cpf: z.string().optional().refine(
    (v) => !v || cpfSchema.safeParse(v).success,
    "Informe um CPF válido."
  ),
  phone: z.string().optional().refine(
    (v) => !v || phoneSchema.safeParse(v).success,
    "Informe um telefone válido."
  ),
  hire_date_br: z.string().optional().refine(
    (v) => !v || isValidDateBr(v),
    "Informe uma data válida (DD/MM/AAAA)."
  ),
});

function NewEmployeeForm({ onDone }: { onDone: () => void }) {
  const createFn = useServerFn(createEmployee);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [workDays, setWorkDays] = useState<number[]>([...DEFAULT_WORK_DAYS]);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    cpf: "",
    phone: "",
    position: "",
    department: "",
    hire_date_br: "",
    daily_hours: "",
  });

  function up<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: "" }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = newEmployeeSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Revise os campos destacados.");
      return;
    }
    setLoading(true);
    try {
      await createFn({
        data: {
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          cpf: form.cpf || null,
          phone: form.phone || null,
          position: form.position || null,
          department: form.department || null,
          hire_date: form.hire_date_br ? dateBrToIso(form.hire_date_br) : null,
          daily_hours: form.daily_hours ? Number(form.daily_hours) : null,
          work_days: workDays,
        },
      });
      toast.success("Funcionário cadastrado! Compartilhe e-mail e senha com ele.");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`${k}-error`} className="text-xs text-destructive font-medium" role="alert">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: string) => ({
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `${k}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="fn">Nome completo *</Label>
        <Input id="fn" autoComplete="name" required value={form.full_name} onChange={(e) => up("full_name", e.target.value)} {...aria("full_name")} />
        {err("full_name")}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="em">E-mail (login) *</Label>
          <Input id="em" type="email" autoComplete="email" inputMode="email" required value={form.email} onChange={(e) => up("email", e.target.value)} {...aria("email")} />
          {err("email")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Senha provisória *</Label>
          <PasswordInput id="pw" autoComplete="new-password" required value={form.password} onChange={(e) => up("password", e.target.value)} {...aria("password")} />
          {err("password")}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cpf">CPF</Label>
          <CpfInput id="cpf" value={form.cpf} onValueChange={(v) => up("cpf", v)} {...aria("cpf")} />
          {err("cpf")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <PhoneInput id="phone" value={form.phone} onValueChange={(v) => up("phone", v)} {...aria("phone")} />
          {err("phone")}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pos">Cargo</Label>
          <Input id="pos" autoComplete="organization-title" value={form.position} onChange={(e) => up("position", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dep">Departamento</Label>
          <Input id="dep" value={form.department} onChange={(e) => up("department", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="hd">Admissão</Label>
          <DateBrInput id="hd" value={form.hire_date_br} onValueChange={(v) => up("hire_date_br", v)} {...aria("hire_date_br")} />
          {err("hire_date_br")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dh">Jornada diária (h)</Label>
          <Input id="dh" type="number" inputMode="decimal" step="0.5" min="1" max="24" placeholder="Padrão do escritório" value={form.daily_hours} onChange={(e) => up("daily_hours", e.target.value)} />
        </div>
      </div>
      <WorkDaysPicker idPrefix="new" value={workDays} onChange={setWorkDays} />
      <Button type="submit" disabled={loading || workDays.length === 0} className="w-full" aria-busy={loading}>
        {loading ? "Cadastrando..." : "Cadastrar funcionário"}
      </Button>
    </form>
  );
}

const editEmployeeSchema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo.").max(120),
  email: emailSchema,
  cpf: z.string().optional().refine(
    (v) => !v || cpfSchema.safeParse(v).success,
    "Informe um CPF válido."
  ),
  phone: z.string().optional().refine(
    (v) => !v || phoneSchema.safeParse(v).success,
    "Informe um telefone válido."
  ),
  hire_date_br: z.string().optional().refine(
    (v) => !v || isValidDateBr(v),
    "Informe uma data válida (DD/MM/AAAA)."
  ),
});

function EditEmployeeDialog({ employee, onDone }: { employee: any, onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const updateFn = useServerFn(updateEmployee);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [workDays, setWorkDays] = useState<number[]>(normalizeWorkDays(employee.work_days));
  const [form, setForm] = useState({
    full_name: employee.full_name || "",
    email: employee.email || "",
    cpf: employee.cpf || "",
    phone: employee.phone || "",
    position: employee.position || "",
    department: employee.department || "",
    hire_date_br: employee.hire_date ? dateIsoToBr(employee.hire_date) : "",
    daily_hours: employee.daily_hours ? String(employee.daily_hours) : "",
  });

  function up<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: "" }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = editEmployeeSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Revise os campos destacados.");
      return;
    }
    setLoading(true);
    try {
      await updateFn({
        data: {
          id: employee.id,
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          cpf: form.cpf || null,
          phone: form.phone || null,
          position: form.position || null,
          department: form.department || null,
          hire_date: form.hire_date_br ? dateBrToIso(form.hire_date_br) : null,
          daily_hours: form.daily_hours ? Number(form.daily_hours) : null,
          work_days: workDays,
        },
      });
      toast.success("Dados do funcionário atualizados!");
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`edit-${k}-error`} className="text-xs text-destructive font-medium" role="alert">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: string) => ({
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `edit-${k}-error` : undefined,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Editar ${employee.full_name}`} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-primary/20 rounded-[2rem]">
        <div className="bg-primary/5 p-8 border-b border-primary/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold">Editar Colaborador</DialogTitle>
            <p className="text-muted-foreground text-sm mt-1">Atualize os dados cadastrais do funcionário.</p>
          </DialogHeader>
        </div>
        <div className="p-8">
          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="edit-fn">Nome completo *</Label>
              <Input id="edit-fn" autoComplete="name" required value={form.full_name} onChange={(e) => up("full_name", e.target.value)} {...aria("full_name")} />
              {err("full_name")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-em">E-mail (login) *</Label>
              <Input id="edit-em" type="email" autoComplete="email" inputMode="email" required value={form.email} onChange={(e) => up("email", e.target.value)} {...aria("email")} />
              {err("email")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cpf">CPF</Label>
                <CpfInput id="edit-cpf" value={form.cpf} onValueChange={(v) => up("cpf", v)} {...aria("cpf")} />
                {err("cpf")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Telefone</Label>
                <PhoneInput id="edit-phone" value={form.phone} onValueChange={(v) => up("phone", v)} {...aria("phone")} />
                {err("phone")}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-pos">Cargo</Label>
                <Input id="edit-pos" autoComplete="organization-title" value={form.position} onChange={(e) => up("position", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-dep">Departamento</Label>
                <Input id="edit-dep" value={form.department} onChange={(e) => up("department", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-hd">Admissão</Label>
                <DateBrInput id="edit-hd" value={form.hire_date_br} onValueChange={(v) => up("hire_date_br", v)} {...aria("hire_date_br")} />
                {err("hire_date_br")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-dh">Jornada diária (h)</Label>
                <Input id="edit-dh" type="number" inputMode="decimal" step="0.5" min="1" max="24" placeholder="Padrão do escritório" value={form.daily_hours} onChange={(e) => up("daily_hours", e.target.value)} />
              </div>
            </div>
            <WorkDaysPicker idPrefix={`edit-${employee.id}`} value={workDays} onChange={setWorkDays} />
            <Button type="submit" disabled={loading || workDays.length === 0} className="w-full mt-4" aria-busy={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}


const EmployeeTableRow = memo(({ e, handleToggle, qc }: { e: any, handleToggle: any, qc: any }) => (
  <tr className="hover:bg-muted/10 transition-colors group">
    <td className="px-8 py-5">
      <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/10 grid place-items-center font-bold text-primary group-hover:scale-110 transition-transform shrink-0">
            {e.full_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight truncate">{e.full_name}</div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-medium truncate">
                <Mail className="h-3 w-3 shrink-0" /> {e.email}
            </div>
          </div>
      </div>
    </td>
    <td className="px-6 py-5">
      <div className="space-y-0.5">
          <div className="font-semibold text-xs flex items-center gap-1.5">
            <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" /> {e.position || "Sem Cargo"}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{e.department || "Geral"}</div>
      </div>
    </td>
    <td className="px-6 py-5">
        <span className="px-3 py-1 bg-muted/50 rounded-lg text-xs font-bold border border-border/20 whitespace-nowrap">
          {e.daily_hours ? `${e.daily_hours} horas` : "Padrão (8h)"}
        </span>
    </td>
    <td className="px-8 py-5 text-right">
      <div className="flex items-center justify-end gap-3">
          <EditEmployeeDialog 
            employee={e} 
            onDone={() => qc.invalidateQueries({ queryKey: ["employees"] })} 
          />
          <div className="h-6 w-[1px] bg-border/40 mx-1"></div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${e.active ? "text-success" : "text-muted-foreground"}`}>
            {e.active ? "Ativo" : "Inativo"}
          </span>
          <Switch
            checked={e.active}
            onCheckedChange={(v) => handleToggle(e.id, v)}
            className="data-[state=checked]:bg-success"
          />
      </div>
    </td>
  </tr>
));

EmployeeTableRow.displayName = "EmployeeTableRow";
