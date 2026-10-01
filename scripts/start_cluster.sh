#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"

docker compose -f "$COMPOSE_FILE" up -d --build

for attempt in {1..30}; do
    nodes="$(docker exec master yarn node -list 2>/dev/null || true)"
    if grep -Eq 'worker1:[^[:space:]]+[[:space:]]+RUNNING' <<<"$nodes" && grep -Eq 'worker2:[^[:space:]]+[[:space:]]+RUNNING' <<<"$nodes"; then
        echo "$nodes"
        exit 0
    fi
    sleep 2
done

echo "YARN did not report both workers as RUNNING" >&2
docker exec master yarn node -list || true
exit 1