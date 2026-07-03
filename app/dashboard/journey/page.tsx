import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { canAccess, TIER_LABELS } from "@/lib/tiers";

export default async function JourneyPage() {
  const user = await requireUser();
  if (!user) return null;

  const [modules, progress] = await Promise.all([
    prisma.module.findMany({ orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } }),
    prisma.progress.findMany({ where: { userId: user.id }, select: { lessonId: true } }),
  ]);
  const completed = new Set(progress.map((p) => p.lessonId));

  const unlockedModules = modules.filter((m) => canAccess(user.tier, m.requiredTier));
  const unlockedLessons = unlockedModules.flatMap((m) => m.lessons);
  const doneCount = unlockedLessons.filter((l) => completed.has(l.id)).length;
  const pct = unlockedLessons.length === 0 ? 0 : Math.round((doneCount / unlockedLessons.length) * 100);
  const nextLesson = unlockedLessons.find((l) => !completed.has(l.id));

  return (
    <div>
      <h1 className="text-2xl font-semibold">My Journey</h1>
      <div className="mt-4 rounded border border-slate-200 bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-slate-600">
            {doneCount} of {unlockedLessons.length} available lessons complete
          </p>
          <p className="font-semibold">{pct}%</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        {nextLesson && (
          <Link href={`/dashboard/modules/${nextLesson.id}`} className="mt-3 inline-block text-sm text-accent hover:underline">
            Continue: {nextLesson.title} →
          </Link>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {modules.map((module) => {
          const locked = !canAccess(user.tier, module.requiredTier);
          const done = module.lessons.filter((l) => completed.has(l.id)).length;
          return (
            <div key={module.id} className="flex items-center justify-between rounded border border-slate-200 bg-card p-3">
              <div>
                <p className={locked ? "text-slate-500" : "text-slate-700"}>{module.title}</p>
                <p className="text-xs text-slate-500">
                  {locked ? `Unlocks with ${TIER_LABELS[module.requiredTier]}` : `${done}/${module.lessons.length} lessons complete`}
                </p>
              </div>
              {!locked && done === module.lessons.length && module.lessons.length > 0 && <span aria-hidden>🏆</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
