"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Map,
  BookOpen,
  FileText,
  Scale,
  Bot,
  Calendar,
  User,
  TrendingUp,
  LogOut,
  Shield,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Tier } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  requiredTier?: Tier;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Journey", href: "/journey", icon: Map },
  { label: "Modules", href: "/modules", icon: BookOpen },
  { label: "Templates", href: "/templates", icon: FileText },
  {
    label: "Arbitration",
    href: "/arbitration",
    icon: Scale,
    requiredTier: "MASTER",
    badge: "Master+",
  },
  {
    label: "AI Assistant",
    href: "/ai-assistant",
    icon: Bot,
    requiredTier: "JOURNEYMAN",
  },
  { label: "Strategy Session", href: "/strategy-session", icon: Calendar },
  { label: "Account", href: "/account", icon: User },
  { label: "Upgrade", href: "/upgrade", icon: TrendingUp },
];

interface SidebarProps {
  userTier: Tier;
  userName?: string | null;
  userEmail?: string | null;
}

const TIER_ORDER: Record<Tier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 1,
  MASTER: 2,
  HERO: 3,
};

const TIER_ICONS: Record<Tier, string> = {
  APPRENTICE: "🛡",
  JOURNEYMAN: "⚔",
  MASTER: "🏰",
  HERO: "👑",
};

export function Sidebar({ userTier, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-surface-border bg-surface-card">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-white">Guilded</span>
          <p className="text-xs text-gray-500">Credit Literacy Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isLocked =
              item.requiredTier &&
              TIER_ORDER[userTier] < TIER_ORDER[item.requiredTier];
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={isLocked ? "/upgrade" : item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-600/20 text-brand-400"
                      : "text-gray-400 hover:bg-surface-hover hover:text-white",
                    isLocked && "opacity-50"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && isLocked && (
                    <Badge variant="warning" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {isLocked && (
                    <svg
                      className="h-3.5 w-3.5 text-gray-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User profile */}
      <div className="border-t border-surface-border px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-medium text-white">
            {userName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {userName ?? "User"}
            </p>
            <div className="flex items-center gap-1">
              <span className="text-xs">{TIER_ICONS[userTier]}</span>
              <Badge tier={userTier} className="text-xs">
                {userTier.charAt(0) + userTier.slice(1).toLowerCase()}
              </Badge>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-gray-500 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
