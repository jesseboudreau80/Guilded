/**
 * Guilded Analytics Instrumentation Layer
 * ========================================
 * All tracking calls flow through these functions.
 * Swap the underlying provider (PostHog, Plausible, Mixpanel) in one place.
 *
 * Current status: PostHog CDN integration via providers.tsx (no npm install required).
 * When window.posthog is available (loaded by AnalyticsInit in providers.tsx),
 * all track() calls automatically forward to PostHog.
 *
 * To enable the npm-based integration:
 *   npm install posthog-js
 *   Uncomment the PostHogProvider block in providers.tsx
 *
 * Sentry error tracking:
 *   npx @sentry/wizard@latest -i nextjs
 *   Wire Sentry.captureException into ErrorBoundary.tsx onError prop
 */

// ── Typed event catalog ───────────────────────────────────────────────────────

export type AnalyticsEvent =
  // Auth lifecycle
  | "signup"
  | "login"
  | "logout"
  // Audit funnel — critical conversion steps
  | "audit_upload_started"
  | "audit_upload_completed"
  | "audit_upload_failed"
  | "audit_accounts_verified"
  | "audit_run_started"
  | "audit_run_failed"
  | "audit_completed"
  | "audit_snapshot_viewed"
  | "audit_results_viewed"
  | "audit_recommendation_selected"
  | "audit_recommendation_deselected"
  | "audit_strategy_changed"
  | "audit_bureau_changed"
  | "audit_context_added"
  | "audit_dispute_preview_opened"
  | "audit_source_guide_opened"
  // Academy
  | "module_started"
  | "module_completed"
  | "lesson_viewed"
  | "academy_page_viewed"
  | "academy_module_page_viewed"
  // Dispute
  | "dispute_generated"
  | "dispute_viewed"
  | "dispute_copied"
  | "dispute_printed"
  // Guild Counsel
  | "counsel_opened"
  | "counsel_closed"
  | "counsel_message_sent"
  | "counsel_limit_hit"
  | "counsel_quick_action_used"
  // Conversion
  | "upgrade_page_viewed"
  | "upgrade_cta_clicked"
  | "upgrade_completed"
  | "upgrade_abandoned"
  | "upgrade_founders_cta_clicked"
  // Onboarding
  | "onboarding_started"
  | "onboarding_step_advanced"
  | "onboarding_completed"
  | "onboarding_skipped"
  // Journey milestones
  | "journey_milestone_completed"
  | "journey_viewed"
  // Retention
  | "continue_bar_clicked"
  | "recovery_briefing_viewed"
  | "mission_started"
  // Progression
  | "xp_earned"
  | "rank_advanced"
  | "badge_earned"
  | "mission_completed"
  // Support
  | "support_page_viewed"
  | "support_submitted"
  | "feedback_submitted"
  // Navigation
  | "command_center_viewed"
  | "dashboard_viewed"
  | "results_page_viewed"
  // Error tracking
  | "ocr_extraction_empty"
  | "api_error"
  | "session_expired";

// ── Core tracking ─────────────────────────────────────────────────────────────

function getPostHog(): { capture: (event: string, props?: object) => void; identify: (id: string, traits?: object) => void; reset: () => void } | null {
  if (typeof window === "undefined") return null;
  return (window as any).posthog ?? null;
}

/**
 * Track a named user action with optional properties.
 */
export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  const ph = getPostHog();
  if (ph) {
    ph.capture(event, { ...props, source: "guilded-web" });
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[Analytics] ${event}`, props ?? "");
  }
}

/**
 * Identify a user — call after login/signup with user ID and traits.
 */
export function identify(userId: string, traits?: {
  email?:    string;
  name?:     string;
  tier?:     string;
  created?:  string;
}): void {
  if (typeof window === "undefined") return;

  const ph = getPostHog();
  if (ph) ph.identify(userId, traits);

  if (process.env.NODE_ENV === "development") {
    console.info("[Analytics:identify]", userId, traits ?? "");
  }
}

/**
 * Record a page view (call on route changes or specific page loads).
 */
export function pageView(name: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  const ph = getPostHog();
  if (ph) ph.capture("$pageview", { page: name, ...props });
}

/**
 * Reset identity — call on logout.
 */
export function reset(): void {
  if (typeof window === "undefined") return;
  const ph = getPostHog();
  if (ph) ph.reset();
}

// ── Funnel shortcuts ──────────────────────────────────────────────────────────
// Pre-composed event calls with consistent property shapes.

export const onboardingEvents = {
  started:   () => track("onboarding_started"),
  advanced:  (step: number) => track("onboarding_step_advanced", { step }),
  completed: () => track("onboarding_completed"),
  skipped:   (step: number) => track("onboarding_skipped", { step }),
};

export const auditEvents = {
  uploadStarted:  () => track("audit_upload_started"),
  uploadFailed:   (reason: string) => track("audit_upload_failed", { reason }),
  completed:      (risk_score: number | null) => track("audit_completed", { risk_score }),
  snapshotViewed: (audit_id: string) => track("audit_snapshot_viewed", { audit_id }),
};

export const conversionEvents = {
  upgradePageViewed: (tier?: string) => track("upgrade_page_viewed", { tier }),
  upgradeCTAClicked: (from_tier: string, to_tier: string, context?: string) =>
    track("upgrade_cta_clicked", { from_tier, to_tier, context }),
  upgradeCompleted: (tier: string) => track("upgrade_completed", { tier }),
};

export const disputeEvents = {
  generated:    (strategy: string, rec_count: number, bureau_count: number) =>
    track("dispute_generated",  { strategy, rec_count, bureau_count }),
  viewed:       (draft_id: string) => track("dispute_viewed",   { draft_id }),
  copied:       (draft_id: string) => track("dispute_copied",   { draft_id }),
  printed:      (draft_id: string) => track("dispute_printed",  { draft_id }),
};

export const auditFunnelEvents = {
  resultsViewed:    (audit_id: string, risk_score: number | null, rec_count: number) =>
    track("audit_results_viewed",    { audit_id, risk_score, rec_count }),
  recSelected:      (rec_id: string, severity: string) =>
    track("audit_recommendation_selected",   { rec_id, severity }),
  recDeselected:    (rec_id: string) =>
    track("audit_recommendation_deselected", { rec_id }),
  strategyChanged:  (strategy: string) =>
    track("audit_strategy_changed",  { strategy }),
  disputePreview:   () => track("audit_dispute_preview_opened"),
  sourceGuideOpened: () => track("audit_source_guide_opened"),
  ocrEmpty:         (audit_id: string) =>
    track("ocr_extraction_empty", { audit_id }),
};

export const journeyEvents = {
  milestoneCompleted: (milestone_id: string, total_done: number) =>
    track("journey_milestone_completed", { milestone_id, total_done }),
  journeyViewed: (done: number, total: number) =>
    track("journey_viewed", { done, total }),
};
