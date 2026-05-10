import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <div className="h-14 w-14 rounded-2xl border border-slate-700 bg-slate-800 flex items-center justify-center mb-6">
        <Shield size={24} className="text-slate-500" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-2">404</p>
      <h1 className="text-2xl font-semibold text-slate-100">Page not found</h1>
      <p className="mt-3 text-sm text-slate-500 max-w-sm leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Your recovery progress is safe.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={13} /> Back to home
        </Link>
      </div>
      <div className="mt-12 flex gap-4 text-xs text-slate-700">
        <Link href="/terms"         className="hover:text-slate-500">Terms</Link>
        <Link href="/privacy"       className="hover:text-slate-500">Privacy</Link>
        <Link href="/dashboard/support" className="hover:text-slate-500">Support</Link>
      </div>
    </div>
  );
}
