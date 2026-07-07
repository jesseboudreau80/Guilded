"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Crown, X } from "lucide-react";

export function PostCheckoutBanner() {
  const params  = useSearchParams();
  const router  = useRouter();
  const [show, setShow] = useState(false);
  const [kind, setKind] = useState<"subscribed" | "founders" | null>(null);

  useEffect(() => {
    if (params.get("subscribed") === "1") { setKind("subscribed"); setShow(true); }
    else if (params.get("founders") === "1") { setKind("founders"); setShow(true); }
  }, [params]);

  const dismiss = () => {
    setShow(false);
    // Clean the query param without a full navigation
    router.replace("/dashboard/account", { scroll: false });
  };

  if (!show || !kind) return null;

  return (
    <div className={`relative flex items-start gap-3 rounded-2xl border px-5 py-4 ${
      kind === "founders"
        ? "border-gold/30 bg-gold/10"
        : "border-emerald-500/30 bg-emerald-500/10"
    }`}>
      <div className={`shrink-0 mt-0.5 ${kind === "founders" ? "text-gold" : "text-emerald-400"}`}>
        {kind === "founders" ? <Crown size={16} /> : <CheckCircle size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        {kind === "founders" ? (
          <>
            <p className="text-sm font-semibold text-gold">Founders Pass activated</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Welcome to the founding cohort. You have lifetime access to Plutus.
              Thank you for your support.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-emerald-400">Subscription active</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Your plan has been upgraded. New limits and features are now available.
            </p>
          </>
        )}
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
