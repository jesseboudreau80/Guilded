import { requireUser } from "@/lib/server-auth";
import { canAccess } from "@/lib/tiers";

export default async function ArbitrationPage() {
  const user = await requireUser();
  if (!user) return null;

  const allowed = canAccess(user.tier, "MASTER");
  if (!allowed) {
    return <p className="text-slate-300">Arbitration module is available for Master and Hero tiers.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Arbitration Module</h1>
      <p className="mt-2 text-slate-300">Advanced educational workflows and guides for arbitration preparation.</p>
    </div>
  );
}
