"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Lock, X, Shield,
  LayoutGrid, GraduationCap, Search, ClipboardList,
  MessageSquare, FileText, Scale, User, Target,
} from "lucide-react";
import { tierRank } from "@/lib/tiers";

type NavItem = {
  label:         string;
  href:          string;
  icon:          React.ElementType;
  requiredTier?: string;
};

type NavGroup = {
  label?: string;
  items:  NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard",       href: "/dashboard",             icon: LayoutGrid },
      { label: "Command Center",  href: "/dashboard/command-center", icon: Shield    },
    ],
  },
  {
    label: "Recovery",
    items: [
      { label: "Guild Academy",  href: "/dashboard/academy",     icon: GraduationCap },
      { label: "Credit Audit",   href: "/dashboard/audit/start", icon: Search        },
      { label: "My Audits",      href: "/dashboard/audits",      icon: ClipboardList },
      { label: "My Disputes",   href: "/dashboard/disputes",    icon: FileText      },
      { label: "Guild Counsel",  href: "/dashboard/ai",          icon: MessageSquare },
    ],
  },
  {
    label: "Advanced",
    items: [
      { label: "Templates",        href: "/dashboard/templates",         icon: FileText,  },
      { label: "Arbitration",      href: "/dashboard/arbitration",       icon: Scale,     requiredTier: "MASTER" },
      { label: "Strategy Session", href: "/dashboard/strategy-session",  icon: Target,    },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Account",  href: "/dashboard/account",  icon: User },
      { label: "Support",  href: "/dashboard/support",  icon: MessageSquare },
    ],
  },
];

function NavContent({
  tier,
  pathname,
  onNavigate,
}: {
  tier?:       string;
  pathname:    string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-5 px-3 pb-6">
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi}>
          {group.label && (
            <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-widest text-slate-700">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map(({ label, href, icon: Icon, requiredTier }) => {
              const locked =
                !!requiredTier &&
                !!tier &&
                tierRank(tier) < tierRank(requiredTier);

              // Exact match for /dashboard, prefix match for all others
              const isActive =
                href === "/dashboard"
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + "/");

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : locked
                      ? "text-slate-700 hover:bg-slate-800/30 hover:text-slate-500"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {/* Active accent bar */}
                  {isActive && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold" />
                  )}

                  {/* Icon */}
                  <Icon
                    size={14}
                    className={`shrink-0 ${
                      isActive ? "text-gold" :
                      locked   ? "text-slate-700" :
                                 "text-slate-600"
                    }`}
                  />

                  {/* Label */}
                  <span className="flex-1">{label}</span>

                  {locked && (
                    <Lock size={10} className="shrink-0 text-slate-700" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ tier }: { tier?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener("guilded:sidebar-open", handler);
    return () => window.removeEventListener("guilded:sidebar-open", handler);
  }, []);

  // Lock the layout scroll container while mobile nav is open
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-scroll-lock]");
    if (el) el.style.overflow = mobileOpen ? "hidden" : "";
    return () => { if (el) el.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden min-h-screen w-56 shrink-0 flex-col border-r border-slate-800 bg-card md:flex">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-6">
          <Shield size={17} className="text-gold shrink-0" />
          <span className="text-base font-bold tracking-tight text-white">Guilded</span>
        </div>
        <NavContent tier={tier} pathname={pathname} />
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            style={{ touchAction: "none" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 animate-fade-in flex-col bg-card shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-gold" />
                <span className="text-base font-bold tracking-tight text-white">Guilded</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded p-1 text-slate-500 hover:text-white transition-colors"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            <NavContent
              tier={tier}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
