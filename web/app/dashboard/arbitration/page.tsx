import Link from "next/link";
import { redirect } from "next/navigation";
import { getGuildedSession } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { Shield, Lock, ChevronRight, BookOpen, Scale, CheckCircle } from "lucide-react";

const ARBITRATION_HIGHLIGHTS = [
  "How consumer arbitration clauses work — and how to use them",
  "Reading creditor arbitration agreements for leverage points",
  "Filing with JAMS and AAA — step-by-step process",
  "Pre-dispute demand strategy that resolves most cases before filing",
  "Settlement negotiation and pay-for-delete tactics",
];

export default async function ArbitrationPage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const res = await authApi.me(session.user.accessToken);
  if (!res.ok) redirect("/");

  const user = await res.json();
  const isMaster = user.tier === "MASTER" || user.tier === "HERO" || user.lifetime_access;

  if (isMaster) {
    // Master+ users: forward directly to the academy module
    redirect("/dashboard/academy/mastering-debt-arbitration");
  }

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Scale size={14} className="text-slate-500" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Advanced Strategy</p>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Debt Arbitration</h1>
        <p className="mt-1.5 text-sm text-slate-400 max-w-lg">
          Consumer arbitration is one of the most powerful tools available to an informed credit consumer —
          and one of the least understood. This module teaches you how to use it.
        </p>
      </div>

      {/* What's inside preview */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-0.5">
            <BookOpen size={14} className="text-gold" />
            <p className="text-sm font-semibold text-slate-100">Module 7 · Mastering Debt Arbitration</p>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">5 lessons · 90 minutes · Elite Badge</p>
        </div>

        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">What you&apos;ll learn</p>
          <ul className="space-y-2.5">
            {ARBITRATION_HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle size={13} className="text-slate-700 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-500 leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Blurred content preview */}
        <div className="relative px-6 pb-6">
          <div className="space-y-2.5 blur-[3px] select-none pointer-events-none" aria-hidden="true">
            <div className="h-3.5 rounded bg-slate-800 w-full" />
            <div className="h-3.5 rounded bg-slate-800 w-5/6" />
            <div className="h-3.5 rounded bg-slate-800 w-4/5" />
            <div className="h-3.5 rounded bg-slate-800 w-full" />
            <div className="h-3.5 rounded bg-slate-800 w-3/4" />
          </div>

          {/* Lock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/90 px-8 py-6 text-center shadow-xl">
              <div className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Lock size={18} className="text-slate-500" />
              </div>
              <p className="text-sm font-semibold text-slate-200">Master Rank Required</p>
              <p className="mt-1 text-xs text-slate-500 max-w-[200px]">
                Advance to Master to unlock arbitration strategy training.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="rounded-xl border border-gold/20 bg-gold/5 px-5 py-5">
        <div className="flex items-start gap-3 sm:items-center sm:flex-row flex-col">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={13} className="text-gold" />
              <p className="text-xs font-semibold text-gold uppercase tracking-widest">Unlock Advanced Strategy</p>
            </div>
            <p className="text-sm text-slate-300">
              Master rank unlocks arbitration training, advanced dispute workflows, and 100 AI questions per month.
            </p>
          </div>
          <Link
            href="/dashboard/upgrade"
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity"
          >
            Advance to Master <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Educational disclaimer */}
      <p className="text-xs text-slate-700 leading-relaxed">
        Arbitration content is educational only and does not constitute legal advice.
        Complex legal situations may require consultation with a consumer protection attorney.
        Plutus Counsel AI can provide educational context but is not a substitute for licensed legal representation.
      </p>
    </section>
  );
}
