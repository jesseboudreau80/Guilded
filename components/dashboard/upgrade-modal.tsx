"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TIER_INFO } from "@/types";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleUpgrade(tier: string) {
    setLoading(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // handle error
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-2xl border border-surface-border bg-surface-card shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-white">Upgrade Your Plan</h2>
            {reason && (
              <p className="mt-2 text-sm text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded-lg px-4 py-2 mt-3">
                {reason}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TIER_INFO.filter((t) => t.tier !== "APPRENTICE").map((tier) => (
              <div
                key={tier.tier}
                className={cn(
                  "rounded-xl border p-5 flex flex-col",
                  tier.highlighted
                    ? "border-brand-500 bg-brand-900/20"
                    : "border-surface-border bg-surface"
                )}
              >
                {tier.highlighted && (
                  <div className="mb-3 text-center">
                    <span className="rounded-full bg-brand-600 px-3 py-0.5 text-xs font-medium text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {tier.label}
                  </h3>
                  <div className="mt-1">
                    <span className="text-3xl font-bold text-white">
                      ${tier.price}
                    </span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>
                <ul className="mb-5 flex-1 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleUpgrade(tier.tier)}
                  loading={loading === tier.tier}
                  variant={tier.highlighted ? "primary" : "secondary"}
                  className="w-full"
                >
                  Get {tier.label}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
