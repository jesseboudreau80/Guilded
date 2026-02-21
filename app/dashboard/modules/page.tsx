import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { canAccess } from "@/lib/tiers";

export default async function ModulesPage() {
  const user = await requireUser();
  if (!user) return null;

  const modules = await prisma.module.findMany({ orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } });
  const visible = modules.filter((m) => canAccess(user.tier, m.requiredTier));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Modules</h1>
      <div className="mt-5 space-y-4">
        {visible.map((module) => (
          <div key={module.id} className="rounded border border-slate-700 bg-card p-4">
            <h2 className="font-semibold">{module.title}</h2>
            <ul className="mt-2 list-disc pl-5 text-slate-300">
              {module.lessons.map((lesson) => (
                <li key={lesson.id}>{lesson.title}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
