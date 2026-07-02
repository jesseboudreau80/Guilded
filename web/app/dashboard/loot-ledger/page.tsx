import Link from "next/link";
import { redirect } from "next/navigation";
import { getGuildedSession } from "@/lib/auth";
import { ledgerApi } from "@/lib/api";
import { TrendingUp, TrendingDown, DollarSign, Plus, BookOpen, Shield } from "lucide-react";

type Account = {
  id:            string;
  name:          string;
  account_type:  string;
  balance_cents: number;
};

type Summary = {
  total_assets_cents: number;
  total_debts_cents:  number;
  net_worth_cents:    number;
  account_count:      number;
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking:       "Checking",
  savings:        "Savings",
  credit_card:    "Credit Card",
  student_loan:   "Student Loan",
  auto_loan:      "Auto Loan",
  mortgage:       "Mortgage",
  personal_loan:  "Personal Loan",
  medical_debt:   "Medical Debt",
  collection:     "Collection",
  other:          "Other",
};

function dollars(cents: number) {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function LootLedgerPage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const token = session.user.accessToken;

  let accounts: Account[] = [];
  let summary: Summary = {
    total_assets_cents: 0, total_debts_cents: 0,
    net_worth_cents: 0, account_count: 0,
  };

  try {
    const [accountsRes, summaryRes] = await Promise.all([
      ledgerApi.listAccounts(token),
      ledgerApi.summary(token),
    ]);
    if (accountsRes.ok) {
      const data = await accountsRes.json();
      accounts = Array.isArray(data.accounts) ? data.accounts : (Array.isArray(data) ? data : []);
    }
    if (summaryRes.ok) {
      summary = await summaryRes.json();
    }
  } catch { /* non-fatal — render with empty state */ }

  const hasAccounts = accounts.length > 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Financial Ledger</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Net Worth Tracker</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Track assets and debts to see your complete financial picture.
          </p>
        </div>

        {/* "Add account" — links to a form below; no separate page needed */}
      </div>

      {/* Summary row */}
      {hasAccounts && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={13} className="text-emerald-400" />
              <p className="text-xs text-slate-500 uppercase tracking-widest">Total Assets</p>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{dollars(summary.total_assets_cents)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={13} className="text-red-400" />
              <p className="text-xs text-slate-500 uppercase tracking-widest">Total Debts</p>
            </div>
            <p className="text-2xl font-bold text-red-400">{dollars(summary.total_debts_cents)}</p>
          </div>
          <div className={`rounded-xl border px-5 py-4 ${summary.net_worth_cents >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-slate-800 bg-slate-900/60"}`}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={13} className={summary.net_worth_cents >= 0 ? "text-emerald-400" : "text-slate-400"} />
              <p className="text-xs text-slate-500 uppercase tracking-widest">Net Worth</p>
            </div>
            <p className={`text-2xl font-bold ${summary.net_worth_cents >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {dollars(summary.net_worth_cents)}
            </p>
          </div>
        </div>
      )}

      {/* Account list */}
      {hasAccounts ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Accounts <span className="text-slate-700">({accounts.length})</span>
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="divide-y divide-slate-800">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200">{a.name}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {ACCOUNT_TYPE_LABELS[a.account_type] ?? a.account_type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${a.balance_cents >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {dollars(a.balance_cents)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 px-8 py-14 text-center">
          <div className="h-12 w-12 rounded-2xl border border-slate-700 bg-slate-800/60 flex items-center justify-center mx-auto mb-5">
            <DollarSign size={22} className="text-slate-500" />
          </div>
          <p className="text-base font-semibold text-slate-200">No accounts added yet</p>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            Add your assets and debts to track your net worth over time.
            Seeing the full picture is the first step toward improving it.
          </p>
          <p className="mt-4 text-xs text-slate-600">
            Account tracking coming soon. This feature is under development.
          </p>
        </div>
      )}

      {/* Educational note */}
      <div className="flex items-start gap-2 rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3">
        <Shield size={12} className="text-gold shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          This ledger is for personal tracking only and is not connected to your credit report.
          Your actual credit accounts are analyzed in the{" "}
          <Link href="/dashboard/audit/start" className="text-gold hover:underline">Credit Audit</Link>
          {" "}workflow.
        </p>
      </div>
    </section>
  );
}
