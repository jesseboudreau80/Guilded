"use client";

type Props = {
  used: number;
  limit: number;
  period?: "weekly" | "monthly";
};

export function AiUsageMeter({ used, limit, period = "monthly" }: Props) {
  const isWeekly = period === "weekly";

  if (limit === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
        <p className="text-xs text-slate-400">AI Assistant</p>
        <p className="mt-1 text-sm text-slate-400">
          Advance your rank to unlock additional structured tools.
        </p>
      </div>
    );
  }

  const pct      = Math.min((used / limit) * 100, 100);
  const atLimit  = used >= limit;
  const fillClass =
    pct >= 95 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-gold";

  const atLimitMsg = isWeekly
    ? "Your tools are limited at this rank. Advance to unlock extended AI access."
    : "You've reached your rank limit. Advance to continue.";

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">AI Usage</p>
        <p className="text-xs text-slate-500">
          {isWeekly
            ? `${used} of ${limit} · per week`
            : `${used} / ${limit} messages`}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isWeekly && !atLimit && (
        <p className="mt-1.5 text-xs text-slate-600">
          {limit} structured AI uses per week.
        </p>
      )}
      {atLimit && (
        <p className="mt-2 text-xs text-amber-400">{atLimitMsg}</p>
      )}
    </div>
  );
}
