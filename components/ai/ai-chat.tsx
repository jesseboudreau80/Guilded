"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bot, Send, User, AlertTriangle } from "lucide-react";
import { Tier } from "@prisma/client";
import { TIER_DISPLAY } from "@/types";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: Date | string;
}

interface AiChatProps {
  initialMessages: Message[];
  usageLimit: number;
  usageCount: number;
  tier: Tier;
}

export function AiChat({
  initialMessages,
  usageLimit,
  usageCount: initialUsageCount,
  tier,
}: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(initialUsageCount);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(
    initialUsageCount >= usageLimit
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading || limitReached) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setLoading(true);

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "user",
        content: userMessage,
        createdAt: new Date(),
      },
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setLimitReached(true);
          setError(data.message ?? "Monthly limit reached.");
        } else {
          setError(data.error ?? "Something went wrong.");
        }
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.message,
          createdAt: new Date(),
        },
      ]);

      setUsageCount(data.usage.used);
      if (data.usage.remaining === 0) setLimitReached(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-surface-border bg-surface-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600/20">
              <Bot className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h1 className="font-semibold text-white">Guilded AI Assistant</h1>
              <p className="text-xs text-gray-500">
                Educational credit literacy support
              </p>
            </div>
          </div>
          <Badge tier={tier}>{TIER_DISPLAY[tier]}</Badge>
        </div>

        {/* Usage bar */}
        <div className="mt-4">
          <ProgressBar
            value={usageCount}
            max={usageLimit}
            showValue
            label="Messages this month"
            variant={usageCount / usageLimit > 0.8 ? "warning" : "brand"}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 mb-4">
              <Bot className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Your AI Credit Literacy Assistant
            </h3>
            <p className="mt-2 max-w-sm text-sm text-gray-400">
              Ask me anything about credit scores, reports, dispute processes,
              or FCRA/FDCPA rights — I&apos;m here to educate.
            </p>
            <div className="mt-4 rounded-lg border border-amber-800/30 bg-amber-900/10 px-4 py-3 max-w-sm">
              <p className="text-xs text-amber-300">
                All responses are for educational purposes only and do not
                constitute legal or financial advice.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" && "flex-row-reverse"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                message.role === "user"
                  ? "bg-brand-600"
                  : "bg-purple-600/30"
              )}
            >
              {message.role === "user" ? (
                <User className="h-4 w-4 text-white" />
              ) : (
                <Bot className="h-4 w-4 text-purple-400" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                message.role === "user"
                  ? "bg-brand-600 text-white rounded-tr-sm"
                  : "bg-surface-card border border-surface-border text-gray-200 rounded-tl-sm"
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600/30">
              <Bot className="h-4 w-4 text-purple-400" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-surface-card border border-surface-border px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-gray-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error / limit message */}
      {(error || limitReached) && (
        <div className="mx-6 mb-2 flex items-start gap-2 rounded-lg border border-amber-800/30 bg-amber-900/10 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {limitReached
              ? `You've reached your monthly limit of ${usageLimit} messages. Upgrade to get more.`
              : error}
          </span>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-surface-border bg-surface-card p-4">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              limitReached
                ? "Upgrade to send more messages..."
                : "Ask about credit scores, disputes, FCRA rights..."
            }
            disabled={limitReached || loading}
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors",
              "focus:border-brand-500 focus:ring-1 focus:ring-brand-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[44px] max-h-32"
            )}
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading || limitReached}
            className="flex-shrink-0 h-11 w-11 p-0 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-gray-600">
          For educational purposes only. Not legal or financial advice.
        </p>
      </div>
    </div>
  );
}
