import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Tier } from "@prisma/client";
import { TIER_ORDER } from "@/types";
import { z } from "zod";

const progressSchema = z.object({
  lessonId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = progressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { lessonId } = parsed.data;
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { requiredTier: true } } },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const userTier = (user?.tier ?? "APPRENTICE") as Tier;
    const requiredTier = lesson.module.requiredTier as Tier;

    if (TIER_ORDER[userTier] < TIER_ORDER[requiredTier]) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.progress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: { completedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROGRESS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await prisma.progress.findMany({
      where: { userId: session.user.id },
      include: {
        lesson: {
          select: { id: true, title: true, moduleId: true },
        },
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("[PROGRESS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
