"use client";

import { Menu } from "lucide-react";

export function MobileMenuButton() {
  return (
    <button
      className="p-1 text-slate-400 transition-colors hover:text-white md:hidden"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("guilded:sidebar-open"))
      }
      aria-label="Open navigation"
    >
      <Menu size={20} />
    </button>
  );
}
