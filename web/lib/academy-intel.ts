/**
 * Academy Intelligence Layer
 *
 * Maps credit signals (from audit findings, account analysis, etc.)
 * to Guild Academy modules and lessons with contextual explanations.
 *
 * Used by:
 *  - SmartRecommendationPill  (signal → clickable academy link)
 *  - InsightTooltip           (term hover → module explanation)
 *  - AcademyReferenceCard     (audit section → expandable module card)
 *  - Audit results page       (derive signals from audit data)
 */

export type SignalSeverity = "critical" | "high" | "medium" | "low";

export type AcademySignal = {
  key:         string;
  label:       string;
  severity:    SignalSeverity;
  moduleSlug:  string;
  moduleNum:   number;
  moduleTitle: string;
  insight:     string;   // short "why this matters" explanation
  action:      string;   // what to do about it
};

// ── Signal → Module mapping ───────────────────────────────────────────────────

export const SIGNAL_MAP: Record<string, AcademySignal> = {
  has_collections: {
    key:         "has_collections",
    label:       "Collections",
    severity:    "critical",
    moduleSlug:  "the-attack-plan",
    moduleNum:   4,
    moduleTitle: "The Attack Plan",
    insight:     "Collection accounts follow separate rules from regular credit items. Ignoring them is the most common mistake in credit recovery.",
    action:      "Send a debt validation letter within 30 days of first collector contact. Module 4 covers the exact FDCPA script.",
  },
  has_charge_offs: {
    key:         "has_charge_offs",
    label:       "Charge-Offs",
    severity:    "critical",
    moduleSlug:  "the-attack-plan",
    moduleNum:   4,
    moduleTitle: "The Attack Plan",
    insight:     "A charge-off means the original creditor wrote off your debt. This does not cancel the debt — it often gets sold to collectors.",
    action:      "Negotiate a pay-for-delete or goodwill deletion. Module 4 has the negotiation framework.",
  },
  has_late_payments: {
    key:         "has_late_payments",
    label:       "Late Payments",
    severity:    "high",
    moduleSlug:  "the-attack-plan",
    moduleNum:   4,
    moduleTitle: "The Attack Plan",
    insight:     "Payment history is 35% of your FICO score — the single largest factor. Each late payment can cost 90-110 points.",
    action:      "Use goodwill letters to request removal. Module 4 covers the step-by-step process.",
  },
  has_negative_accounts: {
    key:         "has_negative_accounts",
    label:       "Negative Accounts",
    severity:    "high",
    moduleSlug:  "preparing-for-battle",
    moduleNum:   2,
    moduleTitle: "Preparing for Battle",
    insight:     "Each negative account is a dispute opportunity. Many contain inaccurate details that require the bureau to remove them under FCRA §611.",
    action:      "Catalog each account in a battle map. Module 2 shows you exactly how.",
  },
  high_utilization: {
    key:         "high_utilization",
    label:       "High Utilization",
    severity:    "high",
    moduleSlug:  "building-your-arsenal",
    moduleNum:   3,
    moduleTitle: "Building Your Arsenal",
    insight:     "Credit utilization above 30% is actively suppressing your score right now. It is the fastest factor to improve — changes appear within one billing cycle.",
    action:      "Pay balances before your statement closing date, not the due date. Module 3 has the full optimization strategy.",
  },
  fcra_violation: {
    key:         "fcra_violation",
    label:       "FCRA Violation",
    severity:    "critical",
    moduleSlug:  "the-attack-plan",
    moduleNum:   4,
    moduleTitle: "The Attack Plan",
    insight:     "Re-aged accounts, duplicate entries, and reporting past the 7-year window are FCRA violations. You may be entitled to damages.",
    action:      "File a formal dispute and CFPB complaint. Module 4 walks through the legal process.",
  },
  arbitration_candidate: {
    key:         "arbitration_candidate",
    label:       "Arbitration Opportunity",
    severity:    "high",
    moduleSlug:  "mastering-debt-arbitration",
    moduleNum:   7,
    moduleTitle: "Mastering Debt Arbitration",
    insight:     "Many creditors would rather settle than pay JAMS/AAA arbitration fees. A properly filed arbitration demand often produces immediate resolution.",
    action:      "Review your creditor agreements for arbitration clauses. Module 7 has the complete playbook — Master rank required.",
  },
  identity_risk: {
    key:         "identity_risk",
    label:       "Identity Risk",
    severity:    "critical",
    moduleSlug:  "enrichment-and-support",
    moduleNum:   6,
    moduleTitle: "Enrichment & Support",
    insight:     "Unrecognized accounts or fraud indicators require immediate action. A credit freeze stops new accounts from being opened in your name.",
    action:      "Place a credit freeze with all three bureaus immediately. Module 6 has the full identity protection protocol.",
  },
  high_risk_score: {
    key:         "high_risk_score",
    label:       "High Risk Score",
    severity:    "high",
    moduleSlug:  "understanding-credit-fundamentals",
    moduleNum:   1,
    moduleTitle: "Credit Fundamentals",
    insight:     "A high risk score means multiple factors are working against you. Understanding how each factor is weighted is the first step to targeting your recovery.",
    action:      "Start with Module 1 to build the mental model, then use your audit findings to prioritize your attack.",
  },
  critical_risk_score: {
    key:         "critical_risk_score",
    label:       "Critical Risk Score",
    severity:    "critical",
    moduleSlug:  "long-term-credit-restoration",
    moduleNum:   5,
    moduleTitle: "Long-Term Restoration",
    insight:     "A critical risk score typically means both negative items AND thin positive history. Removing negatives is only half the battle — you must also build new positive accounts.",
    action:      "Module 5 covers the 12-month systematic rebuild after your dispute campaign is underway.",
  },
  rebuild_credit: {
    key:         "rebuild_credit",
    label:       "Credit Rebuild Needed",
    severity:    "medium",
    moduleSlug:  "long-term-credit-restoration",
    moduleNum:   5,
    moduleTitle: "Long-Term Restoration",
    insight:     "Rebuilding credit requires a parallel track: removing negatives and adding positives simultaneously. Most people only do one.",
    action:      "Module 5 explains the secured card, authorized user, and credit builder loan strategy for systematic rebuilding.",
  },
};

// ── Severity ordering ─────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<SignalSeverity, number> = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
};

export function sortSignalsBySeverity(signals: AcademySignal[]): AcademySignal[] {
  return [...signals].sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
}

// ── Derive signals from audit data ────────────────────────────────────────────

type AuditSummary = {
  collections:       number;
  charge_offs:       number;
  late_payments:     number;
  negative_accounts: number;
};

type AuditRec = {
  title:       string;
  description: string;
  locked:      boolean;
};

export function deriveSignalsFromAudit(
  summary:        AuditSummary | null,
  riskScore:      number | null,
  recommendations: AuditRec[],
): AcademySignal[] {
  const keys = new Set<string>();

  if (summary) {
    if (summary.collections       > 0) keys.add("has_collections");
    if (summary.charge_offs       > 0) keys.add("has_charge_offs");
    if (summary.late_payments     > 0) keys.add("has_late_payments");
    if (summary.negative_accounts > 0) keys.add("has_negative_accounts");
  }

  if (riskScore !== null) {
    if (riskScore >= 75)      keys.add("critical_risk_score");
    else if (riskScore >= 65) keys.add("rebuild_credit");
    else if (riskScore >= 50) keys.add("high_risk_score");
  }

  const corpus = recommendations
    .filter((r) => !r.locked)
    .map((r) => `${r.title} ${r.description}`.toLowerCase())
    .join(" ");

  if (corpus.includes("utilization"))                              keys.add("high_utilization");
  if (corpus.includes("fcra") || corpus.includes("violation"))    keys.add("fcra_violation");
  if (corpus.includes("arbitration"))                             keys.add("arbitration_candidate");
  if (corpus.includes("identity") || corpus.includes("fraud"))   keys.add("identity_risk");

  return sortSignalsBySeverity(
    [...keys].map((k) => SIGNAL_MAP[k]).filter(Boolean),
  );
}

// ── XP label helpers ──────────────────────────────────────────────────────────

export const XP_EVENT_LABELS: Record<string, string> = {
  lesson_complete:  "Lesson completed",
  module_complete:  "Module completed",
  audit_complete:   "Credit audit completed",
  dispute_draft:    "Dispute letter drafted",
  daily_login:      "Daily training",
};

export const GUILD_RANK_COLORS: Record<string, string> = {
  "Apprentice":        "text-slate-400 border-slate-600",
  "Journeyman":        "text-blue-400 border-blue-500/30",
  "Strategist":        "text-indigo-400 border-indigo-500/30",
  "Master Negotiator": "text-gold border-gold/30",
  "Guild Commander":   "text-gold border-gold",
};

export const GUILD_RANK_BG: Record<string, string> = {
  "Apprentice":        "bg-slate-800",
  "Journeyman":        "bg-blue-900/30",
  "Strategist":        "bg-indigo-900/30",
  "Master Negotiator": "bg-gold/10",
  "Guild Commander":   "bg-gold/20",
};

export const SEVERITY_COLORS: Record<SignalSeverity, string> = {
  critical: "border-red-500/30 bg-red-900/20 text-red-400",
  high:     "border-amber-500/30 bg-amber-900/20 text-amber-400",
  medium:   "border-blue-500/30 bg-blue-900/20 text-blue-400",
  low:      "border-slate-600 bg-slate-800/60 text-slate-400",
};
