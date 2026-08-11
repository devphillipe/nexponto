import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { NextFlowBackground } from "@/components/NextFlowBackground";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/cadastro")({
  head: () => ({ meta: [{ title: "Cadastrar escritório — NexPonto" }] }),
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
    
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    }
    
    await new Promise(r => setTimeout(r, 800));
    navigate({ to: "/admin/dashboard" });
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 [padding-top:calc(1.5rem+var(--sat))] [padding-bottom:calc(1.5rem+var(--sab))] [padding-left:calc(1.5rem+var(--sal))] [padding-right:calc(1.5rem+var(--sar))] relative overflow-hidden">
      <NextFlowBackground />
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 pointer-events-none">
        <div className="absolute top-[-15%] right-[-15%] w-[60%] h-[60%] bg-primary/20 blur-[140px] rounded-full"></div>
        <div className="absolute bottom-[-15%] left-[-15%] w-[60%] h-[60%] bg-accent/20 blur-[140px] rounded-full"></div>
      </div>

      <div className="w-full max-w-3xl space-y-8 sm:space-y-12 animate-in fade-in zoom-in-95 duration-1000 slide-in-from-bottom-8 relative z-10">
        <div className="text-center space-y-3 sm:space-y-4 px-4">
           <Link to="/" className="inline-flex mx-auto mb-4 sm:mb-6 hover:scale-105 transition-transform duration-500">
              <Logo size={28} wordmarkClassName="text-2xl sm:text-3xl" />
           </Link>
           <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground drop-shadow-sm">Comece sua gestão hoje</h1>
           <p className="text-muted-foreground text-base sm:text-xl font-medium opacity-80">Revolucione o controle de ponto da sua equipe.</p>
        </div>

        <div className="glass-card rounded-3xl sm:rounded-[3rem] p-6 sm:p-12 border border-primary/10 shadow-2xl relative bg-background/40 backdrop-blur-2xl mx-4 sm:mx-0">
          <form onSubmit={onSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="tn" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome do Escritório</Label>
                    <Input 
                      id="tn" 
                      placeholder="Ex: Contabilidade Silva"
                      required 
                      value={form.tenant_name} 
                      onChange={(e) => up("tenant_name", e.target.value)}
                      className="bg-muted/20 border-border/40 rounded-2xl h-14 px-5 focus-visible:ring-primary/20 transition-all font-medium"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="td" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">CPF/CNPJ (Opcional)</Label>
                    <Input 
                      id="td" 
                      placeholder="00.000.000/0000-00"
                      value={form.tenant_document} 
                      onChange={(e) => up("tenant_document", e.target.value)}
                      className="bg-muted/20 border-border/40 rounded-2xl h-14 px-5 focus-visible:ring-primary/20 transition-all font-medium"
                    />
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="tp" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Telefone de Contato</Label>
                    <Input 
                      id="tp" 
                      placeholder="(00) 00000-0000"
                      value={form.tenant_phone} 
                      onChange={(e) => up("tenant_phone", e.target.value)}
                      className="bg-muted/20 border-border/40 rounded-2xl h-14 px-5 focus-visible:ring-primary/20 transition-all font-medium"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="ae" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">E-mail Administrativo</Label>
                    <Input 
                      id="ae" 
                      type="email" 
                      placeholder="admin@escritorio.com"
                      required 
                      value={form.email} 
                      onChange={(e) => up("email", e.target.value)}
                      className="bg-muted/20 border-border/40 rounded-2xl h-14 px-5 focus-visible:ring-primary/20 transition-all font-medium"
                    />
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="pw" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Criar Senha</Label>
                    <Input 
                      id="pw" 
                      type="password" 
                      placeholder="••••••••"
                      required 
                      value={form.password} 
                      onChange={(e) => up("password", e.target.value)}
                      className="bg-muted/20 border-border/40 rounded-2xl h-14 px-5 focus-visible:ring-primary/20 transition-all font-medium"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="pc" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Confirmar Senha</Label>
                    <Input 
                      id="pc" 
                      type="password" 
                      placeholder="••••••••"
                      required 
                      value={form.confirm} 
                      onChange={(e) => up("confirm", e.target.value)}
                      className="bg-muted/20 border-border/40 rounded-2xl h-14 px-5 focus-visible:ring-primary/20 transition-all font-medium"
                    />
                 </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <Button type="submit" disabled={loading} className="premium-button w-full h-16 rounded-2xl text-lg font-bold">
                {loading ? "Criando conta..." : "Criar Meu Escritório"}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground px-8 leading-relaxed">
                Ao criar uma conta, você concorda com nossos Termos de Uso e Política de Privacidade. Seu escritório será o administrador do sistema.
              </p>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-border/40 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Já possui um escritório cadastrado?{" "}
              <Link to="/admin/login" className="text-primary font-bold hover:underline decoration-2 underline-offset-4">
                Fazer login
              </Link>
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
               <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Sem cartão</span>
               <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Setup instantâneo</span>
               <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> LGPD Ready</span>
            </div>
          </div>
        </div>

        <div className="text-center">
           <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group">
             <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Voltar para o início
           </Link>
        </div>
      </div>
    </div>
  );
}
