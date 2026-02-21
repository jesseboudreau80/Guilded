import { Tier, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const BASE_RATE = 20000;
const DISCOUNTED_RATE: Record<Tier, number> = {
  APPRENTICE: BASE_RATE,
  JOURNEYMAN: BASE_RATE,
  MASTER: 15000,
  HERO: 10000,
};

export async function consultationEligibility(userId: string, tier: Tier, status: SubscriptionStatus, successfulBillingCount: number) {
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setDate(yearAgo.getDate() - 365);

  const discountedSessions = await prisma.consultation.findMany({
    where: { userId, discounted: true, purchasedAt: { gt: yearAgo } },
    orderBy: { purchasedAt: "desc" },
  });

  const used = discountedSessions.length;
  const latest = discountedSessions[0]?.purchasedAt;

  const hasActive = status === "ACTIVE";
  const enoughCycles = successfulBillingCount >= 2;
  const withinCount = used < 4;

  let spacingEligible = true;
  let nextEligibleDate: Date | null = null;

  if (latest) {
    const unlock = new Date(latest);
    unlock.setDate(unlock.getDate() + 60);
    spacingEligible = unlock <= now;
    nextEligibleDate = unlock;
  }

  const tierEligible = tier === "MASTER" || tier === "HERO";
  const discountedEligible = hasActive && enoughCycles && withinCount && spacingEligible && tierEligible;

  return {
    discountedEligible,
    usedDiscountedIn365Days: used,
    nextEligibleDate,
    price: discountedEligible ? DISCOUNTED_RATE[tier] : BASE_RATE,
    discountedPrice: DISCOUNTED_RATE[tier],
  };
}
