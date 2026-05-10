"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Shield, X, Send, Minimize2, Maximize2, Trash2, Lock,
} from "lucide-react";
import { aiApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { AiResponse } from "@/components/ai/AiResponse";
import { useCounsel, type CounselMessage } from "./CounselProvider";

// ── Context-aware prompt suggestions ─────────────────────────────────────────

type QuickAction = { label: string; prompt: string };

const ROUTE_ACTIONS: { pattern: string; actions: QuickAction[] }[] = [
  {
    pattern: "/dashboard/audit",
    actions: [
      { label: "Dispute Strategy",   prompt: "What's the most effective dispute strategy for negative items on my credit report?" },
      { label: "Collections Plan",   prompt: "How do I handle collection accounts using my FDCPA rights? Give me a step-by-step plan." },
      { label: "Score Impact",       prompt: "Which issues on my audit have the biggest negative impact on my score, and what should I address first?" },
    ],
  },
  {
    pattern: "/dashboard/academy",
    actions: [
      { label: "Explain This",       prompt: "Explain the key concepts from this training section in simple, actionable terms." },
      { label: "Action Checklist",   prompt: "Based on this training module, give me a concrete step-by-step action checklist I can start today." },
      { label: "My Situation",       prompt: "How do I apply what I'm learning here to my specific credit recovery situation?" },
    ],
  },
  {
    pattern: "/dashboard/command-center",
    actions: [
      { label: "Priority Actions",   prompt: "What are my three highest-priority credit recovery actions right now?" },
      { label: "Rank Explanation",   prompt: "Explain my current Guild rank and what I need to do to advance." },
      { label: "Recovery Timeline",  prompt: "How long does credit recovery typically take and what milestones should I expect?" },
    ],
  },
];

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: "Recovery Plan",     prompt: "Build me a personalized credit recovery plan based on common credit issues." },
  { label: "Dispute Help",      prompt: "How do I dispute inaccurate or outdated information on my credit report?" },
  { label: "Collections",       prompt: "What is the best strategy for dealing with collection accounts on my credit report?" },
  { label: "Utilization",       prompt: "What's the fastest way to reduce my credit utilization and boost my score?" },
  { label: "Goodwill Letter",   prompt: "Help me write a goodwill adjustment letter to remove a late payment." },
];

function getContextActions(pathname: string): QuickAction[] {
  for (const { pattern, actions } of ROUTE_ACTIONS) {
    if (pathname.startsWith(pattern)) return actions;
  }
  return DEFAULT_ACTIONS;
}

function getContextHint(pathname: string): string | null {
  if (pathname.startsWith("/dashboard/audit") && pathname.includes("results")) {
    return "I can see you're reviewing audit findings. Need a dispute strategy or guidance on any specific issue?";
  }
  if (pathname.startsWith("/dashboard/academy/") && pathname.length > 22) {
    return "Studying a training module? I can explain concepts, provide checklists, or connect this to your specific situation.";
  }
  if (pathname === "/dashboard" || pathname === "/dashboard/command-center") {
    return "Ready to plan your next recovery move. Ask me anything about your credit strategy.";
  }
  return null;
}

// ── Drawer content (shared between desktop + mobile) ─────────────────────────

function DrawerContent({ onClose }: { onClose: () => void }) {
  const { state, addMessage, setLoading, clearMessages } = useCounsel();
  const { data: session } = useGuildedSession();
  const pathname           = usePathname();

  const [input,     setInput]     = useState("");
  const [minimized, setMinimized] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  const contextActions = getContextActions(pathname);
  const contextHint    = getContextHint(pathname);
  const isEmptyChat    = state.messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.loading]);

  const sendPrompt = async (promptText: string) => {
    const token = session?.user?.accessToken;
    if (!promptText.trim() || state.loading || !token) return;

    setError(null);
    setInput("");
    addMessage({ role: "user", content: promptText });
    setLoading(true);

    try {
      const res  = await aiApi.query(promptText, token);
      const data = await res.json();

      if (!res.ok) {
        const detail = data.detail;
        if (typeof detail === "object" && detail.upgradeRequired) {
          addMessage({ role: "counsel", content: "You've reached your AI usage limit for this period. Advance your rank to continue." });
        } else {
          setError(typeof detail === "string" ? detail : "Request failed. Please try again.");
        }
        return;
      }

      addMessage({ role: "counsel", content: data.response });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendPrompt(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(input);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <Shield size={14} className="text-gold shrink-0" />
        <span className="flex-1 text-sm font-semibold text-slate-200">Guild Counsel</span>

        {/* Protected indicator */}
        <span className="hidden sm:flex items-center gap-1 text-xs text-slate-600 mr-2">
          <Lock size={9} /> Protected
        </span>

        <button
          onClick={() => setMinimized((v) => !v)}
          className="rounded p-1 text-slate-600 hover:text-slate-300 transition-colors"
          aria-label={minimized ? "Expand" : "Minimize"}
        >
          {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
        </button>
        <button
          onClick={() => { clearMessages(); }}
          className="rounded p-1 text-slate-600 hover:text-slate-300 transition-colors"
          aria-label="Clear conversation"
          title="Clear conversation"
        >
          <Trash2 size={13} />
        </button>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-600 hover:text-slate-300 transition-colors"
          aria-label="Close Counsel"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Minimized state ─────────────────────────────────────────── */}
      {minimized ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <button
            onClick={() => setMinimized(false)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Click to expand conversation
          </button>
        </div>
      ) : (
        <>
          {/* ── Messages area ─────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
            {isEmptyChat ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                <div className="h-10 w-10 rounded-xl border border-gold/30 bg-gold/10 flex items-center justify-center mb-3">
                  <Shield size={18} className="text-gold" />
                </div>
                <p className="text-sm font-medium text-slate-300">Guild Counsel</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-[220px]">
                  Your tactical financial recovery advisor. Ask anything about credit strategy.
                </p>
                {contextHint && (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2.5 text-xs text-slate-400 text-left max-w-[240px]">
                    <p className="font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Shield size={10} className="text-gold" /> Context
                    </p>
                    {contextHint}
                  </div>
                )}
              </div>
            ) : (
              /* Message list */
              <>
                {state.messages.map((msg: CounselMessage) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {msg.role === "counsel" && (
                      <div className="h-6 w-6 rounded-lg border border-gold/30 bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Shield size={11} className="text-gold" />
                      </div>
                    )}
                    <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-slate-700 text-slate-100 rounded-tr-sm"
                        : "bg-slate-800 border border-slate-700/60 text-slate-300 rounded-tl-sm"
                    }`}>
                      {msg.role === "counsel"
                        ? <AiResponse text={msg.content} />
                        : msg.content
                      }
                    </div>
                  </div>
                ))}

                {state.loading && (
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-lg border border-gold/30 bg-gold/10 flex items-center justify-center shrink-0">
                      <Shield size={11} className="text-gold" />
                    </div>
                    <div className="rounded-xl rounded-tl-sm bg-slate-800 border border-slate-700/60 px-3 py-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1 w-1 rounded-full bg-slate-600 animate-pulse"
                            style={{ animationDelay: `${i * 200}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* ── Error ──────────────────────────────────────────────── */}
          {error && (
            <div className="mx-3 mb-2 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* ── Quick actions ───────────────────────────────────────── */}
          <div className="border-t border-slate-800 px-3 py-2">
            <div className="flex flex-wrap gap-1.5">
              {contextActions.slice(0, 4).map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendPrompt(action.prompt)}
                  disabled={state.loading}
                  className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors disabled:opacity-40"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Input ──────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="border-t border-slate-800 px-3 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 focus-within:border-slate-600">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Guild Counsel…"
                disabled={state.loading}
                rows={1}
                className="flex-1 resize-none bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none disabled:opacity-40"
                style={{ maxHeight: "80px", overflowY: "auto" }}
              />
              <button
                type="submit"
                disabled={!input.trim() || state.loading}
                className="h-6 w-6 shrink-0 flex items-center justify-center rounded-lg bg-gold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-30"
              >
                <Send size={11} />
              </button>
            </div>
            <p className="mt-1.5 text-center text-xs text-slate-700">
              Educational guidance · Not legal advice
            </p>
          </form>
        </>
      )}
    </div>
  );
}

// ── Desktop drawer ────────────────────────────────────────────────────────────

export function DesktopCounselDrawer() {
  const { state, close } = useCounsel();

  return (
    <aside
      className={`
        hidden md:flex flex-col shrink-0 border-l border-slate-800
        transition-all duration-300 overflow-hidden
        ${state.isOpen ? "w-80" : "w-0 border-l-transparent"}
      `}
      aria-hidden={!state.isOpen}
    >
      {/* Always mounted — preserves conversation state across routes */}
      <div className="flex h-full w-80 flex-col">
        <DrawerContent onClose={close} />
      </div>
    </aside>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────

export function MobileCounselDrawer() {
  const { state, close } = useCounsel();

  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={close}
      />
      {/* Sheet */}
      <div
        className="absolute inset-x-0 bottom-0 flex h-[75vh] flex-col rounded-t-2xl border-t border-slate-800 bg-slate-900 shadow-2xl"
        style={{ animation: "slideUp 220ms ease-out" }}
      >
        <DrawerContent onClose={close} />
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Floating trigger button ───────────────────────────────────────────────────

export function CounselTriggerButton() {
  const { state, toggle } = useCounsel();

  return (
    <button
      onClick={toggle}
      aria-label="Open Guild Counsel"
      className={`
        fixed bottom-5 right-5 z-40 flex items-center gap-2
        rounded-2xl border border-gold/30 bg-slate-900
        px-4 py-2.5 text-xs font-semibold text-gold
        shadow-xl transition-all duration-200
        hover:border-gold/60 hover:bg-slate-800
        ${state.isOpen
          ? "opacity-0 pointer-events-none scale-90"
          : "opacity-100 scale-100"
        }
      `}
    >
      <Shield size={13} />
      Guild Counsel
    </button>
  );
}
