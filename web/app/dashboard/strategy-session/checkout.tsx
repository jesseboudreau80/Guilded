"use client";

import { useState } from "react";
import { consultationsApi } from "@/lib/api";

export default function ConsultationCheckout({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleCheckout = async () => {
    setError(null);
    setLoading(true);
    try {
      const res  = await consultationsApi.checkout(token);
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "Checkout failed");
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
    <div className="mt-6">
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="rounded-xl bg-slate-600 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-500 disabled:opacity-50"
      >
        {loading ? "Redirecting…" : "Book Session"}
      </button>
    </div>
  );
}
