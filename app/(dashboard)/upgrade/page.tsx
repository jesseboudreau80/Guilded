import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TIER_INFO, TIER_DISPLAY } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Tier } from "@prisma/client";
import { UpgradePricingCard } from "@/components/dashboard/upgrade-pricing-card";
import { Shield } from "lucide-react";

export const metadata = { title: "Upgrade Plan" };

export default async function UpgradePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true, subscriptionStatus: true },
  });

  const currentTier = (user?.tier ?? "APPRENTICE") as Tier;

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <div className="mb-10 text-center">
        <div className="mb-3 flex justify-center">
          <Badge tier={currentTier} className="px-3 py-1 text-sm">
            Current: {TIER_DISPLAY[currentTier]}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold text-white">
          Invest in Your Credit Education
        </h1>
        <p className="mt-3 max-w-xl mx-auto text-gray-400">
          Guilded is an educational platform. Upgrade to access advanced
          learning modules, AI assistance, and strategy sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {TIER_INFO.map((tier) => (
          <UpgradePricingCard
            key={tier.tier}
            tier={tier}
            currentTier={currentTier}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="mt-10 rounded-xl border border-surface-border bg-surface-card p-5">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-brand-400 flex-shrink-0" />
          <div className="text-sm text-gray-400">
            <p className="font-medium text-gray-300 mb-1">
              Educational Platform Disclaimer
            </p>
            <p>
              Guilded is a credit literacy education platform. We provide
              educational content, tools, and resources to help you understand
              credit. We are not a credit repair organization and do not perform
              credit repair services. Individual results vary and nothing on this
              platform constitutes a guarantee of credit score improvement or
              specific outcomes. Always consult a qualified professional for
              personalized advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
