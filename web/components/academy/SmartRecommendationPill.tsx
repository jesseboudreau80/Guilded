"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react";
import { SIGNAL_MAP, SEVERITY_COLORS, type AcademySignal } from "@/lib/academy-intel";

const SEVERITY_ICONS = {
  critical: AlertTriangle,
  high:     AlertCircle,
  medium:   Info,
  low:      Info,
};

type Props = {
  signalKey: string;
  /** Show the module link alongside the pill */
  showModule?: boolean;
  /** Compact mode — icon only + label, no module link */
  compact?: boolean;
};

/**
 * SmartRecommendationPill
 *
 * Renders a colored severity pill for a detected audit signal.
 * Clicking navigates to the relevant Plutus Academy module.
 *
 * Usage:
 *   <SmartRecommendationPill signalKey="has_collections" showModule />
 *   <SmartRecommendationPill signalKey="high_utilization" compact />
 */
export function SmartRecommendationPill({ signalKey, showModule = false, compact = false }: Props) {
  const signal: AcademySignal | undefined = SIGNAL_MAP[signalKey];
  if (!signal) return null;

  const Icon       = SEVERITY_ICONS[signal.severity];
  const colorClass = SEVERITY_COLORS[signal.severity];

  if (compact) {
    return (
      <Link
        href={`/dashboard/academy/${signal.moduleSlug}`}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${colorClass}`}
        title={signal.insight}
      >
        <Icon size={10} />
        {signal.label}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Link
        href={`/dashboard/academy/${signal.moduleSlug}`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${colorClass}`}
      >
        <Icon size={11} />
        {signal.label}
      </Link>
      {showModule && (
        <Link
          href={`/dashboard/academy/${signal.moduleSlug}`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-gold transition-colors"
        >
          Study in Module {String(signal.moduleNum).padStart(2, "0")} — {signal.moduleTitle}
          <ArrowRight size={10} />
        </Link>
      )}
    </div>
  );
}
