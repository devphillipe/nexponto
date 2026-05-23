import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { memo } from "react";
import { Logo } from "@/components/Logo";
import { NextFlowBackground } from "@/components/NextFlowBackground";

export const Route = createFileRoute("/termos")({
  head: () => ({ meta: [{ title: "Termos de Uso — NexPonto" }] }),
  component: memo(TermsPage),
});

function TermsPage() {
  return (
    <main className="relative mx-auto min-h-screen max-w-4xl px-6 py-12 md:py-20">
      <NextFlowBackground />
      
      <div className="mb-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group mb-8">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Voltar para o início
        </Link>
        <Logo size={24} wordmarkClassName="text-2xl" />
      </div>

      <div className="glass-card rounded-[2.5rem] p-8 md:p-12 border border-border/40 bg-background/40 backdrop-blur-2xl">
        <h1 className="font-display text-3xl md:text-4xl font-black mb-8 tracking-tight">Termos de Uso</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. Aceitação dos Termos</h2>
            <p>Ao acessar e usar o NexPonto, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve usar nosso serviço.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. Descrição do Serviço</h2>
            <p>O NexPonto é uma plataforma de controle de ponto digital multitenant. Fornecemos ferramentas para gestão de horários, abonos e relatórios para empresas e seus colaboradores.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. Responsabilidades do Usuário</h2>
            <p>Os usuários são responsáveis por manter a confidencialidade de suas credenciais de acesso e por todas as atividades que ocorrem sob sua conta. Administradores de escritórios são responsáveis pela precisão dos dados de seus funcionários.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. Uso Proibido</h2>
            <p>É proibido usar o serviço para qualquer finalidade ilegal, fraudulenta ou não autorizada. Você não deve tentar violar a segurança do sistema ou acessar dados de outros inquilinos (tenants).</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. Limitação de Responsabilidade</h2>
            <p>O NexPonto é fornecido "como está". Não garantimos que o serviço será ininterrupto ou livre de erros. Em nenhum caso seremos responsáveis por danos indiretos resultantes do uso ou incapacidade de uso do serviço.</p>
          </section>

          <section className="space-y-3 pt-8 border-t border-border/40">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
              <ShieldCheck className="h-4 w-4" /> Última atualização: Maio de 2024
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
