import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyStripeSignature, stripeApi, type StripeSubscription } from "@/lib/stripe.server";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("stripe-signature");
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret || !(await verifyStripeSignature(rawBody, signature, secret))) {
          return new Response("Assinatura inválida", { status: 401 });
        }

        const event = JSON.parse(rawBody) as {
          type: string;
          livemode: boolean;
          data: { object: Record<string, unknown> };
        };

        const supabaseAdmin = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["LOVABLE_API_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as {
                subscription?: string;
                client_reference_id?: string;
              };
              if (!session.subscription || !session.client_reference_id) break;
              const sub = await stripeApi<StripeSubscription>(
                `/subscriptions/${session.subscription}`,
              );
              await upsertSubscription(supabaseAdmin, session.client_reference_id, sub, event.livemode);
              break;
            }
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object as unknown as StripeSubscription;
              const { data: row } = await supabaseAdmin
                .from("subscriptions")
                .select("tenant_id, plan")
                .eq("stripe_subscription_id", sub.id)
                .maybeSingle();
              if (!row) break;
              await upsertSubscription(supabaseAdmin, row.tenant_id, sub, event.livemode, row.plan);
              break;
            }
            case "invoice.payment_failed": {
              const invoice = event.data.object as { subscription?: string };
              if (!invoice.subscription) break;
              await supabaseAdmin
                .from("subscriptions")
                .update({ status: "past_due", updated_at: new Date().toISOString() })
                .eq("stripe_subscription_id", invoice.subscription);
              break;
            }
          }
          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("stripe-webhook error:", err);
          return new Response("Erro interno", { status: 500 });
        }
      },
    },
  },
});

const STATUS_MAP: Record<string, string> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "expired",
};

function planForPrice(priceId: string): string | null {
  if (priceId === process.env["STRIPE_PRICE_MONTHLY"]) return "mensal";
  if (priceId === process.env["STRIPE_PRICE_ANNUAL"]) return "anual";
  return null;
}

async function upsertSubscription(
  supabase: ReturnType<typeof createClient<Database>>,
  tenantId: string,
  sub: StripeSubscription,
  livemode: boolean,
  knownPlan?: string,
) {
  const priceId = sub.items?.data?.[0]?.price?.id ?? "";
  const plan = planForPrice(priceId) ?? knownPlan;
  if (!plan) return;

  const values = {
    tenant_id: tenantId,
    plan,
    status: STATUS_MAP[sub.status] ?? "incomplete",
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    environment: livemode ? ("live" as const) : ("sandbox" as const),
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("subscriptions").upsert(values, {
    onConflict: "tenant_id",
  });
  if (error) throw new Error(error.message);
}
