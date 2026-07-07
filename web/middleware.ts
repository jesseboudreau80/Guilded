import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Canonical host: 301 guilded.jesseboudreau.com → plutus.jesseboudreau.com ─
  // Plutus rebrand (2026-07-03). Old links in Jesse's FB group keep working;
  // guilded-api.jesseboudreau.com is unaffected (this middleware is web-only).
  const host = request.headers.get("host");
  if (host === "guilded.jesseboudreau.com") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = "plutus.jesseboudreau.com";
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  // ── Auth: protect /dashboard/* and /preview/* ────────────────────────────
  // /preview/* renders hardcoded demo data (including fake testimonials) —
  // it must never be publicly reachable (CROA optics, PLUTUS_AUDIT.md #6).
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/preview")) {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const response = NextResponse.next();

  // ── Security headers applied to every response ────────────────────────────
  //
  // X-Content-Type-Options: nosniff
  //   Prevents MIME-type sniffing. Critical for WebKit (iOS Chrome/Safari) —
  //   without this, a cached text/x-component RSC payload is downloaded as
  //   "Download.txt" because WKWebView sniffs the content and treats it as
  //   a file download instead of an HTML page.
  response.headers.set("X-Content-Type-Options", "nosniff");

  // X-Frame-Options: SAMEORIGIN
  //   Prevents the site from being embedded in iframes on other domains.
  //   Protects against clickjacking attacks. Safe for Facebook/Instagram
  //   in-app browsers (FBIAB uses WKWebView, not iframes).
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  // X-XSS-Protection: 1; mode=block
  //   Legacy header for older browsers (pre-CSP). Still honoured by some
  //   older Android WebViews and UC Browser used in certain markets.
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy: strict-origin-when-cross-origin
  //   Sends full referrer for same-origin requests (needed for analytics),
  //   but only the origin (no path/query) for cross-origin requests.
  //   Prevents token leakage (e.g. /reset-password?token=xxx appearing in
  //   logs or analytics on the destination site).
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy
  //   Disables browser features Guilded does not use. Prevents rogue scripts
  //   from accessing camera, microphone, geolocation, or payment APIs.
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
  );

  return response;
}

export const config = {
  // Run on all routes except Next.js internals and static file assets.
  // This ensures security headers are applied to every HTML, RSC, and API response.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
