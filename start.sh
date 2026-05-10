#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  Guilded — Production Stack Launcher
#
#  Starts FastAPI · Next.js (production) · cloudflared named tunnel
#  All processes are disowned — they survive terminal/SSH closure.
#
#  Usage:
#    ./start.sh            start everything (skips frontend build if .next/ exists)
#    ./start.sh --rebuild  force Next.js rebuild before starting
#    ./stop.sh             stop everything
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/api"
WEB_DIR="$ROOT/web"
LOG_DIR="$ROOT/.logs"
PID_FILE="$ROOT/.pids"
ENV_FILE="$ROOT/.env"

API_PORT=8100
WEB_PORT=3000

PUBLIC_API="https://guilded-api.jesseboudreau.com"
PUBLIC_WEB="https://guilded.jesseboudreau.com"

TUNNEL_NAME="reselleros"
TUNNEL_CREDS="$HOME/.cloudflared/82b66414-9142-442e-bded-bb7fc70d7b4c.json"

# ── Colors ────────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'
  GREEN='\033[0;32m'; BLUE='\033[0;34m'
  YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'
else
  BOLD=''; DIM=''; RESET=''; GREEN=''; BLUE=''; YELLOW=''; RED=''; CYAN=''
fi

step() { echo -e "\n${BOLD}${BLUE}▶${RESET}${BOLD} $*${RESET}"; }
ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
info() { echo -e "  ${DIM}→ $*${RESET}"; }
warn() { echo -e "  ${YELLOW}⚠${RESET} $*"; }
die()  { echo -e "\n${RED}✗ ERROR:${RESET} $*\n" >&2; exit 1; }

kill_port() {
  local port="$1"
  local pids
  pids=$(fuser "${port}/tcp" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    info "Cleared port $port"
    sleep 0.3
  fi
}

kill_all_cloudflared() {
  # Only kill user-space tunnel processes for TUNNEL_NAME.
  # Killing the system cloudflared service causes systemd to restart it,
  # which creates a race where it re-appears before our tunnel starts.
  local pids
  pids=$(pgrep -f "cloudflared.*tunnel run ${TUNNEL_NAME}" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs kill 2>/dev/null || true
    sleep 1
    pids=$(pgrep -f "cloudflared.*tunnel run ${TUNNEL_NAME}" 2>/dev/null || true)
    [[ -n "$pids" ]] && echo "$pids" | xargs kill -9 2>/dev/null || true
    info "Killed stale ${TUNNEL_NAME} tunnel processes"
  fi
}

wait_for_http() {
  local url="$1" label="$2" timeout="${3:-30}"
  local i=0
  echo -n "  Waiting for $label"
  while [[ $i -lt $timeout ]]; do
    if curl -sf "$url" -o /dev/null 2>/dev/null; then
      echo -e " ${GREEN}ready${RESET}"
      return 0
    fi
    echo -n "."
    sleep 1
    (( i++ )) || true
  done
  echo
  die "$label did not respond after ${timeout}s\n  Check: tail -f $LOG_DIR/*.log"
}

wait_for_tunnel() {
  local log_file="$1" timeout="${2:-30}"
  local i=0
  echo -n "  Waiting for tunnel"
  while [[ $i -lt $timeout ]]; do
    if grep -q "Registered tunnel connection" "$log_file" 2>/dev/null; then
      echo -e " ${GREEN}connected${RESET}"
      return 0
    fi
    echo -n "."
    sleep 1
    (( i++ )) || true
  done
  echo
  warn "Tunnel not confirmed after ${timeout}s — check: tail -f $log_file"
}

preflight() {
  local fail=0
  for cmd in cloudflared node npm python3 curl fuser; do
    command -v "$cmd" &>/dev/null || { warn "Missing: $cmd"; (( fail++ )) || true; }
  done
  [[ $fail -gt 0 ]] && die "Install missing tools before continuing."

  [[ -f "$ENV_FILE" ]] \
    || die "Missing $ENV_FILE — copy .env.example and fill in values"
  [[ -d "$API_DIR/venv" ]] \
    || die "Python venv missing.\n  Run: cd $API_DIR && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt"
  [[ -f "$API_DIR/venv/bin/uvicorn" ]] \
    || die "uvicorn not in venv.\n  Run: cd $API_DIR && ./venv/bin/pip install -r requirements.txt"
  [[ -d "$WEB_DIR/node_modules" ]] \
    || die "node_modules missing.\n  Run: cd $WEB_DIR && npm install"
  [[ -f "$TUNNEL_CREDS" ]] \
    || die "Tunnel credentials not found: $TUNNEL_CREDS"
}

# ══════════════════════════════════════════════════════════════════════════════

REBUILD=0
[[ "${1:-}" == "--rebuild" ]] && REBUILD=1

echo -e "${BOLD}"
echo "  ╔══════════════════════════════════╗"
echo "  ║       Guilded · Production       ║"
echo "  ╚══════════════════════════════════╝"
echo -e "${RESET}"

preflight
mkdir -p "$LOG_DIR"
> "$PID_FILE"

# ── 1. Kill stale processes ───────────────────────────────────────────────────
step "Clearing stale processes"
kill_all_cloudflared
kill_port "$API_PORT"
kill_port "$WEB_PORT"
ok "Clean slate"

# ── 2. Source root .env and write frontend .env.local ────────────────────────
step "Loading environment"
set -a; source "$ENV_FILE"; set +a
# NEXT_PUBLIC_* vars are baked at build time — write before npm run build.
printf 'NEXT_PUBLIC_API_URL=%s\nNEXTAUTH_URL=%s\nNEXTAUTH_SECRET=%s\n' \
  "$NEXT_PUBLIC_API_URL" "$NEXTAUTH_URL" "$NEXTAUTH_SECRET" \
  > "$WEB_DIR/.env.local"
ok "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# ── 3. Build frontend ─────────────────────────────────────────────────────────
if [[ $REBUILD -eq 1 || ! -d "$WEB_DIR/.next" ]]; then
  step "Building Next.js (production)"
  info "This takes ~30–60s — output → $LOG_DIR/web-build.log"
  cd "$WEB_DIR"
  if ! npm run build >> "$LOG_DIR/web-build.log" 2>&1; then
    die "Next.js build failed.\n  Check: tail -50 $LOG_DIR/web-build.log"
  fi
  ok "Build complete"
else
  step "Skipping build (pass --rebuild to force)"
  info "Using existing $WEB_DIR/.next"
fi

# ── 4. Start FastAPI ──────────────────────────────────────────────────────────
step "Starting FastAPI  (port $API_PORT)"
cd "$API_DIR"
./venv/bin/uvicorn app.main:app \
  --host 127.0.0.1 \
  --port "$API_PORT" \
  >> "$LOG_DIR/api.log" 2>&1 &
API_PID=$!
disown $API_PID
echo "api=$API_PID" >> "$PID_FILE"
info "PID $API_PID → $LOG_DIR/api.log"

wait_for_http "http://127.0.0.1:$API_PORT/health" "API" 30
ok "API healthy"

# ── 5. Start Next.js ──────────────────────────────────────────────────────────
step "Starting Next.js  (port $WEB_PORT, production)"
cd "$WEB_DIR"
# Explicit -H 0.0.0.0 so Cloudflare tunnel can reach the process;
# default next start binds 0.0.0.0 but explicit is safer across Node versions.
./node_modules/.bin/next start -H 0.0.0.0 -p "$WEB_PORT" >> "$LOG_DIR/web.log" 2>&1 &
WEB_LAUNCH_PID=$!
disown $WEB_LAUNCH_PID

wait_for_http "http://127.0.0.1:$WEB_PORT" "frontend" 60

WEB_PID=$(ss -tlnp 2>/dev/null | grep ":${WEB_PORT}" | grep -oP 'pid=\K[0-9]+' | head -1 || echo "")
echo "web=${WEB_PID}" >> "$PID_FILE"
info "PID ${WEB_PID:-unknown} → $LOG_DIR/web.log"
ok "Frontend ready"

# ── 6. Start Cloudflare tunnel ────────────────────────────────────────────────
step "Starting Cloudflare tunnel  ($TUNNEL_NAME)"
TUNNEL_LOG="$LOG_DIR/tunnel.log"
: > "$TUNNEL_LOG"
cloudflared tunnel run "$TUNNEL_NAME" >> "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
disown $TUNNEL_PID
echo "tunnel=$TUNNEL_PID" >> "$PID_FILE"
info "PID $TUNNEL_PID → $TUNNEL_LOG"

wait_for_tunnel "$TUNNEL_LOG" 30
ok "Tunnel live"

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}══════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Guilded is live${RESET}  ${DIM}(processes are detached)${RESET}"
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo
echo -e "  ${BOLD}Frontend${RESET}"
echo -e "    Local  ${DIM}→${RESET} ${CYAN}http://localhost:${WEB_PORT}${RESET}"
echo -e "    Public ${DIM}→${RESET} ${CYAN}${PUBLIC_WEB}${RESET}"
echo
echo -e "  ${BOLD}Backend API${RESET}"
echo -e "    Local  ${DIM}→${RESET} ${CYAN}http://localhost:${API_PORT}${RESET}"
echo -e "    Public ${DIM}→${RESET} ${CYAN}${PUBLIC_API}${RESET}"
echo -e "    Docs   ${DIM}→${RESET} ${CYAN}${PUBLIC_API}/docs${RESET}"
echo
echo -e "  ${DIM}Logs : $LOG_DIR/${RESET}"
echo -e "  ${DIM}PIDs : $PID_FILE${RESET}"
echo -e "  ${DIM}Stop : ./stop.sh${RESET}"
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo
