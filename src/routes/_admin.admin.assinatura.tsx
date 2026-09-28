import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBillingInfo, createCheckoutSession } from "@/lib/stripe.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Loader2, Check, CalendarClock, Sparkles, AlertTriangle } from "lucide-react";
import { memo, useEffect } from "react";

export const Route = createFileRoute("/_admin/admin/assinatura")({
  head: () => ({ meta: [{ title: "Assinatura — NexPonto Admin" }] }),
  validateSearch: (search) => ({
    status: (search.status as string | undefined) ?? undefined,
  }),
  component: memo(AssinaturaPage),
});

type BillingInfo = {
  configured: boolean;
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  plans: { plan: "mensal" | "anual"; id: string; label: string; interval: string }[];
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  expired: "Expirada",
};

function AssinaturaPage() {
  const queryClient = useQueryClient();
  const { status: checkoutStatus } = useSearch({ from: "/_admin/admin/assinatura" });
  const fetchInfo = useServerFn(getBillingInfo);
  const startCheckout = useServerFn(createCheckoutSession);

  const { data, isLoading } = useQuery<BillingInfo>({
    queryKey: ["billing-info"],
    queryFn: fetchInfo,
    staleTime: 5 * 60 * 1000,
  });

  const checkout = useMutation({
    mutationFn: async (plan: "mensal" | "anual") => {
      const { url } = await startCheckout({
        plan,
        origin: window.location.origin,
      });
      return url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.");
    },
  });

  useEffect(() => {
    if (checkoutStatus === "sucesso") {
      queryClient.invalidateQueries({ queryKey: ["billing-info"] });
      toast.success("Pagamento confirmado! Sua assinatura está ativa.");
    } else if (checkoutStatus === "cancelado") {
      toast.info("Pagamento cancelado — nenhuma cobrança foi feita.");
    }
  }, [checkoutStatus, queryClient]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <div className="space-y-8">
        <PageHeader />
        <Card className="glass-card border-primary/20">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
            <div>
              <p className="font-bold text-foreground">Pagamentos em preparação</p>
              <p className="text-sm text-muted-foreground mt-1">
                A conexão com o Stripe ainda não foi concluída. Tente novamente mais tarde.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sub = data.subscription;
  const isFounder = sub?.plan === "founder" && sub.status === "active";
  const isActive = sub?.status === "active" || sub?.status === "trialing";

  return (
    <div className="space-y-8">
      <PageHeader />

      {checkoutStatus === "sucesso" && (
        <Card className="glass-card border-green-500/30 bg-green-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Check className="h-5 w-5 text-green-500 shrink-0" />
            <p className="text-sm font-semibold text-foreground">
              Pagamento confirmado! Sua assinatura foi ativada.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status atual */}
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-3">
          <CardDescription className="text-[10px] uppercase font-black tracking-widest text-primary/80">
            Situação atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sub && isActive ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Badge variant="secondary" className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20">
                {sub.plan === "founder" ? "Plano Founder — vitalício" : `Plano ${sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} ativo`}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Status: {STATUS_LABEL[sub.status] ?? sub.status}
              </span>
              {sub.plan !== "founder" && sub.current_period_end && (
                <span className="text-sm text-muted-foreground">
                  Próxima renovação:{" "}
                  {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
                  {sub.cancel_at_period_end ? " (não renova automaticamente)" : ""}
                </span>
              )}
            </div>
          ) : sub ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Badge variant="secondary" className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                Assinatura {STATUS_LABEL[sub.status]?.toLowerCase() ?? sub.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Escolha um plano abaixo para reativar o acesso completo.
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma assinatura ativa. Escolha um plano abaixo para começar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Planos */}
      {isFounder ? (
        <Card className="glass-card border-primary/30">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="font-display text-lg font-bold text-foreground">
              Você tem acesso vitalício ao NexPonto
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Seu escritório está no plano Founder e não precisa de pagamentos. Aproveite!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {data.plans.map((plan) => (
            <Card
              key={plan.plan}
              className={`glass-card flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 ${
                plan.plan === "anual" ? "border-primary/40" : "border-border/40"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl font-bold">
                    Plano {plan.plan === "anual" ? "Anual" : "Mensal"}
                  </CardTitle>
                  {plan.plan === "anual" && (
                    <Badge className="bg-primary/15 text-primary border-primary/20">Melhor valor</Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Cobrança por {plan.interval}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <div>
                  <span className="font-display text-4xl font-bold tracking-tight text-foreground">
                    {plan.label}
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "Funcionários ilimitados",
                    "Registro de ponto com geolocalização",
                    "Relatórios diários, semanais e mensais",
                    "Portal do funcionário (PWA)",
                    "Abonos e ajustes com auditoria",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className="mt-auto min-h-[3rem] w-full rounded-2xl font-bold"
                  disabled={checkout.isPending}
                  onClick={() => checkout.mutate(plan.plan)}
                  aria-busy={checkout.isPending}
                >
                  {checkout.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Assinar {plan.plan === "anual" ? "Anual" : "Mensal"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Pagamento processado com segurança pelo Stripe. Cancele quando quiser — o acesso continua até o fim do período pago.
      </p>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
        Assinatura
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Gerencie o plano do seu escritório.
      </p>
    </div>
  );
}
