import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/cadastro")({
  head: () => ({ meta: [{ title: "Cadastrar escritório" }] }),
  component: AdminSignup,
});

function AdminSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tenant_name: "",
    tenant_document: "",
    tenant_phone: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);

  function up<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/dashboard`,
        data: {
          signup_type: "admin",
          full_name: form.tenant_name,
          tenant_name: form.tenant_name,
          tenant_document: form.tenant_document,
          tenant_phone: form.tenant_phone,
          tenant_email: form.email,
        },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    toast.success("Escritório criado com sucesso!");
    // Auto-confirm is on, so session should be active. Otherwise sign in.
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    }
    navigate({ to: "/admin/dashboard" });
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          ← Voltar
        </Link>
        <div className="glass-card rounded-2xl p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold">Cadastre seu escritório</h1>
              <p className="text-xs text-muted-foreground">Conta administrativa do escritório</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-4 rounded-lg border border-border bg-card/40 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="tn">Nome do escritório *</Label>
                <Input 
                  id="tn" 
                  placeholder="Ex: Contabilidade Silva"
                  required 
                  value={form.tenant_name} 
                  onChange={(e) => up("tenant_name", e.target.value)} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="td">CPF/CNPJ</Label>
                  <Input 
                    id="td" 
                    placeholder="00.000.000/0000-00"
                    value={form.tenant_document} 
                    onChange={(e) => up("tenant_document", e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tp">Telefone</Label>
                  <Input 
                    id="tp" 
                    placeholder="(00) 00000-0000"
                    value={form.tenant_phone} 
                    onChange={(e) => up("tenant_phone", e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ae">E-mail (login) *</Label>
                <Input 
                  id="ae" 
                  type="email" 
                  placeholder="admin@escritorio.com"
                  required 
                  value={form.email} 
                  onChange={(e) => up("email", e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pw">Senha *</Label>
                  <Input 
                    id="pw" 
                    type="password" 
                    required 
                    value={form.password} 
                    onChange={(e) => up("password", e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pc">Confirmar *</Label>
                  <Input 
                    id="pc" 
                    type="password" 
                    required 
                    value={form.confirm} 
                    onChange={(e) => up("confirm", e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full py-6 text-base shadow-[var(--shadow-glow)]">
              {loading ? "Criando..." : "Criar conta do escritório"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
