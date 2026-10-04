import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmployeeMembership } from "@/lib/employee-membership";

export const Route = createFileRoute("/_func/funcionario/selecionar-empresa")({
  head: () => ({ meta: [{ title: "Selecionar escritório — NexPonto" }] }),
  component: SelectCompanyPage,
});

function SelectCompanyPage() {
  const navigate = useNavigate();
  const { memberships, selected, loading, selectTenant } = useEmployeeMembership();

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground animate-pulse">
        Carregando seus vínculos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Escolha o escritório</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu CPF possui mais de um vínculo ativo. Selecione qual ambiente deseja acessar.
        </p>
      </div>

      <div className="space-y-3">
        {memberships.map((membership) => {
          const active = selected?.tenant_id === membership.tenant_id;
          return (
            <button
              key={membership.id}
              type="button"
              onClick={() => {
                selectTenant(membership.tenant_id);
                navigate({ to: "/funcionario/meu-ponto" });
              }}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-white p-4 text-left transition hover:border-primary/30 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-foreground">{membership.tenant_name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Jornada: {membership.daily_hours ?? membership.tenant_default_daily_hours}h/dia
                </div>
              </div>
              {active ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
            </button>
          );
        })}
      </div>

      {memberships.length === 1 ? (
        <Button
          className="w-full"
          onClick={() => {
            selectTenant(memberships[0]!.tenant_id);
            navigate({ to: "/funcionario/meu-ponto" });
          }}
        >
          Continuar
        </Button>
      ) : null}
    </div>
  );
}
