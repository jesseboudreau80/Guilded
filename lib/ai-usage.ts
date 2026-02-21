import { prisma } from "@/lib/prisma";
import { AI_LIMITS } from "@/lib/tiers";
import { Tier } from "@prisma/client";

export async function resetAiUsageIfNeeded(userId: string, tier: Tier, resetDate: Date | null) {
  const now = new Date();
  if (!resetDate || now >= resetDate) {
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    await prisma.user.update({ where: { id: userId }, data: { aiUsageCount: 0, aiUsageResetDate: next } });
    return 0;
  }
  return null;
}

export function getAiLimit(tier: Tier) {
  return AI_LIMITS[tier];
}
