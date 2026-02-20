import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Tier } from "@prisma/client";
import { TIER_ORDER } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Lock, Download } from "lucide-react";

export const metadata = { title: "Templates" };

const TEMPLATES = [
  {
    id: "dispute-basic",
    title: "Basic Credit Dispute Letter",
    description: "Standard template for disputing inaccurate information on your credit report.",
    requiredTier: "APPRENTICE" as Tier,
    category: "Dispute Letters",
    fileType: "DOCX",
  },
  {
    id: "dispute-debt-validation",
    title: "Debt Validation Request",
    description: "Request validation of a debt under the Fair Debt Collection Practices Act (FDCPA).",
    requiredTier: "JOURNEYMAN" as Tier,
    category: "Dispute Letters",
    fileType: "DOCX",
  },
  {
    id: "goodwill-letter",
    title: "Goodwill Adjustment Letter",
    description: "Educational template for requesting goodwill removal of late payment marks.",
    requiredTier: "JOURNEYMAN" as Tier,
    category: "Negotiation",
    fileType: "DOCX",
  },
  {
    id: "pay-for-delete",
    title: "Pay-for-Delete Negotiation Template",
    description: "Educational template showing how pay-for-delete agreements are structured.",
    requiredTier: "JOURNEYMAN" as Tier,
    category: "Negotiation",
    fileType: "DOCX",
  },
  {
    id: "credit-freeze",
    title: "Credit Freeze Request Letters",
    description: "Templates for requesting credit freezes from all three major bureaus.",
    requiredTier: "JOURNEYMAN" as Tier,
    category: "Security",
    fileType: "DOCX",
  },
  {
    id: "advanced-dispute",
    title: "Advanced Dispute Package",
    description: "Comprehensive dispute documentation package with supporting exhibits structure.",
    requiredTier: "MASTER" as Tier,
    category: "Advanced",
    fileType: "ZIP",
  },
  {
    id: "arbitration-demand",
    title: "Arbitration Demand Template (Educational)",
    description: "Educational template showing the structure of an arbitration demand document.",
    requiredTier: "MASTER" as Tier,
    category: "Advanced",
    fileType: "DOCX",
  },
];

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true },
  });

  const userTier = (user?.tier ?? "APPRENTICE") as Tier;
  const userTierOrder = TIER_ORDER[userTier];

  const categories = [...new Set(TEMPLATES.map((t) => t.category))];

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Document Templates</h1>
        <p className="mt-1 text-gray-400">
          Educational templates to help you understand credit dispute processes.
          All documents are for educational reference only.
        </p>
      </div>

      {categories.map((category) => (
        <div key={category} className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-surface-border pb-2">
            {category}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TEMPLATES.filter((t) => t.category === category).map((template) => {
              const isLocked = TIER_ORDER[template.requiredTier] > userTierOrder;

              return (
                <Card
                  key={template.id}
                  className={isLocked ? "opacity-60" : undefined}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                          isLocked ? "bg-surface-border" : "bg-brand-600/20"
                        }`}
                      >
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-gray-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-brand-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium text-white">
                            {template.title}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Badge variant="default" className="text-xs">
                              {template.fileType}
                            </Badge>
                            {isLocked && (
                              <Badge variant="warning" className="text-xs">
                                {template.requiredTier}+
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                          {template.description}
                        </p>
                        {!isLocked && (
                          <button className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium">
                            <Download className="h-3.5 w-3.5" />
                            Download Template
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-8 rounded-xl border border-surface-border bg-surface-card p-5 text-xs text-gray-500">
        <strong className="text-gray-400">Disclaimer:</strong> All templates are
        provided for educational purposes only. They represent example document
        structures and are not legal advice. Results from using these templates
        vary and are not guaranteed. Consult a qualified attorney or credit
        professional before sending any correspondence.
      </div>
    </div>
  );
}
