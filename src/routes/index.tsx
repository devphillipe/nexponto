import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Clock, ShieldCheck, ArrowRight, Users, CheckCircle2, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 group cursor-default">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--gradient-primary)] shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105">
            <Clock className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            NexPonto
          </span>
        </div>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <Link to="/admin/login" className="nav-link text-muted-foreground font-medium">
            Escritório
          </Link>
          <Link to="/funcionario/login" className="nav-link text-muted-foreground font-medium">
            Funcionário
          </Link>
          <Link
            to="/admin/cadastro"
            className="rounded-full bg-primary/10 px-5 py-2 text-primary transition-all hover:bg-primary/20 font-semibold"
          >
            Começar agora
          </Link>
        </nav>
        {/* Mobile menu trigger could go here, but keeping it simple as per instructions */}
        <div className="flex md:hidden">
           <Link
            to="/admin/login"
            className="rounded-full bg-primary/10 px-4 py-2 text-xs text-primary font-semibold"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-20 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>
        </div>

        <div className="mb-6 animate-fade-in inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.1)]">
          <Zap className="h-3.5 w-3.5 fill-primary" />
          Multitenant · Isolamento total de dados
        </div>
        
        <h1 className="font-display text-6xl font-bold leading-[1.1] tracking-tight md:text-7xl lg:text-8xl max-w-4xl">
          Controle de ponto <br />
          <span className="text-gradient">inteligente.</span>
        </h1>
        
        <p className="mt-8 max-w-2xl text-lg md:text-xl text-balance text-muted-foreground leading-relaxed">
          A solução definitiva para escritórios modernos. Gestão simplificada para administradores e facilidade total para colaboradores.
        </p>

        <div className="mt-14 grid w-full max-w-3xl gap-6 sm:grid-cols-2 px-2">
          <Link
            to="/admin/cadastro"
            className="glass-card group flex flex-col items-start gap-4 rounded-3xl p-8 text-left transition-all hover:-translate-y-1 hover:border-primary/40"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold mb-2">Para o Escritório</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cadastre sua empresa em segundos. Gerencie sua equipe, visualize relatórios e tenha controle total.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">
              Criar conta gratuita <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            to="/funcionario/login"
            className="glass-card group flex flex-col items-start gap-4 rounded-3xl p-8 text-left transition-all hover:-translate-y-1 hover:border-primary/40"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold mb-2">Para o Funcionário</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bata seu ponto de forma rápida e segura. Acesse seu histórico de qualquer lugar, a qualquer hora.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">
              Acessar portal <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        <div className="mt-20 flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0">
          <div className="flex items-center gap-2 font-display font-semibold">
            <CheckCircle2 className="h-5 w-5 text-success" /> Seguro & Criptografado
          </div>
          <div className="flex items-center gap-2 font-display font-semibold">
            <CheckCircle2 className="h-5 w-5 text-success" /> 99.9% Disponibilidade
          </div>
          <div className="flex items-center gap-2 font-display font-semibold">
            <CheckCircle2 className="h-5 w-5 text-success" /> Suporte Premium
          </div>
        </div>
      </section>

      <footer className="mt-auto py-10 flex flex-col md:flex-row items-center justify-between border-t border-border/40 gap-4">
        <div className="flex items-center gap-2 opacity-80">
          <div className="h-6 w-6 rounded-lg bg-primary/20 grid place-items-center">
            <Clock className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight">NexPonto</span>
        </div>
        <div className="text-[13px] text-muted-foreground">
          © {new Date().getFullYear()} NexPonto — Todos os direitos reservados.
        </div>
        <div className="flex gap-6 text-[13px] font-medium text-muted-foreground">
          <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
          <a href="#" className="hover:text-primary transition-colors">Termos</a>
        </div>
      </footer>
    </main>
  );
}
