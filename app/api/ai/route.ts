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

  await resetAiUsageIfNeeded(user.id, user.tier, user.aiUsageResetDate);
  const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
  if (!refreshed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, maxTokens } = getAiLimit(refreshed.tier);
  if (messages === 0) {
    return NextResponse.json({ error: "AI is unavailable on your tier. Upgrade required." }, { status: 403 });
  }

  if (refreshed.aiUsageCount >= messages) {
    return NextResponse.json({
      error: "Monthly AI message cap reached.",
      upgradeRequired: true,
    }, { status: 429 });
  }

  const body = schema.parse(await request.json());
  const completion = await openai.responses.create({
    model: "gpt-4o-mini",
    input: body.prompt,
    max_output_tokens: maxTokens,
  });

  await prisma.user.update({ where: { id: user.id }, data: { aiUsageCount: { increment: 1 } } });

  const text = completion.output_text || "No response generated.";
  return NextResponse.json({ response: `${EDUCATIONAL_DISCLAIMER}\n\n${text}` });
}
