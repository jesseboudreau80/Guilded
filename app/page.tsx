"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function HomePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = async (e: FormEvent) => {
    e.preventDefault();
    await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
  };

  const login = async (e: FormEvent) => {
    e.preventDefault();
    await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold">Guilded</h1>
      <p className="mt-4 max-w-2xl text-slate-300">Educational credit literacy SaaS platform.</p>
      <form className="mt-8 grid w-full max-w-md gap-3 text-left" onSubmit={register}>
        <input className="rounded bg-card p-3" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded bg-card p-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="rounded bg-card p-3" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-slate-700 px-4 py-2">Register</button>
          <button onClick={login} className="rounded bg-accent px-4 py-2">Sign in</button>
        </div>
      </form>
    </main>
  );
}
