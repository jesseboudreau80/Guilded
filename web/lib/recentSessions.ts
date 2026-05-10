const KEY = "guilded:recent_sessions";

export type RecentSession = { prompt: string; timestamp: number };

export function getRecentSessions(): RecentSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentSession[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSession(prompt: string): void {
  const existing = getRecentSessions();
  const updated = [
    { prompt: prompt.trim(), timestamp: Date.now() },
    ...existing.filter((s) => s.prompt !== prompt.trim()),
  ].slice(0, 3);
  localStorage.setItem(KEY, JSON.stringify(updated));
}
