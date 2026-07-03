"use client";

import { useState } from "react";

export function CopyTemplateButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={copy} className="rounded bg-accent px-4 py-2 font-medium text-white text-sm">
      {copied ? "Copied ✓" : "Copy template"}
    </button>
  );
}
