// force-dynamic: page is reached via password-reset email links, often opened
// inside mobile email clients (Gmail, Outlook) which use in-app WKWebView browsers.
// A statically cached RSC payload would cause the page to download as a file
// on cold navigations from those browsers.
export const dynamic = "force-dynamic";

export { default } from "./ForgotPasswordClient";
