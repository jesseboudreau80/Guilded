#!/bin/bash
# Guilded Frontend — exec launcher
cd "$(dirname "${BASH_SOURCE[0]}")/web"
# Clear port before binding
fuser -k 3000/tcp 2>/dev/null || true
sleep 0.5

exec node node_modules/.bin/next start -H 0.0.0.0 -p 3000
