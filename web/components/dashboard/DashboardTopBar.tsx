import Link from "next/link";
import { Shield } from "lucide-react";
import { TierBadge } from "@/components/ui/TierBadge";
import { MobileMenuButton } from "@/components/layout/MobileMenuButton";
import { CounselTopBarButton } from "@/components/counsel/CounselTopBarButton";

type User = {
  name?: string;
  tier:  string;
};

export function DashboardTopBar({ user }: { user: User | null }) {
  if (!user) return null;

  return (
    <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/60 px-4 py-3 md:px-8">
      <MobileMenuButton />

      {/* Protected label — desktop only */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-700">
        <Shield size={11} className="text-gold/50" />
        <span>Protected</span>
      </div>

      <div className="ml-auto flex items-center gap-3">

        <CounselTopBarButton />
        <TierBadge tier={user.tier} />
        {user.tier !== "HERO" && (
          <Link
            href="/dashboard/upgrade"
            className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/10"
          >
            Advance Rank
          </Link>
        )}
      </div>
    </header>
  );
}
