"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield, FileText, BookOpen, MessageSquare,
  ChevronRight, X, CheckCircle, Lock, Download,
} from "lucide-react";
import { track } from "@/lib/analytics";

const LS_KEY = "guilded:onboarded";
type Step = 0 | 1 | 2 | 3 | 4;
const TOTAL_STEPS = 5;

const PATH_CARDS = [
  { icon: FileText,       label: "Credit Audit",  desc: "Extract and analyze every account on your report" },
  { icon: BookOpen,       label: "Guild Academy", desc: "Learn consumer law and recovery strategy"          },
  { icon: MessageSquare,  label: "Guild Counsel", desc: "AI guidance available on every page"              },
];

const UPLOAD_TIPS = [
  { ok: true,  text: "Download directly from AnnualCreditReport.com" },
  { ok: true,  text: "Download from your bureau portal (Experian, Equifax, TransUnion)" },
  { ok: true,  text: "PDF from a credit monitoring service (CreditKarma, MyFICO)" },
  { ok: false, text: "A scanned photo of a printed report (image PDFs can't extract)" },
  { ok: false, text: "A screenshot saved as PDF" },
];

const AI_PROCESS = [
  { label: "Extracts every account trade line",    color: "text-gold"        },
  { label: "Scores confidence on each field",      color: "text-blue-400"    },
  { label: "Flags suspicious or unclear data",     color: "text-amber-400"   },
  { label: "Calculates risk score (0–100)",        color: "text-orange-400"  },
  { label: "Generates recovery recommendations",  color: "text-emerald-400" },
];

type StepDef = {
  tag:      string;
  icon:     typeof Shield | null;
  color:    string;
  title:    string;
  subtitle: string;
  body?:    string;
  note?:    string;
  visual?:  "path" | "upload_guide" | "ai_process";
};

const STEPS: StepDef[] = [
  {
    tag:      "Welcome",
    icon:     Shield,
    color:    "text-gold",
    title:    "Welcome to Guilded",
    subtitle: "Your structured financial recovery system",
    body:     "Guilded is not a credit repair company. It is an educational platform that teaches you to use your own legal rights — systematically and strategically.",
    note:     "Educational guidance only. Not legal or financial advice.",
  },
  {
    tag:      "How It Works",
    icon:     null,
    color:    "",
    title:    "Three systems. One recovery.",
    subtitle: "Every tool works together",
    visual:   "path",
  },
  {
    tag:      "Audit",
    icon:     Download,
    color:    "text-blue-400",
    title:    "Getting the right PDF",
    subtitle: "This matters for accurate results",
    note:     "Your PDF is processed securely. The raw file is permanently deleted after extraction. We never store credit report PDFs.",
    visual:   "upload_guide",
  },
  {
    tag:      "AI Analysis",
    icon:     Shield,
    color:    "text-gold",
    title:    "What the AI does with your report",
    subtitle: "Transparent, step-by-step analysis",
    note:     "You review and can correct any extracted field before disputes are generated.",
    visual:   "ai_process",
  },
  {
    tag:      "Start",
    icon:     FileText,
    color:    "text-gold",
    title:    "Your first mission",
    subtitle: "Run your credit audit",
    body:     "Upload your credit report and the Guild AI identifies every dispute opportunity, risk factor, and recovery action. Full analysis takes under 90 seconds.",
  },
];

export function OnboardingFlow({ onComplete }: { onComplete?: () => void }) {
  const [step,    setStep]    = useState<Step>(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(LS_KEY);
    if (!done) {
      setTimeout(() => setVisible(true), 900);
      track("onboarding_started");
    }
  }, []);

  // Lock scroll on the layout container while modal is open (prevents iOS scroll bleed)
  useEffect(() => {
    if (!visible) return;
    const el = document.querySelector<HTMLElement>("[data-scroll-lock]");
    if (el) el.style.overflow = "hidden";
    return () => {
      if (el) el.style.overflow = "";
    };
  }, [visible]);

  const dismiss = (completed: boolean) => {
    localStorage.setItem(LS_KEY, "true");
    setVisible(false);
    track(completed ? "onboarding_completed" : "onboarding_skipped", { step });
    onComplete?.();
  };

  const advance = () => {
    if (step < TOTAL_STEPS - 1) {
      track("onboarding_step_advanced", { step });
      setStep((s) => (s + 1) as Step);
    }
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon    = current.icon as React.ElementType | null;
  const isLast  = step === TOTAL_STEPS - 1;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm" style={{ touchAction: "none" }} onClick={() => dismiss(false)} />

      <div className="fixed inset-x-4 top-[8vh] z-50 mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-gold" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">Guilded</span>
            <span className="text-xs text-slate-600 ml-1">· {current.tag}</span>
          </div>
          <button onClick={() => dismiss(false)} className="rounded p-1 text-slate-600 hover:text-slate-300 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Step progress bar */}
        <div className="flex gap-1.5 px-5 pt-4">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all flex-1 ${
              i < step ? "bg-gold/40" : i === step ? "bg-gold" : "bg-slate-800"
            }`} />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-5 min-h-[260px]">
          {Icon && (
            <div className="h-10 w-10 rounded-2xl border border-slate-700 bg-slate-800/60 flex items-center justify-center mb-4">
              <Icon size={18} className={current.color} />
            </div>
          )}

          <h2 className="text-lg font-semibold text-slate-100">{current.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{current.subtitle}</p>

          {current.visual === "path" && (
            <div className="mt-4 space-y-2.5">
              {PATH_CARDS.map(({ icon: CardIcon, label, desc }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-2.5">
                  <div className="h-7 w-7 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
                    <CardIcon size={14} className="text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {current.visual === "upload_guide" && (
            <div className="mt-4 space-y-2">
              {UPLOAD_TIPS.map(({ ok, text }) => (
                <div key={text} className="flex items-start gap-2.5 text-xs">
                  <span className={`mt-0.5 shrink-0 ${ok ? "text-emerald-400" : "text-slate-600"}`}>
                    {ok ? <CheckCircle size={13} /> : <Lock size={13} />}
                  </span>
                  <span className={ok ? "text-slate-300" : "text-slate-500"}>{text}</span>
                </div>
              ))}
            </div>
          )}

          {current.visual === "ai_process" && (
            <div className="mt-4 space-y-2">
              {AI_PROCESS.map(({ label, color }, i) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-700 w-5 shrink-0">{String(i + 1)}.</span>
                  <span className={`text-xs ${color}`}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {current.body && (
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{current.body}</p>
          )}

          {current.note && (
            <p className="mt-4 text-xs text-slate-600 leading-relaxed border-t border-slate-800 pt-3">
              {current.note}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3.5">
          {step > 0 ? (
            <button onClick={() => setStep((s) => (s - 1) as Step)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Back
            </button>
          ) : (
            <button onClick={() => dismiss(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Skip for now
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
              onClick={advance}
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
