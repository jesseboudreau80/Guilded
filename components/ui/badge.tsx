import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "tier";
type TierColor = "APPRENTICE" | "JOURNEYMAN" | "MASTER" | "HERO";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  tier?: TierColor;
}

const tierColors: Record<TierColor, string> = {
  APPRENTICE: "bg-gray-800 text-gray-300 border-gray-700",
  JOURNEYMAN: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  MASTER: "bg-purple-900/40 text-purple-300 border-purple-700/50",
  HERO: "bg-amber-900/40 text-amber-300 border-amber-700/50",
};

export function Badge({
  className,
  variant = "default",
  tier,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-gray-800 text-gray-300 border-gray-700": variant === "default",
          "bg-emerald-900/40 text-emerald-300 border-emerald-700/50":
            variant === "success",
          "bg-amber-900/40 text-amber-300 border-amber-700/50":
            variant === "warning",
          "bg-red-900/40 text-red-300 border-red-700/50": variant === "danger",
        },
        tier && tierColors[tier],
        className
      )}
      {...props}
    />
  );
}
