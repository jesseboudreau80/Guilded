"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Shield, ArrowLeft, CheckCircle } from "lucide-react";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.forgotPassword(email.trim());
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.detail ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <Shield size={18} className="text-gold" />
          <Link href="/" className="text-base font-bold text-white">Plutus</Link>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8">
          {sent ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="h-12 w-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={22} className="text-emerald-400" />
              </div>
              <h1 className="text-xl font-semibold text-slate-100">Check your email</h1>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                If an account with that email exists, we&apos;ve sent a reset link.
                The link expires in 1 hour.
              </p>
              <p className="mt-4 text-xs text-slate-600">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-gold hover:underline"
                >
                  try again
                </button>.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft size={13} /> Back to sign in
              </Link>
            </div>
          ) : (
            /* ── Request form ── */
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-slate-100">Reset your password</h1>
                <p className="mt-1.5 text-sm text-slate-400">
                  Enter your email and we&apos;ll send a reset link if an account exists.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-slate-600"
                />

                {error && (
                  <div className="rounded-xl bg-red-900/30 border border-red-900/60 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full rounded-xl bg-gold py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  <ArrowLeft size={13} /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-700">
          Plutus · Educational platform · Not legal advice
        </p>
      </div>
    </div>
  );
}
