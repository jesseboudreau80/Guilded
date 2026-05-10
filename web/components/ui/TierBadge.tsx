import { Feather, Briefcase, Crown, Shield } from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { Tier } from "@/lib/tiers";

type BadgeConfig = {
  classes: string;
  Icon: React.ComponentType<LucideProps>;
  label: string;
};

const BADGE: Record<Tier, BadgeConfig> = {
  APPRENTICE: {
    classes: "text-slate-400 bg-slate-800 border-slate-700",
    Icon: Feather,
    label: "Apprentice",
  },
  JOURNEYMAN: {
    classes: "text-slate-200 bg-slate-700 border-slate-600",
    Icon: Briefcase,
    label: "Journeyman",
  },
  MASTER: {
    classes: "text-gold bg-gold/10 border-gold/30",
    Icon: Crown,
    label: "Master",
  },
  HERO: {
    classes: "text-yellow-200 bg-gold/15 border-gold/50",
    Icon: Shield,
    label: "Hero",
  },
};

export function TierBadge({ tier }: { tier: string }) {
  const cfg = BADGE[tier as Tier] ?? BADGE.APPRENTICE;
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.classes}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}
