import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { canAccess } from "@/lib/tiers";

// Returns full lesson content — gated by the parent module's requiredTier.
// Locked content is never returned by the API; the response is 403 with no
// content fragment, regardless of what the client requests.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    include: { module: { select: { id: true, requiredTier: true, title: true } } },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canAccess(user.tier, lesson.module.requiredTier)) {
    return NextResponse.json(
      { error: "Your current tier does not include access to this content." },
      { status: 403 }
    );
  }

  // Return only the fields the client needs — do not expose requiredTier or
  // other internal metadata that could inform bypass attempts.
  return NextResponse.json({
    id: lesson.id,
    title: lesson.title,
    content: lesson.content,
    order: lesson.order,
    moduleId: lesson.moduleId,
    moduleTitle: lesson.module.title,
  });
}
