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

type FunnelStep = { label: string; count: number; rate_from_top: number; rate_from_prev: number | null };
type Funnel     = { steps: FunnelStep[]; key_rates: Record<string, number> };
type Costs          = { total_estimated_usd: number; monthly_projection_usd: number; disclaimer?: string; pricing_model?: string; breakdown: Record<string, { count: number; estimated_usd: number }> };
type AtRiskUser     = { id: string; email: string; name: string; created_at: string };
type AtRisk         = { never_uploaded: { count: number; users: AtRiskUser[] }; incomplete_audit: { count: number; users: AtRiskUser[] }; audit_no_dispute: { count: number; users: AtRiskUser[] } };
type OcrCorrections  = { total_correction_events: number; field_correction_frequency: { field: string; corrections: number; pct: number }[]; insight: string };
type WebhookHealth   = {
  stripe_mode: string; mode_consistent: boolean; mode_warnings: string[]; webhook_set: boolean;
  events: { total: number; last_24h: number; last_7d: number; last_event: { id: string; type: string; processed_at: string } | null; by_type_7d: { type: string; count: number }[] };
  price_ids: { mode: string; journeyman_set: boolean; master_set: boolean; founders_standard_set: boolean; founders_partner_set: boolean };
};
type FounderUser = { id: string; email: string; name: string; founders_pass_type: string | null; founders_pass_date: string | null; tier: string };
type FoundersStats = { total: number; standard: number; partner: number; users: FounderUser[] };

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
  const { data: session, status: sessionStatus } = useGuildedSession();

  const [stats,    setStats]    = useState<Stats | null>(null);
  const [recent,   setRecent]   = useState<Recent | null>(null);
  const [funnel,   setFunnel]   = useState<Funnel | null>(null);
  const [costs,    setCosts]    = useState<Costs | null>(null);
  const [atRisk,   setAtRisk]   = useState<AtRisk | null>(null);
  const [ocrCorr,  setOcrCorr]  = useState<OcrCorrections | null>(null);
  const [webhook,  setWebhook]  = useState<WebhookHealth | null>(null);
  const [founders, setFounders] = useState<FoundersStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [denied,   setDenied]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const token = session?.user?.accessToken;
    if (!token) { setLoading(false); return; }

    Promise.allSettled([
      apiFetch("/api/admin/stats",           {}, token).then((r) => { if (r.status === 403) { setDenied(true); return null; } return r.ok ? r.json() : null; }),
      apiFetch("/api/admin/recent",          {}, token).then((r) => r.ok ? r.json() : null),
      apiFetch("/api/admin/funnel",          {}, token).then((r) => r.ok ? r.json() : null),
      apiFetch("/api/admin/costs",           {}, token).then((r) => r.ok ? r.json() : null),
      apiFetch("/api/admin/at-risk",         {}, token).then((r) => r.ok ? r.json() : null),
      apiFetch("/api/admin/ocr-corrections", {}, token).then((r) => r.ok ? r.json() : null),
      apiFetch("/api/admin/webhook-health",  {}, token).then((r) => r.ok ? r.json() : null),
      apiFetch("/api/admin/founders",        {}, token).then((r) => r.ok ? r.json() : null),
    ]).then(([statsR, recentR, funnelR, costsR, atRiskR, ocrR, webhookR, foundersR]) => {
      if (statsR.status   === "fulfilled" && statsR.value)   setStats(statsR.value);
      if (recentR.status  === "fulfilled" && recentR.value)  setRecent(recentR.value);
      if (funnelR.status  === "fulfilled" && funnelR.value)  setFunnel(funnelR.value);
      if (costsR.status   === "fulfilled" && costsR.value)   setCosts(costsR.value);
      if (atRiskR.status  === "fulfilled" && atRiskR.value)  setAtRisk(atRiskR.value);
      if (ocrR.status     === "fulfilled" && ocrR.value)     setOcrCorr(ocrR.value);
      if (webhookR.status   === "fulfilled" && webhookR.value)   setWebhook(webhookR.value);
      if (foundersR.status  === "fulfilled" && foundersR.value)  setFounders(foundersR.value);
    }).catch(() => setError("Failed to load admin data."))
      .finally(() => setLoading(false));
  }, [session?.user?.accessToken, sessionStatus]);

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

      {/* ── Conversion Funnel ───────────────────────────────────────── */}
      {funnel && (
        <div className="space-y-3">
          <SectionHeader label="Conversion Funnel" />
          <TacticalPanel noPad>
            <div className="divide-y divide-slate-800">
              {funnel.steps.map((step, i) => (
                <div key={step.label} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-300">{step.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-200 tabular-nums">{step.count}</span>
                      <span className={`text-xs font-medium tabular-nums w-14 text-right ${
                        i === 0 ? "text-slate-500" :
                        step.rate_from_prev && step.rate_from_prev >= 70 ? "text-emerald-400" :
                        step.rate_from_prev && step.rate_from_prev >= 40 ? "text-amber-400" : "text-red-400"
                      }`}>
                        {i === 0 ? "100%" : `${step.rate_from_prev?.toFixed(1) ?? "—"}%`}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${i === 0 ? "bg-slate-600" : "bg-gold/60"}`}
                      style={{ width: `${step.rate_from_top}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-800 px-5 py-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(funnel.key_rates).map(([key, rate]) => (
                <div key={key}>
                  <p className="text-xs text-slate-600">{key.replace(/_/g, " ")}</p>
                  <p className={`text-sm font-bold ${Number(rate) >= 60 ? "text-emerald-400" : Number(rate) >= 30 ? "text-amber-400" : "text-red-400"}`}>
                    {Number(rate).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </TacticalPanel>
        </div>
      )}

      {/* ── AI Cost Telemetry ────────────────────────────────────────── */}
      {costs && (
        <div className="space-y-3">
          <SectionHeader label="AI Cost Intelligence" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(costs.breakdown).map(([key, data]) => (
              <TacticalPanel key={key}>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{key.replace(/_/g, " ")}</p>
                <p className="text-xl font-bold text-slate-100">${data.estimated_usd.toFixed(4)}</p>
                <p className="text-xs text-slate-600 mt-0.5">{data.count} events</p>
              </TacticalPanel>
            ))}
          </div>
          <TacticalPanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Total estimated spend</p>
                <p className="text-2xl font-bold text-slate-100">${costs.total_estimated_usd.toFixed(4)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">30-day projection</p>
                <p className="text-lg font-bold text-amber-400">${costs.monthly_projection_usd.toFixed(2)}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-700">{costs.disclaimer}</p>
          </TacticalPanel>
        </div>
      )}

      {/* ── At-Risk Users ─────────────────────────────────────────────── */}
      {atRisk && (
        <div className="space-y-3">
          <SectionHeader label="At-Risk Users" />
          <div className="grid gap-4 lg:grid-cols-3">
            {([
              { key: "never_uploaded",   label: "Never Uploaded",          desc: "Registered 3+ days, no audit" },
              { key: "incomplete_audit", label: "Upload Never Completed",   desc: "Started but didn't finish" },
              { key: "audit_no_dispute", label: "Audit — No Action Taken",  desc: "Completed audit, no disputes" },
            ] as const).map(({ key, label, desc }) => {
              const seg = atRisk[key];
              return (
                <TacticalPanel key={key} noPad>
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-xs font-semibold text-slate-300">{label}</p>
                    <p className="text-xs text-slate-600">{desc}</p>
                    <p className="text-lg font-bold text-slate-100 mt-1">{seg.count} user{seg.count !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {seg.users.slice(0, 5).map((u) => (
                      <div key={u.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-300">{u.email}</p>
                          <p className="text-xs text-slate-600">{fmt(u.created_at)}</p>
                        </div>
                      </div>
                    ))}
                    {seg.users.length === 0 && <p className="px-4 py-3 text-xs text-slate-600">No users in this segment</p>}
                  </div>
                </TacticalPanel>
              );
            })}
          </div>
        </div>
      )}

      {/* ── OCR Correction Intelligence ───────────────────────────────── */}
      {ocrCorr && ocrCorr.total_correction_events > 0 && (
        <div className="space-y-3">
          <SectionHeader label="OCR Correction Intelligence" count={`${ocrCorr.total_correction_events} total corrections`} />
          <TacticalPanel noPad>
            <div className="px-5 py-3 border-b border-slate-800">
              <p className="text-xs text-slate-400 leading-relaxed">{ocrCorr.insight}</p>
            </div>
            <div className="divide-y divide-slate-800">
              {ocrCorr.field_correction_frequency.map((f) => (
                <div key={f.field} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-slate-300 font-medium">{f.field.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400/60" style={{ width: `${Math.min(f.pct, 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{f.corrections}×</span>
                    <span className="text-xs text-slate-600 tabular-nums w-12 text-right">{f.pct.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </TacticalPanel>
        </div>
      )}

      {/* ── Founders Pass Users ──────────────────────────────────────── */}
      {founders && (
        <div className="space-y-3">
          <SectionHeader label="Founders Pass" />
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Total Founders" value={founders.total}    icon={Shield} color="text-gold" />
            <StatCard label="Standard Pass"  value={founders.standard} icon={Shield} color="text-gold" sub="$195 one-time" />
            <StatCard label="Partner Pass"   value={founders.partner}  icon={Shield} color="text-slate-400" sub="$97 one-time" />
          </div>
          {founders.users.length > 0 && (
            <TacticalPanel noPad>
              <div className="divide-y divide-slate-800">
                {founders.users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">{u.email}</p>
                      <p className="text-xs text-slate-600">{u.name || "—"}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-500">{u.founders_pass_type ?? "—"}</span>
                      {u.founders_pass_date && (
                        <span className="text-xs text-slate-700">{new Date(u.founders_pass_date).toLocaleDateString()}</span>
                      )}
                      <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-semibold text-gold">
                        LIFETIME
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </TacticalPanel>
          )}
        </div>
      )}

      {/* ── Stripe Webhook Health ─────────────────────────────────────── */}
      {webhook && (
        <div className="space-y-3">
          <SectionHeader label="Stripe Billing Health" />
          <div className="grid gap-3 sm:grid-cols-3">
            <TacticalPanel>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Mode</p>
              <p className={`text-xl font-bold ${webhook.stripe_mode === "live" ? "text-gold" : "text-blue-400"}`}>
                {webhook.stripe_mode.toUpperCase()}
              </p>
              <p className={`text-xs mt-0.5 ${webhook.mode_consistent ? "text-emerald-400" : "text-red-400"}`}>
                {webhook.mode_consistent ? "Config consistent" : "⚠ Config mismatch"}
              </p>
            </TacticalPanel>
            <TacticalPanel>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Events (24h)</p>
              <p className="text-xl font-bold text-slate-100">{webhook.events.last_24h}</p>
              <p className="text-xs text-slate-500 mt-0.5">{webhook.events.last_7d} this week</p>
            </TacticalPanel>
            <TacticalPanel>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Price IDs</p>
              <div className="space-y-1">
                {[
                  { label: "Journeyman",        set: webhook.price_ids.journeyman_set },
                  { label: "Master",            set: webhook.price_ids.master_set },
                  { label: "Founders Standard", set: webhook.price_ids.founders_standard_set },
                  { label: "Founders Partner",  set: webhook.price_ids.founders_partner_set },
                ].map(({ label, set }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${set ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-xs text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </TacticalPanel>
          </div>
          {webhook.mode_warnings.length > 0 && (
            <TacticalPanel>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Config Warnings</p>
              <ul className="space-y-1">
                {webhook.mode_warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-300">{w}</li>
                ))}
              </ul>
            </TacticalPanel>
          )}
          {webhook.events.last_event && (
            <TacticalPanel>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Last Webhook Event</p>
              <p className="text-sm font-medium text-slate-200">{webhook.events.last_event.type}</p>
              <p className="text-xs text-slate-500 mt-0.5">{new Date(webhook.events.last_event.processed_at).toLocaleString()}</p>
            </TacticalPanel>
          )}
          {webhook.events.by_type_7d.length > 0 && (
            <TacticalPanel noPad>
              <p className="text-xs text-slate-500 uppercase tracking-wide px-4 pt-3 pb-2">Events by Type (7d)</p>
              <div className="divide-y divide-slate-800">
                {webhook.events.by_type_7d.map((row) => (
                  <div key={row.type} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-slate-300">{row.type}</span>
                    <span className="text-xs font-semibold text-slate-200 tabular-nums">{row.count}</span>
                  </div>
                ))}
              </div>
            </TacticalPanel>
          )}
        </div>
      )}
    </section>
  );
}
