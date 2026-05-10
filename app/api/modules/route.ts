import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { canAccess } from "@/lib/tiers";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const modules = await prisma.module.findMany({
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  const visible = modules
    .filter((m) => canAccess(user.tier, m.requiredTier))
    .map((m) => ({ ...m, lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, order: l.order })) }));

  return NextResponse.json({ modules: visible });
}
