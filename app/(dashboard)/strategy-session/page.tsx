import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getConsultationEligibility } from "@/lib/consultation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConsultationBookingButton } from "@/components/dashboard/consultation-booking-button";
import { Calendar, Clock, CheckCircle, Info, AlertTriangle } from "lucide-react";
import {
  DISCOUNT_MAX_SESSIONS_PER_YEAR,
  DISCOUNT_MIN_DAYS_BETWEEN_SESSIONS,
  STANDARD_CONSULTATION_PRICE,
} from "@/types";

export const metadata = { title: "Strategy Session" };

export default async function StrategySessionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, eligibility, consultations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true, successfulBillingCount: true, subscriptionStatus: true },
    }),
    getConsultationEligibility(session.user.id),
    prisma.consultation.findMany({
      where: { userId: session.user.id },
      orderBy: { purchasedAt: "desc" },
      take: 10,
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Strategy Session</h1>
        <p className="mt-1 text-gray-400">
          Book a 1-hour personalized credit strategy consultation with a Guilded
          advisor.
        </p>
      </div>

      {/* Pricing card */}
      <Card className="mb-6" variant={eligibility.eligible ? "highlight" : "default"}>
        <CardHeader>
          <CardTitle>Session Pricing</CardTitle>
          <CardDescription>
            Base rate: {formatCurrency(STANDARD_CONSULTATION_PRICE)}/hour
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">
                  {formatCurrency(
                    eligibility.eligible
                      ? eligibility.discountedPrice!
                      : STANDARD_CONSULTATION_PRICE
                  )}
                </span>
                {eligibility.eligible && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatCurrency(STANDARD_CONSULTATION_PRICE)}
                  </span>
                )}
              </div>
              {eligibility.eligible && (
                <Badge variant="success" className="mt-1">
                  Member discount applied
                </Badge>
              )}
            </div>
            <ConsultationBookingButton eligible={eligibility.eligible} />
          </div>

          {/* Eligibility status */}
          {eligibility.eligible ? (
            <div className="rounded-lg border border-emerald-800/30 bg-emerald-900/10 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-400 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-300">
                    You qualify for a discounted session
                  </p>
                  <p className="mt-1 text-emerald-400/70">
                    You have used {eligibility.sessionsUsed} of{" "}
                    {DISCOUNT_MAX_SESSIONS_PER_YEAR} discounted sessions in the
                    past 365 days. {eligibility.sessionsRemaining} remaining.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-800/30 bg-amber-900/10 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-300">
                    Standard rate applies
                  </p>
                  <p className="mt-1 text-amber-400/70">{eligibility.reason}</p>
                  {eligibility.nextEligibleDate && (
                    <p className="mt-1 text-amber-400/70">
                      Next eligible discounted booking:{" "}
                      <strong>{formatDate(eligibility.nextEligibleDate)}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount eligibility rules */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-brand-400" />
            Discount Eligibility Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5 text-sm text-gray-300">
            {[
              "Active Master or Hero subscription",
              `Minimum ${2} successful billing cycles`,
              `Maximum ${DISCOUNT_MAX_SESSIONS_PER_YEAR} discounted sessions per rolling 365-day window`,
              `At least ${DISCOUNT_MIN_DAYS_BETWEEN_SESSIONS} days between discounted sessions`,
            ].map((rule) => (
              <li key={rule} className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-gray-500 flex-shrink-0" />
                {rule}
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-lg bg-surface p-3 text-xs text-gray-500">
            Discounted pricing is locked in at the time of purchase based on
            your tier. Price will not change retroactively after purchase.
          </div>
        </CardContent>
      </Card>

      {/* Session history */}
      {consultations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>
              Showing {eligibility.sessionsUsed} discounted sessions in the past 365 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {consultations.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-surface-border bg-surface p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover">
                      {c.completed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        Strategy Session
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(c.purchasedAt)} · Tier at purchase:{" "}
                        {c.tierAtPurchase}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(c.price)}
                    </span>
                    {c.discounted && (
                      <Badge variant="success">Discounted</Badge>
                    )}
                    {c.completed && (
                      <Badge variant="default">Completed</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
