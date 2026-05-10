"use client";

import { X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
};

const TIERS = [
  {
    key:      "JOURNEYMAN",
    label:    "Journeyman",
    price:    "$19/mo",
    features: "20 structured tools · Full modules",
  },
  {
    key:      "MASTER",
    label:    "Master",
    price:    "$47/mo",
    features: "100 structured tools · Arbitration",
  },
];

const NEXT_TIER: Record<string, string> = {
  APPRENTICE: "Journeyman",
  JOURNEYMAN: "Master",
  MASTER:     "Master",
};

export function UpgradeModal({ isOpen, onClose, currentTier }: Props) {
  if (!isOpen) return null;

  const nextLabel = NEXT_TIER[currentTier ?? ""] ?? "Journeyman";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg animate-scale-in rounded-2xl border border-slate-700 bg-card p-5 shadow-2xl md:p-8">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-slate-500 transition-colors hover:text-slate-300"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
          Advance Your Rank
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Additional structured tools unlock immediately upon advancing.
        </p>

        <div className="mt-5 space-y-2">
          {TIERS.map((t) => (
            <div
              key={t.key}
              className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">{t.label}</p>
                <p className="text-xs text-slate-400">{t.features}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-gold">{t.price}</span>
            </div>
          ))}
        </div>

        <a
          href="/dashboard/upgrade"
          onClick={onClose}
          className="mt-5 block w-full rounded-xl bg-gold py-3 text-center text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Advance to {nextLabel}
        </a>
      </div>
    </div>
  );
}
