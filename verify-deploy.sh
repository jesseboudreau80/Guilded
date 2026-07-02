#!/usr/bin/env bash
# Guilded deployment verification script
# Run after every: npm run build && sudo systemctl restart guilded-web

PASS=0
FAIL=0

check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "  PASS  $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $label"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "Guilded Deployment Verification"
echo "================================"
echo ""
echo "Infrastructure"
check "guilded-web service active" "systemctl is-active guilded-web"
check "guilded-api service active" "systemctl is-active guilded-api"
check "port 3000 listening" "ss -tlnp | grep -q ':3000'"
check "port 8100 listening" "ss -tlnp | grep -q ':8100'"
check "cloudflared running" "ps aux | grep -q '[c]loudflared.*config.yml'"

echo ""
echo "HTTP Responses"
check "homepage returns HTML" \
  "curl -sf http://127.0.0.1:3000/ -o /dev/null -D - | grep -qi 'content-type: text/html'"
check "homepage is no-store" \
  "curl -sf http://127.0.0.1:3000/ -o /dev/null -D - | grep -qi 'no-store'"
check "RSC response is no-store" \
  "curl -sf http://127.0.0.1:3000/ -H 'RSC: 1' -o /dev/null -D - | grep -qi 'no-store'"
check "/forgot-password returns HTML" \
  "curl -sf http://127.0.0.1:3000/forgot-password -o /dev/null -D - | grep -qi 'content-type: text/html'"
check "/preview returns HTML" \
  "curl -sf http://127.0.0.1:3000/preview -o /dev/null -D - | grep -qi 'content-type: text/html'"
check "/dashboard redirects unauthenticated" \
  "curl -sf http://127.0.0.1:3000/dashboard -o /dev/null -D - | grep -qi 'location:'"

echo ""
echo "Security Headers"
check "X-Content-Type-Options: nosniff" \
  "curl -sf http://127.0.0.1:3000/ -o /dev/null -D - | grep -qi 'x-content-type-options: nosniff'"
check "X-Frame-Options: SAMEORIGIN" \
  "curl -sf http://127.0.0.1:3000/ -o /dev/null -D - | grep -qi 'x-frame-options: SAMEORIGIN'"
check "Referrer-Policy present" \
  "curl -sf http://127.0.0.1:3000/ -o /dev/null -D - | grep -qi 'referrer-policy'"
check "Permissions-Policy present" \
  "curl -sf http://127.0.0.1:3000/ -o /dev/null -D - | grep -qi 'permissions-policy'"

echo ""
echo "Cloudflare"
check "site reachable via Cloudflare" \
  "curl -sf https://guilded.jesseboudreau.com/ -o /dev/null --max-time 15"
check "Cloudflare returns HTML" \
  "curl -sf https://guilded.jesseboudreau.com/ -o /dev/null -D - --max-time 15 | grep -qi 'content-type: text/html'"
check "Cloudflare no-store preserved" \
  "curl -sf https://guilded.jesseboudreau.com/ -o /dev/null -D - --max-time 15 | grep -qi 'no-store'"

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
echo ""
if [ "$FAIL" -gt 0 ]; then
  echo "WARNING: $FAIL check(s) failed. Investigate before considering deployment stable."
  exit 1
else
  echo "All checks passed. Deployment looks healthy."
fi
