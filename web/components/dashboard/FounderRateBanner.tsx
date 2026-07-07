"use client";

import { useState, useEffect } from "react";
import { X, Crown, ArrowRight } from "lucide-react";
import Link from "next/link";

const LS_KEY = "guilded:founder-rate-banner-dismissed";

/**
 * Founder-rate upgrade banner — shown to free (Apprentice) tier users on the
 * dashboard. Dismissed persistently via localStorage. Parent is responsible
 * for the tier check; this component only handles visibility/dismissal.
 */
export function FounderRateBanner() {
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
    <div className="relative mb-5 flex items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 to-slate-900 px-4 py-3.5 md:px-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10">
          <Crown size={14} className="text-gold" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">
            Founder rate: <span className="text-gold">$19/mo locked</span> — first 50 members only
          </p>
          <p className="text-xs text-slate-500 truncate">
            Unlimited audits, all 7 training modules, and advanced dispute tools. Rate never increases.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/dashboard/upgrade"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-2 text-xs font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Upgrade <ArrowRight size={11} />
        </Link>
        <button
          onClick={dismiss}
          className="p-1 text-slate-600 hover:text-slate-400 transition-colors"
          aria-label="Dismiss founder rate banner"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
