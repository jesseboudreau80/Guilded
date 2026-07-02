import { MobileMenuButton } from "@/components/layout/MobileMenuButton";
import { ReportProblemButton } from "@/components/ui/ReportProblemButton";

export function DashboardTopBar({ user }: { user: { name?: string; tier: string } | null }) {
  return (
    <header className="flex items-center border-b border-slate-800 bg-slate-950/60 px-4 py-3 md:px-8">
      <MobileMenuButton />
      {user && (
        <div className="ml-auto flex items-center gap-2">
          <ReportProblemButton />
        </div>
      )}
    </header>
  );
}
