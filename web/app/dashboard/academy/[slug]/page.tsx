"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Clock, CheckCircle,
  Lock, ChevronRight, ChevronLeft, Shield, AlertCircle,
} from "lucide-react";
import { academyApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { parseMarkdown, type Block, type FrontMatter } from "@/lib/markdown";
import { track } from "@/lib/analytics";

// ── Types ─────────────────────────────────────────────────────────────────────

type AcademyModule = {
  id:                string;
  slug:              string;
  title:             string;
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
  started_at:   string | null;
  completed_at: string | null;
};

const TIER_UPGRADE: Record<string, string> = {
  JOURNEYMAN: "Journeyman", MASTER: "Master", HERO: "Hero",
};

const BADGE_COLORS: Record<string, string> = {
  Foundation: "border-slate-600 bg-slate-800 text-slate-300",
  Tactical:   "border-blue-500/30 bg-blue-900/30 text-blue-400",
  Defensive:  "border-indigo-500/30 bg-indigo-900/30 text-indigo-400",
  Offensive:  "border-red-500/30 bg-red-900/30 text-red-400",
  Growth:     "border-emerald-500/30 bg-emerald-900/30 text-emerald-400",
  Advanced:   "border-amber-500/30 bg-amber-900/30 text-amber-400",
  Elite:      "border-gold/30 bg-gold/10 text-gold",
};

// ── Block renderer ────────────────────────────────────────────────────────────

function RenderBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "h2":
      return (
        <h2 className="mt-10 mb-4 text-base font-semibold text-slate-100 first:mt-0">
          <span className="flex items-center gap-2">
            <span className="h-px w-5 bg-gold/50 shrink-0" />
            {block.text}
          </span>
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-300">
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p
          className="mb-4 text-sm leading-relaxed text-slate-400
            [&_strong]:font-semibold [&_strong]:text-slate-200
            [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5
            [&_code]:font-mono [&_code]:text-xs [&_code]:text-gold"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case "list":
      return (
        <ul className="mb-4 space-y-2">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm leading-relaxed text-slate-400
                [&_strong]:font-semibold [&_strong]:text-slate-200"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/50" />
              <span dangerouslySetInnerHTML={{ __html: item }} />
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div className="relative my-6 overflow-hidden rounded-xl border border-gold/20 bg-gold/5 px-5 pt-3.5 pb-4">
          <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl bg-gold" />
          <div className="flex items-center gap-1.5 mb-2">
            <Shield size={11} className="text-gold" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">
              Plutus Insight
            </span>
          </div>
          <p
            className="text-sm leading-relaxed text-slate-300
              [&_strong]:font-semibold [&_strong]:text-slate-100"
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        </div>
      );
    case "divider":
      return <hr className="my-8 border-slate-800" />;
    default:
      return null;
  }
}

// ── Locked state ──────────────────────────────────────────────────────────────

function LockedState({ tierRequired }: { tierRequired: string }) {
  const label = TIER_UPGRADE[tierRequired] ?? tierRequired;
  return (
    <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 px-8 py-16 text-center">
      <div className="h-12 w-12 rounded-2xl border border-slate-700 bg-slate-800 flex items-center justify-center mb-4">
        <Lock size={20} className="text-slate-600" />
      </div>
      <p className="text-base font-semibold text-slate-200">{label} Rank Required</p>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        This module requires a higher rank. Advance to unlock the full training.
      </p>
      <Link
        href="/dashboard/upgrade"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-90 transition-opacity"
      >
        View Rank Options <ChevronRight size={14} />
      </Link>
    </div>
  );
}

// ── Content unavailable fallback ──────────────────────────────────────────────

function ContentUnavailable({ slug }: { slug: string }) {
  return (
    <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 px-8 py-14 text-center">
      <div className="h-12 w-12 rounded-2xl border border-slate-700 bg-slate-800/60 flex items-center justify-center mx-auto mb-5">
        <AlertCircle size={20} className="text-slate-600" />
      </div>
      <p className="text-base font-semibold text-slate-200">Module content unavailable</p>
      <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
        The content for this module couldn&apos;t be loaded. This is likely a temporary issue.
      </p>
      <p className="mt-1 text-xs text-slate-700 font-mono">{slug}</p>
      <Link
        href="/dashboard/academy"
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={13} /> Back to Academy
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AcademyModulePage() {
  const { slug }             = useParams<{ slug: string }>();
  const { data: session, status: sessionStatus } = useGuildedSession();

  const [fm,         setFm]         = useState<FrontMatter | null>(null);
  const [blocks,     setBlocks]     = useState<Block[]>([]);
  const [module,     setModule]     = useState<AcademyModule | null>(null);
  const [allModules, setAllModules] = useState<AcademyModule[]>([]);
  const [progress,   setProgress]   = useState<ModuleProgress | null>(null);

  // Separate loading flags so each completes independently
  const [loadingMd,  setLoadingMd]  = useState(true);
  const [loadingApi, setLoadingApi] = useState(true);
  const [mdError,    setMdError]    = useState(false);
  const [completing, setCompleting] = useState(false);
  const [justDone,   setJustDone]   = useState(false);

  // ── Track page view ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (slug) track("academy_module_page_viewed", { slug });
  }, [slug]);

  // ── Markdown fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    setLoadingMd(true);
    setMdError(false);
    setFm(null);
    setBlocks([]);

    const tryFetch = async () => {
      // Try numbered files 01-07 first, then bare slug as fallback
      for (let n = 1; n <= 7; n++) {
        try {
          const res = await fetch(`/academy-content/${String(n).padStart(2, "0")}-${slug}.md`);
          if (res.ok) {
            const text   = await res.text();
            const parsed = parseMarkdown(text);
            setFm(parsed.frontmatter);
            setBlocks(parsed.blocks);
            return;
          }
        } catch { /* network error on this attempt, try next */ }
      }
      // Final fallback: bare slug
      try {
        const res = await fetch(`/academy-content/${slug}.md`);
        if (res.ok) {
          const parsed = parseMarkdown(await res.text());
          setFm(parsed.frontmatter);
          setBlocks(parsed.blocks);
          return;
        }
      } catch { /* fallback also failed */ }
      setMdError(true);
    };

    tryFetch().catch(() => setMdError(true)).finally(() => setLoadingMd(false));
  }, [slug]);

  // ── API fetch — depends on session ─────────────────────────────────────────
  // Key fix: if session is still loading, keep loadingApi true.
  // Once session resolves (authenticated OR unauthenticated), act.
  useEffect(() => {
    if (sessionStatus === "loading") return; // wait for session to resolve

    const token = session?.user?.accessToken;
    if (!token) {
      // Not authenticated — release the loading gate so content still renders
      setLoadingApi(false);
      return;
    }

    setLoadingApi(true);

    Promise.all([
      academyApi.modules(token).then((r) => r.json()),
      academyApi.progress(token).then((r) => r.json()),
    ]).then(([mods, prog]) => {
      const sorted: AcademyModule[] = Array.isArray(mods)
        ? [...mods].sort((a, b) => a.order_index - b.order_index)
        : [];
      setAllModules(sorted);
      const found = sorted.find((m) => m.slug === slug) ?? null;
      setModule(found);

      if (found) {
        const myProg = (Array.isArray(prog) ? prog : []).find(
          (p: ModuleProgress) => p.module_id === found.id
        ) ?? null;
        setProgress(myProg);

        // Auto-start: mark in_progress if not yet started and not locked
        if (!myProg && !found.is_locked) {
          academyApi.startModule(found.id, token).catch(() => {});
          setProgress({
            module_id:    found.id,
            status:       "in_progress",
            started_at:   new Date().toISOString(),
            completed_at: null,
          });
        }
      }
    }).catch(() => {
      // API failed — release the gate so content still renders from markdown
    }).finally(() => setLoadingApi(false));
  }, [slug, session?.user?.accessToken, sessionStatus]);

  // ── Complete handler ────────────────────────────────────────────────────────
  const handleComplete = async () => {
    const token = session?.user?.accessToken;
    if (!token || !module || completing) return;
    setCompleting(true);
    try {
      const res = await academyApi.completeModule(module.id, token);
      if (res.ok) {
        setProgress((p) => ({
          module_id:    module.id,
          status:       "completed",
          started_at:   p?.started_at ?? new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }));
        setJustDone(true);
      }
    } catch { /* silent — user can retry */ }
    finally {
      setCompleting(false);
    }
  };

  const prevModule = allModules.find((m) => module && m.order_index === module.order_index - 1) ?? null;
  const nextModule = allModules.find((m) => module && m.order_index === module.order_index + 1) ?? null;

  // ── Loading state ───────────────────────────────────────────────────────────
  // Show loading while markdown is loading OR while session + API is still pending.
  // Once markdown resolves, show a lighter skeleton rather than a blank screen.
  if (loadingMd) {
    return (
      <section>
        <Link
          href="/dashboard/academy"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={12} /> Plutus Academy
        </Link>
        <div className="mt-8 space-y-4 animate-pulse">
          <div className="h-4 w-40 rounded bg-slate-800" />
          <div className="h-8 w-2/3 rounded bg-slate-800" />
          <div className="h-3 w-32 rounded bg-slate-800" />
          <div className="mt-8 space-y-3">
            <div className="h-3 w-full rounded bg-slate-800/70" />
            <div className="h-3 w-5/6 rounded bg-slate-800/70" />
            <div className="h-3 w-4/6 rounded bg-slate-800/70" />
          </div>
        </div>
      </section>
    );
  }

  // ── Markdown error state ────────────────────────────────────────────────────
  if (mdError) {
    return (
      <section>
        <Link
          href="/dashboard/academy"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={12} /> Plutus Academy
        </Link>
        <ContentUnavailable slug={slug} />
      </section>
    );
  }

  // ── Resolved values ─────────────────────────────────────────────────────────
  const title      = fm?.title            ?? module?.title       ?? slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const badge      = fm?.badge            ?? module?.badge_label ?? null;
  const mins       = fm?.estimated_minutes ?? String(module?.estimated_minutes ?? "");
  const tier       = fm?.tier_required    ?? module?.tier_required ?? "APPRENTICE";
  const locked     = module?.is_locked    ?? false;
  const status     = progress?.status     ?? "not_started";
  const num        = module?.order_index;
  const total      = allModules.length    || 7;
  const h2Count    = blocks.filter((b) => b.kind === "h2").length;
  const badgeColor = badge ? (BADGE_COLORS[badge] ?? "border-slate-600 text-slate-400") : "";

  return (
    <section className="relative">

      {/* ── Sticky progress bar ────────────────────────────────────────────── */}
      {num && !locked && (
        <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-2 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-600 shrink-0">
              {String(num).padStart(2, "0")}/{String(total).padStart(2, "0")}
            </span>
            <div className="flex-1 h-0.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all ${status === "completed" ? "bg-emerald-500/60" : "bg-gold/50"}`}
                style={{ width: `${Math.round((num / total) * 100)}%` }}
              />
            </div>
            {status === "completed" && (
              <CheckCircle size={12} className="text-emerald-400 shrink-0" />
            )}
            {status === "in_progress" && (
              <span className="h-2 w-2 rounded-full bg-gold animate-pulse shrink-0" />
            )}
          </div>
        </div>
      )}

      {/* ── Breadcrumb navigation ──────────────────────────────────────────── */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <Link href="/dashboard/academy" className="inline-flex items-center gap-1 hover:text-slate-300 transition-colors">
            <ArrowLeft size={11} /> Academy
          </Link>
          {prevModule && (
            <>
              <span className="text-slate-800">·</span>
              <Link
                href={`/dashboard/academy/${prevModule.slug}`}
                className="inline-flex items-center gap-1 hover:text-slate-300 transition-colors max-w-[140px] truncate"
              >
                <ChevronLeft size={11} className="shrink-0" />
                {prevModule.title}
              </Link>
            </>
          )}
        </div>
        {nextModule && (
          <Link
            href={`/dashboard/academy/${nextModule.slug}`}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 max-w-[140px] truncate"
          >
            {nextModule.title}
            <ChevronRight size={11} className="shrink-0" />
          </Link>
        )}
      </div>

      {/* ── Module header ──────────────────────────────────────────────────── */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {num && (
              <span className="font-mono text-xs font-semibold tracking-widest text-slate-600">
                MODULE {String(num).padStart(2, "0")} OF {total}
              </span>
            )}
            {badge && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
                {badge}
              </span>
            )}
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-500">
                <Lock size={9} /> {TIER_UPGRADE[tier] ?? tier}
              </span>
            )}
            {status === "completed" && !locked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                <CheckCircle size={10} /> Complete
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
            {title}
          </h1>
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            {h2Count > 0 && (
              <span className="flex items-center gap-1.5">
                <BookOpen size={11} /> {h2Count} section{h2Count !== 1 ? "s" : ""}
              </span>
            )}
            {mins && (
              <span className="flex items-center gap-1.5">
                <Clock size={11} /> {mins} min
              </span>
            )}
            {loadingApi && (
              <span className="text-slate-700">Loading progress…</span>
            )}
          </div>
        </div>

        {/* Complete button — shown when not locked and API has resolved */}
        {!locked && !loadingApi && status !== "completed" && session?.user?.accessToken && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="shrink-0 inline-flex items-center gap-2 self-start rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-40"
          >
            <CheckCircle size={15} />
            {completing ? "Saving…" : "Mark Complete"}
          </button>
        )}
        {status === "completed" && (
          <div className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-2.5 text-sm text-emerald-400">
            <CheckCircle size={15} /> Training Complete
          </div>
        )}
      </div>

      {/* ── Reading progress bar ──────────────────────────────────────────── */}
      {status === "in_progress" && (
        <div className="mt-4 h-0.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-2/5 rounded-full bg-gold/60 transition-all" />
        </div>
      )}

      {/* ── XP flash ─────────────────────────────────────────────────────── */}
      {justDone && (
        <div className="mt-4 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-gold flex items-center gap-2">
          <Shield size={14} /> +50 XP awarded · Module complete
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {locked ? (
        <LockedState tierRequired={tier} />
      ) : (
        <>
          {/* Main body — rendered from markdown */}
          <div className="mt-8 max-w-2xl">
            {blocks.length > 0 ? (
              blocks.map((block, i) => (
                <RenderBlock key={i} block={block} />
              ))
            ) : (
              // Markdown parsed but no blocks — graceful empty state
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-10 text-center">
                <BookOpen size={20} className="text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Module content is being prepared.</p>
                <p className="mt-1 text-xs text-slate-700">Check back soon — this content is actively being developed.</p>
              </div>
            )}
          </div>

          {/* ── Bottom navigation ──────────────────────────────────────────── */}
          <div className="mt-10 border-t border-slate-800 pt-8 max-w-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Complete CTA — bottom of content */}
              {!loadingApi && status !== "completed" && session?.user?.accessToken ? (
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-40"
                >
                  <CheckCircle size={16} />
                  {completing ? "Saving…" : "Mark Module Complete"}
                </button>
              ) : status === "completed" ? (
                <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <CheckCircle size={16} /> Training Complete
                </div>
              ) : (
                <div /> /* placeholder to maintain flex layout */
              )}

              {nextModule && (
                <Link
                  href={`/dashboard/academy/${nextModule.slug}`}
                  className="inline-flex items-center gap-3 rounded-xl border border-slate-700 px-5 py-3 text-sm hover:border-slate-600 transition-colors"
                >
                  <div className="text-left">
                    <span className="block text-xs text-slate-600">Next Module</span>
                    <span className="font-medium text-slate-200">{nextModule.title}</span>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-500" />
                </Link>
              )}
            </div>

            {/* Prev / Next bar */}
            {(prevModule || nextModule) && (
              <div className="mt-4 flex items-center justify-between">
                {prevModule ? (
                  <Link
                    href={`/dashboard/academy/${prevModule.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <ChevronLeft size={12} /> {prevModule.title}
                  </Link>
                ) : <div />}
                <Link href="/dashboard/academy" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  All modules
                </Link>
              </div>
            )}

            {/* Educational disclaimer + audit nudge */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                <Shield size={12} className="text-gold shrink-0" />
                <p className="text-xs text-slate-500">
                  Run a{" "}
                  <Link href="/dashboard/audit/start" className="text-gold hover:underline">
                    Credit Audit
                  </Link>
                  {" "}to identify which modules are highest priority for your specific credit profile.
                </p>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                All content is for educational purposes only and does not constitute legal or financial advice.
                Plutus Counsel AI can make mistakes — review all AI-generated output before acting.
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
