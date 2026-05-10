#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  Guilded — Stop all services
# ══════════════════════════════════════════════════════════════════════════════

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT/.pids"
LOG_DIR="$ROOT/.logs"

API_PORT=8100
WEB_PORT=3000

if [[ -t 1 ]]; then
  BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'
  GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
else
  BOLD=''; DIM=''; RESET=''; GREEN=''; YELLOW=''; RED=''
fi

ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
warn() { echo -e "  ${YELLOW}⚠${RESET} $*"; }
info() { echo -e "  ${DIM}→ $*${RESET}"; }

echo -e "\n${BOLD}Stopping Guilded...${RESET}\n"

stopped=0

# ── 1. Kill by PID file ───────────────────────────────────────────────────────
if [[ -f "$PID_FILE" ]]; then
  while IFS='=' read -r name pid; do
    [[ -z "$name" || -z "$pid" ]] && continue
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && ok "Stopped $name (PID $pid)"
      (( stopped++ )) || true
    else
      warn "$name (PID $pid) was not running"
    fi
  done < "$PID_FILE"

  sleep 1

  while IFS='=' read -r name pid; do
    [[ -z "$name" || -z "$pid" ]] && continue
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null && warn "Force-killed $name (PID $pid)"
    fi
  done < "$PID_FILE"

  rm -f "$PID_FILE"
  ok "PID file cleared"
fi

# ── 2. Port scan fallback ─────────────────────────────────────────────────────
for port in $API_PORT $WEB_PORT; do
  pids=$(fuser "${port}/tcp" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    ok "Freed port $port"
    (( stopped++ )) || true
  fi
done

# ── 3. cloudflared sweep ──────────────────────────────────────────────────────
cf_pids=$(pgrep -f 'cloudflared' 2>/dev/null || true)
if [[ -n "$cf_pids" ]]; then
  echo "$cf_pids" | xargs kill 2>/dev/null || true
  sleep 1
  cf_pids=$(pgrep -f 'cloudflared' 2>/dev/null || true)
  [[ -n "$cf_pids" ]] && echo "$cf_pids" | xargs kill -9 2>/dev/null || true
  ok "cloudflared stopped"
  (( stopped++ )) || true
fi

# ── 4. Archive logs ───────────────────────────────────────────────────────────
if [[ -d "$LOG_DIR" && "$(ls -A "$LOG_DIR" 2>/dev/null)" ]]; then
  ts=$(date +%Y%m%d-%H%M%S)
  archive="$LOG_DIR/archive-$ts"
  mkdir -p "$archive"
  mv "$LOG_DIR"/*.log "$archive/" 2>/dev/null || true
  info "Logs archived to $archive"
fi

if [[ $stopped -eq 0 ]]; then
  warn "No processes were running"
else
  echo -e "\n${BOLD}Guilded stopped.${RESET} ($stopped process(es) terminated)\n"
fi
