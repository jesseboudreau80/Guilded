import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Tier } from "@prisma/client";
import { TIER_ORDER } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, FileText, AlertCircle } from "lucide-react";

export const metadata = { title: "Arbitration Module" };

export default async function ArbitrationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true },
  });

  const tier = (user?.tier ?? "APPRENTICE") as Tier;

  // Server-side gate
  if (TIER_ORDER[tier] < TIER_ORDER["MASTER"]) {
    redirect("/upgrade");
  }

  const resources = [
    {
      title: "Understanding Arbitration Agreements",
      description:
        "Learn how arbitration clauses work in credit agreements and what your rights are.",
      category: "Foundation",
    },
    {
      title: "FCRA Arbitration Rights",
      description:
        "Understand your rights under the Fair Credit Reporting Act when disputes escalate.",
      category: "Legal Framework",
    },
    {
      title: "FDCPA and Dispute Escalation",
      description:
        "How the Fair Debt Collection Practices Act interacts with arbitration proceedings.",
      category: "Legal Framework",
    },
    {
      title: "Preparing Your Arbitration Case",
      description:
        "Step-by-step educational guide on organizing documentation and understanding the process.",
      category: "Process",
    },
    {
      title: "Arbitration vs. Court: Educational Overview",
      description:
        "Compare both paths and understand the educational aspects of each option.",
      category: "Strategy",
    },
    {
      title: "Sample Document Templates",
      description:
        "Educational templates showing common documentation formats (not legal advice).",
      category: "Templates",
    },
  ];

  const categories = [...new Set(resources.map((r) => r.category))];

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
            <Scale className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Arbitration Education Module
            </h1>
            <Badge tier={tier} className="mt-1">
              {tier} Exclusive
            </Badge>
          </div>
        </div>
        <p className="text-gray-400">
          Advanced educational content on credit arbitration processes and your
          consumer rights.
        </p>
      </div>

      {/* Educational disclaimer */}
      <div className="mb-8 rounded-xl border border-amber-800/30 bg-amber-900/10 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-300">
              Important Educational Disclaimer
            </p>
            <p className="mt-1 text-sm text-amber-400/80">
              All content in this module is provided for educational purposes
              only. This is not legal advice. Arbitration processes can be
              complex and have significant legal implications. Always consult
              with a qualified attorney before pursuing any arbitration
              proceeding.
            </p>
          </div>
        </div>
      </div>

      {/* Resources by category */}
      {categories.map((category) => (
        <div key={category} className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-white border-b border-surface-border pb-2">
            {category}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {resources
              .filter((r) => r.category === category)
              .map((resource) => (
                <Card
                  key={resource.title}
                  className="cursor-pointer transition-colors hover:border-brand-700/50"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-hover">
                        <FileText className="h-4 w-4 text-brand-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white text-sm">
                          {resource.title}
                        </h3>
                        <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                          {resource.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
