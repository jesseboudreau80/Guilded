"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Shield, ArrowRight, BookOpen, FileText,
  Zap, CheckCircle, ChevronRight, Circle, Crown,
} from "lucide-react";
import { authApi, academyApi, auditApi, disputeApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { AiUsageMeter } from "@/components/ai/AiUsageMeter";
import { ContinueBar } from "@/components/dashboard/ContinueBar";
import { FounderRateBanner } from "@/components/dashboard/FounderRateBanner";
import { RecoveryJourney, buildMilestones } from "@/components/dashboard/RecoveryJourney";
import { AI_LIMITS, AI_PERIOD, type Tier } from "@/lib/tiers";
import {
  TacticalPanel, SectionHeader, StrategicAlert,
  ProtectionDot, MomentumBadge, RecoveryPhaseTag, EmptyRecoveryState,
} from "@/components/ui/tactical";
import {
  getRecoveryPhase, getProtectionStatus, getMomentumState,
  getRecoveryBriefing, getPrimaryCTA, getMissions, momentum7Days,
  PHASE_DESCRIPTIONS,
  type AuditInput, type AcademyModuleInput, type ModuleProgressInput, type XPEventInput,
} from "@/lib/recovery-engine";
import { GUILD_RANK_COLORS, GUILD_RANK_BG } from "@/lib/academy-intel";

// ── Types ─────────────────────────────────────────────────────────────────────

type User = { name?: string; tier: Tier; ai_usage_count: number; subscription_status: string };
type XPData = { total_xp: number; rank: string; next_xp: number | null; progress_pct: number; xp_to_next: number; recent_events: XPEventInput[] };

const TIER_PLAN_LABELS: Record<string, string> = {
  APPRENTICE: "Free Plan",
  JOURNEYMAN: "Journeyman Plan",
  MASTER:     "Master Plan",
  HERO:       "Hero Plan",
};

const TIER_UPGRADE_CTA: Record<string, { label: string; href: string } | null> = {
  APPRENTICE: { label: "Advance to Journeyman", href: "/dashboard/upgrade" },
  JOURNEYMAN: { label: "Advance to Master",     href: "/dashboard/upgrade" },
  MASTER:     { label: "Advance to Hero",       href: "/dashboard/upgrade" },
  HERO:       null,
};

// ── Recovery Profile Card ─────────────────────────────────────────────────────

function RecoveryProfileCard({
  xp, user, className = "",
}: {
  xp:        XPData | null;
  user:      User | null;
  className?: string;
}) {
  if (!user) return null;

  const rank       = xp?.rank     ?? "Apprentice";
  const totalXp    = xp?.total_xp ?? 0;
  const nextXp     = xp?.next_xp;
  const xpToNext   = xp?.xp_to_next ?? 0;
  const progressPct = xp?.progress_pct ?? 0;

  const colorClass = GUILD_RANK_COLORS[rank] ?? "text-slate-400 border-slate-600";
  const bgClass    = GUILD_RANK_BG[rank]     ?? "bg-slate-800";
  const textColor  = colorClass.split(" ")[0];
  const borderCls  = colorClass.split(" ").find((c) => c.startsWith("border")) ?? "border-slate-700";

  const isActive    = user.subscription_status === "active" || user.subscription_status === "ACTIVE";
  const planLabel   = TIER_PLAN_LABELS[user.tier]  ?? user.tier;
  const upgradeCTA  = TIER_UPGRADE_CTA[user.tier];

  return (
    <div className={`rounded-2xl border px-5 py-5 ${bgClass} ${borderCls} ${className}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Shield size={15} className={textColor} />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Recovery Profile
          </p>
        </div>
        <RecoveryPhaseTag phase={getRecoveryPhase([], 0, false, 0)} />
      </div>

      {/* Rank + XP */}
      <div className="mt-3 flex items-baseline gap-3">
        <span className={`text-xl font-bold ${textColor}`}>{rank}</span>
        <span className="text-sm text-slate-500 font-mono tabular-nums">{totalXp.toLocaleString()} XP</span>
      </div>

      {/* XP progress bar */}
      {nextXp != null && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
            <div
              className={`h-full rounded-full transition-all opacity-70 ${
                rank === "Commander" ? "bg-gold" :
                rank === "Master Negotiator" ? "bg-gold" :
                rank === "Strategist" ? "bg-indigo-400" :
                rank === "Journeyman" ? "bg-blue-400" : "bg-slate-400"
              }`}
              style={{ width: `${Math.round(progressPct * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {xpToNext.toLocaleString()} XP to next rank
          </p>
        </div>
      )}

      {/* Tier + subscription */}
      <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300 font-medium">{planLabel}</span>
          {user.tier !== "APPRENTICE" && (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
              isActive
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-slate-700 bg-slate-800/60 text-slate-500"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-600"}`} />
              {isActive ? "Active" : user.subscription_status}
            </span>
          )}
          {user.tier === "APPRENTICE" && (
            <span className="text-xs text-slate-600">Free access</span>
          )}
        </div>
        {upgradeCTA && (
          <Link
            href={upgradeCTA.href}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              user.tier === "APPRENTICE"
                ? "bg-gold text-slate-950 hover:opacity-90"
                : "border border-gold/30 text-gold hover:bg-gold/10"
            }`}
          >
            <Crown size={11} /> {upgradeCTA.label}
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const { data: session, status: sessionStatus } = useGuildedSession();

  const [user,     setUser]     = useState<User | null>(null);
  const [xp,       setXP]       = useState<XPData | null>(null);
  const [progress, setProgress] = useState<Record<string, ModuleProgressInput>>({});
  const [modules,  setModules]  = useState<AcademyModuleInput[]>([]);
  const [audits,   setAudits]   = useState<AuditInput[]>([]);
  const [disputes, setDisputes] = useState<{ id: string }[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [doneMissions, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const token = session?.user?.accessToken;
    if (!token) { setLoading(false); return; }
    Promise.allSettled([
      authApi.me(token).then((r) => r.json()),
      academyApi.xpSummary(token).then((r) => r.json()),
      academyApi.progress(token).then((r) => r.json()),
      academyApi.modules(token).then((r) => r.json()),
      auditApi.list(token).then((r) => r.json()),
      disputeApi.list(token).then((r) => r.json()),
    ]).then(([userR, xpR, progR, modsR, audsR, dispR]) => {
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
      if (dispR.status === "fulfilled" && Array.isArray(dispR.value))
        setDisputes(dispR.value);
      setLoading(false);
    });
  }, [session?.user?.accessToken, sessionStatus]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const events        = xp?.recent_events ?? [];
  const completedMods = modules.filter((m) => progress[m.id]?.status === "completed");
  const inProgressMod = modules.find((m) => progress[m.id]?.status === "in_progress") ?? null;
  const nextUnlocked  = modules.find((m) => !progress[m.id] && !m.is_locked) ?? null;
  const latestAudit   = audits.find((a) => a.status === "completed") ?? null;
  const incompleteAudit = audits.find((a) => a.status !== "completed") ?? null;
  const weekActions   = useMemo(() => momentum7Days(events), [events]);

  const phase      = useMemo(() => getRecoveryPhase(audits, completedMods.length, !!inProgressMod, weekActions), [audits, completedMods.length, inProgressMod, weekActions]);
  const protection = useMemo(() => getProtectionStatus(audits), [audits]);
  const momentum   = useMemo(() => getMomentumState(events), [events]);
  const briefing   = useMemo(() => getRecoveryBriefing(phase, inProgressMod?.title ?? null, completedMods.length, latestAudit?.risk_score ?? null), [phase, inProgressMod, completedMods.length, latestAudit]);
  const primaryCTA = useMemo(() => getPrimaryCTA(phase, inProgressMod, latestAudit?.id ?? null, nextUnlocked), [phase, inProgressMod, latestAudit, nextUnlocked]);
  const missions   = useMemo(() => getMissions(phase, modules, progress, audits, events), [phase, modules, progress, audits, events]);

  const aiLimit  = user ? (AI_LIMITS[user.tier] ?? 0) : null;
  const aiPeriod = user ? AI_PERIOD[user.tier] : "monthly";
  const aiUsed   = user?.ai_usage_count ?? 0;

  // Journey milestones
  const verifiedAudit  = audits.find((a) => a.status === "verified" || a.status === "completed") ?? null;
  const hasDispute     = disputes.length > 0;
  const journeyMilestones = useMemo(() => buildMilestones({
    hasAudit:         audits.length > 0,
    hasVerifiedAudit: !!verifiedAudit,
    hasResults:       !!latestAudit,
    hasDispute,
    hasModule:        Object.keys(progress).length > 0,
    hasCompletedMod:  completedMods.length > 0,
    latestAuditId:    latestAudit?.id ?? incompleteAudit?.id ?? null,
    latestModSlug:    (inProgressMod ?? nextUnlocked)?.slug ?? null,
  }), [audits, verifiedAudit, latestAudit, hasDispute, progress, completedMods, inProgressMod, nextUnlocked, incompleteAudit]);

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
    <section>

      {/* ── 1. Greeting ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-gold shrink-0" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Protected Recovery</p>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome back"}
        </h1>
      </div>

      {/* ── Founder-rate pitch — free tier only, dismissible ─────────────── */}
      {user?.tier === "APPRENTICE" && <FounderRateBanner />}

      {/* ── Workspace: 2-column on desktop ────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">

        {/* ── Left: primary workspace ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Profile card — mobile/tablet only (shown in sidebar on desktop) */}
          <RecoveryProfileCard xp={xp} user={user} className="lg:hidden" />

          {/* Continue where you left off */}
          <ContinueBar
            incompleteAuditId={incompleteAudit?.id ?? null}
            incompleteAuditStatus={incompleteAudit?.status ?? null}
            inProgressModuleSlug={inProgressMod?.slug ?? null}
            inProgressModuleTitle={inProgressMod?.title ?? null}
            hasNoAudit={audits.length === 0}
            hasNoModules={modules.length === 0}
          />

          {/* Tactical Briefing */}
          <TacticalPanel>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Today&apos;s Briefing</p>
                <p className="text-sm leading-relaxed text-slate-300">{briefing}</p>
              </div>
            </div>
          </TacticalPanel>

          {/* Primary CTA */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-800/80 to-slate-900 p-5 md:p-6">
            <div className="absolute top-0 right-0 h-28 w-28 rounded-full bg-gold/5 blur-2xl pointer-events-none" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">Next Action</p>
            <p className="mt-1.5 text-base font-semibold text-slate-100">{primaryCTA.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{primaryCTA.desc}</p>
            <Link href={primaryCTA.href} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90">
              {primaryCTA.label} <ArrowRight size={14} />
            </Link>
          </div>

          {/* Daily Missions */}
          {missions.length > 0 && (
            <div className="space-y-2.5">
              <SectionHeader label="Daily Missions" count={`${doneMissions.size}/${missions.length}`} />
              {missions.map((mission) => {
                const isDone = doneMissions.has(mission.id);
                return (
                  <div
                    key={mission.id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-slate-800 bg-slate-900/40"
                    }`}
                  >
                    <button
                      onClick={() => setDone((prev) => { const n = new Set(prev); isDone ? n.delete(mission.id) : n.add(mission.id); return n; })}
                      className="shrink-0"
                    >
                      {isDone ? <CheckCircle size={16} className="text-emerald-400" /> : <Circle size={16} className="text-slate-700" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${isDone ? "text-slate-500 line-through decoration-slate-700" : "text-slate-200"}`}>
                        {mission.label}
                      </p>
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

          {/* Latest Audit */}
          {latestAudit ? (
            <TacticalPanel>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-slate-500">Latest Audit</p>
                  {latestAudit.risk_score != null && (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-xl font-bold tabular-nums ${
                        latestAudit.risk_score >= 75 ? "text-amber-400" :
                        latestAudit.risk_score >= 50 ? "text-amber-400/70" : "text-emerald-400"
                      }`}>
                        {latestAudit.risk_score}
                      </span>
                      <span className="text-xs text-slate-500">risk score</span>
                    </div>
                  )}
                </div>
                <Link
                  href={`/dashboard/audit/${latestAudit.id}/results`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
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

        </div>{/* end left */}

        {/* ── Right: profile + status panel ──────────────────────────────── */}
        <div className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 lg:shrink-0 space-y-4">

          {/* Recovery Profile Card */}
          <RecoveryProfileCard xp={xp} user={user} />

          {/* Journey Milestones */}
          <RecoveryJourney
            milestones={journeyMilestones}
            totalXP={xp?.total_xp ?? 0}
            rank={xp?.rank ?? "Apprentice"}
          />

          {/* Protection + Momentum */}
          <ProtectionDot status={protection} />
          <MomentumBadge momentum={momentum} />

          {/* Quick links: Academy + Counsel */}
          <TacticalPanel>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={12} className="text-gold" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Academy</p>
            </div>
            {inProgressMod ? (
              <>
                <p className="text-xs text-slate-500 font-mono mb-1">IN PROGRESS</p>
                <p className="text-sm font-medium text-slate-200">{inProgressMod.title}</p>
                <Link href={`/dashboard/academy/${inProgressMod.slug}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline">
                  Continue <ArrowRight size={10} />
                </Link>
              </>
            ) : completedMods.length > 0 ? (
              <>
                <p className="text-sm text-slate-400">{completedMods.length} modules complete</p>
                <Link href="/dashboard/academy" className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-gold transition-colors">
                  View Academy <ArrowRight size={10} />
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-400">No training started</p>
                <Link href="/dashboard/academy" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline">
                  Begin Training <ArrowRight size={10} />
                </Link>
              </>
            )}
          </TacticalPanel>

          <TacticalPanel>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={12} className="text-gold" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Plutus Counsel</p>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">Tactical guidance aligned with your recovery phase.</p>
            {aiLimit !== null && (
              <div className="mt-2">
                <AiUsageMeter used={aiUsed} limit={aiLimit} period={aiPeriod} />
              </div>
            )}
            <Link href="/dashboard/ai" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline">
              Open Counsel <ArrowRight size={10} />
            </Link>
          </TacticalPanel>

        </div>{/* end right */}

        {/* ── Mobile-only: stacked status after main content ───────────────── */}
        <div className="lg:hidden space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ProtectionDot status={protection} />
            <MomentumBadge momentum={momentum} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TacticalPanel>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={12} className="text-gold" />
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Academy</p>
              </div>
              {inProgressMod ? (
                <Link href={`/dashboard/academy/${inProgressMod.slug}`} className="text-xs font-medium text-gold hover:underline">
                  Continue module
                </Link>
              ) : (
                <Link href="/dashboard/academy" className="text-xs font-medium text-gold hover:underline">
                  {completedMods.length > 0 ? "View Academy" : "Begin Training"}
                </Link>
              )}
            </TacticalPanel>
            <TacticalPanel>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={12} className="text-gold" />
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Counsel</p>
              </div>
              {aiLimit !== null && <AiUsageMeter used={aiUsed} limit={aiLimit} period={aiPeriod} />}
              <Link href="/dashboard/ai" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline">
                Open <ArrowRight size={10} />
              </Link>
            </TacticalPanel>
          </div>
        </div>

      </div>{/* end workspace flex */}

    </section>
  );
}
