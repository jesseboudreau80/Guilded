/**
 * Route protection middleware.
 *
 * All /dashboard/* routes require an authenticated session.
 * Unauthenticated requests are redirected to / (the login page).
 *
 * This is enforced at the edge before any page component runs —
 * a second layer on top of the server-component session checks
 * in each page and the dashboard layout.
 */
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*"],
};
