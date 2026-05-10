import { Tier, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const BASE_RATE = 20000; // cents — $200.00

// Only MASTER and HERO qualify for discounts.
// APPRENTICE and JOURNEYMAN always pay BASE_RATE.
const DISCOUNTED_RATE: Record<Tier, number> = {
  APPRENTICE: BASE_RATE,
  JOURNEYMAN: BASE_RATE,
  MASTER: 15000, // $150.00
  HERO: 10000,   // $100.00
};

export interface ConsultationEligibility {
  discountedEligible: boolean;
  usedDiscountedIn365Days: number;
  nextEligibleDate: Date | null;
  /** Price to charge in cents */
  price: number;
  /** What the discounted price would be if eligible */
  discountedPrice: number;
}

/**
 * Computes consultation pricing and discount eligibility entirely server-side.
 * This function is the single source of truth for pricing — never call from
 * the client or pass price through the request body.
 *
 * Discount rules (all must be satisfied):
 *   1. Subscription status is ACTIVE
 *   2. At least 2 successful billing cycles
 *   3. Fewer than 4 discounted sessions in the rolling 365-day window
 *   4. At least 60 days since the last discounted session
 *   5. Tier is MASTER or HERO
 */
export async function consultationEligibility(
  userId: string,
  tier: Tier,
  status: SubscriptionStatus,
  successfulBillingCount: number
): Promise<ConsultationEligibility> {
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setDate(yearAgo.getDate() - 365);

  const discountedSessions = await prisma.consultation.findMany({
    where: { userId, discounted: true, createdAt: { gt: yearAgo } },
    orderBy: { createdAt: "desc" },
  });

  const usedCount = discountedSessions.length;
  const latestCreatedAt = discountedSessions[0]?.createdAt ?? null;

  const hasActive = status === "ACTIVE";
  const enoughCycles = successfulBillingCount >= 2;
  const withinCount = usedCount < 4;
  const tierEligible = tier === "MASTER" || tier === "HERO";

  let spacingEligible = true;
  let nextEligibleDate: Date | null = null;

  if (latestCreatedAt) {
    const unlock = new Date(latestCreatedAt);
    unlock.setDate(unlock.getDate() + 60);
    spacingEligible = unlock <= now;
    if (!spacingEligible) nextEligibleDate = unlock;
  }

  const discountedEligible =
    hasActive && enoughCycles && withinCount && spacingEligible && tierEligible;

  return {
    discountedEligible,
    usedDiscountedIn365Days: usedCount,
    nextEligibleDate,
    price: discountedEligible ? DISCOUNTED_RATE[tier] : BASE_RATE,
    discountedPrice: DISCOUNTED_RATE[tier],
  };
}
