#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 NTPC Lara Telemetry — Kubernetes Deployment Script"
echo ""

# --- Check prerequisites ---
command -v kind >/dev/null 2>&1 || { echo "❌ 'kind' not found. Install: https://kind.sigs.k8s.io/"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "❌ 'kubectl' not found. Install: https://kubernetes.io/docs/tasks/tools/"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ 'docker' not found."; exit 1; }

CLUSTER_NAME="ntpc-telemetry"

# --- Create Kind cluster if it doesn't exist ---
if ! kind get clusters 2>/dev/null | grep -q "$CLUSTER_NAME"; then
  echo "📦 Creating Kind cluster '$CLUSTER_NAME'..."
  kind create cluster --name "$CLUSTER_NAME" --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30080
        hostPort: 8080
        protocol: TCP
EOF
else
  echo "✅ Kind cluster '$CLUSTER_NAME' already exists."
fi

# --- Build and load Docker images ---
echo ""
echo "🔨 Building Docker images..."
cd "$SCRIPT_DIR/.."

services=("sensor-simulator" "ingestion-service" "anomaly-detection-service" "alerting-service" "query-api")

for svc in "${services[@]}"; do
  echo "  Building ntpc/$svc:latest..."
  docker build -t "ntpc/$svc:latest" "./$svc"
  echo "  Loading ntpc/$svc:latest into Kind cluster..."
  kind load docker-image "ntpc/$svc:latest" --name "$CLUSTER_NAME"
done

# --- Apply Kubernetes manifests ---
echo ""
echo "📄 Applying Kubernetes manifests..."
cd "$SCRIPT_DIR"

kubectl apply -f namespace.yml
kubectl apply -f configmap.yml
kubectl apply -f secrets.yml

# Infrastructure
kubectl apply -f kafka/
kubectl apply -f timescaledb/
kubectl apply -f redis/

echo "⏳ Waiting for infrastructure pods..."
kubectl -n ntpc-telemetry wait --for=condition=ready pod -l app=kafka --timeout=120s 2>/dev/null || true
kubectl -n ntpc-telemetry wait --for=condition=ready pod -l app=timescaledb --timeout=120s 2>/dev/null || true
kubectl -n ntpc-telemetry wait --for=condition=ready pod -l app=redis --timeout=60s 2>/dev/null || true

# Application services
for svc in "${services[@]}"; do
  kubectl apply -f "$svc/"
done

echo ""
echo "⏳ Waiting for all application pods..."
kubectl -n ntpc-telemetry wait --for=condition=ready pod --all --timeout=180s 2>/dev/null || true

echo ""
echo "✅ Deployment complete!"
echo ""
kubectl -n ntpc-telemetry get pods
echo ""
kubectl -n ntpc-telemetry get hpa
echo ""
echo "  📊 Query API:  http://localhost:8080/api/v1/units/UNIT_1/readings/latest"
echo ""
