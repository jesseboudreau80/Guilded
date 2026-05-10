import { Check } from "lucide-react";
import { CheckoutButton } from "@/components/ui/CheckoutButton";

export type TierDef = {
  key:         string;
  name:        string;
  price:       string;
  priceDetail: string;
  positioning: string;
  benefits:    string[];
};

type Props = {
  tier:      TierDef;
  isCurrent: boolean;
  isUpgrade: boolean;
  featured?: boolean;
};

function CardButton({
  tier,
  isCurrent,
  isUpgrade,
}: {
  tier: TierDef;
  isCurrent: boolean;
  isUpgrade: boolean;
}) {
  const baseDisabled =
    "w-full rounded-xl border border-slate-700 py-2.5 text-center text-sm font-medium text-slate-500";
  const baseMuted =
    "w-full rounded-xl border border-slate-800 py-2.5 text-center text-sm text-slate-700";
  const baseActive =
    "w-full rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-center text-sm font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-60";

  if (isCurrent) {
    return (
      <div className={baseDisabled}>Current Plan</div>
    );
  }

  if (!isUpgrade) {
    return (
      <div className={baseMuted}>
        {tier.key === "APPRENTICE" ? "Included Free" : "—"}
      </div>
    );
  }

  if (tier.key === "APPRENTICE") {
    return <div className={baseDisabled}>Free</div>;
  }

  const label = `Advance to ${tier.name}`;
  return (
    <CheckoutButton tier={tier.key} label={label} className={baseActive} />
  );
}

export function TierCard({ tier, isCurrent, isUpgrade, featured }: Props) {
  const borderClass = isCurrent
    ? "border-gold/30 bg-gold/5"
    : featured
    ? "border-gold/20 bg-slate-800/60"
    : "border-slate-800 bg-slate-800/60";

  const showCurrentBadge  = isCurrent;
  const showFeaturedBadge = featured && !isCurrent;

  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 ${borderClass}`}>
      {(showCurrentBadge || showFeaturedBadge) && (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
          <span className="rounded-full border border-gold/30 bg-card px-3 py-0.5 text-xs font-medium text-gold">
            {showCurrentBadge ? "Your Current Rank" : "Most Popular"}
          </span>
        </div>
      )}

      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500">{tier.name}</p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-semibold tracking-tight text-slate-100">
            {tier.price}
          </span>
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
        <CardButton tier={tier} isCurrent={isCurrent} isUpgrade={isUpgrade} />
      </div>
    </div>
  );
}
