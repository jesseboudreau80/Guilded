import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { CounselLayout } from "@/components/counsel/CounselLayout";
import { WithErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { BetaBanner } from "@/components/ui/BetaBanner";
import { SessionExpiryToast } from "@/components/ui/SessionExpiryToast";
import { getGuildedSession } from "@/lib/auth";
import { authApi } from "@/lib/api";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getGuildedSession();
  let user: { name?: string; tier: string } | null = null;

  if (session?.user?.accessToken) {
    const res = await authApi.me(session.user.accessToken);
    if (res.ok) user = await res.json();
  }

  return (
    <div className="flex min-h-dvh bg-slate-950">
      <Sidebar tier={user?.tier} />

      <CounselLayout topBar={<DashboardTopBar user={user} />}>
        <BetaBanner />
        <main className="flex-1 px-4 py-5 md:px-8 md:py-8">
          <WithErrorBoundary>
            {children}
          </WithErrorBoundary>
        </main>
        {/* First-time user onboarding — shows once, tracked in localStorage */}
        <OnboardingFlow />
        {/* Session expiry countdown toast */}
        <SessionExpiryToast />
      </CounselLayout>
    </div>
  );
}
