import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Tier, SubscriptionStatus } from "@prisma/client";
import { TIER_DISPLAY, AI_MESSAGE_LIMITS } from "@/types";
import { ManageSubscriptionButton } from "@/components/dashboard/manage-subscription-button";
import { User, CreditCard, Bot, Shield } from "lucide-react";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      tier: true,
      subscriptionStatus: true,
      subscriptionStartDate: true,
      currentPeriodEnd: true,
      successfulBillingCount: true,
      aiUsageCount: true,
      aiUsageResetDate: true,
      createdAt: true,
      stripeCustomerId: true,
    },
  });

  if (!user) redirect("/login");

  const tier = user.tier as Tier;
  const aiLimit = AI_MESSAGE_LIMITS[tier];

  const statusVariant = (status: SubscriptionStatus | null) => {
    if (!status) return "default" as const;
    if (status === "ACTIVE") return "success" as const;
    if (status === "PAST_DUE") return "danger" as const;
    return "warning" as const;
  };

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <p className="mt-1 text-gray-400">
          Manage your profile, subscription, and usage.
        </p>
      </div>

      {/* Profile */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-brand-400" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-xl font-bold text-white">
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <p className="font-semibold text-white">{user.name}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Member since {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand-400" />
            Subscription
          </CardTitle>
          <CardDescription>
            Manage your Guilded membership
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between py-2 border-b border-surface-border">
              <span className="text-sm text-gray-400">Plan</span>
              <Badge tier={tier}>{TIER_DISPLAY[tier]}</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-border">
              <span className="text-sm text-gray-400">Status</span>
              <Badge variant={statusVariant(user.subscriptionStatus)}>
                {user.subscriptionStatus ?? "Free"}
              </Badge>
            </div>
            {user.subscriptionStartDate && (
              <div className="flex items-center justify-between py-2 border-b border-surface-border">
                <span className="text-sm text-gray-400">Started</span>
                <span className="text-sm text-white">
                  {formatDate(user.subscriptionStartDate)}
                </span>
              </div>
            )}
            {user.currentPeriodEnd && (
              <div className="flex items-center justify-between py-2 border-b border-surface-border">
                <span className="text-sm text-gray-400">Next billing date</span>
                <span className="text-sm text-white">
                  {formatDate(user.currentPeriodEnd)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-400">Successful payments</span>
              <span className="text-sm text-white">
                {user.successfulBillingCount}
              </span>
            </div>
          </div>

          {user.stripeCustomerId && (
            <ManageSubscriptionButton />
          )}
        </CardContent>
      </Card>

      {/* AI Usage */}
      {tier !== "APPRENTICE" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-brand-400" />
              AI Assistant Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Messages used this month</span>
                <span className="text-white font-medium">
                  {user.aiUsageCount} / {aiLimit}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{
                    width: `${Math.min(100, (user.aiUsageCount / aiLimit) * 100)}%`,
                  }}
                />
              </div>
              {user.aiUsageResetDate && (
                <p className="text-xs text-gray-500">
                  Resets on {formatDate(user.aiUsageResetDate)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-400" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            Your account is secured with{" "}
            {user.stripeCustomerId ? "OAuth or email/password" : "email and password"}{" "}
            authentication. For security concerns, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
