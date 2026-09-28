import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { stripeApi, stripeConfigured, type StripePrice } from "./stripe.server";

const CheckoutSchema = z.object({
  plan: z.enum(["mensal", "anual"]),
  origin: z.string().url().max(500),
});

type ProfileRow = { tenant_id: string; email: string | null };

async function getAdminTenant(supabase: {
  from: (t: string) => unknown;
}, userId: string) {
  const { data: roles } = await (supabase.from("user_roles") as ReturnType<typeof Object> as {
    select: (s: string) => { eq: (c: string, v: string) => Promise<{ data: { role: string }[] | null }> };
  })
    .select("role")
    .eq("user_id", userId);
  if (!roles?.some((r) => r.role === "admin")) {
    throw new Error("Apenas o administrador do escritório pode gerenciar a assinatura.");
  }
  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof Object> as {
    select: (s: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: ProfileRow | null }> } };
  })
    .select("tenant_id, email")
    .eq("user_id", userId)
    .single();
  if (!profile?.tenant_id) throw new Error("Escritório não encontrado.");
  return profile;
}

function formatPrice(p: StripePrice) {
  const amount = (p.unit_amount ?? 0) / 100;
  return {
    id: p.id,
    amount,
    currency: (p.currency ?? "brl").toUpperCase(),
    interval: p.recurring?.interval === "year" ? "ano" : "mês",
    label: new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: (p.currency ?? "brl").toUpperCase(),
    }).format(amount),
  };
}

/** Current subscription + plan prices for the billing page. */
export const getBillingInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await getAdminTenant(context.supabase, context.userId);

    const { data: subscription } = await context.supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end")
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();

    if (!stripeConfigured()) {
      return { configured: false as const, subscription, plans: [] };
    }

    const [monthly, annual] = await Promise.all([
      stripeApi<StripePrice>(`/prices/${process.env["STRIPE_PRICE_MONTHLY"]}`),
      stripeApi<StripePrice>(`/prices/${process.env["STRIPE_PRICE_ANNUAL"]}`),
    ]);

    return {
      configured: true as const,
      subscription,
      plans: [
        { plan: "mensal" as const, ...formatPrice(monthly) },
        { plan: "anual" as const, ...formatPrice(annual) },
      ],
    };
  });

/** Creates a Stripe Checkout session and returns its URL. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CheckoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const profile = await getAdminTenant(context.supabase, context.userId);
    const priceId =
      data.plan === "mensal"
        ? process.env["STRIPE_PRICE_MONTHLY"]!
        : process.env["STRIPE_PRICE_ANNUAL"]!;

    const { data: existing } = await context.supabase
      .from("subscriptions")
      .select("plan, status, stripe_customer_id")
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();

    if (existing?.plan === "founder" && existing.status === "active") {
      throw new Error("Este escritório já possui um plano vitalício ativo.");
    }

    let customerId = existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripeApi<{ id: string }>("/customers", "POST", {
        email: profile.email ?? undefined,
        metadata: { tenant_id: profile.tenant_id },
      });
      customerId = customer.id;
    }

    const session = await stripeApi<{ url: string }>("/checkout/sessions", "POST", {
      mode: "subscription",
      customer: customerId,
      client_reference_id: profile.tenant_id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${data.origin}/admin/assinatura?status=sucesso`,
      cancel_url: `${data.origin}/admin/assinatura?status=cancelado`,
      subscription_data: { metadata: { tenant_id: profile.tenant_id } },
      allow_promotion_codes: true,
      locale: "pt-BR",
    });

    return { url: session.url };
  });
