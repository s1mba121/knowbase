#!/usr/bin/env bash
# Runs on the production host after CI (or manually) syncs the repo.
set -euo pipefail

cd /opt/knowbase

# Same-origin deploy: leave public URL overrides empty (nginx proxies /v1).
for key in FRONTEND_URL BACKEND_URL VITE_API_URL; do
  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=|" .env
  else
    printf '%s=\n' "$key" >> .env
  fi
done

docker compose up -d --build --force-recreate web api
docker compose ps
curl -fsS http://127.0.0.1:4001/health >/dev/null
echo "Deploy OK"
