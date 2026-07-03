import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { canAccess, TIER_LABELS } from "@/lib/tiers";

export default async function DashboardHome() {
  const user = await requireUser();
  if (!user) return null;

  const [modules, progress] = await Promise.all([
    prisma.module.findMany({ orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } }),
    prisma.progress.findMany({ where: { userId: user.id }, select: { lessonId: true } }),
  ]);
  const completed = new Set(progress.map((p) => p.lessonId));
  const unlockedLessons = modules
    .filter((m) => canAccess(user.tier, m.requiredTier))
    .flatMap((m) => m.lessons);
  const doneCount = unlockedLessons.filter((l) => completed.has(l.id)).length;
  const pct = unlockedLessons.length === 0 ? 0 : Math.round((doneCount / unlockedLessons.length) * 100);
  const nextLesson = unlockedLessons.find((l) => !completed.has(l.id));

  return (
    <section>
      <h1 className="text-3xl font-bold">Welcome back{user.name ? `, ${user.name}` : ""}</h1>
      <p className="mt-1 text-slate-600">
        {TIER_LABELS[user.tier]} plan · {doneCount} of {unlockedLessons.length} available lessons complete
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Your progress</h2>
          <span className="font-semibold text-emerald-700">{pct}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded bg-slate-200">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        {nextLesson ? (
          <Link
            href={`/dashboard/modules/${nextLesson.id}`}
            className="mt-4 inline-block rounded bg-accent px-4 py-2 font-medium text-white text-sm"
          >
            Continue: {nextLesson.title} →
          </Link>
        ) : (
          <p className="mt-4 text-sm text-slate-600">All available lessons complete — well done. 🏆</p>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/modules" className="rounded-lg border border-slate-200 bg-card p-5 hover:border-emerald-600/50">
          <h2 className="font-semibold">Modules</h2>
          <p className="mt-1 text-sm text-slate-600">The full curriculum, start to capstone.</p>
        </Link>
        <Link href="/dashboard/templates" className="rounded-lg border border-slate-200 bg-card p-5 hover:border-emerald-600/50">
          <h2 className="font-semibold">Templates</h2>
          <p className="mt-1 text-sm text-slate-600">Dispute and negotiation letters, ready to fill in.</p>
        </Link>
        <Link href="/dashboard/ai" className="rounded-lg border border-slate-200 bg-card p-5 hover:border-emerald-600/50">
          <h2 className="font-semibold">AI Assistant</h2>
          <p className="mt-1 text-sm text-slate-600">Plain-English answers while you work.</p>
        </Link>
      </div>
    </section>
  );
}
