/**
 * All API calls must hit NEXT_PUBLIC_API_URL — never localhost.
 * Client components pass the token from useSession().
 * Server components pass the token from getServerSession().
 */
const BASE = process.env.NEXT_PUBLIC_API_URL!;

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<Response> {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  // Session expiry — dispatch event so Providers can trigger logout.
  // Guard is client-only; server components handle 401 via redirect() in page code.
  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("guilded:session-expired"));
  }

  return response;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (name: string, email: string, password: string) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  me: (token: string) => apiFetch("/api/auth/me", {}, token),
};

// ── AI ────────────────────────────────────────────────────────────────────────

export const aiApi = {
  query: (prompt: string, token: string) =>
    apiFetch("/api/ai", { method: "POST", body: JSON.stringify({ prompt }) }, token),
};

// ── Modules ───────────────────────────────────────────────────────────────────

export const modulesApi = {
  list: (token: string) => apiFetch("/api/modules", {}, token),
};

// ── Lessons ───────────────────────────────────────────────────────────────────

export const lessonsApi = {
  get: (id: string, token: string) => apiFetch(`/api/lessons/${id}`, {}, token),
};

// ── Progress ──────────────────────────────────────────────────────────────────

export const progressApi = {
  mark: (lesson_id: string, token: string) =>
    apiFetch("/api/progress", { method: "POST", body: JSON.stringify({ lesson_id }) }, token),
};

// ── Consultations ─────────────────────────────────────────────────────────────

export const consultationsApi = {
  eligibility: (token: string) => apiFetch("/api/consultations/eligibility", {}, token),
  checkout:    (token: string, scheduled_date?: string) =>
    apiFetch(
      "/api/consultations/checkout",
      { method: "POST", body: JSON.stringify({ scheduled_date }) },
      token
    ),
};

// ── Stripe ────────────────────────────────────────────────────────────────────

export const stripeApi = {
  subscriptionCheckout: (tier: string, token: string) =>
    apiFetch(
      "/api/stripe/checkout",
      { method: "POST", body: JSON.stringify({ tier }) },
      token
    ),
};

// ── Loot Ledger ───────────────────────────────────────────────────────────────

export const ledgerApi = {
  listAccounts:  (token: string) => apiFetch("/api/ledger/accounts", {}, token),
  createAccount: (token: string, body: { name: string; account_type: string; balance_cents: number }) =>
    apiFetch("/api/ledger/accounts", { method: "POST", body: JSON.stringify(body) }, token),
  deleteAccount: (token: string, id: string) =>
    apiFetch(`/api/ledger/accounts/${id}`, { method: "DELETE" }, token),

  listTransactions:  (token: string, account_id: string) =>
    apiFetch(`/api/ledger/transactions?account_id=${account_id}`, {}, token),
  createTransaction: (
    token: string,
    body: { account_id: string; description: string; amount_cents: number; category: string; transacted_at: string }
  ) =>
    apiFetch("/api/ledger/transactions", { method: "POST", body: JSON.stringify(body) }, token),
  deleteTransaction: (token: string, id: string) =>
    apiFetch(`/api/ledger/transactions/${id}`, { method: "DELETE" }, token),

  summary: (token: string) => apiFetch("/api/ledger/summary", {}, token),
};

// ── Bankruptcy ────────────────────────────────────────────────────────────────

export const bankruptcyApi = {
  info:       (token: string) => apiFetch("/api/bankruptcy/info", {}, token),
  getCase:    (token: string) => apiFetch("/api/bankruptcy/case", {}, token),
  createCase: (token: string, body: { chapter_type: string; notes?: string }) =>
    apiFetch("/api/bankruptcy/case", { method: "POST", body: JSON.stringify(body) }, token),
  updateCase: (token: string, body: { chapter_type?: string; status?: string; notes?: string }) =>
    apiFetch("/api/bankruptcy/case", { method: "PUT", body: JSON.stringify(body) }, token),
  deleteCase: (token: string) =>
    apiFetch("/api/bankruptcy/case", { method: "DELETE" }, token),
  completeStep:   (token: string, step_key: string) =>
    apiFetch(`/api/bankruptcy/case/steps/${step_key}/complete`, { method: "POST" }, token),
  uncompleteStep: (token: string, step_key: string) =>
    apiFetch(`/api/bankruptcy/case/steps/${step_key}/complete`, { method: "DELETE" }, token),
};

// ── Academy ───────────────────────────────────────────────────────────────────

export const academyApi = {
  modules:        (token: string) => apiFetch("/api/academy/modules", {}, token),
  progress:       (token: string) => apiFetch("/api/academy/progress", {}, token),
  recommended:    (auditId: string, token: string) =>
    apiFetch(`/api/academy/recommended/${auditId}`, {}, token),
  startModule:    (moduleId: string, token: string) =>
    apiFetch(`/api/academy/progress/${moduleId}/start`,    { method: "POST" }, token),
  completeModule: (moduleId: string, token: string) =>
    apiFetch(`/api/academy/progress/${moduleId}/complete`, { method: "POST" }, token),

  // XP & progression
  xpSummary: (token: string) =>
    apiFetch("/api/academy/xp/summary", {}, token),
  awardXP: (
    body: { event_type: string; reference?: string },
    token: string,
  ) => apiFetch("/api/academy/xp/award", { method: "POST", body: JSON.stringify(body) }, token),
};

// ── Dispute ───────────────────────────────────────────────────────────────────

export const disputeApi = {
  generate: (
    body: { audit_id: string; recommendation_ids: string[]; strategy: string },
    token: string,
  ) => apiFetch("/api/dispute/generate", { method: "POST", body: JSON.stringify(body) }, token),

  get: (draftId: string, token: string) =>
    apiFetch(`/api/dispute/${draftId}`, {}, token),
};

// ── Audit ─────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

export const auditApi = {
  upload: (file: File, token: string) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE_URL}/api/audit/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
      cache: "no-store",
    });
  },

  verify: (auditId: string, verifiedIds: string[], token: string) =>
    apiFetch(
      `/api/audit/${auditId}/verify`,
      { method: "POST", body: JSON.stringify({ verified_account_ids: verifiedIds }) },
      token,
    ),

  run: (auditId: string, token: string) =>
    apiFetch(`/api/audit/${auditId}/run`, { method: "POST" }, token),

  accounts: (auditId: string, token: string) =>
    apiFetch(`/api/audit/${auditId}/accounts`, {}, token),

  results: (auditId: string, token: string) =>
    apiFetch(`/api/audit/${auditId}/results`, {}, token),

  list: (token: string) =>
    apiFetch("/api/audit/", {}, token),
};
