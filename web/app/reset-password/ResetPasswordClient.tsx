"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";
import { authApi } from "@/lib/api";

function ResetForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token") ?? "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  if (!token) {
    return (
      <div className="text-center">
        <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
        <h1 className="text-lg font-semibold text-slate-100">Invalid reset link</h1>
        <p className="mt-2 text-sm text-slate-400">
          This reset link is missing or malformed.
        </p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm text-gold hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res  = await authApi.resetPassword(token, password);
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "Reset failed. The link may have expired.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/"), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="h-12 w-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={22} className="text-emerald-400" />
        </div>
        <h1 className="text-xl font-semibold text-slate-100">Password updated</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your password has been changed. Redirecting to sign in…
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-gold hover:underline">
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Set new password</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Choose a strong password for your Guilded account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (8+ characters)"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-slate-600"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
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
          disabled={loading || !password || !confirm}
          className="w-full rounded-xl bg-gold py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <Shield size={18} className="text-gold" />
          <Link href="/" className="text-base font-bold text-white">Guilded</Link>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8">
          <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
