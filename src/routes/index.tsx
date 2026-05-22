import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Clock, ShieldCheck, ArrowRight, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            Ponto Digital
          </span>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/admin/login"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            Acesso escritório
          </Link>
          <Link
            to="/funcionario/login"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            Acesso funcionário
          </Link>
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Multitenant · Isolamento total por escritório
        </div>
        <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
          Controle de ponto<br />
          <span className="bg-[var(--gradient-primary)] bg-clip-text text-transparent">
            sem complicação.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-muted-foreground">
          Um painel para o escritório, um portal para o funcionário. Tudo conectado,
          seguro e auditável.
        </p>

        <div className="mt-10 grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          <Link
            to="/admin/cadastro"
            className="glass-card group flex flex-col items-start gap-3 rounded-2xl p-6 text-left transition-all hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Sou escritório</h3>
              <p className="text-sm text-muted-foreground">
                Cadastre sua empresa e comece a gerenciar funcionários e pontos.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm text-primary">
              Criar conta <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            to="/funcionario/login"
            className="glass-card group flex flex-col items-start gap-3 rounded-2xl p-6 text-left transition-all hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Sou funcionário</h3>
              <p className="text-sm text-muted-foreground">
                Acesse seu portal com o e-mail e senha fornecidos pelo administrador.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-sm text-primary">
              Bater ponto <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ponto Digital
      </footer>
    </main>
  );
}
