# Guilded — Production Deployment Guide

**Stack:** FastAPI (port 8100) + Next.js (port 3000) + PostgreSQL + Cloudflare Tunnel (reselleros)  
**Process management:** `start.sh` / `stop.sh` (PID files)

---

## Required Environment Variables

All variables go in `/home/jesse/infra/apps/Guilded/.env`

```bash
# ── Database ────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql+asyncpg://guilded:guilded@localhost:5432/guilded"

# ── Auth ────────────────────────────────────────────────────────────────────
SECRET_KEY="<run: openssl rand -hex 32>"        # FastAPI JWT signing key
NEXTAUTH_SECRET="<run: openssl rand -base64 32>" # NextAuth signing key
NEXTAUTH_URL="https://guilded.jesseboudreau.com"
NEXT_PUBLIC_API_URL="https://guilded.jesseboudreau.com"

# ── Stripe (use LIVE keys for production) ───────────────────────────────────
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_JOURNEYMAN_PRICE_ID="price_..."
STRIPE_MASTER_PRICE_ID="price_..."

# ── OpenAI ──────────────────────────────────────────────────────────────────
OPENAI_API_KEY="sk-..."

# ── Email ───────────────────────────────────────────────────────────────────
RESEND_API_KEY="re_..."
EMAIL_FROM="Guilded <guilded@mail.jesseboudreau.com>"

# ── Beta Access ─────────────────────────────────────────────────────────────
BETA_INVITE_REQUIRED=true
NEXT_PUBLIC_BETA_INVITE_REQUIRED=true
```

---

## Startup Sequence

```bash
cd /home/jesse/infra/apps/Guilded
./start.sh          # starts API + builds Next.js + starts Cloudflare tunnel

# Verify startup
tail -f .logs/api.log   # FastAPI startup log
tail -f .logs/web.log   # Next.js build log
```

**Expected startup log output:**
```
✅ Database tables verified/created
✅ Column migrations applied
✅ Academy curriculum seeded (or: already seeded)
✅ Email provider: Resend (from=Guilded <guilded@mail.jesseboudreau.com>)
ℹ️  CORS allowed origins: ['https://guilded.jesseboudreau.com']
```

---

## Deployment Checklist

### Before every deployment
- [ ] Run `npm run build` in `/web` — must pass with 0 errors
- [ ] Run `python -m py_compile app/main.py` in `/api`
- [ ] Check `.env` has all required vars (no defaults)
- [ ] Test one full audit cycle if any audit code changed

### After deployment
- [ ] Verify `/health` returns `{"status": "ok"}`
- [ ] Verify landing page loads (check SSL)
- [ ] Verify registration with invite code works
- [ ] Check admin panel for any errors in recent activity

---

## Database

### Backups
```bash
# Manual backup
pg_dump -U guilded guilded > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore
psql -U guilded guilded < backup-YYYYMMDD-HHMMSS.sql
```

### Safe migrations
Column additions run automatically at startup via `ALTER TABLE IF NOT EXISTS` in `main.py`.  
For destructive changes (DROP, RENAME): manually apply before deploying, then deploy.

---

## Stripe Webhook Setup

1. In Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://guilded.jesseboudreau.com/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET`

### Test webhooks locally
```bash
stripe listen --forward-to localhost:8100/api/stripe/webhook
```

---

## Monitoring

### Log locations
```
.logs/api.log           # FastAPI logs
.logs/web-build.log     # Next.js build output
```

### Health checks
```bash
# API health
curl https://guilded.jesseboudreau.com/api/health

# Check admin stats
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://guilded.jesseboudreau.com/api/admin/stats
```

### Signs of trouble
- API log shows `CRITICAL Cannot reach database` → PostgreSQL down
- Audit completions drop → OpenAI API key issue or rate limit
- Stripe events not processing → webhook secret mismatch
- Emails not sending → check RESEND_API_KEY and `POST /api/admin/test-email`

---

## Rollback Procedure

```bash
# Stop services
./stop.sh

# Revert to previous commit
git stash          # or: git checkout <previous-commit>

# Restart
./start.sh
```

For database changes: restore from backup before reverting application code.

---

## Cloudflare Tunnel

```bash
# Check tunnel status
cloudflared tunnel list

# Restart tunnel (if needed)
cloudflared tunnel run reselleros
```

The tunnel config in `.cloudflared/config.yml` routes:
- `guilded.jesseboudreau.com` → `localhost:3000` (Next.js)
- `guilded.jesseboudreau.com/api/*` → `localhost:8100` (FastAPI)

---

## Cost Monitoring

Monthly cost estimate at 25 beta users:
- OpenAI (audits + AI counsel): ~$2–5/month
- Resend (emails): Free tier (< 3000/month)
- Stripe: 2.9% + $0.30 per transaction only

Monitor OpenAI usage at: platform.openai.com/usage  
Monitor actual costs at: `/api/admin/costs`
