import { redirect } from "next/navigation";
import { getGuildedSession } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { LockedCard } from "@/components/ui/LockedCard";

export default async function ArbitrationPage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const res = await authApi.me(session.user.accessToken);
  if (!res.ok) redirect("/");

  const user = await res.json();

  return (
    <section>
      <h1 className="text-3xl font-bold">Arbitration</h1>
      <p className="mt-2 text-slate-400">
        Structured escalation strategy for credit disputes.
      </p>

      <div className="mt-8">
        <LockedCard
          title="Arbitration"
          requiredTier="MASTER"
          currentTier={user.tier}
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-800 p-5">
              <h2 className="text-lg font-semibold">Arbitration Essentials</h2>
              <p className="mt-2 text-sm text-slate-400">
                Master-level structured escalation strategy. Advanced credit
                dispute techniques used by financial professionals.
              </p>
            </div>
            <div className="rounded-xl bg-slate-800 p-4 space-y-2">
              <div className="h-3.5 rounded bg-slate-700 w-4/5" />
              <div className="h-3.5 rounded bg-slate-700 w-3/5" />
              <div className="h-3.5 rounded bg-slate-700 w-2/3" />
            </div>
            <div className="rounded-xl bg-slate-800 p-4 space-y-2">
              <div className="h-3.5 rounded bg-slate-700 w-3/4" />
              <div className="h-3.5 rounded bg-slate-700 w-5/6" />
            </div>
          </div>
        </LockedCard>

        {(user.tier === "MASTER" || user.tier === "HERO") && (
          <p className="mt-6 text-slate-300">
            Access your arbitration modules through the{" "}
            <a href="/dashboard/modules" className="text-gold underline-offset-2 hover:underline">
              Modules
            </a>{" "}
            page.
          </p>
        )}
      </div>
    </section>
  );
}
