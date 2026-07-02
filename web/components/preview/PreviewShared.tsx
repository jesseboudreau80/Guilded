import Link from "next/link";
import {
  AlertTriangle, AlertCircle, CheckCircle, Circle,
  Lock, ArrowRight, BookOpen, Shield, Zap,
} from "lucide-react";
import { DEMO_JOURNEY, DEMO_MODULES, BADGE_COLORS, DEMO_RECS, DEMO_STATS } from "@/lib/demo-data";

// ── Demo badge ─────────────────────────────────────────────────────────────────

export function DemoBadge() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-2.5">
      <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse shrink-0" />
      <p className="text-xs text-slate-500 text-center">
        Sample data — representative of a real user 6 weeks into recovery.{" "}
        <Link href="/" className="text-gold hover:underline font-medium">Create your free account</Link>
        {" "}to see your real results.
      </p>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────

export function SectionHeading({ label, title, sub }: { label: string; title: string; sub?: string }) {
  return (
    <div className="text-center mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">{label}</p>
      <h2 className="text-2xl font-semibold text-slate-100 md:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">{sub}</p>}
    </div>
  );
}

// ── Risk score panel ───────────────────────────────────────────────────────────

export function RiskScorePanel({ score = 72, label = "High Risk", color = "orange" }: {
  score?: number; label?: string; color?: string;
}) {
  const colorCls = color === "orange" ? "text-orange-400" : color === "red" ? "text-red-400" : "text-emerald-400";
  const barCls   = color === "orange" ? "bg-orange-400"   : color === "red" ? "bg-red-400"   : "bg-emerald-400";
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-800/60 px-8 py-8 flex flex-col items-center">
      <p className="text-xs uppercase tracking-widest text-slate-500">Risk Score</p>
      <p className={`mt-2 text-6xl font-bold tabular-nums ${colorCls}`}>{score}</p>
      <p className={`mt-1 text-sm font-medium ${colorCls}`}>{label}</p>
      <div className="mt-4 h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-slate-700">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-3 text-xs text-slate-600">9 strategic targets identified</p>
    </div>
  );
}

// ── Stats grid ─────────────────────────────────────────────────────────────────

export function StatsGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "Risk Score",    value: `${DEMO_STATS.riskScore}`, color: "text-orange-400", sub: "High Risk"       },
        { label: "Targets Found", value: `${DEMO_STATS.targets}`,   color: "text-gold",       sub: "Recovery items"  },
        { label: "XP Earned",     value: `${DEMO_STATS.xp}`,        color: "text-gold",       sub: "Journeyman rank" },
        { label: "Accounts",      value: `${DEMO_STATS.totalAccounts}`, color: "text-slate-300", sub: "6 adverse"    },
      ].map(({ label, value, color, sub }) => (
        <div key={label} className="rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-4">
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Recommendation card ────────────────────────────────────────────────────────

export function RecCard({ title, desc, law, severity }: {
  title: string; desc: string; law?: string; severity: "high" | "medium" | "low";
}) {
  const cfg = {
    high:   { badge: "bg-red-400/10 border-red-400/30 text-red-400",      Icon: AlertTriangle },
    medium: { badge: "bg-amber-400/10 border-amber-400/30 text-amber-400", Icon: AlertCircle  },
    low:    { badge: "bg-slate-700 border-slate-600 text-slate-400",       Icon: AlertCircle  },
  }[severity];

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle size={15} className="text-gold shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.badge}`}>
              <cfg.Icon size={9} />{severity.toUpperCase()}
            </span>
            {law && (
              <span className="text-[10px] font-mono text-slate-600 border border-slate-700/60 rounded px-1.5 py-0.5">{law}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-200 leading-snug">{title}</p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

// ── Journey panel ──────────────────────────────────────────────────────────────

export function JourneyPanel() {
  const done     = DEMO_JOURNEY.filter((m) => m.done).length;
  const total    = DEMO_JOURNEY.length;
  const pct      = Math.round((done / total) * 100);
  const earnedXP = DEMO_JOURNEY.filter((m) => m.done).reduce((s, m) => s + m.xp, 0);
  const next     = DEMO_JOURNEY.find((m) => !m.done);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <Shield size={13} className="text-gold shrink-0" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recovery Journey</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Zap size={10} className="text-gold" />
            <span className="font-mono text-gold font-semibold">{earnedXP}</span>
            <span>XP</span>
          </div>
          <span className="text-xs font-mono text-slate-600">{done}/{total}</span>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-slate-800/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">{pct}% complete</span>
          <span className="text-xs text-slate-600 font-medium">Journeyman</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gold/60" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="divide-y divide-slate-800/40">
        {DEMO_JOURNEY.map((m) => (
          <div key={m.id} className={`flex items-center gap-3 px-5 py-3 ${m.done ? "opacity-60" : ""}`}>
            <div className="shrink-0">
              {m.done ? <CheckCircle size={16} className="text-emerald-400" /> : <Circle size={16} className="text-slate-700" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-snug ${m.done ? "text-slate-500 line-through decoration-slate-700" : "text-slate-200"}`}>
                {m.label}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-700 shrink-0">+{m.xp} XP</span>
          </div>
        ))}
      </div>

      {next && (
        <div className="px-5 py-3 border-t border-slate-800/60 bg-slate-800/20">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-600">Next: <span className="text-slate-400">{next.label}</span></p>
            <span className="text-xs font-semibold text-gold flex items-center gap-1">+{next.xp} XP <ArrowRight size={10} /></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Academy timeline ───────────────────────────────────────────────────────────

export function AcademyTimeline({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-0">
      {DEMO_MODULES.map((mod, i) => {
        const isLast    = i === DEMO_MODULES.length - 1;
        const badgeCls  = BADGE_COLORS[mod.badge] ?? "text-slate-400 border-slate-600";
        const showDivider = mod.n === "05";

        return (
          <div key={mod.n}>
            {showDivider && (
              <div className="flex items-center gap-3 my-4 ml-10">
                <Lock size={10} className="text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Journeyman Access Required</span>
                <div className="flex-1 h-px border-t border-blue-500/30 opacity-30" />
              </div>
            )}
            <div className="flex gap-4">
              <div className="flex flex-col items-center" style={{ width: 40 }}>
                <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  mod.done   ? "border-emerald-500 bg-emerald-500/10" :
                  mod.active ? "border-gold bg-gold/10"               :
                  mod.locked ? "border-slate-700/50 bg-transparent"   :
                               "border-slate-700 bg-transparent"
                }`}>
                  {mod.active && <span className="absolute inset-0 animate-ping rounded-full bg-gold/10" />}
                  {mod.done   ? <CheckCircle size={16} className="text-emerald-400" /> :
                   mod.active ? <span className="h-3 w-3 rounded-full bg-gold animate-pulse" /> :
                   mod.locked ? <Lock size={12} className="text-slate-700" /> :
                                <span className="font-mono text-xs font-bold text-slate-600">{mod.n}</span>}
                </div>
                {!isLast && (
                  <div className={`mt-1 w-px flex-1 ${mod.done ? "bg-emerald-500/30" : "bg-slate-800"}`}
                    style={{ minHeight: compact ? 24 : 32 }} />
                )}
              </div>

              <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : compact ? "pb-5" : "pb-8"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeCls}`}>
                      {mod.badge}
                    </span>
                    <h3 className={`mt-1.5 text-sm font-semibold leading-snug ${
                      mod.done ? "text-slate-500" : mod.locked ? "text-slate-600" : "text-slate-100"
                    }`}>
                      {mod.title}
                    </h3>
                    {!compact && (
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-700">
                        <span className="flex items-center gap-1"><BookOpen size={10} /> ~{mod.mins}m</span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {mod.locked ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-600">
                        Locked <Lock size={9} />
                      </span>
                    ) : mod.done ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-400">
                        <CheckCircle size={10} /> Complete
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        mod.active ? "bg-gold text-slate-950" : "border border-gold/30 bg-gold/10 text-gold"
                      }`}>
                        {mod.active ? "Continue →" : "Begin"}
                      </span>
                    )}
                  </div>
                </div>
                {mod.active && (
                  <div className="mt-2.5 h-0.5 max-w-xs overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gold/60" style={{ width: `${mod.progress}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Locked recs section ────────────────────────────────────────────────────────

export function LockedRecs() {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/40">
        <div className="flex items-center gap-2">
          <Lock size={12} className="text-slate-600" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            2 additional actions — Journeyman+
          </p>
        </div>
        <Link href="/" className="text-xs font-semibold text-gold hover:underline">Unlock →</Link>
      </div>
      <div className="divide-y divide-slate-800/30">
        {DEMO_RECS.locked.map((r) => (
          <div key={r.title} className="flex items-center gap-3 px-5 py-3 opacity-50">
            <Lock size={12} className="text-slate-700 shrink-0" />
            <p className="text-sm text-slate-400">{r.title}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-slate-800/40 bg-gold/5">
        <p className="text-xs text-slate-400 leading-relaxed">
          Journeyman unlocks all 2 additional actions, advanced dispute workflows, 20 AI questions per month, and bureau-specific targeting.
        </p>
        <Link href="/" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold text-gold hover:bg-gold/20 transition-colors">
          Advance to Journeyman — $25/month <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
