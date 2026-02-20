import { Tier } from "@prisma/client";
import { TIER_ORDER } from "@/types";

/**
 * Check if a user's tier meets or exceeds the required tier.
 */
export function hasRequiredTier(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_ORDER[userTier] >= TIER_ORDER[requiredTier];
}

/**
 * Check if user has active AI access (paid tier with active subscription).
 */
export function hasAiAccess(tier: Tier): boolean {
  return TIER_ORDER[tier] >= TIER_ORDER["JOURNEYMAN"];
}

/**
 * Check if user can access arbitration module.
 */
export function hasArbitrationAccess(tier: Tier): boolean {
  return TIER_ORDER[tier] >= TIER_ORDER["MASTER"];
}

/**
 * Get the display label for a tier.
 */
export function getTierLabel(tier: Tier): string {
  const labels: Record<Tier, string> = {
    APPRENTICE: "Apprentice",
    JOURNEYMAN: "Journeyman",
    MASTER: "Master",
    HERO: "Hero",
  };
  return labels[tier];
}
