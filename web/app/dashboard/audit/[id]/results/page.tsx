"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Lock, AlertTriangle, AlertCircle, Info, ArrowRight,
  CheckSquare, Square, ChevronDown, ChevronUp, Shield,
  Sparkles, Clock, Eye, ArrowLeft, Building2, Target,
} from "lucide-react";
import Link from "next/link";
import { auditApi, disputeApi, academyApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { deriveSignalsFromAudit, SEVERITY_COLORS } from "@/lib/academy-intel";
import { track, auditFunnelEvents } from "@/lib/analytics";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Strategy config ───────────────────────────────────────────────────────────

const STRATEGIES = [
  { value: "fcra_dispute",   label: "Accuracy Dispute"   },
  { value: "validation",     label: "Debt Validation"    },
  { value: "goodwill",       label: "Goodwill Request"   },
  { value: "pay_for_delete", label: "Pay-for-Delete"     },
];

const STRATEGY_DETAILS: Record<string, {
  when: string; outcome: string; timeline: string;
  basis: string; aggression: number; tone: string;
}> = {
  fcra_dispute: {
    when:       "Information on your report is inaccurate, incomplete, or cannot be verified.",
    outcome:    "Bureau must investigate within 30 days and remove any item they cannot verify.",
    timeline:   "30–45 days", basis: "FCRA §611", aggression: 2,
    tone:       "Professional legal assertion",
  },
  validation: {
    when:       "A debt collector contacted you — especially for older debts or unclear account ownership.",
    outcome:    "Collector must pause all collection and provide documentation proving the debt.",
    timeline:   "30–45 days", basis: "FDCPA §809(b)", aggression: 3,
    tone:       "Assertive legal demand",
  },
  goodwill: {
    when:       "Isolated late payment on an otherwise positive account with the same creditor.",
    outcome:    "Creditor may remove the late payment as a courtesy — no legal obligation.",
    timeline:   "1–4 weeks", basis: "No statutory requirement", aggression: 1,
    tone:       "Respectful personal appeal",
  },
  pay_for_delete: {
    when:       "Negotiating settlement on an open collection — you want removal in exchange for payment.",
    outcome:    "Creditor removes the tradeline from all three bureaus upon receiving payment.",
    timeline:   "2–8 weeks", basis: "No statutory requirement", aggression: 2,
    tone:       "Negotiation proposal",
  },
};

const CONTEXT_FLAGS = [
  { id: "already_paid",   label: "Account already paid" },
  { id: "identity_theft", label: "Not my account — identity theft" },
  { id: "wrong_person",   label: "Collector has wrong person" },
  { id: "ocr_error",      label: "Extracted data has errors" },
  { id: "harassment",     label: "Collector harassed me" },
  { id: "medical",        label: "Medical hardship" },
  { id: "military",       label: "Military / SCRA status" },
  { id: "bankruptcy",     label: "Bankruptcy involved" },
];

const BUREAUS = [
  { id: "experian",   label: "Experian"   },
  { id: "equifax",    label: "Equifax"    },
  { id: "transunion", label: "TransUnion" },
  { id: "creditor",   label: "Creditor"   },
  { id: "collector",  label: "Collector"  },
];

// ── Severity config ───────────────────────────────────────────────────────────

const SEV_CONFIG = {
  high:   { Icon: AlertTriangle, badge: "bg-red-400/10 border-red-400/30 text-red-400"       },
  medium: { Icon: AlertCircle,   badge: "bg-amber-400/10 border-amber-400/30 text-amber-400" },
  low:    { Icon: Info,          badge: "bg-slate-700 border-slate-600 text-slate-400"        },
};

// ── Letter strength computation ───────────────────────────────────────────────

function computeStrength(
  recCount:     number,
  flagCount:    number,
  hasNotes:     boolean,
  strategy:     string,
  bureauCount:  number,
): { pct: number; label: string; color: string; barColor: string } {
  let score = 0;
  score += Math.min(recCount * 10, 30);
  score += flagCount * 8;
  score += hasNotes ? 15 : 0;
  score += ["validation", "fcra_dispute"].includes(strategy) ? 15 : 8;
  score += Math.min(bureauCount * 5, 15);

  if (score >= 70) return { pct: Math.min(score, 100), label: "Aggressive",  color: "text-red-400",     barColor: "bg-red-400"    };
  if (score >= 50) return { pct: score,                label: "Strong",      color: "text-gold",        barColor: "bg-gold"       };
  if (score >= 30) return { pct: score,                label: "Moderate",    color: "text-amber-400",   barColor: "bg-amber-400"  };
  return                  { pct: score,                label: "Weak",        color: "text-slate-500",   barColor: "bg-slate-600"  };
}

// ── Risk score component ──────────────────────────────────────────────────────

function RiskScore({ score }: { score: number }) {
  const level =
    score <= 30 ? { label: "Low Risk",      color: "text-emerald-400", bar: "bg-emerald-400" } :
    score <= 60 ? { label: "Moderate Risk", color: "text-amber-400",   bar: "bg-amber-400"   } :
    score <= 80 ? { label: "High Risk",     color: "text-orange-400",  bar: "bg-orange-400"  } :
                  { label: "Critical Risk", color: "text-red-400",     bar: "bg-red-400"     };
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-800/60 px-8 py-8">
      <p className="text-xs uppercase tracking-widest text-slate-500">Risk Score</p>
      <p className={`mt-2 text-6xl font-bold tabular-nums ${level.color}`}>{score}</p>
      <p className={`mt-1 text-sm font-medium ${level.color}`}>{level.label}</p>
      <div className="mt-4 h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-slate-700">
        <div className={`h-full rounded-full ${level.bar}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ── Account card — for traceability display ───────────────────────────────────

function AccountCard({
  account, checked, onToggle,
}: {
  account: Account; checked: boolean; onToggle: () => void;
}) {
  const maskId = `•${account.id.slice(-4).toUpperCase()}`;
  return (
    <div
      onClick={onToggle}
      className={`cursor-pointer rounded-xl border p-3.5 transition-colors ${
        checked
          ? "border-gold/40 bg-gold/5"
          : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          {checked
            ? <CheckSquare size={15} className="text-gold" />
            : <Square     size={15} className="text-slate-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-200 truncate">{account.creditor_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="text-xs text-slate-500">{account.account_type ?? "Account"}</span>
            <span className="text-xs text-slate-600 font-mono">{maskId}</span>
            {account.balance != null && (
              <span className="text-xs text-slate-400 font-medium">
                ${account.balance.toLocaleString()}
              </span>
            )}
            {account.status && (
              <span className={`text-xs font-medium ${account.negative_flag ? "text-red-400" : "text-slate-400"}`}>
                {account.status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditResultsPage() {
  const { id }            = useParams<{ id: string }>();
  const { data: session, status: sessionStatus } = useGuildedSession();
  const router            = useRouter();

  const [results,       setResults]       = useState<AuditResults | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  // Dispute state
  const [recChecked,    setRecChecked]    = useState<Set<string>>(new Set());
  const [accChecked,    setAccChecked]    = useState<Set<string>>(new Set());
  const [strategy,      setStrategy]      = useState("fcra_dispute");
  const [bureaus,       setBureaus]       = useState(new Set(["experian", "equifax", "transunion"]));
  const [generating,    setGenerating]    = useState(false);
  const [disputeError,  setDisputeError]  = useState<string | null>(null);
  const [showContext,   setShowContext]   = useState(false);
  const [contextFlags,  setContextFlags]  = useState<Set<string>>(new Set());
  const [contextNotes,  setContextNotes]  = useState("");
  const [showStrategy,  setShowStrategy]  = useState(false);
  const [showPreview,   setShowPreview]   = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const token = session?.user?.accessToken;
    if (!token) { setLoading(false); return; }
    auditApi.results(id, token)
      .then((r) => r.json())
      .then((data) => {
        if (data.detail) { setError(data.detail); return; }
        setResults(data);
        const unlockedIds: string[] = (data.recommendations ?? [])
          .filter((r: Recommendation) => !r.locked)
          .map((r: Recommendation) => r.id);
        setRecChecked(new Set(unlockedIds));
        // Pre-select negative accounts
        const negAccIds: string[] = (data.accounts ?? [])
          .filter((a: Account) => a.negative_flag)
          .map((a: Account) => a.id);
        setAccChecked(new Set(negAccIds));
        auditFunnelEvents.resultsViewed(
          data.audit_id,
          data.risk_score,
          (data.recommendations ?? []).length,
        );
        academyApi.awardXP({ event_type: "audit_complete", reference: data.audit_id }, token)
          .catch(() => {});
      })
      .catch(() => setError("Failed to load results."))
      .finally(() => setLoading(false));
  }, [id, session?.user?.accessToken, sessionStatus]);

  const toggleRec = (id: string) => setRecChecked((p) => {
    const n = new Set(p);
    if (n.has(id)) {
      n.delete(id);
      auditFunnelEvents.recDeselected(id);
    } else {
      n.add(id);
      const rec = results?.recommendations.find((r) => r.id === id);
      if (rec) auditFunnelEvents.recSelected(id, rec.severity);
    }
    return n;
  });
  const toggleAcc = (id: string) => setAccChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleBureau = (id: string) => setBureaus((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFlag = (id: string) => setContextFlags((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleGenerate = async () => {
    if (!session?.user?.accessToken || !results) return;
    setGenerating(true);
    setDisputeError(null);
    try {
      const res = await disputeApi.generate(
        {
          audit_id:           results.audit_id,
          recommendation_ids: Array.from(recChecked),
          strategy,
          context_flags:      Array.from(contextFlags),
          context_notes:      contextNotes.trim() || undefined,
          bureau_targets:     Array.from(bureaus),
        },
        session.user.accessToken,
      );
      const data = await res.json();
      if (!res.ok) { setDisputeError(data.detail ?? "Generation failed."); return; }
      track("dispute_generated", { strategy, bureau_count: bureaus.size, rec_count: recChecked.size });
      router.push(`/dashboard/disputes/${data.id}`);
    } catch {
      setDisputeError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <section className="space-y-5">
      <div>
        <div className="h-3 w-40 rounded bg-slate-800 animate-pulse mb-3" />
        <div className="h-8 w-72 rounded bg-slate-800 animate-pulse" />
        <div className="h-4 w-48 rounded bg-slate-800 animate-pulse mt-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3 animate-pulse">
        {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-800/60" />)}
      </div>
      <div className="space-y-2 animate-pulse">
        {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl bg-slate-800/40" />)}
      </div>
    </section>
  );

  if (error || !results) return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Target size={14} className="text-slate-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Recovery Intelligence Brief</p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-8 py-14 text-center">
        <AlertCircle size={22} className="text-slate-600 mx-auto mb-4" />
        <p className="text-base font-semibold text-slate-200">Results unavailable</p>
        <p className="mt-2 text-sm text-slate-500">{error ?? "This audit report could not be loaded."}</p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard/audits" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            View My Audits
          </Link>
          <Link href="/dashboard/audit/start" className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity">
            Run New Audit
          </Link>
        </div>
      </div>
    </section>
  );

  const lockedCount   = results.recommendations.filter((r) => r.locked).length;
  const unlockedCount = results.recommendations.filter((r) => !r.locked).length;
  const s             = results.summary;
  const negativeAccounts = results.accounts.filter((a) => a.negative_flag);
  const strategyDetail   = STRATEGY_DETAILS[strategy];
  const hasContext       = contextFlags.size > 0 || contextNotes.trim().length > 0;
  const strength         = computeStrength(recChecked.size, contextFlags.size, !!contextNotes.trim(), strategy, bureaus.size);
  const signals          = deriveSignalsFromAudit(
    s ? { collections: s.collections, charge_offs: s.charge_offs, late_payments: s.late_payments, negative_accounts: s.negative_accounts } : null,
    results.risk_score,
    results.recommendations,
  );

  const selectedStrategyLabel = STRATEGIES.find((st) => st.value === strategy)?.label ?? strategy;
  const selectedBureauLabels  = BUREAUS.filter((b) => bureaus.has(b.id)).map((b) => b.label);

  // Emotional framing based on results
  const resultFraming = (() => {
    if (!results.risk_score) return null;
    if (results.risk_score <= 30) return { label: "Strong foundation", color: "text-emerald-400", note: "Your report shows relatively few adverse items. Focus on maintaining momentum." };
    if (results.risk_score <= 60) return { label: "Active recovery opportunity", color: "text-amber-400", note: "Your report contains items worth addressing. A structured approach produces real results." };
    return { label: "Clear path forward identified", color: "text-orange-400", note: "Significant adverse items found — but every item on this list is a potential action. You now have a specific plan." };
  })();

  return (
    <section className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2">
          <Target size={14} className="text-gold" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Recovery Intelligence Brief</p>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          {resultFraming?.label ?? "Audit Results"}
        </h1>
        <p className="mt-1.5 text-sm text-slate-400 max-w-xl">
          {resultFraming?.note ?? `${results.total_recommendations} items identified across your report.`}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          {results.total_recommendations} recovery target{results.total_recommendations !== 1 ? "s" : ""} identified
          {lockedCount > 0 ? ` · ${lockedCount} require a higher plan` : " · full access"}
          {" "}· AI analysis — verify before acting
        </p>
      </div>

      {/* ── Risk + Summary ────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.risk_score != null && <RiskScore score={results.risk_score} />}
        {s && (
          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 px-6 py-5 space-y-3 sm:col-span-1 lg:col-span-2">
            <p className="text-xs uppercase tracking-widest text-slate-500">Report Intelligence</p>
            <p className="text-sm font-semibold text-slate-100">
              {results.total_recommendations} strategic recovery targets detected across your report
            </p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                ["Total Accounts",   s.total_accounts],
                ["Adverse Items",    s.negative_accounts],
                ["Collections",      s.collections],
                ["Late Payments",    s.late_payments],
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

      {/* ── Grouped recommendations ───────────────────────────────────────── */}
      {(() => {
        const unlocked = results.recommendations.filter((r) => !r.locked);
        const locked   = results.recommendations.filter((r) =>  r.locked);
        const startHere = unlocked.filter((r) => r.severity === "high");
        const active    = unlocked.filter((r) => r.severity === "medium");
        const longTerm  = unlocked.filter((r) => r.severity === "low");

        const RecCard = ({ rec }: { rec: Recommendation }) => {
          const cfg = SEV_CONFIG[rec.severity] ?? SEV_CONFIG.low;
          const { Icon } = cfg;
          const checked = recChecked.has(rec.id);
          return (
            <div
              onClick={() => toggleRec(rec.id)}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                checked
                  ? "border-gold/40 bg-gold/5"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {checked
                    ? <CheckSquare size={15} className="text-gold" />
                    : <Square      size={15} className="text-slate-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.badge}`}>
                      <Icon size={9} />{rec.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200 leading-snug">{rec.title}</p>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{rec.description}</p>
                </div>
              </div>
            </div>
          );
        };

        const GroupLabel = ({ label, count, accent }: { label: string; count: number; accent: string }) => (
          <div className={`flex items-center gap-2 mb-2 mt-4 first:mt-0`}>
            <span className={`text-xs font-semibold uppercase tracking-widest ${accent}`}>{label}</span>
            <span className="text-xs text-slate-700">({count})</span>
          </div>
        );

        return (
          <div className="space-y-1">
            {/* Start Here group */}
            {startHere.length > 0 && (
              <div>
                <GroupLabel label="Start Here" count={startHere.length} accent="text-red-400" />
                <div className="grid gap-2 sm:grid-cols-2">
                  {startHere.map((r) => <RecCard key={r.id} rec={r} />)}
                </div>
              </div>
            )}

            {/* Active Targets group */}
            {active.length > 0 && (
              <div>
                <GroupLabel label="Active Targets" count={active.length} accent="text-amber-400" />
                <div className="grid gap-2 sm:grid-cols-2">
                  {active.map((r) => <RecCard key={r.id} rec={r} />)}
                </div>
              </div>
            )}

            {/* Long-Term group */}
            {longTerm.length > 0 && (
              <div>
                <GroupLabel label="Long-Term Improvement" count={longTerm.length} accent="text-slate-400" />
                <div className="grid gap-2 sm:grid-cols-2">
                  {longTerm.map((r) => <RecCard key={r.id} rec={r} />)}
                </div>
              </div>
            )}

            {/* Locked — aspirational framing */}
            {locked.length > 0 && (
              <div className="mt-4 rounded-2xl border border-slate-800/60 bg-slate-900/30 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/40">
                  <div className="flex items-center gap-2">
                    <Lock size={12} className="text-slate-600" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                      {locked.length} additional action{locked.length !== 1 ? "s" : ""} — Journeyman+
                    </p>
                  </div>
                  <Link
                    href="/dashboard/upgrade"
                    onClick={() => track("upgrade_cta_clicked", { from_tier: "APPRENTICE", to_tier: "JOURNEYMAN", context: "results_locked_section" })}
                    className="text-xs font-semibold text-gold hover:underline"
                  >
                    Unlock →
                  </Link>
                </div>
                <div className="divide-y divide-slate-800/30">
                  {locked.map((r) => {
                    const cfg = SEV_CONFIG[r.severity] ?? SEV_CONFIG.low;
                    const { Icon } = cfg;
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-5 py-3 opacity-50">
                        <Lock size={12} className="text-slate-700 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.badge}`}>
                              <Icon size={9} />{r.severity}
                            </span>
                            <p className="text-sm text-slate-400 truncate">{r.title}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Value-first upgrade block */}
                <div className="px-5 py-4 border-t border-slate-800/40 bg-gold/5">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Journeyman unlocks all {locked.length} additional actions, advanced dispute workflows,
                    20 AI questions per month, and bureau-specific targeting.
                  </p>
                  <Link
                    href="/dashboard/upgrade"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold text-gold hover:bg-gold/20 transition-colors"
                  >
                    Advance to Journeyman — $19/month <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            )}

            {unlocked.length === 0 && locked.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-10 text-center">
                <p className="text-sm text-slate-500">No recommendations identified. Your report looks clean.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Strategic Dispute Generator ───────────────────────────────────── */}
      {unlockedCount > 0 && !showPreview && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Strategic Dispute Generator</p>
          </div>

          {/* Accounts Under Review */}
          {negativeAccounts.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">
                Accounts under review — {accChecked.size} of {negativeAccounts.length} selected
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {negativeAccounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    checked={accChecked.has(acc.id)}
                    onToggle={() => toggleAcc(acc.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bureau Targeting */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 size={13} className="text-slate-500" />
                <span className="text-xs text-slate-500 font-medium">Targeting</span>
              </div>
              {BUREAUS.map(({ id: bid, label }) => {
                const active = bureaus.has(bid);
                return (
                  <button
                    key={bid}
                    onClick={() => toggleBureau(bid)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                        : "border-slate-700 text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strategy Selector + Explainer */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium shrink-0">Strategy</span>
                <select
                  value={strategy}
                  onChange={(e) => { setStrategy(e.target.value); setShowStrategy(true); auditFunnelEvents.strategyChanged(e.target.value); }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold/50"
                >
                  {STRATEGIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button
                  onClick={() => setShowStrategy((v) => !v)}
                  className="text-xs text-slate-500 hover:text-gold transition-colors flex items-center gap-1"
                >
                  Why this? {showStrategy ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${strength.color}`}>{strength.label}</span>
                <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.barColor}`} style={{ width: `${strength.pct}%` }} />
                </div>
              </div>
            </div>

            {showStrategy && strategyDetail && (
              <div className="border-t border-slate-800 px-4 py-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">When to use</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{strategyDetail.when}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Expected outcome</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{strategyDetail.outcome}</p>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Timeline</p>
                    <p className="text-xs text-slate-300 flex items-center gap-1"><Clock size={10} className="text-gold" />{strategyDetail.timeline}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Legal basis</p>
                    <p className="text-xs text-gold">{strategyDetail.basis}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Assertiveness</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= strategyDetail.aggression ? "bg-gold/70" : "bg-slate-700"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{strategyDetail.tone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Context Enhancement */}
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <button
              onClick={() => setShowContext((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-gold" />
                <span className="text-sm font-medium text-slate-200">Strengthen your letter</span>
                {hasContext && (
                  <span className="rounded-full bg-gold/20 border border-gold/30 px-2 py-0.5 text-xs text-gold">
                    +{contextFlags.size + (contextNotes.trim() ? 1 : 0)} added
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-600 hidden sm:block">Add context to improve personalization</span>
                {showContext ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
              </div>
            </button>
            {showContext && (
              <div className="border-t border-slate-800 px-4 py-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {CONTEXT_FLAGS.map(({ id, label }) => {
                    const active = contextFlags.has(id);
                    return (
                      <button key={id} onClick={() => toggleFlag(id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-gold/40 bg-gold/10 text-gold" : "border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}
                      >
                        {active && "✓ "}{label}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={contextNotes}
                  onChange={(e) => setContextNotes(e.target.value)}
                  placeholder="Additional context — settlement attempts, prior communications, hardship details…"
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-slate-600 resize-none"
                />
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {recChecked.size > 0
                ? `${recChecked.size} target${recChecked.size !== 1 ? "s" : ""} · ${selectedBureauLabels.join(", ")} · ${selectedStrategyLabel}`
                : "Select recovery targets above to generate"}
            </div>
            <div className="flex items-center gap-2">
              {recChecked.size > 0 && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:border-slate-600 transition-colors"
                >
                  <Eye size={14} /> Preview
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={recChecked.size === 0 || generating}
                className="rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {generating ? "Generating…" : "Generate Strategic Dispute"}
              </button>
            </div>
          </div>

          {disputeError && (
            <div className="rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-400">{disputeError}</div>
          )}

          {/* Trust + compliance reminder before generating */}
          <div className="flex items-start gap-2 rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3">
            <Shield size={11} className="text-gold shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Plutus generates educational dispute letter frameworks based on your report data.
              <strong className="text-slate-500"> Review every letter carefully before sending.</strong>
              {" "}Results vary — no outcome is guaranteed.
              AI analysis is educational only and not legal advice.
              For complex situations, consult a licensed consumer protection attorney.
            </p>
          </div>
        </div>
      )}

      {/* ── Dispute Preview Panel ─────────────────────────────────────────── */}
      {showPreview && (
        <div className="rounded-2xl border border-gold/30 bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-gold" />
              <p className="text-sm font-semibold text-slate-100">Dispute Preview</p>
            </div>
            <button onClick={() => setShowPreview(false)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <ArrowLeft size={11} /> Adjust
            </button>
          </div>
          <div className="px-5 py-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Strategy</p>
              <p className="text-sm font-semibold text-slate-200">{selectedStrategyLabel}</p>
              <p className="text-xs text-slate-500 mt-0.5">{strategyDetail?.basis}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Targeting</p>
              <div className="flex flex-wrap gap-1">
                {selectedBureauLabels.map((b) => (
                  <span key={b} className="text-xs rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 px-2 py-0.5">{b}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Targets Selected</p>
              <p className="text-sm font-semibold text-slate-200">{recChecked.size} recovery target{recChecked.size !== 1 ? "s" : ""}</p>
              {hasContext && <p className="text-xs text-gold mt-0.5">+ context added</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Letter Strength</p>
              <p className={`text-sm font-bold ${strength.color}`}>{strength.label}</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${strength.barColor}`} style={{ width: `${strength.pct}%` }} />
              </div>
            </div>
          </div>

          {/* Accounts in preview */}
          {negativeAccounts.filter((a) => accChecked.has(a.id)).length > 0 && (
            <div className="border-t border-slate-800 px-5 py-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Accounts Included</p>
              <div className="space-y-1.5">
                {negativeAccounts.filter((a) => accChecked.has(a.id)).map((acc) => (
                  <div key={acc.id} className="flex items-center gap-3 text-xs">
                    <span className="font-medium text-slate-200">{acc.creditor_name}</span>
                    <span className="text-slate-600 font-mono">•{acc.id.slice(-4).toUpperCase()}</span>
                    {acc.balance != null && <span className="text-slate-500">${acc.balance.toLocaleString()}</span>}
                    {acc.status && <span className="text-red-400">{acc.status}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-800 px-5 py-4 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {generating ? "Generating…" : "Generate Strategic Dispute"} <ArrowRight size={14} />
            </button>
          </div>

          {disputeError && (
            <div className="mx-5 mb-4 rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-400">{disputeError}</div>
          )}
        </div>
      )}

      {/* ── Training Intelligence — advisory, secondary ────────────────────── */}
      {signals.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer py-2 list-none">
            <Shield size={11} className="text-slate-600" />
            <span className="text-xs text-slate-600 group-open:text-slate-400 transition-colors">
              Recommended learning based on your report ({signals.length} module{signals.length !== 1 ? "s" : ""})
            </span>
            <ChevronDown size={11} className="text-slate-700 group-open:rotate-180 transition-transform ml-auto" />
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {signals.slice(0, 3).map((sig) => {
              const colorCls = SEVERITY_COLORS[sig.severity] ?? "border-slate-700 bg-slate-800/40 text-slate-400";
              return (
                <Link
                  key={sig.key}
                  href={`/dashboard/academy/${sig.moduleSlug}`}
                  className="group/card rounded-lg border border-slate-800 bg-slate-900/30 p-3 hover:border-slate-700 transition-colors"
                >
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${colorCls} mb-1.5`}>
                    {sig.label}
                  </span>
                  <p className="text-xs font-medium text-slate-400 group-hover/card:text-slate-200 transition-colors">
                    Module {String(sig.moduleNum).padStart(2, "0")} — {sig.moduleTitle}
                  </p>
                </Link>
              );
            })}
          </div>
        </details>
      )}

      <div className="flex justify-end pt-2">
        <Link
          href="/dashboard/audit/start"
          className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300"
        >
          Run Another Audit
        </Link>
      </div>
    </section>
  );
}
