"use client";

import { useEffect, useState } from "react";
import { getRecentSessions, type RecentSession } from "@/lib/recentSessions";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Props = {
  onSelect: (text: string) => void;
  refreshKey?: number;
};

export function RecentSessions({ onSelect, refreshKey }: Props) {
  const [sessions, setSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    setSessions(getRecentSessions());
  }, [refreshKey]);

  if (sessions.length === 0) return null;

  return (
    <div className="mt-8">
      <p className="mb-3 text-xs uppercase tracking-widest text-slate-500">
        Recent Structured Sessions
      </p>
      <div className="space-y-2">
        {sessions.map((s) => (
          <button
            key={s.timestamp}
            type="button"
            onClick={() => onSelect(s.prompt)}
            className="w-full rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3 text-left transition-colors hover:bg-slate-800/60"
          >
            <p className="text-sm text-slate-300 truncate">
              {s.prompt.slice(0, 60)}
              {s.prompt.length > 60 ? "…" : ""}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{timeAgo(s.timestamp)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
