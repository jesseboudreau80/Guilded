"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, AlertCircle, RefreshCw, Wifi,
  Shield, ChevronDown, ChevronUp, CheckCircle, ArrowRight,
  Lock,
} from "lucide-react";
import { auditApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { ProcessingTimeline, type TimelineStage } from "@/components/ui/ProcessingTimeline";
import { track, auditEvents, auditFunnelEvents } from "@/lib/analytics";

// ── Processing stages ──────────────────────────────────────────────────────────

const UPLOAD_STAGES: TimelineStage[] = [
  { id: "scan",      label: "Scanning report structure",       detail: "Identifying pages, columns, and account sections"           },
  { id: "extract",   label: "Detecting account trade lines",   detail: "Locating creditors, balances, and account dates"            },
  { id: "normalize", label: "Normalizing creditor data",       detail: "Standardizing institution names and account types"          },
  { id: "classify",  label: "Classifying account status",      detail: "Distinguishing revolving, installment, and collection types" },
  { id: "inventory", label: "Building account inventory",      detail: "Preparing accounts for your review"                        },
];

// ── Report source guide ────────────────────────────────────────────────────────

const REPORT_SOURCES = [
  {
    name: "AnnualCreditReport.com",
    note: "Federally authorized — free, all 3 bureaus",
    ok: true,
    recommended: true,
  },
  {
    name: "Your bureau portal directly",
    note: "Equifax.com, Experian.com, or TransUnion.com",
    ok: true,
    recommended: false,
  },
  {
    name: "Credit monitoring service",
    note: "CreditKarma, MyFICO — check for PDF download option",
    ok: true,
    recommended: false,
  },
  {
    name: "Scanned or photographed report",
    note: "Image-based PDFs cannot be text-extracted",
    ok: false,
    recommended: false,
  },
  {
    name: "Screenshot saved as PDF",
    note: "No embedded text — extraction will fail",
    ok: false,
    recommended: false,
  },
];

// ── Error classification ───────────────────────────────────────────────────────

type ErrorType = "image_pdf" | "ai_timeout" | "ai_busy" | "network" | "file_size" | "general";

function classifyError(detail: string | undefined): ErrorType {
  if (!detail) return "general";
  const d = detail.toLowerCase();
  if (d.includes("image") || d.includes("scanned") || d.includes("no text")) return "image_pdf";
  if (d.includes("timed out") || d.includes("timeout"))                       return "ai_timeout";
  if (d.includes("busy") || d.includes("service") || d.includes("503"))      return "ai_busy";
  if (d.includes("network") || d.includes("connection"))                      return "network";
  if (d.includes("20 mb") || d.includes("size"))                              return "file_size";
  return "general";
}

const ERROR_GUIDANCE: Record<ErrorType, {
  icon: React.ElementType; title: string; body: string; canRetry: boolean; canChangeFile: boolean;
}> = {
  image_pdf: {
    icon:          AlertCircle,
    title:         "Image-based PDF detected",
    body:          "This PDF appears to be a scanned image rather than a digital report. Please download your credit report directly from AnnualCreditReport.com or your bureau's website — those generate text-based PDFs that work with our AI extraction.",
    canRetry:      false,
    canChangeFile: true,
  },
  ai_timeout: {
    icon:          RefreshCw,
    title:         "Analysis took longer than expected",
    body:          "The AI analysis timed out. Your file was received successfully — this is usually a temporary delay. Please try again.",
    canRetry:      true,
    canChangeFile: false,
  },
  ai_busy: {
    icon:          RefreshCw,
    title:         "Service momentarily busy",
    body:          "The analysis service is temporarily under high demand. Wait a moment and try again.",
    canRetry:      true,
    canChangeFile: false,
  },
  network: {
    icon:          Wifi,
    title:         "Connection interrupted",
    body:          "The upload was interrupted by a network issue. Check your connection and try again.",
    canRetry:      true,
    canChangeFile: false,
  },
  file_size: {
    icon:          AlertCircle,
    title:         "File too large",
    body:          "The PDF exceeds the 20 MB limit. Try downloading a fresh copy from your bureau's website — reports are typically under 5 MB.",
    canRetry:      false,
    canChangeFile: true,
  },
  general: {
    icon:          AlertCircle,
    title:         "Upload issue",
    body:          "Something went wrong processing your report. Please try again or upload a different file.",
    canRetry:      true,
    canChangeFile: true,
  },
};

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Upload" },
    { n: 2, label: "Review" },
    { n: 3, label: "Results" },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map(({ n, label }, i) => {
        const done    = n < current;
        const active  = n === current;
        const pending = n > current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                done    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"  :
                active  ? "bg-gold/20 border border-gold/40 text-gold"                       :
                          "bg-slate-800 border border-slate-700 text-slate-600"
              }`}>
                {done ? <CheckCircle size={12} /> : n}
              </div>
              <span className={`text-xs font-medium ${active ? "text-slate-200" : done ? "text-slate-500" : "text-slate-700"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-3 h-px w-8 ${done ? "bg-emerald-500/30" : "bg-slate-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditStartPage() {
  const { data: session } = useGuildedSession();
  const router             = useRouter();
  const inputRef           = useRef<HTMLInputElement>(null);

  const [file,        setFile]        = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [extractDone, setExtractDone] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [errorType,   setErrorType]   = useState<ErrorType | null>(null);
  const [showGuide,   setShowGuide]   = useState(false);

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted. Download your report as a PDF from your bureau or AnnualCreditReport.com.");
      setErrorType("general");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("File is too large (max 20 MB). Try downloading a fresh copy from your bureau.");
      setErrorType("file_size");
      return;
    }
    setFile(f);
    setError(null);
    setErrorType(null);
  };

  const handleChange  = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); };
  const handleDrop    = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };
  const resetFile     = () => { setFile(null); setError(null); setErrorType(null); if (inputRef.current) inputRef.current.value = ""; };

  const handleSubmit = async () => {
    if (!file || !session?.user?.accessToken) return;
    setUploading(true);
    setExtractDone(false);
    setError(null);
    setErrorType(null);
    auditEvents.uploadStarted();

    try {
      const res  = await auditApi.upload(file, session.user.accessToken);
      const data = await res.json();

      if (!res.ok) {
        const etype = classifyError(data.detail);
        setError(data.detail ?? "Upload failed. Please try again.");
        setErrorType(etype);
        track("audit_upload_failed", { reason: data.detail, error_type: etype });
        setUploading(false);
        return;
      }

      setExtractDone(true);
      setTimeout(() => router.push(`/dashboard/audit/${data.audit_id}/verify`), 800);
    } catch {
      setError("Network error. Please try again.");
      setErrorType("network");
      setUploading(false);
    }
  };

  const guidance = errorType ? ERROR_GUIDANCE[errorType] : null;

  return (
    <section className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={13} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Credit Audit</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Run Your Credit Audit</h1>
          <p className="mt-1.5 text-sm text-slate-400 max-w-lg">
            Upload your credit report PDF. The AI extracts every account, identifies dispute opportunities,
            and builds your personalized recovery roadmap.
          </p>
        </div>
        <div className="shrink-0 self-start sm:pt-1">
          <StepIndicator current={1} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">

        {/* ── Left: upload zone ───────────────────────────────────────── */}
        <div className="space-y-4">

          {uploading ? (
            <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-800/40 px-8 py-14">
              <ProcessingTimeline
                stages={UPLOAD_STAGES}
                active={uploading}
                completed={extractDone}
                intervalMs={2200}
                title="Reading Your Credit Report"
                subtitle="AI-assisted extraction · Sensitive data masked before analysis"
              />
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !file && inputRef.current?.click()}
                className={`relative flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-12 transition-all ${
                  file
                    ? "border-gold/40 bg-gold/5 cursor-default"
                    : errorType
                    ? "border-red-900/40 bg-red-900/10 cursor-pointer"
                    : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60 cursor-pointer"
                }`}
              >
                {file ? (
                  <>
                    <div className="h-14 w-14 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center">
                      <FileText size={28} className="text-gold" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-100">{file.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {(file.size / 1024).toFixed(0)} KB · PDF ready for analysis
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetFile(); }}
                      className="text-xs text-slate-600 hover:text-slate-400 transition-colors underline"
                    >
                      Remove and upload a different file
                    </button>
                  </>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-2xl border border-slate-700 bg-slate-800/60 flex items-center justify-center">
                      <Upload size={24} className="text-slate-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-200">Drop your credit report here</p>
                      <p className="mt-1 text-xs text-slate-500">or click to browse · PDF only · Max 20 MB</p>
                    </div>
                  </>
                )}
                <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleChange} />
              </div>

              {/* Structured error guidance */}
              {guidance && (
                <div className="rounded-xl border border-red-900/30 bg-red-900/10 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <guidance.icon size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-300">{guidance.title}</p>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">{guidance.body}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {guidance.canRetry && file && (
                          <button
                            onClick={handleSubmit}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                          >
                            <RefreshCw size={11} /> Try Again
                          </button>
                        )}
                        {guidance.canChangeFile && (
                          <button
                            onClick={resetFile}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                          >
                            <Upload size={11} /> Upload Different File
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && !guidance && (
                <p className="text-sm text-red-400 px-1">{error}</p>
              )}

              {/* Analyze button */}
              <button
                onClick={handleSubmit}
                disabled={!file || !!errorType}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {file ? (
                  <>Start AI Analysis <ArrowRight size={14} /></>
                ) : (
                  "Select your credit report PDF to begin"
                )}
              </button>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Lock size={10} className="text-slate-700" /> Encrypted in transit
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield size={10} className="text-slate-700" /> PDF deleted after extraction
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={10} className="text-slate-700" /> PII masked before AI analysis
                </span>
              </div>
              <p className="text-center text-xs text-slate-700">
                AI-assisted educational analysis only · Not legal or financial advice
              </p>
            </>
          )}
        </div>

        {/* ── Right: guide + context ──────────────────────────────────── */}
        <div className="space-y-4">

          {/* What happens next */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">What happens next</p>
            <div className="space-y-3.5">
              {[
                { n: "01", label: "AI extracts your accounts",    desc: "Every trade line, balance, and status field" },
                { n: "02", label: "You confirm the accounts",     desc: "Review and correct any OCR errors"           },
                { n: "03", label: "AI analyzes dispute targets",  desc: "Scores each item, identifies FCRA signals"   },
                { n: "04", label: "You receive your roadmap",     desc: "Risk score, recommendations, dispute tools"  },
              ].map(({ n, label, desc }) => (
                <div key={n} className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-slate-700 shrink-0 w-5 mt-0.5">{n}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">{label}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report source guide — collapsible */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <button
              onClick={() => { if (!showGuide) auditFunnelEvents.sourceGuideOpened(); setShowGuide(!showGuide); }}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <p className="text-xs font-semibold text-slate-300">Where to get your credit report</p>
              {showGuide
                ? <ChevronUp size={14} className="text-slate-500 shrink-0" />
                : <ChevronDown size={14} className="text-slate-500 shrink-0" />
              }
            </button>
            {showGuide && (
              <div className="px-5 pb-4 border-t border-slate-800/60 pt-3 space-y-2.5">
                {REPORT_SOURCES.map(({ name, note, ok, recommended }) => (
                  <div key={name} className="flex items-start gap-2.5">
                    {ok
                      ? <CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                      : <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
                    }
                    <div>
                      <span className={`text-xs font-medium ${ok ? "text-slate-300" : "text-slate-500"}`}>
                        {name}
                        {recommended && (
                          <span className="ml-2 text-[10px] text-gold font-semibold">Recommended</span>
                        )}
                      </span>
                      <p className="text-xs text-slate-600">{note}</p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-700 pt-1 leading-relaxed">
                  Digital PDFs have embedded text that the AI can extract. Scanned images and screenshots do not.
                </p>
              </div>
            )}
          </div>

          {/* Privacy note */}
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3">
            <div className="flex items-start gap-2">
              <Shield size={11} className="text-gold shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Your credit report is processed securely. The PDF is deleted immediately after extraction.
                Social Security numbers, account numbers, and other PII are masked before reaching the AI.
                No data is sold or shared.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
