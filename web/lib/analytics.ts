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
  // Audit funnel
  | "audit_upload_started"
  | "audit_upload_completed"
  | "audit_upload_failed"
  | "audit_accounts_verified"
  | "audit_run_started"
  | "audit_completed"
  | "audit_snapshot_viewed"
  | "audit_results_viewed"
  // Academy
  | "module_started"
  | "module_completed"
  | "lesson_viewed"
  | "academy_page_viewed"
  // Dispute
  | "dispute_generated"
  | "dispute_viewed"
  | "dispute_copied"
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
  // Onboarding
  | "onboarding_started"
  | "onboarding_step_advanced"
  | "onboarding_completed"
  | "onboarding_skipped"
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
  | "dashboard_viewed";

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
  upgradeCTAClicked: (from_tier: string, to_tier: string) =>
    track("upgrade_cta_clicked", { from_tier, to_tier }),
  upgradeCompleted: (tier: string) => track("upgrade_completed", { tier }),
};
