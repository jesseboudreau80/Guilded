"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Shield, ChevronRight, AlertTriangle, AlertCircle,
  Info, BookOpen, ArrowRight, CheckCircle,
} from "lucide-react";
import { auditApi, academyApi, authApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import {
  getProtectionStatus, getRecoveryPhase, getPrimaryCTA,
  getMomentumState, getRecommendedModuleSlug, PHASE_DESCRIPTIONS,
  type AuditInput, type ModuleProgressInput,
} from "@/lib/recovery-engine";

type AcademyModuleInput = {
  id:           string;
  slug:         string;
  title:        string;
  order_index:  number;
  is_locked:    boolean;
  badge_label?: string | null;
};
import { RecoveryPhaseTag, ProtectionDot } from "@/components/ui/tactical";
import { FeedbackWidget } from "@/components/ui/FeedbackWidget";

type Recommendation = { id: string; severity: "high" | "medium" | "low"; title: string; locked: boolean };
type AuditResults   = {
  audit_id:        string;
  risk_score:      number | null;
  recommendations: Recommendation[];
  summary:         { negative_accounts: number; total_accounts: number; collections: number; late_payments: number; charge_offs: number } | null;
};

const SEV_ICON = {
  high:   { Icon: AlertTriangle, color: "text-red-400"   },
  medium: { Icon: AlertCircle,   color: "text-amber-400" },
  low:    { Icon: Info,          color: "text-slate-400" },
};

function RiskDial({ score }: { score: number }) {
  const { label, color } =
    score >= 75 ? { label: "Critical Risk",  color: "text-red-400"     } :
    score >= 50 ? { label: "Elevated Risk",  color: "text-amber-400"   } :
    score >= 30 ? { label: "Moderate Risk",  color: "text-amber-400/70"} :
                  { label: "Low Risk",       color: "text-emerald-400" };

  return (
    <div className="flex flex-col items-center">
      <p className={`text-6xl font-bold tabular-nums ${color}`}>{score}</p>
      <p className={`mt-1 text-sm font-medium ${color}`}>{label}</p>
      <div className="mt-3 h-2 w-36 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${score >= 75 ? "bg-red-400" : score >= 50 ? "bg-amber-400" : "bg-emerald-400"}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function AuditSnapshotPage() {
  const { id }            = useParams<{ id: string }>();
  const { data: session } = useGuildedSession();

  const [results,  setResults]  = useState<AuditResults | null>(null);
  const [modules,  setModules]  = useState<AcademyModuleInput[]>([]);
  const [progress, setProgress] = useState<Record<string, ModuleProgressInput>>({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;

    Promise.allSettled([
      auditApi.results(id, token).then((r) => r.json()),
      academyApi.modules(token).then((r) => r.json()),
      academyApi.progress(token).then((r) => r.json()),
    ]).then(([resR, modsR, progR]) => {
      if (resR.status === "fulfilled" && !resR.value.detail) setResults(resR.value);
      else if (resR.status === "fulfilled" && resR.value.detail) setError(resR.value.detail);
      if (modsR.status === "fulfilled" && Array.isArray(modsR.value))
        setModules([...modsR.value].sort((a: AcademyModuleInput, b: AcademyModuleInput) => a.order_index - b.order_index));
      if (progR.status === "fulfilled" && Array.isArray(progR.value)) {
        const pm: Record<string, ModuleProgressInput> = {};
        progR.value.forEach((p: ModuleProgressInput) => { pm[p.module_id] = p; });
        setProgress(pm);
      }
      setLoading(false);
    });
  }, [id, session?.user?.accessToken]);

  const completedMods = modules.filter((m) => progress[m.id]?.status === "completed");
  const inProgressMod = modules.find((m) => progress[m.id]?.status === "in_progress") ?? null;
  const nextUnlocked  = modules.find((m) => !progress[m.id] && !m.is_locked) ?? null;

  const protection = useMemo(() => getProtectionStatus(results ? [{ id, status: "completed", risk_score: results.risk_score, created_at: new Date().toISOString() }] : []), [results, id]);
  const phase      = useMemo(() => getRecoveryPhase(results ? [{ id, status: "completed", risk_score: results.risk_score, created_at: "" }] : [], completedMods.length, !!inProgressMod, 0), [results, id, completedMods, inProgressMod]);
  const momentum   = useMemo(() => getMomentumState([]), []);
  const primaryCTA = useMemo(() => getPrimaryCTA(phase, inProgressMod, id, nextUnlocked), [phase, inProgressMod, id, nextUnlocked]);
  const recModSlug = useMemo(() => getRecommendedModuleSlug(phase, modules, progress), [phase, modules, progress]);
  const recMod     = modules.find((m) => m.slug === recModSlug) ?? null;

  const topRecs = useMemo(() =>
    (results?.recommendations ?? [])
      .filter((r) => !r.locked)
      .slice(0, 3),
    [results]
  );

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-gold" />
          <h1 className="text-xl font-semibold">Recovery Profile</h1>
        </div>
        <p className="mt-6 text-sm text-slate-400">Building your recovery profile…</p>
      </section>
    );
  }

  if (error || !results) {
    return (
      <section>
        <h1 className="text-xl font-semibold">Recovery Profile</h1>
        <p className="mt-6 text-sm text-red-400">{error ?? "Audit results not available."}</p>
        <Link href={`/dashboard/audit/${id}/results`} className="mt-3 inline-flex items-center gap-1 text-sm text-gold hover:underline">
          View Full Analysis <ChevronRight size={12} />
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-2xl space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={15} className="text-gold" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Recovery Profile Generated
          </p>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Your Recovery Snapshot</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Your credit report has been analyzed. Here is your strategic starting position.
        </p>
      </div>

      {/* ── Risk score + protection + phase ─────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-800/60 to-slate-900 p-6">
        <div className="flex flex-col items-center text-center mb-6">
          {results.risk_score != null && <RiskDial score={results.risk_score} />}
          {results.risk_score != null && (
            <p className="mt-3 text-xs text-slate-500 max-w-sm">
              {results.risk_score >= 75
                ? "Your profile shows significant negative factors. Systematic action is available — this score improves with consistent recovery activity."
                : results.risk_score >= 50
                ? "Elevated risk detected. There are clear opportunities for dispute and improvement in your profile."
                : "Your credit position has manageable issues. Targeted action can meaningfully improve your score."}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ProtectionDot status={protection} />
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 border-slate-800 bg-slate-900/40`}>
            <Shield size={13} className="text-gold shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-300">
                <RecoveryPhaseTag phase={phase} />
              </p>
              <p className="mt-1 text-xs text-slate-500">{PHASE_DESCRIPTIONS[phase]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top issues ───────────────────────────────────────────────────── */}
      {topRecs.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Top Issues Detected
          </p>
          <div className="space-y-2">
            {topRecs.map((rec) => {
              const { Icon, color } = SEV_ICON[rec.severity];
              return (
                <div key={rec.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <Icon size={14} className={`${color} mt-0.5 shrink-0`} />
                  <p className="text-sm text-slate-300 leading-snug">{rec.title}</p>
                </div>
              );
            })}
          </div>
          {(results.recommendations.filter((r) => r.locked).length > 0) && (
            <p className="mt-2 text-xs text-slate-600">
              +{results.recommendations.filter((r) => r.locked).length} additional issues identified — unlock with a higher rank.
            </p>
          )}
        </div>
      )}

      {/* ── First action ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gold/20 bg-gold/5 px-5 py-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={13} className="text-gold" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Recommended First Action</p>
        </div>
        <p className="text-base font-semibold text-slate-100">{primaryCTA.label}</p>
        <p className="mt-1 text-sm text-slate-400 leading-relaxed">{primaryCTA.desc}</p>
        <Link
          href={primaryCTA.href}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          {primaryCTA.label} <ArrowRight size={14} />
        </Link>
      </div>

      {/* ── Recommended module ─────────────────────────────────────────── */}
      {recMod && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={13} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Start With This Module</p>
          </div>
          <p className="text-sm font-semibold text-slate-200">
            Module {String(recMod.order_index).padStart(2, "0")} — {recMod.title}
          </p>
          {recMod.badge_label && (
            <span className="mt-1.5 inline-block text-xs text-slate-500">{recMod.badge_label}</span>
          )}
          <div className="mt-3">
            <Link href={`/dashboard/academy/${recMod.slug}`} className="text-xs font-medium text-gold hover:underline flex items-center gap-1">
              Begin Training <ChevronRight size={11} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Summary stats ─────────────────────────────────────────────── */}
      {results.summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Accounts",    val: results.summary.total_accounts    },
            { label: "Negative Accounts", val: results.summary.negative_accounts },
            { label: "Collections",       val: results.summary.collections       },
            { label: "Late Payments",     val: results.summary.late_payments     },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-center">
              <p className="text-xl font-bold tabular-nums text-slate-100">{val}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-800 pt-5">
        <FeedbackWidget label="Was this analysis helpful?" context="audit-snapshot" />
        <Link
          href={`/dashboard/audit/${id}/results`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          View Full Analysis <ChevronRight size={13} />
        </Link>
      </div>
    </section>
  );
}
