export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Shield, Zap, CheckCircle, ArrowRight, BookOpen,
  Lock, Star, TrendingUp, Users, AlertTriangle,
} from "lucide-react";

export const metadata = { title: "Social Assets Preview — Plutus" };

// All cards are 1:1 square or 4:5 portrait — optimized for Facebook/Instagram

// ── XP Milestone Card ─────────────────────────────────────────────────────────
function XPMilestoneCard() {
  return (
    <div className="w-[320px] h-[320px] rounded-2xl border border-gold/30 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 overflow-hidden relative">
      <div className="absolute inset-0 bg-gold/5 blur-3xl" />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-8 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold/40 bg-gold/10">
          <Zap size={28} className="text-gold" />
        </div>
        <div>
          <p className="text-4xl font-bold text-gold tabular-nums">300 XP</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">Journeyman Rank Achieved</p>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            5 of 7 recovery milestones complete
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-4 py-2">
          <Shield size={12} className="text-gold" />
          <span className="text-xs font-semibold text-gold">Plutus · Credit Recovery</span>
        </div>
      </div>
    </div>
  );
}

// ── Audit Completion Card ─────────────────────────────────────────────────────
function AuditCompletionCard() {
  return (
    <div className="w-[320px] h-[320px] rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden relative">
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-orange-400/10 blur-2xl" />
      <div className="relative h-full flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} className="text-gold" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">Credit Audit Complete</span>
          </div>
          <p className="text-5xl font-bold text-orange-400 tabular-nums">72</p>
          <p className="text-sm font-medium text-orange-400 mt-0.5">Risk Score · High Risk</p>
          <div className="mt-3 h-2 w-28 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full w-[72%] rounded-full bg-orange-400" />
          </div>
        </div>
        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[["9", "Targets"], ["6", "Adverse"], ["2", "Collections"]].map(([v, l]) => (
              <div key={l} className="text-center">
                <p className="text-lg font-bold text-slate-200 tabular-nums">{v}</p>
                <p className="text-[10px] text-slate-600">{l}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gold/10 border border-gold/20 px-3 py-2">
            <AlertTriangle size={11} className="text-gold" />
            <p className="text-xs text-slate-300">Recovery roadmap activated</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Module Completion Card ────────────────────────────────────────────────────
function ModuleCompletionCard() {
  return (
    <div className="w-[320px] h-[320px] rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-slate-950 overflow-hidden relative">
      <div className="relative h-full flex flex-col items-center justify-center text-center px-7 gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10">
          <CheckCircle size={26} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">Module Completed</p>
          <p className="text-xl font-bold text-slate-100 leading-snug">Know Your Rights</p>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            FCRA · FDCPA · 7-year rule · Consumer protection fundamentals
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-1">
            <Zap size={11} className="text-gold" />
            <span className="text-xs font-semibold text-gold">+100 XP earned</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
          <BookOpen size={11} className="text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Plutus Academy · Foundation</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1">
          <Shield size={11} className="text-gold" />
          <span className="text-[10px] font-semibold text-slate-500">Plutus</span>
        </div>
      </div>
    </div>
  );
}

// ── Recovery Journey Card ─────────────────────────────────────────────────────
function RecoveryJourneyCard() {
  const milestones = [
    { label: "Account activated",     done: true  },
    { label: "First credit audit",     done: true  },
    { label: "Accounts verified",      done: true  },
    { label: "Recovery plan activated",done: true  },
    { label: "Training started",       done: true  },
    { label: "First dispute letter",   done: false },
    { label: "First module completed", done: false },
  ];
  const done = milestones.filter(m => m.done).length;
  const pct  = Math.round((done / milestones.length) * 100);

  return (
    <div className="w-[320px] h-[380px] rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recovery Journey</p>
          </div>
          <span className="text-xs font-mono text-gold">300 XP</span>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500">{pct}% complete</span>
            <span className="text-[10px] text-slate-600">Journeyman</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-gold/60" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="divide-y divide-slate-800/40">
        {milestones.map((m) => (
          <div key={m.label} className="flex items-center gap-3 px-5 py-2.5">
            {m.done ? <CheckCircle size={14} className="text-emerald-400 shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-slate-700 shrink-0" />}
            <p className={`text-xs ${m.done ? "text-slate-600 line-through" : "text-slate-300"}`}>{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Educational Law Card ──────────────────────────────────────────────────────
function LawEducationCard({ statute, title, body }: { statute: string; title: string; body: string }) {
  return (
    <div className="w-[320px] rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-slate-950 overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-mono font-semibold text-blue-400 mb-3">
          {statute}
        </span>
        <h3 className="text-base font-bold text-slate-100 leading-snug">{title}</h3>
        <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">{body}</p>
      </div>
      <div className="border-t border-slate-800/60 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield size={11} className="text-gold" />
          <span className="text-[10px] font-semibold text-slate-500">Plutus</span>
        </div>
        <span className="text-[10px] text-slate-600">Educational · Not legal advice</span>
      </div>
    </div>
  );
}

// ── Founder Story Card ────────────────────────────────────────────────────────
function FounderCard() {
  return (
    <div className="w-[320px] rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center">
            <Shield size={15} className="text-gold" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">Jesse Boudreau</p>
            <p className="text-[10px] text-slate-500">Founder · DIY Credit Repair 101</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          &quot;I built Plutus for the community I&apos;ve been running for years — 25,000 people navigating
          the credit system on their own terms. You deserve real tools, not templates.&quot;
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Users size={12} className="text-gold" />
          <span className="text-xs font-medium text-slate-400">25,000+ community members</span>
        </div>
      </div>
      <div className="border-t border-slate-800 px-6 py-3 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-1.5">
          <Shield size={11} className="text-gold" />
          <span className="text-xs font-bold text-white">Plutus</span>
        </div>
        <span className="text-[10px] text-slate-600">Credit Recovery · Educational</span>
      </div>
    </div>
  );
}

// ── Dispute Strategy Card ─────────────────────────────────────────────────────
function DisputeStrategyCard() {
  return (
    <div className="w-[320px] rounded-2xl border border-gold/20 bg-gold/5 overflow-hidden">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={13} className="text-gold" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Dispute Strategy</p>
        </div>
        <h3 className="text-base font-bold text-slate-100 leading-snug mb-3">
          Debt Validation Letter — Portfolio Recovery Associates
        </h3>
        <div className="space-y-2">
          {[
            { label: "Legal basis",    value: "FDCPA §809(b)"            },
            { label: "Target",         value: "Portfolio Recovery Assoc." },
            { label: "Strategy",       value: "Validation demand"         },
            { label: "Bureau",         value: "Experian, Equifax"         },
            { label: "Strength",       value: "Strong"                    },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
              <span className="text-[10px] text-slate-500">{label}</span>
              <span className="text-[10px] font-semibold text-slate-200">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            &quot;Pursuant to FDCPA §809(b), I demand you cease all collection activity and provide written verification of this debt...&quot;
          </p>
        </div>
      </div>
      <div className="border-t border-slate-800 px-5 py-2.5 flex items-center gap-1.5">
        <Shield size={10} className="text-gold" />
        <span className="text-[10px] font-semibold text-slate-500">Plutus · Strategic Dispute Generator</span>
      </div>
    </div>
  );
}

// ── Trust / Transparency Card ─────────────────────────────────────────────────
function TransparencyCard() {
  return (
    <div className="w-[320px] rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Star size={13} className="text-gold" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">What Plutus Is Not</p>
        </div>
        <div className="space-y-2.5">
          {[
            { label: "Not a credit repair company",    desc: "We teach you to use your own rights"   },
            { label: "Not a law firm",                 desc: "Educational guidance, not legal advice" },
            { label: "Not a score guarantee",          desc: "Results depend on your specific report" },
            { label: "Not a template mill",            desc: "Every recommendation is personalized"   },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-start gap-2.5 rounded-lg bg-slate-800/40 px-3 py-2.5">
              <TrendingUp size={12} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-200">{label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-800 px-5 py-3 flex items-center gap-1.5">
        <Shield size={10} className="text-gold" />
        <span className="text-[10px] font-semibold text-slate-500">Plutus · Transparent by design</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PreviewSocial() {
  return (
    <main className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">Social Assets</p>
          <h1 className="text-3xl font-bold text-slate-100">Screenshot-ready social cards</h1>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">
            Each card is designed for Facebook posts, carousels, and story crops.
            Screenshot at 2× for crisp social posts.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">

          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">XP Milestone</p>
            <XPMilestoneCard />
          </div>

          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Audit Completion</p>
            <AuditCompletionCard />
          </div>

          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Module Completed</p>
            <ModuleCompletionCard />
          </div>

          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Recovery Journey</p>
            <RecoveryJourneyCard />
          </div>

          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Law Explainer — FDCPA</p>
            <LawEducationCard
              statute="FDCPA §809(b)"
              title="The right that stops collectors in their tracks"
              body="If a debt collector contacts you, you have the right to demand written verification. Once you send a validation request in writing, they must cease ALL collection activity until they provide proof of the debt. Most collectors can't — and the account often disappears."
            />
          </div>

          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Law Explainer — FCRA</p>
            <LawEducationCard
              statute="FCRA §611"
              title="Your right to dispute anything unverifiable"
              body="Under FCRA §611, you can dispute any item on your credit report that is inaccurate, incomplete, or cannot be verified. Bureaus have 30 days to investigate. If they can't verify it — they must remove it. This applies to balances, dates, payment status, and creditor names."
            />
          </div>

          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Dispute Strategy</p>
            <DisputeStrategyCard />
          </div>

          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Founder Story</p>
            <FounderCard />
          </div>

          <div className="flex flex-col gap-2 items-center">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Transparency</p>
            <TransparencyCard />
          </div>

        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity">
            Create your free account <ArrowRight size={14} />
          </Link>
          <p className="mt-2 text-xs text-slate-600">Free Apprentice tier · No credit card</p>
        </div>
      </div>
    </main>
  );
}
