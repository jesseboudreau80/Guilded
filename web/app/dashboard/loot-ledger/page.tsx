import { redirect } from "next/navigation";
import { getGuildedSession } from "@/lib/auth";
import { ledgerApi } from "@/lib/api";

type Account = {
  id: string;
  name: string;
  account_type: string;
  balance_cents: number;
};

type Summary = {
  total_assets_cents: number;
  total_debts_cents: number;
  net_worth_cents: number;
  account_count: number;
};

function dollars(cents: number) {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default async function LootLedgerPage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const token = session.user.accessToken;

  const [accountsRes, summaryRes] = await Promise.all([
    ledgerApi.listAccounts(token),
    ledgerApi.summary(token),
  ]);

  if (!accountsRes.ok || !summaryRes.ok) redirect("/");

  const { accounts }: { accounts: Account[] } = await accountsRes.json();
  const summary: Summary = await summaryRes.json();

  return (
    <section>
      <h1 className="text-3xl font-bold">Loot Ledger</h1>
      <p className="mt-2 text-slate-400">Track your assets, debts, and net worth.</p>

      {/* Net worth summary */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-800 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Assets</p>
          <p className="mt-2 text-2xl font-bold text-green-400">{dollars(summary.total_assets_cents)}</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Debts</p>
          <p className="mt-2 text-2xl font-bold text-red-400">{dollars(summary.total_debts_cents)}</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Net Worth</p>
          <p className={`mt-2 text-2xl font-bold ${summary.net_worth_cents >= 0 ? "text-green-400" : "text-red-400"}`}>
            {dollars(summary.net_worth_cents)}
          </p>
        </div>
      </div>

      {/* Accounts */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Accounts</h2>
          <a
            href="/dashboard/loot-ledger/new-account"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            + Add Account
          </a>
        </div>

        <div className="mt-4 grid gap-3">
          {accounts.length === 0 && (
            <p className="text-slate-500">No accounts yet. Add one to get started.</p>
          )}
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl bg-slate-800 p-4">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-slate-500">{a.account_type.replace("_", " ")}</p>
              </div>
              <p className={`text-lg font-semibold ${a.balance_cents >= 0 ? "text-green-400" : "text-red-400"}`}>
                {dollars(a.balance_cents)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
