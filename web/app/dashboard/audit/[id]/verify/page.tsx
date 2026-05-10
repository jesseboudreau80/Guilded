"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckSquare, Square, AlertTriangle } from "lucide-react";
import { auditApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { ProcessingTimeline, type TimelineStage } from "@/components/ui/ProcessingTimeline";

type Account = {
  id:            string;
  creditor_name: string;
  account_type:  string | null;
  balance:       number | null;
  status:        string | null;
  negative_flag: boolean;
};

const ANALYSIS_STAGES: TimelineStage[] = [
  {
    id:     "history",
    label:  "Analyzing payment history",
    detail: "Identifying delinquency patterns and severity",
  },
  {
    id:     "utilization",
    label:  "Evaluating credit utilization",
    detail: "Computing per-card and aggregate usage ratios",
  },
  {
    id:     "derogatory",
    label:  "Reviewing derogatory markers",
    detail: "Cataloging collections, charge-offs, and public records",
  },
  {
    id:     "fcra",
    label:  "Checking FCRA compliance",
    detail: "Identifying re-aging, duplicate entries, and reporting errors",
  },
  {
    id:     "dispute",
    label:  "Scoring dispute opportunities",
    detail: "Ranking issues by impact and removal likelihood",
  },
  {
    id:     "risk",
    label:  "Calculating risk profile",
    detail: "Generating your 0–100 credit health score",
  },
  {
    id:     "strategy",
    label:  "Generating strategy roadmap",
    detail: "Building your prioritized action plan",
  },
];

export default function AuditVerifyPage() {
  const { id }            = useParams<{ id: string }>();
  const { data: session } = useGuildedSession();
  const router            = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [checked,  setChecked]  = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);
  const [running,  setRunning]  = useState(false);
  const [runDone,  setRunDone]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.accessToken) return;
    auditApi.accounts(id, session.user.accessToken)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAccounts(list);
        setChecked(new Set(list.map((a: Account) => a.id)));
      })
      .catch(() => setError("Failed to load accounts."))
      .finally(() => setFetching(false));
  }, [id, session?.user?.accessToken]);

  const toggle = (accId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(accId) ? next.delete(accId) : next.add(accId);
      return next;
    });
  };

  const handleRun = async () => {
    if (!session?.user?.accessToken) return;
    setRunning(true);
    setRunDone(false);
    setError(null);

    try {
      await auditApi.verify(id, Array.from(checked), session.user.accessToken);

      const res  = await auditApi.run(id, session.user.accessToken);
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Analysis failed. Please try again.");
        setRunning(false);
        return;
      }

      // Signal timeline to fast-forward, then navigate.
      // First-time audit completers land on the Recovery Snapshot for
      // a dedicated briefing experience. Returning users go to results.
      setRunDone(true);
      const isFirstAudit = !localStorage.getItem("guilded:first-audit-done");
      if (isFirstAudit) {
        localStorage.setItem("guilded:first-audit-done", "true");
      }
      setTimeout(() => {
        router.push(
          isFirstAudit
            ? `/dashboard/audit/${id}/snapshot`
            : `/dashboard/audit/${id}/results`,
        );
      }, 800);
    } catch {
      setError("Network error. Please try again.");
      setRunning(false);
    }
  };

  // ── Fetching accounts ─────────────────────────────────────────────────────
  if (fetching) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Verify Accounts</h1>
        <p className="mt-6 text-sm text-slate-400">Loading detected accounts…</p>
      </section>
    );
  }

  // ── AI analysis running ───────────────────────────────────────────────────
  if (running) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Building Your Credit Profile
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          AI is analyzing every account on your report.
        </p>

        <div className="mt-10 flex justify-start sm:justify-center">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-800/40 px-8 py-10">
            <ProcessingTimeline
              stages={ANALYSIS_STAGES}
              active={running}
              completed={runDone}
              intervalMs={2800}
              title="Deep Credit Analysis"
              subtitle="This takes about 30–60 seconds"
            />
          </div>
        </div>
      </section>
    );
  }

  // ── Account verification ──────────────────────────────────────────────────
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Verify Accounts</h1>
      <p className="mt-2 text-sm text-slate-400">
        Confirm which accounts on this report belong to you. Uncheck any you do not recognize.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {accounts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-800/40 px-6 py-8 text-center">
          <p className="text-sm text-slate-400">No accounts were detected in your report.</p>
          <p className="mt-2 text-xs text-slate-600">
            The PDF may be image-based or have an unsupported format.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/60">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500 w-10" />
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500">Creditor</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500 hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-widest text-slate-500 hidden md:table-cell">Balance</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {accounts.map((acc) => (
                <tr
                  key={acc.id}
                  onClick={() => toggle(acc.id)}
                  className="cursor-pointer transition-colors hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3">
                    {checked.has(acc.id)
                      ? <CheckSquare size={16} className="text-gold" />
                      : <Square size={16} className="text-slate-600" />}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200">{acc.creditor_name}</td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{acc.account_type ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-400 hidden md:table-cell">
                    {acc.balance != null ? `$${acc.balance.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${acc.negative_flag ? "text-red-400" : "text-slate-400"}`}>
                      {acc.negative_flag && <AlertTriangle size={11} />}
                      {acc.status ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          {checked.size} of {accounts.length} accounts confirmed
        </p>
        <button
          onClick={handleRun}
          disabled={checked.size === 0}
          className="rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Generate Report
        </button>
      </div>
    </section>
  );
}
