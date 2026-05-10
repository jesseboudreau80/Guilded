import { redirect } from "next/navigation";
import { getGuildedSession } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { TierCard, type TierDef } from "@/components/ui/TierCard";
import { AI_LIMITS, AI_PERIOD, TIER_RANK, type Tier } from "@/lib/tiers";

const TIERS: TierDef[] = [
  {
    key:         "APPRENTICE",
    name:        "Apprentice",
    price:       "Free",
    priceDetail: "",
    positioning: "Start building your foundation.",
    benefits: [
      "5 structured tools per week",
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
      "20 structured tools per month",
      "Full core modules",
      "Structured documentation templates",
      "Enhanced AI guidance",
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
      "100 structured tools per month",
      "Arbitration strategy access",
      "Advanced structured workflows",
      "Enhanced documentation vault",
      "Priority AI processing",
    ],
  },
];

export default async function UpgradePage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const res = await authApi.me(session.user.accessToken);
  if (!res.ok) redirect("/");

  const user      = await res.json();
  const userRank  = TIER_RANK[user.tier as Tier] ?? 0;
  const aiLimit   = AI_LIMITS[user.tier as Tier] ?? 0;
  const aiPeriod  = AI_PERIOD[user.tier as Tier] ?? "monthly";

  return (
    <section>
      {/* Page header + status panel */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Advance Your Rank
          </h1>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Guilded provides structured tools aligned with your level of advancement.
          </p>
        </div>

        {/* Status panel */}
        <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-800/40 px-5 py-4 md:min-w-[220px]">
          <p className="text-xs uppercase tracking-widest text-slate-500">Account Status</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-8">
              <span className="text-slate-500">Current Rank</span>
              <span className="font-medium text-slate-200">{user.tier}</span>
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
                {user.subscription_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tier comparison grid */}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {TIERS.map((tier) => {
          const tierRankValue = TIER_RANK[tier.key as Tier] ?? 0;
          const isCurrent     = tier.key === user.tier;
          const isUpgrade     = tierRankValue > userRank;

          return (
            <TierCard
              key={tier.key}
              tier={tier}
              isCurrent={isCurrent}
              isUpgrade={isUpgrade}
              featured={tier.key === "JOURNEYMAN"}
            />
          );
        })}
      </div>

      {/* Anxiety-reduction block */}
      <div className="mt-12 max-w-xl rounded-xl border border-slate-800 bg-slate-800/30 px-6 py-6">
        <p className="text-sm font-semibold tracking-tight text-slate-200">
          What Changes When You Advance?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          When you advance your rank, additional structured tools unlock immediately.
          Your current documents and session history remain intact.
        </p>
      </div>
    </section>
  );
}
