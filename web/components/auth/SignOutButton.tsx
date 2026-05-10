"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { track, reset } from "@/lib/analytics";

export function SignOutButton() {
  const handleSignOut = () => {
    track("logout");
    reset();
    signOut({ callbackUrl: "/" });
  };

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition-colors hover:border-red-900/60 hover:bg-red-900/20 hover:text-red-400"
    >
      <LogOut size={13} />
      Sign Out
    </button>
  );
}
