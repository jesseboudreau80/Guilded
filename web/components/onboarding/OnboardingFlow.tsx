"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, FileText, BookOpen, MessageSquare, ChevronRight, X } from "lucide-react";
import { track } from "@/lib/analytics";

const LS_KEY = "guilded:onboarded";

type Step = 0 | 1 | 2;

const STEPS = [
  {
    icon: Shield,
    title: "Welcome to Guilded",
    subtitle: "Your financial recovery command center",
    body: "Guilded is a structured credit recovery system — not a quick-fix service. We give you the knowledge, tools, and tactical guidance to systematically rebuild your financial position.",
    note: "Educational guidance only. Not legal or financial advice.",
  },
  {
    icon: null,
    title: "Your recovery path",
    subtitle: "Three systems. One mission.",
    body: null,
    note: null,
  },
  {
    icon: FileText,
    title: "Your first mission",
    subtitle: "Start with a credit audit",
    body: "Upload your credit report and the Guild AI will identify every dispute opportunity, risk factor, and recovery path. It takes about 60 seconds.",
    note: "Your report is processed securely and the raw file is deleted after analysis.",
  },
];

const PATH_CARDS = [
  { icon: FileText,     label: "Credit Audit",   desc: "Identify every issue and opportunity" },
  { icon: BookOpen,     label: "Guild Academy",  desc: "Build strategy through guided training" },
  { icon: MessageSquare, label: "Guild Counsel", desc: "Get tactical guidance on any step" },
];

export function OnboardingFlow({ onComplete }: { onComplete?: () => void }) {
  const [step,    setStep]    = useState<Step>(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only for new users who haven't seen onboarding
    const done = localStorage.getItem(LS_KEY);
    if (!done) {
      setTimeout(() => setVisible(true), 800); // slight delay for page load
      track("onboarding_started");
    }
  }, []);

  const dismiss = (completed: boolean) => {
    localStorage.setItem(LS_KEY, "true");
    setVisible(false);
    track(completed ? "onboarding_completed" : "onboarding_skipped");
    onComplete?.();
  };

  if (!visible) return null;

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const isLast = step === 2;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
        onClick={() => dismiss(false)}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[10vh] z-50 mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-gold" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">Guild Academy</span>
          </div>
          <button onClick={() => dismiss(false)} className="rounded p-1 text-slate-600 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-5 pt-4">
          {([0, 1, 2] as Step[]).map((s) => (
            <div key={s} className={`h-1 rounded-full transition-all ${s === step ? "flex-1 bg-gold" : s < step ? "flex-1 bg-gold/40" : "flex-1 bg-slate-800"}`} />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-6">
          {step !== 1 && Icon && (
            <div className="h-11 w-11 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center mb-4">
              <Icon size={20} className="text-gold" />
            </div>
          )}

          <h2 className="text-lg font-semibold text-slate-100">{currentStep.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{currentStep.subtitle}</p>

          {step === 1 ? (
            // Path overview step
            <div className="mt-5 space-y-3">
              {PATH_CARDS.map(({ icon: CardIcon, label, desc }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3">
                  <div className="h-8 w-8 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
                    <CardIcon size={15} className="text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{currentStep.body}</p>
          )}

          {currentStep.note && (
            <p className="mt-4 text-xs text-slate-600 leading-relaxed border-t border-slate-800 pt-4">
              {currentStep.note}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
          {step > 0 ? (
            <button onClick={() => setStep((s) => (s - 1) as Step)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Back
            </button>
          ) : (
            <button onClick={() => dismiss(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Skip
            </button>
          )}

          {isLast ? (
            <Link
              href="/dashboard/audit/start"
              onClick={() => dismiss(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
            >
              Run My First Audit <ChevronRight size={14} />
            </Link>
          ) : (
            <button
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Continue <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
