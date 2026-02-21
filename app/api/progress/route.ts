import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

const schema = z.object({ lessonId: z.string().min(1) });

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await request.json());
  const progress = await prisma.progress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: body.lessonId } },
    create: { userId: user.id, lessonId: body.lessonId },
    update: { completedAt: new Date() },
  });

  return NextResponse.json({ progress });
}
