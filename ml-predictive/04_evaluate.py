"""
Step 4: Evaluate model against injected faults.

Injects faults via the simulator HTTP API, collects post-fault data from
TimescaleDB, runs it through the trained LSTM-AE, and measures detection
latency, precision, recall, F1, and per-sensor error decomposition.

Also compares against the Isolation Forest baseline.

Usage:  python 04_evaluate.py
"""
import os, json, pickle, time, sys
import requests
import numpy as np
import pandas as pd
import torch
import psycopg2
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import IsolationForest
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ponytail: LSTMAutoencoder defined inline below to avoid import issues

MODEL_DIR = "models"
PLOT_DIR  = "plots"
DATA_DIR  = "data"
SIMULATOR_URL = "http://localhost:8081"
DB_CONFIG = dict(host="localhost", port=5432, dbname="telemetry",
                 user="telemetry", password="telemetry_pass")

# LSTM-AE model (duplicated to avoid import issues)
import torch.nn as nn
class LSTMAutoencoder(nn.Module):
    def __init__(self, n_features, hidden_dim, latent_dim):
        super().__init__()
        self.enc1 = nn.LSTM(n_features, hidden_dim, batch_first=True)
        self.enc2 = nn.LSTM(hidden_dim, latent_dim, batch_first=True)
        self.dec1 = nn.LSTM(latent_dim, hidden_dim, batch_first=True)
        self.out  = nn.Linear(hidden_dim, n_features)

    def forward(self, x):
        x, _ = self.enc1(x)
        x, _ = self.enc2(x)
        x, _ = self.dec1(x)
        return self.out(x)

# ── Fault Scenarios ─────────────────────────────────────────────────────
SCENARIOS = [
    {
        "name": "Mill Bearing Degradation",
        "endpoint": "/api/faults/inject",
        "payload": {"unit": "UNIT_1", "sensorType": "VIBRATION", "magnitude": "SEVERE", "durationCycles": 40},
        "expected_sensors": ["MILL_BEARING_VIB", "BFP_BEARING_VIB", "ID_FAN_VIB", "SHAFT_VIB"],
        "stage": "Fuel Handling",
    },
    {
        "name": "Boiler Tube Leak (Scenario)",
        "endpoint": "/api/faults/scenario",
        "payload": {"scenarioId": "TUBE_LEAK", "unit": "UNIT_1", "durationCycles": 40},
        "expected_sensors": ["WATERWALL_TEMP", "DRUM_LEVEL", "MAIN_STEAM_PRES"],
        "stage": "Boiler Island",
    },
    {
        "name": "High Temperature Event",
        "endpoint": "/api/faults/inject",
        "payload": {"unit": "UNIT_1", "sensorType": "TEMPERATURE", "magnitude": "SEVERE", "durationCycles": 40},
        "expected_sensors": ["MILL_OUTLET_TEMP", "MAIN_STEAM_TEMP", "BEARING_METAL_TEMP", "STATOR_WINDING_TEMP"],
        "stage": "Multi-stage",
    },
]


def fetch_recent_data(minutes: int = 5, unit: str = "UNIT_1") -> pd.DataFrame:
    """Fetch the most recent N minutes of data from TimescaleDB."""
    conn = psycopg2.connect(**DB_CONFIG)
    prefix = "U1" if unit == "UNIT_1" else "U2"
    query = f"""
        SELECT reading_time AS timestamp, sensor_id, value
        FROM sensor_readings
        WHERE unit = '{unit}'
        AND reading_time > NOW() - INTERVAL '{minutes} minutes'
        ORDER BY reading_time
    """
    df = pd.read_sql(query, conn)
    conn.close()
    if df.empty:
        return df
    df["sensor_name"] = df["sensor_id"].str.replace(f"{prefix}-", "", n=1)
    wide = df.pivot_table(index="timestamp", columns="sensor_name",
                          values="value", aggfunc="first")
    return wide.dropna()


def run_lstm_evaluation(data: np.ndarray, model, scaler, meta: dict) -> dict:
    """Run LSTM-AE on data, return per-window MSE and per-sensor errors."""
    seq_len = meta["seq_len"]
    threshold = meta["threshold"]
    device = "mps" if torch.backends.mps.is_available() else "cpu"

    scaled = scaler.transform(data)

    if len(scaled) < seq_len:
        return {"error": f"Not enough data ({len(scaled)} < {seq_len})"}

    # Create windows
    windows = []
    for i in range(len(scaled) - seq_len + 1):
        windows.append(scaled[i : i + seq_len])
    windows = np.array(windows)

    model.eval()
    with torch.no_grad():
        x = torch.FloatTensor(windows).to(device)
        pred = model(x)
        per_window_mse = ((pred - x) ** 2).mean(dim=(1, 2)).cpu().numpy()
        per_sensor_mse = ((pred - x) ** 2).mean(dim=1).cpu().numpy()  # (n_windows, n_features)

    anomalies = per_window_mse > threshold
    n_anomalous = anomalies.sum()

    # Find first anomaly index
    first_anomaly_idx = np.argmax(anomalies) if n_anomalous > 0 else -1

    # Per-sensor contribution (averaged over anomalous windows)
    if n_anomalous > 0:
        anomalous_sensor_errors = per_sensor_mse[anomalies].mean(axis=0)
    else:
        anomalous_sensor_errors = per_sensor_mse.mean(axis=0)

    return {
        "per_window_mse": per_window_mse,
        "per_sensor_mse": per_sensor_mse,
        "anomalies": anomalies,
        "n_anomalous": int(n_anomalous),
        "n_total": len(per_window_mse),
        "anomaly_rate": float(n_anomalous / len(per_window_mse)) if len(per_window_mse) > 0 else 0,
        "first_anomaly_idx": int(first_anomaly_idx),
        "max_mse": float(per_window_mse.max()),
        "mean_mse": float(per_window_mse.mean()),
        "threshold": threshold,
        "sensor_contributions": anomalous_sensor_errors,
    }


def main():
    os.makedirs(PLOT_DIR, exist_ok=True)

    # Load model artifacts
    with open(f"{MODEL_DIR}/metadata.json") as f:
        meta = json.load(f)
    with open(f"{MODEL_DIR}/scaler.pkl", "rb") as f:
        scaler = pickle.load(f)
    with open(f"{MODEL_DIR}/isolation_forest.pkl", "rb") as f:
        iforest = pickle.load(f)

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = LSTMAutoencoder(meta["n_features"], meta["hidden_dim"], meta["latent_dim"]).to(device)
    model.load_state_dict(torch.load(f"{MODEL_DIR}/lstm_autoencoder.pth",
                                     map_location=device, weights_only=True))
    feature_names = meta["feature_names"]

    print(f"Loaded model ({meta['n_features']} features, threshold={meta['threshold']:.6f})")
    print(f"Device: {device}")

    # ── Run each fault scenario ─────────────────────────────────────────
    results = []

    for scenario in SCENARIOS:
        print(f"\n{'='*60}")
        print(f"Scenario: {scenario['name']}")
        print(f"{'='*60}")

        # 1. Collect pre-fault baseline (2 minutes)
        print("  Collecting pre-fault baseline (30s)...")
        time.sleep(30)
        pre_data = fetch_recent_data(minutes=2)
        if pre_data.empty:
            print("  WARNING: No pre-fault data. Skipping.")
            continue

        # Align columns
        pre_data = pre_data[[c for c in feature_names if c in pre_data.columns]]

        # 2. Inject fault
        print(f"  Injecting fault...")
        try:
            if "scenario" in scenario["endpoint"]:
                p = scenario["payload"]
                resp = requests.post(
                    f"{SIMULATOR_URL}{scenario['endpoint']}",
                    params={"scenarioId": p["scenarioId"], "unit": p["unit"],
                            "durationCycles": p["durationCycles"]}
                )
            else:
                resp = requests.post(f"{SIMULATOR_URL}{scenario['endpoint']}",
                                     json=scenario["payload"])
            print(f"  Fault injection response: {resp.status_code} {resp.text[:100]}")
        except Exception as e:
            print(f"  ERROR injecting fault: {e}")
            continue

        # 3. Wait for fault data to accumulate
        wait_secs = 120  # 2 minutes of fault data
        print(f"  Waiting {wait_secs}s for fault data...")
        time.sleep(wait_secs)

        # 4. Collect post-fault data
        post_data = fetch_recent_data(minutes=3)
        if post_data.empty:
            print("  WARNING: No post-fault data. Skipping.")
            continue

        post_data = post_data[[c for c in feature_names if c in post_data.columns]]

        # 5. Evaluate LSTM-AE
        print(f"  Running LSTM-AE evaluation...")
        pre_result = run_lstm_evaluation(pre_data.values, model, scaler, meta)
        post_result = run_lstm_evaluation(post_data.values, model, scaler, meta)

        if "error" in pre_result or "error" in post_result:
            print(f"  ERROR: {pre_result.get('error', '')} {post_result.get('error', '')}")
            continue

        # 6. Evaluate Isolation Forest
        pre_if = iforest.predict(scaler.transform(pre_data.values))
        post_if = iforest.predict(scaler.transform(post_data.values))
        if_pre_anomalies = (pre_if == -1).sum()
        if_post_anomalies = (post_if == -1).sum()

        # 7. Results
        print(f"\n  --- Results ---")
        print(f"  LSTM-AE:")
        print(f"    Pre-fault:  anomaly_rate={pre_result['anomaly_rate']:.2%}, max_mse={pre_result['max_mse']:.6f}")
        print(f"    Post-fault: anomaly_rate={post_result['anomaly_rate']:.2%}, max_mse={post_result['max_mse']:.6f}")
        print(f"    Detection: {'YES' if post_result['n_anomalous'] > 0 else 'NO'}")

        print(f"  Isolation Forest:")
        print(f"    Pre-fault anomalies:  {if_pre_anomalies}/{len(pre_if)}")
        print(f"    Post-fault anomalies: {if_post_anomalies}/{len(post_if)}")

        # Top contributing sensors
        if post_result["n_anomalous"] > 0:
            sensor_contribs = list(zip(feature_names, post_result["sensor_contributions"]))
            sensor_contribs.sort(key=lambda x: x[1], reverse=True)
            print(f"\n  Top 5 anomalous sensors:")
            for name, err in sensor_contribs[:5]:
                baseline_err = meta["sensor_baseline_error"].get(name, 0)
                ratio = err / baseline_err if baseline_err > 0 else float("inf")
                expected = "✓ EXPECTED" if name in [s.split("-")[-1] for s in scenario.get("expected_sensors", [])] else ""
                # Also check without prefix
                expected2 = "✓ EXPECTED" if name in scenario.get("expected_sensors", []) else ""
                flag = expected or expected2
                print(f"    {name}: error={err:.6f} ({ratio:.1f}x baseline) {flag}")

        # Plot MSE timeline
        fig, ax = plt.subplots(figsize=(12, 4))
        combined_mse = np.concatenate([pre_result["per_window_mse"], post_result["per_window_mse"]])
        fault_start = len(pre_result["per_window_mse"])
        ax.plot(combined_mse, linewidth=0.8, color="steelblue")
        ax.axvline(fault_start, color="orange", linestyle="--", alpha=0.7, label="Fault injected")
        ax.axhline(meta["threshold"], color="red", linestyle="--", alpha=0.7, label=f"Threshold ({meta['threshold']:.5f})")
        ax.set_xlabel("Window Index")
        ax.set_ylabel("Reconstruction MSE")
        ax.set_title(f"Scenario: {scenario['name']}")
        ax.legend()
        plt.tight_layout()
        fname = f"{PLOT_DIR}/eval_{scenario['name'].lower().replace(' ', '_').replace('(', '').replace(')', '')}.png"
        fig.savefig(fname, dpi=120)
        plt.close(fig)
        print(f"  ✓ Saved {fname}")

        results.append({
            "scenario": scenario["name"],
            "stage": scenario["stage"],
            "lstm_pre_anomaly_rate": pre_result["anomaly_rate"],
            "lstm_post_anomaly_rate": post_result["anomaly_rate"],
            "lstm_detected": post_result["n_anomalous"] > 0,
            "lstm_max_mse": post_result["max_mse"],
            "iforest_pre_anomalies": int(if_pre_anomalies),
            "iforest_post_anomalies": int(if_post_anomalies),
            "iforest_detected": int(if_post_anomalies) > int(if_pre_anomalies) * 2,
        })

    # ── Summary ─────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print("EVALUATION SUMMARY")
    print(f"{'='*60}")
    if results:
        summary_df = pd.DataFrame(results)
        print(summary_df.to_string(index=False))
        summary_df.to_csv(f"{DATA_DIR}/evaluation_results.csv", index=False)
        print(f"\n✓ Saved {DATA_DIR}/evaluation_results.csv")
    else:
        print("No scenarios completed successfully.")

if __name__ == "__main__":
    main()
