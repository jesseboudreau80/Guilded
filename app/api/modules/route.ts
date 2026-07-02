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

  // Locked modules stay visible (titles only) so users can see what an upgrade unlocks.
  const visible = modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    order: m.order,
    requiredTier: m.requiredTier,
    locked: !canAccess(user.tier, m.requiredTier),
    lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, order: l.order })),
  }));

  return NextResponse.json({ modules: visible });
}
