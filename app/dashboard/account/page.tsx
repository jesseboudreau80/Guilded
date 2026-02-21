import { requireUser } from "@/lib/server-auth";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Account</h1>
      <div className="mt-4 rounded border border-slate-700 bg-card p-4">
        <p>Tier: {user?.tier}</p>
        <p>Subscription status: {user?.subscriptionStatus}</p>
        <p>Successful billing cycles: {user?.successfulBillingCount}</p>
        <p>AI usage this cycle: {user?.aiUsageCount}</p>
      </div>
    </div>
  );
}
