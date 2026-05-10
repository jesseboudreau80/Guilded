import { Star } from "lucide-react";

type Props = {
  label?: string;
  size?:  "sm" | "md";
};

/**
 * Beta / founding member badge.
 * Use on pages where you want to reinforce early-access positioning.
 */
export function BetaBadge({ label = "Early Access · Founding Member", size = "sm" }: Props) {
  const cls = size === "sm"
    ? "text-xs px-2.5 py-1"
    : "text-sm px-3 py-1.5";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 font-medium text-gold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
      {label}
      <Star size={9} />
    </span>
  );
}
