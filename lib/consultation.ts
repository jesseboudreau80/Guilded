import { prisma } from "@/lib/prisma";
import { Tier, SubscriptionStatus } from "@prisma/client";
import {
  CONSULTATION_PRICES,
  STANDARD_CONSULTATION_PRICE,
  DISCOUNT_MIN_BILLING_CYCLES,
  DISCOUNT_MAX_SESSIONS_PER_YEAR,
  DISCOUNT_MIN_DAYS_BETWEEN_SESSIONS,
  ConsultationEligibility,
  TIER_ORDER,
} from "@/types";
import { subDays, subYears, differenceInDays } from "date-fns";

/**
 * Determine consultation price and discount eligibility for a user.
 * All pricing logic is server-side only.
 */
export async function getConsultationEligibility(
  userId: string
): Promise<ConsultationEligibility> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      subscriptionStatus: true,
      successfulBillingCount: true,
    },
  });

  if (!user) throw new Error("User not found");

  const { tier, subscriptionStatus, successfulBillingCount } = user;

  // Only MASTER and HERO can get discounts
  const tierEligibleForDiscount = TIER_ORDER[tier] >= TIER_ORDER["MASTER" as Tier];

  // Check active subscription
  const hasActiveSubscription = subscriptionStatus === SubscriptionStatus.ACTIVE;

  // Check billing cycle requirement
  const hasSufficientBillingCycles =
    successfulBillingCount >= DISCOUNT_MIN_BILLING_CYCLES;

  const now = new Date();
  const oneYearAgo = subYears(now, 1);

  // Count discounted sessions in rolling 365-day window
  const recentDiscountedSessions = await prisma.consultation.findMany({
    where: {
      userId,
      discounted: true,
      purchasedAt: { gte: oneYearAgo },
    },
    orderBy: { purchasedAt: "desc" },
  });

  const sessionsUsed = recentDiscountedSessions.length;
  const sessionsRemaining = Math.max(
    0,
    DISCOUNT_MAX_SESSIONS_PER_YEAR - sessionsUsed
  );

  // Find the most recent discounted session date
  const lastDiscountedSession = recentDiscountedSessions[0];
  const lastDiscountedDate = lastDiscountedSession?.purchasedAt ?? null;

  // Calculate next eligible date
  let nextEligibleDate: Date | null = null;
  if (lastDiscountedDate) {
    nextEligibleDate = new Date(lastDiscountedDate);
    nextEligibleDate.setDate(
      nextEligibleDate.getDate() + DISCOUNT_MIN_DAYS_BETWEEN_SESSIONS
    );
  }

  // Days since last session
  const daysSinceLastSession = lastDiscountedDate
    ? differenceInDays(now, lastDiscountedDate)
    : Infinity;

  const cooldownSatisfied =
    daysSinceLastSession >= DISCOUNT_MIN_DAYS_BETWEEN_SESSIONS;
  const sessionLimitSatisfied =
    sessionsUsed < DISCOUNT_MAX_SESSIONS_PER_YEAR;

  const eligible =
    tierEligibleForDiscount &&
    hasActiveSubscription &&
    hasSufficientBillingCycles &&
    cooldownSatisfied &&
    sessionLimitSatisfied;

  let reason: string | undefined;
  if (!eligible) {
    if (!hasActiveSubscription) {
      reason = "An active subscription is required for a discounted session.";
    } else if (!tierEligibleForDiscount) {
      reason = "Upgrade to Master or Hero to unlock discounted sessions.";
    } else if (!hasSufficientBillingCycles) {
      reason = `You need at least ${DISCOUNT_MIN_BILLING_CYCLES} successful billing cycles to qualify.`;
    } else if (!sessionLimitSatisfied) {
      reason = `You have used all ${DISCOUNT_MAX_SESSIONS_PER_YEAR} discounted sessions in the past 365 days.`;
    } else if (!cooldownSatisfied) {
      reason = `Your last discounted session was ${daysSinceLastSession} days ago. You must wait ${DISCOUNT_MIN_DAYS_BETWEEN_SESSIONS} days between discounted sessions.`;
    }
  }

  return {
    eligible,
    discountedPrice: eligible ? CONSULTATION_PRICES[tier] : null,
    standardPrice: STANDARD_CONSULTATION_PRICE,
    reason,
    sessionsUsed,
    sessionsRemaining: eligible ? sessionsRemaining : 0,
    nextEligibleDate:
      !cooldownSatisfied && nextEligibleDate ? nextEligibleDate : null,
  };
}
