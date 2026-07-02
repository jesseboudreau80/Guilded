"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { track } from "@/lib/analytics";
import { feedbackApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";

type Props = {
  label?:   string;
  /** page identifier sent to the feedback API, e.g. "audit-results" */
  context?: string;
};

type State = "idle" | "feedback" | "done";

export function FeedbackWidget({ label = "Was this helpful?", context = "unknown" }: Props) {
  const { data: session } = useGuildedSession();
  const [state,   setState]   = useState<State>("idle");
  const [notes,   setNotes]   = useState("");
  const [saving,  setSaving]  = useState(false);

  const persist = async (rating: number, feedbackNotes?: string) => {
    const token = session?.user?.accessToken;
    if (!token) return;
    try {
      await feedbackApi.submit({ page: context, rating, notes: feedbackNotes }, token);
    } catch { /* non-critical */ }
  };

  const handleThumb = async (positive: boolean) => {
    track("feedback_submitted", { context, positive });
    if (positive) {
      await persist(1);
      setState("done");
    } else {
      setState("feedback");
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    track("feedback_submitted", { context, positive: false, has_notes: !!notes.trim() });
    await persist(-1, notes.trim() || undefined);
    setSaving(false);
    setState("done");
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <Check size={12} /> Thank you — feedback recorded.
      </div>
    );
  }

  if (state === "feedback") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500">What could be improved? (optional)</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any detail helps us improve the experience"
          rows={2}
          className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-slate-600 resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
          >
            {saving ? "Saving…" : "Submit"}
          </button>
          <button onClick={() => setState("done")} className="text-xs text-slate-600 hover:text-slate-400">
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-slate-500">{label}</p>
      <button
        onClick={() => handleThumb(true)}
        className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-500 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
        aria-label="Helpful"
      >
        <ThumbsUp size={12} /> Yes
      </button>
      <button
        onClick={() => handleThumb(false)}
        className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-colors"
        aria-label="Not helpful"
      >
        <ThumbsDown size={12} /> No
      </button>
    </div>
  );
}
