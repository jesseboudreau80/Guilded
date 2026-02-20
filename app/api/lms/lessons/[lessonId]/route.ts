import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Tier } from "@prisma/client";
import { TIER_ORDER } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lessonId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true },
    });

    const userTier = (user?.tier ?? "APPRENTICE") as Tier;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId, isPublished: true },
      include: {
        module: { select: { requiredTier: true, title: true } },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Server-side tier enforcement — never expose locked content
    const requiredTier = lesson.module.requiredTier as Tier;
    if (TIER_ORDER[userTier] < TIER_ORDER[requiredTier]) {
      return NextResponse.json(
        { error: "Upgrade required", requiredTier },
        { status: 403 }
      );
    }

    // Get user progress for this lesson
    const progress = await prisma.progress.findUnique({
      where: {
        userId_lessonId: { userId: session.user.id, lessonId },
      },
    });

    return NextResponse.json({ lesson, completed: !!progress });
  } catch (error) {
    console.error("[LESSON_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
