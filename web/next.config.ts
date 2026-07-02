import type { NextConfig } from "next";

// NOTE: Security and cache headers are applied by middleware.ts, not here.
// The headers() function in next.config does NOT override Cache-Control for
// statically pre-rendered pages (Next.js bakes its own cache headers into the
// static build output). Use force-dynamic on pages that need no-store behavior.
const nextConfig: NextConfig = {};

export default nextConfig;
