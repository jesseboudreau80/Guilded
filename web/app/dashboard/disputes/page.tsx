"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ChevronRight, Shield } from "lucide-react";
import { disputeApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";

type DisputeItem = {
  id:            string;
  audit_id:      string;
  strategy_type: string;
  rec_count:     number;
  created_at:    string;
};

const STRATEGY_LABELS: Record<string, string> = {
  fcra_dispute:   "Accuracy Dispute",
  validation:     "Debt Validation",
  goodwill:       "Goodwill Request",
  pay_for_delete: "Pay-for-Delete",
};

const STRATEGY_COLORS: Record<string, string> = {
  fcra_dispute:   "border-blue-500/30 bg-blue-900/20 text-blue-400",
  validation:     "border-amber-500/30 bg-amber-900/20 text-amber-400",
  goodwill:       "border-emerald-500/30 bg-emerald-900/20 text-emerald-400",
  pay_for_delete: "border-purple-500/30 bg-purple-900/20 text-purple-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function DisputesPage() {
  const { data: session, status: sessionStatus } = useGuildedSession();

  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const token = session?.user?.accessToken;
    if (!token) { setLoading(false); return; }
    disputeApi.list(token)
      .then((r) => r.json())
      .then((data) => {
        if (data.detail) { setError(data.detail); return; }
        setDisputes(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load disputes."))
      .finally(() => setLoading(false));
  }, [session?.user?.accessToken, sessionStatus]);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={13} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Dispute History</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">My Disputes</h1>
          <p className="mt-1 text-sm text-slate-400">All generated dispute letters.</p>
        </div>
        <Link
          href="/dashboard/audit/start"
          className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          New Audit
        </Link>
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-slate-800/60" />)}
        </div>
      )}
      {error   && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && disputes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 px-8 py-14 text-center">
          <div className="h-12 w-12 rounded-2xl border border-slate-700 bg-slate-800/60 flex items-center justify-center mx-auto mb-5">
            <FileText size={22} className="text-slate-500" />
          </div>
          <p className="text-base font-semibold text-slate-200">No disputes generated yet</p>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            Run a credit audit to identify dispute opportunities, then generate
            a targeted dispute letter for each issue.
          </p>
          <Link
            href="/dashboard/audit/start"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
          >
            Run Credit Audit
          </Link>
        </div>
      )}

      {disputes.length > 0 && (
        <div className="space-y-2">
          {disputes.map((d) => {
            const strategyLabel = STRATEGY_LABELS[d.strategy_type] ?? d.strategy_type;
            const strategyColor = STRATEGY_COLORS[d.strategy_type] ?? "border-slate-700 bg-slate-800/40 text-slate-400";
            return (
              <Link
                key={d.id}
                href={`/dashboard/disputes/${d.id}`}
                className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4 hover:border-slate-700 transition-colors group"
              >
                <div className="h-9 w-9 shrink-0 rounded-lg border border-slate-700 bg-slate-800/60 flex items-center justify-center">
                  <FileText size={15} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${strategyColor}`}>
                      {strategyLabel}
                    </span>
                    <span className="text-xs text-slate-600">
                      {d.rec_count} recommendation{d.rec_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{formatDate(d.created_at)}</p>
                </div>
                <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
