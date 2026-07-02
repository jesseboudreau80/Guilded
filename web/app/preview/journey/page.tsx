export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, CheckCircle, Circle, Zap, Shield, TrendingUp } from "lucide-react";
import { DemoBadge } from "@/components/preview/PreviewShared";
import { DEMO_JOURNEY, DEMO_STATS } from "@/lib/demo-data";

export const metadata = { title: "Recovery Journey Preview — Guilded" };

const MILESTONE_DETAILS: Record<string, { desc: string; impact: string }> = {
  account:   { desc: "You joined Guilded and activated your recovery account.",                                               impact: "Foundation"         },
  audit:     { desc: "Uploaded your credit report PDF. AI extracted all accounts, balances, and derogatory items.",           impact: "+100 XP · High"     },
  verified:  { desc: "Reviewed every extracted account for accuracy. Confirmed the AI read your report correctly.",            impact: "+50 XP · Medium"    },
  results:   { desc: "Activated your personalized recovery roadmap — 9 targets identified, ranked by legal strength.",        impact: "+75 XP · High"      },
  module:    { desc: "Began Module 01: Know Your Rights. FCRA and FDCPA fundamentals — the legal foundation for everything.", impact: "+50 XP · Medium"    },
  dispute:   { desc: "Generate your first strategic dispute letter from your audit results — debt validation or FCRA dispute.",impact: "+150 XP · High"     },
  completed: { desc: "Complete all lessons in one full Academy module to build your strategic knowledge base.",                impact: "+100 XP · Medium"   },
};

export default function PreviewJourney() {
  const done     = DEMO_JOURNEY.filter((m) => m.done).length;
  const total    = DEMO_JOURNEY.length;
  const pct      = Math.round((done / total) * 100);
  const earnedXP = DEMO_JOURNEY.filter((m) => m.done).reduce((s, m) => s + m.xp, 0);
  const next     = DEMO_JOURNEY.find((m) => !m.done);

  return (
    <main className="px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">Recovery Journey</p>
          <h1 className="text-3xl font-bold text-slate-100">Milestone-driven recovery</h1>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">
            Every action you take earns XP and unlocks the next step. A structured path from first audit
            to full recovery campaign.
          </p>
          <div className="mt-5">
            <DemoBadge />
          </div>
        </div>

        {/* XP summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gold/20 bg-gold/5 px-4 py-5 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Zap size={14} className="text-gold" />
              <span className="text-2xl font-bold text-gold tabular-nums">{earnedXP}</span>
            </div>
            <p className="text-xs text-slate-500">XP earned</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield size={14} className="text-slate-400" />
              <span className="text-2xl font-bold text-slate-200 tabular-nums">{done}/{total}</span>
            </div>
            <p className="text-xs text-slate-500">Milestones done</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-2xl font-bold text-slate-200 tabular-nums">{pct}%</span>
            </div>
            <p className="text-xs text-slate-500">Complete</p>
          </div>
        </div>

        {/* Rank card */}
        <div className="rounded-2xl border border-gold/20 bg-gold/5 px-6 py-5 flex items-center gap-5">
          <div className="h-14 w-14 rounded-full border-2 border-gold/40 flex items-center justify-center shrink-0">
            <Shield size={22} className="text-gold" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Current Rank</p>
            <p className="text-xl font-bold text-gold">{DEMO_STATS.rank}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {pct}% of recovery foundation complete · {DEMO_STATS.xp} XP
            </p>
          </div>
          <div className="ml-auto hidden sm:block">
            <div className="text-right">
              <p className="text-xs text-slate-600">Next rank</p>
              <p className="text-sm font-semibold text-slate-400">Master</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">{pct}% of journey complete</span>
            <span className="text-xs text-slate-600 font-mono">{done}/{total} milestones</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gold/60 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Milestone list — detailed */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Milestone Tracker</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {DEMO_JOURNEY.map((m, i) => {
              const detail = MILESTONE_DETAILS[m.id];
              const isNext = next?.id === m.id;
              return (
                <div key={m.id} className={`px-5 py-4 ${isNext ? "bg-gold/5 border-l-2 border-gold" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {m.done
                        ? <CheckCircle size={18} className="text-emerald-400" />
                        : <Circle      size={18} className={isNext ? "text-gold" : "text-slate-700"} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${m.done ? "text-slate-500 line-through decoration-slate-700" : isNext ? "text-slate-100" : "text-slate-400"}`}>
                          {m.label}
                        </p>
                        {isNext && <span className="text-[10px] font-bold text-gold border border-gold/30 rounded-full px-2 py-0.5 bg-gold/10">NEXT ACTION</span>}
                        {m.done && <span className="text-[10px] text-emerald-400 border border-emerald-500/20 rounded-full px-1.5 py-0.5">+{m.xp} XP</span>}
                      </div>
                      {detail && (
                        <p className={`text-xs mt-1 leading-relaxed ${m.done ? "text-slate-600" : "text-slate-500"}`}>
                          {detail.desc}
                        </p>
                      )}
                      {!m.done && detail && (
                        <p className="text-[10px] text-slate-600 mt-1.5 font-mono">
                          {detail.impact}
                        </p>
                      )}
                    </div>
                    {!m.done && (
                      <span className="text-xs font-mono text-slate-600 shrink-0">+{m.xp} XP</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity">
            Start your recovery journey — Free <ArrowRight size={14} />
          </Link>
          <p className="mt-2 text-xs text-slate-600">No credit card · 5-minute setup</p>
        </div>
      </div>
    </main>
  );
}
