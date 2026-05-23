import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, ArrowLeft, Lock } from "lucide-react";
import { NextFlowBackground } from "@/components/NextFlowBackground";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Nova Senha — NexPonto" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  useEffect(() => {
    // Check if we have a session (Supabase handles the token in the URL and sets the session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsSessionActive(true);
      } else {
        toast.error("Sessão de recuperação expirada ou inválida.");
        navigate({ to: "/admin/login" });
      }
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Senha atualizada com sucesso!");
        navigate({ to: "/admin/login" });
      }
    } catch (err) {
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (!isSessionActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <p className="text-muted-foreground animate-pulse">Verificando sessão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <NextFlowBackground />
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-lg space-y-8 sm:space-y-12 animate-in fade-in zoom-in-95 duration-1000 slide-in-from-bottom-8 relative z-10">
        <div className="text-center space-y-3 sm:space-y-4 px-4">
           <div className="inline-flex mx-auto mb-4 sm:mb-6">
              <Logo size={28} wordmarkClassName="text-2xl sm:text-3xl" />
           </div>
           <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground drop-shadow-sm">Nova Senha</h1>
           <p className="text-muted-foreground text-base sm:text-lg font-medium opacity-80">Defina sua nova senha de acesso.</p>
        </div>

        <div className="glass-card rounded-3xl sm:rounded-[3rem] p-8 sm:p-12 border border-primary/10 shadow-2xl relative bg-background/40 backdrop-blur-2xl mx-4 sm:mx-0">
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 h-14 w-14 rounded-2xl bg-primary text-primary-foreground border border-primary shadow-xl shadow-primary/20 grid place-items-center">
             <KeyRound className="h-7 w-7" />
          </div>

          <form onSubmit={onSubmit} className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 ml-2">Nova Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-muted/20 border-border/40 rounded-2xl h-14 pl-12 pr-4 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 ml-2">Confirmar Nova Senha</Label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="••••••••"
                    required 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-muted/20 border-border/40 rounded-2xl h-14 pl-12 pr-4 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                  />
                </div>
              </div>
            </div>
            
            <Button type="submit" disabled={loading} className="premium-button w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] transition-all">
              {loading ? "Atualizando..." : "Alterar Senha"}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border/40 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
               <ShieldCheck className="h-3 w-3" /> Segurança NexPonto
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}