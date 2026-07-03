import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { canAccess, TIER_LABELS } from "@/lib/tiers";

export default async function ArbitrationPage() {
  const user = await requireUser();
  if (!user) return null;

  const arbitrationModule = await prisma.module.findFirst({
    where: { id: "module-arbitration" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  const allowed = canAccess(user.tier, arbitrationModule?.requiredTier ?? "MASTER");
  if (!allowed) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Arbitration</h1>
        <p className="mt-2 text-slate-600">
          The arbitration curriculum unlocks with the {TIER_LABELS[arbitrationModule?.requiredTier ?? "MASTER"]} plan: what
          consumer arbitration is, how to find and read the clause in your own agreements, forum rules and consumer
          cost caps, the full process timeline, and how to prepare a case file.
        </p>
        <Link href="/dashboard/upgrade" className="mt-4 inline-block rounded bg-accent px-4 py-2 font-medium text-white">
          View plans
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Arbitration</h1>
      <p className="mt-2 text-slate-600">
        {arbitrationModule?.description ||
          "Advanced educational workflows and guides for arbitration preparation."}
      </p>
      {arbitrationModule && (
        <ol className="mt-5 space-y-2">
          {arbitrationModule.lessons.map((lesson, i) => (
            <li key={lesson.id} className="rounded border border-slate-200 bg-card p-3">
              <Link href={`/dashboard/modules/${lesson.id}`} className="hover:underline">
                {i + 1}. {lesson.title}
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-6 text-xs text-slate-500">
        Educational information, not legal advice. Verify current forum rules and consider a licensed attorney for
        significant claims.
      </p>
    </div>
  );
}
