"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield, Users, FileText, BookOpen, Zap, AlertCircle,
  Calendar, Activity, MessageSquare, TrendingUp, AlertTriangle,
  CheckCircle, ChevronRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { SectionHeader, TacticalPanel } from "@/components/ui/tactical";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stats = {
  users:   {
    total: number; signups_today: number; signups_week: number;
    active_subs: number; tiers: Record<string, number>; mau: number; wau: number;
  };
  audits:  { total: number; completed: number; this_week: number; completion_pct: number; avg_risk_score: number | null };
  academy: { module_completions: number; top_modules: { title: string; order_index: number; completions: number }[] };
  disputes: { total: number; week: number };
  xp:     { total: number; weekly: number; by_event: { event: string; count: number; xp: number }[] };
  ai:     { total_messages: number };
};

type Recent = {
  recent_signups:    { id: string; email: string; name: string; tier: string; created_at: string }[];
  recent_audits:     { id: string; status: string; risk_score: number | null; created_at: string }[];
  incomplete_audits: { id: string; status: string; created_at: string }[];
  recent_disputes:   { id: string; strategy_type: string; created_at: string }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatCard({ label, value, sub, icon: Icon, color = "text-slate-400" }: {
  label: string; value: number | string; sub?: string; icon: React.ElementType; color?: string;
}) {
  return (
    <TacticalPanel>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} className={color} />
        <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums text-slate-100">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </TacticalPanel>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session } = useGuildedSession();

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [recent,  setRecent]  = useState<Recent | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied,  setDenied]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (!token) return;

    Promise.allSettled([
      apiFetch("/api/admin/stats",  {}, token).then((r) => {
        if (r.status === 403) { setDenied(true); return null; }
        if (!r.ok) throw new Error("stats failed");
        return r.json();
      }),
      apiFetch("/api/admin/recent", {}, token).then((r) => r.ok ? r.json() : null),
    ]).then(([statsR, recentR]) => {
      if (statsR.status === "fulfilled" && statsR.value) setStats(statsR.value);
      if (recentR.status === "fulfilled" && recentR.value) setRecent(recentR.value);
    }).catch(() => setError("Failed to load admin data."))
      .finally(() => setLoading(false));
  }, [session?.user?.accessToken]);

  if (loading) return (
    <section>
      <div className="flex items-center gap-2"><Shield size={18} className="text-gold" /><h1 className="text-xl font-semibold">Admin</h1></div>
      <p className="mt-6 text-sm text-slate-400">Loading…</p>
    </section>
  );

  if (denied) return (
    <section>
      <div className="flex items-center gap-2"><AlertCircle size={18} className="text-red-400" /><h1 className="text-xl font-semibold">Admin</h1></div>
      <p className="mt-6 text-sm text-red-400">Access denied — admin privileges required.</p>
    </section>
  );

  if (error || !stats) return (
    <section>
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="mt-6 text-sm text-red-400">{error ?? "No data available."}</p>
    </section>
  );

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Shield size={20} className="text-gold" />
          <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/qa"  className="text-xs text-slate-500 hover:text-gold transition-colors">QA Checklist</Link>
          <Link href="/dashboard/admin/ops" className="text-xs text-slate-500 hover:text-gold transition-colors">Ops Guide</Link>
        </div>
      </div>

      {/* ── Top-line KPIs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Users"    value={stats.users.total}      icon={Users}       color="text-blue-400"
                  sub={`+${stats.users.signups_week} this week`} />
        <StatCard label="Active Subs"    value={stats.users.active_subs} icon={Shield}      color="text-gold"
                  sub={`${Math.round((stats.users.active_subs / Math.max(stats.users.total, 1)) * 100)}% conversion`} />
        <StatCard label="Audits Done"    value={stats.audits.completion_pct + "%"} icon={FileText} color="text-emerald-400"
                  sub={`${stats.audits.completed}/${stats.audits.total} completed`} />
        <StatCard label="Total XP"       value={stats.xp.total.toLocaleString()} icon={Zap}   color="text-amber-400"
                  sub={`${stats.xp.weekly.toLocaleString()} this week`} />
      </div>

      {/* ── Signups + engagement ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Signups Today"  value={stats.users.signups_today} icon={Calendar}     color="text-blue-400" />
        <StatCard label="Signups/Week"   value={stats.users.signups_week}  icon={TrendingUp}   color="text-indigo-400" />
        <StatCard label="WAU"            value={stats.users.wau}           icon={Activity}     color="text-gold"
                  sub="weekly active users" />
        <StatCard label="MAU"            value={stats.users.mau}           icon={Users}        color="text-slate-400"
                  sub="monthly active users" />
      </div>

      {/* ── Operational alerts ────────────────────────────────────────── */}
      {recent && recent.incomplete_audits.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={13} className="text-amber-400" />
            <p className="text-xs font-semibold text-amber-400">
              {recent.incomplete_audits.length} incomplete audit{recent.incomplete_audits.length !== 1 ? "s" : ""}
            </p>
          </div>
          <p className="text-xs text-slate-500">
            These audits were uploaded/verified but not run. Users may need prompting to complete them.
          </p>
        </div>
      )}

      {/* ── Two-column: recent signups + recent audits ────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent signups */}
        <div className="space-y-3">
          <SectionHeader label="Recent Signups" count={recent?.recent_signups.length ?? 0} />
          <TacticalPanel noPad>
            <div className="divide-y divide-slate-800">
              {recent?.recent_signups.slice(0, 8).map((u) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{u.email}</p>
                    <p className="text-xs text-slate-600">{u.tier}</p>
                  </div>
                  <span className="text-xs text-slate-600 shrink-0 ml-2">{fmt(u.created_at)}</span>
                </div>
              )) ?? <p className="px-4 py-3 text-sm text-slate-500">No recent signups</p>}
            </div>
          </TacticalPanel>
        </div>

        {/* Recent audits */}
        <div className="space-y-3">
          <SectionHeader label="Recent Audits" count={recent?.recent_audits.length ?? 0} />
          <TacticalPanel noPad>
            <div className="divide-y divide-slate-800">
              {recent?.recent_audits.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${
                      a.status === "completed" ? "bg-emerald-400" :
                      a.status === "verified"  ? "bg-blue-400"    : "bg-amber-400"
                    }`} />
                    <div>
                      <p className="text-xs text-slate-300 font-mono">{a.id.slice(0, 8)}…</p>
                      <p className="text-xs text-slate-600">{a.status}{a.risk_score != null ? ` · risk: ${a.risk_score}` : ""}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 shrink-0">{fmt(a.created_at)}</span>
                </div>
              )) ?? <p className="px-4 py-3 text-sm text-slate-500">No recent audits</p>}
            </div>
          </TacticalPanel>
        </div>
      </div>

      {/* ── Tier breakdown + top modules ─────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Tier distribution */}
        <div className="space-y-3">
          <SectionHeader label="Tier Distribution" />
          <TacticalPanel noPad>
            <div className="divide-y divide-slate-800">
              {Object.entries(stats.users.tiers).map(([tier, count]) => (
                <div key={tier} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-slate-300 capitalize">{tier.toLowerCase()}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gold/60"
                        style={{ width: `${Math.round((count / Math.max(stats.users.total, 1)) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-200 tabular-nums w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </TacticalPanel>
        </div>

        {/* Top modules */}
        <div className="space-y-3">
          <SectionHeader label="Top Completed Modules" />
          <TacticalPanel noPad>
            <div className="divide-y divide-slate-800">
              {stats.academy.top_modules.length > 0
                ? stats.academy.top_modules.map((m) => (
                    <div key={m.title} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs text-slate-600">{String(m.order_index).padStart(2, "0")}</span>
                        <span className="text-sm text-slate-300 truncate">{m.title}</span>
                      </div>
                      <span className="text-xs font-semibold text-gold shrink-0 ml-2">{m.completions}×</span>
                    </div>
                  ))
                : <p className="px-5 py-3 text-sm text-slate-500">No completions yet</p>
              }
            </div>
          </TacticalPanel>
        </div>
      </div>

      {/* ── Recent disputes + XP events ─────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <SectionHeader label="Recent Disputes" count={stats.disputes.week + " this week"} />
          <TacticalPanel noPad>
            <div className="divide-y divide-slate-800">
              {recent?.recent_disputes.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-xs text-slate-300">{d.strategy_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-600 font-mono">{d.id.slice(0, 8)}…</p>
                  </div>
                  <span className="text-xs text-slate-600">{fmt(d.created_at)}</span>
                </div>
              )) ?? <p className="px-4 py-3 text-sm text-slate-500">No disputes yet</p>}
            </div>
          </TacticalPanel>
        </div>

        <div className="space-y-3">
          <SectionHeader label="XP Event Breakdown" />
          <TacticalPanel noPad>
            <div className="divide-y divide-slate-800">
              {stats.xp.by_event.map((row) => (
                <div key={row.event} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-slate-300">{row.event.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{row.count}×</span>
                    <span className="text-xs font-semibold text-gold">{row.xp.toLocaleString()} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </TacticalPanel>
        </div>
      </div>
    </section>
  );
}
