import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/server-auth";
import { atomicConsumeAiMessage } from "@/lib/ai-usage";
import { AI_LIMITS } from "@/lib/tiers";
import { openai, EDUCATIONAL_DISCLAIMER } from "@/lib/openai";

const schema = z.object({
  prompt: z.string().min(4).max(4000),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse and validate body before consuming a message credit.
  let body: z.infer<typeof schema>;
  try {
    const raw = await request.json();
    body = schema.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Atomically reset monthly counter if needed, then attempt to consume one
  // message. This is the single enforcement point — never trust client state.
  const result = await atomicConsumeAiMessage(user.id, user.tier);

  if (result === "no_access") {
    return NextResponse.json(
      { error: "AI access requires a paid subscription.", upgradeRequired: true },
      { status: 403 }
    );
  }

  if (result === "cap_exceeded") {
    return NextResponse.json(
      { error: "Monthly AI message cap reached.", upgradeRequired: true },
      { status: 429 }
    );
  }

  // Counter has been incremented. Proceed with the OpenAI call.
  // If the call fails, the credit is consumed — this prevents abuse via
  // error-looping to avoid counting.
  const { maxTokens } = AI_LIMITS[user.tier];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: body.prompt }],
    max_tokens: maxTokens,
  });

  const text =
    completion.choices[0]?.message?.content ?? "No response generated.";

  return NextResponse.json({
    response: `${EDUCATIONAL_DISCLAIMER}\n\n${text}`,
  });
}
