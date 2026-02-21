import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/server-auth";
import { stripe, SUBSCRIPTION_PRICE_IDS } from "@/lib/stripe";
import { Tier } from "@prisma/client";

const schema = z.object({ tier: z.enum(["JOURNEYMAN", "MASTER", "HERO"]) });

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tier } = schema.parse(await request.json());
  const priceId = SUBSCRIPTION_PRICE_IDS[tier as Exclude<Tier, "APPRENTICE">];
  if (!priceId) return NextResponse.json({ error: "Missing price config" }, { status: 500 });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email || undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/account?subscribed=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/upgrade?canceled=1`,
    metadata: { userId: user.id, tier, purchaseType: "subscription" },
  });

  return NextResponse.json({ url: session.url });
}
