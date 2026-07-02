"use client";

import Link from "next/link";
import { ArrowRight, FileText, BookOpen, Shield, CheckCircle } from "lucide-react";

type ContinueItem = {
  icon:    React.ElementType;
  label:   string;
  detail:  string;
  href:    string;
  accent:  string;
  cta:     string;
};

type Props = {
  incompleteAuditId: string | null;
  incompleteAuditStatus: string | null;
  inProgressModuleSlug: string | null;
  inProgressModuleTitle: string | null;
  hasNoAudit: boolean;
  hasNoModules: boolean;
};

export function ContinueBar({
  incompleteAuditId,
  incompleteAuditStatus,
  inProgressModuleSlug,
  inProgressModuleTitle,
  hasNoAudit,
  hasNoModules,
}: Props) {
  const items: ContinueItem[] = [];

  // First priority: incomplete audit
  if (incompleteAuditId) {
    const auditHref = incompleteAuditStatus === "uploaded"
      ? `/dashboard/audit/${incompleteAuditId}/verify`
      : `/dashboard/audit/${incompleteAuditId}/results`;
    const auditDetail = incompleteAuditStatus === "uploaded"
      ? "Accounts extracted — confirm to run analysis"
      : "Analysis running — view your results";
    items.push({
      icon:   FileText,
      label:  "Audit in progress",
      detail: auditDetail,
      href:   auditHref,
      accent: "border-amber-500/20 bg-amber-500/5",
      cta:    "Continue",
    });
  }

  // Second priority: in-progress module
  if (inProgressModuleSlug && inProgressModuleTitle) {
    items.push({
      icon:   BookOpen,
      label:  inProgressModuleTitle,
      detail: "Academy module in progress",
      href:   `/dashboard/academy/${inProgressModuleSlug}`,
      accent: "border-blue-500/20 bg-blue-500/5",
      cta:    "Continue reading",
    });
  }

  // First-time nudge: no audit yet
  if (hasNoAudit && !incompleteAuditId) {
    items.push({
      icon:   Shield,
      label:  "Run your first credit audit",
      detail: "Upload your report to identify every dispute opportunity",
      href:   "/dashboard/audit/start",
      accent: "border-gold/20 bg-gold/5",
      cta:    "Start audit",
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.href} className={`relative overflow-hidden rounded-xl border px-4 py-3.5 ${item.accent}`}>
            <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl bg-current opacity-30" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Icon size={15} className="shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{item.label}</p>
                  <p className="text-xs text-slate-500 truncate">{item.detail}</p>
                </div>
              </div>
              <Link
                href={item.href}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
              >
                {item.cta} <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
