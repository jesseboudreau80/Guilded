import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, Lock, ExternalLink } from "lucide-react";
import { getGuildedSession } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { TierBadge } from "@/components/ui/TierBadge";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function AccountPage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const res = await authApi.me(session.user.accessToken);
  if (!res.ok) redirect("/");

  const user = await res.json();

  const isPaid = user.tier !== "APPRENTICE";
  const isActive = user.subscription_status === "active";

  return (
    <section className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Account</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your Guilded account and subscription.</p>
      </div>

      {/* ── Profile ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800">
        {[
          { label: "Name",  value: user.name  ?? "—" },
          { label: "Email", value: user.email ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-5 py-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 w-24 shrink-0">{label}</p>
            <p className="text-sm text-slate-200 text-right">{value}</p>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 w-24 shrink-0">Rank</p>
          <TierBadge tier={user.tier} />
        </div>
      </div>

      {/* ── Subscription ────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Subscription</p>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">
                {user.tier.charAt(0) + user.tier.slice(1).toLowerCase()} Plan
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {isActive ? "Active" : user.subscription_status}
              </p>
            </div>
            {isPaid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
              </span>
            ) : (
              <Link
                href="/dashboard/upgrade"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
              >
                Upgrade Plan
              </Link>
            )}
          </div>

          {isPaid && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">
                Billing is managed securely through Stripe. You can update your payment method, view invoices, or cancel your subscription from the billing portal.
              </p>
              <Link
                href="/dashboard/upgrade"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-gold transition-colors"
              >
                <ExternalLink size={11} /> Manage Billing
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Security ────────────────────────────────────────────────── */}
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

      {/* ── Legal ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/40 bg-slate-900/20 px-5 py-4">
        <p className="text-xs text-slate-500 leading-relaxed mb-3">
          Guilded provides educational tools and guidance for financial recovery. All content is for informational purposes only and does not constitute legal or financial advice.
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link href="/terms"          className="text-slate-500 hover:text-gold transition-colors">Terms of Service</Link>
          <Link href="/privacy"        className="text-slate-500 hover:text-gold transition-colors">Privacy Policy</Link>
          <Link href="/ai-disclaimer"  className="text-slate-500 hover:text-gold transition-colors">AI Disclaimer</Link>
        </div>
      </div>
    </section>
  );
}
