import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai, AI_DISCLAIMER } from "@/lib/openai";
import { checkAiUsage, incrementAiUsage, getTokenLimit } from "@/lib/ai-usage";
import { z } from "zod";
import { Tier } from "@prisma/client";

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
});

const SYSTEM_PROMPT = `You are Guilded AI, an educational assistant specializing in credit literacy and financial education.

Your role is to:
- Explain credit concepts in clear, educational terms
- Help users understand credit reports, scores, and factors
- Provide general educational information about dispute processes
- Guide users through understanding their credit rights under FCRA, FDCPA

You MUST:
- Always frame responses as educational information, not professional advice
- Never promise specific credit score improvements or outcomes
- Never claim to perform credit repair services
- Always encourage consulting qualified professionals for specific situations
- Be supportive, clear, and educational in tone

Remember: You are an educational tool, not a credit repair service.`;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user tier
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = user.tier as Tier;

    // Check AI usage limits
    const usageStatus = await checkAiUsage(userId, tier);
    if (!usageStatus.canUse) {
      return NextResponse.json(
        {
          error: "AI limit reached",
          message:
            tier === "APPRENTICE"
              ? "Upgrade your plan to access the AI assistant."
              : `You have reached your monthly AI message limit of ${usageStatus.limit}. Your usage resets on ${usageStatus.resetDate?.toLocaleDateString()}.`,
          upgradeRequired: true,
          usage: usageStatus,
        },
        { status: 429 }
      );
    }

    // Validate request body
    const body = await req.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { message } = parsed.data;
    const tokenLimit = getTokenLimit(tier);

    // Fetch recent conversation context (last 10 messages)
    const recentMessages = await prisma.aiMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const conversationHistory = recentMessages
      .reverse()
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: tokenLimit,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversationHistory,
        { role: "user", content: message },
      ],
    });

    const assistantContent = completion.choices[0]?.message?.content ?? "";
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    // Prepend disclaimer to response
    const responseWithDisclaimer = `${AI_DISCLAIMER}\n\n---\n\n${assistantContent}`;

    // Store messages and increment usage in parallel
    await Promise.all([
      prisma.aiMessage.create({
        data: { userId, role: "user", content: message },
      }),
      prisma.aiMessage.create({
        data: {
          userId,
          role: "assistant",
          content: responseWithDisclaimer,
          tokens: tokensUsed,
        },
      }),
      incrementAiUsage(userId),
    ]);

    const updatedUsage = await checkAiUsage(userId, tier);

    return NextResponse.json({
      message: responseWithDisclaimer,
      usage: updatedUsage,
    });
  } catch (error) {
    console.error("[AI_CHAT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const messages = await prisma.aiMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[AI_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
