import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { Tier } from "@prisma/client";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";

// Raw body is required for Stripe signature validation.
// This route must NOT have a body parser applied.
export const config = { api: { bodyParser: false } };

function mapPriceToTier(priceId: string): Tier {
  if (priceId === process.env.STRIPE_PRICE_HERO) return "HERO";
  if (priceId === process.env.STRIPE_PRICE_MASTER) return "MASTER";
  if (priceId === process.env.STRIPE_PRICE_JOURNEYMAN) return "JOURNEYMAN";
  return "APPRENTICE";
}

function isUniqueConstraintError(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature header", { status: 400 });

  // Must read raw text body before any parsing — Stripe validates against
  // the exact bytes received.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Idempotency gate: stripeEvent.create uses the Stripe event ID as the
      // primary key. A duplicate delivery throws P2002 here, rolls the
      // transaction back, and lets the outer catch return 200 to Stripe.
      // If any downstream operation fails, the StripeEvent record is also
      // rolled back, so Stripe's retry re-enters this transaction cleanly.
      await tx.stripeEvent.create({
        data: { id: event.id, type: event.type },
      });

      // ── checkout.session.completed ──────────────────────────────────────
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        if (
          session.metadata?.purchaseType === "consultation" &&
          session.metadata.userId
        ) {
          await tx.consultation.create({
            data: {
              userId: session.metadata.userId,
              tierAtPurchase: session.metadata.tierAtPurchase as Tier,
              pricePaid: Number(session.metadata.price ?? 20000),
              discounted: session.metadata.discounted === "true",
              scheduledDate: session.metadata.scheduledDate
                ? new Date(session.metadata.scheduledDate)
                : null,
            },
          });
        }

        if (
          session.mode === "subscription" &&
          session.metadata?.userId &&
          session.metadata.tier
        ) {
          await tx.user.update({
            where: { id: session.metadata.userId },
            data: {
              tier: session.metadata.tier as Tier,
              subscriptionStatus: "ACTIVE",
              subscriptionStartDate: new Date(),
              stripeCustomerId:
                typeof session.customer === "string"
                  ? session.customer
                  : undefined,
              stripeSubscriptionId:
                typeof session.subscription === "string"
                  ? session.subscription
                  : undefined,
              // Reset AI usage window on new subscription.
              aiUsageCount: 0,
              aiUsageResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }

      // ── invoice.payment_succeeded ───────────────────────────────────────
      // Fires for initial subscription and every renewal. Skip non-subscription
      // invoices (e.g. one-time consultation payments).
      if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : null;

        if (subscriptionId) {
          const priceId = invoice.lines.data[0]?.price?.id ?? "";
          await tx.user.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              successfulBillingCount: { increment: 1 },
              subscriptionStatus: "ACTIVE",
              tier: mapPriceToTier(priceId),
            },
          });
        }
      }

      // ── customer.subscription.deleted ──────────────────────────────────
      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        await tx.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: "CANCELED",
            tier: "APPRENTICE",
          },
        });
      }
    });
  } catch (e: unknown) {
    if (isUniqueConstraintError(e)) {
      // Event already processed — idempotent success.
      return new Response("ok", { status: 200 });
    }
    console.error("[stripe/webhook] processing error:", e);
    return new Response("Internal error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
