"use client";

import { useEffect, useState } from "react";

type Eligibility = {
  discountedEligible: boolean;
  usedDiscountedIn365Days: number;
  nextEligibleDate: string | null;
  price: number;
  message: string;
};

export default function StrategySessionPage() {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);

  useEffect(() => {
    fetch("/api/consultations/eligibility")
      .then((r) => r.json())
      .then(setEligibility);
  }, []);

  const book = async () => {
    const res = await fetch("/api/consultations/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Strategy Session</h1>
      <p className="mt-2 text-slate-300">Base rate: $200/hour.</p>
      {eligibility && (
        <div className="mt-4 rounded border border-slate-700 bg-card p-4">
          <p>{eligibility.message}</p>
          <p>Next eligible discounted booking date: {eligibility.nextEligibleDate ? new Date(eligibility.nextEligibleDate).toLocaleDateString() : "Eligible now"}</p>
          <p className="mt-2 font-semibold">Current checkout price: ${(eligibility.price / 100).toFixed(2)}</p>
        </div>
      )}
      <button onClick={book} className="mt-4 rounded bg-accent px-4 py-2">Proceed to Checkout</button>
    </div>
  );
}
