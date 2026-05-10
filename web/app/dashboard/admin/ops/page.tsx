import Link from "next/link";
import { Shield, ChevronLeft, CheckCircle } from "lucide-react";
import { SectionHeader, TacticalPanel } from "@/components/ui/tactical";

function OpsSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <SectionHeader label={title} />
      <TacticalPanel noPad>
        <ul className="divide-y divide-slate-800">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3">
              <CheckCircle size={13} className="text-gold/60 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300 leading-snug">{item}</p>
            </li>
          ))}
        </ul>
      </TacticalPanel>
    </div>
  );
}

export default function OpsGuidePage() {
  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/admin" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3 transition-colors">
          <ChevronLeft size={12} /> Admin
        </Link>
        <div className="flex items-center gap-2.5">
          <Shield size={20} className="text-gold" />
          <h1 className="text-2xl font-semibold">Founder Operations Guide</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Daily and weekly operational checklists for running the Guilded beta.
        </p>
      </div>

      <OpsSection title="Daily Checklist (5 min)" items={[
        "Open /dashboard/admin — check signups_today and any incomplete audits",
        "Check support@guilded.finance inbox — respond to any messages within 24h",
        "Review recent_signups feed — if any user hasn't run an audit in 48h, consider a personal outreach email",
        "Check Stripe dashboard for any failed payments or subscription issues",
        "Review PostHog (if enabled) for any unusual drop-off in the audit funnel",
        "Check server logs (start.sh) for ERROR-level events — audit failures, AI timeouts, DB issues",
      ]} />

      <OpsSection title="Weekly Checklist (15 min)" items={[
        "Review admin/stats: week-over-week signups, audit completion rate, MAU/WAU",
        "Check module completion distribution — are users making it past Module 1?",
        "Review all FounderFeedback submissions from support inbox",
        "Check XP breakdown — which event types are generating most engagement?",
        "Review incomplete audits (uploaded but not completed) — consider email or in-app prompts",
        "Test one complete audit flow end-to-end (upload → verify → run → snapshot → results → dispute)",
        "Update /dashboard/admin/qa checklist if any flows have changed",
        "Review Stripe for MRR, churn, and upgrade/downgrade activity",
      ]} />

      <OpsSection title="First 10 Users Strategy" items={[
        "Invite 1-2 trusted testers first — get feedback before opening to more",
        "Send each user a personal welcome email from support@guilded.finance",
        "Ask every user to run an audit within 24h of signup — follow up personally if they haven't",
        "After each user's first audit, email them their risk score interpretation and next recommended module",
        "Collect feedback via FounderFeedback widget and direct email after first full flow completion",
        "For users who upgraded: send a personal thank-you and ask what made them decide to upgrade",
        "Track which module each user is on — prompt users who haven't opened Academy yet",
        "Review every dispute letter generated to ensure quality and tone are appropriate",
      ]} />

      <OpsSection title="Support Handling Workflow" items={[
        "Acknowledge within 24 business hours — use support confirmation email template in email.py",
        "Billing issues: handle same-day — Stripe dashboard gives full transaction history",
        "Bug reports: reproduce in dev environment, fix and deploy, notify user",
        "Feature requests: log in FounderFeedback pattern, thank user for beta participation",
        "AI quality concerns: review the conversation in logs, adjust system prompt if pattern",
        "Account deletion requests: manually delete user + cascade data, confirm by email",
        "Legal/compliance questions: direct to terms.page and ai-disclaimer.page, do not give legal advice",
      ]} />

      <OpsSection title="Beta Stabilization Priorities (Post-Launch)" items={[
        "Add email verification flow (SMTP via Resend — infrastructure ready, flow not built)",
        "Add forgot/reset password flow (token endpoint + Resend email — not yet built)",
        "Replace FounderFeedback mailto with POST /api/support/feedback endpoint",
        "Add PostHog npm package for richer analytics (CDN loader is active, npm gives type safety)",
        "Wire Sentry into ErrorBoundary.tsx onError prop (setup: npx @sentry/wizard -i nextjs)",
        "Add billing portal link via Stripe Customer Portal API (account page placeholder ready)",
        "Add streak persistence server-side — current streak uses client XP event history (max 10 events)",
        "Add mission completion persistence — currently session-only, no backend record",
        "Load test the audit pipeline with concurrent uploads",
      ]} />

      <OpsSection title="High-Risk Retention Points" items={[
        "Drop-off before first audit: mitigated by onboarding + daily mission, monitor signup→audit rate",
        "Drop-off after audit snapshot: ensure snapshot → training path is clear and emotionally reassuring",
        "AI limit friction (APPRENTICE 5 messages/week): ensure upgrade prompt is calm and capability-framed",
        "Module 1→2 drop-off: most users stop after first module — monitor academy completion funnel",
        "Long audit processing time (>60s): ProcessingTimeline manages this, but check for timeouts",
        "Confusion about educational-only nature: ensure AI disclaimer is visible and tone is clear",
        "Mobile friction: test every flow on iPhone 12 and Pixel 6 before first user invite",
      ]} />
    </section>
  );
}
