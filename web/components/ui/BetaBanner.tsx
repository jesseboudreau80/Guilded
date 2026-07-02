"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare } from "lucide-react";
import Link from "next/link";

const LS_KEY = "guilded:beta-banner-dismissed";

/**
 * Beta banner — shown once per session during beta.
 * Dismissed persistently via localStorage.
 * Rendered at the top of the dashboard layout.
 */
export function BetaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(LS_KEY)) setVisible(true);
    } catch { /* ignore */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(LS_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative flex items-center justify-between gap-3 border-b border-gold/20 bg-gold/5 px-4 py-2.5 md:px-8">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold uppercase tracking-widest shrink-0">
          Beta
        </span>
        <p className="text-xs text-slate-400 truncate">
          You&apos;re in early access.{" "}
          <span className="hidden sm:inline">Found a bug or have feedback? </span>
          <Link href="/dashboard/support" className="text-gold hover:underline" onClick={dismiss}>
            Let us know
          </Link>
          .
        </p>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors p-1"
        aria-label="Dismiss beta banner"
      >
        <X size={12} />
      </button>
    </div>
  );
}
