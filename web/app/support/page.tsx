export const dynamic = "force-dynamic";

import Link from "next/link";
import { Shield, Mail, BookOpen, MessageSquare, ExternalLink } from "lucide-react";

export const metadata = { title: "Support — Guilded" };

const QUICK_LINKS = [
  { icon: BookOpen,      label: "AI Disclaimer",  href: "/ai-disclaimer",  desc: "Understand what Guild Counsel is and is not" },
  { icon: Shield,        label: "Privacy Policy",  href: "/privacy",        desc: "How we handle your data" },
  { icon: MessageSquare, label: "Terms of Service", href: "/terms",          desc: "Platform terms and conditions" },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Nav */}
        <div className="flex items-center gap-2.5 mb-10">
          <Shield size={17} className="text-gold" />
          <Link href="/" className="text-sm font-bold text-white">Guilded</Link>
          <span className="text-slate-700 mx-1">·</span>
          <span className="text-sm text-slate-500">Support</span>
        </div>

        <h1 className="text-2xl font-semibold text-slate-100">Support Center</h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          We&apos;re a small team building a structured credit recovery platform.
          We read every message and respond within 24 hours on business days.
        </p>

        {/* Contact */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={15} className="text-gold" />
            <p className="text-sm font-semibold text-slate-200">Email Support</p>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">
            For account issues, billing questions, or anything you can&apos;t find in the platform:
          </p>
          <a
            href="mailto:guilded@jesseboudreau.com"
            className="inline-flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold hover:bg-gold/20 transition-colors"
          >
            guilded@jesseboudreau.com <ExternalLink size={12} />
          </a>
          <p className="mt-3 text-xs text-slate-600">
            Response time: typically within 24 hours · Beta access: direct founder response
          </p>
        </div>

        {/* Common topics */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Common Questions</p>
          <div className="space-y-2">
            {[
              { q: "Is Guilded a credit repair company?", a: "No. Guilded is an educational platform. We teach you to use your own legal rights under FCRA and FDCPA — we don't dispute anything on your behalf." },
              { q: "Are my documents secure?", a: "Credit report PDFs are processed to extract text, then deleted. We do not store raw PDF files. Extracted data is encrypted and accessible only to you." },
              { q: "Is the AI advice legally valid?", a: "Guild Counsel provides educational guidance only — not legal advice. Always verify AI-generated content before submitting to bureaus or creditors." },
              { q: "Can I cancel my subscription?", a: "Yes, at any time from your Account page. You keep access through the end of your billing period." },
            ].map(({ q, a }) => (
              <details key={q} className="rounded-xl border border-slate-800 bg-slate-900/40">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200 hover:text-white transition-colors list-none flex items-center justify-between">
                  {q}
                  <span className="text-slate-600 text-xs">▸</span>
                </summary>
                <p className="px-4 pb-4 text-sm text-slate-400 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Resources</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {QUICK_LINKS.map(({ icon: Icon, label, href, desc }) => (
              <Link key={href} href={href} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-slate-700 transition-colors">
                <Icon size={14} className="text-gold mb-2" />
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Dashboard link */}
        <div className="mt-8 border-t border-slate-800 pt-6 text-xs text-slate-600">
          Already have an account?{" "}
          <Link href="/dashboard" className="text-gold hover:underline">Go to your dashboard</Link>
        </div>
      </div>
    </div>
  );
}
