"use client";

import { useEffect, useState } from "react";
import { Clock, ArrowRight } from "lucide-react";

/**
 * Listens for the "guilded:session-expired" custom event dispatched by
 * apiFetch() on a 401 response, and shows a gentle banner giving the
 * user 5 seconds to sign back in before the hard redirect fires.
 */
export function SessionExpiryToast() {
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    const handle = () => {
      setCountdown(5);
    };
    window.addEventListener("guilded:session-expired", handle);
    return () => window.removeEventListener("guilded:session-expired", handle);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      // Providers.tsx also listens for this event and fires the redirect.
      // This effect is just for the visual countdown.
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (countdown === null) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 px-4 w-full max-w-sm">
      <div className="rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl px-5 py-4">
        <div className="flex items-start gap-3">
          <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200">Session expired</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Signing you out in {countdown}s. Your progress is saved.
            </p>
          </div>
          <a
            href="/"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            Sign in <ArrowRight size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
