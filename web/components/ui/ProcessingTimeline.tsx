"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

export type TimelineStage = {
  id:      string;
  label:   string;
  detail?: string;
};

type Props = {
  stages:      TimelineStage[];
  /** Starts the auto-advance timer. */
  active:      boolean;
  /** Triggers fast-forward through any remaining stages. */
  completed?:  boolean;
  /** Milliseconds between stage advances during normal progression. */
  intervalMs?: number;
  title?:      string;
  subtitle?:   string;
};

/**
 * Vertical processing timeline for AI pipeline steps.
 *
 * Stages advance automatically while `active=true`.
 * Setting `completed=true` fast-forwards any remaining stages (80ms each)
 * to give a satisfying "all done" moment before the parent navigates away.
 */
export function ProcessingTimeline({
  stages,
  active,
  completed = false,
  intervalMs = 2800,
  title,
  subtitle,
}: Props) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  // Normal auto-advance while active and not yet completed.
  useEffect(() => {
    if (!active || completed) return;
    stop();
    timer.current = setInterval(() => {
      setIdx((p) => Math.min(p + 1, stages.length - 1));
    }, intervalMs);
    return stop;
  }, [active, completed, stages.length, intervalMs]);

  // Fast-forward remaining stages when completed.
  useEffect(() => {
    if (!completed) return;
    stop();
    timer.current = setInterval(() => {
      setIdx((p) => {
        const next = p + 1;
        if (next >= stages.length) { stop(); return stages.length; }
        return next;
      });
    }, 80);
    return stop;
  // idx intentionally excluded — we only want this to run when completed flips
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, stages.length]);

  return (
    <div className="w-full max-w-sm">
      {(title || subtitle) && (
        <div className="mb-8 text-center">
          {title && (
            <p className="text-base font-semibold tracking-tight text-slate-100">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      )}

      <div>
        {stages.map((stage, i) => {
          const done    = i < idx;
          const current = i === idx && active && !completed;
          const pending = !done && !current;

          return (
            <div key={stage.id} className="flex gap-4">
              {/* ── Indicator column ──────────────────────────────── */}
              <div className="flex flex-col items-center">
                {/* Stage dot */}
                <div className="relative h-6 w-6 shrink-0">
                  {/* Ping ring — only on active stage */}
                  {current && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-gold/25" />
                  )}
                  {/* Circle */}
                  <div className={[
                    "absolute inset-0 flex items-center justify-center rounded-full border-2",
                    "transition-colors duration-500",
                    done    ? "border-emerald-500 bg-emerald-500/10" : "",
                    current ? "border-gold bg-gold/10"               : "",
                    pending ? "border-slate-700 bg-transparent"      : "",
                  ].join(" ")}>
                    {done    && (
                      <Check size={11} className="text-emerald-400" strokeWidth={2.5} />
                    )}
                    {current && (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
                    )}
                    {pending && (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                    )}
                  </div>
                </div>

                {/* Connector line between stages */}
                {i < stages.length - 1 && (
                  <div
                    className={[
                      "mt-1 w-px flex-1 transition-colors duration-700",
                      done ? "bg-emerald-500/30" : "bg-slate-800",
                    ].join(" ")}
                    style={{ minHeight: "1.5rem" }}
                  />
                )}
              </div>

              {/* ── Text column ───────────────────────────────────── */}
              <div className={`min-w-0 flex-1 pt-0.5 ${i < stages.length - 1 ? "pb-5" : "pb-0"}`}>
                <p className={[
                  "text-sm font-medium leading-snug transition-colors duration-500",
                  done    ? "text-slate-500" : "",
                  current ? "text-slate-100" : "",
                  pending ? "text-slate-600" : "",
                ].join(" ")}>
                  {stage.label}
                </p>
                {current && stage.detail && (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {stage.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
