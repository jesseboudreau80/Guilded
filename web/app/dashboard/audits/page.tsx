"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { auditApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";

type AuditItem = {
  id:         string;
  created_at: string;
  status:     "uploaded" | "verified" | "completed";
  risk_score: number | null;
};

const STATUS_BADGE: Record<AuditItem["status"], string> = {
  uploaded:  "bg-slate-700 text-slate-400",
  verified:  "bg-blue-900/40 text-blue-400",
  completed: "bg-emerald-900/40 text-emerald-400",
};

const STATUS_LABEL: Record<AuditItem["status"], string> = {
  uploaded:  "Uploaded",
  verified:  "Verified",
  completed: "Complete",
};

function auditHref(a: AuditItem): string {
  return a.status === "completed"
    ? `/dashboard/audit/${a.id}/results`
    : `/dashboard/audit/${a.id}/verify`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function AuditsPage() {
  const { data: session, status: sessionStatus } = useGuildedSession();

  const [audits,  setAudits]  = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const token = session?.user?.accessToken;
    if (!token) { setLoading(false); return; }
    auditApi.list(token)
      .then((r) => r.json())
      .then((data) => {
        if (data.detail) { setError(data.detail); return; }
        setAudits(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load audit history."))
      .finally(() => setLoading(false));
  }, [session?.user?.accessToken, sessionStatus]);

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">My Audits</h1>
          <p className="mt-1 text-sm text-slate-400">Your credit report audit history.</p>
        </div>
        <Link
          href="/dashboard/audit/start"
          className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          New Audit
        </Link>
      </div>

      <div className="mt-8">
        {loading && (
          <div className="space-y-2 animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className="h-12 rounded-xl bg-slate-800/60" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {!loading && !error && audits.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 px-8 py-14 text-center">
            <div className="h-12 w-12 rounded-2xl border border-slate-700 bg-slate-800/60 flex items-center justify-center mx-auto mb-5">
              <FileText size={22} className="text-slate-500" />
            </div>
            <p className="text-base font-semibold text-slate-200">No audits yet</p>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              Upload your credit report PDF to generate your recovery intelligence brief —
              risk score, dispute targets, and strategic recommendations.
            </p>
            <div className="mt-6 space-y-2 text-xs text-slate-600 max-w-xs mx-auto text-left">
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-slate-600 shrink-0" />
                Download your free report from AnnualCreditReport.com
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-slate-600 shrink-0" />
                Digital PDF only — scanned images can&apos;t be parsed
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-slate-600 shrink-0" />
                All three bureaus work — Equifax, Experian, or TransUnion
              </p>
            </div>
            <Link
              href="/dashboard/audit/start"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
            >
              Run First Audit
            </Link>
          </div>
        )}

        {audits.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/60">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-slate-500 hidden sm:table-cell">Risk Score</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {audits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {formatDate(a.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status]}`}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                      {a.risk_score != null ? (
                        <span className={
                          a.risk_score <= 30 ? "text-emerald-400" :
                          a.risk_score <= 60 ? "text-amber-400"   :
                          a.risk_score <= 80 ? "text-orange-400"  : "text-red-400"
                        }>
                          {a.risk_score}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={auditHref(a)}
                        className="flex items-center justify-end text-slate-500 hover:text-slate-200 transition-colors"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
