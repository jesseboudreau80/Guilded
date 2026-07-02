"use client";

import { useState } from "react";
import { AlertCircle, X, Send, Check } from "lucide-react";
import { feedbackApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { usePathname } from "next/navigation";

const CATEGORIES = [
  { value: "bug",       label: "Something is broken"       },
  { value: "upload",    label: "Upload / PDF issue"        },
  { value: "ai_error",  label: "AI gave a wrong answer"    },
  { value: "confusing", label: "Something is confusing"    },
  { value: "other",     label: "Other feedback"            },
];

/**
 * Floating "Report Problem" button + modal.
 * Visible in the dashboard topbar. Submits to POST /api/feedback.
 */
export function ReportProblemButton() {
  const { data: session } = useGuildedSession();
  const pathname           = usePathname();

  const [open,     setOpen]     = useState(false);
  const [category, setCategory] = useState("bug");
  const [notes,    setNotes]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  const handleSubmit = async () => {
    const token = session?.user?.accessToken;
    if (!token || saving) return;
    setSaving(true);
    try {
      await feedbackApi.submit({
        page:    pathname ?? "unknown",
        rating:  -1,
        notes:   notes.trim() || undefined,
        context: { category },
      }, token);
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setNotes(""); setCategory("bug"); }, 2000);
    } catch {
      /* non-critical — close anyway */
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-800 px-2.5 py-1.5 text-xs text-slate-600 hover:border-slate-700 hover:text-slate-400 transition-colors"
        title="Report a problem"
      >
        <AlertCircle size={11} /> Report
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 top-16 z-50 mx-auto max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl md:inset-x-auto md:right-8 md:left-auto md:w-80">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={13} className="text-slate-500" />
                <p className="text-sm font-semibold text-slate-200">Report a Problem</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-300 transition-colors rounded p-1">
                <X size={14} />
              </button>
            </div>

            {done ? (
              <div className="px-4 py-8 text-center">
                <Check size={20} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-400">Report received — thank you.</p>
                <p className="text-xs text-slate-500 mt-1">We review all feedback during beta.</p>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Issue type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setCategory(value)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          category === value
                            ? "border-gold/40 bg-gold/10 text-gold"
                            : "border-slate-700 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1.5">What happened? (optional)</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Describe what you were doing and what went wrong…"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-slate-600 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-slate-700">Page: {(pathname ?? "").replace("/dashboard", "")}</p>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <Send size={11} /> {saving ? "Sending…" : "Send Report"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
