// force-dynamic ensures this route is server-rendered on every request instead
// of being statically pre-generated. Without this, Next.js serves both the HTML
// and RSC payload with Cache-Control: s-maxage=31536000, which causes WKWebView
// on iOS to cache the text/x-component RSC blob and download it as "Download.txt"
// on subsequent cold navigations (Vary: RSC is not reliably honored by WebKit).
export const dynamic = "force-dynamic";

export { default } from "./HomePageClient";
