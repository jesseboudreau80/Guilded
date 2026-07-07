export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Shield, CheckCircle, Circle, Target, Zap, Lock, BookOpen, AlertTriangle } from "lucide-react";
import { DEMO_JOURNEY, DEMO_RECS, DEMO_STATS } from "@/lib/demo-data";

export const metadata = { title: "Mobile Preview — Plutus" };

// Phone frame wrapper for each card
function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <div className="relative w-[320px] shrink-0">
        {/* Frame */}
        <div className="rounded-[2.5rem] border-2 border-slate-700 bg-slate-950 p-3 shadow-2xl shadow-slate-950/80">
          {/* Notch */}
          <div className="mx-auto mb-2 h-5 w-20 rounded-full bg-slate-900" />
          {/* Screen content */}
          <div className="rounded-[1.75rem] overflow-hidden bg-slate-950 min-h-[560px]">
            {children}
          </div>
        </div>
        {/* Bottom bar */}
        <div className="mx-auto mt-2 h-1 w-20 rounded-full bg-slate-700" />
      </div>
    </div>
  );
}

// ── Screen 1: Dashboard ────────────────────────────────────────────────────────
function MobileDashboard() {
  const done     = DEMO_JOURNEY.filter((m) => m.done).length;
  const total    = DEMO_JOURNEY.length;
  const earnedXP = DEMO_JOURNEY.filter((m) => m.done).reduce((s, m) => s + m.xp, 0);

  return (
    <div className="bg-slate-950 min-h-[560px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-gold" />
          <span className="text-sm font-bold text-white">Plutus</span>
        </div>
        <span className="text-[10px] font-semibold text-gold uppercase tracking-wide border border-gold/30 rounded-full px-2 py-0.5">Preview</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Briefing */}
        <div className="rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
            <p className="text-[11px] text-slate-300 leading-relaxed">
              3 high-priority dispute targets ready. Portfolio Recovery Associates validation letter is overdue — FDCPA §809(b).
            </p>
          </div>
        </div>

        {/* Stats 2x2 */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Risk Score",  value: `${DEMO_STATS.riskScore}`, color: "text-orange-400", sub: "High Risk"   },
            { label: "Targets",     value: `${DEMO_STATS.targets}`,   color: "text-gold",        sub: "Found"      },
            { label: "XP Earned",   value: `${earnedXP}`,             color: "text-gold",        sub: "Journeyman" },
            { label: "Accounts",    value: "14",                       color: "text-slate-300",   sub: "6 adverse"  },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-800/60 px-3 py-3">
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-[10px] text-slate-600">{sub}</p>
            </div>
          ))}
        </div>

        {/* Next action */}
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-800/80 to-slate-900 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gold mb-1">Next Action</p>
          <p className="text-sm font-semibold text-slate-100">Send Debt Validation Letter</p>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Portfolio Recovery Associates · FDCPA §809(b)
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-gold px-3 py-2 w-fit">
            <span className="text-xs font-bold text-slate-950">Generate Letter</span>
            <ArrowRight size={11} className="text-slate-950" />
          </div>
        </div>

        {/* Journey mini */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <Shield size={11} className="text-gold" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recovery Journey</p>
            </div>
            <span className="text-[10px] font-mono text-gold">{earnedXP} XP</span>
          </div>
          <div className="px-3 py-2 border-b border-slate-800/40">
            <div className="h-1 w-full rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gold/60" style={{ width: `${Math.round((done/total)*100)}%` }} />
            </div>
            <p className="text-[10px] text-slate-600 mt-1">{done}/{total} milestones</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {DEMO_JOURNEY.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2">
                {m.done ? <CheckCircle size={12} className="text-emerald-400 shrink-0" /> : <Circle size={12} className="text-slate-700 shrink-0" />}
                <p className={`text-[11px] flex-1 ${m.done ? "text-slate-600 line-through" : "text-slate-300"}`}>{m.label}</p>
                <span className="text-[10px] font-mono text-slate-700">+{m.xp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen 2: Audit Results ────────────────────────────────────────────────────
function MobileResults() {
  return (
    <div className="bg-slate-950 min-h-[560px] flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Target size={14} className="text-gold" />
        <span className="text-sm font-semibold text-slate-200">Audit Results</span>
      </div>

      <div className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {/* Risk score */}
        <div className="rounded-xl border border-slate-800 bg-slate-800/60 flex flex-col items-center py-5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Risk Score</p>
          <p className="text-5xl font-bold text-orange-400 tabular-nums mt-1">{DEMO_STATS.riskScore}</p>
          <p className="text-xs font-medium text-orange-400">High Risk</p>
          <div className="mt-3 h-1.5 w-24 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-orange-400" style={{ width: "72%" }} />
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          {[["Adverse", 6], ["Collections", 2], ["Late", 4], ["Targets", 9]].map(([label, val]) => (
            <div key={label as string} className="rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-2">
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="text-lg font-semibold text-slate-200">{val}</p>
            </div>
          ))}
        </div>

        {/* Top recs */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Start Here</p>
        {DEMO_RECS.high.slice(0, 2).map((r) => (
          <div key={r.title} className="rounded-xl border border-gold/20 bg-gold/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-semibold text-red-400 uppercase">High · {r.law}</span>
                <p className="text-[11px] font-semibold text-slate-200 mt-0.5 leading-snug">{r.title}</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed line-clamp-2">{r.desc}</p>
              </div>
            </div>
          </div>
        ))}

        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">Active Targets</p>
        {DEMO_RECS.medium.slice(0, 1).map((r) => (
          <div key={r.title} className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
            <span className="text-[10px] font-semibold text-amber-400 uppercase">Medium · {r.law}</span>
            <p className="text-[11px] font-semibold text-slate-200 mt-0.5 leading-snug">{r.title}</p>
          </div>
        ))}

        {/* Locked */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={11} className="text-slate-600" />
            <p className="text-[10px] text-slate-500">2 more — Journeyman+</p>
          </div>
          <span className="text-[10px] font-semibold text-gold">Unlock →</span>
        </div>
      </div>
    </div>
  );
}

// ── Screen 3: Academy ─────────────────────────────────────────────────────────
function MobileAcademy() {
  return (
    <div className="bg-slate-950 min-h-[560px] flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <BookOpen size={14} className="text-gold" />
        <span className="text-sm font-semibold text-slate-200">Plutus Academy</span>
      </div>

      <div className="flex-1 px-3 py-3 space-y-2 overflow-y-auto">
        <div className="rounded-xl border border-gold/20 bg-gold/5 px-3 py-2.5 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-gold uppercase tracking-wider">Recovery Path</p>
          <span className="text-[10px] text-slate-600">1 complete · Mod 02 active</span>
        </div>

        {[
          { n: "01", title: "Know Your Rights",           done: true,  active: false, locked: false },
          { n: "02", title: "Your Credit Report Decoded", done: false, active: true,  locked: false },
          { n: "03", title: "The Credit Score Machine",   done: false, active: false, locked: false },
          { n: "04", title: "The Dispute Campaign",       done: false, active: false, locked: false },
          { n: "05", title: "12-Month Recovery Blueprint",done: false, active: false, locked: true  },
          { n: "06", title: "Advanced Monitoring",        done: false, active: false, locked: true  },
          { n: "07", title: "Arbitration & Escalation",   done: false, active: false, locked: true  },
        ].map((mod) => (
          <div key={mod.n} className={`rounded-xl border px-3 py-2.5 flex items-center gap-3 ${
            mod.done   ? "border-emerald-500/20 bg-emerald-500/5" :
            mod.active ? "border-gold/30 bg-gold/5" :
            mod.locked ? "border-slate-800/40 opacity-50" :
                         "border-slate-800"
          }`}>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
              mod.done   ? "border-emerald-500/40 text-emerald-400" :
              mod.active ? "border-gold/40 text-gold" :
              mod.locked ? "border-slate-700 text-slate-600" :
                           "border-slate-700 text-slate-500"
            }`}>
              {mod.done   ? <CheckCircle size={13} className="text-emerald-400" /> :
               mod.locked ? <Lock size={11} className="text-slate-700" /> :
               mod.n}
            </div>
            <p className={`text-[11px] font-medium flex-1 ${mod.done ? "text-slate-500" : mod.locked ? "text-slate-600" : "text-slate-200"}`}>
              {mod.title}
            </p>
            {mod.active && <span className="text-[10px] font-bold bg-gold text-slate-950 rounded-full px-2 py-0.5">Active</span>}
            {mod.done   && <span className="text-[10px] text-emerald-400 font-semibold">Done</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PreviewMobile() {
  return (
    <main className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">Mobile Preview</p>
          <h1 className="text-3xl font-bold text-slate-100">Screenshot-ready mobile views</h1>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">
            Optimized for phone frames, Facebook posts, and story crops. All three core screens.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-10">
          <PhoneFrame label="Dashboard"><MobileDashboard /></PhoneFrame>
          <PhoneFrame label="Audit Results"><MobileResults /></PhoneFrame>
          <PhoneFrame label="Plutus Academy"><MobileAcademy /></PhoneFrame>
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity">
            Start Free — No Card Required <ArrowRight size={14} />
          </Link>
          <p className="mt-2 text-xs text-slate-600">Free Apprentice tier · Upgrade when ready</p>
        </div>
      </div>
    </main>
  );
}
