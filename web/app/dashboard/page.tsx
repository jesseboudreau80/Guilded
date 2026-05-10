"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Shield, ArrowRight, BookOpen, FileText,
  Zap, CheckCircle, ChevronRight, Circle,
} from "lucide-react";
import { authApi, academyApi, auditApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { GuildRankBadge } from "@/components/academy/GuildRankBadge";
import { AiUsageMeter } from "@/components/ai/AiUsageMeter";
import { AI_LIMITS, AI_PERIOD, type Tier } from "@/lib/tiers";
import {
  TacticalPanel, SectionHeader, StrategicAlert,
  ProtectionDot, MomentumBadge, RecoveryPhaseTag, EmptyRecoveryState,
} from "@/components/ui/tactical";
import {
  getRecoveryPhase, getProtectionStatus, getMomentumState,
  getRecoveryBriefing, getPrimaryCTA, getMissions, momentum7Days,
  type AuditInput, type AcademyModuleInput, type ModuleProgressInput, type XPEventInput,
} from "@/lib/recovery-engine";

// ── Types ─────────────────────────────────────────────────────────────────────

type User = { name?: string; tier: Tier; ai_usage_count: number };
type XPData = { total_xp: number; rank: string; next_xp: number | null; progress_pct: number; xp_to_next: number; recent_events: XPEventInput[] };

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const { data: session } = useGuildedSession();

  const [user,     setUser]     = useState<User | null>(null);
  const [xp,       setXP]       = useState<XPData | null>(null);
  const [progress, setProgress] = useState<Record<string, ModuleProgressInput>>({});
  const [modules,  setModules]  = useState<AcademyModuleInput[]>([]);
  const [audits,   setAudits]   = useState<AuditInput[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [doneMissions, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;
    Promise.allSettled([
      authApi.me(token).then((r) => r.json()),
      academyApi.xpSummary(token).then((r) => r.json()),
      academyApi.progress(token).then((r) => r.json()),
      academyApi.modules(token).then((r) => r.json()),
      auditApi.list(token).then((r) => r.json()),
    ]).then(([userR, xpR, progR, modsR, audsR]) => {
      if (userR.status === "fulfilled") setUser(userR.value);
      if (xpR.status  === "fulfilled") setXP(xpR.value);
      if (progR.status === "fulfilled" && Array.isArray(progR.value)) {
        const pm: Record<string, ModuleProgressInput> = {};
        progR.value.forEach((p: ModuleProgressInput) => { pm[p.module_id] = p; });
        setProgress(pm);
      }
      if (modsR.status === "fulfilled" && Array.isArray(modsR.value))
        setModules([...modsR.value].sort((a: AcademyModuleInput, b: AcademyModuleInput) => a.order_index - b.order_index));
      if (audsR.status === "fulfilled" && Array.isArray(audsR.value))
        setAudits(audsR.value);
      setLoading(false);
    });
  }, [session?.user?.accessToken]);

  // ── Derived state via recovery engine ─────────────────────────────────────
  const events         = xp?.recent_events ?? [];
  const completedMods   = modules.filter((m) => progress[m.id]?.status === "completed");
  const inProgressMod   = modules.find((m) => progress[m.id]?.status === "in_progress") ?? null;
  const nextUnlocked    = modules.find((m) => !progress[m.id] && !m.is_locked) ?? null;
  const latestAudit     = audits.find((a) => a.status === "completed") ?? null;
  const incompleteAudit = audits.find((a) => a.status !== "completed") ?? null;
  const weekActions    = useMemo(() => momentum7Days(events), [events]);

  const phase      = useMemo(() => getRecoveryPhase(audits, completedMods.length, !!inProgressMod, weekActions), [audits, completedMods.length, inProgressMod, weekActions]);
  const protection = useMemo(() => getProtectionStatus(audits), [audits]);
  const momentum   = useMemo(() => getMomentumState(events), [events]);
  const briefing   = useMemo(() => getRecoveryBriefing(phase, inProgressMod?.title ?? null, completedMods.length, latestAudit?.risk_score ?? null), [phase, inProgressMod, completedMods.length, latestAudit]);
  const primaryCTA = useMemo(() => getPrimaryCTA(phase, inProgressMod, latestAudit?.id ?? null, nextUnlocked), [phase, inProgressMod, latestAudit, nextUnlocked]);
  const missions   = useMemo(() => getMissions(phase, modules, progress, audits, events), [phase, modules, progress, audits, events]);

  const aiLimit  = user ? (AI_LIMITS[user.tier] ?? 0) : null;
  const aiPeriod = user ? AI_PERIOD[user.tier] : "monthly";
  const aiUsed   = user?.ai_usage_count ?? 0;

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-gold" />
          <p className="text-xs text-slate-500 uppercase tracking-widest">Loading…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-gold shrink-0" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Protected Recovery</p>
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">
            {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome back"}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {xp && <GuildRankBadge rank={xp.rank} xp={xp.total_xp} variant="badge" />}
          <RecoveryPhaseTag phase={phase} />
        </div>
      </div>

      {/* ── Tactical Briefing ─────────────────────────────────────────────── */}
      <TacticalPanel>
        <div className="flex items-start gap-3">
          <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Today&apos;s Briefing</p>
            <p className="text-sm leading-relaxed text-slate-300">{briefing}</p>
          </div>
        </div>
      </TacticalPanel>

      {/* ── Incomplete audit recovery ─────────────────────────────────────── */}
      {incompleteAudit && !latestAudit && (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 py-3.5 pl-5 pr-4">
          <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl bg-amber-400" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-400">Audit in progress</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {incompleteAudit.status === "uploaded"
                  ? "Accounts extracted — confirm your accounts to run analysis."
                  : "Accounts verified — generate your report to complete the audit."}
              </p>
            </div>
            <Link
              href={`/dashboard/audit/${incompleteAudit.id}/verify`}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              Continue Audit <ChevronRight size={11} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Protection + Momentum ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProtectionDot status={protection} />
        <MomentumBadge momentum={momentum} />
      </div>

      {/* ── Primary CTA ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-800/80 to-slate-900 p-6">
        <div className="absolute top-0 right-0 h-28 w-28 rounded-full bg-gold/5 blur-2xl pointer-events-none" />
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">Next Action</p>
        <p className="mt-1.5 text-base font-semibold text-slate-100">{primaryCTA.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-400 max-w-md">{primaryCTA.desc}</p>
        <Link href={primaryCTA.href} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90">
          {primaryCTA.label} <ArrowRight size={14} />
        </Link>
      </div>

      {/* ── Status grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          { label: "Audits Run",   value: audits.length,                          icon: FileText, color: audits.length > 0 ? "text-emerald-400" : "text-slate-600" },
          { label: "Modules Done", value: `${completedMods.length}/${modules.length}`, icon: BookOpen, color: completedMods.length > 0 ? "text-gold" : "text-slate-600" },
          { label: "Guild Rank",   value: xp?.rank ?? "Apprentice",               icon: Shield,   color: "text-gold" },
          { label: "Total XP",     value: `${xp?.total_xp ?? 0} XP`,              icon: Zap,      color: (xp?.total_xp ?? 0) > 0 ? "text-amber-400" : "text-slate-600" },
        ] as const).map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <Icon size={11} className={color} />
              <p className="text-xs text-slate-500">{label}</p>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-slate-200 tabular-nums">{String(value)}</p>
          </div>
        ))}
      </div>

      {/* ── Daily Missions ────────────────────────────────────────────────── */}
      {missions.length > 0 && (
        <div className="space-y-3">
          <SectionHeader label="Daily Missions" count={`${doneMissions.size}/${missions.length}`} />
          {missions.map((mission) => {
            const isDone = doneMissions.has(mission.id);
            return (
              <div key={mission.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-slate-800 bg-slate-900/40"}`}>
                <button onClick={() => setDone((prev) => { const n = new Set(prev); isDone ? n.delete(mission.id) : n.add(mission.id); return n; })} className="shrink-0">
                  {isDone ? <CheckCircle size={16} className="text-emerald-400" /> : <Circle size={16} className="text-slate-700" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${isDone ? "text-slate-500 line-through decoration-slate-700" : "text-slate-200"}`}>{mission.label}</p>
                  {!isDone && <p className="mt-0.5 text-xs text-slate-500">{mission.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-600 font-mono">+{mission.xp_reward} XP</span>
                  {!isDone && (
                    <Link href={mission.href} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                      Go <ChevronRight size={10} className="inline" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Latest audit strip ────────────────────────────────────────────── */}
      {latestAudit ? (
        <TacticalPanel>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Latest Audit</p>
              {latestAudit.risk_score != null && (
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-xl font-bold tabular-nums ${latestAudit.risk_score >= 75 ? "text-amber-400" : latestAudit.risk_score >= 50 ? "text-amber-400/70" : "text-emerald-400"}`}>
                    {latestAudit.risk_score}
                  </span>
                  <span className="text-xs text-slate-500">risk score</span>
                </div>
              )}
            </div>
            <Link href={`/dashboard/audit/${latestAudit.id}/results`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
              View Results <ChevronRight size={11} />
            </Link>
          </div>
        </TacticalPanel>
      ) : (
        <EmptyRecoveryState
          icon={FileText}
          title="No credit audit yet"
          message="Upload your credit report to identify every dispute opportunity and establish your recovery baseline."
          cta="Run Credit Audit"
          href="/dashboard/audit/start"
        />
      )}

      {/* ── XP bar ───────────────────────────────────────────────────────── */}
      {xp && xp.next_xp && (
        <div className="rounded-xl border border-slate-800/40 bg-slate-900/20 px-5 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 flex items-center gap-1.5"><Zap size={10} className="text-gold" /> {xp.total_xp} XP · {xp.rank}</span>
            <span className="text-xs text-slate-600">{xp.xp_to_next} XP to advance</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gold/60 transition-all" style={{ width: `${Math.round(xp.progress_pct * 100)}%` }} />
          </div>
        </div>
      )}

      {/* ── Quick links ───────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <TacticalPanel>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={12} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Academy</p>
          </div>
          {inProgressMod ? (
            <>
              <p className="text-xs text-slate-500 font-mono mb-1">IN PROGRESS</p>
              <p className="text-sm font-medium text-slate-200">{inProgressMod.title}</p>
              <Link href={`/dashboard/academy/${inProgressMod.slug}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline">Continue <ArrowRight size={10} /></Link>
            </>
          ) : completedMods.length > 0 ? (
            <>
              <p className="text-sm text-slate-400">{completedMods.length} modules complete</p>
              <Link href="/dashboard/academy" className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-gold transition-colors">View Academy <ArrowRight size={10} /></Link>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400">No training started</p>
              <Link href="/dashboard/academy" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline">Begin Training <ArrowRight size={10} /></Link>
            </>
          )}
        </TacticalPanel>

        <TacticalPanel>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={12} className="text-gold" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Guild Counsel</p>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">Tactical guidance on every page, aligned with your recovery phase.</p>
          {aiLimit !== null && <div className="mt-2"><AiUsageMeter used={aiUsed} limit={aiLimit} period={aiPeriod} /></div>}
          <Link href="/dashboard/ai" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline">Open Counsel <ArrowRight size={10} /></Link>
        </TacticalPanel>
      </div>

      {/* ── Upgrade nudge ─────────────────────────────────────────────────── */}
      {user?.tier === "APPRENTICE" && (
        <StrategicAlert
          title="Advance to Journeyman"
          message="Unlock extended AI guidance, long-term restoration modules, and advanced dispute tools."
          href="/dashboard/upgrade"
          cta="View Options"
          accent="gold"
        />
      )}
    </section>
  );
}
