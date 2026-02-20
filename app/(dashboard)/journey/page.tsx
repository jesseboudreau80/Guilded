import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Tier } from "@prisma/client";
import { TIER_ORDER } from "@/types";
import { CheckCircle, BookOpen, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My Journey" };

export default async function JourneyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true, createdAt: true },
  });

  const userTier = (user?.tier ?? "APPRENTICE") as Tier;

  const modules = await prisma.module.findMany({
    where: {
      isPublished: true,
      requiredTier: {
        in: Object.entries(TIER_ORDER)
          .filter(([, order]) => order <= TIER_ORDER[userTier])
          .map(([tier]) => tier as Tier),
      },
    },
    orderBy: { order: "asc" },
    include: {
      lessons: {
        where: { isPublished: true },
        select: { id: true, title: true, order: true },
      },
    },
  });

  const completedLessons = await prisma.progress.findMany({
    where: { userId: session.user.id },
    include: {
      lesson: { select: { title: true, moduleId: true } },
    },
    orderBy: { completedAt: "desc" },
  });

  const completedIds = new Set(completedLessons.map((p) => p.lessonId));
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalCompleted = completedLessons.length;
  const overallProgress =
    totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Journey</h1>
        <p className="mt-1 text-gray-400">
          Track your credit literacy progress across all modules.
        </p>
      </div>

      {/* Overall progress */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-white">
                Overall Progress
              </p>
              <p className="text-sm text-gray-400">
                {totalCompleted} of {totalLessons} lessons completed
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-white">
                {overallProgress}%
              </span>
            </div>
          </div>
          <ProgressBar value={totalCompleted} max={totalLessons || 1} />
          <p className="mt-3 text-xs text-gray-500">
            Member since {formatDate(user?.createdAt ?? new Date())}
          </p>
        </CardContent>
      </Card>

      {/* Module progress */}
      <div className="space-y-4">
        {modules.map((module) => {
          const moduleLessonIds = module.lessons.map((l) => l.id);
          const completedInModule = moduleLessonIds.filter((id) =>
            completedIds.has(id)
          ).length;
          const progress =
            module.lessons.length > 0
              ? Math.round((completedInModule / module.lessons.length) * 100)
              : 0;

          return (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-brand-400" />
                    {module.title}
                  </CardTitle>
                  {completedInModule === module.lessons.length &&
                    module.lessons.length > 0 && (
                      <Badge variant="success">
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        Complete
                      </Badge>
                    )}
                </div>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  value={completedInModule}
                  max={module.lessons.length || 1}
                  showValue
                  label={`${completedInModule}/${module.lessons.length} lessons`}
                />

                <div className="mt-4 space-y-1.5">
                  {module.lessons.slice(0, 5).map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
                    >
                      {completedIds.has(lesson.id) ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      )}
                      <span
                        className={
                          completedIds.has(lesson.id)
                            ? "text-gray-300"
                            : "text-gray-500"
                        }
                      >
                        {lesson.title}
                      </span>
                    </div>
                  ))}
                  {module.lessons.length > 5 && (
                    <p className="px-3 text-xs text-gray-600">
                      +{module.lessons.length - 5} more lessons
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {modules.length === 0 && (
          <div className="rounded-xl border border-surface-border bg-surface-card p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-gray-600" />
            <p className="mt-3 text-gray-400">
              No modules available yet. Check the Modules section soon.
            </p>
          </div>
        )}
      </div>

      {/* Recent activity */}
      {completedLessons.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Recent Activity
          </h2>
          <div className="space-y-2">
            {completedLessons.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3"
              >
                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {p.lesson.title}
                  </p>
                </div>
                <p className="flex-shrink-0 text-xs text-gray-500">
                  {formatDate(p.completedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
