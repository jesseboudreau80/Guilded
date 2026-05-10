"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Shield, BookOpen, CheckCircle, Clock,
  Zap, Award, ArrowRight, Lock,
  FileText, MessageSquare, Target,
} from "lucide-react";
import { academyApi, auditApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { GuildRankBadge } from "@/components/academy/GuildRankBadge";
import {
  TacticalPanel, SectionHeader, StrategicAlert,
  RecoveryPhaseTag, MomentumBadge, TimelineRow,
} from "@/components/ui/tactical";
import {
  getRecoveryPhase, getMomentumState, buildTimeline,
  computeStreak, momentum7Days, PHASE_DESCRIPTIONS,
  type AuditInput, type AcademyModuleInput, type ModuleProgressInput, type XPEventInput,
} from "@/lib/recovery-engine";
import { XP_EVENT_LABELS } from "@/lib/academy-intel";

// ── Types ─────────────────────────────────────────────────────────────────────

type XPData = {
  total_xp:      number;
  rank:          string;
  next_xp:       number | null;
  min_xp:        number;
  progress_pct:  number;
  xp_to_next:    number;
  recent_events: XPEventInput[];
  badges:        { badge_key: string; label: string; earned_at: string }[];
};

// ── Module gradient map ───────────────────────────────────────────────────────

const MODULE_GRADIENTS: Record<number, string> = {
  1: "from-slate-800/50", 2: "from-blue-950/40", 3: "from-indigo-950/40",
  4: "from-red-950/40",   5: "from-emerald-950/40", 6: "from-amber-950/40",
  7: "from-gold/10",
};

// ── Timeline icon map ─────────────────────────────────────────────────────────

const TIMELINE_ICONS: Record<string, typeof Shield> = {
  module:  BookOpen,
  audit:   FileText,
  dispute: MessageSquare,
  xp:      Zap,
  rank:    Target,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const { data: session } = useGuildedSession();

  const [xp,       setXP]       = useState<XPData | null>(null);
  const [modules,  setModules]  = useState<AcademyModuleInput[]>([]);
  const [progress, setProgress] = useState<Record<string, ModuleProgressInput>>({});
  const [audits,   setAudits]   = useState<AuditInput[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;
    Promise.all([
      academyApi.xpSummary(token).then((r) => r.json()),
      academyApi.modules(token).then((r) => r.json()),
      academyApi.progress(token).then((r) => r.json()),
      auditApi.list(token).then((r) => r.json()),
    ]).then(([xpData, mods, prog, auds]) => {
      setXP(xpData);
      setModules(Array.isArray(mods) ? [...mods].sort((a: AcademyModuleInput, b: AcademyModuleInput) => a.order_index - b.order_index) : []);
      const pm: Record<string, ModuleProgressInput> = {};
      if (Array.isArray(prog)) prog.forEach((p: ModuleProgressInput) => { pm[p.module_id] = p; });
      setProgress(pm);
      setAudits(Array.isArray(auds) ? auds : []);
    }).finally(() => setLoading(false));
  }, [session?.user?.accessToken]);

  // ── Engine-derived state ──────────────────────────────────────────────────
  const events        = xp?.recent_events ?? [];
  const completedMods = modules.filter((m) => progress[m.id]?.status === "completed");
  const inProgressMod = modules.find((m) => progress[m.id]?.status === "in_progress") ?? null;
  const lockedMods    = modules.filter((m) => m.is_locked);
  const weekActions   = useMemo(() => momentum7Days(events), [events]);
  const streak        = useMemo(() => computeStreak(events), [events]);
  const phase         = useMemo(() => getRecoveryPhase(audits, completedMods.length, !!inProgressMod, weekActions), [audits, completedMods.length, inProgressMod, weekActions]);
  const momentum      = useMemo(() => getMomentumState(events), [events]);
  const timeline      = useMemo(() => buildTimeline(events, audits), [events, audits]);

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-gold" />
          <h1 className="text-2xl font-semibold">Command Center</h1>
        </div>
        <p className="mt-6 text-sm text-slate-400">Loading your operations center…</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Shield size={20} className="text-gold shrink-0" />
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Command Center</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RecoveryPhaseTag phase={phase} />
            <p className="text-xs text-slate-500">{PHASE_DESCRIPTIONS[phase]}</p>
          </div>
        </div>
        {inProgressMod && (
          <Link href={`/dashboard/academy/${inProgressMod.slug}`} className="shrink-0 inline-flex items-center gap-2 self-start rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity">
            Continue Training <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* ── Rank + Stats row ────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {xp && (
          <GuildRankBadge rank={xp.rank} xp={xp.total_xp} nextXP={xp.next_xp} progressPct={xp.progress_pct} variant="full" />
        )}
        <MomentumBadge momentum={momentum} />
        <TacticalPanel className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Campaign Progress</p>
          <p className="text-3xl font-bold tabular-nums text-slate-100">
            {completedMods.length}<span className="text-lg text-slate-600">/{modules.length}</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">modules complete</p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500/60 transition-all" style={{ width: `${modules.length > 0 ? Math.round((completedMods.length / modules.length) * 100) : 0}%` }} />
          </div>
        </TacticalPanel>
      </div>

      {/* ── Campaign Map ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader label="Training Campaign" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((mod) => {
            const status = progress[mod.id]?.status ?? "not_started";
            const done   = status === "completed";
            const active = status === "in_progress";
            const locked = mod.is_locked;
            const grad   = MODULE_GRADIENTS[mod.order_index] ?? "from-slate-800/50";
            const border = done ? "border-emerald-500/20" : active ? "border-gold/30" : locked ? "border-slate-800/40" : "border-slate-800";

            return (
              <div key={mod.id} className={`relative flex flex-col rounded-xl border bg-gradient-to-br ${grad} to-slate-900 p-4 ${border} ${locked ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-600">{String(mod.order_index).padStart(2, "0")}</span>
                  <div className="flex items-center gap-1.5">
                    {done   && <CheckCircle size={13} className="text-emerald-400" />}
                    {active && <Zap size={13} className="text-gold" />}
                    {locked && <Lock size={12} className="text-slate-600" />}
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-200 leading-snug">{mod.title}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><BookOpen size={10} /> {(mod as any).lesson_count ?? "—"}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {(mod as any).estimated_minutes ?? "—"}m</span>
                </div>
                <div className="mt-3">
                  <Link href={locked ? "/dashboard/upgrade" : `/dashboard/academy/${mod.slug}`} className={`text-xs font-medium transition-colors ${done ? "text-emerald-400 hover:text-emerald-300" : active ? "text-gold" : locked ? "text-slate-600" : "text-slate-400 hover:text-slate-200"}`}>
                    {done ? "Review" : active ? "Continue →" : locked ? "Upgrade to unlock" : "Begin →"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recovery Timeline ─────────────────────────────────────────────── */}
      {timeline.length > 0 && (
        <div className="space-y-3">
          <SectionHeader label="Recovery Timeline" count={`${timeline.length} events`} />
          <TacticalPanel noPad>
            <div className="divide-y divide-slate-800">
              {timeline.map((event) => (
                <TimelineRow
                  key={event.id}
                  kind={event.kind}
                  label={event.label}
                  date={event.date}
                  icon={TIMELINE_ICONS[event.kind] ?? Zap}
                />
              ))}
            </div>
          </TacticalPanel>
        </div>
      )}

      {/* ── Badges ───────────────────────────────────────────────────────── */}
      {xp && xp.badges.length > 0 && (
        <div className="space-y-3">
          <SectionHeader label="Earned Badges" />
          <div className="flex flex-wrap gap-2">
            {xp.badges.map((badge) => (
              <span key={badge.badge_key} className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold">
                <Award size={11} /> {badge.label.split(" — ")[0]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent XP ────────────────────────────────────────────────────── */}
      {xp && xp.recent_events.length > 0 && (
        <div className="space-y-3">
          <SectionHeader label="Recent XP" />
          <TacticalPanel noPad>
            <div className="divide-y divide-slate-800">
              {xp.recent_events.slice(0, 5).map((event, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Zap size={11} className="text-gold shrink-0" />
                    <span className="text-sm text-slate-300">{XP_EVENT_LABELS[event.event_type] ?? event.event_type}</span>
                  </div>
                  <span className="text-xs font-semibold text-gold">+{event.xp_amount} XP</span>
                </div>
              ))}
            </div>
          </TacticalPanel>
        </div>
      )}

      {/* ── Locked modules ───────────────────────────────────────────────── */}
      {lockedMods.length > 0 && (
        <StrategicAlert
          title={`${lockedMods.length} advanced module${lockedMods.length !== 1 ? "s" : ""} locked`}
          message="Advance your billing rank to unlock arbitration, long-term restoration, and enrichment modules."
          href="/dashboard/upgrade"
          cta="Advance Rank"
          accent="gold"
        />
      )}
    </section>
  );
}
