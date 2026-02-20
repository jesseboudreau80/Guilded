import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Tier } from "@prisma/client";
import { AI_MESSAGE_LIMITS } from "@/types";
import { AiChat } from "@/components/ai/ai-chat";

export const metadata = { title: "AI Assistant" };

export default async function AiAssistantPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true, aiUsageCount: true },
  });

  if (!user) redirect("/login");

  const tier = user.tier as Tier;

  if (tier === "APPRENTICE") {
    redirect("/upgrade");
  }

  const limit = AI_MESSAGE_LIMITS[tier];
  const used = user.aiUsageCount;

  // Prefetch recent messages
  const messages = await prisma.aiMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return (
    <AiChat
      initialMessages={messages}
      usageLimit={limit}
      usageCount={used}
      tier={tier}
    />
  );
}
