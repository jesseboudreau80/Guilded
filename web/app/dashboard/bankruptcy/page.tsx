import { redirect } from "next/navigation";
import { getGuildedSession } from "@/lib/auth";
import { bankruptcyApi } from "@/lib/api";

type Step = {
  key: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
};

type BankruptcyCase = {
  id: string;
  chapter_type: "CHAPTER_7" | "CHAPTER_13";
  status: string;
  notes: string | null;
  steps: Step[];
};

type InfoChapter = {
  name: string;
  summary: string;
  typical_duration: string;
};

type BankruptcyInfo = {
  disclaimer: string;
  chapters: Record<string, InfoChapter>;
  resources: { label: string; url: string }[];
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PLANNING:    "bg-slate-700 text-slate-300",
    IN_PROGRESS: "bg-amber-900 text-amber-300",
    FILED:       "bg-blue-900 text-blue-300",
    DISCHARGED:  "bg-green-900 text-green-300",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-slate-700 text-slate-300"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default async function BankruptcyPage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const token = session.user.accessToken;

  const [infoRes, caseRes] = await Promise.all([
    bankruptcyApi.info(token),
    bankruptcyApi.getCase(token),
  ]);

  if (!infoRes.ok || !caseRes.ok) redirect("/");

  const info: BankruptcyInfo           = await infoRes.json();
  const { case: bcase }: { case: BankruptcyCase | null } = await caseRes.json();

  const completedCount = bcase ? bcase.steps.filter((s) => s.completed).length : 0;
  const totalSteps     = bcase ? bcase.steps.length : 0;

  return (
    <section className="max-w-3xl">
      <h1 className="text-3xl font-bold">Bankruptcy Filing Guide</h1>
      <p className="mt-2 text-slate-400">Educational toolkit for understanding the bankruptcy process.</p>

      {/* Disclaimer */}
      <div className="mt-6 rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-300">
        {info.disclaimer}
      </div>

      {/* Chapter overview */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Object.entries(info.chapters).map(([key, chapter]) => (
          <div key={key} className="rounded-xl bg-slate-800 p-5">
            <h2 className="font-semibold text-white">{chapter.name}</h2>
            <p className="mt-2 text-sm text-slate-400">{chapter.summary}</p>
            <p className="mt-3 text-xs text-slate-500">Typical duration: {chapter.typical_duration}</p>
          </div>
        ))}
      </div>

      {/* Case tracker */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Case Tracker</h2>
          {!bcase && (
            <a
              href="/dashboard/bankruptcy/new-case"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
            >
              Start Tracking
            </a>
          )}
        </div>

        {!bcase ? (
          <p className="mt-4 text-slate-500">No case started. Click &ldquo;Start Tracking&rdquo; to begin logging your progress.</p>
        ) : (
          <div className="mt-4 rounded-xl bg-slate-800 p-5">
            <div className="flex items-center gap-3">
              <p className="font-medium">{info.chapters[bcase.chapter_type]?.name ?? bcase.chapter_type}</p>
              <StatusBadge status={bcase.status} />
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{completedCount} of {totalSteps} steps complete</span>
                <span>{Math.round((completedCount / totalSteps) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-700">
                <div
                  className="h-2 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${(completedCount / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Steps checklist */}
            <ul className="mt-5 space-y-2">
              {bcase.steps.map((step) => (
                <li key={step.key} className="flex items-start gap-3">
                  <span className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border ${
                    step.completed
                      ? "border-green-500 bg-green-500"
                      : "border-slate-600 bg-transparent"
                  }`} />
                  <div>
                    <p className={`text-sm ${step.completed ? "text-slate-400 line-through" : "text-slate-200"}`}>
                      {step.label}
                    </p>
                    {step.completed_at && (
                      <p className="text-xs text-slate-600">
                        {new Date(step.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {bcase.notes && (
              <div className="mt-5 rounded-lg bg-slate-700/50 p-3 text-sm text-slate-400">
                <span className="font-medium text-slate-300">Notes: </span>
                {bcase.notes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* External resources */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold">Official Resources</h2>
        <ul className="mt-3 space-y-2">
          {info.resources.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-400 underline hover:text-amber-300"
              >
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
