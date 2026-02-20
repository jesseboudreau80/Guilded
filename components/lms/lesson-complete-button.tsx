"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface LessonCompleteButtonProps {
  lessonId: string;
}

export function LessonCompleteButton({ lessonId }: LessonCompleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleComplete() {
    setLoading(true);
    try {
      await fetch("/api/lms/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      setDone(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle className="h-4 w-4" />
        Marked complete!
      </div>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      loading={loading}
      onClick={handleComplete}
    >
      <CheckCircle className="mr-1.5 h-4 w-4" />
      Mark Complete
    </Button>
  );
}
