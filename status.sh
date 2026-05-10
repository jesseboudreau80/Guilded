#!/usr/bin/env bash
FE_PORT=3000
BE_PORT=8100
FE_OK=$(curl -sf "http://127.0.0.1:${FE_PORT}" >/dev/null 2>&1 && echo "✓ alive" || echo "✗ offline")
BE_OK=$(curl -sf "http://127.0.0.1:${BE_PORT}/health" >/dev/null 2>&1 && echo "✓ alive" || echo "✗ offline")
echo "[guilded] frontend :${FE_PORT}  ${FE_OK}"
echo "[guilded] backend  :${BE_PORT}  ${BE_OK}"
FE_PID=$(ss -tlnp 2>/dev/null | awk "/:${FE_PORT}[^0-9]/" | grep -oP 'pid=\K[0-9]+' | head -1)
BE_PID=$(ss -tlnp 2>/dev/null | awk "/:${BE_PORT}[^0-9]/" | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$FE_PID" ] && echo "[guilded] frontend PID $FE_PID"
[ -n "$BE_PID" ] && echo "[guilded] backend  PID $BE_PID"
