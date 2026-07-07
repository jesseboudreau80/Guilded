import { redirect } from "next/navigation";
import { getGuildedSession } from "@/lib/auth";
import { consultationsApi } from "@/lib/api";
import { Shield, Clock, MessageSquare, CheckCircle, Calendar } from "lucide-react";
import ConsultationCheckout from "./checkout";

const SESSION_INCLUDES = [
  "30–60 minute focused credit strategy session",
  "Review of your current Plutus audit findings",
  "Prioritized dispute and recovery action plan",
  "Answers to your specific credit questions",
  "Session notes and recommended next steps",
];

export default async function StrategySessionPage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const res = await consultationsApi.eligibility(session.user.accessToken);
  if (!res.ok) redirect("/dashboard");

  const eligibility = await res.json();
  const price = (eligibility.price / 100).toFixed(0);
  const isDiscounted = eligibility.discounted_eligible;
  const standardPrice = isDiscounted ? Math.round((eligibility.price / 100) * (4/3)) : null;

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare size={14} className="text-gold" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Strategy Session</p>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Credit Strategy Session</h1>
        <p className="mt-1.5 text-sm text-slate-400 max-w-lg">
          A focused one-on-one session to walk through your credit situation, review your audit findings,
          and build a prioritized action plan.
        </p>
      </div>

      {/* Pricing card */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">

        {/* What's included */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">What&apos;s Included</p>
          <ul className="space-y-3">
            {SESSION_INCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-300 leading-snug">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 pt-5 border-t border-slate-800">
            <div className="flex items-start gap-2">
              <Shield size={12} className="text-gold shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Sessions are conducted via video call. After booking, you&apos;ll receive
                scheduling instructions at your registered email address.
                All sessions are educational in nature and do not constitute legal advice.
              </p>
            </div>
          </div>
        </div>

        {/* Booking card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={13} className="text-slate-500" />
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Session Rate</p>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">${price}</span>
            <span className="text-sm text-slate-500">/session</span>
            {isDiscounted && standardPrice && (
              <span className="text-sm text-slate-600 line-through">${standardPrice}</span>
            )}
          </div>

          {isDiscounted && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle size={10} /> Member loyalty discount applied
            </div>
          )}

          <div className="mt-4 space-y-2 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>Discounted sessions used this year</span>
              <span className="font-medium text-slate-300">{eligibility.used_discounted_in_365_days} / 4</span>
            </div>
            {eligibility.next_eligible_date && !isDiscounted && (
              <div className="flex items-center justify-between">
                <span>Next discounted session</span>
                <span className="font-medium text-slate-300">
                  {new Date(eligibility.next_eligible_date).toLocaleDateString("en-US", {
                    month: "short", day: "numeric"
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-3">
              <Clock size={11} />
              <span>30–60 min · Video call</span>
            </div>
          </div>

          <ConsultationCheckout token={session.user.accessToken} />

          <p className="mt-3 text-xs text-slate-700 leading-relaxed">
            Payments processed securely via Stripe.
            Educational session only — not legal or financial advice.
          </p>
        </div>
      </div>
    </section>
  );
}
