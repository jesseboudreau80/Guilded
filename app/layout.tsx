import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Guilded",
  description: "Educational credit literacy platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
