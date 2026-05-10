export const TIER_ORDER = ["APPRENTICE", "JOURNEYMAN", "MASTER", "HERO"] as const;
export type Tier = (typeof TIER_ORDER)[number];

export const TIER_RANK: Record<Tier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 1,
  MASTER:     2,
  HERO:       3,
};

export const AI_LIMITS: Record<Tier, number> = {
  APPRENTICE: 5,
  JOURNEYMAN: 20,
  MASTER:     100,
  HERO:       300,
};

// Apprentice is branded as weekly; all others are monthly.
// The backend reset cadence is unchanged (monthly for all).
export const AI_PERIOD: Record<Tier, "weekly" | "monthly"> = {
  APPRENTICE: "weekly",
  JOURNEYMAN: "monthly",
  MASTER:     "monthly",
  HERO:       "monthly",
};

export function tierRank(tier: string): number {
  return TIER_RANK[tier as Tier] ?? -1;
}
