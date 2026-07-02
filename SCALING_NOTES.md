# Guilded — Scaling Architecture Notes

**Current state:** Single-server deployment, ~25 beta users  
**This document:** Identifies bottlenecks before they become problems

---

## Current Architecture

```
Client (Next.js) → Cloudflare Tunnel → FastAPI (port 8100) → PostgreSQL
                                     → OpenAI API
                                     → Resend
                                     → Stripe
```

Everything runs on a single server with process management via `start.sh`.

---

## Bottleneck Analysis

### 🔴 Critical at ~200 users

**1. Synchronous OpenAI calls block FastAPI workers**
- Every audit runs two serial OpenAI calls (OCR extraction + analysis) each taking 15–60 seconds
- FastAPI has a limited worker pool; long-blocking requests consume workers
- **Threshold:** 5+ concurrent audits will cause timeouts for other users
- **Fix:** Move audit processing to an async task queue (Celery + Redis, or FastAPI BackgroundTasks → store progress in DB, poll from client)

**2. Single PostgreSQL connection pool**
- Pool size: 10, max overflow: 20 (configured in `database.py`)
- Under concurrent audit processing with `SELECT FOR UPDATE` on user rows, connection exhaustion is possible
- **Threshold:** ~50 concurrent active sessions
- **Fix:** PgBouncer connection pooler, or Neon/Supabase with built-in pooling

### 🟡 Significant at ~500 users

**3. No PDF storage layer**
- Currently PDFs are processed in-memory and immediately deleted
- Risk: Large PDFs (>10MB) cause memory spikes if many concurrent uploads
- **Threshold:** 20+ concurrent uploads of large PDFs
- **Fix:** Stream upload to temporary disk, process, delete — never load full PDF into memory

**4. In-process TTL cache (Aegis governance)**
- `TTLCache` in `aegis/service.py` is per-worker-process (not shared across multiple workers)
- Under horizontal scaling, each worker independently calls Aegis
- **Fix:** Redis-backed cache shared across workers

**5. AI usage counter race condition (per-user)**
- Current `SELECT FOR UPDATE` on user row prevents concurrent AI requests per user
- This serializes all AI requests from the same user — acceptable at low scale
- **Threshold:** Power users sending many rapid AI queries
- **Fix:** Redis atomic increment instead of DB row lock

### 🟢 Manageable until ~2000 users

**6. Recommendations table full-table-read for tier gating**
- `_build_results_response` reads all recommendations then filters by index
- No index on `(audit_id, severity)` combination
- **Threshold:** Audits with 50+ recommendations at high read rate
- **Fix:** Add composite index `CREATE INDEX ON audit_recommendations (audit_id, severity)`

**7. No audit_thinking_logs cleanup**
- Logs grow unbounded; at 1000+ audits this table becomes large
- **Fix:** Add a cleanup job that purges logs older than 90 days

**8. No analytics data warehouse**
- All analytics calls are fire-and-forget to PostHog
- Admin stats run COUNT(*) queries on live tables
- **Threshold:** 10,000+ rows in audits/disputes slows admin dashboard
- **Fix:** Scheduled materialized view refresh or read replica for analytics

---

## Scaling Roadmap

### Phase A (100–200 users)
1. Move OCR + analysis to async background tasks
2. Add `pg_bouncer` or switch to pooled DB connection
3. Add Redis for Aegis cache + AI usage counters

### Phase B (500–2000 users)
1. Horizontal API scaling (multiple FastAPI instances behind load balancer)
2. Managed PostgreSQL (RDS, Supabase) with automated backups
3. CDN for static Next.js assets
4. Structured logging → centralized log aggregation (Loki, Datadog)

### Phase C (2000+ users)
1. Dedicated OCR microservice (async queue + dedicated GPU/CPU workers)
2. Read replicas for analytics queries
3. Event streaming for analytics (Kafka/Redpanda → data warehouse)
4. Geographic distribution if international users

---

## Storage Growth Estimates

At 100 beta users with 3 audits each:
- `audits` table: ~300 rows
- `audit_accounts`: ~3,000 rows (avg 10 accounts/audit)
- `audit_recommendations`: ~4,500 rows (avg 15 recs/audit)
- `audit_thinking_logs`: ~1,200 rows (avg 4 events/audit)
- `dispute_drafts`: ~150 rows (assume 50% generate disputes)
- `user_feedback`: ~100 rows

**Total: well under 50MB — no storage concern at beta scale**

At 1,000 users with 5 audits each: ~50MB total. Still fine.
At 10,000 users: ~500MB — time to optimize indexes and add archiving.

---

## Cost Scaling

| Users | OpenAI/month | Stripe fees | Total est. |
|---|---|---|---|
| 25 beta | ~$5 | ~$0 (beta) | ~$5 |
| 100 users | ~$25 | ~$50–100 | ~$75–125 |
| 500 users | ~$150 | ~$300–600 | ~$450–750 |
| 1,000 users | ~$350 | ~$700–1400 | ~$1,000–1,750 |

Largest OpenAI cost driver: full audit analysis (~$0.003/audit). At 500 users × 5 audits = 2,500 audits × $0.003 = $7.50 just for audits + AI counsel usage on top.
