// force-dynamic: this page is reached via a one-time token URL inside a
// password-reset email. Users open it from mobile email apps (Gmail, Outlook)
// using WKWebView-based in-app browsers that do not reliably respect Vary: RSC.
// A cached text/x-component RSC payload here would be a hard-stop failure.
export const dynamic = "force-dynamic";

export { default } from "./ResetPasswordClient";
