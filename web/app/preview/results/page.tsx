export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Shield, Target } from "lucide-react";
import {
  DemoBadge, RiskScorePanel, RecCard, LockedRecs,
} from "@/components/preview/PreviewShared";
import { DEMO_RECS, DEMO_STATS } from "@/lib/demo-data";

export const metadata = { title: "Audit Results Preview — Guilded" };

export default function PreviewResults() {
  return (
    <main className="px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">Credit Audit</p>
          <h1 className="text-3xl font-bold text-slate-100">AI-generated recovery intelligence</h1>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">
            Upload your credit report PDF. Guilded identifies every dispute opportunity, FCRA violation,
            and strategic action — ranked by impact and grounded in consumer law.
          </p>
          <div className="mt-5 max-w-xl mx-auto">
            <DemoBadge />
          </div>
        </div>

        {/* Intelligence brief header */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-5">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Recovery Intelligence Brief</p>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Clear path forward identified</h2>
          <p className="mt-1.5 text-sm text-slate-400 max-w-xl">
            Significant adverse items found — but every item on this list is a specific, actionable target.
            You now have a plan where there was none.
          </p>
        </div>

        {/* Risk + summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RiskScorePanel />
          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 px-6 py-5 space-y-4 sm:col-span-1 lg:col-span-2">
            <p className="text-xs uppercase tracking-widest text-slate-500">Report Intelligence</p>
            <p className="text-sm font-semibold text-slate-100">
              {DEMO_STATS.targets} strategic recovery targets detected across your report
            </p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                ["Total Accounts",  DEMO_STATS.totalAccounts],
                ["Adverse Items",   DEMO_STATS.adverseItems],
                ["Collections",     DEMO_STATS.collections],
                ["Late Payments",   DEMO_STATS.latePayments],
              ].map(([label, val]) => (
                <div key={label as string} className="rounded-lg bg-slate-900/60 px-3 py-2">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-0.5 text-lg font-semibold text-slate-200">{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* High priority */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-red-400">Start Here</span>
            <span className="text-[10px] font-mono rounded bg-red-400/10 text-red-400 border border-red-400/20 px-1.5 py-0.5">
              {DEMO_RECS.high.length} targets
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_RECS.high.map((r) => <RecCard key={r.title} {...r} severity="high" />)}
          </div>
        </div>

        {/* Medium */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">Active Targets</span>
            <span className="text-[10px] font-mono rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 px-1.5 py-0.5">
              {DEMO_RECS.medium.length} targets
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_RECS.medium.map((r) => <RecCard key={r.title} {...r} severity="medium" />)}
          </div>
        </div>

        {/* Low */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Long-Term Improvement</span>
            <span className="text-[10px] font-mono rounded bg-slate-700 text-slate-400 border border-slate-600 px-1.5 py-0.5">
              {DEMO_RECS.low.length} target
            </span>
          </div>
          <div className="grid gap-2">
            {DEMO_RECS.low.map((r) => <RecCard key={r.title} {...r} severity="low" />)}
          </div>
        </div>

        {/* Locked */}
        <LockedRecs />

        {/* Dispute generator teaser */}
        <div className="rounded-2xl border border-gold/20 bg-gold/5 px-6 py-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={13} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Strategic Dispute Generator</p>
          </div>
          <p className="text-sm text-slate-300 font-medium mb-1.5">Choose a target → choose a strategy → generate your letter</p>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
            Select targets from your results, choose your legal strategy, target specific bureaus,
            and generate a personalized dispute letter framework — aligned with your report data and
            consumer protection law.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Accuracy Dispute",  active: false },
              { label: "Debt Validation",   active: true  },
              { label: "Goodwill Request",  active: false },
              { label: "Pay-for-Delete",    active: false },
            ].map(({ label, active }) => (
              <span key={label} className={`rounded-full border px-3 py-1 text-xs font-medium ${
                active
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                  : "border-slate-700 text-slate-500"
              }`}>
                {label}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
            <p className="text-xs font-mono text-slate-500 mb-2">Letter preview (debt validation strategy)</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              &quot;Pursuant to the Fair Debt Collection Practices Act, 15 U.S.C. §1692g(b), I hereby
              demand that you cease all collection activity and provide complete verification of this debt,
              including the name and address of the original creditor, the amount of the debt, and
              documentation proving your right to collect...&quot;
            </p>
            <p className="mt-2 text-[10px] text-slate-600">Full letter generated in your account · Always review before sending</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity">
            Analyze your report — Start Free <ArrowRight size={14} />
          </Link>
          <p className="mt-2 text-xs text-slate-600">No credit card · Upgrade when ready</p>
        </div>
      </div>
    </main>
  );
}
