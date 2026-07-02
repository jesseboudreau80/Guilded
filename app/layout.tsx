import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Plutus",
  description: "The consumer's solution to bad credit — education-first credit literacy platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
