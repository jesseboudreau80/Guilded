import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { tierRank } from "@/lib/tiers";

const TIER_LABEL: Record<string, string> = {
  APPRENTICE: "Apprentice",
  JOURNEYMAN: "Journeyman",
  MASTER:     "Master",
  HERO:       "Hero",
};

type Props = {
  title: string;
  requiredTier: string;
  currentTier: string;
  lockedMessage?: string;
  children: ReactNode;
};

export function LockedCard({
  title,
  requiredTier,
  currentTier,
  lockedMessage,
  children,
}: Props) {
  if (tierRank(currentTier) >= tierRank(requiredTier)) {
    return <>{children}</>;
  }

  const tierLabel = TIER_LABEL[requiredTier] ?? requiredTier;
  const message = lockedMessage ?? `Available to ${tierLabel} rank and above.`;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-slate-700"
      aria-label={`${title} — locked`}
    >
      <div className="pointer-events-none select-none blur-sm" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 backdrop-blur-[1px]">
        <Lock className="h-5 w-5 text-gold" />
        <p className="px-4 text-center text-sm font-medium text-slate-200">
          {message}
        </p>
        <a
          href="/dashboard/upgrade"
          className="text-xs text-gold underline-offset-2 hover:underline"
        >
          Advance your rank →
        </a>
      </div>
    </div>
  );
}
