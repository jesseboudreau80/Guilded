"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { track } from "@/lib/analytics";

type Props = {
  label?:   string;
  context?: string;  // used in analytics (e.g. "audit-results", "module-page")
};

type State = "idle" | "thumbs_up" | "thumbs_down" | "feedback" | "done";

/**
 * Lightweight "Was this helpful?" widget.
 * Tracks feedback via analytics and optionally collects a brief text note.
 * No backend persistence — Phase 4 can add an endpoint.
 */
export function FeedbackWidget({ label = "Was this helpful?", context }: Props) {
  const [state,    setState]    = useState<State>("idle");
  const [feedbackText, setText] = useState("");

  const handleThumb = (positive: boolean) => {
    track(positive ? "onboarding_completed" : "onboarding_skipped", {
      context, positive,
    });
    if (positive) {
      setState("done");
    } else {
      setState("feedback");
    }
  };

  const handleSubmitFeedback = () => {
    if (feedbackText.trim()) {
      track("onboarding_skipped", { context, feedback: feedbackText.trim() });
    }
    setState("done");
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <Check size={12} /> Thank you for your feedback.
      </div>
    );
  }

  if (state === "feedback") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500">What could be improved?</p>
        <textarea
          value={feedbackText}
          onChange={(e) => setText(e.target.value)}
          placeholder="Optional — any feedback helps us improve"
          rows={2}
          className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-slate-600 resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSubmitFeedback}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Submit
          </button>
          <button
            onClick={() => setState("done")}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
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
