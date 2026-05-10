import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { canAccess } from "@/lib/tiers";

const schema = z.object({ lessonId: z.string().min(1) });

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify the lesson exists and the user's tier meets the module requirement.
  // This prevents a lower-tier user from marking arbitration lessons complete
  // by calling the API directly.
  const lesson = await prisma.lesson.findUnique({
    where: { id: body.lessonId },
    include: { module: { select: { requiredTier: true } } },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (!canAccess(user.tier, lesson.module.requiredTier)) {
    return NextResponse.json({ error: "Insufficient tier" }, { status: 403 });
  }

  const progress = await prisma.progress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: body.lessonId } },
    create: { userId: user.id, lessonId: body.lessonId },
    update: { completedAt: new Date() },
  });

  return NextResponse.json({ progress });
}
