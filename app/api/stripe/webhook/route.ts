import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { Tier, SubscriptionStatus } from "@prisma/client";

const TIER_BY_PRICE_ID: Record<string, Tier> = {
  [process.env.STRIPE_PRICE_JOURNEYMAN!]: "JOURNEYMAN",
  [process.env.STRIPE_PRICE_MASTER!]: "MASTER",
  [process.env.STRIPE_PRICE_HERO!]: "HERO",
};

async function getTierFromSubscription(
  subscription: Stripe.Subscription
): Promise<Tier> {
  const priceId = subscription.items.data[0]?.price?.id;
  return TIER_BY_PRICE_ID[priceId] ?? "APPRENTICE";
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: "ACTIVE",
    canceled: "CANCELED",
    past_due: "PAST_DUE",
    trialing: "TRIALING",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE",
    unpaid: "PAST_DUE",
    paused: "CANCELED",
  };
  return map[status] ?? "INCOMPLETE";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[WEBHOOK_SIGNATURE_ERROR]", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency check
  const existing = await prisma.stripeEvent.findUnique({
    where: { id: event.id },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type },
    });

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const tier = await getTierFromSubscription(subscription);
        const status = mapStripeStatus(subscription.status);

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            tier,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: status,
            currentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
            subscriptionStartDate: new Date(
              subscription.start_date * 1000
            ),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            tier: "APPRENTICE",
            subscriptionStatus: "CANCELED",
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Only increment for recurring subscription invoices
        if (
          invoice.billing_reason === "subscription_cycle" ||
          invoice.billing_reason === "subscription_create"
        ) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              successfulBillingCount: { increment: 1 },
              subscriptionStatus: "ACTIVE",
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "PAST_DUE" },
        });
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle consultation payment
        if (session.metadata?.type === "consultation") {
          const { userId, discounted, tierAtPurchase } =
            session.metadata;

          await prisma.consultation.create({
            data: {
              userId,
              tierAtPurchase: tierAtPurchase as Tier,
              price: session.amount_total ?? 0,
              stripeSessionId: session.id,
              stripePaymentId: session.payment_intent as string,
              discounted: discounted === "true",
            },
          });
        }

        // Handle subscription checkout
        if (session.customer) {
          const customerId = session.customer as string;
          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
          });
          if (!user && session.customer_details?.email) {
            // Link customer to user
            await prisma.user.updateMany({
              where: { email: session.customer_details.email },
              data: { stripeCustomerId: customerId },
            });
          }
        }
        break;
      }

      default:
        // Unhandled event type - still acknowledge
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WEBHOOK_PROCESSING_ERROR]", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
