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
    <main className="relative mx-auto flex min-h-dvh max-w-7xl flex-col px-4 sm:px-8 py-8 sm:py-12 [padding-top:calc(2rem+var(--sat))] [padding-bottom:calc(2rem+var(--sab))] [padding-left:calc(1rem+var(--sal))] [padding-right:calc(1rem+var(--sar))]">
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

      <section className="flex flex-1 flex-col items-center justify-center py-12 sm:py-16 text-center relative">


        <div className="mb-6 animate-fade-in inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary shadow-[0_0_15px_rgba(var(--color-primary),0.1)]">
          <Zap className="h-3.5 w-3.5 fill-primary" />
          Multitenant · Isolamento total de dados
        </div>
        
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[1.1] tracking-tighter max-w-4xl mb-6 sm:mb-8 drop-shadow-sm">
          Controle de ponto <br />
          <span className="text-gradient relative">
            inteligente.
            <div className="absolute -inset-x-12 -inset-y-8 bg-primary/10 blur-[60px] -z-10 rounded-full hidden sm:block"></div>
          </span>
        </h1>
        
        <p className="mt-2 max-w-2xl text-base sm:text-lg md:text-xl text-balance text-muted-foreground leading-relaxed font-medium opacity-90">
          A solução definitiva para escritórios modernos e equipes dinâmicas.
        </p>

        <div className="mt-10 sm:mt-12 grid w-full max-w-4xl gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 px-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          <Link
            to="/admin/cadastro"
            className="glass-card group flex flex-col items-start gap-4 sm:gap-5 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 text-left transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 border-border/40 hover:border-primary/30"
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
              Assinar agora <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            to="/funcionario/login"
            className="glass-card group flex flex-col items-start gap-4 sm:gap-5 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 text-left transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 border-border/40 hover:border-primary/30"
          >
            <div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground transition-all duration-500 group-hover:scale-110 shadow-lg shadow-primary/20">
              <Users className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h3 className="font-display text-xl sm:text-3xl font-black mb-2 sm:mb-3 tracking-tighter text-foreground">Para o Funcionário</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                Acesso 100% gratuito. Seu escritório cria e gerencia seu cadastro — você só bate o ponto e acompanha seu histórico.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary">
              Acessar portal <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        <div className="mt-12 sm:mt-16 flex flex-wrap justify-center gap-6 md:gap-12 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0">
          <div className="flex items-center gap-2 font-display font-semibold text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" /> Seguro & Criptografado
          </div>
          <div className="flex items-center gap-2 font-display font-semibold text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" /> 99.9% Disponibilidade
          </div>
          <div className="flex items-center gap-2 font-display font-semibold text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" /> Suporte Premium
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
          <Link to="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
          <Link to="/termos" className="hover:text-primary transition-colors">Termos</Link>
        </div>
      </footer>
    </main>
  );
}
