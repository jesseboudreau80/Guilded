"use client";

/**
 * Root providers wrapper.
 *
 * Analytics (PostHog):
 *   1. npm install posthog-js
 *   2. Add to .env.local:
 *        NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
 *        NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
 *   3. Uncomment the posthog initialization block below.
 *   4. The track(), identify(), pageView() functions in lib/analytics.ts
 *      automatically call posthog when window.posthog is available.
 *
 * Error monitoring (Sentry):
 *   1. npx @sentry/wizard@latest -i nextjs
 *   2. Add SENTRY_DSN to environment
 *   3. Wire Sentry.captureException() into ErrorBoundary.tsx onError prop
 */

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import { identify, reset } from "@/lib/analytics";
// import posthog from "posthog-js";                        // ← Step 1
// import { PostHogProvider } from "posthog-js/react";      // ← Step 1

function SessionExpiryHandler() {
  useEffect(() => {
    const handle = () => {
      // Clear persisted state so the next login starts fresh
      try {
        localStorage.removeItem("guilded:counsel");
        localStorage.removeItem("guilded:first-audit-done");
      } catch { /* ignore */ }
      reset(); // clear PostHog identity
      window.location.href = "/";
    };
    window.addEventListener("guilded:session-expired", handle);
    return () => window.removeEventListener("guilded:session-expired", handle);
  }, []);
  return null;
}

/**
 * Calls analytics.identify() once per session after NextAuth resolves.
 * Runs as a child of SessionProvider so useSession() is available.
 */
function AnalyticsIdentify() {
  const { data: session, status } = useSession();

  const userId  = (session?.user as { id?: string } | undefined)?.id;
  const email   = session?.user?.email;
  const name    = session?.user?.name;
  const tier    = (session?.user as { tier?: string } | undefined)?.tier;

  useEffect(() => {
    if (status !== "authenticated" || (!userId && !email)) return;
    identify(userId ?? email ?? "unknown", { email: email ?? undefined, name: name ?? undefined, tier });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId, email]);

  return null;
}

function AnalyticsInit() {
  useEffect(() => {
    const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

    if (!key) return; // No key configured — analytics disabled

    /* Uncomment after: npm install posthog-js
    posthog.init(key, {
      api_host:              host,
      capture_pageview:      false, // handled manually via pageView()
      capture_pageleave:     true,
      persistence:           "localStorage",
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") ph.debug();
      },
    });

    // Expose globally so analytics.ts can find it without a direct import
    (window as any).posthog = posthog;
    */

    // ── Lightweight CDN alternative (no npm install required) ──────────────
    // This loads PostHog from the CDN if NEXT_PUBLIC_POSTHOG_KEY is set.
    // Useful for rapid testing before adding the npm package.
    if (typeof window !== "undefined" && !(window as any).posthog) {
      const script = document.createElement("script");
      script.src   = `${host}/static/array.js`;
      script.async = true;
      script.onload = () => {
        const ph = (window as any).posthog;
        if (ph) ph.init(key, { api_host: host, capture_pageview: false });
      };
      document.head.appendChild(script);
    }
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionExpiryHandler />
      <AnalyticsIdentify />
      <AnalyticsInit />
      {/* <PostHogProvider client={posthog}> */}
      {children}
      {/* </PostHogProvider> */}
    </SessionProvider>
  );
}
