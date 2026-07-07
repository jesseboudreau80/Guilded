"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { SIGNAL_MAP } from "@/lib/academy-intel";

type Props = {
  /** The signal key to look up in SIGNAL_MAP */
  signalKey: string;
  /** Content to wrap — defaults to the signal label */
  children?: ReactNode;
};

/**
 * InsightTooltip
 *
 * Wraps a piece of text with a hover card explaining the concept
 * and linking to the relevant Plutus Academy module.
 *
 * Implemented with CSS-only hover (no external tooltip library).
 * The tooltip opens upward; on mobile it renders inline.
 *
 * Usage:
 *   <InsightTooltip signalKey="high_utilization">
 *     credit utilization
 *   </InsightTooltip>
 */
export function InsightTooltip({ signalKey, children }: Props) {
  const signal = SIGNAL_MAP[signalKey];
  if (!signal) return <>{children}</>;

  return (
    <span className="group relative inline-flex items-center">
      {/* Trigger text */}
      <span className="cursor-help border-b border-dashed border-gold/40 text-gold">
        {children ?? signal.label}
      </span>

      {/* Tooltip card — appears above on hover */}
      <span
        className={[
          "pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-72",
          "hidden group-hover:block",
        ].join(" ")}
        // re-enable pointer events inside so the link is clickable
        style={{ pointerEvents: "auto" }}
      >
        <span className="block rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
          <span className="block text-xs font-semibold text-slate-100">{signal.label}</span>
          <span className="mt-1.5 block text-xs leading-relaxed text-slate-400">
            {signal.insight}
          </span>
          <Link
            href={`/dashboard/academy/${signal.moduleSlug}`}
            className="mt-3 block text-xs font-medium text-gold hover:underline"
          >
            Study in Module {String(signal.moduleNum).padStart(2, "0")} — {signal.moduleTitle} →
          </Link>
        </span>
        {/* Arrow */}
        <span className="block h-2 w-4 overflow-hidden ml-3">
          <span className="block h-3 w-3 -translate-y-1.5 rotate-45 border border-slate-700 bg-slate-900" />
        </span>
      </span>
    </span>
  );
}
