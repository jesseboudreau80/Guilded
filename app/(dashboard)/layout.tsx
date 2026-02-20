import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true, name: true, email: true },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userTier={user?.tier ?? "APPRENTICE"}
        userName={user?.name}
        userEmail={user?.email}
      />
      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
}
