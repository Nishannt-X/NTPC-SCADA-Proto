#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 Stopping NTPC Lara Telemetry infrastructure..."
docker-compose down
echo "✅ All containers stopped."
echo ""
echo "💡 To also remove volumes (persistent data), run:"
echo "   docker-compose down -v"
