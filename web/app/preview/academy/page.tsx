export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle, Lock } from "lucide-react";
import { DemoBadge, AcademyTimeline } from "@/components/preview/PreviewShared";
import { DEMO_MODULES } from "@/lib/demo-data";

export const metadata = { title: "Academy Preview — Guilded" };

const MODULE_DESCRIPTIONS: Record<string, string> = {
  "01": "FCRA rights, FDCPA rights, the 7-year rule, and the 5 things every consumer must know before disputing anything.",
  "02": "How to read every section of your credit report, identify errors, decode tradeline notation, and spot re-aging.",
  "03": "How the FICO score is calculated, which factors matter most, and the fastest levers for meaningful improvement.",
  "04": "The complete dispute campaign playbook — bureau-by-bureau, letter-by-letter, from first contact to removal.",
  "05": "A month-by-month recovery blueprint covering when to dispute, when to negotiate, and how to protect new credit.",
  "06": "Monitoring strategies, identity theft response, and how to detect illegal tradeline manipulation.",
  "07": "Consumer arbitration under JAMS/AAA, arbitration clauses, and how to escalate when bureaus go silent.",
};

export default function PreviewAcademy() {
  const done  = DEMO_MODULES.filter((m) => m.done).length;
  const total = DEMO_MODULES.length;

  return (
    <main className="px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">Guild Academy</p>
          <h1 className="text-3xl font-bold text-slate-100">Seven modules. A complete recovery system.</h1>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">
            Structured training on FCRA rights, dispute tactics, collections combat, utilization strategy,
            and legal escalation — in the exact order it matters.
          </p>
          <div className="mt-5 max-w-xl mx-auto">
            <DemoBadge />
          </div>
        </div>

        {/* Progress summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Modules Complete",  value: `${done}/${total}`,  color: "text-emerald-400" },
            { label: "In Progress",        value: "1",                 color: "text-gold"         },
            { label: "Locked",             value: "3",                 color: "text-slate-500"    },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-center">
              <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Campaign path */}
        <div className="rounded-2xl border border-gold/20 bg-gold/5 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gold/10">
            <BookOpen size={13} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Recovery Campaign Path</p>
            <span className="text-xs text-slate-600 ml-1">· {done} completed · Module 02 in progress</span>
          </div>
          <div className="px-5 pb-6 pt-5">
            <AcademyTimeline />
          </div>
        </div>

        {/* Module detail cards */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">What each module covers</p>
          <div className="space-y-3">
            {DEMO_MODULES.map((mod) => (
              <div key={mod.n} className={`rounded-xl border px-4 py-3.5 flex items-start gap-4 ${
                mod.done   ? "border-emerald-500/20 bg-emerald-500/5"       :
                mod.active ? "border-gold/30 bg-gold/5"                     :
                mod.locked ? "border-slate-800/60 bg-slate-900/20 opacity-60" :
                             "border-slate-800 bg-slate-900/30"
              }`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold ${
                  mod.done   ? "border-emerald-500/40 text-emerald-400" :
                  mod.active ? "border-gold/40 text-gold"               :
                  mod.locked ? "border-slate-700 text-slate-600"        :
                               "border-slate-700 text-slate-500"
                }`}>
                  {mod.done ? <CheckCircle size={14} className="text-emerald-400" /> :
                   mod.locked ? <Lock size={12} className="text-slate-700" /> :
                   mod.n}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-200">{mod.title}</span>
                    {mod.active && <span className="text-[10px] font-semibold bg-gold text-slate-950 rounded-full px-2 py-0.5">IN PROGRESS</span>}
                    {mod.done  && <span className="text-[10px] font-semibold text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">COMPLETE</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{MODULE_DESCRIPTIONS[mod.n]}</p>
                  <p className="mt-1.5 text-[10px] text-slate-700 font-mono">~{mod.mins} min read</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity">
            Start Module 01 — Free <ArrowRight size={14} />
          </Link>
          <p className="mt-2 text-xs text-slate-600">Free Apprentice includes modules 01–04</p>
        </div>
      </div>
    </main>
  );
}
