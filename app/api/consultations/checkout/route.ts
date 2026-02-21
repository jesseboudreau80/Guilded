import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/server-auth";
import { consultationEligibility } from "@/lib/consultation";
import { stripe } from "@/lib/stripe";

const schema = z.object({ scheduledDate: z.string().datetime().optional() });

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await request.json());
  const eligibility = await consultationEligibility(user.id, user.tier, user.subscriptionStatus, user.successfulBillingCount);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email || undefined,
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/strategy-session?success=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/strategy-session?canceled=1`,
    metadata: {
      userId: user.id,
      discounted: String(eligibility.discountedEligible),
      price: String(eligibility.price),
      tierAtPurchase: user.tier,
      scheduledDate: body.scheduledDate || "",
      purchaseType: "consultation",
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product_data: { name: "Guilded Strategy Session" },
          unit_amount: eligibility.price,
        },
      },
    ],
  });

  return NextResponse.json({ url: session.url });
}
