"use client";

import { FormEvent, useState } from "react";
import { Star, Send, Check } from "lucide-react";
import { track } from "@/lib/analytics";

type Category = "bug" | "feature" | "ux" | "content" | "other";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "bug",     label: "Bug report"       },
  { value: "feature", label: "Feature request"  },
  { value: "ux",      label: "UX feedback"      },
  { value: "content", label: "Content feedback" },
  { value: "other",   label: "Other"            },
];

/**
 * FounderFeedback — lightweight submission form for beta users.
 *
 * For MVP: opens a mailto link pre-filled with the form data.
 * Phase 4: replace with POST /api/support/feedback endpoint.
 */
export function FounderFeedback() {
  const [category, setCategory] = useState<Category>("feature");
  const [message,  setMessage]  = useState("");
  const [done,     setDone]     = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    track("feedback_submitted", { category });

    // MVP: pre-filled mailto (replace with API call in Phase 4)
    const subject = encodeURIComponent(`[Guilded Beta Feedback] ${CATEGORIES.find((c) => c.value === category)?.label}`);
    const body    = encodeURIComponent(`Category: ${category}\n\n${message}`);
    window.open(`mailto:support@guilded.finance?subject=${subject}&body=${body}`, "_blank");

    setDone(true);
    setMessage("");
  };

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <p className="text-sm font-medium text-emerald-400">Thank you for the feedback.</p>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Your input directly shapes how Guilded develops. As a founding member, your perspective matters.
        </p>
        <button
          onClick={() => setDone(false)}
          className="mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Submit another →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-5">
      <div className="flex items-center gap-2 mb-4">
        <Star size={13} className="text-gold" />
        <p className="text-sm font-semibold text-slate-200">Founding Member Feedback</p>
        <span className="ml-1 inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-xs text-gold">
          Beta
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        You&apos;re using Guilded during early access. Your feedback directly shapes the product.
        What would make your recovery experience better?
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Category */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                category === value
                  ? "border-gold/40 bg-gold/10 text-gold"
                  : "border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            category === "bug"     ? "What happened? What did you expect?" :
            category === "feature" ? "What would you like to see built?" :
            category === "ux"      ? "What felt confusing or frustrating?" :
            category === "content" ? "What content was inaccurate or unclear?" :
                                     "Tell us what's on your mind…"
          }
          rows={3}
          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-slate-600 resize-none"
          required
        />

        <button
          type="submit"
          disabled={!message.trim()}
          className="inline-flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/20 disabled:opacity-40"
        >
          <Send size={11} /> Send Feedback
        </button>
      </form>
    </div>
  );
}
