export const TIER_ORDER = ["APPRENTICE", "JOURNEYMAN", "MASTER", "HERO"] as const;
export type Tier = (typeof TIER_ORDER)[number];

export const TIER_RANK: Record<Tier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 1,
  MASTER:     2,
  HERO:       3,
};

export const TIER_PRICE: Record<Tier, string> = {
  APPRENTICE: "Free",
  JOURNEYMAN: "$19/month",
  MASTER:     "$47/month",
  HERO:       "Contact us",
};

export const AI_LIMITS: Record<Tier, number> = {
  APPRENTICE: 5,
  JOURNEYMAN: 20,
  MASTER:     100,
  HERO:       300,
};

// All tiers are monthly — backend resets monthly; weekly branding was a
// false-advertising bug (backend resets every 30 days). Fixed 2026-07-02.
export const AI_PERIOD: Record<Tier, "weekly" | "monthly"> = {
  APPRENTICE: "monthly",
  JOURNEYMAN: "monthly",
  MASTER:     "monthly",
  HERO:       "monthly",
};

export function tierRank(tier: string): number {
  return TIER_RANK[tier as Tier] ?? -1;
}
