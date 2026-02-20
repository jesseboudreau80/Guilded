import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TIER_ORDER, TIER_DISPLAY } from "@/types";
import { Tier } from "@prisma/client";
import Link from "next/link";
import { BookOpen, Lock, CheckCircle, ChevronRight } from "lucide-react";

export const metadata = { title: "Modules" };

export default async function ModulesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true },
  });

  const userTier = (user?.tier ?? "APPRENTICE") as Tier;
  const userTierOrder = TIER_ORDER[userTier];

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

  const completedLessonIds = new Set(
    (
      await prisma.progress.findMany({
        where: { userId: session.user.id },
        select: { lessonId: true },
      })
    ).map((p) => p.lessonId)
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Learning Modules</h1>
        <p className="mt-1 text-gray-400">
          Build your credit literacy from the ground up.
        </p>
      </div>

      <div className="space-y-4">
        {modules.map((module) => {
          const isLocked =
            TIER_ORDER[module.requiredTier as Tier] > userTierOrder;
          const accessibleLessons = isLocked ? [] : module.lessons;
          const completedCount = accessibleLessons.filter((l) =>
            completedLessonIds.has(l.id)
          ).length;
          const progress =
            accessibleLessons.length > 0
              ? Math.round((completedCount / accessibleLessons.length) * 100)
              : 0;

          return (
            <Card
              key={module.id}
              className={isLocked ? "opacity-60" : undefined}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                      isLocked
                        ? "bg-surface-border"
                        : "bg-brand-600/20"
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="h-5 w-5 text-gray-500" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-brand-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{module.title}</h3>
                      {isLocked && (
                        <Badge variant="warning">
                          {TIER_DISPLAY[module.requiredTier as Tier]}+
                        </Badge>
                      )}
                      {!isLocked && completedCount === accessibleLessons.length && accessibleLessons.length > 0 && (
                        <Badge variant="success">Completed</Badge>
                      )}
                    </div>

                    {module.description && (
                      <p className="mt-1 text-sm text-gray-400">
                        {module.description}
                      </p>
                    )}

                    {!isLocked && (
                      <>
                        <div className="mt-3">
                          <ProgressBar
                            value={completedCount}
                            max={accessibleLessons.length || 1}
                            showValue
                            label="Progress"
                          />
                        </div>

                        <div className="mt-3 space-y-1.5">
                          {module.lessons.slice(0, 4).map((lesson) => (
                            <Link
                              key={lesson.id}
                              href={`/modules/${module.id}/lessons/${lesson.id}`}
                              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-surface-hover transition-colors group"
                            >
                              <CheckCircle
                                className={`h-4 w-4 flex-shrink-0 ${
                                  completedLessonIds.has(lesson.id)
                                    ? "text-emerald-400"
                                    : "text-gray-600"
                                }`}
                              />
                              <span className="flex-1 truncate text-gray-300 group-hover:text-white">
                                {lesson.title}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400" />
                            </Link>
                          ))}
                          {module.lessons.length > 4 && (
                            <p className="px-3 text-xs text-gray-500">
                              +{module.lessons.length - 4} more lessons
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {isLocked && (
                      <div className="mt-3">
                        <Link
                          href="/upgrade"
                          className="text-sm text-brand-400 hover:text-brand-300 font-medium"
                        >
                          Upgrade to {TIER_DISPLAY[module.requiredTier as Tier]} to unlock →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {modules.length === 0 && (
          <div className="rounded-xl border border-surface-border bg-surface-card p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-gray-600" />
            <p className="mt-3 text-gray-400">No modules available yet. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
