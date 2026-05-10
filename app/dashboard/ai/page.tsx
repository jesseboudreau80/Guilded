"use client";

import { FormEvent, useState } from "react";

export default function AIPage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [blocked, setBlocked] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!res.ok && data.upgradeRequired) {
      setBlocked(true);
      return;
    }
    setResult(data.response || data.error);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">AI Assistant</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="h-40 w-full rounded bg-card p-3" />
        <button className="rounded bg-accent px-4 py-2">Send</button>
      </form>
      {blocked && <div className="mt-4 rounded border border-amber-500 bg-amber-500/10 p-3">Monthly AI cap reached. Please upgrade your plan.</div>}
      {result && <pre className="mt-4 whitespace-pre-wrap rounded bg-card p-4 text-sm">{result}</pre>}
    </div>
  );
}
