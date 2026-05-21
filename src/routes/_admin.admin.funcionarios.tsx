import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createEmployee, toggleEmployeeActive } from "@/lib/employees.functions";
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
import { Plus, Mail } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/funcionarios")({
  head: () => ({ meta: [{ title: "Funcionários — Admin" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const qc = useQueryClient();
  const toggleFn = useServerFn(toggleEmployeeActive);
  const [open, setOpen] = useState(false);

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
      toast.success(active ? "Funcionário ativado" : "Funcionário desativado");
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Funcionários</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre e gerencie os colaboradores do escritório.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar funcionário</DialogTitle>
            </DialogHeader>
            <NewEmployeeForm onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["employees"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : !employees?.length ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhum funcionário cadastrado ainda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-card/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Jornada</th>
                <th className="px-4 py-3 text-right">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-medium">{e.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.position || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3 w-3" /> {e.email}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.daily_hours ? `${e.daily_hours}h` : "Padrão"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Switch
                      checked={e.active}
                      onCheckedChange={(v) => handleToggle(e.id, v)}
                    />
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
