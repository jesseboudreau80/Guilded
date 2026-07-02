// force-dynamic: preview pages are shared as marketing links (Facebook, Instagram).
// Users click cold links in-app browsers (FBIAB, Instagram, Gmail) — these use
// WKWebView and do not reliably honour Vary: RSC. A static RSC payload would
// download as "Download.txt" instead of rendering the marketing page.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";

const NAV_LINKS = [
  { href: "/preview",          label: "Overview"  },
  { href: "/preview/dashboard", label: "Dashboard" },
  { href: "/preview/results",   label: "Results"   },
  { href: "/preview/academy",   label: "Academy"   },
  { href: "/preview/journey",   label: "Journey"   },
  { href: "/preview/mobile",    label: "Mobile"    },
  { href: "/preview/social",    label: "Social"    },
];

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">

      {/* Top nav */}
      <nav className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Link href="/preview" className="flex items-center gap-2 shrink-0">
                <Shield size={16} className="text-gold" />
                <span className="text-sm font-bold text-white">Guilded</span>
              </Link>
              <ChevronRight size={12} className="text-slate-700" />
              <span className="text-xs font-semibold text-gold uppercase tracking-widest">Preview</span>
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>

            <Link
              href="/"
              className="rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-slate-950 hover:opacity-90 transition-opacity shrink-0"
            >
              Start Free
            </Link>
          </div>

          {/* Mobile nav */}
          <div className="flex gap-1 pb-2 overflow-x-auto md:hidden scrollbar-hide">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {children}

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-6 py-8 mt-16">
        <div className="mx-auto max-w-4xl flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-gold" />
            <span className="text-sm font-bold text-white">Guilded</span>
            <span className="text-xs text-slate-600 ml-2">© 2026 · Early Access</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            <Link href="/"             className="hover:text-slate-400">Home</Link>
            <Link href="/terms"        className="hover:text-slate-400">Terms</Link>
            <Link href="/privacy"      className="hover:text-slate-400">Privacy</Link>
            <Link href="/ai-disclaimer" className="hover:text-slate-400">AI Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
