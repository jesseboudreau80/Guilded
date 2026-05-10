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
  const { data: session } = useGuildedSession();

  const [audits,  setAudits]  = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.accessToken) return;
    auditApi.list(session.user.accessToken)
      .then((r) => r.json())
      .then((data) => {
        if (data.detail) { setError(data.detail); return; }
        setAudits(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Failed to load audit history."))
      .finally(() => setLoading(false));
  }, [session?.user?.accessToken]);

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
          <p className="text-sm text-slate-400">Loading…</p>
        )}

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {!loading && !error && audits.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 px-8 py-14 text-center">
            <FileText size={32} className="mx-auto text-slate-600" />
            <p className="mt-4 text-sm font-medium text-slate-300">No audits yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Upload a credit report to generate your first analysis.
            </p>
            <Link
              href="/dashboard/audit/start"
              className="mt-5 inline-block rounded-xl bg-gold px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
            >
              Start Audit
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
