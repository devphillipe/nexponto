import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { memo } from "react";
import { Logo, LogoMark } from "@/components/Logo";
import { NextFlowBackground } from "@/components/NextFlowBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NexPonto — Tempo sob controle." },
      {
        name: "description",
        content:
          "Gestão de jornada, ponto e equipe em uma plataforma simples, segura e eficiente.",
      },
    ],
  }),
  component: memo(Landing),
});

const features = [
  {
    icon: Clock3,
    title: "Ponto simples",
    description: "Registros rápidos de entrada, intervalo, retorno e saída.",
  },
  {
    icon: Users,
    title: "Equipe organizada",
    description: "Funcionários, jornadas e ocorrências em um só lugar.",
  },
  {
    icon: BarChart3,
    title: "Gestão clara",
    description: "Indicadores e relatórios para acompanhar a rotina sem planilhas.",
  },
  {
    icon: ShieldCheck,
    title: "Dados protegidos",
    description: "Ambientes isolados por empresa e acesso controlado por perfil.",
  },
];

function Landing() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <NextFlowBackground />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-white/90 backdrop-blur-xl [padding-top:var(--sat)]">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link to="/" aria-label="NexPonto — início">
            <Logo size={28} wordmarkClassName="text-xl sm:text-2xl" />
          </Link>

          <nav className="hidden items-center gap-7 text-sm md:flex">
            <a href="#produto" className="nav-link">Produto</a>
            <a href="#recursos" className="nav-link">Recursos</a>
            <a href="#seguranca" className="nav-link">Segurança</a>
            <a href="#planos" className="nav-link">Preços</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/login"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-[#071A2B] transition-colors hover:bg-slate-100 sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              to="/admin/cadastro"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-18 pt-16 sm:px-8 md:pb-24 md:pt-24 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700">
            <Sparkles className="h-4 w-4" />
            Gestão de jornada sem complicação
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] text-[#071A2B] sm:text-6xl lg:text-7xl">
            Sua equipe no horário.
            <span className="mt-2 block text-primary">Sua gestão no controle.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base font-medium leading-7 text-muted-foreground sm:text-lg">
            Controle de ponto, jornada e equipe em uma plataforma simples, segura e feita
            para empresas que não querem perder tempo com processos complicados.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/admin/cadastro"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/funcionario/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 py-3 text-sm font-bold text-[#071A2B] shadow-sm transition hover:bg-slate-50"
            >
              Acessar como funcionário
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Sem cartão para começar</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Dados isolados por empresa</span>
          </div>
        </div>

        <HeroPreview />
      </section>

      <section id="produto" className="border-y border-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4 rounded-2xl p-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-[#071A2B]">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-7xl px-4 py-20 sm:px-8 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="brand-kicker">Um sistema. Dois lados.</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-[#071A2B] sm:text-5xl">
            Escritório e equipe perfeitamente conectados.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            O gestor acompanha a operação. O funcionário registra o ponto e consulta sua jornada.
            Cada pessoa vê exatamente o que precisa.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="brand-card p-6 sm:p-8">
            <div className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-[#071A2B] text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-[#071A2B]">Para sua empresa</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Gestão completa da jornada com poucos cliques e informação organizada.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {["Dashboard da equipe", "Funcionários", "Pontos e jornadas", "Abonos", "Relatórios", "Configurações"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="brand-card p-6 sm:p-8">
            <div className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-[#071A2B]">Para sua equipe</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Experiência mobile-first para registrar a jornada sem atrito.
            </p>
            <div className="mt-7 space-y-3">
              {[
                ["Entrada", "08:02"],
                ["Início do intervalo", "12:01"],
                ["Fim do intervalo", "13:00"],
                ["Saída", "--:--"],
              ].map(([label, time], index) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
                  <span className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <span className={"h-2.5 w-2.5 rounded-full " + (index < 3 ? "bg-success" : "bg-slate-300")} />
                    {label}
                  </span>
                  <span className="font-mono text-sm font-bold text-[#071A2B]">{time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="seguranca" className="bg-[#071A2B] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Segurança</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] sm:text-5xl">Seus dados são seus.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Cada empresa possui seu ambiente isolado, com acesso protegido e separação de dados entre escritórios.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [ShieldCheck, "Acesso protegido", "Autenticação e controle por perfil."],
              [Building2, "Ambiente isolado", "Cada escritório acessa apenas seus dados."],
              [FileCheck2, "Rastreabilidade", "Ajustes e registros permanecem auditáveis."],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div key={String(title)} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <I className="h-6 w-6 text-cyan-300" />
                  <h3 className="mt-4 font-bold">{String(title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{String(text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-4 py-20 sm:px-8 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="brand-kicker">Preços simples</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-[#071A2B] sm:text-5xl">
            Escolha o plano do seu escritório.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Uma assinatura por escritório. O acesso dos funcionários continua incluso.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <PricingCard
            title="Mensal"
            price="R$ 29,90"
            interval="/mês"
            description="Flexibilidade para começar sem compromisso anual."
            cta="Assinar mensal"
          />
          <PricingCard
            title="Anual"
            price="R$ 299"
            interval="/ano"
            description="Melhor custo para equipes que já decidiram simplificar a jornada."
            cta="Assinar anual"
            featured
          />
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
          Após o cadastro, os valores e a contratação são confirmados na área de assinatura integrada ao Stripe.
        </p>
      </section>

      <section className="px-4 pb-20 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-7 text-white sm:p-10 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-bold text-blue-100">NexPonto</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight">Menos controle manual. Mais tempo para sua equipe.</h2>
          </div>
          <Link
            to="/admin/cadastro"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary shadow-sm transition hover:bg-blue-50"
          >
            Criar meu escritório <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-white [padding-bottom:var(--sab)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="font-extrabold tracking-tight text-[#071A2B]">NexPonto</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">— Tempo sob controle.</span>
          </div>
          <div className="flex gap-5 text-sm font-medium text-muted-foreground">
            <Link to="/privacidade" className="hover:text-primary">Privacidade</Link>
            <Link to="/termos" className="hover:text-primary">Termos</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} NexPonto.</p>
        </div>
      </footer>
    </main>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-blue-100/70 blur-3xl" />
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_80px_-32px_rgba(15,23,42,.35)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Logo size={20} showWordmark={false} />
          <div className="h-8 w-36 rounded-lg bg-slate-100" />
          <div className="h-8 w-8 rounded-full bg-blue-50" />
        </div>
        <div className="grid gap-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Visão geral</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#071A2B]">Bom dia, Phillipe.</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["24", "Funcionários", "text-primary"],
              ["19", "Presentes", "text-success"],
              ["3", "Intervalo", "text-warning"],
              ["2", "Pendências", "text-destructive"],
            ].map(([value, label, tone]) => (
              <div key={label} className="rounded-xl border border-border bg-slate-50 p-3">
                <div className={"text-2xl font-extrabold " + tone}>{value}</div>
                <div className="mt-1 text-[11px] font-semibold text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-[1.4fr_.6fr]">
            <div className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#071A2B]">Jornada da semana</p>
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-5 flex h-28 items-end gap-2">
                {[42, 68, 54, 82, 72, 30, 18].map((height, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-blue-100">
                    <div className="w-full rounded-t-md bg-primary" style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#071A2B] p-4 text-white">
              <p className="text-[11px] font-semibold text-slate-300">Próximo registro</p>
              <p className="mt-3 text-3xl font-extrabold">08:02</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <MapPin className="h-3.5 w-3.5" /> Geolocalização ativa
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  title,
  price,
  interval,
  description,
  cta,
  featured = false,
}: {
  title: string;
  price: string;
  interval: string;
  description: string;
  cta: string;
  featured?: boolean;
}) {
  return (
    <div className={"relative flex flex-col rounded-2xl border p-6 sm:p-8 " + (featured ? "border-primary bg-white shadow-lg shadow-blue-100" : "border-border bg-white shadow-sm")}>
      {featured && (
        <span className="absolute right-5 top-5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-primary">
          Melhor valor
        </span>
      )}
      <p className="text-sm font-bold text-[#071A2B]">{title}</p>
      <div className="mt-4 flex items-end gap-1">
        <span className="text-4xl font-extrabold tracking-tight text-[#071A2B] sm:text-5xl">{price}</span>
        <span className="pb-1 text-sm font-semibold text-muted-foreground">{interval}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <ul className="mt-6 space-y-3 text-sm font-medium text-slate-700">
        {[
          "Funcionários ilimitados",
          "Registro de ponto com geolocalização",
          "Relatórios de jornada",
          "Portal do funcionário",
          "Abonos e ajustes",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            {item}
          </li>
        ))}
      </ul>
      <Link
        to="/admin/cadastro"
        className={"mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition " + (featured ? "bg-primary text-white hover:bg-blue-700" : "border border-border bg-white text-[#071A2B] hover:bg-slate-50")}
      >
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
