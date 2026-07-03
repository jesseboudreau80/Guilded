"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

const features = [
  {
    title: "A real curriculum, not tips",
    body: "Six modules and 27 lessons: reading your reports, disputes that work, handling collectors, bankruptcy without the myths, consumer arbitration, and rebuilding toward real wealth.",
  },
  {
    title: "Letters that hold up",
    body: "Eight battle-tested templates — bureau disputes, debt validation, settlement offers, pre-arbitration notices — each with when-to-use guidance and a checklist before you send.",
  },
  {
    title: "Help when you're stuck",
    body: "An AI assistant for plain-English answers, and one-on-one strategy sessions with member pricing when you want a human on your side.",
  },
];

const plans = [
  ["Apprentice", "Free", "Foundations curriculum"],
  ["Journeyman", "$9/mo", "Disputes, collections + templates"],
  ["Master", "$39/mo", "Bankruptcy + arbitration"],
  ["Hero", "$79/mo", "Everything + capstone"],
] as const;

export default function HomePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const register = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Registration failed. Please check your details.");
      return;
    }
    await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
  };

  const login = async (e: FormEvent) => {
    e.preventDefault();
    await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
  };

  return (
    <main className="mx-auto max-w-6xl px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-xl font-bold text-emerald-700">Plutus</span>
        <a href="#get-started" className="rounded bg-accent px-4 py-2 font-medium text-white text-sm">
          Get started
        </a>
      </header>

      <section className="py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          The consumer&apos;s solution to bad credit
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-5xl font-bold leading-tight">
          Bad credit isn&apos;t a life sentence. It&apos;s a skills gap.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Plutus teaches you to read your credit reports, dispute what&apos;s wrong, deal with collectors from
          strength, and rebuild for good — education and tools, never empty promises.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a href="#get-started" className="rounded bg-accent px-6 py-3 font-medium text-white">
            Start free
          </a>
          <a href="#plans" className="rounded border border-slate-300 bg-card px-6 py-3 font-medium">
            See plans
          </a>
        </div>
      </section>

      <section className="grid gap-4 py-8 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg border border-slate-200 bg-card p-6 text-left">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <section id="plans" className="py-8">
        <h2 className="text-center text-2xl font-semibold">Start free. Upgrade when you need more.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {plans.map(([tier, price, blurb]) => (
            <div key={tier} className="rounded-lg border border-slate-200 bg-card p-5 text-center">
              <p className="font-semibold">{tier}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{price}</p>
              <p className="mt-2 text-xs text-slate-500">{blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="get-started" className="mx-auto max-w-md py-12">
        <h2 className="text-center text-2xl font-semibold">Create your free account</h2>
        <form className="mt-6 grid gap-3 text-left" onSubmit={register}>
          <input className="rounded border border-slate-300 bg-card p-3" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded border border-slate-300 bg-card p-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" className="rounded border border-slate-300 bg-card p-3" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded bg-accent px-4 py-2 font-medium text-white">Create account</button>
            <button type="button" onClick={login} className="rounded border border-slate-300 bg-card px-4 py-2 font-medium">Sign in</button>
          </div>
          {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </form>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        Plutus is an educational platform. Nothing here is legal or financial advice, and no outcome is promised.
      </footer>
    </main>
  );
}
