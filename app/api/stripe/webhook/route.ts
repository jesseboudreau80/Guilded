import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { Tier } from "@prisma/client";

function mapPriceToTier(priceId: string): Tier {
  if (priceId === process.env.STRIPE_PRICE_HERO) return "HERO";
  if (priceId === process.env.STRIPE_PRICE_MASTER) return "MASTER";
  if (priceId === process.env.STRIPE_PRICE_JOURNEYMAN) return "JOURNEYMAN";
  return "APPRENTICE";
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

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await prisma.user.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { subscriptionStatus: "CANCELED", tier: "APPRENTICE" },
    });
  }

  return new Response("ok");
}
