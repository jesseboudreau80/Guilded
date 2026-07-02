import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { SubscriptionStatus, Tier } from "@prisma/client";

function mapPriceToTier(priceId: string): Tier {
  if (priceId === process.env.STRIPE_PRICE_HERO) return "HERO";
  if (priceId === process.env.STRIPE_PRICE_MASTER) return "MASTER";
  if (priceId === process.env.STRIPE_PRICE_JOURNEYMAN) return "JOURNEYMAN";
  return "APPRENTICE";
}

function mapStripeStatus(status: string): SubscriptionStatus {
  if (status === "active" || status === "trialing") return "ACTIVE";
  if (status === "past_due" || status === "unpaid") return "PAST_DUE";
  if (status === "canceled") return "CANCELED";
  return "INACTIVE";
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Stripe retries webhooks; recording the event id makes processing idempotent
  // (a replayed checkout.session.completed must not create a second consultation
  // or double-count a billing cycle).
  try {
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return new Response("ok (already processed)");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.metadata?.purchaseType === "consultation" && session.metadata.userId) {
      await prisma.consultation.create({
        data: {
          userId: session.metadata.userId,
          tierAtPurchase: session.metadata.tierAtPurchase as Tier,
          price: Number(session.metadata.price || 20000),
          discounted: session.metadata.discounted === "true",
          scheduledDate: session.metadata.scheduledDate ? new Date(session.metadata.scheduledDate) : null,
        },
      });
    }

    if (session.mode === "subscription" && session.metadata?.userId) {
      await prisma.user.update({
        where: { id: session.metadata.userId },
        data: {
          tier: session.metadata.tier as Tier,
          subscriptionStatus: "ACTIVE",
          subscriptionStartDate: new Date(),
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
          aiUsageResetDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        },
      });
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : "";
    if (subscriptionId) {
      const line = invoice.lines.data[0];
      const priceId = line?.price?.id || "";
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          successfulBillingCount: { increment: 1 },
          subscriptionStatus: "ACTIVE",
          tier: mapPriceToTier(priceId),
        },
      });
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : "";
    if (subscriptionId) {
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { subscriptionStatus: "PAST_DUE" },
      });
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    await prisma.user.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { subscriptionStatus: mapStripeStatus(subscription.status) },
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await prisma.user.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { subscriptionStatus: "CANCELED", tier: "APPRENTICE" },
    });
  }

  return new Response("ok");
}
