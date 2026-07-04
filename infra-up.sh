#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting NTPC Lara Telemetry infrastructure..."
echo ""

docker-compose up -d kafka timescaledb redis prometheus grafana

echo ""
echo "⏳ Waiting for containers to become healthy..."

# Wait for health checks
services=("ntpc-kafka" "ntpc-timescaledb" "ntpc-redis" "ntpc-prometheus" "ntpc-grafana")
for svc in "${services[@]}"; do
  printf "  Waiting for %-20s" "$svc..."
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "$svc" 2>/dev/null)" == "healthy" ]; do
    sleep 2
  done
  echo "✅"
done

echo ""
echo "✅ All infrastructure containers are healthy!"
echo ""
echo "  📊 Kafka:       localhost:9092"
echo "  🐘 TimescaleDB: localhost:5432  (user: telemetry, db: telemetry)"
echo "  🔴 Redis:       localhost:6379"
echo "  📈 Prometheus:  http://localhost:9090"
echo "  📉 Grafana:     http://localhost:3000"
echo ""
