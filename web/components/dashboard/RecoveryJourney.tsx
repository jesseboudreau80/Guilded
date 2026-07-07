"use client";

import Link from "next/link";
import { CheckCircle, Circle, ArrowRight, Shield, Zap } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type JourneyMilestone = {
  id:      string;
  label:   string;
  desc:    string;
  done:    boolean;
  href:    string;
  cta:     string;
  xp:      number;
};

type Props = {
  milestones:  JourneyMilestone[];
  totalXP:     number;
  rank:        string;
};

// ── Component ──────────────────────────────────────────────────────────────────

export function RecoveryJourney({ milestones, totalXP, rank }: Props) {
  const done  = milestones.filter((m) => m.done).length;
  const total = milestones.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const next  = milestones.find((m) => !m.done);
  const earnedXP = milestones.filter((m) => m.done).reduce((sum, m) => sum + m.xp, 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <Shield size={13} className="text-gold shrink-0" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recovery Journey</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Zap size={10} className="text-gold" />
            <span className="font-mono text-gold font-semibold">{earnedXP}</span>
            <span>XP earned</span>
          </div>
          <span className="text-xs font-mono text-slate-600">{done}/{total}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 border-b border-slate-800/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">{pct}% complete</span>
          {rank && <span className="text-xs text-slate-600 font-medium">{rank}</span>}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gold/60 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Milestone list */}
      <div className="divide-y divide-slate-800/40">
        {milestones.map((m) => (
          <div
            key={m.id}
            className={`flex items-center gap-3 px-5 py-3 transition-colors ${
              m.done ? "opacity-60" : ""
            }`}
          >
            {/* Status icon */}
            <div className="shrink-0">
              {m.done
                ? <CheckCircle size={16} className="text-emerald-400" />
                : <Circle      size={16} className="text-slate-700" />
              }
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-snug ${m.done ? "text-slate-500 line-through decoration-slate-700" : "text-slate-200"}`}>
                {m.label}
              </p>
              {!m.done && (
                <p className="text-xs text-slate-600 mt-0.5">{m.desc}</p>
              )}
            </div>

            {/* XP badge + CTA */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono text-slate-700">+{m.xp} XP</span>
              {!m.done && (
                <Link
                  href={m.href}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                >
                  {m.cta} <ArrowRight size={9} />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Next action footer */}
      {next && (
        <div className="px-5 py-3 border-t border-slate-800/60 bg-slate-800/20">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              Next: <span className="text-slate-400">{next.label}</span>
            </p>
            <Link
              href={next.href}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline"
            >
              {next.cta} <ArrowRight size={10} />
            </Link>
          </div>
        </div>
      )}

      {/* All complete */}
      {done === total && total > 0 && (
        <div className="px-5 py-3 border-t border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <CheckCircle size={13} className="text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-400 font-medium">
              Recovery foundation complete — your journey continues.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Milestone factory ──────────────────────────────────────────────────────────

export function buildMilestones(params: {
  hasAudit:        boolean;
  hasVerifiedAudit: boolean;
  hasResults:      boolean;
  hasDispute:      boolean;
  hasModule:       boolean;
  hasCompletedMod: boolean;
  latestAuditId:   string | null;
  latestModSlug:   string | null;
}): JourneyMilestone[] {
  return [
    {
      id:    "account",
      label: "Account activated",
      desc:  "You joined Plutus",
      done:  true,        // always true — they're here
      href:  "/dashboard",
      cta:   "Done",
      xp:    25,
    },
    {
      id:    "first_audit",
      label: "First credit audit",
      desc:  "Upload your credit report PDF to identify every dispute opportunity",
      done:  params.hasAudit,
      href:  params.hasAudit && params.latestAuditId
        ? `/dashboard/audit/${params.latestAuditId}/verify`
        : "/dashboard/audit/start",
      cta:   params.hasAudit ? "Continue" : "Start audit",
      xp:    100,
    },
    {
      id:    "verified",
      label: "Accounts verified",
      desc:  "Review and confirm the accounts extracted from your report",
      done:  params.hasVerifiedAudit,
      href:  params.latestAuditId
        ? `/dashboard/audit/${params.latestAuditId}/verify`
        : "/dashboard/audit/start",
      cta:   "Verify accounts",
      xp:    50,
    },
    {
      id:    "results",
      label: "Recovery plan activated",
      desc:  "Complete your audit analysis to generate your personalized recovery roadmap",
      done:  params.hasResults,
      href:  params.latestAuditId
        ? `/dashboard/audit/${params.latestAuditId}/results`
        : "/dashboard/audit/start",
      cta:   "View results",
      xp:    75,
    },
    {
      id:    "module",
      label: "Training started",
      desc:  "Begin your first Plutus Academy module to understand your rights",
      done:  params.hasModule,
      href:  params.latestModSlug
        ? `/dashboard/academy/${params.latestModSlug}`
        : "/dashboard/academy",
      cta:   "Begin training",
      xp:    50,
    },
    {
      id:    "first_dispute",
      label: "First dispute letter generated",
      desc:  "Generate your first strategic dispute letter from your audit results",
      done:  params.hasDispute,
      href:  "/dashboard/disputes",
      cta:   "View disputes",
      xp:    150,
    },
    {
      id:    "completed_mod",
      label: "First module completed",
      desc:  "Complete a full Academy module to build your strategic knowledge base",
      done:  params.hasCompletedMod,
      href:  params.latestModSlug
        ? `/dashboard/academy/${params.latestModSlug}`
        : "/dashboard/academy",
      cta:   "Continue",
      xp:    100,
    },
  ];
}
