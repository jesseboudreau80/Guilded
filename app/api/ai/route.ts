import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/server-auth";
import { getAiLimit, resetAiUsageIfNeeded } from "@/lib/ai-usage";
import { openai, EDUCATIONAL_DISCLAIMER } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

const schema = z.object({ prompt: z.string().min(4).max(4000) });

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Prompt must be between 4 and 4000 characters." }, { status: 400 });
  }

  await resetAiUsageIfNeeded(user.id, user.tier, user.aiUsageResetDate);
  const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
  if (!refreshed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, maxTokens } = getAiLimit(refreshed.tier);
  if (messages === 0) {
    return NextResponse.json({ error: "AI is unavailable on your tier. Upgrade required.", upgradeRequired: true }, { status: 403 });
  }

  // Atomically claim one message so concurrent requests cannot exceed the cap.
  const claimed = await prisma.user.updateMany({
    where: { id: user.id, aiUsageCount: { lt: messages } },
    data: { aiUsageCount: { increment: 1 } },
  });
  if (claimed.count === 0) {
    return NextResponse.json({
      error: "Monthly AI message cap reached.",
      upgradeRequired: true,
    }, { status: 429 });
  }

  try {
    const completion = await openai.responses.create({
      model: "gpt-4o-mini",
      input: parsed.data.prompt,
      max_output_tokens: maxTokens,
    });

    const text = completion.output_text || "No response generated.";
    return NextResponse.json({ response: `${EDUCATIONAL_DISCLAIMER}\n\n${text}` });
  } catch {
    // Refund the claimed message so a provider outage doesn't burn the user's quota.
    await prisma.user.updateMany({
      where: { id: user.id, aiUsageCount: { gt: 0 } },
      data: { aiUsageCount: { decrement: 1 } },
    });
    return NextResponse.json({ error: "The AI assistant is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
