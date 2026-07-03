"use client";

const tiers = [
  ["JOURNEYMAN", "Journeyman", "$9/month", "Disputes & collections modules, 15 AI messages/month"],
  ["MASTER", "Master", "$39/month", "Bankruptcy & arbitration modules, 100 AI messages/month, $150 strategy sessions"],
  ["HERO", "Hero", "$79/month", "Full curriculum incl. the prosperity capstone, 300 AI messages/month, $100 strategy sessions"],
] as const;

export default function UpgradePage() {
  const checkout = async (tier: string) => {
    const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier }) });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Upgrade Plan</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {tiers.map(([tier, label, price, blurb]) => (
          <button key={tier} onClick={() => checkout(tier)} className="rounded border border-slate-200 bg-card p-4 text-left hover:border-emerald-600/50">
            <p className="font-semibold">{label}</p>
            <p className="text-slate-600">{price}</p>
            <p className="mt-2 text-xs text-slate-500">{blurb}</p>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Discounted strategy sessions require an active subscription and at least 2 successful billing cycles.
      </p>
    </div>
  );
}
