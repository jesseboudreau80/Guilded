import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth",
  "/api/stripe/webhook",
];

const PAID_ONLY_PATHS = [
  "/ai-assistant",
  "/api/ai",
];

const MASTER_PLUS_PATHS = [
  "/arbitration",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const tier = (session.user as { tier?: string }).tier || "APPRENTICE";

  // Check MASTER+ paths
  if (MASTER_PLUS_PATHS.some((p) => pathname.includes(p))) {
    if (tier !== "MASTER" && tier !== "HERO") {
      return NextResponse.redirect(new URL("/upgrade", request.url));
    }
  }

  // Check paid-only paths
  if (PAID_ONLY_PATHS.some((p) => pathname.includes(p))) {
    if (tier === "APPRENTICE") {
      return NextResponse.redirect(new URL("/upgrade", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
