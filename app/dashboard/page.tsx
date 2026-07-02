import { requireUser } from "@/lib/server-auth";

export default async function DashboardHome() {
  const user = await requireUser();
  return (
    <section>
      <h1 className="text-3xl font-bold">Welcome back{user?.name ? `, ${user.name}` : ""}</h1>
      <p className="mt-2 text-slate-300">
        Pick up where you left off in My Journey, work the modules, and use the AI assistant when you need a concept
        explained. Education first — no promises, no shortcuts.
      </p>
    </section>
  );
}
