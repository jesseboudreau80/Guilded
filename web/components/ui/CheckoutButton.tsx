"use client";

import { useState } from "react";
import { useGuildedSession } from "@/lib/session";
import { stripeApi } from "@/lib/api";

type Props = {
  tier: string;
  label: string;
  className: string;
};

export function CheckoutButton({ tier, label, className }: Props) {
  const { data: session } = useGuildedSession();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleClick = async () => {
    if (!session?.user?.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await stripeApi.subscriptionCheckout(tier, session.user.accessToken);
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "Checkout failed. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className={className}>
        {loading ? "Redirecting…" : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
