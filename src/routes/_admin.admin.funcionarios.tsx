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
import { z } from "zod";

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
        .select("id, full_name, email, position, department, active, daily_hours, hire_date")
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

function NewEmployeeForm({ onDone }: { onDone: () => void }) {
  const createFn = useServerFn(createEmployee);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    cpf: "",
    phone: "",
    position: "",
    department: "",
    hire_date: "",
    daily_hours: "",
  });

  function up<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createFn({
        data: {
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          cpf: form.cpf || null,
          phone: form.phone || null,
          position: form.position || null,
          department: form.department || null,
          hire_date: form.hire_date || null,
          daily_hours: form.daily_hours ? Number(form.daily_hours) : null,
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

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="fn">Nome completo *</Label>
        <Input id="fn" required value={form.full_name} onChange={(e) => up("full_name", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="em">E-mail (login) *</Label>
          <Input id="em" type="email" required value={form.email} onChange={(e) => up("email", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Senha provisória *</Label>
          <Input id="pw" type="text" required minLength={8} value={form.password} onChange={(e) => up("password", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cpf">CPF</Label>
          <Input id="cpf" value={form.cpf} onChange={(e) => up("cpf", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" value={form.phone} onChange={(e) => up("phone", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pos">Cargo</Label>
          <Input id="pos" value={form.position} onChange={(e) => up("position", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dep">Departamento</Label>
          <Input id="dep" value={form.department} onChange={(e) => up("department", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="hd">Admissão</Label>
          <Input id="hd" type="date" value={form.hire_date} onChange={(e) => up("hire_date", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dh">Jornada diária (h)</Label>
          <Input id="dh" type="number" step="0.5" min="1" max="24" placeholder="Padrão do escritório" value={form.daily_hours} onChange={(e) => up("daily_hours", e.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Cadastrando..." : "Cadastrar funcionário"}
      </Button>
    </form>
  );
}

function EditEmployeeDialog({ employee, onDone }: { employee: any, onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const updateFn = useServerFn(updateEmployee);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: employee.full_name || "",
    email: employee.email || "",
    cpf: employee.cpf || "",
    phone: employee.phone || "",
    position: employee.position || "",
    department: employee.department || "",
    hire_date: employee.hire_date || "",
    daily_hours: employee.daily_hours ? String(employee.daily_hours) : "",
  });

  function up<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateFn({
        data: {
          id: employee.id,
          full_name: form.full_name,
          email: form.email,
          cpf: form.cpf || null,
          phone: form.phone || null,
          position: form.position || null,
          department: form.department || null,
          hire_date: form.hire_date || null,
          daily_hours: form.daily_hours ? Number(form.daily_hours) : null,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-primary/20 rounded-[2rem]">
        <div className="bg-primary/5 p-8 border-b border-primary/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold">Editar Colaborador</DialogTitle>
            <p className="text-muted-foreground text-sm mt-1">Atualize os dados cadastrais e credenciais do funcionário.</p>
          </DialogHeader>
        </div>
        <div className="p-8">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-fn">Nome completo *</Label>
              <Input id="edit-fn" required value={form.full_name} onChange={(e) => up("full_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-em">E-mail (login) *</Label>
              <Input id="edit-em" type="email" required value={form.email} onChange={(e) => up("email", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-cpf">CPF</Label>
                <Input id="edit-cpf" value={form.cpf} onChange={(e) => up("cpf", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input id="edit-phone" value={form.phone} onChange={(e) => up("phone", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-pos">Cargo</Label>
                <Input id="edit-pos" value={form.position} onChange={(e) => up("position", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-dep">Departamento</Label>
                <Input id="edit-dep" value={form.department} onChange={(e) => up("department", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-hd">Admissão</Label>
                <Input id="edit-hd" type="date" value={form.hire_date} onChange={(e) => up("hire_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-dh">Jornada diária (h)</Label>
                <Input id="edit-dh" type="number" step="0.5" min="1" max="24" placeholder="Padrão do escritório" value={form.daily_hours} onChange={(e) => up("daily_hours", e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-4">
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
