import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IdCard, ArrowLeft, ShieldCheck, Fingerprint, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { NextFlowBackground } from "@/components/NextFlowBackground";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { translateAuthError } from "@/lib/auth-errors";
import { clearStoredEmployeeTenant } from "@/lib/employee-membership";
import { CpfInput } from "@/components/forms/SpecializedInputs";
import { isValidCpf, formatCpf, onlyDigits } from "@/lib/masks";
import {
  signInEmployeeWithCpf,
  requestEmployeePasswordResetByCpf,
} from "@/lib/employee-auth.functions";

export const Route = createFileRoute("/funcionario/login")({
  head: () => ({ meta: [{ title: "Entrar — NexPonto Funcionário" }] }),
  component: FuncLogin,
});

function FuncLogin() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberCpf, setRememberCpf] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [resetCpf, setResetCpf] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetMaskedEmail, setResetMaskedEmail] = useState<string | null>(null);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("nexponto-remembered-cpf");
    if (saved) {
      setCpf(onlyDigits(saved).slice(0, 11));
      setRememberCpf(true);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidCpf(cpf)) {
      toast.error("Informe um CPF válido.");
      return;
    }
    setLoading(true);
    try {
      const session = await signInEmployeeWithCpf({ data: { cpf, password } });
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) {
        setLoading(false);
        toast.error(translateAuthError(error, "Falha no login. Verifique seus dados."));
        return;
      }

      if (rememberCpf) {
        window.localStorage.setItem("nexponto-remembered-cpf", cpf);
      } else {
        window.localStorage.removeItem("nexponto-remembered-cpf");
      }

      clearStoredEmployeeTenant();
      const memberships = session.memberships ?? [];
      if (memberships.length === 1) {
        window.localStorage.setItem("nexponto-employee-tenant", memberships[0]!.tenant_id);
        navigate({ to: "/funcionario/meu-ponto" });
      } else {
        navigate({ to: "/funcionario/selecionar-empresa" });
      }
    } catch (err) {
      setLoading(false);
      toast.error(translateAuthError(err, "CPF ou senha inválidos."));
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");

    if (!isValidCpf(resetCpf)) {
      setResetError("Informe um CPF válido.");
      return;
    }

    setSendingReset(true);
    try {
      const res = await requestEmployeePasswordResetByCpf({
        data: {
          cpf: resetCpf,
          redirectTo: `${window.location.origin}/auth/reset-password?portal=funcionario`,
        },
      });
      setResetMaskedEmail(res.email);
      setResetSent(true);
    } catch (err) {
      setResetError(translateAuthError(err, "Erro ao enviar e-mail de recuperação."));
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4 sm:p-6 [padding-top:calc(1rem+var(--sat))] [padding-bottom:calc(1rem+var(--sab))] relative overflow-hidden">
      <NextFlowBackground />
      <div className="w-full max-w-md space-y-8 sm:space-y-12 animate-in fade-in zoom-in-95 duration-1000 slide-in-from-bottom-8 relative z-10">
        <div className="text-center space-y-3 sm:space-y-4 px-4">
          <Link to="/" className="inline-flex mx-auto mb-4 sm:mb-6 hover:scale-105 transition-transform duration-500">
            <Logo size={28} wordmarkClassName="text-2xl sm:text-3xl" />
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-foreground ">Hora de começar?</h1>
          <p className="text-muted-foreground text-base sm:text-lg font-medium opacity-80">Entre para registrar sua jornada.</p>
        </div>

        <div className="glass-card rounded-2xl p-8 sm:p-12 border border-border shadow-xl relative bg-white mx-4 sm:mx-0">
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 h-14 w-14 rounded-2xl bg-primary text-primary-foreground border border-primary shadow-xl shadow-primary/20 grid place-items-center">
            <Fingerprint className="h-7 w-7" />
          </div>

          {!showForgot ? (
            <form onSubmit={onSubmit} className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-[10px] font-extrabold tracking-wide text-primary/70 ml-2">CPF Cadastrado</Label>
                  <div className="relative group">
                    <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <CpfInput
                      id="cpf"
                      required
                      value={cpf}
                      onValueChange={setCpf}
                      className="bg-white border-border rounded-2xl h-14 pl-12 pr-4 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label htmlFor="password" className="text-xs font-bold tracking-tight text-muted-foreground">Sua Senha</Label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setResetCpf(cpf); }}
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
                    inputClassName="bg-white border border-border rounded-2xl h-12 px-4 focus-visible:ring-primary/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-cpf"
                    checked={rememberCpf}
                    onCheckedChange={(checked) => setRememberCpf(checked === true)}
                    aria-label="Lembrar CPF"
                  />
                  <Label htmlFor="remember-cpf" className="text-xs font-medium text-muted-foreground cursor-pointer">
                    Lembrar CPF
                  </Label>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="premium-button w-full h-16 rounded-2xl text-lg font-extrabold tracking-tight shadow-sm hover:shadow-md transition-all">
                {loading ? "Sincronizando..." : "Entrar"}
              </Button>
            </form>
          ) : resetSent ? (
            <div className="space-y-6 mt-4 animate-in fade-in zoom-in-95 duration-500 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-500 grid place-items-center">
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold tracking-tight">E-mail enviado!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Se existir uma conta para o CPF{" "}
                  <span className="font-bold text-foreground break-all">{formatCpf(resetCpf)}</span>, enviamos um link de redefinição
                  {resetMaskedEmail ? <> para <span className="font-bold text-foreground break-all">{resetMaskedEmail}</span></> : null}.
                  Verifique também a pasta de spam.
                </p>
                <p className="text-xs text-muted-foreground/80 pt-2">O link expira em 1 hora.</p>
              </div>
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  onClick={() => { setResetSent(false); setShowForgot(false); }}
                  className="premium-button w-full h-14 rounded-2xl font-bold tracking-tight"
                >
                  Voltar para o Login
                </Button>
                <Button type="button" variant="ghost" onClick={() => setResetSent(false)} className="w-full font-bold text-sm">
                  Tentar com outro CPF
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6 mt-4 animate-in fade-in slide-in-from-right-4 duration-500" noValidate>
              <div className="text-center space-y-2">
                <div className="h-12 w-12 bg-primary/10 rounded-2xl grid place-items-center mx-auto mb-2">
                  <KeyRound className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <h2 className="text-xl font-bold">Recuperar Senha</h2>
                <p className="text-sm text-muted-foreground">Informe seu CPF e enviaremos um link para o e-mail cadastrado.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resetCpf" className="text-[10px] font-extrabold tracking-wide text-primary/70 ml-2">CPF Cadastrado</Label>
                <div className="relative group">
                  <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <CpfInput
                    id="resetCpf"
                    required
                    value={resetCpf}
                    onValueChange={(v) => { setResetCpf(v); if (resetError) setResetError(""); }}
                    aria-invalid={!!resetError}
                    aria-describedby={resetError ? "resetCpfError" : undefined}
                    className="bg-white border-border rounded-2xl h-14 pl-12 pr-4 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                  />
                </div>
              </div>

              {resetError && (
                <div id="resetCpfError" role="alert" className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-300">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                  <span className="leading-relaxed">{resetError}</span>
                </div>
              )}

              <div className="space-y-3">
                <Button type="submit" disabled={sendingReset} aria-busy={sendingReset} className="premium-button w-full h-16 rounded-2xl text-lg font-extrabold tracking-tight">
                  {sendingReset ? "Enviando..." : "Enviar Link"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForgot(false); setResetError(""); }} className="w-full font-bold text-sm">
                  Voltar para o Login
                </Button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-border/40 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground tracking-tight font-bold">
              <ShieldCheck className="h-3 w-3" /> Conexão Segura
            </div>
            {!showForgot && (
              <p className="mt-4 text-[11px] text-muted-foreground italic">
                Se você ainda não tem seus dados de acesso, solicite ao RH do seu escritório.
              </p>
            )}
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
