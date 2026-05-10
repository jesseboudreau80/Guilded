"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, CheckCircle, Circle, RotateCcw, ChevronLeft } from "lucide-react";
import { SectionHeader, TacticalPanel } from "@/components/ui/tactical";

const LS_KEY = "guilded:qa-checklist";

type CheckItem = { id: string; label: string; critical?: boolean };

const QA_SECTIONS: { title: string; items: CheckItem[] }[] = [
  {
    title: "Authentication",
    items: [
      { id: "register",    label: "Register new account — form validates and redirects to dashboard", critical: true },
      { id: "login",       label: "Login with correct credentials — redirects to dashboard", critical: true },
      { id: "wrong-pass",  label: "Login with wrong password — shows clear error, does not crash" },
      { id: "logout",      label: "Logout — clears session and redirects to homepage", critical: true },
      { id: "session",     label: "Session persists across browser refresh" },
      { id: "middleware",  label: "/dashboard routes redirect to / if not authenticated", critical: true },
    ],
  },
  {
    title: "Onboarding",
    items: [
      { id: "ob-shows",   label: "Onboarding modal appears for new user (guilded:onboarded not set)" },
      { id: "ob-steps",   label: "All 3 steps navigate correctly with Back/Continue" },
      { id: "ob-skip",    label: "Skip dismisses modal and sets localStorage flag" },
      { id: "ob-cta",     label: '"Begin Your First Audit" navigates to /dashboard/audit/start' },
      { id: "ob-persist", label: "Modal does NOT appear on second login (localStorage flag set)" },
    ],
  },
  {
    title: "Credit Audit",
    items: [
      { id: "audit-upload",    label: "PDF upload accepts valid file, rejects non-PDF", critical: true },
      { id: "audit-size",      label: "File >20MB is rejected with clear error" },
      { id: "audit-timeline",  label: "Upload ProcessingTimeline shows correct stage progression" },
      { id: "audit-accounts",  label: "Verify page loads extracted accounts after upload", critical: true },
      { id: "audit-toggle",    label: "Account checkboxes toggle correctly" },
      { id: "audit-run",       label: "Generate Report triggers analysis ProcessingTimeline (7 stages)", critical: true },
      { id: "audit-snapshot",  label: "First audit → navigates to /snapshot (not /results)", critical: true },
      { id: "audit-snapshot2", label: "Snapshot shows risk score, phase, top issues, first action" },
      { id: "audit-results",   label: "Second audit → navigates directly to /results" },
      { id: "audit-results2",  label: "Results show recommendations, dispute strategy toolbar" },
      { id: "audit-resume",    label: "Dashboard shows 'Continue Audit' for incomplete audits" },
    ],
  },
  {
    title: "Guild Academy",
    items: [
      { id: "acad-list",     label: "Academy page loads all 7 modules in order" },
      { id: "acad-slug",     label: "Module slugs link to correct numbered .md files" },
      { id: "acad-content",  label: "Module content renders markdown with Guild Insight callouts" },
      { id: "acad-prevnext", label: "Previous/Next module navigation works on module pages" },
      { id: "acad-progress", label: "Sticky progress bar shows correct Module N/7" },
      { id: "acad-complete", label: "Mark Complete awards +50 XP and updates progress state", critical: true },
      { id: "acad-locked",   label: "Modules 5-7 show locked state for APPRENTICE tier" },
      { id: "acad-ordered",  label: "Recommended Recovery Path orders modules educationally" },
    ],
  },
  {
    title: "Dispute Engine",
    items: [
      { id: "disp-check",   label: "Unlocked recommendations have checkboxes; locked do not" },
      { id: "disp-strategy",label: "Strategy dropdown shows all 4 options" },
      { id: "disp-generate",label: "Generate Dispute Draft calls API and navigates to /disputes/{id}", critical: true },
      { id: "disp-page",    label: "Dispute page shows full letter, copy button, prev/next module" },
      { id: "disp-copy",    label: "Copy to clipboard works" },
    ],
  },
  {
    title: "Guild Counsel",
    items: [
      { id: "counsel-open",   label: "Counsel opens from header button" },
      { id: "counsel-float",  label: "Floating trigger button appears when drawer is closed" },
      { id: "counsel-send",   label: "Send message → AI response appears in chat", critical: true },
      { id: "counsel-chips",  label: "Quick action chips inject prompts" },
      { id: "counsel-nav",    label: "Conversation persists across page navigation" },
      { id: "counsel-mobile", label: "Mobile bottom sheet opens and dismisses correctly" },
      { id: "counsel-limit",  label: "Usage limit counter shows correctly" },
    ],
  },
  {
    title: "Billing & Upgrade",
    items: [
      { id: "billing-page",    label: "Upgrade page shows correct pricing for Journeyman / Master" },
      { id: "billing-checkout", label: "Checkout button initiates Stripe checkout session", critical: true },
      { id: "billing-account", label: "Account page shows current tier and subscription status" },
      { id: "billing-locked",  label: "Locked features (Arbitration) show upgrade prompt" },
    ],
  },
  {
    title: "Admin",
    items: [
      { id: "admin-access",  label: "/dashboard/admin accessible to admin email only", critical: true },
      { id: "admin-403",     label: "/dashboard/admin returns 403 for non-admin email" },
      { id: "admin-stats",   label: "Stats load: users, audits, academy, XP, disputes" },
      { id: "admin-recent",  label: "Recent activity feed shows signups, audits, disputes" },
    ],
  },
  {
    title: "Mobile",
    items: [
      { id: "mob-sidebar",   label: "Sidebar opens via hamburger, closes on navigation" },
      { id: "mob-dashboard", label: "Dashboard renders cleanly on 375px screen" },
      { id: "mob-audit",     label: "Audit upload flow is usable on mobile" },
      { id: "mob-counsel",   label: "Counsel bottom sheet slides up and is usable" },
      { id: "mob-academy",   label: "Academy campaign path stacks correctly on mobile" },
    ],
  },
];

export default function QAChecklistPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
      setChecked(new Set(saved));
    } catch { /* ignore */ }
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const reset = () => {
    setChecked(new Set());
    localStorage.removeItem(LS_KEY);
  };

  const allItems = QA_SECTIONS.flatMap((s) => s.items);
  const critical  = allItems.filter((i) => i.critical);
  const critPass  = critical.filter((i) => checked.has(i.id)).length;
  const totalPass = allItems.filter((i) => checked.has(i.id)).length;
  const readyToLaunch = critPass === critical.length;

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/admin" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3 transition-colors">
          <ChevronLeft size={12} /> Admin
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield size={20} className="text-gold" />
            <h1 className="text-2xl font-semibold">Pre-Launch QA Checklist</h1>
          </div>
          <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <RotateCcw size={11} /> Reset
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Check each flow before inviting beta users. Critical items ({critical.length} total) must pass.
        </p>
      </div>

      {/* Progress */}
      <TacticalPanel accent={readyToLaunch ? "emerald" : "default"}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-sm font-semibold ${readyToLaunch ? "text-emerald-400" : "text-slate-300"}`}>
            {readyToLaunch ? "✅ Critical flows verified — ready for beta" : `⚠️ ${critical.length - critPass} critical item${critical.length - critPass !== 1 ? "s" : ""} remaining`}
          </p>
          <span className="text-xs text-slate-500">{totalPass}/{allItems.length} total</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${readyToLaunch ? "bg-emerald-500/60" : "bg-gold/60"}`}
            style={{ width: `${Math.round((totalPass / allItems.length) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Critical: {critPass}/{critical.length} · Total: {totalPass}/{allItems.length}
        </p>
      </TacticalPanel>

      {/* Sections */}
      {QA_SECTIONS.map((section) => {
        const sectionPass = section.items.filter((i) => checked.has(i.id)).length;
        return (
          <div key={section.title} className="space-y-2">
            <SectionHeader
              label={section.title}
              count={`${sectionPass}/${section.items.length}`}
            />
            <TacticalPanel noPad>
              <div className="divide-y divide-slate-800">
                {section.items.map((item) => {
                  const done = checked.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-800/40 ${done ? "opacity-60" : ""}`}
                    >
                      {done
                        ? <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                        : <Circle     size={14} className="text-slate-700 shrink-0 mt-0.5"     />
                      }
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${done ? "text-slate-500 line-through decoration-slate-700" : "text-slate-300"}`}>
                          {item.label}
                        </p>
                      </div>
                      {item.critical && !done && (
                        <span className="shrink-0 text-xs text-amber-400 font-medium">critical</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </TacticalPanel>
          </div>
        );
      })}
    </section>
  );
}
