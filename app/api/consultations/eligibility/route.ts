import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { consultationEligibility } from "@/lib/consultation";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eligibility = await consultationEligibility(user.id, user.tier, user.subscriptionStatus, user.successfulBillingCount);

  return NextResponse.json({
    ...eligibility,
    message: `You have used ${eligibility.usedDiscountedIn365Days} of 4 discounted sessions in the past 365 days.`,
  });
}
