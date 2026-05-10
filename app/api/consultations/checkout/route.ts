import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/server-auth";
import { consultationEligibility } from "@/lib/consultation";
import { stripe } from "@/lib/stripe";

const schema = z.object({
  scheduledDate: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Price is computed entirely server-side. The client never sends a price.
  const eligibility = await consultationEligibility(
    user.id,
    user.tier,
    user.subscriptionStatus,
    user.successfulBillingCount
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/strategy-session?success=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/strategy-session?canceled=1`,
    metadata: {
      purchaseType: "consultation",
      userId: user.id,
      tierAtPurchase: user.tier,
      price: String(eligibility.price),
      discounted: String(eligibility.discountedEligible),
      scheduledDate: body.scheduledDate ?? "",
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
