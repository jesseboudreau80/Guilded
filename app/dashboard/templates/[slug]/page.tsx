import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server-auth";
import { canAccess, TIER_LABELS } from "@/lib/tiers";
import { letterTemplates, TEMPLATE_LIBRARY_NOTE } from "@/content/letter-templates";
import { CopyTemplateButton } from "@/components/copy-template-button";

export default async function TemplatePage({ params }: { params: { slug: string } }) {
  const user = await requireUser();
  if (!user) return null;

  const template = letterTemplates.find((t) => t.slug === params.slug);
  if (!template) notFound();

  if (!canAccess(user.tier, template.requiredTier)) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">{template.title}</h1>
        <p className="mt-3 text-slate-300">This template unlocks with the {TIER_LABELS[template.requiredTier]} plan.</p>
        <Link href="/dashboard/upgrade" className="mt-4 inline-block rounded bg-accent px-4 py-2">
          View plans
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl">
      <Link href="/dashboard/templates" className="text-sm text-slate-400 hover:text-white">
        ← Templates Library
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{template.title}</h1>
      <p className="mt-3 text-slate-300">{template.whenToUse}</p>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">The letter</h2>
        <CopyTemplateButton text={template.body} />
      </div>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded border border-slate-700 bg-card p-4 text-sm leading-relaxed text-slate-200">
        {template.body}
      </pre>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Before you send it</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
        {template.tips.map((tip, i) => (
          <li key={i}>{tip}</li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-slate-500">{TEMPLATE_LIBRARY_NOTE}</p>
    </article>
  );
}
