import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require a valid session JWT.
// Stripe webhook is intentionally excluded — it is authenticated via
// HMAC-SHA256 signature verification inside the route handler itself.
const PROTECTED_ROUTES = [
  "/dashboard",
  "/api/ai",
  "/api/modules",
  "/api/lessons",
  "/api/progress",
  "/api/consultations",
];

export async function middleware(req: NextRequest) {
  const isProtected = PROTECTED_ROUTES.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  if (!isProtected) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/api/auth/signin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match dashboard pages and API routes, but skip Next.js internals,
  // static files, and the Stripe webhook path.
  matcher: [
    "/dashboard/:path*",
    "/api/ai/:path*",
    "/api/modules/:path*",
    "/api/lessons/:path*",
    "/api/progress/:path*",
    "/api/consultations/:path*",
  ],
};
