import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, ArrowLeft, ShieldCheck, Mail, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { NextFlowBackground } from "@/components/NextFlowBackground";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Entrar — NexPonto Admin" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setLoading(false);
        toast.error(translateAuthError(error, "Falha no login. Verifique seus dados."));
        return;
      }

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      if (roleError) {
        setLoading(false);
        toast.error("Erro ao verificar permissões. Tente novamente.");
        return;
      }

      if (!roles?.some((r) => r.role === "admin")) {
        await supabase.auth.signOut();
        setLoading(false);
        toast.error("Esta conta não tem acesso administrativo.");
        return;
      }
      
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      setLoading(false);
      toast.error(translateAuthError(err));
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");

    const trimmed = resetEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setResetError("Informe um e-mail válido.");
      return;
    }

    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) {
        setResetError(translateAuthError(error, "Não foi possível enviar o e-mail de recuperação."));
      } else {
        setResetSent(true);
      }
    } catch (err) {
      setResetError(translateAuthError(err, "Erro ao enviar e-mail de recuperação."));
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 [padding-top:calc(1.5rem+var(--sat))] [padding-bottom:calc(1.5rem+var(--sab))] [padding-left:calc(1.5rem+var(--sal))] [padding-right:calc(1.5rem+var(--sar))] relative overflow-hidden">
      <NextFlowBackground />
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-lg space-y-8 sm:space-y-12 animate-in fade-in zoom-in-95 duration-1000 slide-in-from-bottom-8 relative z-10">
        <div className="text-center space-y-3 sm:space-y-4 px-4">
           <Link to="/" className="inline-flex mx-auto mb-4 sm:mb-6 hover:scale-105 transition-transform duration-500">
              <Logo size={28} wordmarkClassName="text-2xl sm:text-3xl" />
           </Link>
           <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground drop-shadow-sm">Portal do Escritório</h1>
           <p className="text-muted-foreground text-base sm:text-lg font-medium opacity-80">Gerencie sua equipe administrativa.</p>
        </div>

        <div className="glass-card rounded-3xl sm:rounded-[3rem] p-8 sm:p-12 border border-primary/10 shadow-2xl relative bg-background/40 backdrop-blur-2xl mx-4 sm:mx-0">
          {!showForgot ? (
            <form onSubmit={onSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 ml-2">E-mail Corporativo</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="exemplo@escritorio.com"
                      autoComplete="email"
                      inputMode="email"
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-muted/20 border-border/40 rounded-2xl h-14 pl-12 pr-4 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Senha de Acesso</Label>
                    <button 
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-[11px] font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                    >
                      Esqueceu?
                    </button>
                  </div>
                  <PasswordInput
                    id="password"
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    inputClassName="bg-muted/30 border-none rounded-2xl h-12 px-4 focus-visible:ring-primary/40"
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={loading} className="premium-button w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] transition-all">
                {loading ? "Autenticando..." : "Acessar Painel"}
              </Button>
            </form>
          ) : resetSent ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-500 grid place-items-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight">E-mail enviado!</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enviamos um link de recuperação para{" "}
                  <span className="font-bold text-foreground break-all">{resetEmail}</span>.
                  Verifique sua caixa de entrada e a pasta de spam.
                </p>
                <p className="text-xs text-muted-foreground/80 pt-2">
                  O link expira em 1 hora. Se não receber em alguns minutos, tente novamente.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  onClick={() => { setResetSent(false); setShowForgot(false); setResetEmail(""); }}
                  className="premium-button w-full h-14 rounded-2xl font-bold uppercase tracking-widest"
                >
                  Voltar para o Login
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setResetSent(false); }}
                  className="w-full font-bold text-sm"
                >
                  Reenviar para outro e-mail
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="h-12 w-12 bg-primary/10 rounded-2xl grid place-items-center mx-auto mb-4">
                    <KeyRound className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Recuperar Senha</h3>
                  <p className="text-sm text-muted-foreground">Enviaremos um link para você redefinir sua senha.</p>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="resetEmail" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 ml-2">E-mail de Recuperação</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      id="resetEmail" 
                      type="email" 
                      placeholder="seu@email.com"
                      autoComplete="email"
                      inputMode="email"
                      required 
                      value={resetEmail} 
                      onChange={(e) => { setResetEmail(e.target.value); if (resetError) setResetError(""); }}
                      aria-invalid={!!resetError}
                      aria-describedby={resetError ? "resetEmailError" : undefined}
                      className="bg-muted/20 border-border/40 rounded-2xl h-14 pl-12 pr-4 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                    />
                  </div>
                </div>

                {resetError && (
                  <div id="resetEmailError" role="alert" className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-300">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                    <span className="leading-relaxed">{resetError}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <Button type="submit" disabled={sendingReset} className="premium-button w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest">
                  {sendingReset ? "Enviando..." : "Enviar Link"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForgot(false); setResetError(""); }} className="w-full font-bold text-sm">
                  Voltar para o Login
                </Button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-border/40 text-center space-y-4">
            {!showForgot && (
              <p className="text-sm text-muted-foreground">
                Ainda não tem conta?{" "}
                <Link to="/admin/cadastro" className="text-primary font-bold hover:underline decoration-2 underline-offset-4">
                  Cadastre seu escritório
                </Link>
              </p>
            )}
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
               <ShieldCheck className="h-3 w-3" /> Acesso Seguro NexPonto
            </div>
          </div>
        </div>

        <div className="text-center">
           <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group">
             <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Voltar para a página inicial
           </Link>
        </div>
      </div>
    </div>
  );
}