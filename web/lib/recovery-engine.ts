/**
 * Recovery Engine — canonical derived-state layer for Guilded.
 *
 * Pure TypeScript, no React imports. All functions are deterministic:
 * given the same inputs, they return the same output. Pages compute
 * their display state by passing API data through these functions.
 *
 * Import pattern in pages:
 *   import { getProtectionStatus, getMissions, ... } from "@/lib/recovery-engine";
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Input types (match API response shapes)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AuditInput = {
  id:         string;
  status:     string;
  risk_score: number | null;
  created_at: string;
};

export type ModuleProgressInput = {
  module_id: string;
  status:    "not_started" | "in_progress" | "completed";
};

export type AcademyModuleInput = {
  id:          string;
  slug:        string;
  title:       string;
  order_index: number;
  is_locked:   boolean;
};

export type XPEventInput = {
  event_type: string;
  xp_amount:  number;
  earned_at:  string;
  reference:  string | null;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Output types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type RecoveryPhase =
  | "assessment"            // No completed audit
  | "stabilization"         // Audit done, no training started
  | "active_dispute"        // Training underway, disputes being built
  | "momentum_building"     // Consistent activity, 3+ modules
  | "long_term_restoration"; // Advanced stage, 5+ modules or low risk

export type ProtectionLevel = "protected" | "monitoring" | "review" | "action_required";
export type MomentumTier    = "strong" | "building" | "starting" | "inactive";
export type RiskClass       = "low" | "moderate" | "high" | "critical";

export type ProtectionStatus = {
  level:   ProtectionLevel;
  label:   string;
  message: string;
  dot:     string;   // Tailwind color class for the indicator dot
  border:  string;   // Tailwind border class
  bg:      string;   // Tailwind bg class
  text:    string;   // Tailwind text class
};

export type MomentumState = {
  tier:        MomentumTier;
  label:       string;
  description: string;
  weekActions: number;
  streak:      number;
  isActive:    boolean;
};

export type RecoveryMission = {
  id:          string;
  label:       string;
  description: string;
  xp_reward:   number;
  href:        string;
};

export type RecommendedAction = {
  label:   string;
  href:    string;
  desc:    string;
  urgent:  boolean;
};

export type TimelineEvent = {
  id:    string;
  kind:  "module" | "audit" | "dispute" | "xp" | "rank";
  label: string;
  date:  string;
  ts:    number;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Momentum helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Count XP events in the last 7 days. */
export function momentum7Days(events: XPEventInput[]): number {
  const cutoff = Date.now() - 7 * 864e5;
  return events.filter((e) => new Date(e.earned_at).getTime() > cutoff).length;
}

/** Compute consecutive active recovery days ending today or yesterday. */
export function computeStreak(events: XPEventInput[]): number {
  if (!events.length) return 0;

  const pad = (n: number) => String(n).padStart(2, "0");
  const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const unique = [...new Set(events.map((e) => dayKey(new Date(e.earned_at))))].sort().reverse();
  const today  = new Date();

  let check  = today;
  let streak = 0;

  for (const day of unique) {
    if (day === dayKey(check)) {
      streak++;
      const prev = new Date(check);
      prev.setDate(prev.getDate() - 1);
      check = prev;
    } else break;
  }

  return streak;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Risk classification
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getRiskClass(score: number | null): RiskClass {
  if (score === null) return "moderate";
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "moderate";
  return "low";
}

export function getRiskLabel(score: number | null): string {
  const cls = getRiskClass(score);
  return { low: "Low Risk", moderate: "Moderate Risk", high: "Elevated Risk", critical: "Critical Risk" }[cls];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Recovery phase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getRecoveryPhase(
  audits:          AuditInput[],
  completedModCount: number,
  inProgress:      boolean,
  weekActions:     number,
): RecoveryPhase {
  const hasAudit = audits.some((a) => a.status === "completed");
  if (!hasAudit)             return "assessment";
  if (completedModCount === 0 && !inProgress) return "stabilization";
  if (completedModCount >= 5 || getRiskClass(audits[0]?.risk_score ?? null) === "low") return "long_term_restoration";
  if (completedModCount >= 3 && weekActions >= 3) return "momentum_building";
  return "active_dispute";
}

export const PHASE_LABELS: Record<RecoveryPhase, string> = {
  assessment:           "Assessment",
  stabilization:        "Stabilization",
  active_dispute:       "Active Dispute",
  momentum_building:    "Momentum Building",
  long_term_restoration: "Long-Term Restoration",
};

export const PHASE_DESCRIPTIONS: Record<RecoveryPhase, string> = {
  assessment:           "Gather your credit data and establish your starting position.",
  stabilization:        "You have your data. Now build the strategic knowledge to act on it.",
  active_dispute:       "You're building your recovery strategy and taking action on findings.",
  momentum_building:    "Consistent activity is compounding. Keep the pressure on.",
  long_term_restoration: "Refining your strategy and building toward long-term financial health.",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Protection status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getProtectionStatus(audits: AuditInput[]): ProtectionStatus {
  const completed = audits.filter((a) => a.status === "completed");

  if (!completed.length) {
    return {
      level:   "monitoring",
      label:   "Monitoring",
      message: "Run a credit audit to establish your protection baseline.",
      dot:     "bg-blue-400",
      border:  "border-blue-500/20",
      bg:      "bg-blue-500/5",
      text:    "text-blue-400",
    };
  }

  const score = completed[0].risk_score ?? 0;

  if (score >= 75) {
    return {
      level:   "action_required",
      label:   "Action Required",
      message: "Critical risk score detected. Begin your recovery campaign immediately.",
      dot:     "bg-amber-400",
      border:  "border-amber-500/30",
      bg:      "bg-amber-500/10",
      text:    "text-amber-400",
    };
  }
  if (score >= 50) {
    return {
      level:   "review",
      label:   "Review Recommended",
      message: "Elevated risk detected. Review recommendations and begin addressing issues.",
      dot:     "bg-amber-400/70",
      border:  "border-amber-500/20",
      bg:      "bg-amber-500/5",
      text:    "text-amber-400/80",
    };
  }
  return {
    level:   "protected",
    label:   "Protected",
    message: "Your recovery is progressing. Maintain consistency for lasting results.",
    dot:     "bg-emerald-400",
    border:  "border-emerald-500/20",
    bg:      "bg-emerald-500/5",
    text:    "text-emerald-400",
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Momentum state
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getMomentumState(events: XPEventInput[]): MomentumState {
  const weekActions = momentum7Days(events);
  const streak      = computeStreak(events);
  const isActive    = weekActions > 0;

  let tier:        MomentumTier;
  let label:       string;
  let description: string;

  if (streak >= 7 && weekActions >= 5) {
    tier        = "strong";
    label       = "Strong Momentum";
    description = `${weekActions} actions this week · ${streak}-day streak`;
  } else if (streak >= 3 || weekActions >= 3) {
    tier        = "building";
    label       = "Building Momentum";
    description = `${weekActions} actions this week · Keep the pace`;
  } else if (weekActions >= 1) {
    tier        = "starting";
    label       = "Active Recovery";
    description = `${weekActions} action${weekActions !== 1 ? "s" : ""} this week · Starting to build`;
  } else {
    tier        = "inactive";
    label       = "Recovery Paused";
    description = "Complete a recovery action to restart momentum";
  }

  return { tier, label, description, weekActions, streak, isActive };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Recovery briefing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getRecoveryBriefing(
  phase:        RecoveryPhase,
  inProgressTitle: string | null,
  completedCount:  number,
  risk_score:      number | null,
): string {
  switch (phase) {
    case "assessment":
      return "Upload your credit report to identify every recovery opportunity and establish your strategic baseline.";
    case "stabilization":
      return "Your audit is complete. The first training module builds the framework your entire recovery strategy depends on.";
    case "active_dispute":
      if (inProgressTitle) return `You're actively training in ${inProgressTitle}. Consistent daily action compounds into lasting results.`;
      if (completedCount > 0) return `${completedCount} training module${completedCount !== 1 ? "s" : ""} complete. Your dispute strategy is taking shape.`;
      return "Your audit findings are ready. Begin training to build the strategy your recovery requires.";
    case "momentum_building":
      return `${completedCount} training module${completedCount !== 1 ? "s" : ""} complete and momentum is building. Keep the pressure consistent.`;
    case "long_term_restoration":
      return "You're in the refinement phase. Focus on dispute resolution outcomes and building positive credit history.";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Primary CTA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getPrimaryCTA(
  phase:          RecoveryPhase,
  inProgressMod:  AcademyModuleInput | null,
  latestAuditId:  string | null,
  nextUnlocked:   AcademyModuleInput | null,
): RecommendedAction {
  switch (phase) {
    case "assessment":
      return { label: "Run Credit Audit", href: "/dashboard/audit/start", desc: "Identify every issue, opportunity, and dispute target on your report.", urgent: true };
    case "stabilization":
      return {
        label: nextUnlocked ? `Begin: ${nextUnlocked.title}` : "Begin Training",
        href:  nextUnlocked ? `/dashboard/academy/${nextUnlocked.slug}` : "/dashboard/academy",
        desc:  "Start the Plutus Academy to build the strategic knowledge your recovery depends on.",
        urgent: false,
      };
    case "active_dispute":
      if (inProgressMod) return {
        label: `Continue: ${inProgressMod.title}`,
        href:  `/dashboard/academy/${inProgressMod.slug}`,
        desc:  "Pick up your training where you left off. Consistency compounds.",
        urgent: false,
      };
      return {
        label: "Generate Dispute Letters",
        href:  latestAuditId ? `/dashboard/audit/${latestAuditId}/results` : "/dashboard/audit/start",
        desc:  "Use your training and audit findings to begin filing disputes.",
        urgent: false,
      };
    case "momentum_building":
      if (inProgressMod) return {
        label: `Continue: ${inProgressMod.title}`,
        href:  `/dashboard/academy/${inProgressMod.slug}`,
        desc:  "You are building strong momentum. Keep the campaign moving forward.",
        urgent: false,
      };
      return { label: "Review Your Progress", href: "/dashboard/command-center", desc: "Review your recovery timeline and plan your next move.", urgent: false };
    case "long_term_restoration":
      return { label: "Review Command Center", href: "/dashboard/command-center", desc: "Track your dispute outcomes and refine your long-term strategy.", urgent: false };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Daily missions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getMissions(
  phase:         RecoveryPhase,
  modules:       AcademyModuleInput[],
  progress:      Record<string, ModuleProgressInput>,
  audits:        AuditInput[],
  xpEvents:      XPEventInput[],
): RecoveryMission[] {
  const missions: RecoveryMission[] = [];
  const hasCompletedAudit = audits.some((a) => a.status === "completed");
  const completedAudit    = audits.find((a) => a.status === "completed");
  const inProgress        = modules.find((m) => progress[m.id]?.status === "in_progress");
  const nextUnlocked      = modules.find((m) => !progress[m.id] && !m.is_locked);

  const hadActivityToday = xpEvents.some((e) => {
    const d = new Date(e.earned_at);
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  });

  // Mission 1: training
  if (inProgress) {
    missions.push({ id: "train", label: `Continue: ${inProgress.title}`, description: "Resume your active training module.", xp_reward: 10, href: `/dashboard/academy/${inProgress.slug}` });
  } else if (nextUnlocked && phase !== "assessment") {
    missions.push({ id: "start", label: `Begin: ${nextUnlocked.title}`, description: "Start your next recovery training module.", xp_reward: 50, href: `/dashboard/academy/${nextUnlocked.slug}` });
  }

  // Mission 2: audit-related
  if (!hasCompletedAudit) {
    missions.push({ id: "audit", label: "Run your credit audit", description: "Upload your report to identify all recovery opportunities.", xp_reward: 25, href: "/dashboard/audit/start" });
  } else if (completedAudit && phase === "active_dispute") {
    missions.push({ id: "dispute", label: "Review dispute opportunities", description: "Check your audit results and generate dispute letters.", xp_reward: 20, href: `/dashboard/audit/${completedAudit.id}/results` });
  }

  // Mission 3: counsel session
  if (!hadActivityToday && missions.length < 3) {
    missions.push({ id: "counsel", label: "Ask Plutus Counsel one question", description: "Get a tactical answer aligned with your recovery phase.", xp_reward: 5, href: "/dashboard/ai" });
  }

  return missions.slice(0, 3);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Recovery timeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const XP_EVENT_LABELS: Record<string, string> = {
  module_complete:  "Module completed",
  audit_complete:   "Credit audit completed",
  dispute_draft:    "Dispute letter generated",
  lesson_complete:  "Lesson completed",
  daily_login:      "Daily training session",
};

export function buildTimeline(
  xpEvents: XPEventInput[],
  audits:   AuditInput[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  xpEvents.forEach((e, i) => {
    const label = e.event_type === "module_complete"  ? `Module completed — +${e.xp_amount} XP`
                : e.event_type === "audit_complete"   ? `Credit audit completed — +${e.xp_amount} XP`
                : e.event_type === "dispute_draft"    ? `Dispute letter generated — +${e.xp_amount} XP`
                : (XP_EVENT_LABELS[e.event_type] ?? e.event_type);

    const kind: TimelineEvent["kind"] =
      e.event_type === "module_complete" ? "module"  :
      e.event_type === "audit_complete"  ? "audit"   :
      e.event_type === "dispute_draft"   ? "dispute" : "xp";

    events.push({
      id:    `xp-${i}`,
      kind,
      label,
      date:  new Date(e.earned_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ts:    new Date(e.earned_at).getTime(),
    });
  });

  audits.filter((a) => a.status === "completed").forEach((a) => {
    events.push({
      id:    `audit-${a.id}`,
      kind:  "audit",
      label: `Credit audit completed${a.risk_score != null ? ` — Risk score: ${a.risk_score}` : ""}`,
      date:  new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ts:    new Date(a.created_at).getTime(),
    });
  });

  // Deduplicate by approximate timestamp (within 5 min) and sort
  const seen = new Set<string>();
  return events
    .filter((e) => {
      const key = `${e.kind}-${e.label}-${Math.floor(e.ts / 3e5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Recommended module (contextual learning)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Given the user's recovery phase, return the highest-priority module slug to suggest. */
export function getRecommendedModuleSlug(
  phase:    RecoveryPhase,
  modules:  AcademyModuleInput[],
  progress: Record<string, ModuleProgressInput>,
): string | null {
  const incomplete = modules.filter(
    (m) => progress[m.id]?.status !== "completed" && !m.is_locked,
  );
  if (!incomplete.length) return null;

  // Phase-specific module order preferences
  const phasePrefs: Record<RecoveryPhase, number[]> = {
    assessment:           [1],
    stabilization:        [1, 2],
    active_dispute:       [4, 3, 2],
    momentum_building:    [5, 4, 3],
    long_term_restoration:[6, 7, 5],
  };

  const preferred = phasePrefs[phase];
  for (const idx of preferred) {
    const mod = incomplete.find((m) => m.order_index === idx);
    if (mod) return mod.slug;
  }
  // Fallback: first unlocked incomplete
  return incomplete[0]?.slug ?? null;
}
