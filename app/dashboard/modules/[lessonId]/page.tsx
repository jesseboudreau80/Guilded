import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { canAccess, TIER_LABELS } from "@/lib/tiers";
import { MarkCompleteButton } from "@/components/mark-complete-button";

export default async function LessonPage({ params }: { params: { lessonId: string } }) {
  const user = await requireUser();
  if (!user) return null;

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    include: { module: true },
  });
  if (!lesson) notFound();

  if (!canAccess(user.tier, lesson.module.requiredTier)) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">{lesson.module.title}</h1>
        <p className="mt-3 text-slate-600">
          This lesson unlocks with the {TIER_LABELS[lesson.module.requiredTier]} plan.
        </p>
        <Link href="/dashboard/upgrade" className="mt-4 inline-block rounded bg-accent px-4 py-2 font-medium text-white">
          View plans
        </Link>
      </div>
    );
  }

  const progress = await prisma.progress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
  });

  return (
    <article className="max-w-3xl">
      <Link href="/dashboard/modules" className="text-sm text-slate-500 hover:text-slate-900">
        ← {lesson.module.title}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{lesson.title}</h1>
      <div className="mt-5 space-y-4 leading-relaxed text-slate-700">
        {lesson.content.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      <MarkCompleteButton lessonId={lesson.id} initialCompleted={Boolean(progress)} />
    </article>
  );
}
