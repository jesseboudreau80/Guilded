import Link from "next/link";
import { redirect } from "next/navigation";
import { getGuildedSession } from "@/lib/auth";
import { Shield, FileText, ChevronRight, ArrowRight } from "lucide-react";

export default async function TemplatesPage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const STRATEGIES = [
    {
      title: "Accuracy Dispute",
      desc:  "Dispute inaccurate, incomplete, or unverifiable information under FCRA §611. The bureau must investigate within 30 days.",
      law:   "FCRA §611",
    },
    {
      title: "Debt Validation Letter",
      desc:  "Demand a debt collector validate the debt under FDCPA §809(b). Requires proof of original creditor, amount, and collection authority.",
      law:   "FDCPA §809(b)",
    },
    {
      title: "Goodwill Adjustment",
      desc:  "Request a creditor remove a late payment as a goodwill gesture. Reference your otherwise positive history and the impact on your financial goals.",
      law:   "No statutory requirement",
    },
    {
      title: "Pay-for-Delete Negotiation",
      desc:  "Offer payment in exchange for complete removal of a tradeline from all three bureaus. Must be agreed to in writing before payment.",
      law:   "No statutory requirement",
    },
  ];

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className="text-gold" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Dispute Templates</p>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Letter Strategies</h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Plutus generates dispute letters tailored to your specific accounts. Run a credit audit
          first — the AI identifies which strategy applies and generates a customized letter.
        </p>
      </div>

      {/* How it works + shortcut — side-by-side on desktop */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">

      <div className="rounded-xl border border-gold/20 bg-gold/5 px-5 py-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={13} className="text-gold" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">How generation works</p>
        </div>
        <ol className="space-y-2 text-sm text-slate-400">
          {[
            "Run a credit audit to identify your accounts and issues",
            "Select the recommendations you want to act on",
            "Choose a letter strategy",
            "Generate a customized letter ready to review and send",
          ].map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gold font-mono shrink-0">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
        <Link
          href="/dashboard/audit/start"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Run Credit Audit <ArrowRight size={14} />
        </Link>
      </div>

      {/* Strategy list */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Available Strategies
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {STRATEGIES.map((s) => (
            <div key={s.title} className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
              <div className="flex items-start gap-3">
                <FileText size={14} className="text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.desc}</p>
                  <p className="mt-2 text-xs text-slate-600">
                    <span className="text-slate-500">Legal basis:</span> {s.law}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Existing audits shortcut (second item in the 2-col grid) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4">
        <p className="text-sm font-medium text-slate-300 mb-1">Have a completed audit?</p>
        <p className="text-xs text-slate-500 mb-3">
          Go to your audit results to select accounts and generate letters immediately.
        </p>
        <Link
          href="/dashboard/audits"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:underline"
        >
          View My Audits <ChevronRight size={11} />
        </Link>
      </div>

      </div>{/* end 2-col grid */}

      <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-800 pt-4">
        All generated letters are educational examples. Review carefully before submitting to
        bureaus or creditors. See{" "}
        <Link href="/ai-disclaimer" className="hover:text-slate-400 underline-offset-2 hover:underline">
          AI Disclaimer
        </Link>.
      </p>
    </section>
  );
}
