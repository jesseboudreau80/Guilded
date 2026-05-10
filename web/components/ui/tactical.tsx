/**
 * Tactical Design System — Guilded Recovery OS
 *
 * Reusable UI primitives that give every dashboard screen
 * a consistent visual language. All components are purely presentational.
 *
 * Components:
 *   TacticalPanel       - base card with optional accent styling
 *   SectionHeader       - label + divider row
 *   StrategicAlert      - gold-left-accent callout for CTAs and notices
 *   RecoveryPhaseTag    - phase indicator chip
 *   ProtectionDot       - status dot + label
 *   MomentumBadge       - momentum tier display
 *   EmptyRecoveryState  - guided empty state with icon + direction
 *   TimelineRow         - single row in a recovery timeline
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { Shield, ChevronRight, type LucideIcon } from "lucide-react";
import {
  PHASE_LABELS,
  type RecoveryPhase,
  type ProtectionStatus,
  type MomentumState,
} from "@/lib/recovery-engine";

// ── TacticalPanel ─────────────────────────────────────────────────────────────

type TacticalPanelProps = {
  children:  ReactNode;
  className?: string;
  /** Accent variant — changes border + background tone */
  accent?:   "default" | "gold" | "emerald" | "amber" | "blue";
  /** Removes padding for when the child handles its own padding */
  noPad?:    boolean;
};

const PANEL_ACCENTS = {
  default: "border-slate-800 bg-slate-900/50",
  gold:    "border-gold/20 bg-gold/5",
  emerald: "border-emerald-500/20 bg-emerald-500/5",
  amber:   "border-amber-500/20 bg-amber-500/5",
  blue:    "border-blue-500/20 bg-blue-500/5",
};

export function TacticalPanel({ children, className = "", accent = "default", noPad }: TacticalPanelProps) {
  return (
    <div className={`rounded-xl border overflow-hidden ${PANEL_ACCENTS[accent]} ${noPad ? "" : "px-5 py-4"} ${className}`}>
      {children}
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

type SectionHeaderProps = {
  label:     string;
  count?:    number | string;
  action?:   { label: string; href: string };
};

export function SectionHeader({ label, count, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 shrink-0">
        {label}
      </p>
      <div className="h-px flex-1 bg-slate-800" />
      {count !== undefined && (
        <span className="text-xs text-slate-600 shrink-0">{count}</span>
      )}
      {action && (
        <Link href={action.href} className="text-xs text-slate-500 hover:text-gold transition-colors shrink-0 flex items-center gap-0.5">
          {action.label} <ChevronRight size={10} />
        </Link>
      )}
    </div>
  );
}

// ── StrategicAlert ────────────────────────────────────────────────────────────

type StrategicAlertProps = {
  title:    string;
  message:  string;
  href?:    string;
  cta?:     string;
  accent?:  "gold" | "emerald" | "amber" | "blue";
};

const ALERT_STYLES = {
  gold:    { bar: "bg-gold",            border: "border-gold/20",          bg: "bg-gold/5",           text: "text-gold",           cta: "border-gold/40 text-gold hover:bg-gold/10" },
  emerald: { bar: "bg-emerald-500",     border: "border-emerald-500/20",   bg: "bg-emerald-500/5",    text: "text-emerald-400",    cta: "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" },
  amber:   { bar: "bg-amber-400",       border: "border-amber-500/20",     bg: "bg-amber-500/5",      text: "text-amber-400",      cta: "border-amber-500/40 text-amber-400 hover:bg-amber-500/10" },
  blue:    { bar: "bg-blue-400",        border: "border-blue-500/20",      bg: "bg-blue-500/5",       text: "text-blue-400",       cta: "border-blue-500/40 text-blue-400 hover:bg-blue-500/10" },
};

export function StrategicAlert({ title, message, href, cta, accent = "gold" }: StrategicAlertProps) {
  const s = ALERT_STYLES[accent];
  return (
    <div className={`relative overflow-hidden rounded-xl border py-4 pl-6 pr-5 ${s.border} ${s.bg}`}>
      <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-xl ${s.bar}`} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`text-sm font-semibold ${s.text}`}>{title}</p>
          <p className="mt-0.5 text-xs text-slate-400 leading-snug">{message}</p>
        </div>
        {href && cta && (
          <Link href={href} className={`shrink-0 self-start inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:self-auto ${s.cta}`}>
            {cta} <ChevronRight size={11} />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── RecoveryPhaseTag ──────────────────────────────────────────────────────────

const PHASE_STYLES: Record<RecoveryPhase, string> = {
  assessment:           "border-slate-700 bg-slate-800/60 text-slate-400",
  stabilization:        "border-blue-500/30 bg-blue-900/20 text-blue-400",
  active_dispute:       "border-amber-500/30 bg-amber-900/20 text-amber-400",
  momentum_building:    "border-gold/30 bg-gold/10 text-gold",
  long_term_restoration:"border-emerald-500/30 bg-emerald-900/20 text-emerald-400",
};

export function RecoveryPhaseTag({ phase }: { phase: RecoveryPhase }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${PHASE_STYLES[phase]}`}>
      <Shield size={9} />
      {PHASE_LABELS[phase]}
    </span>
  );
}

// ── ProtectionDot ─────────────────────────────────────────────────────────────

export function ProtectionDot({ status }: { status: ProtectionStatus }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 ${status.border} ${status.bg}`}>
      <div className={`h-2 w-2 rounded-full shrink-0 ${status.dot}`} />
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${status.text}`}>{status.label}</p>
        <p className="mt-0.5 text-xs text-slate-500 leading-snug truncate">{status.message}</p>
      </div>
    </div>
  );
}

// ── MomentumBadge ─────────────────────────────────────────────────────────────

const MOMENTUM_STYLES = {
  strong:   "text-gold",
  building: "text-amber-400/80",
  starting: "text-slate-400",
  inactive: "text-slate-600",
};

export function MomentumBadge({ momentum }: { momentum: MomentumState }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
      <div className={`h-1.5 w-1.5 rounded-full ${momentum.isActive ? "bg-gold animate-pulse" : "bg-slate-700"} shrink-0`} />
      <div>
        <p className={`text-xs font-semibold ${MOMENTUM_STYLES[momentum.tier]}`}>{momentum.label}</p>
        <p className="mt-0.5 text-xs text-slate-500 leading-snug">{momentum.description}</p>
      </div>
    </div>
  );
}

// ── EmptyRecoveryState ────────────────────────────────────────────────────────

type EmptyRecoveryStateProps = {
  icon:    LucideIcon;
  title:   string;
  message: string;
  cta?:    string;
  href?:   string;
};

export function EmptyRecoveryState({ icon: Icon, title, message, cta, href }: EmptyRecoveryStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 px-6 py-12 text-center">
      <div className="h-11 w-11 rounded-2xl border border-slate-700 bg-slate-800/60 flex items-center justify-center mb-4">
        <Icon size={20} className="text-slate-500" />
      </div>
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 max-w-xs">{message}</p>
      {cta && href && (
        <Link href={href} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90">
          {cta} <ChevronRight size={13} />
        </Link>
      )}
    </div>
  );
}

// ── TimelineRow ───────────────────────────────────────────────────────────────

const TIMELINE_ICON_STYLES: Record<string, string> = {
  module:  "text-gold",
  audit:   "text-blue-400",
  dispute: "text-purple-400",
  xp:      "text-slate-400",
  rank:    "text-emerald-400",
};

export function TimelineRow({
  kind, label, date, icon: Icon,
}: {
  kind:  string;
  label: string;
  date:  string;
  icon:  LucideIcon;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60">
        <Icon size={13} className={TIMELINE_ICON_STYLES[kind] ?? "text-slate-400"} />
      </div>
      <p className="flex-1 min-w-0 text-sm text-slate-300 leading-snug truncate">{label}</p>
      <span className="shrink-0 text-xs text-slate-600">{date}</span>
    </div>
  );
}
