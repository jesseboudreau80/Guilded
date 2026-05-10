import { prisma } from "@/lib/prisma";
import { AI_LIMITS } from "@/lib/tiers";
import { Tier } from "@prisma/client";

export type AiConsumeResult = "ok" | "no_access" | "cap_exceeded";

/**
 * Atomically resets the monthly AI counter if the reset date has passed, then
 * attempts to consume one message from the user's allowance.
 *
 * Both operations use updateMany with a WHERE clause so that:
 *  - The reset is idempotent (concurrent resets both succeed; both write 0)
 *  - The increment is atomic (exactly one request wins the last available slot)
 *
 * The counter is incremented BEFORE the OpenAI call so that abuse attempts
 * (looping on errors to avoid counting) are not possible.
 */
export async function atomicConsumeAiMessage(
  userId: string,
  tier: Tier
): Promise<AiConsumeResult> {
  const { messages } = AI_LIMITS[tier];

  if (messages === 0) return "no_access";

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // Reset counter if the reset date has passed OR was never set (new user edge case).
  await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ aiUsageResetDate: { lte: now } }, { aiUsageResetDate: null }],
    },
    data: { aiUsageCount: 0, aiUsageResetDate: nextMonth },
  });

  // Atomically increment only if currently under the cap.
  // If 0 rows updated, the user is at or over the limit.
  const result = await prisma.user.updateMany({
    where: { id: userId, aiUsageCount: { lt: messages } },
    data: { aiUsageCount: { increment: 1 } },
  });

  return result.count > 0 ? "ok" : "cap_exceeded";
}
