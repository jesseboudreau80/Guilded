import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { Providers } from "./providers";

// viewport-fit=cover is required for env(safe-area-inset-*) to work on iPhones
// with a home indicator (iPhone X and later). Without it the FAB safe-area CSS
// has no effect and the button can appear under the home bar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Plutus",
    template: "%s | Plutus",
  },
  description:
    "Structured credit recovery education. Audit your credit report, learn your consumer law rights, and build a real dispute strategy — guided by AI.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://plutus.jesseboudreau.com"
  ),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://plutus.jesseboudreau.com",
    siteName: "Plutus",
    title: "Plutus — Financial Recovery. Structured. Strategic. Protected.",
    description:
      "Structured credit recovery education. Audit your report, learn your legal rights under FCRA and FDCPA, and build a real dispute strategy — guided by AI.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Plutus — Credit Recovery Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plutus — Financial Recovery. Structured. Strategic. Protected.",
    description:
      "Structured credit recovery education — audit, learn, dispute. Guided by AI.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  // Prevents phone number auto-detection from mangling text on iOS Safari
  other: {
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
