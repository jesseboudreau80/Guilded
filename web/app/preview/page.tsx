export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Shield, FileText, BookOpen, AlertTriangle, AlertCircle,
  CheckCircle, Circle, Lock, ArrowRight, Zap, Target,
  TrendingUp, Star, Users,
} from "lucide-react";

// ── Demo data — realistic but fictional ───────────────────────────────────────

const DEMO_JOURNEY = [
  { id: "account",    label: "Account activated",          xp: 25,  done: true  },
  { id: "audit",      label: "First credit audit",          xp: 100, done: true  },
  { id: "verified",   label: "Accounts verified",           xp: 50,  done: true  },
  { id: "results",    label: "Recovery plan activated",     xp: 75,  done: true  },
  { id: "module",     label: "Training started",            xp: 50,  done: true  },
  { id: "dispute",    label: "First dispute letter",        xp: 150, done: false },
  { id: "completed",  label: "First module completed",      xp: 100, done: false },
];

const DEMO_RECS = {
  high: [
    { title: "Validate Portfolio Recovery Associates debt",           desc: "Collector has not provided proof of ownership or right to collect. FDCPA §809(b) demands cease-and-desist until validation is provided." },
    { title: "Dispute Midland Funding charge-off — unverifiable",    desc: "Balance reported differs by $847 from original creditor records. FCRA §611 requires bureaus to investigate and remove if unverifiable." },
    { title: "Challenge Equifax re-aging — Capital One account",     desc: "Reported delinquency date suggests re-aging, extending the 7-year reporting window. Statutory violation under FCRA §605(a)." },
  ],
  medium: [
    { title: "Goodwill removal — Wells Fargo 30-day late",           desc: "Isolated late payment on 8-year positive account. Strong candidate for goodwill removal given payment history." },
    { title: "Dispute unknown inquiry — Experian",                   desc: "Hard inquiry from unrecognized creditor. Request permissible purpose disclosure under FCRA §604." },
    { title: "Correct Medical Credit Services payment status",       desc: "Account shows 'Open' despite being paid in full. Request status correction from original creditor." },
  ],
  low: [
    { title: "Reduce Capital One utilization (78%)",                 desc: "High utilization is actively suppressing your score. Target under 30% for meaningful improvement." },
  ],
  locked: [
    { title: "Initiate formal arbitration — Midland Funding",        desc: "Arbitration demand under account agreement." },
    { title: "JAMS demand — Portfolio Recovery Associates",          desc: "Consumer arbitration escalation pathway." },
  ],
};

const DEMO_MODULES = [
  { n: "01", title: "Know Your Rights",                 badge: "Foundation",  done: true,  active: false, mins: 25, locked: false },
  { n: "02", title: "Your Credit Report Decoded",       badge: "Tactical",    done: false, active: true,  mins: 30, locked: false },
  { n: "03", title: "The Credit Score Machine",         badge: "Defensive",   done: false, active: false, mins: 28, locked: false },
  { n: "04", title: "The Dispute Campaign",             badge: "Offensive",   done: false, active: false, mins: 35, locked: false },
  { n: "05", title: "12-Month Recovery Blueprint",      badge: "Growth",      done: false, active: false, mins: 32, locked: true  },
  { n: "06", title: "Advanced Monitoring & Protection", badge: "Advanced",    done: false, active: false, mins: 29, locked: true  },
  { n: "07", title: "Arbitration & Legal Escalation",   badge: "Elite",       done: false, active: false, mins: 40, locked: true  },
];

const BADGE_COLORS: Record<string, string> = {
  Foundation: "text-slate-300 border-slate-600",
  Tactical:   "text-blue-400 border-blue-500/30",
  Defensive:  "text-indigo-400 border-indigo-500/30",
  Offensive:  "text-red-400 border-red-500/30",
  Growth:     "text-emerald-400 border-emerald-500/30",
  Advanced:   "text-amber-400 border-amber-500/30",
  Elite:      "text-gold border-gold/30",
};

// ── Layout sections ────────────────────────────────────────────────────────────

function SectionHeading({ label, title, sub }: { label: string; title: string; sub?: string }) {
  return (
    <div className="text-center mb-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">{label}</p>
      <h2 className="text-2xl font-semibold text-slate-100 md:text-3xl">{title}</h2>
      {sub && <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">{sub}</p>}
    </div>
  );
}

function DemoBadge() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-2.5 text-center">
      <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse shrink-0" />
      <p className="text-xs text-slate-500">
        Preview shown with sample data.{" "}
        <Link href="/" className="text-gold hover:underline font-medium">Create your free account</Link>
        {" "}to see your real results.
      </p>
    </div>
  );
}

// ── Risk score panel ───────────────────────────────────────────────────────────

function RiskScorePanel() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-800/60 px-8 py-8 flex flex-col items-center">
      <p className="text-xs uppercase tracking-widest text-slate-500">Risk Score</p>
      <p className="mt-2 text-6xl font-bold tabular-nums text-orange-400">72</p>
      <p className="mt-1 text-sm font-medium text-orange-400">High Risk</p>
      <div className="mt-4 h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-slate-700">
        <div className="h-full rounded-full bg-orange-400" style={{ width: "72%" }} />
      </div>
    </div>
  );
}

// ── Journey widget ─────────────────────────────────────────────────────────────

function JourneyPanel() {
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
            <span>XP earned</span>
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
          <div className="h-full rounded-full bg-gold/60 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="divide-y divide-slate-800/40">
        {DEMO_JOURNEY.map((m) => (
          <div key={m.id} className={`flex items-center gap-3 px-5 py-3 ${m.done ? "opacity-60" : ""}`}>
            <div className="shrink-0">
              {m.done
                ? <CheckCircle size={16} className="text-emerald-400" />
                : <Circle      size={16} className="text-slate-700" />}
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
            <p className="text-xs text-slate-600">
              Next: <span className="text-slate-400">{next.label}</span>
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold">
              +{next.xp} XP <ArrowRight size={10} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recommendation groups ──────────────────────────────────────────────────────

function RecCard({ title, desc, severity }: { title: string; desc: string; severity: "high" | "medium" | "low" }) {
  const cfg = {
    high:   { badge: "bg-red-400/10 border-red-400/30 text-red-400",     Icon: AlertTriangle },
    medium: { badge: "bg-amber-400/10 border-amber-400/30 text-amber-400", Icon: AlertCircle  },
    low:    { badge: "bg-slate-700 border-slate-600 text-slate-400",      Icon: AlertCircle  },
  }[severity];

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle size={15} className="text-gold shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold mb-1.5 ${cfg.badge}`}>
            <cfg.Icon size={9} />{severity.toUpperCase()}
          </span>
          <p className="text-sm font-semibold text-slate-200 leading-snug">{title}</p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

// ── Academy timeline ───────────────────────────────────────────────────────────

function AcademyTimeline() {
  return (
    <div className="space-y-0">
      {DEMO_MODULES.map((mod, i) => {
        const isLast  = i === DEMO_MODULES.length - 1;
        const badgeCls = BADGE_COLORS[mod.badge] ?? "text-slate-400 border-slate-600";
        const showLockDivider = mod.n === "05";

        return (
          <div key={mod.n}>
            {showLockDivider && (
              <div className="flex items-center gap-3 my-5 ml-10">
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
                  <div className={`mt-1 w-px flex-1 transition-colors ${mod.done ? "bg-emerald-500/30" : "bg-slate-800"}`}
                    style={{ minHeight: 32 }} />
                )}
              </div>

              <div className={`flex-1 pb-8 min-w-0 ${isLast ? "pb-0" : ""}`}>
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
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-700">
                      <span className="flex items-center gap-1"><BookOpen size={10} /> ~{mod.mins}m</span>
                    </div>
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
                        mod.active
                          ? "bg-gold text-slate-950"
                          : "border border-gold/30 bg-gold/10 text-gold"
                      }`}>
                        {mod.active ? "Continue →" : "Begin"}
                      </span>
                    )}
                  </div>
                </div>
                {mod.active && (
                  <div className="mt-3 h-0.5 max-w-xs overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-[38%] rounded-full bg-gold/60" />
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

// ── Sub-route nav tiles ────────────────────────────────────────────────────────

function PreviewNav() {
  const routes = [
    { href: "/preview/dashboard", label: "Dashboard",  desc: "Command center overview"         },
    { href: "/preview/results",   label: "Results",    desc: "AI audit + recommendations"      },
    { href: "/preview/academy",   label: "Academy",    desc: "7-module recovery training"       },
    { href: "/preview/journey",   label: "Journey",    desc: "Milestone + XP tracking"          },
    { href: "/preview/mobile",    label: "Mobile",     desc: "Phone frame mockups"              },
    { href: "/preview/social",    label: "Social",     desc: "Screenshot-ready social cards"    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mt-8 max-w-3xl mx-auto">
      {routes.map(({ href, label, desc }) => (
        <Link
          key={href}
          href={href}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-gold/30 hover:bg-gold/5 transition-all px-4 py-4 group"
        >
          <p className="text-sm font-semibold text-slate-200 group-hover:text-gold transition-colors">{label}</p>
          <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
        </Link>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PreviewPage() {
  return (
    <div>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-16 text-center border-b border-slate-800/40">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent pointer-events-none" />
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold mb-5">
          <Star size={10} /> Product Preview · Sample Data
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl md:text-5xl max-w-2xl mx-auto">
          See what Guilded<br />
          <span className="text-gold">looks like inside</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-400 max-w-xl mx-auto">
          Everything below is generated from sample data — representative of a real user
          six weeks into their recovery campaign.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity"
          >
            Start Free — No Card Required <ArrowRight size={14} />
          </Link>
        </div>
        <p className="mt-3 text-xs text-slate-600">Free Apprentice access · Upgrade when ready</p>
        <PreviewNav />
      </section>

      {/* ── Panel 1: Recovery Journey + Risk Score ──────────────────────── */}
      <section className="px-6 py-16 border-b border-slate-800/40">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            label="Dashboard"
            title="Your recovery at a glance"
            sub="The dashboard tracks your full recovery journey — milestones, XP progression, audit risk, and next actions."
          />
          <DemoBadge />

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">

            {/* Left: briefing + stats */}
            <div className="space-y-4">
              {/* Tactical briefing */}
              <div className="rounded-2xl border border-slate-800 bg-slate-800/40 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Today&apos;s Briefing</p>
                    <p className="text-sm leading-relaxed text-slate-300">
                      You have 3 high-priority dispute targets ready to action. Your validation letter
                      to Portfolio Recovery Associates is overdue — collectors are required to cease
                      collection activity once you send a written validation request. This is your
                      highest-impact move this week.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Risk Score",      value: "72",   color: "text-orange-400", sub: "High Risk"       },
                  { label: "Targets Found",   value: "9",    color: "text-gold",       sub: "Recovery items"  },
                  { label: "XP Earned",       value: "300",  color: "text-gold",       sub: "Journeyman rank" },
                  { label: "Accounts",        value: "14",   color: "text-slate-300",  sub: "6 adverse"       },
                ].map(({ label, value, color, sub }) => (
                  <div key={label} className="rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-4">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Primary CTA */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-800/80 to-slate-900 p-5">
                <div className="absolute top-0 right-0 h-28 w-28 rounded-full bg-gold/5 blur-2xl pointer-events-none" />
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">Next Action</p>
                <p className="mt-1.5 text-base font-semibold text-slate-100">Send Debt Validation Letter</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Portfolio Recovery Associates has 30 days to respond — or they must stop all collection activity.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950">
                  Generate Dispute Letter <ArrowRight size={14} />
                </span>
              </div>
            </div>

            {/* Right: Journey */}
            <JourneyPanel />
          </div>
        </div>
      </section>

      {/* ── Panel 2: Audit Results ───────────────────────────────────────── */}
      <section className="px-6 py-16 border-b border-slate-800/40 bg-slate-900/20">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            label="Credit Audit"
            title="AI-generated recovery intelligence"
            sub="Upload your credit report PDF. Guilded identifies every dispute opportunity, FCRA violation, and strategic action — ranked by impact."
          />
          <DemoBadge />

          <div className="mt-8 space-y-5">

            {/* Header + risk summary */}
            <div>
              <div className="flex items-center gap-2">
                <Target size={14} className="text-gold" />
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">Recovery Intelligence Brief</p>
              </div>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">Clear path forward identified</h3>
              <p className="mt-1.5 text-sm text-slate-400 max-w-xl">
                Significant adverse items found — but every item on this list is a potential action. You now have a specific plan.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <RiskScorePanel />
              <div className="rounded-2xl border border-slate-800 bg-slate-800/60 px-6 py-5 space-y-3 sm:col-span-1 lg:col-span-2">
                <p className="text-xs uppercase tracking-widest text-slate-500">Report Intelligence</p>
                <p className="text-sm font-semibold text-slate-100">9 strategic recovery targets detected across your report</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[
                    ["Total Accounts", 14],
                    ["Adverse Items",   6],
                    ["Collections",     2],
                    ["Late Payments",   4],
                  ].map(([label, val]) => (
                    <div key={label as string} className="rounded-lg bg-slate-900/60 px-3 py-2">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-0.5 text-lg font-semibold text-slate-200">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Grouped recommendations */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-red-400">Start Here</span>
                <span className="text-xs text-slate-700">({DEMO_RECS.high.length})</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {DEMO_RECS.high.map((r) => <RecCard key={r.title} {...r} severity="high" />)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">Active Targets</span>
                <span className="text-xs text-slate-700">({DEMO_RECS.medium.length})</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {DEMO_RECS.medium.map((r) => <RecCard key={r.title} {...r} severity="medium" />)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Long-Term Improvement</span>
                <span className="text-xs text-slate-700">({DEMO_RECS.low.length})</span>
              </div>
              <div className="grid gap-2">
                {DEMO_RECS.low.map((r) => <RecCard key={r.title} {...r} severity="low" />)}
              </div>
            </div>

            {/* Locked section */}
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

            {/* Dispute generator teaser */}
            <div className="rounded-2xl border border-gold/20 bg-gold/5 px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={13} className="text-gold" />
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">Strategic Dispute Generator</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                Select your targets, choose a strategy (FCRA dispute, debt validation, goodwill, or pay-for-delete),
                target specific bureaus, and generate a personalized dispute letter framework —
                aligned with your report data and consumer protection law.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Accuracy Dispute", "Debt Validation", "Goodwill Request", "Pay-for-Delete"].map((s) => (
                  <span key={s} className={`rounded-full border px-3 py-1 text-xs font-medium ${s === "Debt Validation" ? "border-blue-500/40 bg-blue-500/10 text-blue-400" : "border-slate-700 text-slate-500"}`}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Panel 3: Academy ─────────────────────────────────────────────── */}
      <section className="px-6 py-16 border-b border-slate-800/40">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            label="Guild Academy"
            title="Seven modules. A complete recovery system."
            sub="Structured training on FCRA rights, dispute tactics, debt collections combat, utilization strategy, and long-term credit restoration."
          />
          <DemoBadge />

          <div className="mt-8 rounded-2xl border border-gold/20 bg-gold/5 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gold/10">
              <BookOpen size={13} className="text-gold" />
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">Recovery Campaign Path</p>
              <span className="text-xs text-slate-600 ml-1">· 1 completed · Module 02 in progress</span>
            </div>
            <div className="px-5 pb-6 pt-5">
              <AcademyTimeline />
            </div>
          </div>
        </div>
      </section>

      {/* ── Founder story ────────────────────────────────────────────────── */}
      <section className="px-6 py-16 border-b border-slate-800/40 bg-slate-900/20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 mb-6">
            <Shield size={22} className="text-gold" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-3">Why This Exists</p>
          <h2 className="text-2xl font-semibold text-slate-100 md:text-3xl">
            Built for the community — not to exploit it
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Guilded was built by someone who runs DIY Credit Repair 101 — a 25,000-member Facebook community
            of people navigating the credit system on their own terms. I&apos;ve watched members get misled,
            overcharged, and handed templates that don&apos;t reflect their actual situation.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Guilded is the tool I wish had existed from the start — structured, intelligent,
            transparent about what it can and can&apos;t do, and built on consumer protection law, not hype.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-4 py-2">
              <Users size={13} className="text-gold" />
              <span className="text-sm font-medium text-slate-300">25,000+ Community Members</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── What it covers ────────────────────────────────────────────────── */}
      <section className="px-6 py-16 border-b border-slate-800/40">
        <div className="mx-auto max-w-4xl">
          <SectionHeading
            label="Platform"
            title="Everything in one place"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon:  FileText,
                color: "text-blue-400",
                bg:    "border-blue-500/20 bg-blue-500/5",
                title: "Credit Audit",
                desc:  "Upload your credit report. Get a complete risk profile, account inventory, and dispute roadmap powered by AI. Full analysis in under 90 seconds.",
                tag:   "Free tier",
              },
              {
                icon:  BookOpen,
                color: "text-gold",
                bg:    "border-gold/20 bg-gold/5",
                title: "Guild Academy",
                desc:  "Seven structured modules covering FCRA rights, collections combat, dispute tactics, utilization strategy, and legal escalation.",
                tag:   "Apprentice+",
              },
              {
                icon:  TrendingUp,
                color: "text-emerald-400",
                bg:    "border-emerald-500/20 bg-emerald-500/5",
                title: "Recovery Engine",
                desc:  "XP-based progression tracking, daily missions, milestone activation, momentum scoring, and phase-aware tactical briefings.",
                tag:   "All tiers",
              },
            ].map(({ icon: Icon, color, bg, title, desc, tag }) => (
              <div key={title} className={`rounded-2xl border p-6 ${bg}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className={color} />
                  <span className="text-xs text-slate-600">{tag}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            Founding Member Access Now Open
          </div>
          <h2 className="text-3xl font-bold text-slate-100">
            Ready to see your actual results?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Start free. Upload your report. Get your real risk score, real recommendations,
            and a real dispute strategy — built around your specific situation.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-8 py-4 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity"
            >
              Create Free Account <ArrowRight size={14} />
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-600">
            Free Apprentice tier · No credit card · Upgrade when ready
          </p>

          <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4">
            <p className="text-xs font-semibold text-slate-400 mb-1">Educational Platform Notice</p>
            <p className="text-xs leading-relaxed text-slate-600">
              Guilded is an educational platform — not a credit repair company, law firm, or financial institution.
              All guidance is for informational purposes only. We teach you to use your own legal rights.
              Results vary based on individual credit profiles and bureau reporting accuracy.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
