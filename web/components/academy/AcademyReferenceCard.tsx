"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowRight, Shield } from "lucide-react";
import { SIGNAL_MAP, SEVERITY_COLORS } from "@/lib/academy-intel";

type Props = {
  signalKey: string;
  /** Context label shown above the card — e.g. "Why this matters for your audit" */
  context?: string;
  /** Start expanded */
  defaultExpanded?: boolean;
};

/**
 * AcademyReferenceCard
 *
 * An expandable card that surfaces the relevant Plutus Academy module
 * for a detected audit signal. Designed for the audit results page
 * and dashboard intelligence callouts.
 *
 * Usage:
 *   <AcademyReferenceCard signalKey="has_collections" context="Collections detected" />
 */
export function AcademyReferenceCard({ signalKey, context, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const signal = SIGNAL_MAP[signalKey];
  if (!signal) return null;

  const colorClass = SEVERITY_COLORS[signal.severity];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-800/40"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Shield size={13} className="text-gold shrink-0" />
          <div className="min-w-0">
            {context && <p className="text-xs text-slate-500">{context}</p>}
            <p className="text-sm font-medium text-slate-200 truncate">
              Module {String(signal.moduleNum).padStart(2, "0")} — {signal.moduleTitle}
            </p>
          </div>
          <span className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${colorClass}`}>
            {signal.label}
          </span>
        </div>
        <span className="shrink-0 ml-2 text-slate-600">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3">
          <p className="text-xs leading-relaxed text-slate-400">{signal.insight}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            <span className="font-medium text-slate-400">Recommended action: </span>
            {signal.action}
          </p>
          <Link
            href={`/dashboard/academy/${signal.moduleSlug}`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gold/10 border border-gold/30 px-4 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Begin Training — Module {String(signal.moduleNum).padStart(2, "0")} <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}
