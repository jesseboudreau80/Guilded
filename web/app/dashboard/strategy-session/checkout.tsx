"use client";

import { useState } from "react";
import { consultationsApi } from "@/lib/api";
import { Calendar } from "lucide-react";

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
    <div className="mt-5">
      {error && (
        <p className="mb-3 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Calendar size={14} />
        {loading ? "Redirecting to checkout…" : "Book Session"}
      </button>
    </div>
  );
}
