import { prisma } from "@/lib/prisma";
import { Tier } from "@prisma/client";
import { AI_MESSAGE_LIMITS, AI_TOKEN_LIMITS } from "@/types";
import { startOfMonth, isAfter } from "date-fns";

export interface AiUsageStatus {
  canUse: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetDate: Date | null;
}

/**
 * Check if user can send an AI message and return usage status.
 */
export async function checkAiUsage(
  userId: string,
  tier: Tier
): Promise<AiUsageStatus> {
  const limit = AI_MESSAGE_LIMITS[tier];

  if (limit === 0) {
    return {
      canUse: false,
      used: 0,
      limit: 0,
      remaining: 0,
      resetDate: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiUsageCount: true, aiUsageResetDate: true },
  });

  if (!user) throw new Error("User not found");

  // Reset usage if new billing month
  const now = new Date();
  const monthStart = startOfMonth(now);

  if (!user.aiUsageResetDate || isAfter(monthStart, user.aiUsageResetDate)) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        aiUsageCount: 0,
        aiUsageResetDate: monthStart,
      },
    });

    return {
      canUse: true,
      used: 0,
      limit,
      remaining: limit,
      resetDate: startOfMonth(new Date(now.getFullYear(), now.getMonth() + 1)),
    };
  }

  const used = user.aiUsageCount;
  const remaining = Math.max(0, limit - used);
  const nextReset = startOfMonth(
    new Date(now.getFullYear(), now.getMonth() + 1)
  );

  return {
    canUse: remaining > 0,
    used,
    limit,
    remaining,
    resetDate: nextReset,
  };
}

/**
 * Increment AI usage count for a user.
 */
export async function incrementAiUsage(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      aiUsageCount: { increment: 1 },
    },
  });
}

/**
 * Get the token limit for a given tier.
 */
export function getTokenLimit(tier: Tier): number {
  return AI_TOKEN_LIMITS[tier];
}
