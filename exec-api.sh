#!/bin/bash
# Guilded API — exec launcher
set -a
source "$(dirname "${BASH_SOURCE[0]}")/.env"
set +a
cd "$(dirname "${BASH_SOURCE[0]}")/api"
# Clear port before binding
fuser -k 8100/tcp 2>/dev/null || true
sleep 0.5

exec venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8100
