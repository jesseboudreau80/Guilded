export const dynamic = "force-dynamic";

import Link from "next/link";
import { Shield, AlertTriangle } from "lucide-react";

export const metadata = { title: "AI Usage Disclaimer — Guilded" };

export default function AIDisclaimerPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-2.5 mb-8">
          <Shield size={18} className="text-gold" />
          <Link href="/" className="text-sm font-bold text-white">Guilded</Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle size={20} className="text-amber-400 shrink-0" />
          <h1 className="text-2xl font-semibold text-slate-100">AI Usage Disclaimer</h1>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 mb-8">
          <p className="text-sm font-semibold text-amber-400 mb-1">Educational Guidance Only</p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Guild Counsel and all AI-generated content on Guilded is provided for educational and informational purposes only. It is not legal advice, financial advice, or professional credit counseling.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-slate-400">
          <div>
            <h2 className="text-base font-semibold text-slate-100 mb-2">What Guild Counsel Is</h2>
            <p>Guild Counsel is an AI assistant trained to provide general educational information about credit recovery, consumer protection law (FCRA, FDCPA), dispute strategies, and financial literacy. It is designed to help you understand your options and build knowledge — not to provide personalized professional advice.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-100 mb-2">What Guild Counsel Is Not</h2>
            <ul className="space-y-2">
              {[
                "An attorney or licensed legal advisor",
                "A licensed financial advisor or credit counselor",
                "A representative of any credit bureau or government agency",
                "A guarantee of any specific outcome",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-600 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-100 mb-2">AI Limitations</h2>
            <p>AI language models can produce inaccurate, outdated, or incomplete information. Laws vary by state and jurisdiction. Credit bureau policies change. Always verify AI-generated advice with authoritative sources before taking action.</p>
            <p className="mt-2">Generated dispute letters and documents are templates for educational reference. Review them carefully and adapt them to your specific situation before use.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-100 mb-2">Your Responsibility</h2>
            <p>You are solely responsible for any actions you take based on information from this platform, including documents submitted to credit bureaus, creditors, or courts. We strongly encourage consulting with a licensed consumer law attorney or NFCC-member credit counselor for situations involving legal action, bankruptcy, or complex disputes.</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-100 mb-2">Free Resources</h2>
            <p>For free, authoritative credit help, consider contacting:</p>
            <ul className="mt-2 space-y-1">
              <li>Consumer Financial Protection Bureau (CFPB) — consumerfinance.gov</li>
              <li>Federal Trade Commission (FTC) — consumer.ftc.gov</li>
              <li>National Foundation for Credit Counseling — nfcc.org</li>
              <li>AnnualCreditReport.com — free reports from all three bureaus</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-600">
          <Link href="/terms" className="hover:text-slate-400">Terms of Service</Link>
          {" · "}
          <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
