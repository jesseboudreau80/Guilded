"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Check, Printer, ArrowLeft, FileText, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { disputeEvents } from "@/lib/analytics";
import Link from "next/link";
import { disputeApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";

type DisputeRec = {
  id:       string;
  severity: "high" | "medium" | "low";
  title:    string;
};

type DisputeDraft = {
  id:                 string;
  audit_id:           string;
  strategy_type:      string;
  content:            string;
  created_at:         string;
  recommendation_ids: string[];
  recommendations:    DisputeRec[];
};

const STRATEGY_LABELS: Record<string, string> = {
  fcra_dispute:   "Accuracy Dispute",
  validation:     "Debt Validation",
  goodwill:       "Goodwill Request",
  pay_for_delete: "Pay-for-Delete",
};

const STRATEGY_COLORS: Record<string, string> = {
  fcra_dispute:   "border-blue-500/30 bg-blue-900/30 text-blue-400",
  validation:     "border-amber-500/30 bg-amber-900/30 text-amber-400",
  goodwill:       "border-emerald-500/30 bg-emerald-900/30 text-emerald-400",
  pay_for_delete: "border-purple-500/30 bg-purple-900/30 text-purple-400",
};

const SEV_CONFIG: Record<string, { Icon: React.ElementType; badge: string }> = {
  high:   { Icon: AlertTriangle, badge: "bg-red-400/10 border-red-400/30 text-red-400"       },
  medium: { Icon: AlertCircle,   badge: "bg-amber-400/10 border-amber-400/30 text-amber-400" },
  low:    { Icon: Info,          badge: "bg-slate-700 border-slate-600 text-slate-400"        },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export default function DisputeDraftPage() {
  const { id }                                    = useParams<{ id: string }>();
  const { data: session, status: sessionStatus } = useGuildedSession();

  const [draft,   setDraft]   = useState<DisputeDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const token = session?.user?.accessToken;
    if (!token) { setLoading(false); return; }
    disputeApi.get(id, token)
      .then((r) => r.json())
      .then((data) => {
        if (data.detail) { setError(data.detail); return; }
        setDraft(data);
      })
      .catch(() => setError("Failed to load dispute draft."))
      .finally(() => setLoading(false));
  }, [id, session?.user?.accessToken, sessionStatus]);

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard.writeText(draft.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      disputeEvents.copied(draft.id);
    });
  };

  const handlePrint = () => {
    if (draft) disputeEvents.printed(draft.id);
    window.print();
  };

  if (loading) {
    return (
      <section>
        <Link href="/dashboard/disputes" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={12} /> My Disputes
        </Link>
        <div className="mt-6 space-y-4 animate-pulse">
          <div className="h-6 w-48 rounded bg-slate-800" />
          <div className="h-4 w-32 rounded bg-slate-800" />
          <div className="mt-8 h-64 rounded-xl bg-slate-800/60" />
        </div>
      </section>
    );
  }

  if (error || !draft) {
    return (
      <section>
        <Link href="/dashboard/disputes" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6">
          <ArrowLeft size={12} /> My Disputes
        </Link>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-8 py-14 text-center">
          <FileText size={22} className="text-slate-600 mx-auto mb-4" />
          <p className="text-base font-semibold text-slate-200">Dispute draft not found</p>
          <p className="mt-2 text-sm text-red-400">{error ?? "This draft may have been deleted or the link is invalid."}</p>
          <Link
            href="/dashboard/disputes"
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={13} /> View All Disputes
          </Link>
        </div>
      </section>
    );
  }

  const strategyLabel = STRATEGY_LABELS[draft.strategy_type] ?? draft.strategy_type;
  const strategyColor = STRATEGY_COLORS[draft.strategy_type] ?? "border-slate-600 bg-slate-800 text-slate-400";

  return (
    <section>
      {/* ── Page header (hidden on print) ─────────────────────────────────── */}
      <div className="print:hidden">
        <Link
          href={`/dashboard/audit/${draft.audit_id}/results`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={12} /> Back to Audit Results
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dispute Draft</h1>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${strategyColor}`}>
                {strategyLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Generated {formatDate(draft.created_at)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            >
              {copied
                ? <><Check size={14} className="text-emerald-400" /> Copied</>
                : <><Copy size={14} /> Copy</>}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
      </div>

      {/* ── Print header (visible only on print) ───────────────────────── */}
      <div className="hidden print:block mb-6">
        <p className="text-xs uppercase tracking-widest text-slate-500">Dispute Letter — {strategyLabel}</p>
      </div>

      {/* ── Issues addressed ──────────────────────────────────────────────── */}
      {draft.recommendations.length > 0 && (
        <div className="mt-6 print:mt-0 print:mb-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2 print:text-slate-700">
            Issues addressed ({draft.recommendations.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {draft.recommendations.map((rec) => {
              const cfg = SEV_CONFIG[rec.severity] ?? SEV_CONFIG.low;
              const { Icon } = cfg;
              return (
                <span
                  key={rec.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.badge} print:border-slate-400 print:text-slate-700`}
                >
                  <Icon size={10} />
                  {rec.title}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Review reminder ───────────────────────────────────────────────── */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 print:hidden">
        <Info size={13} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-400">Review before sending</p>
          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
            This is an AI-generated educational framework. Read the letter carefully and verify all account details,
            creditor names, and dates against your actual credit report before mailing.
            This is not legal advice — results vary by situation.
          </p>
        </div>
      </div>

      {/* ── Document ──────────────────────────────────────────────────────── */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 print:border-0 print:rounded-none print:bg-white print:shadow-none">
        {/* Document label bar */}
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-800/60 px-5 py-3 print:hidden">
          <FileText size={14} className="text-slate-500" />
          <p className="text-xs uppercase tracking-widest text-slate-500">Dispute Letter</p>
        </div>

        {/* Letter content */}
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <pre className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap font-mono print:text-slate-900 print:font-mono print:text-sm">
            {draft.content}
          </pre>
        </div>
      </div>

      {/* ── CTAs (hidden on print) ────────────────────────────────────────── */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/audit/${draft.audit_id}/results`}
            className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
          >
            Generate Another Draft
          </Link>
          <Link
            href="/dashboard/audits"
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
          >
            My Audits
          </Link>
        </div>
        <p className="text-xs text-slate-600">
          Draft ID: {draft.id.slice(0, 8)}…
        </p>
      </div>
    </section>
  );
}
