"use client";

import { useState } from "react";

export function MarkCompleteButton({ lessonId, initialCompleted }: { lessonId: string; initialCompleted: boolean }) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);

  const markComplete = async () => {
    setSaving(true);
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId }),
    });
    setSaving(false);
    if (res.ok) setCompleted(true);
  };

  if (completed) {
    return <p className="mt-6 rounded border border-emerald-600/50 bg-emerald-500/10 p-3 text-sm text-emerald-300">✅ Lesson completed</p>;
  }

  return (
    <button
      onClick={markComplete}
      disabled={saving}
      className="mt-6 rounded bg-accent px-4 py-2 disabled:opacity-50"
    >
      {saving ? "Saving..." : "Mark lesson complete"}
    </button>
  );
}
