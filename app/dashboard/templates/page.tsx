import Link from "next/link";
import { requireUser } from "@/lib/server-auth";
import { canAccess, TIER_LABELS } from "@/lib/tiers";
import { letterTemplates } from "@/content/letter-templates";

const CATEGORY_ORDER = ["Bureau", "Furnisher", "Collector", "Escalation"] as const;

export default async function TemplatesPage() {
  const user = await requireUser();
  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Templates Library</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Letter templates for every stage of the process. Each one tells you when to use it and how to send it —
        replace every [BRACKETED] field before mailing. Locked templates unlock when you upgrade.
      </p>
      {CATEGORY_ORDER.map((category) => {
        const templates = letterTemplates.filter((t) => t.category === category);
        if (templates.length === 0) return null;
        return (
          <section key={category} className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{category}</h2>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {templates.map((template) => {
                const locked = !canAccess(user.tier, template.requiredTier);
                return locked ? (
                  <div key={template.slug} className="rounded border border-slate-800 bg-card/50 p-4 opacity-75">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-400">🔒 {template.title}</p>
                      <Link
                        href="/dashboard/upgrade"
                        className="whitespace-nowrap rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-300"
                      >
                        {TIER_LABELS[template.requiredTier]}
                      </Link>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{template.whenToUse}</p>
                  </div>
                ) : (
                  <Link
                    key={template.slug}
                    href={`/dashboard/templates/${template.slug}`}
                    className="rounded border border-slate-700 bg-card p-4 hover:border-slate-500"
                  >
                    <p className="font-semibold">{template.title}</p>
                    <p className="mt-2 text-sm text-slate-400">{template.whenToUse}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="mt-8 text-xs text-slate-500">
        Educational templates, not legal advice. Laws and addresses change — verify before sending, and consider a
        licensed attorney for significant matters.
      </p>
    </div>
  );
}
