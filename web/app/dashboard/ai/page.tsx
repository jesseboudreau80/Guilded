"use client";

import {
  FormEvent, useCallback, useEffect, useRef, useState,
} from "react";
import { Shield, Send, Zap, ChevronDown } from "lucide-react";
import { aiApi, authApi } from "@/lib/api";
import { useGuildedSession } from "@/lib/session";
import { AiResponse } from "@/components/ai/AiResponse";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { AI_LIMITS, AI_PERIOD, type Tier } from "@/lib/tiers";

type UserData = { tier: Tier; ai_usage_count: number };

type Message = {
  id:      number;
  role:    "user" | "counsel";
  content: string;
};

const PROMPT_CHIPS = [
  "How do I dispute a collection account?",
  "What is the best strategy for high credit utilization?",
  "How do I write a goodwill letter?",
  "What should I do about a charge-off?",
  "How does the arbitration process work?",
  "How long do negative items stay on my report?",
];

const TIER_LABELS: Record<string, string> = {
  APPRENTICE: "Apprentice",
  JOURNEYMAN: "Journeyman",
  MASTER:     "Master",
  HERO:       "Hero",
};

export default function AiPage() {
  const { data: session } = useGuildedSession();

  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [user,         setUser]         = useState<UserData | null>(null);
  const [showUpgrade,  setShowUpgrade]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [msgId,        setMsgId]        = useState(0);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  const loadUser = useCallback((token: string) => {
    authApi.me(token)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setUser(data); });
  }, []);

  useEffect(() => {
    if (session?.user?.accessToken) loadUser(session.user.accessToken);
  }, [session?.user?.accessToken, loadUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const limit  = user ? (AI_LIMITS[user.tier] ?? 0) : null;
  const period = user ? AI_PERIOD[user.tier] : "monthly";
  const used   = user?.ai_usage_count ?? 0;
  const atLimit = limit !== null && limit > 0 && used >= limit;

  const addMessage = (role: Message["role"], content: string) => {
    setMsgId((prev) => {
      const id = prev + 1;
      setMessages((msgs) => [...msgs, { id, role, content }]);
      return id;
    });
  };

  const handleSubmit = async (e?: FormEvent, overridePrompt?: string) => {
    e?.preventDefault();
    const promptText = (overridePrompt ?? input).trim();
    if (!promptText || promptText.length < 4) return;
    if (!session?.user?.accessToken) return;
    if (atLimit) { setShowUpgrade(true); return; }

    setInput("");
    setError(null);
    addMessage("user", promptText);
    setLoading(true);

    try {
      const res  = await aiApi.query(promptText, session.user.accessToken);
      const data = await res.json();

      if (!res.ok) {
        const detail = data.detail;
        if (typeof detail === "object" && detail.upgradeRequired) {
          setShowUpgrade(true);
        } else {
          setError(typeof detail === "string" ? detail : "Request failed. Try again.");
        }
        return;
      }

      addMessage("counsel", data.response);
      loadUser(session.user.accessToken);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmptyState = messages.length === 0;

  return (
    <section className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Shield size={18} className="text-gold shrink-0" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Guild Counsel</h1>
            <p className="text-xs text-slate-500">Structured credit strategy guidance</p>
          </div>
        </div>

        {/* Usage indicator */}
        {limit !== null && limit > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <div className={`flex items-center gap-1 rounded-full border px-2.5 py-1 ${
              atLimit
                ? "border-red-500/30 bg-red-900/20 text-red-400"
                : used / limit >= 0.8
                ? "border-amber-500/30 bg-amber-900/20 text-amber-400"
                : "border-slate-700 bg-slate-800/60 text-slate-400"
            }`}>
              <Zap size={10} />
              <span>{used}/{limit} {period}</span>
            </div>
            {user?.tier && (
              <span className="text-slate-600">{TIER_LABELS[user.tier]}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Chat area ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 min-h-0">
        {isEmptyState ? (
          /* Welcome state */
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
            <div className="h-12 w-12 rounded-2xl border border-gold/30 bg-gold/10 flex items-center justify-center mb-4">
              <Shield size={22} className="text-gold" />
            </div>
            <h2 className="text-base font-semibold text-slate-200">Guild Counsel is ready</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-sm leading-relaxed">
              Ask any credit strategy question. Receive structured, tactically-sound guidance aligned with federal consumer protection law.
            </p>
            <p className="mt-3 text-xs text-slate-600">
              Educational guidance only — not legal or financial advice.
            </p>

            {/* Prompt chips */}
            <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg">
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSubmit(undefined, chip)}
                  disabled={atLimit}
                  className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 disabled:opacity-40"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="space-y-6 max-w-2xl">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                {msg.role === "counsel" && (
                  <div className="h-7 w-7 shrink-0 rounded-lg border border-gold/30 bg-gold/10 flex items-center justify-center mt-0.5">
                    <Shield size={13} className="text-gold" />
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-slate-700 text-slate-100 rounded-tr-sm"
                    : "bg-slate-800/60 border border-slate-800 rounded-tl-sm"
                }`}>
                  {msg.role === "counsel" ? (
                    <AiResponse text={msg.content} />
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="h-7 w-7 shrink-0 rounded-lg border border-gold/30 bg-gold/10 flex items-center justify-center mt-0.5">
                  <Shield size={13} className="text-gold" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-slate-800/60 border border-slate-800 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-slate-600 animate-pulse"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-auto max-w-2xl mb-3 rounded-xl bg-red-900/30 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── At limit warning ───────────────────────────────────────────── */}
      {atLimit && (
        <div className="mx-auto max-w-2xl mb-3 rounded-xl border border-amber-500/20 bg-amber-900/20 px-4 py-2.5 text-sm text-amber-400">
          You&apos;ve reached your {period} AI limit. Advance your rank to continue.{" "}
          <button onClick={() => setShowUpgrade(true)} className="font-semibold underline">
            Upgrade
          </button>
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="border-t border-slate-800 pt-4">
        <div className="flex items-end gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 focus-within:border-slate-600">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={atLimit ? "Upgrade to continue…" : "Ask Guild Counsel a question…"}
            disabled={atLimit || loading}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none disabled:opacity-40"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || atLimit}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-30"
            aria-label="Send"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-700">
          Guild Counsel · Educational guidance only · Not legal or financial advice
        </p>
      </form>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentTier={user?.tier}
      />
    </section>
  );
}
