"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckSquare, Square, AlertTriangle, AlertCircle,
  Edit2, Check, X, Shield,
} from "lucide-react";
import { auditApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { ProcessingTimeline, type TimelineStage } from "@/components/ui/ProcessingTimeline";
import { track, auditFunnelEvents } from "@/lib/analytics";

// ── Types ─────────────────────────────────────────────────────────────────────

type PiiScanSummary = {
  ssn_count:            number;
  account_number_count: number;
  phone_count:          number;
  email_count:          number;
  dob_count:            number;
  total_detected:       number;
  safety_summary:       string;
  pdf_deleted:          boolean;
  text_minimized:       boolean;
};

type Account = {
  id:               string;
  creditor_name:    string;
  account_type:     string | null;
  account_number:   string | null;
  balance:          number | null;
  status:           string | null;
  negative_flag:    boolean;
  confidence:       "high" | "medium" | "low" | null;
  extraction_flags: string[] | null;
};

// ── Processing stages — structured telemetry (not chain-of-thought) ───────────

const ANALYSIS_STAGES: TimelineStage[] = [
  { id: "pages",       label: "Scanning report pages",              detail: "Processing all account entries across bureaus"     },
  { id: "accounts",    label: "Detecting account structures",        detail: "Identifying trade lines, balances, and status fields" },
  { id: "adverse",     label: "Analyzing adverse items",             detail: "Cataloging collections, charge-offs, and derogatory marks" },
  { id: "collections", label: "Cross-checking collections",          detail: "Evaluating FDCPA eligibility and collection account age" },
  { id: "utilization", label: "Evaluating utilization risk",         detail: "Computing per-card and aggregate credit usage ratios" },
  { id: "fcra",        label: "Checking FCRA compliance signals",    detail: "Identifying re-aging, duplicate entries, and reporting errors" },
  { id: "strategy",    label: "Building recovery intelligence",      detail: "Generating prioritized strategic action plan"       },
];

// ── Confidence indicator ───────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: string | null }) {
  if (!level || level === "high") return null;
  if (level === "low") return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
      <AlertCircle size={10} /> Review recommended
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500/5 px-2 py-0.5 text-xs text-yellow-500">
      <AlertTriangle size={10} /> Verify data
    </span>
  );
}

// ── Editable Account Card ─────────────────────────────────────────────────────

function AccountCard({
  account,
  checked,
  onToggle,
  onSave,
  saving,
}: {
  account:  Account;
  checked:  boolean;
  onToggle: () => void;
  onSave:   (updates: Partial<Account>) => Promise<void>;
  saving:   boolean;
}) {
  const [editing, setEditing]         = useState(false);
  const [name,    setName]            = useState(account.creditor_name);
  const [type,    setType]            = useState(account.account_type ?? "");
  const [balance, setBalance]         = useState(account.balance?.toString() ?? "");
  const [status,  setStatus]          = useState(account.status ?? "");
  const [accNum,  setAccNum]          = useState(account.account_number ?? "");

  const maskId = account.account_number
    ? `•${account.account_number}`
    : `•${account.id.slice(-4).toUpperCase()}`;

  const hasIssue = account.confidence === "low" || account.confidence === "medium";

  const handleSave = async () => {
    await onSave({
      creditor_name:  name.trim()   || account.creditor_name,
      account_type:   type.trim()   || (account.account_type ?? undefined),
      account_number: accNum.trim() || (account.account_number ?? undefined),
      balance:        balance ? parseFloat(balance) : (account.balance ?? undefined),
      status:         status.trim() || (account.status ?? undefined),
    } as Partial<Account>);
    setEditing(false);
  };

  return (
    <div className={`rounded-xl border transition-colors ${
      checked
        ? "border-gold/30 bg-gold/5"
        : hasIssue
        ? "border-amber-500/20 bg-amber-500/5"
        : "border-slate-800 bg-slate-900/40"
    }`}>
      {/* Header row */}
      <div
        onClick={() => !editing && onToggle()}
        className={`flex items-start gap-2.5 px-4 py-3 ${editing ? "" : "cursor-pointer"}`}
      >
        <div className="mt-0.5 shrink-0">
          {checked
            ? <CheckSquare size={15} className="text-gold" />
            : <Square     size={15} className="text-slate-600" />}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200 outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p className="text-sm font-semibold text-slate-200 truncate">{account.creditor_name}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="text-xs text-slate-500">{account.account_type ?? "Account"}</span>
            <span className="text-xs text-slate-600 font-mono">{maskId}</span>
            {account.balance != null && (
              <span className="text-xs text-slate-400">${account.balance.toLocaleString()}</span>
            )}
            {account.status && (
              <span className={`text-xs font-medium ${account.negative_flag ? "text-red-400" : "text-slate-400"}`}>
                {account.status}
              </span>
            )}
            <ConfidenceBadge level={account.confidence} />
          </div>
        </div>
        {!editing && (
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="shrink-0 rounded p-1 text-slate-600 hover:text-gold transition-colors"
            title="Correct extraction errors"
          >
            <Edit2 size={13} />
          </button>
        )}
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3 space-y-2">
          <p className="text-xs text-slate-500 mb-2">Correct any OCR extraction errors below:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Account Type",   value: type,    set: setType    },
              { label: "Balance ($)",    value: balance, set: setBalance },
              { label: "Status",         value: status,  set: setStatus  },
              { label: "Account #",      value: accNum,  set: setAccNum  },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <p className="text-xs text-slate-600 mb-1">{label}</p>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-slate-600"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-slate-950 hover:opacity-90 disabled:opacity-50"
            >
              <Check size={11} /> {saving ? "Saving…" : "Save Corrections"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              <X size={11} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditVerifyPage() {
  const { id }            = useParams<{ id: string }>();
  const { data: session, status: sessionStatus } = useGuildedSession();
  const router            = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [checked,  setChecked]  = useState<Set<string>>(new Set());
  const [piiScan,  setPiiScan]  = useState<PiiScanSummary | null>(null);
  const [fetching, setFetching] = useState(true);
  const [running,  setRunning]  = useState(false);
  const [runDone,  setRunDone]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const token = session?.user?.accessToken;
    if (!token) { setFetching(false); return; }

    Promise.all([
      auditApi.accounts(id, token).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/audit/${id}/safety-receipt`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      }).then((r) => r.ok ? r.json() : null),
    ]).then(([accountData, safetyData]) => {
      const list = Array.isArray(accountData) ? accountData : [];
      setAccounts(list);
      setChecked(new Set(list.map((a: Account) => a.id)));
      if (list.length === 0) auditFunnelEvents.ocrEmpty(id);
      if (safetyData?.pii_scan && Object.keys(safetyData.pii_scan).length > 0) {
        setPiiScan(safetyData.pii_scan as PiiScanSummary);
      }
    })
    .catch(() => setError("Failed to load accounts."))
    .finally(() => setFetching(false));
  }, [id, session?.user?.accessToken, sessionStatus]);

  const toggle = (accId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(accId) ? next.delete(accId) : next.add(accId);
      return next;
    });
  };

  const handleSaveAccount = async (accountId: string, updates: Partial<Account>) => {
    if (!session?.user?.accessToken) return;
    setSaving(true);
    try {
      const res = await auditApi.updateAccount(id, accountId, updates as Record<string, unknown>, session.user.accessToken);
      if (res.ok) {
        const updated = await res.json();
        setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, ...updated } : a));
      }
    } catch { /* non-critical */ }
    finally { setSaving(false); }
  };

  const handleRun = async () => {
    if (!session?.user?.accessToken) return;
    setRunning(true);
    setRunDone(false);
    setError(null);

    track("audit_accounts_verified", { audit_id: id, account_count: checked.size });

    try {
      await auditApi.verify(id, Array.from(checked), session.user.accessToken);
      const res  = await auditApi.run(id, session.user.accessToken);
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Analysis failed. Please try again.");
        setRunning(false);
        return;
      }

      setRunDone(true);
      setTimeout(() => {
        router.push(`/dashboard/audit/${id}/results`);
      }, 800);
    } catch {
      setError("Network error. Please try again.");
      setRunning(false);
    }
  };

  // ── States ──────────────────────────────────────────────────────────────────

  if (fetching) return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={13} className="text-gold" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Extraction Review</p>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Verify Accounts</h1>
      </div>
      <div className="space-y-3 animate-pulse">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-20 rounded-xl bg-slate-800/60" />
        ))}
      </div>
    </section>
  );

  if (running) return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        Building Recovery Intelligence
      </h1>
      <p className="mt-1 text-sm text-slate-400">
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
            subtitle="AI-assisted strategic analysis · Educational use only"
          />
        </div>
      </div>
    </section>
  );

  // ── Main verify view ────────────────────────────────────────────────────────

  const lowConfCount   = accounts.filter((a) => a.confidence === "low" || a.confidence === "medium").length;
  const negativeCount  = accounts.filter((a) => a.negative_flag).length;

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={13} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              Step 2 of 3 · Extraction Review
            </p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            We detected {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Review the accounts extracted from your report.
            {negativeCount > 0 && (
              <span className="text-amber-400"> {negativeCount} flagged for adverse status.</span>
            )}
            {" "}Correct any errors before running your analysis.
          </p>
        </div>
        {/* Step indicator — small, desktop only */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 shrink-0 self-start">
          <span className="text-slate-700">Upload</span>
          <span className="h-px w-4 bg-slate-800" />
          <span className="font-semibold text-gold">Review</span>
          <span className="h-px w-4 bg-slate-800" />
          <span className="text-slate-700">Results</span>
        </div>
      </div>

      {/* Confidence warning */}
      {lowConfCount > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400">
              {lowConfCount} account{lowConfCount !== 1 ? "s" : ""} may need review
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              OCR extraction detected possible issues. Use the edit icon (✎) on each card to correct errors.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* ── Data Safety Receipt ─────────────────────────────────────────── */}
      {piiScan && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={13} className="text-emerald-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Data Safety Receipt
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
              Raw PDF deleted after extraction
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
              Text minimized before AI analysis
            </span>
            {piiScan.ssn_count > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-amber-400 shrink-0" />
                {piiScan.ssn_count} SSN{piiScan.ssn_count > 1 ? "s" : ""} blocked
              </span>
            )}
            {piiScan.account_number_count > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-amber-400 shrink-0" />
                {piiScan.account_number_count} account number{piiScan.account_number_count > 1 ? "s" : ""} masked (last 4 kept)
              </span>
            )}
            {piiScan.phone_count > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-amber-400 shrink-0" />
                {piiScan.phone_count} phone number{piiScan.phone_count > 1 ? "s" : ""} blocked
              </span>
            )}
            {piiScan.total_detected === 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
                No sensitive PII patterns detected
              </span>
            )}
          </div>
        </div>
      )}

      {/* Account cards */}
      {accounts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-800/40 px-6 py-8 text-center">
          <p className="text-sm text-slate-400">No accounts were detected in your report.</p>
          <p className="mt-2 text-xs text-slate-600">The PDF may be image-based or have an unsupported format.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              checked={checked.has(acc.id)}
              onToggle={() => toggle(acc.id)}
              onSave={(updates) => handleSaveAccount(acc.id, updates)}
              saving={saving}
            />
          ))}
        </div>
      )}

      {/* Desktop footer */}
      <div className="mt-6 hidden sm:flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">
            {checked.size} of {accounts.length} account{accounts.length !== 1 ? "s" : ""} selected for analysis
          </p>
          <p className="text-xs text-slate-700 mt-0.5">
            Educational analysis only · Not legal advice
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={checked.size === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Run Recovery Analysis
        </button>
      </div>

      {/* Mobile sticky CTA — fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[41] sm:hidden">
        <div className="bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 px-4 py-3 safe-bottom">
          <button
            onClick={handleRun}
            disabled={checked.size === 0}
            className="w-full rounded-xl bg-gold py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {checked.size === 0
              ? "Select accounts to analyze"
              : `Analyze ${checked.size} account${checked.size !== 1 ? "s" : ""}`}
          </button>
          <p className="mt-1.5 text-center text-xs text-slate-700">Educational analysis only · Not legal advice</p>
        </div>
      </div>
      {/* Mobile spacer so sticky bar doesn't overlap content */}
      <div className="h-20 sm:hidden" />
    </section>
  );
}
