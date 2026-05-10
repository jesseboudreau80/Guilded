---
name: Guilded Jesse Stack Architecture
description: Guilded is a FastAPI+Next.js SaaS on the Jesse Stack — api/ on port 8100, web/ on port 3000, reselleros named tunnel
type: project
---

Guilded has been migrated to the Jesse Stack architecture (matching ResellerOS, DevOS, etc.).

**Structure:**
- `api/` — FastAPI backend, port 8100, async SQLAlchemy + asyncpg
- `web/` — Next.js frontend, port 3000, production mode only
- `.env` — root-level shared secrets (api reads via `../env`)
- `start.sh` / `stop.sh` — PID-file based process management
- Cloudflare named tunnel: `reselleros` (cred: 82b66414)
- Tunnel ingress: `guilded.jesseboudreau.com → :3000`, `guilded-api.jesseboudreau.com → :8100`

**Auth flow:** FastAPI issues JWTs → NextAuth CredentialsProvider calls `/api/auth/login` → stores accessToken in session → all API calls send `Authorization: Bearer <token>` → FastAPI `get_current_user` fetches user live from DB (tier never from client)

**Key security:**
- AI rate limit: `SELECT ... FOR UPDATE` row lock in `api/app/domains/ai/service.py`
- Webhook idempotency: `StripeEvent` INSERT + `flush()` inside transaction; `IntegrityError` = already processed
- All tier enforcement in FastAPI `get_current_user` dep (fresh DB read)

**Why:** User standardized all apps to JBFastMVP template. Do not use SQLite, do not use Prisma, do not call localhost from frontend.
