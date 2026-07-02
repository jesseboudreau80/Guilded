export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Shield, Target, Zap, BookOpen, FileText, AlertTriangle } from "lucide-react";
import { DemoBadge, JourneyPanel, StatsGrid, RiskScorePanel } from "@/components/preview/PreviewShared";
import { DEMO_BRIEFING, DEMO_RECS } from "@/lib/demo-data";

export const metadata = { title: "Dashboard Preview — Guilded" };

export default function PreviewDashboard() {
  return (
    <main className="px-4 py-12">
      <div className="mx-auto max-w-6xl space-y-10">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">Dashboard</p>
          <h1 className="text-3xl font-bold text-slate-100">Your recovery command center</h1>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">
            Everything visible at once — risk score, targets, XP progression, and today&apos;s highest-impact action.
          </p>
          <div className="mt-5 max-w-xl mx-auto">
            <DemoBadge />
          </div>
        </div>

        {/* Tactical briefing */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/40 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Today&apos;s Briefing</p>
              <p className="text-sm leading-relaxed text-slate-300">{DEMO_BRIEFING}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsGrid />

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* Left column */}
          <div className="space-y-5">

            {/* Risk + accounts */}
            <div className="grid gap-4 sm:grid-cols-2">
              <RiskScorePanel />

              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 px-6 py-5 space-y-4">
                <p className="text-xs uppercase tracking-widest text-slate-500">Account Summary</p>
                <div className="space-y-2.5">
                  {[
                    { label: "Total Accounts",  value: 14, color: "text-slate-300" },
                    { label: "Adverse Items",    value: 6,  color: "text-orange-400" },
                    { label: "Collections",      value: 2,  color: "text-red-400"    },
                    { label: "Late Payments",    value: 4,  color: "text-amber-400"  },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Next action card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-800/80 to-slate-900 p-6">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gold/5 blur-2xl pointer-events-none" />
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">Highest Impact — Act Now</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-100">Send Debt Validation Letter</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                Portfolio Recovery Associates must cease all collection activity upon receiving a written
                validation request under FDCPA §809(b). They have 30 days to respond — or they must stop.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950">
                  Generate Dispute Letter <ArrowRight size={14} />
                </span>
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <AlertTriangle size={10} /> High priority
                </span>
              </div>
            </div>

            {/* Quick wins */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Other Open Targets</p>
              <div className="space-y-3">
                {DEMO_RECS.medium.slice(0, 2).map((r) => (
                  <div key={r.title} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                    <Target size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 leading-snug">{r.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5 font-mono">{r.law}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature tiles */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: FileText, color: "text-blue-400",    bg: "border-blue-500/20 bg-blue-500/5",   label: "Credit Audit",    tag: "9 targets" },
                { icon: BookOpen, color: "text-gold",         bg: "border-gold/20 bg-gold/5",           label: "Guild Academy",   tag: "Mod 02 active" },
                { icon: Zap,      color: "text-emerald-400",  bg: "border-emerald-500/20 bg-emerald-5/5", label: "Recovery XP",   tag: "300 earned" },
              ].map(({ icon: Icon, color, bg, label, tag }) => (
                <div key={label} className={`rounded-2xl border p-4 ${bg}`}>
                  <Icon size={16} className={`${color} mb-2`} />
                  <p className="text-xs font-semibold text-slate-300">{label}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{tag}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Journey */}
          <div className="space-y-4">
            <JourneyPanel />
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="text-slate-400 font-medium">300 XP earned</span> · Journeyman rank · 2 milestones remaining to complete your recovery foundation.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity">
            See your real results — Start Free <ArrowRight size={14} />
          </Link>
          <p className="mt-2 text-xs text-slate-600">No credit card · Free Apprentice tier</p>
        </div>
      </div>
    </main>
  );
}
