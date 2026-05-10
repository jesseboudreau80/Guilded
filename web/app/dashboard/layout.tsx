import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { CounselLayout } from "@/components/counsel/CounselLayout";
import { WithErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
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
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar tier={user?.tier} />

      {/*
        CounselLayout wraps the entire right side with CounselContext.
        Passing DashboardTopBar as a slot prop means client components
        inside it (CounselTopBarButton) can access the counsel context.
        Conversation + open/close state persist across client navigation.
      */}
      <CounselLayout topBar={<DashboardTopBar user={user} />}>
        <main className="flex-1 p-4 md:p-8">
          <WithErrorBoundary>
            {children}
          </WithErrorBoundary>
        </main>
        {/* First-time user onboarding — shows once, tracked in localStorage */}
        <OnboardingFlow />
      </CounselLayout>
    </div>
  );
}
