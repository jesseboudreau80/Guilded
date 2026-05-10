
import { redirect } from "next/navigation";
import { getGuildedSession } from "@/lib/auth";
import { consultationsApi } from "@/lib/api";
import ConsultationCheckout from "./checkout";

export default async function StrategySessionPage() {
  const session = await getGuildedSession();
  if (!session?.user?.accessToken) redirect("/");

  const res = await consultationsApi.eligibility(session.user.accessToken);
  if (!res.ok) redirect("/");

  const eligibility = await res.json();

  return (
    <section>
      <h1 className="text-3xl font-bold">Strategy Session</h1>
      <p className="mt-2 text-slate-400">One-on-one credit literacy consultation.</p>

      <div className="mt-8 rounded-xl bg-slate-800 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Session Rate</p>
            <p className="mt-1 text-2xl font-bold">
              ${(eligibility.price / 100).toFixed(0)}/hr
            </p>
            {eligibility.discounted_eligible && (
              <p className="mt-1 text-sm text-green-400">Loyalty discount applied</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Discounted Sessions Used</p>
            <p className="mt-1 text-lg font-semibold">
              {eligibility.used_discounted_in_365_days} / 4 this year
            </p>
          </div>
        </div>

        {eligibility.next_eligible_date && (
          <p className="mt-4 text-sm text-slate-500">
            Next discounted session available:{" "}
            {new Date(eligibility.next_eligible_date).toLocaleDateString()}
          </p>
        )}

        <ConsultationCheckout token={session.user.accessToken} />
      </div>
    </section>
  );
}
