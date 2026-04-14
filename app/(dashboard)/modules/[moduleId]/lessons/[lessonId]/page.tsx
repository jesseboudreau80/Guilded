import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { TIER_ORDER } from "@/types";
import { Tier } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, CheckCircle } from "lucide-react";
import { LessonCompleteButton } from "@/components/lms/lesson-complete-button";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { moduleId, lessonId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true },
  });

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId, isPublished: true },
    include: { module: true },
  });

  if (!lesson || lesson.moduleId !== moduleId) notFound();

  const userTier = (user?.tier ?? "APPRENTICE") as Tier;
  const requiredTier = lesson.module.requiredTier as Tier;

  // Server-side tier gate — never expose locked content
  if (TIER_ORDER[userTier] < TIER_ORDER[requiredTier]) {
    redirect("/upgrade");
  }

  const progress = await prisma.progress.findUnique({
    where: {
      userId_lessonId: { userId: session.user.id, lessonId },
    },
  });

  // Get adjacent lessons for navigation
  const allLessons = await prisma.lesson.findMany({
    where: { moduleId, isPublished: true },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true },
  });

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Back */}
      <Link
        href="/modules"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Modules
      </Link>

      {/* Module breadcrumb */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm text-gray-500">{lesson.module.title}</span>
        <span className="text-gray-600">/</span>
        <span className="text-sm text-gray-400">Lesson {lesson.order}</span>
      </div>

      {/* Lesson header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{lesson.title}</h1>
        {progress && (
          <Badge variant="success" className="flex-shrink-0">
            <CheckCircle className="mr-1 h-3.5 w-3.5" />
            Completed
          </Badge>
        )}
      </div>

      {/* Lesson content */}
      <div className="prose prose-invert prose-sm max-w-none mb-10">
        <div
          className="rounded-xl border border-surface-border bg-surface-card p-6 text-gray-300 leading-relaxed whitespace-pre-wrap"
        >
          {lesson.content}
        </div>
      </div>

      {/* Completion + Navigation */}
      <div className="flex items-center justify-between gap-4 border-t border-surface-border pt-6">
        <div>
          {prevLesson && (
            <Link
              href={`/modules/${moduleId}/lessons/${prevLesson.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!progress && (
            <LessonCompleteButton lessonId={lessonId} />
          )}
          {nextLesson && (
            <Link href={`/modules/${moduleId}/lessons/${nextLesson.id}`}>
              <Button variant="primary" size="sm">
                Next Lesson →
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
