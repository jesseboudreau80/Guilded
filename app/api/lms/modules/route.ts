import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Tier } from "@prisma/client";
import { TIER_ORDER } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true },
    });

    const userTier = (user?.tier ?? "APPRENTICE") as Tier;
    const userTierOrder = TIER_ORDER[userTier];

    // Fetch all published modules and determine access server-side
    const modules = await prisma.module.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      include: {
        lessons: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
          select: { id: true, title: true, order: true },
        },
      },
    });

    // Mark modules as locked/unlocked based on tier — never expose locked content
    const modulesWithAccess = modules.map((mod) => ({
      ...mod,
      locked: TIER_ORDER[mod.requiredTier as Tier] > userTierOrder,
      lessons: TIER_ORDER[mod.requiredTier as Tier] > userTierOrder
        ? [] // Don't expose lessons of locked modules
        : mod.lessons,
    }));

    return NextResponse.json({ modules: modulesWithAccess });
  } catch (error) {
    console.error("[MODULES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
