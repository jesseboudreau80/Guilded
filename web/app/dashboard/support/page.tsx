"use client";

import Link from "next/link";
import { Mail, Shield, MessageSquare, ExternalLink, BookOpen } from "lucide-react";
import { FeedbackWidget } from "@/components/ui/FeedbackWidget";
import { FounderFeedback } from "@/components/beta/FounderFeedback";
import { SectionHeader } from "@/components/ui/tactical";
import { track } from "@/lib/analytics";

export default function DashboardSupportPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="mt-1 text-sm text-slate-400">
          We&apos;re here to help. Every message goes directly to the Plutus team.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">

        {/* ── Left column: contact + feedback ─────────────────────────── */}
        <div className="space-y-6">
          {/* Contact */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-5">
            <div className="flex items-center gap-2 mb-3">
              <Mail size={14} className="text-gold" />
              <p className="text-sm font-semibold text-slate-200">Email Us</p>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              For account issues, billing questions, or feature requests:
            </p>
            <a
              href="mailto:guilded@jesseboudreau.com"
              onClick={() => track("support_page_viewed")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:underline"
            >
              guilded@jesseboudreau.com <ExternalLink size={12} />
            </a>
            <p className="mt-2 text-xs text-slate-600">Typically responds within 24 hours · Beta users receive direct founder response</p>
          </div>

          {/* Founder feedback */}
          <div className="space-y-3">
            <SectionHeader label="Founder Feedback" />
            <FounderFeedback />
          </div>
        </div>

        {/* ── Right column: counsel + resources + meta ─────────────────── */}
        <div className="space-y-6">
          {/* Guild Counsel */}
          <div className="rounded-xl border border-gold/20 bg-gold/5 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={13} className="text-gold" />
              <p className="text-sm font-semibold text-gold">Ask Plutus Counsel</p>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              For credit strategy questions, dispute guidance, or understanding your audit findings,
              Plutus Counsel can answer immediately on any page.
            </p>
            <Link href="/dashboard/ai" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:underline">
              <MessageSquare size={11} /> Open Plutus Counsel
            </Link>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <SectionHeader label="Resources" />
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { icon: BookOpen, label: "AI Disclaimer",   href: "/ai-disclaimer",  desc: "What Plutus Counsel is and is not" },
                { icon: Shield,   label: "Privacy Policy",   href: "/privacy",        desc: "How your data is handled" },
              ].map(({ icon: Icon, label, href, desc }) => (
                <Link key={href} href={href} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 hover:border-slate-700 transition-colors">
                  <Icon size={13} className="text-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Page feedback */}
          <div className="border-t border-slate-800 pt-4">
            <FeedbackWidget label="Was this page helpful?" context="dashboard-support" />
          </div>
        </div>

      </div>
    </section>
  );
}
