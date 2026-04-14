import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Guilded — Credit Literacy Platform",
    template: "%s | Guilded",
  },
  description:
    "Guilded is an educational credit literacy platform with AI-powered document assistance, structured learning modules, and expert strategy sessions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface min-h-screen">{children}</body>
    </html>
  );
}
