"use client";

import { FormEvent, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { z } from "zod";
import {
  Shield, FileText, BookOpen, MessageSquare,
  TrendingUp, Lock, ChevronRight, Star,
  Search, Target, Zap,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { track } from "@/lib/analytics";
import Link from "next/link";

// ── Validation ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters"),
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
const loginSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type Mode = "register" | "login";

const BETA_INVITE_REQUIRED = process.env.NEXT_PUBLIC_BETA_INVITE_REQUIRED === "true";

// ── Pricing tiers ─────────────────────────────────────────────────────────────

const PRICING = [
  {
    name:     "Apprentice",
    price:    "Free",
    sub:      "No card required",
    color:    "border-slate-700",
    features: [
      "1 credit audit upload",
      "5 AI guidance questions / week",
      "4 foundational training modules",
      "Basic dispute letter generation",
      "Recovery roadmap",
    ],
    cta:      "Start Free",
    featured: false,
  },
  {
    name:     "Journeyman",
    price:    "$25",
    sub:      "per month",
    color:    "border-gold/40",
    features: [
      "Unlimited audits",
      "20 AI questions / month",
      "All 7 training modules",
      "Advanced dispute tactics",
      "Bureau-specific targeting",
      "Priority letter strategies",
    ],
    cta:      "Advance to Journeyman",
    featured: true,
  },
  {
    name:     "Master",
    price:    "$49",
    sub:      "per month",
    color:    "border-slate-700",
    features: [
      "Everything in Journeyman",
      "100 AI questions / month",
      "Arbitration playbook",
      "Attorney-grade AI guidance",
      "Advanced recovery intelligence",
    ],
    cta:      "Advance to Master",
    featured: false,
  },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: "Is Guilded a credit repair company?",
    a: "No. Guilded is an educational platform that teaches you to exercise your own legal rights under FCRA and FDCPA. We don&apos;t dispute anything on your behalf — we give you the knowledge, tools, and AI guidance to do it yourself.",
  },
  {
    q: "Is the AI guidance legal advice?",
    a: "No. All content from Guild Counsel is for educational purposes only and does not constitute legal or financial advice. We strongly recommend consulting a licensed consumer attorney for situations involving legal action.",
  },
  {
    q: "How secure is my credit report?",
    a: "Your credit report PDF is processed to extract account data and then permanently deleted. We never store raw PDFs. Extracted data is encrypted at rest. Billing is handled by Stripe — we never see your card details.",
  },
  {
    q: "Can Guilded guarantee my score will improve?",
    a: "No. Results depend on your individual credit profile, the accuracy of bureau reporting, and your consistent action. Guilded provides the tools and strategy — outcomes vary based on many factors outside our control.",
  },
  {
    q: "How is Guilded different from credit monitoring apps?",
    a: "Credit monitoring shows you your score. Guilded is an active recovery system — it analyzes your report for dispute opportunities, trains you on consumer protection law, and generates the actual dispute letters you need to act.",
  },
  {
    q: "What happens when I cancel my subscription?",
    a: "You keep access through the end of your billing period. Your account data and audit history are preserved. You revert to Apprentice tier access after the period ends.",
  },
];

// ── Recovery flow steps ───────────────────────────────────────────────────────

const RECOVERY_STEPS = [
  {
    icon:  FileText,
    title: "Upload Your Report",
    desc:  "Upload your credit report PDF. Guilded reads it securely and extracts every account, balance, and status on record.",
    color: "text-blue-400",
    border:"border-blue-500/20 bg-blue-500/5",
  },
  {
    icon:  Search,
    title: "AI Risk Analysis",
    desc:  "The Guild AI identifies every dispute opportunity, FCRA violation, and risk factor — ranked by impact on your score.",
    color: "text-gold",
    border:"border-gold/20 bg-gold/5",
  },
  {
    icon:  BookOpen,
    title: "Build Your Strategy",
    desc:  "Seven structured training modules give you the consumer law knowledge and tactical frameworks your recovery requires.",
    color: "text-indigo-400",
    border:"border-indigo-500/20 bg-indigo-500/5",
  },
  {
    icon:  Target,
    title: "Generate Actions",
    desc:  "Dispute letters, debt validation requests, goodwill adjustments — generated for your specific accounts and situation.",
    color: "text-amber-400",
    border:"border-amber-500/20 bg-amber-500/5",
  },
  {
    icon:  TrendingUp,
    title: "Restore Your Position",
    desc:  "Systematic, consistent action compounds over time. Track your rank advancement, XP, and recovery milestones.",
    color: "text-emerald-400",
    border:"border-emerald-500/20 bg-emerald-500/5",
  },
];

const SYSTEMS = [
  {
    icon:  FileText,
    title: "Credit Audit",
    desc:  "Upload any credit report. Get a complete risk profile, account inventory, and dispute roadmap powered by AI analysis.",
    tier:  "All tiers",
  },
  {
    icon:  BookOpen,
    title: "Guild Academy",
    desc:  "Seven structured training modules covering FCRA rights, collections combat, dispute strategy, utilization tactics, and long-term restoration.",
    tier:  "Apprentice+",
  },
  {
    icon:  MessageSquare,
    title: "Guild Counsel",
    desc:  "Tactical credit strategy guidance available throughout the platform, aligned with your current recovery phase and situation.",
    tier:  "All tiers",
  },
];

const TRUST_SIGNALS = [
  { icon: Lock,    text: "Encrypted document processing" },
  { icon: Shield,  text: "Protected recovery environment" },
  { icon: BookOpen, text: "Educational guidance — not a credit repair company" },
  { icon: Zap,     text: "Consumer protection law aligned" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [mode,       setMode]       = useState<Mode>("register");
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [openFaq,    setOpenFaq]    = useState<number | null>(null);

  const authRef = useRef<HTMLDivElement>(null);

  const scrollToAuth = () => {
    authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) { setError(parsed.error.errors[0].message); return; }

    setLoading(true);
    try {
      const res  = await authApi.register(name, email, password, BETA_INVITE_REQUIRED ? inviteCode : undefined);
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? "Registration failed"); return; }

      track("signup", { tier: "APPRENTICE" });
      const result = await signIn("credentials", { email, password, callbackUrl: "/dashboard", redirect: false });
      if (result?.error) setError("Account created. Please sign in.");
      else if (result?.url) window.location.href = result.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) { setError(parsed.error.errors[0].message); return; }

    setLoading(true);
    try {
      track("login");
      const result = await signIn("credentials", { email, password, callbackUrl: "/dashboard", redirect: false });
      if (result?.error) setError("Invalid email or password");
      else if (result?.url) window.location.href = result.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Shield size={17} className="text-gold" />
          <span className="text-sm font-bold text-white">Guilded</span>
        </div>
        <button
          onClick={() => { setMode("login"); scrollToAuth(); }}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Sign In
        </button>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-20 text-center md:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent pointer-events-none" />

        {/* Beta badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
          Early Access · Founding Member Program
          <Star size={10} />
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl md:text-6xl max-w-3xl mx-auto leading-tight">
          Financial Recovery.<br />
          <span className="text-gold">Structured. Strategic. Protected.</span>
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-slate-400 max-w-2xl mx-auto">
          Guilded is a structured educational system for rebuilding your financial position —
          built on consumer protection law, intelligent analysis, and guided recovery training.
        </p>

        {/* Community callout */}
        <p className="mt-4 text-xs text-slate-600">
          Built for the{" "}
          <span className="text-slate-400 font-medium">DIY Credit Repair 101 community</span>
          {" "}· by someone who&apos;s been in the trenches with you
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => { setMode("register"); scrollToAuth(); }}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
          >
            Begin Your Recovery <ChevronRight size={14} />
          </button>
          <button
            onClick={() => { setMode("login"); scrollToAuth(); }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-7 py-3.5 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
          >
            Sign In
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-600">
          Free Apprentice tier · No credit card required · Upgrade when ready
        </p>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-800/60 bg-slate-900/30 px-6 py-5">
        <div className="mx-auto max-w-4xl grid grid-cols-2 gap-3 md:grid-cols-4">
          {TRUST_SIGNALS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs text-slate-500">
              <Icon size={13} className="text-gold/60 shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">The Recovery System</p>
            <h2 className="text-2xl font-semibold text-slate-100 md:text-3xl">How Guilded works</h2>
            <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto">
              A five-stage process designed for systematic, durable credit recovery — not quick fixes.
            </p>
          </div>

          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-5 md:gap-4">
            {RECOVERY_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative">
                  {/* Connector line — desktop only */}
                  {i < RECOVERY_STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(100%_-_8px)] w-4 h-px bg-slate-800 z-10" />
                  )}
                  <div className={`flex flex-col items-start rounded-xl border p-4 ${step.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={15} className={step.color} />
                      <span className="text-xs font-mono text-slate-600">0{i + 1}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-100">{step.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Systems overview ──────────────────────────────────────────────── */}
      <section className="border-t border-slate-800/60 px-6 py-20 bg-slate-900/20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">Platform</p>
            <h2 className="text-2xl font-semibold text-slate-100 md:text-3xl">Three integrated systems</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {SYSTEMS.map(({ icon: Icon, title, desc, tier }) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg border border-gold/30 bg-gold/10 flex items-center justify-center">
                    <Icon size={15} className="text-gold" />
                  </div>
                  <span className="text-xs text-slate-600">{tier}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 border-t border-slate-800/60">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">Pricing</p>
            <h2 className="text-2xl font-semibold text-slate-100 md:text-3xl">Start free. Advance when ready.</h2>
            <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">
              The Apprentice tier gives you everything you need to start your recovery. Upgrade when you need deeper intelligence.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PRICING.map((tier) => (
              <div key={tier.name} className={`relative flex flex-col rounded-2xl border p-6 ${
                tier.featured
                  ? "border-gold/40 bg-gradient-to-br from-gold/10 to-slate-900"
                  : "border-slate-800 bg-slate-900/60"
              }`}>
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-200">{tier.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-slate-100">{tier.price}</span>
                    {tier.price !== "Free" && <span className="text-xs text-slate-500">{tier.sub}</span>}
                  </div>
                  {tier.price === "Free" && <span className="text-xs text-slate-500">{tier.sub}</span>}
                </div>
                <ul className="flex-1 space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gold/60 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={scrollToAuth}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
                    tier.featured
                      ? "bg-gold text-slate-950"
                      : "border border-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 border-t border-slate-800/60 bg-slate-900/20">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">FAQ</p>
            <h2 className="text-2xl font-semibold text-slate-100">Common questions</h2>
          </div>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-800 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/40 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-200">{item.q}</span>
                  <span className="text-slate-600 ml-4 shrink-0">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="border-t border-slate-800 px-5 pb-4 pt-3">
                    <p
                      className="text-sm text-slate-400 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item.a }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Educational disclaimer callout ────────────────────────────────── */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-5 text-center">
          <p className="text-xs font-semibold text-slate-400 mb-1">Educational Platform Notice</p>
          <p className="text-xs leading-relaxed text-slate-600">
            Guilded is an educational platform — not a credit repair company, law firm, or financial institution.
            All guidance is for informational purposes only. We teach you to use your own legal rights.
            Results vary based on individual credit profiles and the accuracy of information reported to bureaus.
          </p>
        </div>
      </section>

      {/* ── Auth forms ────────────────────────────────────────────────────── */}
      <section ref={authRef} id="join" className="px-6 py-16 border-t border-slate-800/60">
        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold mb-4">
              <Shield size={11} /> Protected Enrollment
            </div>
            <h2 className="text-xl font-semibold text-slate-100">
              {mode === "register" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "register"
                ? "Free Apprentice access — no payment required to start"
                : "Sign in to continue your recovery campaign"}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="mb-6 flex rounded-xl border border-slate-800 p-1 bg-slate-900">
            {(["register", "login"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {m === "register" ? "Create Account" : "Sign In"}
              </button>
            ))}
          </div>

          <form
            onSubmit={mode === "register" ? handleRegister : handleLogin}
            className="space-y-3"
          >
            {mode === "register" && (
              <>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
                {BETA_INVITE_REQUIRED && (
                  <input
                    className="w-full rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30"
                    placeholder="Invite code (required)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    required={BETA_INVITE_REQUIRED}
                  />
                )}
              </>
            )}
            <input
              type="email"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <input
              type="password"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
            />

            {mode === "login" && (
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-gold transition-colors">
                  Forgot password?
                </Link>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-900/30 border border-red-900/60 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gold py-3.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Please wait…"
                : mode === "register"
                ? "Create Free Account"
                : "Sign In"}
            </button>
          </form>

          {mode === "register" && (
            <p className="mt-4 text-center text-xs text-slate-600 leading-relaxed">
              By creating an account you agree to our{" "}
              <Link href="/terms"         className="text-slate-500 hover:text-gold transition-colors">Terms</Link>
              {" and "}
              <Link href="/privacy"       className="text-slate-500 hover:text-gold transition-colors">Privacy Policy</Link>.
              {" "}
              <Link href="/ai-disclaimer" className="text-slate-500 hover:text-gold transition-colors">AI Disclaimer</Link>.
            </p>
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 px-6 py-8">
        <div className="mx-auto max-w-4xl flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-gold" />
            <span className="text-sm font-bold text-white">Guilded</span>
            <span className="text-xs text-slate-600 ml-2">© 2026 · Early Access</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            <Link href="/terms"         className="hover:text-slate-400 transition-colors">Terms</Link>
            <Link href="/privacy"       className="hover:text-slate-400 transition-colors">Privacy</Link>
            <Link href="/security"      className="hover:text-slate-400 transition-colors">Security</Link>
            <Link href="/ai-disclaimer" className="hover:text-slate-400 transition-colors">AI Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
