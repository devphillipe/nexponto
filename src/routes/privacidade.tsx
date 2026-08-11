import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";
import { memo } from "react";
import { Logo } from "@/components/Logo";
import { NextFlowBackground } from "@/components/NextFlowBackground";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Privacidade — NexPonto" }] }),
  component: memo(PrivacyPage),
});

function PrivacyPage() {
  return (
    <main className="relative mx-auto min-h-dvh max-w-4xl px-6 py-12 md:py-20 [padding-top:calc(3rem+var(--sat))] [padding-bottom:calc(3rem+var(--sab))] [padding-left:calc(1.5rem+var(--sal))] [padding-right:calc(1.5rem+var(--sar))]">
      <NextFlowBackground />
      
      <div className="mb-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group mb-8">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Voltar para o início
        </Link>
        <Logo size={24} wordmarkClassName="text-2xl" />
      </div>

      <div className="glass-card rounded-[2.5rem] p-8 md:p-12 border border-border/40 bg-background/40 backdrop-blur-2xl">
        <h1 className="font-display text-3xl md:text-4xl font-black mb-8 tracking-tight">Política de Privacidade</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. Coleta de Dados</h2>
            <p>Coletamos informações necessárias para a prestação do serviço, incluindo nome completo, e-mail, CPF, telefone e registros de ponto (horário e data). Também coletamos dados técnicos como endereço IP e informações do dispositivo para fins de segurança.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. Uso das Informações</h2>
            <p>Os dados coletados são utilizados exclusivamente para o funcionamento da plataforma NexPonto, permitindo o controle de jornada, geração de relatórios legais e autenticação segura.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. Isolamento e Segurança</h2>
            <p>Utilizamos uma arquitetura multitenant com isolamento total de dados no banco de dados. Cada empresa (tenant) só tem acesso aos seus próprios dados e aos dados de seus colaboradores vinculados.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. Compartilhamento de Dados</h2>
            <p>Não vendemos ou compartilhamos dados pessoais com terceiros para fins de marketing. Os dados só podem ser compartilhados por exigência legal ou para prestadores de serviços técnicos essenciais (como hospedagem de banco de dados).</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. Seus Direitos (LGPD)</h2>
            <p>Em conformidade com a LGPD, garantimos o direito de acesso, correção e exclusão de seus dados. Para funcionários, algumas solicitações devem ser mediadas pelo administrador do seu escritório.</p>
          </section>

          <section className="space-y-3 pt-8 border-t border-border/40">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
              <Lock className="h-4 w-4" /> Compromisso com a Segurança da Informação
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
