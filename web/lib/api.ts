/**
 * All API calls must hit NEXT_PUBLIC_API_URL — never localhost.
 * Client components pass the token from useSession().
 * Server components pass the token from getServerSession().
 */
const BASE = process.env.NEXT_PUBLIC_API_URL!;

// Default timeout for API calls (30 seconds). Prevents silent hangs.
const DEFAULT_TIMEOUT_MS = 30_000;

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      cache: "no-store",
    });

    // Session expiry — dispatch event so Providers can trigger logout.
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("guilded:session-expired"));
    }

    return response;
  } catch (err: unknown) {
    // Convert AbortError to a friendlier timeout error
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request to ${path} timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (name: string, email: string, password: string, invite_code?: string) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, ...(invite_code ? { invite_code } : {}) }),
    }),

  me: (token: string) => apiFetch("/api/auth/me", {}, token),

  forgotPassword: (email: string) =>
    apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  resetPassword: (token: string, new_password: string) =>
    apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password }) }),
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
  subscriptionCheckout: (tier: string, token: string, promo_code?: string) =>
    apiFetch(
      "/api/stripe/checkout",
      { method: "POST", body: JSON.stringify({ tier, promo_code: promo_code || null }) },
      token
    ),

  foundersPassCheckout: (pass_type: string, token: string, promo_code?: string) =>
    apiFetch(
      "/api/stripe/founders-pass/checkout",
      { method: "POST", body: JSON.stringify({ pass_type, promo_code: promo_code || null }) },
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

// ── Feedback ──────────────────────────────────────────────────────────────────

export const feedbackApi = {
  submit: (
    body: { page: string; rating: number; notes?: string; context?: Record<string, unknown> },
    token: string,
  ) => apiFetch("/api/feedback", { method: "POST", body: JSON.stringify(body) }, token),
};

export const disputeApi = {
  list: (token: string) => apiFetch("/api/dispute/", {}, token),

  generate: (
    body: {
      audit_id:           string;
      recommendation_ids: string[];
      strategy:           string;
      context_flags?:     string[];
      context_notes?:     string;
      bureau_targets?:    string[];
    },
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

  updateAccount: (
    auditId:   string,
    accountId: string,
    body:      { creditor_name?: string; account_type?: string; account_number?: string; balance?: number; status?: string },
    token:     string,
  ) => apiFetch(`/api/audit/${auditId}/accounts/${accountId}`, { method: "PATCH", body: JSON.stringify(body) }, token),
};
