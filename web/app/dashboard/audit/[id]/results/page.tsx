"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock, AlertTriangle, AlertCircle, Info, ArrowRight, CheckSquare, Square } from "lucide-react";
import Link from "next/link";
import { auditApi, disputeApi, academyApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { SmartRecommendationPill } from "@/components/academy/SmartRecommendationPill";
import { AcademyReferenceCard } from "@/components/academy/AcademyReferenceCard";
import { deriveSignalsFromAudit } from "@/lib/academy-intel";

type Account = {
  id:            string;
  creditor_name: string;
  account_type:  string | null;
  balance:       number | null;
  status:        string | null;
  negative_flag: boolean;
};

type Recommendation = {
  id:          string;
  severity:    "high" | "medium" | "low";
  title:       string;
  description: string;
  locked:      boolean;
};

type AuditSummary = {
  negative_accounts: number;
  total_accounts:    number;
  collections:       number;
  late_payments:     number;
  charge_offs:       number;
};

type AuditResults = {
  audit_id:              string;
  status:                string;
  risk_score:            number | null;
  total_recommendations: number;
  unlocked_count:        number;
  summary:               AuditSummary | null;
  accounts:              Account[];
  recommendations:       Recommendation[];
};

const STRATEGIES = [
  { value: "fcra_dispute",   label: "Accuracy Dispute"   },
  { value: "validation",     label: "Debt Validation"    },
  { value: "goodwill",       label: "Goodwill Request"   },
  { value: "pay_for_delete", label: "Pay-for-Delete"     },
];

const SEV_CONFIG = {
  high:   { Icon: AlertTriangle, badge: "bg-red-400/10 border-red-400/30 text-red-400"       },
  medium: { Icon: AlertCircle,   badge: "bg-amber-400/10 border-amber-400/30 text-amber-400" },
  low:    { Icon: Info,          badge: "bg-slate-700 border-slate-600 text-slate-400"        },
};

function RiskScore({ score }: { score: number }) {
  const level =
    score <= 30 ? { label: "Low Risk",      color: "text-emerald-400" } :
    score <= 60 ? { label: "Moderate Risk", color: "text-amber-400"   } :
    score <= 80 ? { label: "High Risk",     color: "text-orange-400"  } :
                  { label: "Critical",      color: "text-red-400"     };
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-800/60 px-8 py-8">
      <p className="text-xs uppercase tracking-widest text-slate-500">Risk Score</p>
      <p className={`mt-2 text-6xl font-bold tabular-nums ${level.color}`}>{score}</p>
      <p className={`mt-1 text-sm font-medium ${level.color}`}>{level.label}</p>
      <div className="mt-4 h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${
            score <= 30 ? "bg-emerald-400" :
            score <= 60 ? "bg-amber-400"   :
            score <= 80 ? "bg-orange-400"  : "bg-red-400"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function AuditResultsPage() {
  const { id }            = useParams<{ id: string }>();
  const { data: session } = useGuildedSession();
  const router            = useRouter();

  const [results,    setResults]    = useState<AuditResults | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // Dispute state
  const [recChecked,   setRecChecked]   = useState<Set<string>>(new Set());
  const [strategy,     setStrategy]     = useState("fcra_dispute");
  const [generating,   setGenerating]   = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;
    auditApi.results(id, token)
      .then((r) => r.json())
      .then((data) => {
        if (data.detail) { setError(data.detail); return; }
        setResults(data);
        const unlockedIds: string[] = (data.recommendations ?? [])
          .filter((r: Recommendation) => !r.locked)
          .map((r: Recommendation) => r.id);
        setRecChecked(new Set(unlockedIds));
        // Award XP for completing a credit audit (idempotent — uses audit_id as reference)
        academyApi.awardXP({ event_type: "audit_complete", reference: data.audit_id }, token)
          .catch(() => { /* non-critical */ });
      })
      .catch(() => setError("Failed to load results."))
      .finally(() => setLoading(false));
  }, [id, session?.user?.accessToken]);

  const toggleRec = (recId: string) => {
    setRecChecked((prev) => {
      const next = new Set(prev);
      next.has(recId) ? next.delete(recId) : next.add(recId);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!session?.user?.accessToken || !results) return;
    setGenerating(true);
    setDisputeError(null);

    try {
      const res  = await disputeApi.generate(
        {
          audit_id:           results.audit_id,
          recommendation_ids: Array.from(recChecked),
          strategy,
        },
        session.user.accessToken,
      );
      const data = await res.json();
      if (!res.ok) {
        setDisputeError(data.detail ?? "Generation failed. Please try again.");
        return;
      }
      router.push(`/dashboard/disputes/${data.id}`);
    } catch {
      setDisputeError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Results</h1>
        <p className="mt-6 text-sm text-slate-400">Loading your report…</p>
      </section>
    );
  }

  if (error || !results) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Results</h1>
        <p className="mt-6 text-sm text-red-400">{error ?? "Report not found."}</p>
      </section>
    );
  }

  const lockedCount   = results.recommendations.filter((r) => r.locked).length;
  const unlockedCount = results.recommendations.filter((r) => !r.locked).length;
  const s             = results.summary;

  // Derive Academy intelligence signals from audit data
  const signals = deriveSignalsFromAudit(
    s ? { collections: s.collections, charge_offs: s.charge_offs, late_payments: s.late_payments, negative_accounts: s.negative_accounts } : null,
    results.risk_score,
    results.recommendations,
  );

  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Audit Results</h1>
        <p className="mt-2 text-sm text-slate-400">
          Structured analysis of your credit report.
        </p>

        {/* Risk + summary row */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.risk_score != null && (
            <RiskScore score={results.risk_score} />
          )}

          {s && (
            <div className="rounded-2xl border border-slate-800 bg-slate-800/60 px-6 py-5 space-y-3 sm:col-span-1 lg:col-span-2">
              <p className="text-xs uppercase tracking-widest text-slate-500">Report Summary</p>
              <p className="text-sm font-semibold text-slate-100">
                {results.total_recommendations} potential dispute or correction opportunities detected
              </p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  ["Accounts",       s.total_accounts],
                  ["Negative",       s.negative_accounts],
                  ["Collections",    s.collections],
                  ["Late Payments",  s.late_payments],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-lg bg-slate-900/60 px-3 py-2">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-200">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upgrade CTA */}
        {lockedCount > 0 && (
          <div className="relative mt-6 overflow-hidden rounded-xl border border-gold/20 bg-gold/5 py-4 pl-6 pr-5">
            <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl bg-gold" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {lockedCount} additional recommendations locked
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Advance your rank to unlock full guidance on every issue detected.
                </p>
              </div>
              <Link
                href="/dashboard/upgrade"
                className="shrink-0 flex items-center gap-1.5 self-start rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/10 sm:self-auto"
              >
                View Options <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* ── Guild Academy Intelligence Layer ──────────────────────────── */}
        {signals.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Training Recommendations
              </p>
              <div className="h-px flex-1 bg-slate-800" />
            </div>
            {/* Signal pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {signals.map((sig) => (
                <SmartRecommendationPill key={sig.key} signalKey={sig.key} showModule />
              ))}
            </div>
            {/* Top-priority module reference card */}
            {signals[0] && (
              <AcademyReferenceCard
                signalKey={signals[0].key}
                context="Highest-priority training based on your audit"
              />
            )}
          </div>
        )}

        {/* Strategy toolbar — shown when there are unlocked recs */}
        {unlockedCount > 0 && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 shrink-0">Dispute strategy</span>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold/50"
              >
                {STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              {recChecked.size > 0 && (
                <span className="text-xs text-slate-500">
                  {recChecked.size} issue{recChecked.size !== 1 ? "s" : ""} selected
                </span>
              )}
              <button
                onClick={handleGenerate}
                disabled={recChecked.size === 0 || generating}
                className="rounded-xl bg-gold px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {generating ? "Generating…" : "Generate Dispute Draft"}
              </button>
            </div>
          </div>
        )}

        {disputeError && (
          <div className="mt-3 rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {disputeError}
          </div>
        )}

        {/* Recommendations table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/60">
                <th className="px-4 py-3 w-10" />
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500 w-24">Severity</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500">Issue</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500 hidden md:table-cell">Guidance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {results.recommendations.map((rec) => {
                const cfg = SEV_CONFIG[rec.severity] ?? SEV_CONFIG.low;
                const { Icon } = cfg;

                if (rec.locked) {
                  return (
                    <tr key={rec.id} className="opacity-60">
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                          <Icon size={11} />
                          {rec.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3" colSpan={2}>
                        <div className="flex items-center gap-2">
                          <Lock size={13} className="shrink-0 text-slate-600" />
                          <span className="text-slate-500 text-xs">
                            Upgrade to unlock detailed guidance
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={rec.id}
                    onClick={() => toggleRec(rec.id)}
                    className="cursor-pointer hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {recChecked.has(rec.id)
                        ? <CheckSquare size={16} className="text-gold" />
                        : <Square size={16} className="text-slate-600" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                        <Icon size={11} />
                        {rec.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200 md:w-56">
                      {rec.title}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs leading-relaxed hidden md:table-cell">
                      {rec.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <Link
            href="/dashboard/audit/start"
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
          >
            Run Another Audit
          </Link>
        </div>
      </section>
    </>
  );
}
