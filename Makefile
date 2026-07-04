.PHONY: infra-up infra-down infra-logs build up down logs restart clean

# ---------------------------------------------------------------------------
# Infrastructure only (Kafka, TimescaleDB, Redis, Prometheus, Grafana)
# ---------------------------------------------------------------------------
infra-up:
	@echo "🚀 Starting infrastructure containers..."
	docker-compose up -d kafka timescaledb redis prometheus grafana
	@echo "✅ Infrastructure is starting. Use 'make infra-logs' to watch."

infra-down:
	@echo "🛑 Stopping infrastructure containers..."
	docker-compose down
	@echo "✅ Infrastructure stopped."

infra-logs:
	docker-compose logs -f kafka timescaledb redis prometheus grafana

# ---------------------------------------------------------------------------
# Full stack (infrastructure + all services) — available after Phase 7
# ---------------------------------------------------------------------------
build:
	@echo "🔨 Building all service images..."
	docker-compose build

up: build
	@echo "🚀 Starting full stack..."
	docker-compose up -d
	@echo "✅ Full stack is starting. Use 'make logs' to watch."

down:
	@echo "🛑 Stopping full stack..."
	docker-compose down
	@echo "✅ Full stack stopped."

logs:
	docker-compose logs -f

restart:
	@echo "🔄 Restarting full stack..."
	docker-compose down
	docker-compose up -d --build
	@echo "✅ Full stack restarted."

# ---------------------------------------------------------------------------
# Cleanup — removes containers, volumes, and images
# ---------------------------------------------------------------------------
clean:
	@echo "🧹 Cleaning up everything (containers, volumes, images)..."
	docker-compose down -v --rmi local
	@echo "✅ Cleanup complete."

# ---------------------------------------------------------------------------
# Status checks
# ---------------------------------------------------------------------------
status:
	docker-compose ps

health:
	@echo "--- Kafka ---"
	@docker exec ntpc-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list 2>/dev/null && echo "✅ Kafka OK" || echo "❌ Kafka DOWN"
	@echo "--- TimescaleDB ---"
	@docker exec ntpc-timescaledb pg_isready -U telemetry -d telemetry 2>/dev/null && echo "✅ TimescaleDB OK" || echo "❌ TimescaleDB DOWN"
	@echo "--- Redis ---"
	@docker exec ntpc-redis redis-cli ping 2>/dev/null && echo "✅ Redis OK" || echo "❌ Redis DOWN"
	@echo "--- Prometheus ---"
	@curl -sf http://localhost:9090/-/healthy > /dev/null 2>&1 && echo "✅ Prometheus OK" || echo "❌ Prometheus DOWN"
	@echo "--- Grafana ---"
	@curl -sf http://localhost:3000/api/health > /dev/null 2>&1 && echo "✅ Grafana OK" || echo "❌ Grafana DOWN"
