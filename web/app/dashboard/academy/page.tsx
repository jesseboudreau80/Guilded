"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Lock, CheckCircle, Clock,
  Sparkles, ArrowRight, Shield, ChevronRight, Zap,
} from "lucide-react";
import { academyApi, auditApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";

// ── Types ─────────────────────────────────────────────────────────────────────

type AcademyModule = {
  id:                string;
  slug:              string;
  title:             string;
  description:       string;
  tier_required:     string;
  order_index:       number;
  estimated_minutes: number;
  badge_label:       string | null;
  lesson_count:      number;
  is_locked:         boolean;
};

type ModuleProgress = {
  module_id:    string;
  status:       "not_started" | "in_progress" | "completed";
};

type Recommendation = {
  module:     AcademyModule;
  reason:     string;
  priority:   number;
  is_locked:  boolean;
  progress:   ModuleProgress | null;
};

type Audit = {
  id:         string;
  status:     string;
  risk_score: number | null;
};

// ── Design tokens ─────────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  Foundation: "text-slate-300 border-slate-600",
  Tactical:   "text-blue-400 border-blue-500/30",
  Defensive:  "text-indigo-400 border-indigo-500/30",
  Offensive:  "text-red-400 border-red-500/30",
  Growth:     "text-emerald-400 border-emerald-500/30",
  Advanced:   "text-amber-400 border-amber-500/30",
  Elite:      "text-gold border-gold/30",
};

const TIER_DIVIDER: Record<string, { label: string; color: string }> = {
  JOURNEYMAN: { label: "Journeyman Access Required",   color: "border-blue-500/30 text-blue-400" },
  MASTER:     { label: "Master Access Required",       color: "border-gold/30 text-gold" },
};

// ── Ordered recovery path logic ───────────────────────────────────────────────

function buildOrderedPath(
  modules:    AcademyModule[],
  recs:       Recommendation[],
  progMap:    Record<string, ModuleProgress>,
): AcademyModule[] {
  const incomplete = modules.filter((m) => progMap[m.id]?.status !== "completed" && !m.is_locked);

  // Always include Module 1 (Foundation) if not completed
  const mod1 = incomplete.find((m) => m.order_index === 1);

  // Audit-recommended modules sorted by educational order (not urgency)
  const recSlugs = new Set(recs.map((r) => r.module.slug));
  const recMods  = incomplete
    .filter((m) => recSlugs.has(m.slug) && m.order_index > 1)
    .sort((a, b) => a.order_index - b.order_index);

  const path: AcademyModule[] = [];
  if (mod1) path.push(mod1);
  recMods.forEach((m) => { if (!path.find((p) => p.id === m.id)) path.push(m); });

  return path.slice(0, 4);
}

// ── Campaign path component ───────────────────────────────────────────────────

function CampaignPath({
  modules,
  progMap,
}: {
  modules: AcademyModule[];
  progMap: Record<string, ModuleProgress>;
}) {
  let lastTier: string | null = null;

  return (
    <div className="relative">
      {modules.map((mod, i) => {
        const status  = progMap[mod.id]?.status ?? "not_started";
        const done    = status === "completed";
        const active  = status === "in_progress";
        const locked  = mod.is_locked;
        const isLast  = i === modules.length - 1;

        // Tier divider before module if tier changes to a gated tier
        const tierChanged = mod.tier_required !== "APPRENTICE" && mod.tier_required !== lastTier;
        if (tierChanged) lastTier = mod.tier_required;
        const divider = tierChanged ? TIER_DIVIDER[mod.tier_required] : null;

        const badgeCls = mod.badge_label ? (BADGE_COLORS[mod.badge_label] ?? "text-slate-400 border-slate-600") : "";

        return (
          <div key={mod.id}>
            {/* Tier divider */}
            {divider && (
              <div className={`flex items-center gap-3 my-6 ml-10`}>
                <Lock size={10} className={divider.color.split(" ")[1]} />
                <span className={`text-xs font-medium ${divider.color.split(" ")[1]}`}>
                  {divider.label}
                </span>
                <div className={`flex-1 h-px border-t ${divider.color.split(" ")[0]} opacity-30`} />
              </div>
            )}

            <div className="flex gap-4">
              {/* Left column: connector */}
              <div className="flex flex-col items-center" style={{ width: 40 }}>
                {/* Node */}
                <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  done    ? "border-emerald-500 bg-emerald-500/10"  :
                  active  ? "border-gold bg-gold/10"                :
                  locked  ? "border-slate-700/50 bg-transparent"    :
                            "border-slate-700 bg-transparent"
                }`}>
                  {active && <span className="absolute inset-0 animate-ping rounded-full bg-gold/10" />}
                  {done   ? <CheckCircle size={16} className="text-emerald-400" /> :
                   active ? <span className="h-3 w-3 rounded-full bg-gold animate-pulse" /> :
                   locked ? <Lock size={12} className="text-slate-700" /> :
                            <span className="font-mono text-xs font-bold text-slate-600">
                              {String(mod.order_index).padStart(2, "0")}
                            </span>
                  }
                </div>

                {/* Connecting line */}
                {!isLast && (
                  <div className={`mt-1 w-px flex-1 transition-colors ${done ? "bg-emerald-500/30" : "bg-slate-800"}`}
                    style={{ minHeight: 32 }}
                  />
                )}
              </div>

              {/* Right column: content */}
              <div className={`flex-1 pb-8 min-w-0 ${isLast ? "pb-0" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {mod.badge_label && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeCls}`}>
                          {mod.badge_label}
                        </span>
                      )}
                      {locked && (
                        <span className="text-xs text-slate-600">
                          {mod.tier_required === "MASTER" ? "Master" : "Journeyman"}+
                        </span>
                      )}
                    </div>
                    <h3 className={`mt-1.5 text-sm font-semibold leading-snug ${
                      done ? "text-slate-500" : locked ? "text-slate-600" : "text-slate-100"
                    }`}>
                      {mod.title}
                    </h3>
                    {!locked && !done && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2">
                        {mod.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-700">
                      <span className="flex items-center gap-1">
                        <BookOpen size={10} /> {mod.lesson_count} lessons
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {mod.estimated_minutes}m
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0">
                    {locked ? (
                      <Link
                        href="/dashboard/upgrade"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        Upgrade <Lock size={9} />
                      </Link>
                    ) : done ? (
                      <Link
                        href={`/dashboard/academy/${mod.slug}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Review <ChevronRight size={11} />
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/academy/${mod.slug}`}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? "bg-gold text-slate-950 hover:opacity-90"
                            : "border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"
                        }`}
                      >
                        {active ? "Continue →" : "Begin"}
                      </Link>
                    )}
                  </div>
                </div>

                {/* In-progress bar */}
                {active && (
                  <div className="mt-3 h-0.5 max-w-xs overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-2/5 rounded-full bg-gold/60" />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AcademyPage() {
  const { data: session, status: sessionStatus } = useGuildedSession();

  const [modules,     setModules]     = useState<AcademyModule[]>([]);
  const [progMap,     setProgMap]     = useState<Record<string, ModuleProgress>>({});
  const [recs,        setRecs]        = useState<Recommendation[]>([]);
  const [latestAudit, setLatestAudit] = useState<Audit | null>(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (sessionStatus === "loading") return; // wait for session to resolve
    const token = session?.user?.accessToken;
    if (!token) { setLoading(false); return; }

    Promise.all([
      academyApi.modules(token).then((r) => r.json()),
      academyApi.progress(token).then((r) => r.json()),
      auditApi.list(token).then((r) => r.json()),
    ]).then(async ([mods, prog, audits]) => {
      const sorted: AcademyModule[] = Array.isArray(mods)
        ? [...mods].sort((a: AcademyModule, b: AcademyModule) => a.order_index - b.order_index)
        : [];
      setModules(sorted);

      const pm: Record<string, ModuleProgress> = {};
      if (Array.isArray(prog)) prog.forEach((p: ModuleProgress) => { pm[p.module_id] = p; });
      setProgMap(pm);

      const completed = Array.isArray(audits)
        ? audits.filter((a: Audit) => a.status === "completed")
        : [];

      if (completed.length > 0) {
        const latest = completed[0];
        setLatestAudit(latest);
        try {
          const recRes  = await academyApi.recommended(latest.id, token);
          const recData = await recRes.json();
          setRecs(Array.isArray(recData) ? recData : []);
        } catch { /* non-critical */ }
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, [session?.user?.accessToken, sessionStatus]);

  const completedCount  = Object.values(progMap).filter((p) => p.status === "completed").length;
  const inProgressMod   = modules.find((m) => progMap[m.id]?.status === "in_progress");

  // Ordered recovery path — educationally sorted, Foundation first
  const orderedPath = buildOrderedPath(modules, recs, progMap);

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-gold" />
          <h1 className="text-2xl font-semibold">Plutus Academy</h1>
        </div>
        <p className="mt-6 text-sm text-slate-400">Loading your training campaign…</p>
      </section>
    );
  }

  return (
    <section>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Shield size={20} className="text-gold shrink-0" />
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Plutus Academy</h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-400 max-w-lg">
            {completedCount > 0
              ? `${completedCount} of ${modules.length} modules complete. Every lesson advances your strategic position.`
              : "Seven modules. A complete credit recovery system. Your campaign begins here."}
          </p>
        </div>

        {inProgressMod && (
          <Link
            href={`/dashboard/academy/${inProgressMod.slug}`}
            className="shrink-0 inline-flex items-center gap-2 self-start rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity"
          >
            Continue Training <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* ── Progress strip ──────────────────────────────────────────────── */}
      {completedCount > 0 && (
        <div className="mt-5 flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-3">
          <Shield size={13} className="text-gold shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">{completedCount} / {modules.length} modules</span>
              <span className="text-xs text-slate-600">{Math.round((completedCount / modules.length) * 100)}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500/50 transition-all"
                style={{ width: `${Math.round((completedCount / modules.length) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Recommended Recovery Path (audit-aware, ordered) ────────────── */}
      {orderedPath.length > 0 && recs.length > 0 && (
        <div className="mt-8 rounded-2xl border border-gold/20 bg-gold/5 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gold/10">
            <Sparkles size={13} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              Recommended Recovery Path
            </p>
            {latestAudit?.risk_score != null && (
              <span className="text-xs text-slate-600 ml-1">
                · Audit risk score: {latestAudit.risk_score}
              </span>
            )}
          </div>
          <div className="px-5 pb-5 pt-4">
            <p className="text-xs text-slate-500 mb-5">
              Modules ordered by educational progression — foundations before tactics.
            </p>
            <CampaignPath modules={orderedPath} progMap={progMap} />
          </div>
        </div>
      )}

      {/* ── No audit CTA ────────────────────────────────────────────────── */}
      {!latestAudit && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 px-6 py-8 text-center">
          <Sparkles size={22} className="mx-auto text-slate-600" />
          <p className="mt-3 text-sm font-semibold text-slate-200">
            Personalize your training path
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Run a credit audit and the Plutus AI will identify exactly which modules matter most for your situation — ordered for maximum effectiveness.
          </p>
          <Link
            href="/dashboard/audit/start"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity"
          >
            Run Credit Audit <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ── Full campaign path ───────────────────────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Full Campaign
          </h2>
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs text-slate-600">{modules.length} modules</span>
        </div>

        <CampaignPath modules={modules} progMap={progMap} />
      </div>
    </section>
  );
}
