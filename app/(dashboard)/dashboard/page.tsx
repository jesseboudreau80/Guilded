import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AI_MESSAGE_LIMITS, TIER_DISPLAY } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Tier } from "@prisma/client";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
} from "lucide-react";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, progressRecords, recentConsultations, moduleCount] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          tier: true,
          subscriptionStatus: true,
          currentPeriodEnd: true,
          aiUsageCount: true,
          aiUsageResetDate: true,
          successfulBillingCount: true,
        },
      }),
      prisma.progress.count({ where: { userId: session.user.id } }),
      prisma.consultation.findMany({
        where: { userId: session.user.id },
        orderBy: { purchasedAt: "desc" },
        take: 3,
      }),
      prisma.module.count({ where: { isPublished: true } }),
    ]);

  if (!user) redirect("/login");

  const aiLimit = AI_MESSAGE_LIMITS[user.tier as Tier];
  const aiUsed = user.aiUsageCount;
  const tier = user.tier as Tier;

  const tierBadgeVariant = {
    APPRENTICE: "default" as const,
    JOURNEYMAN: "default" as const,
    MASTER: "default" as const,
    HERO: "default" as const,
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user.name?.split(" ")[0] ?? "Member"} 👋
            </h1>
            <p className="mt-1 text-gray-400">
              Here&apos;s your credit literacy progress overview.
            </p>
          </div>
          <Badge tier={tier} className="text-sm px-3 py-1">
            {TIER_DISPLAY[tier]} Member
          </Badge>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/20">
                <BookOpen className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{progressRecords}</p>
                <p className="text-sm text-gray-400">Lessons Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
                <Bot className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {aiLimit === 0 ? "—" : `${aiUsed}/${aiLimit}`}
                </p>
                <p className="text-sm text-gray-400">AI Messages Used</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20">
                <Calendar className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {recentConsultations.length}
                </p>
                <p className="text-sm text-gray-400">Strategy Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/20">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {user.successfulBillingCount}
                </p>
                <p className="text-sm text-gray-400">Billing Cycles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* AI Usage Card */}
        {tier !== "APPRENTICE" && (
          <Card>
            <CardHeader>
              <CardTitle>AI Assistant Usage</CardTitle>
              <CardDescription>
                Resets monthly with your billing cycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressBar
                value={aiUsed}
                max={aiLimit}
                showValue
                label="Messages used this month"
                variant={aiUsed / aiLimit > 0.8 ? "warning" : "brand"}
              />
              {user.aiUsageResetDate && (
                <p className="mt-3 text-xs text-gray-500">
                  Resets on {formatDate(user.aiUsageResetDate)}
                </p>
              )}
              <Link
                href="/ai-assistant"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300"
              >
                <Bot className="h-4 w-4" />
                Open AI Assistant
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current membership status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Plan</span>
                <Badge tier={tier}>{TIER_DISPLAY[tier]}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Status</span>
                <Badge
                  variant={
                    user.subscriptionStatus === "ACTIVE"
                      ? "success"
                      : user.subscriptionStatus
                      ? "warning"
                      : "default"
                  }
                >
                  {user.subscriptionStatus ?? "Free"}
                </Badge>
              </div>
              {user.currentPeriodEnd && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Next billing</span>
                  <span className="text-sm text-white">
                    {formatDate(user.currentPeriodEnd)}
                  </span>
                </div>
              )}
              {tier === "APPRENTICE" && (
                <Link
                  href="/upgrade"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300"
                >
                  <TrendingUp className="h-4 w-4" />
                  Upgrade your plan
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent sessions */}
        {recentConsultations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Strategy Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recentConsultations.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg bg-surface p-3"
                  >
                    <div className="flex items-center gap-3">
                      {c.completed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">
                          Strategy Session
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(c.purchasedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(c.price)}
                      </p>
                      {c.discounted && (
                        <Badge variant="success" className="text-xs">
                          Discounted
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Quick links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/modules", label: "Browse Modules", icon: BookOpen },
                { href: "/ai-assistant", label: "Ask AI", icon: Bot },
                { href: "/strategy-session", label: "Book Session", icon: Calendar },
                { href: "/upgrade", label: "Upgrade Plan", icon: TrendingUp },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-2 rounded-xl border border-surface-border bg-surface p-4 text-center transition-colors hover:border-brand-700 hover:bg-brand-900/10"
                >
                  <Icon className="h-5 w-5 text-brand-400" />
                  <span className="text-xs font-medium text-gray-300">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
