"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, Check, Crown, Lock, Tag, Star } from "lucide-react";
import { CheckoutButton } from "@/components/ui/CheckoutButton";
import { FoundersPassButton } from "@/components/ui/FoundersPassButton";
import { useGuildedSession } from "@/lib/session";
import { authApi } from "@/lib/api";
import { AI_LIMITS, AI_PERIOD, TIER_RANK, type Tier } from "@/lib/tiers";

// ── Types ─────────────────────────────────────────────────────────────────────

type User = {
  tier: string;
  subscription_status: string;
  founders_pass: boolean;
  lifetime_access: boolean;
  founders_pass_type?: string | null;
};

// Founders Pass purchase UI is hidden until the STRIPE_LIVE_FOUNDERS_* price
// IDs exist — without them the checkout endpoint returns a 500. Flip to true
// once the live prices are created and configured in the API environment.
const SHOW_FOUNDERS_PASS = false;

// ── Tier definitions ──────────────────────────────────────────────────────────

const TIERS = [
  {
    key:         "APPRENTICE",
    name:        "Apprentice",
    price:       "Free",
    priceDetail: "",
    positioning: "Start building your foundation.",
    benefits: [
      "5 AI questions per month",
      "Core learning modules",
      "Guided documentation templates",
      "Educational AI guidance",
    ],
  },
  {
    key:         "JOURNEYMAN",
    name:        "Journeyman",
    price:       "$19",
    priceDetail: "/month",
    positioning: "Structured tools for consistent progress.",
    benefits: [
      "20 AI questions per month",
      "Full core learning modules",
      "Structured documentation templates",
      "Enhanced dispute workflows",
      "Priority generation queue",
    ],
  },
  {
    key:         "MASTER",
    name:        "Master",
    price:       "$47",
    priceDetail: "/month",
    positioning: "Advanced strategy and arbitration access.",
    benefits: [
      "100 AI questions per month",
      "Arbitration strategy access",
      "Advanced structured workflows",
      "Enhanced documentation vault",
      "Priority AI processing",
    ],
  },
] as const;

type TierKey = typeof TIERS[number]["key"];

// ── Promo code input ──────────────────────────────────────────────────────────

function PromoCodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2 flex-1 focus-within:border-slate-600">
        <Tag size={13} className="text-slate-600 shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Promo code (optional)"
          maxLength={32}
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none font-mono tracking-wider"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="text-slate-600 hover:text-slate-400 transition-colors text-xs"
            aria-label="Clear promo code"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UpgradePage() {
  const { data: session, status: sessionStatus } = useGuildedSession();
  const searchParams = useSearchParams();
  const [user,      setUser]      = useState<User | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const canceled = searchParams.get("canceled") === "1";

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const token = session?.user?.accessToken;
    if (!token) return;
    authApi.me(token)
      .then((r) => r.json())
      .then((data) => setUser(data))
      .catch(() => {});
  }, [session?.user?.accessToken, sessionStatus]);

  const userRank  = TIER_RANK[(user?.tier ?? "APPRENTICE") as Tier] ?? 0;
  const aiLimit   = AI_LIMITS[(user?.tier ?? "APPRENTICE") as Tier] ?? 0;
  const aiPeriod  = AI_PERIOD[(user?.tier ?? "APPRENTICE") as Tier] ?? "monthly";

  const isFounder = user?.founders_pass || user?.lifetime_access;

  return (
    <section className="space-y-10">

      {/* Checkout canceled note */}
      {canceled && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 text-sm text-slate-400">
          <span className="text-slate-600">ℹ</span>
          Checkout was canceled — no charge was made. Take your time reviewing the options below.
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Advance Your Rank
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-md">
            Plutus provides structured tools aligned with your level of advancement.
            Cancel anytime — no long-term commitment required.
          </p>
        </div>

        {/* Account status panel */}
        <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-800/40 px-5 py-4 md:min-w-[240px]">
          <p className="text-xs uppercase tracking-widest text-slate-500">Account Status</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-8">
              <span className="text-slate-500">Current Rank</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">{user?.tier ?? "…"}</span>
                {isFounder && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                    <Crown size={9} /> Founding Member
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-slate-500">AI Limit</span>
              <span className="font-medium text-slate-200">
                {aiLimit}&thinsp;/&thinsp;{aiPeriod === "weekly" ? "week" : "month"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-slate-500">Billing</span>
              <span className="font-medium capitalize text-slate-200">
                {isFounder ? "Lifetime Access" : (user?.subscription_status ?? "—")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Promo code ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2.5">
          Promotion Code
        </p>
        <PromoCodeInput value={promoCode} onChange={setPromoCode} />
        <p className="mt-2 text-xs text-slate-600">
          Applies at checkout. Discounts are shown on the Stripe payment page.
        </p>
      </div>

      {/* ── Tier comparison grid ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Subscription Plans
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => {
            const tierRankVal = TIER_RANK[tier.key as Tier] ?? 0;
            const isCurrent   = tier.key === user?.tier;
            const isUpgrade   = tierRankVal > userRank;
            const isLocked    = !isUpgrade && !isCurrent;

            const borderClass = isCurrent
              ? "border-gold/30 bg-gold/5"
              : tier.key === "JOURNEYMAN"
              ? "border-gold/20 bg-slate-800/60"
              : "border-slate-800 bg-slate-800/60";

            const showCurrentBadge  = isCurrent;
            const showFeaturedBadge = tier.key === "JOURNEYMAN" && !isCurrent;

            return (
              <div key={tier.key} className={`relative flex flex-col rounded-2xl border p-6 ${borderClass}`}>
                {(showCurrentBadge || showFeaturedBadge) && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                    <span className="rounded-full border border-gold/30 bg-card px-3 py-0.5 text-xs font-medium text-gold">
                      {showCurrentBadge ? "Your Current Rank" : "Recommended"}
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">{tier.name}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tracking-tight text-slate-100">{tier.price}</span>
                    {tier.priceDetail && (
                      <span className="text-sm text-slate-500">{tier.priceDetail}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{tier.positioning}</p>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {tier.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <Check size={13} className="mt-0.5 shrink-0 text-gold/60" />
                      <span className="text-sm text-slate-300">{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {isCurrent ? (
                    <div className="w-full rounded-xl border border-slate-700 py-2.5 text-center text-sm font-medium text-slate-500">
                      Current Plan
                    </div>
                  ) : isLocked || tier.key === "APPRENTICE" ? (
                    <div className="w-full rounded-xl border border-slate-800 py-2.5 text-center text-sm text-slate-700">
                      {tier.key === "APPRENTICE" ? "Included Free" : "—"}
                    </div>
                  ) : (
                    <CheckoutButton
                      tier={tier.key}
                      label={`Advance to ${tier.name}`}
                      promoCode={promoCode || undefined}
                      className="w-full rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-center text-sm font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-60"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Founders Pass ────────────────────────────────────────────────── */}
      {SHOW_FOUNDERS_PASS && !isFounder && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Plutus Founders Pass
          </p>

          <div className="grid gap-5 md:grid-cols-2">

            {/* Standard */}
            <div className="relative rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/5 to-slate-900 p-6">
              <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                <span className="rounded-full border border-gold/40 bg-card px-3 py-0.5 text-xs font-semibold text-gold">
                  Founders Pass
                </span>
              </div>
              <div className="flex items-start gap-3 mb-4">
                <div className="rounded-xl border border-gold/20 bg-gold/10 p-2 shrink-0">
                  <Crown size={16} className="text-gold" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Standard Founders Pass</p>
                  <p className="text-xs text-slate-500 mt-0.5">One-time payment · Lifetime access</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-gold">$195</span>
                <span className="text-sm text-slate-500">one-time</span>
              </div>

              <ul className="space-y-2 mb-6">
                {[
                  "Master-tier access — permanently",
                  "No recurring billing, ever",
                  "Founding Member badge",
                  "Priority feature access",
                  "Pricing lock — never pay more",
                  "Access to future core platform features",
                  "Fair-use AI policy (100+ questions/month)",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Check size={13} className="mt-0.5 shrink-0 text-gold/60" />
                    <span className="text-xs text-slate-300">{b}</span>
                  </li>
                ))}
              </ul>

              <FoundersPassButton
                passType="STANDARD"
                label="Claim Founders Pass — $195"
                promoCode={promoCode || undefined}
                className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-60"
              />
            </div>

            {/* Partner */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-2 shrink-0">
                  <Shield size={16} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Partner / Community Pass</p>
                  <p className="text-xs text-slate-500 mt-0.5">For community members and partners</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-slate-200">$97</span>
                <span className="text-sm text-slate-500">one-time</span>
              </div>

              <ul className="space-y-2 mb-6">
                {[
                  "Master-tier access — permanently",
                  "No recurring billing",
                  "Founding Member badge",
                  "Community pricing locked in",
                  "Same platform access as Standard",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Check size={13} className="mt-0.5 shrink-0 text-slate-500" />
                    <span className="text-xs text-slate-400">{b}</span>
                  </li>
                ))}
              </ul>

              <FoundersPassButton
                passType="PARTNER"
                label="Claim Partner Pass — $97"
                promoCode={promoCode || undefined}
                className="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-60"
              />

              <p className="mt-3 text-xs text-slate-600 text-center">
                Available to community members and referral partners.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Founders Pass already claimed */}
      {isFounder && (
        <div className="rounded-2xl border border-gold/25 bg-gold/5 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-gold/20 bg-gold/10 p-2 shrink-0">
              <Crown size={16} className="text-gold" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gold">Founding Member Active</p>
              <p className="text-xs text-slate-400 mt-0.5">
                You have lifetime access to Plutus.
                {user?.founders_pass_type ? ` (${user.founders_pass_type} Pass)` : ""}
                {" "}No recurring billing. No expiration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Trust block ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-800/30 px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-3 text-center">
          {[
            { icon: Lock,   title: "Cancel anytime",        desc: "Subscriptions cancel instantly. No questions, no friction." },
            { icon: Shield, title: "Privacy-first",         desc: "Your credit data is never sold or shared. Encrypted at rest." },
            { icon: Check,  title: "No surprise charges",   desc: "One price, clear billing. Discounts show before you pay." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center gap-2">
              <Icon size={14} className="text-gold/60" />
              <p className="text-xs font-semibold text-slate-300">{title}</p>
              <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
