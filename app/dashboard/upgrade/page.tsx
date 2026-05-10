"use client";

const tiers = [
  ["JOURNEYMAN", "$9/month"],
  ["MASTER", "$39/month"],
  ["HERO", "$79/month"],
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
        {tiers.map(([tier, price]) => (
          <button key={tier} onClick={() => checkout(tier)} className="rounded border border-slate-700 bg-card p-4 text-left">
            <p className="font-semibold">{tier}</p>
            <p className="text-slate-300">{price}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
