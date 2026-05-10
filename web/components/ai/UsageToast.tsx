"use client";

import { useEffect, useState } from "react";

type Props = {
  message: string | null;
};

export function UsageToast({ message }: Props) {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [message]);

  if (!visible || !message) return null;

  return (
    <div className="fixed right-4 top-16 z-40 max-w-xs animate-fade-in rounded-xl border border-amber-700/40 bg-slate-900 px-4 py-3 shadow-xl md:top-4">
      <p className="text-xs text-amber-400">{message}</p>
    </div>
  );
}
