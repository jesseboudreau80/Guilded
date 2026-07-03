import Link from "next/link";

const items = [
  ["Dashboard", "/dashboard"],
  ["My Journey", "/dashboard/journey"],
  ["Modules", "/dashboard/modules"],
  ["Templates", "/dashboard/templates"],
  ["Arbitration", "/dashboard/arbitration"],
  ["AI Assistant", "/dashboard/ai"],
  ["Strategy Session", "/dashboard/strategy-session"],
  ["Account", "/dashboard/account"],
  ["Upgrade", "/dashboard/upgrade"],
] as const;

export function Sidebar() {
  return (
    <aside className="min-h-screen w-64 border-r border-slate-200 bg-card p-5">
      <h2 className="mb-8 text-xl font-bold text-emerald-700">Plutus</h2>
      <nav className="space-y-1">
        {items.map(([label, href]) => (
          <Link key={href} href={href} className="block rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
