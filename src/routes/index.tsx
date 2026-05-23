import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ArrowRight, Users, CheckCircle2, Zap } from "lucide-react";
import { memo } from "react";
import { Logo, LogoMark } from "@/components/Logo";
import { NextFlowBackground } from "@/components/NextFlowBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NexPonto — Controle de Ponto Inteligente" },
      { name: "description", content: "A solução definitiva para controle de ponto digital. Multitenant, seguro e altamente intuitivo." },
    ],
  }),
  component: memo(Landing),
});

function Landing() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-8 py-8 sm:py-12">
      <NextFlowBackground />
      <header className="flex items-center justify-between mb-12 sm:mb-20 animate-in fade-in slide-in-from-top-4 duration-1000">
        <Logo size={22} wordmarkClassName="text-lg sm:text-2xl" />

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
        
        <h1 className="font-display text-4xl sm:text-6xl md:text-8xl lg:text-[10rem] font-black leading-[1.05] tracking-tighter max-w-5xl mb-6 sm:mb-10 drop-shadow-sm">
          Controle de ponto <br />
          <span className="text-gradient relative">
            inteligente.
            <div className="absolute -inset-x-12 -inset-y-8 bg-primary/10 blur-[60px] -z-10 rounded-full hidden sm:block"></div>
          </span>
        </h1>
        
        <p className="mt-4 max-w-3xl text-base sm:text-xl md:text-2xl text-balance text-muted-foreground leading-relaxed font-medium opacity-90">
          A solução definitiva para escritórios modernos e equipes dinâmicas.
        </p>

        <div className="mt-12 sm:mt-20 grid w-full max-w-5xl gap-6 sm:gap-10 grid-cols-1 sm:grid-cols-2 px-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          <Link
            to="/admin/cadastro"
            className="glass-card group flex flex-col items-start gap-4 sm:gap-6 rounded-2xl sm:rounded-[3rem] p-8 sm:p-12 text-left transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-primary/10 border-border/40 hover:border-primary/30"
          >
            <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground transition-all duration-500 group-hover:scale-110 shadow-lg shadow-primary/20">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h3 className="font-display text-xl sm:text-3xl font-black mb-2 sm:mb-3 tracking-tighter text-foreground">Para o Escritório</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                Cadastre sua empresa em segundos. Gerencie sua equipe, visualize relatórios e tenha controle total.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary">
              Criar conta gratuita <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            to="/funcionario/login"
            className="glass-card group flex flex-col items-start gap-4 sm:gap-6 rounded-2xl sm:rounded-[3rem] p-8 sm:p-12 text-left transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-primary/10 border-border/40 hover:border-primary/30"
          >
            <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground transition-all duration-500 group-hover:scale-110 shadow-lg shadow-primary/20">
              <Users className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h3 className="font-display text-xl sm:text-3xl font-black mb-2 sm:mb-3 tracking-tighter text-foreground">Para o Funcionário</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                Bata seu ponto de forma rápida e segura. Acesse seu histórico de qualquer lugar, a qualquer hora.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary">
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
        <div className="flex items-center gap-2 opacity-80 text-primary">
          <LogoMark size={20} />
          <span className="font-display font-bold text-sm tracking-tight text-foreground">NexPonto</span>
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
