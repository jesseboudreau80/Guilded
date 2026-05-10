"use client";

import { Shield } from "lucide-react";
import { useCounsel } from "./CounselProvider";

/**
 * Compact button for the TopBar that opens/closes the Guild Counsel drawer.
 * Shows a subtle active indicator when counsel is open.
 */
export function CounselTopBarButton() {
  const { state, toggle } = useCounsel();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle Guild Counsel"
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        state.isOpen
          ? "border-gold/40 bg-gold/10 text-gold"
          : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
      }`}
    >
      <Shield size={11} className={state.isOpen ? "text-gold" : "text-slate-500"} />
      Counsel
    </button>
  );
}
