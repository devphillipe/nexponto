import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Users, ArrowLeft, ShieldCheck, Fingerprint } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/funcionario/login")({
  head: () => ({ meta: [{ title: "Entrar — NexPonto Funcionário" }] }),
  component: FuncLogin,
});

function FuncLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setLoading(false);
        toast.error(error?.message ?? "Falha no login");
        return;
      }

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      if (roleError) {
        setLoading(false);
        toast.error("Erro ao verificar permissões.");
        return;
      }

      if (!roles?.some((r) => r.role === "employee")) {
        await supabase.auth.signOut();
        setLoading(false);
        toast.error("Esta conta não é de funcionário.");
        return;
      }
      
      navigate({ to: "/funcionario/meu-ponto" });
    } catch (err) {
      setLoading(false);
      toast.error("Ocorreu um erro inesperado.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
           <Link to="/" className="inline-flex items-center gap-2 group mx-auto mb-4">
              <div className="h-12 w-12 rounded-2xl bg-[var(--gradient-primary)] shadow-[var(--shadow-glow)] grid place-items-center">
                 <Clock className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-display text-2xl font-bold tracking-tight">NexPonto</span>
           </Link>
           <h1 className="text-3xl font-bold tracking-tight">Portal do Funcionário</h1>
           <p className="text-muted-foreground">Bem-vindo de volta! Acesse para registrar seu ponto.</p>
        </div>

        <div className="glass-card rounded-[2.5rem] p-10 border border-primary/10 shadow-premium relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-12 w-12 rounded-2xl bg-background border border-border grid place-items-center text-primary shadow-lg">
             <Fingerprint className="h-6 w-6" />
          </div>

          <form onSubmit={onSubmit} className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">E-mail de Acesso</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu.email@empresa.com"
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-muted/30 border-none rounded-2xl h-12 px-4 focus-visible:ring-primary/40"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <Label htmlFor="password" title="Senha" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sua Senha</Label>
                  <a href="#" className="text-[11px] font-bold text-primary hover:underline">Esqueceu?</a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-muted/30 border-none rounded-2xl h-12 px-4 focus-visible:ring-primary/40"
                />
              </div>
            </div>
            
            <Button type="submit" disabled={loading} className="premium-button w-full h-14 rounded-2xl text-base font-bold">
              {loading ? "Entrando..." : "Acessar Portal"}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border/40 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
               <ShieldCheck className="h-3 w-3" /> Conexão Segura
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground italic">
              Se você ainda não tem seus dados de acesso, solicite ao RH do seu escritório.
            </p>
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
