import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getConsultationEligibility } from "@/lib/consultation";
import { STANDARD_CONSULTATION_PRICE } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        stripeCustomerId: true,
        tier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Server-side pricing determination — never trust client
    const eligibility = await getConsultationEligibility(userId);
    const price = eligibility.eligible
      ? eligibility.discountedPrice!
      : STANDARD_CONSULTATION_PRICE;
    const isDiscounted = eligibility.eligible;

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Guilded Strategy Session",
              description: `1-hour personalized credit strategy consultation${isDiscounted ? " (Member Discount Applied)" : ""}`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/strategy-session?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/strategy-session?canceled=true`,
      metadata: {
        userId,
        type: "consultation",
        tierAtPurchase: user.tier,
        discounted: String(isDiscounted),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[CONSULTATION_CHECKOUT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
