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

  const { data, isLoading } = useQuery({
    queryKey: ["billing-info"],
    queryFn: async () => (await fetchInfo()) as BillingInfo,
    staleTime: 5 * 60 * 1000,
  });

  const checkout = useMutation({
    mutationFn: async (plan: "mensal" | "anual") => {
      const { url } = await startCheckout({
        data: { plan, origin: window.location.origin },
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
      toast.success("Pagamento concluído. Estamos atualizando o status da sua assinatura.");
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
        <Card className="border-amber-200 bg-amber-50/60">
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
        <Card className={isActive ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}>
          <CardContent className="flex items-center gap-3 p-4">
            {isActive ? (
              <Check className="h-5 w-5 text-green-500 shrink-0" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            )}
            <p className="text-sm font-semibold text-foreground">
              {isActive
                ? "Pagamento processado e assinatura ativa."
                : "Pagamento concluído. Aguardando a confirmação automática do Stripe."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status atual */}
      <Card className="border-border bg-white">
        <CardHeader className="pb-3">
          <CardDescription className="text-[10px] uppercase font-bold tracking-[0.16em] text-primary">
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
        <Card className="border-blue-200 bg-blue-50/60">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="font-display text-lg font-extrabold text-[#071A2B]">
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
              className={`flex flex-col bg-white transition-all duration-200 ${
                plan.plan === "anual" ? "border-primary shadow-lg shadow-blue-100" : "border-border shadow-sm"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl font-extrabold text-[#071A2B]">
                    Plano {plan.plan === "anual" ? "Anual" : "Mensal"}
                  </CardTitle>
                  {plan.plan === "anual" && (
                    <Badge className="bg-blue-50 text-primary border-blue-200">Melhor valor</Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Cobrança por {plan.interval}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <div>
                  <span className="font-display text-4xl font-extrabold tracking-tight text-[#071A2B]">
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
                  className="mt-auto min-h-[3rem] w-full rounded-xl font-bold"
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
      <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-[#071A2B]">
        Assinatura
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Escolha e gerencie o plano do seu escritório com pagamento seguro pelo Stripe.
      </p>
    </div>
  );
}
