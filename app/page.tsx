import Link from "next/link";
import { Shield, Bot, BookOpen, Scale, Calendar, Check, ChevronRight } from "lucide-react";
import { TIER_INFO } from "@/types";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-white">
      {/* Nav */}
      <nav className="border-b border-surface-border bg-surface-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold">Guilded</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-700/50 bg-brand-900/20 px-4 py-1.5 text-xs font-medium text-brand-300">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Educational Credit Literacy Platform
        </div>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-white sm:text-6xl">
          Master Your Credit.
          <br />
          <span className="text-gradient">Build Your Future.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
          Guilded is an AI-powered educational platform that teaches you credit
          literacy from the ground up — with structured modules, expert
          templates, and personalized strategy sessions.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Start Free <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-surface-border px-6 py-3 text-base font-medium text-gray-300 hover:border-brand-700 hover:text-white transition-colors"
          >
            Sign In
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-600">
          Free to start · No credit card required · Educational content only
        </p>
      </section>

      {/* Features */}
      <section className="border-t border-surface-border bg-surface-card/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">
            Everything you need to understand credit
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BookOpen,
                title: "Structured LMS",
                desc: "Curated modules from basics to advanced credit topics",
              },
              {
                icon: Bot,
                title: "AI Assistant",
                desc: "Get educational answers to your credit questions 24/7",
              },
              {
                icon: Scale,
                title: "Arbitration Module",
                desc: "Advanced education on FCRA and consumer rights",
              },
              {
                icon: Calendar,
                title: "Strategy Sessions",
                desc: "1-on-1 expert consultations for personalized guidance",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-surface-border bg-surface-card p-6"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600/20">
                  <Icon className="h-5 w-5 text-brand-400" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{title}</h3>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">
              Choose Your Level
            </h2>
            <p className="mt-3 text-gray-400">
              Start free, upgrade when you&apos;re ready.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TIER_INFO.map((tier) => (
              <div
                key={tier.tier}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  tier.highlighted
                    ? "border-brand-500 bg-brand-900/20"
                    : "border-surface-border bg-surface-card"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">
                      Popular
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-400">
                    {tier.label}
                  </p>
                  <div className="mt-1">
                    {tier.price === 0 ? (
                      <span className="text-3xl font-bold text-white">
                        Free
                      </span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">
                          ${tier.price}
                        </span>
                        <span className="text-gray-500">/mo</span>
                      </>
                    )}
                  </div>
                </div>
                <ul className="flex-1 space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`rounded-lg py-2.5 text-center text-sm font-medium transition-colors ${
                    tier.highlighted
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "border border-surface-border text-gray-300 hover:border-brand-700 hover:text-white"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-surface-border bg-surface-card/30 py-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-400">Educational Platform Disclaimer:</strong>{" "}
            Guilded is an educational credit literacy platform, not a credit
            repair organization. We do not perform credit repair services and do
            not guarantee improvements to your credit score. All content is for
            educational purposes only. Individual results vary. Consult a
            qualified professional for personalized advice.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-500" />
            <span>© 2025 Guilded. Educational platform.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-white">
              Login
            </Link>
            <Link href="/register" className="hover:text-white">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
