import { requireUser } from "@/lib/server-auth";

export default async function DashboardHome() {
  const user = await requireUser();
  return (
    <section>
      <h1 className="text-3xl font-bold">Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
      <p className="mt-2 text-slate-300">Track your progress, manage your plan, and use educational AI tools responsibly.</p>
    </section>
  );
}
