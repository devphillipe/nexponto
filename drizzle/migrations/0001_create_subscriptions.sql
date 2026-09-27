CREATE TYPE public.subscription_plan AS ENUM ('mensal', 'anual', 'founder');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'expired');

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL,
  status public.subscription_status NOT NULL DEFAULT 'incomplete',
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT founder_without_stripe CHECK (plan <> 'founder' OR stripe_subscription_id IS NULL)
);

COMMENT ON COLUMN public.subscriptions.plan IS 'mensal/anual via Stripe; founder somente ativado manualmente pelo backend (service_role)';

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select_admin ON public.subscriptions
  FOR SELECT TO authenticated USING (public.is_admin_of_tenant(tenant_id));

CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.tenant_has_active_subscription(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE tenant_id = _tenant_id
      AND (
        plan = 'founder' AND status = 'active'
        OR (status IN ('active', 'trialing') AND (current_period_end IS NULL OR current_period_end > now()))
      )
  )
$$;