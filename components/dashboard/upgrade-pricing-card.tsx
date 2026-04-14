"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TierInfo } from "@/types";
import { Tier } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const TIER_ORDER: Record<Tier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 1,
  MASTER: 2,
  HERO: 3,
};

const TIER_ICONS: Record<Tier, string> = {
  APPRENTICE: "🛡",
  JOURNEYMAN: "⚔",
  MASTER: "🏰",
  HERO: "👑",
};

interface UpgradePricingCardProps {
  tier: TierInfo;
  currentTier: Tier;
}

export function UpgradePricingCard({ tier, currentTier }: UpgradePricingCardProps) {
  const [loading, setLoading] = useState(false);
  const isCurrent = currentTier === tier.tier;
  const isDowngrade = TIER_ORDER[tier.tier as Tier] < TIER_ORDER[currentTier];
  const isUpgrade = TIER_ORDER[tier.tier as Tier] > TIER_ORDER[currentTier];

  async function handleUpgrade() {
    if (!isUpgrade || tier.tier === "APPRENTICE") return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tier.tier }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6",
        tier.highlighted && !isCurrent
          ? "border-brand-500 bg-brand-900/20"
          : "border-surface-border bg-surface-card",
        isCurrent && "border-emerald-700/50 bg-emerald-900/10"
      )}
    >
      {tier.highlighted && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white shadow">
            Most Popular
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-emerald-700 px-3 py-0.5 text-xs font-semibold text-white shadow">
            Current Plan
          </span>
        </div>
      )}

      <div className="mb-4">
        <div className="text-2xl mb-1">{TIER_ICONS[tier.tier as Tier]}</div>
        <h3 className="text-lg font-bold text-white">{tier.label}</h3>
        <div className="mt-2">
          {tier.price === 0 ? (
            <span className="text-3xl font-bold text-white">Free</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-white">
                ${tier.price}
              </span>
              <span className="text-gray-400">/mo</span>
            </>
          )}
        </div>
      </div>

      <ul className="mb-6 flex-1 space-y-2">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
            {f}
          </li>
        ))}
      </ul>

      {tier.tier === "APPRENTICE" ? (
        <Button variant="ghost" disabled className="w-full">
          {isCurrent ? "Current Plan" : "Free"}
        </Button>
      ) : isCurrent ? (
        <Button variant="secondary" disabled className="w-full">
          Current Plan
        </Button>
      ) : isUpgrade ? (
        <Button
          onClick={handleUpgrade}
          loading={loading}
          variant={tier.highlighted ? "primary" : "secondary"}
          className="w-full"
        >
          Upgrade to {tier.label}
        </Button>
      ) : (
        <Button variant="ghost" disabled className="w-full text-gray-500">
          Downgrade
        </Button>
      )}
    </div>
  );
}
