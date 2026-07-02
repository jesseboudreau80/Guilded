# Guilded — Production Launch Hardening

*Created: 2026-05-21 · Next.js 14.2.5 · Self-hosted via Cloudflare Tunnel*

---

## What Was Fixed (RSC Caching Incident)

**Root cause:** Next.js App Router serves RSC (React Server Components) payloads as
`Content-Type: text/x-component` for soft navigations. Statically-generated pages were
serving these payloads with `Cache-Control: s-maxage=31536000` (1 year). WKWebView
(used by Chrome and all browsers on iOS) does not reliably honour `Vary: RSC` for
non-standard headers, so it cached the RSC payload under the plain URL key.

On subsequent cold visits (tapping a link in a Facebook post, or reopening from app
history), WKWebView served the cached `text/x-component` blob directly without hitting
the network. Chrome received binary RSC content it could not render and downloaded it
as **"Download.txt"** — the site appeared completely broken.

**Fix applied:**
- Every public-facing route is now `force-dynamic` (server-rendered per request)
- Cache-Control is `private, no-cache, no-store, max-age=0, must-revalidate` on all responses
- `X-Content-Type-Options: nosniff` applied globally via middleware
- Additional security headers applied globally (`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`)
- `viewport-fit=cover` added to root layout (required for iOS safe-area-inset CSS)
- Full OG metadata added (missing `og:image` is flagged as a pre-launch TODO)

---

## Browser QA Matrix

Test every scenario below on REAL hardware before launch. Simulators do not replicate
WKWebView caching behavior accurately.

| Browser | Device | Scenarios to test |
|---|---|---|
| Safari | iPhone (iOS 16+) | Cold load, back/forward, share link, password reset email |
| Chrome | iPhone (iOS 16+) | Cold load, back/forward, history revisit, in-app share |
| Safari | iPad | Cold load, landscape/portrait |
| Chrome | Android (current) | Cold load, back/forward |
| Samsung Internet | Android | Cold load |
| Facebook in-app browser (FBIAB) | iPhone | Click link from FB post, scroll, sign up |
| Facebook in-app browser (FBIAB) | Android | Click link from FB post |
| Instagram in-app browser | iPhone | Click link from IG story/bio |
| Gmail in-app browser | iPhone | Click password reset email link |
| Desktop Chrome | macOS | Full flow, DevTools audit |
| Desktop Safari | macOS | Full flow |
| Desktop Edge | Windows | Full flow |

**Mandatory test flows per browser:**
1. Navigate to `guilded.jesseboudreau.com` — page renders (not downloaded)
2. Sign up for a new account
3. Log in with existing account
4. Upload a credit report PDF
5. Navigate through dashboard pages
6. Open Guild Counsel (bottom-right FAB visible and functional)
7. Navigate to `/preview` — page renders correctly
8. Click "Forgot Password" → receive email → click link → page renders
9. Hard-refresh on any dashboard page — stays on page (not kicked to login)
10. Log out → verify redirected to landing page

---

## Mobile QA Process

### Before each test session
1. **Clear browser cache completely** on the device under test
   - Chrome iOS: Settings → Privacy and Security → Clear Browsing Data → All time
   - Safari iOS: Settings app → Safari → Clear History and Website Data
2. Disable any VPN or content blocker on the test device
3. Confirm you are testing `guilded.jesseboudreau.com` (production), not localhost

### Testing the RSC caching fix
1. Load `guilded.jesseboudreau.com` fresh (cold)
2. Sign in and navigate to at least 3 dashboard pages
3. Kill the browser app completely (swipe up from app switcher on iOS)
4. Reopen browser and navigate to `guilded.jesseboudreau.com` via URL bar
5. **Expected:** Landing page loads. **Fail signal:** File download starts

### Testing Facebook in-app browser
1. Post the URL `https://guilded.jesseboudreau.com` to a private Facebook post
2. Tap the link from the Facebook app (this opens FBIAB, not Safari)
3. Verify the landing page renders fully
4. Tap "Create Account" — verify form is interactive
5. Note: FBIAB adds `?fbclid=xxx` query params — verify this doesn't break routing

### Testing email link (password reset)
1. Request a password reset for a test account
2. Open the email in Gmail app on iPhone
3. Tap the reset link (opens Gmail in-app browser)
4. Verify the reset-password page renders (not downloaded as a file)
5. Complete the password reset
6. Verify redirect to landing page works

---

## Cache Invalidation Process

### After any code deployment

The current architecture uses `private, no-cache, no-store` cache headers. This means:
- **Browser caches:** Will not cache any response. No cache invalidation needed for browsers.
- **Cloudflare edge cache:** Currently `cf-cache-status: DYNAMIC` for all routes, meaning Cloudflare is not caching HTML. No edge cache invalidation needed.
- **Next.js internal cache:** Cleared automatically on `next build` + service restart.

### Standard deployment sequence
```bash
cd /home/jesse/infra/apps/Guilded/web
npm run build                          # Rebuild with new code
sudo systemctl restart guilded-web     # Restart the service
```

### Verifying cache headers post-deploy
```bash
# Check production response headers
curl -s https://guilded.jesseboudreau.com/ -o /dev/null -D - | grep -i cache

# Expected output:
# cache-control: private, no-cache, no-store, max-age=0, must-revalidate
# cf-cache-status: DYNAMIC

# Check RSC endpoint is also no-store
curl -s https://guilded.jesseboudreau.com/ -H "RSC: 1" -o /dev/null -D - | grep -i cache

# Expected: same no-store response
```

### If you ever need to restore CDN caching for a route
Use `export const revalidate = 3600` (ISR, 1 hour) instead of `force-dynamic`, but
verify that the RSC response for that route also gets `no-store` before deploying.
**Do not use `s-maxage` without also setting `max-age=0`.**

---

## Release Verification Steps

Run this checklist after every deployment before considering the release stable.

```bash
# 1. Confirm service is running
systemctl is-active guilded-web && echo "PASS" || echo "FAIL"

# 2. Confirm port 3000 is listening
ss -tlnp | grep 3000 && echo "PASS" || echo "FAIL"

# 3. Confirm homepage returns HTML (not RSC)
curl -s http://127.0.0.1:3000/ -o /dev/null -D - | grep "Content-Type: text/html" && echo "PASS" || echo "FAIL"

# 4. Confirm no-store cache control
curl -s http://127.0.0.1:3000/ -o /dev/null -D - | grep "no-store" && echo "PASS" || echo "FAIL"

# 5. Confirm security headers
curl -s http://127.0.0.1:3000/ -o /dev/null -D - | grep "x-content-type-options: nosniff" && echo "PASS" || echo "FAIL"
curl -s http://127.0.0.1:3000/ -o /dev/null -D - | grep "x-frame-options: SAMEORIGIN" && echo "PASS" || echo "FAIL"

# 6. Confirm Cloudflare tunnel is routing correctly
curl -s https://guilded.jesseboudreau.com/ -o /dev/null -D - | grep "200" && echo "PASS" || echo "FAIL"

# 7. Confirm RSC response is also no-store
curl -s http://127.0.0.1:3000/ -H "RSC: 1" -o /dev/null -D - | grep "no-store" && echo "PASS" || echo "FAIL"

# 8. Confirm API is running
curl -s http://127.0.0.1:8100/health 2>/dev/null | grep -i "ok\|health\|200" && echo "PASS" || echo "FAIL"

# 9. Confirm cloudflared is running
ps aux | grep -q "[c]loudflared.*config.yml" && echo "PASS" || echo "FAIL"
```

Save this as a script at `/home/jesse/infra/apps/Guilded/verify-deploy.sh` and run it
after every deployment.

---

## Pre-Launch Smoke Tests (Human-in-the-Loop)

Complete this list in sequence on a real iPhone before announcing the launch.

### Critical path
- [ ] Land on `guilded.jesseboudreau.com` from a cold browser start — page renders
- [ ] Land from a Facebook in-app browser link — page renders, not downloaded
- [ ] Register a new account (Apprentice tier, free)
- [ ] Log in with the new account
- [ ] Upload a real credit report PDF (use a test file)
- [ ] View audit results page — items render, no white screen
- [ ] Click "Generate Dispute Letter" on one item — letter renders
- [ ] Open Guild Counsel FAB — drawer opens, can type and submit
- [ ] Navigate: Academy → open Module 1 → content loads
- [ ] Navigate: Command Center — XP and stats render
- [ ] Log out — lands on the home page

### Account flows
- [ ] Click "Forgot Password" — form renders
- [ ] Submit forgot-password email — success message appears
- [ ] Click link in received email (from Gmail app on iPhone) — reset page renders
- [ ] Complete password reset — redirected to landing page
- [ ] Sign in with new password — works

### Edge cases
- [ ] Navigate to `guilded.jesseboudreau.com/preview` — demo page renders
- [ ] Navigate to `guilded.jesseboudreau.com/terms` — legal page renders
- [ ] Navigate to a non-existent URL — 404 page renders (not blank)
- [ ] Hard-refresh on `/dashboard` while logged in — stays on dashboard
- [ ] Hard-refresh on `/dashboard` while logged out — redirects to landing

---

## Post-Deploy Verification (First 30 Minutes)

After going live, monitor these for 30 minutes:

1. **Check service logs** for errors:
   ```bash
   journalctl -u guilded-web -f
   ```
   Watch for: 500 errors, authentication failures, RSC payload errors

2. **Check API logs** for errors:
   ```bash
   journalctl -u guilded-api -f
   ```
   Watch for: database errors, auth failures

3. **Check Cloudflare tunnel**:
   ```bash
   ps aux | grep cloudflared
   ```
   Confirm the `config.yml` tunnel process is still alive

4. **Real-device test** from a fresh browser session after posting the first Facebook link

5. **Monitor 404/500 rate** — any spike in errors post-launch is a signal to investigate

---

## CDN Safety Checks

Current Cloudflare configuration observations:
- All responses return `cf-cache-status: DYNAMIC` — Cloudflare is NOT caching any HTML
- Cloudflare IS caching static assets (`_next/static/*`) which is correct and safe
- `Cache-Control: private` prevents Cloudflare from treating responses as public cache candidates

**Do not do the following:**
- Do not enable "Cache Everything" in Cloudflare Page Rules — this would cache HTML including RSC payloads at the edge
- Do not add `s-maxage` to any page's Cache-Control without also setting `no-store` for the browser
- Do not enable Cloudflare "Rocket Loader" — it rewrites script tags in ways that can break Next.js hydration

**Safe Cloudflare settings for this app:**
- Browser Cache TTL: Respect Existing Headers (or 0)
- Caching Level: Standard (do NOT set to Aggressive)
- Polish/Mirage: can be enabled for image optimization (safe)
- Bot Fight Mode: can be enabled (safe, recommended)

---

## Synthetic Monitoring Recommendations

Synthetic monitoring means automated bots that visit the site on a schedule and alert
you if it breaks before your users do.

### Recommended: UptimeRobot (free tier)
1. Create a free account at uptimerobot.com
2. Add an HTTP(S) monitor for `https://guilded.jesseboudreau.com/`
   - Interval: 5 minutes
   - Alert if response code ≠ 200
   - Alert if response time > 5000ms
3. Add a keyword monitor — checks that the page contains "Guilded" in the HTML
   - Keyword absence = page is broken even if returning 200
4. Add monitors for:
   - `https://guilded.jesseboudreau.com/preview` (marketing page)
   - `https://guilded-api.jesseboudreau.com/health` (API health)

### Recommended: Better Stack (free tier)
Better alternative with incident management and status page:
1. Create monitor for the homepage
2. Create monitor for the API health endpoint
3. Set up an incident channel (email or Slack)
4. Create a public status page at status.guilded.jesseboudreau.com

### What to alert on
| Condition | Severity | Action |
|---|---|---|
| HTTP 5xx response | Critical | Wake up, investigate now |
| HTTP 4xx on homepage | High | Investigate within 1 hour |
| Response time > 3s | Warning | Check server resources |
| SSL cert expires < 14 days | Warning | Renew via Cloudflare |
| Cloudflared process dies | Critical | `sudo systemctl restart cloudflared` |

---

## Error Monitoring Recommendations

Currently: **no error monitoring is active.** This is a significant gap for launch.

### Recommended: Sentry (free tier, 5k events/month)

**Backend (FastAPI):**
```bash
pip install sentry-sdk[fastapi]
```
Add to `api/app/main.py`:
```python
import sentry_sdk
sentry_sdk.init(dsn=os.environ["SENTRY_DSN"], traces_sample_rate=0.1)
```

**Frontend (Next.js):**
```bash
npx @sentry/wizard@latest -i nextjs
```
This auto-configures `sentry.client.config.ts`, `sentry.server.config.ts`, and `next.config.ts`.

**What Sentry captures:**
- Unhandled JavaScript exceptions (hydration errors, fetch failures)
- API 5xx errors with stack traces
- User session context (who was affected)
- Performance traces for slow pages

### Without Sentry (minimum viable)
Add structured error logging to the FastAPI app:
```python
import logging
logging.basicConfig(level=logging.ERROR, format="%(asctime)s %(levelname)s %(message)s")
```
Monitor with: `journalctl -u guilded-api -p err -f`

---

## Playwright / Browser Automation Ideas

For future CI or regression testing, these are the highest-value automated tests:

```typescript
// tests/smoke.spec.ts — run after each deployment

test("landing page renders correctly", async ({ page }) => {
  await page.goto("https://guilded.jesseboudreau.com/");
  await expect(page.locator("text=Financial Recovery")).toBeVisible();
  await expect(page.locator("text=Begin Your Recovery")).toBeVisible();
});

test("page is not downloaded as a file", async ({ page }) => {
  // Simulate RSC cold-start scenario
  const response = await page.goto("https://guilded.jesseboudreau.com/");
  expect(response?.headers()["content-type"]).toContain("text/html");
  expect(response?.headers()["cache-control"]).toContain("no-store");
});

test("security headers are present", async ({ page }) => {
  const response = await page.goto("https://guilded.jesseboudreau.com/");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("SAMEORIGIN");
});

test("preview page renders without auth", async ({ page }) => {
  await page.goto("https://guilded.jesseboudreau.com/preview");
  await expect(page.locator("text=Sample data")).toBeVisible();
});

test("dashboard redirects to home when unauthenticated", async ({ page }) => {
  await page.goto("https://guilded.jesseboudreau.com/dashboard");
  await expect(page).toHaveURL("https://guilded.jesseboudreau.com/");
});

test("forgot password page renders from email browser context", async ({ page }) => {
  await page.goto("https://guilded.jesseboudreau.com/forgot-password");
  await expect(page.locator("text=Reset your password")).toBeVisible();
  const headers = await page.evaluate(() =>
    fetch(window.location.href).then(r => Object.fromEntries(r.headers.entries()))
  );
  expect(headers["cache-control"]).toContain("no-store");
});
```

Run Playwright tests against production after each deployment:
```bash
npx playwright test --project=chromium --project=webkit --project=Mobile\ Safari
```

---

## Safe Mode Marketing Landing Architecture

### The Problem

The current landing page is a full Next.js client component (~126 kB JS). This means:
- Users on slow connections see a blank screen while JS loads
- Facebook/Instagram in-app browsers may execute JS slowly
- Any hydration error = blank page

### Recommended: Static HTML Shell + Progressive Enhancement

Split the landing page into two concerns:

**Layer 1 — Static HTML (renders instantly, zero JS required)**
- Brand + headline + tagline
- Trust signals row
- Three key feature tiles (text only)
- Pricing tier summary
- Call-to-action buttons that scroll to Layer 2

**Layer 2 — Lazy-loaded auth form (loads after visible content)**
- The register/login form loads only when the user scrolls to it or clicks a CTA
- Uses `loading="lazy"` or `IntersectionObserver` to defer

This ensures that a user who sees your Facebook post, clicks the link, and sees the page
within 500ms of clicking — even on a slow 3G connection. They read your value proposition
while the auth form loads in the background.

### Minimal implementation (current architecture, lower risk)

Without restructuring, you can improve reliability now by:

1. **Add `loading="eager"` vs `loading="lazy"` to images** (none currently, so n/a)

2. **Defer non-critical JavaScript** — the PostHog analytics script is loaded via a
   dynamically injected `<script>` tag. If PostHog's CDN is slow, this does not block
   the page (already correct).

3. **Add a `<noscript>` fallback** in the landing page for browsers with JS disabled
   (rare, but Instagram in-app browsers sometimes have JS partially restricted):
   ```html
   <noscript>
     <div style="padding: 2rem; color: white; background: #0f172a; text-align: center;">
       Guilded requires JavaScript. Please open this page in your device's default browser.
     </div>
   </noscript>
   ```

4. **Pre-connect to API origin** to speed up the first auth call:
   ```html
   <link rel="preconnect" href="https://guilded-api.jesseboudreau.com" />
   ```
   Add this to the root layout's metadata via `<link>` in `<head>`.

### For the Facebook Group Launch specifically

Post this URL pattern: `https://guilded.jesseboudreau.com/preview`

Why: `/preview` is a pure marketing page with no auth requirement. It loads faster,
shows concrete product screenshots, and has no login state that could confuse users.
Reserve `guilded.jesseboudreau.com` for the sign-up CTA link at the end of posts.

---

## Remaining Launch Risks (Not Yet Fixed)

These are known gaps that should be addressed before or shortly after launch:

| Risk | Severity | Status | Fix |
|---|---|---|---|
| No `og:image` for Facebook/Instagram link previews | High | Open | Create a 1200×630 branded PNG at `/public/og-image.png` and uncomment the metadata in `app/layout.tsx` |
| No error monitoring (Sentry) | High | Open | Run `npx @sentry/wizard@latest -i nextjs` |
| No uptime monitoring | High | Open | Set up UptimeRobot or Better Stack |
| PostHog key not set (analytics disabled) | Medium | Open | Add `NEXT_PUBLIC_POSTHOG_KEY` to `.env.local` |
| No Content-Security-Policy | Medium | Open | Implement after launch (complex with Next.js inline scripts) |
| SSL/TLS managed by Cloudflare — no rotation alert | Low | Open | Cloudflare auto-renews; monitor expiry in dashboard |
| `/_not-found` (404) is still static | Low | Acceptable | 404 page has no auth, no dynamic data; static is correct |
| No automated smoke tests in CI | Medium | Open | Add Playwright as described above |
| API health endpoint not monitored | Medium | Open | Add UptimeRobot monitor for `guilded-api.jesseboudreau.com/health` |

---

## Quick Reference — Service Management

```bash
# Restart frontend
sudo systemctl restart guilded-web

# Restart backend
sudo systemctl restart guilded-api

# Check status
systemctl status guilded-web guilded-api

# Watch live logs
journalctl -u guilded-web -f
journalctl -u guilded-api -f

# Full rebuild + restart
cd /home/jesse/infra/apps/Guilded/web && npm run build && sudo systemctl restart guilded-web

# Verify deployment
bash /home/jesse/infra/apps/Guilded/verify-deploy.sh
```
