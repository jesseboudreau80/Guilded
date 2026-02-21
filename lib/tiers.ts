import { Tier } from "@prisma/client";

export const TIER_LEVEL: Record<Tier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 1,
  MASTER: 2,
  HERO: 3,
};

export const AI_LIMITS: Record<Tier, { messages: number; maxTokens: number }> = {
  APPRENTICE: { messages: 0, maxTokens: 0 },
  JOURNEYMAN: { messages: 15, maxTokens: 600 },
  MASTER: { messages: 100, maxTokens: 1200 },
  HERO: { messages: 300, maxTokens: 2000 },
};

export function canAccess(userTier: Tier, required: Tier) {
  return TIER_LEVEL[userTier] >= TIER_LEVEL[required];
}
