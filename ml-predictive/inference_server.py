"""
Predictive Maintenance Inference Server.

Loads the trained LSTM Autoencoder and serves anomaly scores via REST.
Designed to run as a sidecar container alongside the Java backend.

Endpoints:
  GET  /health          → model status + metadata
  POST /predict         → accepts 30×32 sensor matrix, returns anomaly scores
  GET  /predict/{unit}  → fetches latest data from TimescaleDB directly
"""
import os, json, pickle, logging
from contextlib import asynccontextmanager

import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg2

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ml-inference")

MODEL_DIR = os.environ.get("MODEL_DIR", "models")

# ponytail: DB config from env, defaults match docker-compose
DB_HOST = os.environ.get("DB_HOST", "timescaledb")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "telemetry")
DB_USER = os.environ.get("DB_USER", "telemetry")
DB_PASS = os.environ.get("DB_PASS", "telemetry_pass")

# ── LSTM Autoencoder (must match training) ──────────────────────────────────
class LSTMAutoencoder(nn.Module):
    def __init__(self, n_features: int, hidden_dim: int, latent_dim: int):
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


# ── Global model state ──────────────────────────────────────────────────────
model = None
scaler = None
metadata = None
device = "cpu"

SENSOR_NAMES = [
    "MILL_OUTLET_TEMP", "MILL_BEARING_VIB", "MILL_MOTOR_CURRENT",
    "BUNKER_COAL_TEMP", "BELT_MISALIGNMENT",
    "FURNACE_DRAFT_PRES", "DRUM_LEVEL", "MAIN_STEAM_TEMP",
    "MAIN_STEAM_PRES", "FEGT", "FLAME_SCANNER", "WATERWALL_TEMP",
    "SHAFT_VIB", "BEARING_METAL_TEMP", "LUBE_OIL_PRES",
    "STATOR_WINDING_TEMP", "RPM",
    "CONDENSER_VACUUM", "CONDENSER_COND", "HOTWELL_LEVEL",
    "BFP_BEARING_VIB", "DEAERATOR_LEVEL",
    "GEN_DIFF_PROT", "TRANSFORMER_DGA", "TRANSFORMER_TEMP",
    "BUCHHOLZ_RELAY", "BREAKER_STATUS",
    "STACK_SO2", "STACK_OPACITY", "ESP_FIELD_CURRENT",
    "ID_FAN_VIB", "FGD_SLURRY_PH",
]

# Stage groupings for aggregate scores
STAGES = {
    "fuel":       SENSOR_NAMES[0:5],
    "boiler":     SENSOR_NAMES[5:12],
    "turbine":    SENSOR_NAMES[12:17],
    "water":      SENSOR_NAMES[17:22],
    "electrical": SENSOR_NAMES[22:27],
    "emissions":  SENSOR_NAMES[27:32],
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup."""
    global model, scaler, metadata, device
    try:
        with open(f"{MODEL_DIR}/metadata.json") as f:
            metadata = json.load(f)
        with open(f"{MODEL_DIR}/scaler.pkl", "rb") as f:
            scaler = pickle.load(f)

        n = metadata["n_features"]
        h = metadata["hidden_dim"]
        l = metadata["latent_dim"]
        model = LSTMAutoencoder(n, h, l).to(device)
        model.load_state_dict(
            torch.load(f"{MODEL_DIR}/lstm_autoencoder.pth", map_location=device, weights_only=True)
        )
        model.eval()
        log.info(f"Model loaded: {n} features, threshold={metadata['threshold']:.6f}")
    except FileNotFoundError:
        log.warning("No trained model found in %s — /predict will return errors", MODEL_DIR)
    yield


app = FastAPI(title="NTPC Predictive Maintenance", lifespan=lifespan)


# ── Request/Response schemas ────────────────────────────────────────────────

class PredictRequest(BaseModel):
    """Raw sensor values: list of 30 timesteps, each a list of 32 floats."""
    readings: list[list[float]]

class SensorScore(BaseModel):
    sensor: str
    error: float
    baseline_error: float
    ratio: float  # error / baseline_error
    actual_value: float
    expected_value: float

class PredictResponse(BaseModel):
    anomaly_score: float
    threshold: float
    is_anomaly: bool
    stage_scores: dict[str, float]
    top_sensors: list[SensorScore]


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok" if model is not None else "no_model",
        "n_features": metadata["n_features"] if metadata else 0,
        "threshold": metadata["threshold"] if metadata else 0,
        "seq_len": metadata["seq_len"] if metadata else 0,
    }


def _run_inference(raw: np.ndarray) -> PredictResponse:
    """Core inference logic. raw shape: (seq_len, n_features)."""
    if model is None or scaler is None or metadata is None:
        raise HTTPException(503, "Model not loaded")

    seq_len = metadata["seq_len"]
    if len(raw) < seq_len:
        raise HTTPException(400, f"Need at least {seq_len} timesteps, got {len(raw)}")

    # Take last seq_len rows
    window = raw[-seq_len:]
    scaled = scaler.transform(window)
    x = torch.FloatTensor(scaled).unsqueeze(0).to(device)  # (1, seq_len, features)

    with torch.no_grad():
        pred = model(x)
        per_sensor = ((pred - x) ** 2).mean(dim=1).squeeze(0).cpu().numpy()  # (n_features,)
        total_mse = per_sensor.mean()
        
        # To get expected vs actual physical values, we un-scale the last timestep
        # x shape: (1, seq_len, features)
        # pred shape: (1, seq_len, features)
        last_x_scaled = x[0, -1, :].cpu().numpy().reshape(1, -1)
        last_pred_scaled = pred[0, -1, :].cpu().numpy().reshape(1, -1)
        
        actual_unscaled = scaler.inverse_transform(last_x_scaled)[0]
        expected_unscaled = scaler.inverse_transform(last_pred_scaled)[0]

    threshold = metadata["threshold"]
    baseline_errs = metadata.get("sensor_baseline_error", {})

    # Per-sensor scores
    sensor_scores = []
    for i, name in enumerate(SENSOR_NAMES[:len(per_sensor)]):
        baseline = baseline_errs.get(name, per_sensor[i])
        ratio = float(per_sensor[i] / baseline) if baseline > 0 else 1.0
        sensor_scores.append(SensorScore(
            sensor=name, error=float(per_sensor[i]),
            baseline_error=float(baseline), ratio=ratio,
            actual_value=float(actual_unscaled[i]),
            expected_value=float(expected_unscaled[i])
        ))

    # Stage aggregate scores (mean of per-sensor errors in each stage)
    stage_scores = {}
    for stage, sensors in STAGES.items():
        indices = [SENSOR_NAMES.index(s) for s in sensors if s in SENSOR_NAMES[:len(per_sensor)]]
        stage_scores[stage] = float(np.mean([per_sensor[i] for i in indices])) if indices else 0.0

    # Sort by ratio descending
    sensor_scores.sort(key=lambda s: s.ratio, reverse=True)

    return PredictResponse(
        anomaly_score=float(total_mse),
        threshold=float(threshold),
        is_anomaly=bool(total_mse > threshold),
        stage_scores=stage_scores,
        top_sensors=sensor_scores[:10],  # top 10 contributors
    )


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """Predict from raw readings matrix."""
    raw = np.array(req.readings)
    if raw.ndim != 2 or raw.shape[1] != len(SENSOR_NAMES):
        raise HTTPException(400, f"Expected shape (N, {len(SENSOR_NAMES)}), got {raw.shape}")
    return _run_inference(raw)


@app.get("/predict/{unit}", response_model=PredictResponse)
def predict_from_db(unit: str):
    """Fetch latest readings from TimescaleDB and run inference."""
    if model is None:
        raise HTTPException(503, "Model not loaded")

    seq_len = metadata["seq_len"]
    prefix = "U1" if unit == "UNIT_1" else "U2"

    try:
        conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
                                user=DB_USER, password=DB_PASS)
        cur = conn.cursor()
        # Get the last seq_len*2 readings (extra buffer for pivot gaps)
        cur.execute("""
            SELECT reading_time AS timestamp, sensor_id, value
            FROM sensor_readings
            WHERE unit = %s
            ORDER BY reading_time DESC
            LIMIT %s
        """, (unit, seq_len * len(SENSOR_NAMES) * 2))
        rows = cur.fetchall()
        conn.close()
    except Exception as e:
        raise HTTPException(500, f"DB error: {e}")

    if not rows:
        raise HTTPException(404, "No data in TimescaleDB")

    # Pivot to wide format
    import pandas as pd
    df = pd.DataFrame(rows, columns=["timestamp", "sensor_id", "value"])
    df["sensor_name"] = df["sensor_id"].str.replace(f"{prefix}-", "", n=1)
    wide = df.pivot_table(index="timestamp", columns="sensor_name",
                          values="value", aggfunc="first")

    # Keep only our 32 sensors, in order
    cols = [s for s in SENSOR_NAMES if s in wide.columns]
    if len(cols) < len(SENSOR_NAMES):
        missing = set(SENSOR_NAMES) - set(cols)
        log.warning(f"Missing sensors: {missing}")

    wide = wide[cols].dropna().sort_index()

    if len(wide) < seq_len:
        raise HTTPException(400, f"Only {len(wide)} complete rows, need {seq_len}")

    return _run_inference(wide.values)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)
