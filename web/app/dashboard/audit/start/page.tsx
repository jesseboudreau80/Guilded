"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";
import { auditApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { ProcessingTimeline, type TimelineStage } from "@/components/ui/ProcessingTimeline";

const UPLOAD_STAGES: TimelineStage[] = [
  {
    id:     "scan",
    label:  "Scanning document structure",
    detail: "Identifying pages and extractable text layers",
  },
  {
    id:     "extract",
    label:  "Extracting account trade lines",
    detail: "Locating creditors, balances, and account dates",
  },
  {
    id:     "normalize",
    label:  "Normalizing creditor data",
    detail: "Standardizing institution names and account types",
  },
  {
    id:     "classify",
    label:  "Classifying account status",
    detail: "Distinguishing revolving, installment, and collection accounts",
  },
  {
    id:     "inventory",
    label:  "Building account inventory",
    detail: "Preparing your accounts for verification",
  },
];

export default function AuditStartPage() {
  const { data: session } = useGuildedSession();
  const router             = useRouter();
  const inputRef           = useRef<HTMLInputElement>(null);

  const [file,        setFile]        = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [extractDone, setExtractDone] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !session?.user?.accessToken) return;
    setUploading(true);
    setExtractDone(false);
    setError(null);

    try {
      const res  = await auditApi.upload(file, session.user.accessToken);
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Upload failed. Please try again.");
        setUploading(false);
        return;
      }

      // Signal timeline to fast-forward, then navigate
      setExtractDone(true);
      setTimeout(() => {
        router.push(`/dashboard/audit/${data.audit_id}/verify`);
      }, 800);
    } catch {
      setError("Network error. Please try again.");
      setUploading(false);
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        Credit Audit
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Upload your credit report PDF to generate a structured analysis and action plan.
      </p>

      <div className="mt-8 max-w-xl">
        {uploading ? (
          /* ── Processing view ───────────────────────────────────── */
          <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-800/40 px-8 py-14">
            <ProcessingTimeline
              stages={UPLOAD_STAGES}
              active={uploading}
              completed={extractDone}
              intervalMs={2200}
              title="Reading Your Credit Report"
              subtitle="AI is extracting your account data"
            />
          </div>
        ) : (
          /* ── Upload view ───────────────────────────────────────── */
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 px-8 py-12 transition-colors hover:border-slate-600 hover:bg-slate-800/60"
            >
              {file ? (
                <>
                  <FileText size={36} className="text-gold" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-200">{file.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={36} className="text-slate-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-300">
                      Drop your credit report here
                    </p>
                    <p className="mt-1 text-xs text-slate-500">PDF only · Max 20 MB</p>
                  </div>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleChange}
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file}
              className="mt-5 w-full rounded-xl bg-gold py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Analyze Report
            </button>

            <p className="mt-4 text-center text-xs text-slate-600">
              Your report is processed securely and never stored permanently.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
