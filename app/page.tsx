"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type Mode = "register" | "login";

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      // Auto sign-in after successful registration.
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign-in failed. Please sign in manually.");
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">Guilded</h1>
      <p className="mt-4 max-w-2xl text-slate-400">
        Educational credit literacy platform.
      </p>

      <div className="mt-8 w-full max-w-md">
        <div className="mb-6 flex rounded-lg bg-slate-800 p-1">
          <button
            onClick={() => { setMode("register"); setError(null); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "register" ? "bg-slate-600 text-white" : "text-slate-400"
            }`}
          >
            Register
          </button>
          <button
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "login" ? "bg-slate-600 text-white" : "text-slate-400"
            }`}
          >
            Sign in
          </button>
        </div>

        <form
          onSubmit={mode === "register" ? handleRegister : handleLogin}
          className="grid gap-3 text-left"
        >
          {mode === "register" && (
            <input
              className="rounded-lg bg-slate-800 p-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          )}
          <input
            type="email"
            className="rounded-lg bg-slate-800 p-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="rounded-lg bg-slate-800 p-3 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          {error && (
            <p className="rounded-lg bg-red-900/40 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-600 py-3 font-medium text-white transition-colors hover:bg-slate-500 disabled:opacity-50"
          >
            {loading
              ? "Please wait…"
              : mode === "register"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
