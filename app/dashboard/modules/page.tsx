import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { canAccess, TIER_LABELS } from "@/lib/tiers";

export default async function ModulesPage() {
  const user = await requireUser();
  if (!user) return null;

  const [modules, progress] = await Promise.all([
    prisma.module.findMany({ orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } }),
    prisma.progress.findMany({ where: { userId: user.id }, select: { lessonId: true } }),
  ]);
  const completed = new Set(progress.map((p) => p.lessonId));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Modules</h1>
      <p className="mt-1 text-sm text-slate-400">Your full curriculum. Locked modules unlock when you upgrade.</p>
      <div className="mt-5 space-y-4">
        {modules.map((module) => {
          const locked = !canAccess(user.tier, module.requiredTier);
          const done = module.lessons.filter((l) => completed.has(l.id)).length;
          return (
            <div
              key={module.id}
              className={`rounded border p-4 ${locked ? "border-slate-800 bg-card/50 opacity-75" : "border-slate-700 bg-card"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{module.title}</h2>
                {locked ? (
                  <Link
                    href="/dashboard/upgrade"
                    className="whitespace-nowrap rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-300"
                  >
                    Unlocks with {TIER_LABELS[module.requiredTier]}
                  </Link>
                ) : (
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {done}/{module.lessons.length} complete
                  </span>
                )}
              </div>
              {module.description && <p className="mt-1 text-sm text-slate-400">{module.description}</p>}
              <ul className="mt-3 space-y-1 text-slate-300">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex items-center gap-2 text-sm">
                    {locked ? (
                      <>
                        <span aria-hidden>🔒</span>
                        <span className="text-slate-500">{lesson.title}</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden>{completed.has(lesson.id) ? "✅" : "▫️"}</span>
                        <Link href={`/dashboard/modules/${lesson.id}`} className="hover:text-white hover:underline">
                          {lesson.title}
                        </Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
