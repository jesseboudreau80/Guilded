import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Shield, Lock, Crown, CheckCircle, AlertCircle, Star } from "lucide-react";
import { getGuildedSession } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { PostCheckoutBanner } from "@/components/account/PostCheckoutBanner";

const TIER_DETAILS: Record<string, {
  label: string; color: string; border: string; bg: string;
  features: string[];
}> = {
  APPRENTICE: {
    label:   "Free Plan",
    color:   "text-slate-300",
    border:  "border-slate-700",
    bg:      "bg-slate-800/40",
    features: ["1 credit audit", "5 AI questions/month", "4 training modules", "Basic dispute templates"],
  },
  JOURNEYMAN: {
    label:   "Journeyman Plan",
    color:   "text-blue-400",
    border:  "border-blue-500/30",
    bg:      "bg-blue-900/20",
    features: ["20 AI questions/month", "Full learning modules", "Advanced dispute workflows", "Priority generation queue"],
  },
  MASTER: {
    label:   "Master Plan",
    color:   "text-gold",
    border:  "border-gold/30",
    bg:      "bg-gold/10",
    features: ["100 AI questions/month", "Arbitration strategy access", "Advanced structured workflows", "Priority AI processing"],
  },
  HERO: {
    label:   "Hero Plan",
    color:   "text-gold",
    border:  "border-gold/40",
    bg:      "bg-gold/15",
    features: ["Everything in Master", "300 AI questions/month", "Extended AI capacity", "Elite access"],
  },
};

const NEXT_TIER: Record<string, string | null> = {
  APPRENTICE: "JOURNEYMAN",
  JOURNEYMAN: "MASTER",
  MASTER:     "HERO",
  HERO:       null,
};

const NEXT_TIER_PRICE: Record<string, string> = {
  JOURNEYMAN: "$19/month",
  MASTER:     "$47/month",
  HERO:       "Contact us",
};

export default async function AccountPage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const res = await authApi.me(session.user.accessToken);
  if (!res.ok) redirect("/");

  const user = await res.json();

  const tierInfo   = TIER_DETAILS[user.tier] ?? TIER_DETAILS.APPRENTICE;
  const nextTier   = NEXT_TIER[user.tier];
  const nextLabel  = nextTier ? TIER_DETAILS[nextTier]?.label : null;
  const nextPrice  = nextTier ? NEXT_TIER_PRICE[nextTier] : null;
  const isPaid     = user.tier !== "APPRENTICE";
  const isFounder  = user.founders_pass || user.lifetime_access;

  // Normalize subscription status for display
  const statusNorm = (user.subscription_status ?? "").toUpperCase();
  const isActive   = statusNorm === "ACTIVE";
  const isPastDue  = statusNorm === "PAST_DUE";
  const isCanceled = statusNorm === "CANCELED";
  const isInactive = statusNorm === "INACTIVE" || !statusNorm;

  return (
    <section className="space-y-5">
      {/* Post-checkout success banner (useSearchParams requires Suspense) */}
      <Suspense fallback={null}>
        <PostCheckoutBanner />
      </Suspense>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Account</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your Plutus account and subscription.</p>
      </div>

      {/* ── Desktop 2-column: membership left, profile right ──────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">

      {/* ── Membership status ─────────────────────────────────────────── */}
      <div className={`rounded-2xl border px-5 py-5 ${tierInfo.border} ${tierInfo.bg}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={14} className={tierInfo.color} />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Membership</p>
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-lg font-bold ${tierInfo.color}`}>{tierInfo.label}</p>
              {isFounder && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                  <Crown size={9} /> Founding Member
                </span>
              )}
            </div>
            {isFounder ? (
              <div className="flex items-center gap-1.5 mt-1">
                <Star size={12} className="text-gold" />
                <span className="text-xs text-gold">
                  Lifetime access{user.founders_pass_type ? ` · ${user.founders_pass_type} Pass` : ""}
                </span>
              </div>
            ) : isPaid ? (
              <div className="flex items-center gap-1.5 mt-1">
                {isActive && (
                  <>
                    <CheckCircle size={12} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400">Active subscription</span>
                  </>
                )}
                {isPastDue && (
                  <>
                    <AlertCircle size={12} className="text-amber-400" />
                    <span className="text-xs text-amber-400">Payment past due — update your payment method</span>
                  </>
                )}
                {isCanceled && (
                  <>
                    <AlertCircle size={12} className="text-slate-500" />
                    <span className="text-xs text-slate-500">Subscription canceled</span>
                  </>
                )}
                {!isActive && !isPastDue && !isCanceled && !isInactive && (
                  <>
                    <AlertCircle size={12} className="text-slate-500" />
                    <span className="text-xs text-slate-500">{user.subscription_status}</span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Free tier — no payment required</p>
            )}
          </div>

          {nextTier && nextLabel && !isFounder && (
            <Link
              href="/dashboard/upgrade"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-slate-950 transition-opacity hover:opacity-90"
            >
              Upgrade to {nextLabel.split(" ")[0]}
              {nextPrice && <span className="opacity-70">· {nextPrice}</span>}
            </Link>
          )}
        </div>

        {/* Included features */}
        <div className="mt-4 pt-4 border-t border-slate-800/60">
          <p className="text-xs text-slate-600 mb-2 uppercase tracking-wide font-medium">Your plan includes</p>
          <ul className="space-y-1">
            {tierInfo.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                <Shield size={9} className={`${tierInfo.color} shrink-0`} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {isPastDue && (
          <div className="mt-4 pt-4 border-t border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400 leading-relaxed">
                Your last payment failed. To keep your subscription active, please update your payment method.
                Contact <a href="mailto:guilded@jesseboudreau.com" className="underline">guilded@jesseboudreau.com</a>.
              </p>
            </div>
          </div>
        )}

        {isFounder && (
          <div className="mt-4 pt-4 border-t border-gold/20">
            <p className="text-xs text-slate-500 leading-relaxed">
              Your Founders Pass grants permanent platform access — no renewal, no expiration.
              Questions? Contact{" "}
              <a href="mailto:guilded@jesseboudreau.com" className="text-gold hover:underline">
                guilded@jesseboudreau.com
              </a>.
            </p>
          </div>
        )}

        {isPaid && !isPastDue && !isFounder && (
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <p className="text-xs text-slate-500">
              Billing managed securely by Stripe.
              To update payment details, view invoices, or cancel, contact{" "}
              <a href="mailto:guilded@jesseboudreau.com" className="text-gold hover:underline">
                guilded@jesseboudreau.com
              </a>.
            </p>
          </div>
        )}
      </div>

      {/* ── Right column: profile / session / legal ───────────────────── */}
      <div className="space-y-5">

        {/* Profile */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Profile</p>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800">
            {[
              { label: "Name",  value: user.name  ?? "—" },
              { label: "Email", value: user.email ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-4">
                <p className="text-xs uppercase tracking-widest text-slate-500 w-20 shrink-0">{label}</p>
                <p className="text-sm text-slate-200 text-right truncate">{value}</p>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-xs uppercase tracking-widest text-slate-500 w-20 shrink-0">AI Usage</p>
              <p className="text-sm text-slate-200">
                {user.ai_usage_count} message{user.ai_usage_count !== 1 ? "s" : ""} used
              </p>
            </div>
          </div>
        </div>

        {/* Session */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Session</p>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={12} className="text-gold" />
              <p className="text-xs text-slate-400">Protected session · Encrypted in transit</p>
            </div>
            <SignOutButton />
          </div>
        </div>

        {/* Legal */}
        <div className="rounded-xl border border-slate-800/40 bg-slate-900/20 px-5 py-4">
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Plutus provides educational tools and guidance for financial recovery.
            All content is for informational purposes only — not legal or financial advice.
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link href="/terms"         className="text-slate-500 hover:text-gold transition-colors">Terms</Link>
            <Link href="/privacy"       className="text-slate-500 hover:text-gold transition-colors">Privacy</Link>
            <Link href="/security"      className="text-slate-500 hover:text-gold transition-colors">Security</Link>
            <Link href="/ai-disclaimer" className="text-slate-500 hover:text-gold transition-colors">AI Disclaimer</Link>
          </div>
        </div>

      </div>

      </div>{/* end 2-col grid */}
    </section>
  );
}
