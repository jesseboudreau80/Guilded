"use client";

import { Shield } from "lucide-react";
import { GUILD_RANK_COLORS, GUILD_RANK_BG } from "@/lib/academy-intel";

type Props = {
  rank:         string;
  xp:           number;
  nextXP?:      number | null;
  progressPct?: number;
  variant?:     "badge" | "full";
};

// Explicit Tailwind classes so JIT includes them in the bundle.
// DO NOT construct these dynamically (Tailwind won't detect dynamic strings).
const RANK_BAR_BG: Record<string, string> = {
  "Apprentice":        "bg-slate-400",
  "Journeyman":        "bg-blue-400",
  "Strategist":        "bg-indigo-400",
  "Master Negotiator": "bg-gold",
  "Guild Commander":   "bg-gold",
};

export function GuildRankBadge({ rank, xp, nextXP, progressPct, variant = "badge" }: Props) {
  const colorClass = GUILD_RANK_COLORS[rank] ?? "text-slate-400 border-slate-600";
  const bgClass    = GUILD_RANK_BG[rank]     ?? "bg-slate-800";
  const barBg      = RANK_BAR_BG[rank]       ?? "bg-slate-400";

  // Extract just the text color class (first token)
  const textColor  = colorClass.split(" ")[0];
  // Extract just the border class
  const borderCls  = colorClass.split(" ").find((c) => c.startsWith("border")) ?? "border-slate-700";

  if (variant === "badge") {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${bgClass} ${colorClass}`}>
        <Shield size={11} />
        {rank}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border px-4 py-4 ${bgClass} ${borderCls}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className={textColor} />
          <span className={`text-sm font-semibold ${textColor}`}>{rank}</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">{xp} XP</span>
      </div>

      {nextXP != null && progressPct != null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-600">Progress to next rank</span>
            <span className="text-xs text-slate-600">{nextXP - xp} XP needed</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all opacity-70 ${barBg}`}
              style={{ width: `${Math.round(progressPct * 100)}%` }}
            />
          </div>
        </div>
      )}

      {nextXP == null && (
        <p className="mt-2 text-xs text-slate-500">Maximum rank achieved</p>
      )}
    </div>
  );
}
