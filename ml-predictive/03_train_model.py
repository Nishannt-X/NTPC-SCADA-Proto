"""
Step 3: Train LSTM Autoencoder + Isolation Forest baseline.

Reads baseline CSV, scales features, creates sliding windows, trains
the LSTM-AE on normal data, computes reconstruction error threshold,
and saves model artifacts.

Usage:  python 03_train_model.py
"""
import os, json, pickle
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import IsolationForest
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ── Config ──────────────────────────────────────────────────────────────
DATA_FILE  = "data/baseline_unit_1.csv"
MODEL_DIR  = "models"
PLOT_DIR   = "plots"
SEQ_LEN    = 30          # sliding window length (30 readings ≈ 90 seconds at 3s interval)
BATCH_SIZE = 32
EPOCHS     = 80
LR         = 1e-3
HIDDEN_DIM = 64
LATENT_DIM = 16
DEVICE     = "mps" if torch.backends.mps.is_available() else "cpu"

# ── LSTM Autoencoder ────────────────────────────────────────────────────
class LSTMAutoencoder(nn.Module):
    """
    Encoder: LSTM(n_features → hidden) → LSTM(hidden → latent)
    Decoder: LSTM(latent → hidden) → Linear(hidden → n_features)
    """
    def __init__(self, n_features: int, hidden_dim: int, latent_dim: int):
        super().__init__()
        self.n_features = n_features
        # Encoder
        self.enc1 = nn.LSTM(n_features, hidden_dim, batch_first=True)
        self.enc2 = nn.LSTM(hidden_dim, latent_dim, batch_first=True)
        # Decoder
        self.dec1 = nn.LSTM(latent_dim, hidden_dim, batch_first=True)
        self.out  = nn.Linear(hidden_dim, n_features)

    def forward(self, x):
        # x: (batch, seq_len, n_features)
        x, _ = self.enc1(x)
        x, _ = self.enc2(x)
        x, _ = self.dec1(x)
        x = self.out(x)
        return x


# ── Helpers ─────────────────────────────────────────────────────────────
def create_windows(data: np.ndarray, seq_len: int) -> np.ndarray:
    """Sliding window over rows. Returns (n_windows, seq_len, n_features)."""
    windows = []
    for i in range(len(data) - seq_len + 1):
        windows.append(data[i : i + seq_len])
    return np.array(windows)


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(PLOT_DIR, exist_ok=True)

    # 1. Load & scale
    df = pd.read_csv(DATA_FILE, index_col=0, parse_dates=True)
    n_features = len(df.columns)
    print(f"Loaded {len(df)} rows × {n_features} features")
    print(f"Device: {DEVICE}")

    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(df.values)

    # Save scaler
    with open(f"{MODEL_DIR}/scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)
    print(f"✓ Saved scaler ({n_features} features)")

    # 2. Create sliding windows
    windows = create_windows(scaled, SEQ_LEN)
    print(f"Windows: {windows.shape}")  # (n, seq_len, features)

    # Train/val split (80/20, chronological)
    split = int(len(windows) * 0.8)
    train_w, val_w = windows[:split], windows[split:]
    print(f"Train: {train_w.shape}, Val: {val_w.shape}")

    train_t = torch.FloatTensor(train_w)
    val_t   = torch.FloatTensor(val_w)

    train_dl = DataLoader(TensorDataset(train_t, train_t), batch_size=BATCH_SIZE, shuffle=True)
    val_dl   = DataLoader(TensorDataset(val_t, val_t), batch_size=BATCH_SIZE)

    # 3. Train LSTM Autoencoder
    model = LSTMAutoencoder(n_features, HIDDEN_DIM, LATENT_DIM).to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    criterion = nn.MSELoss()

    train_losses, val_losses = [], []
    best_val = float("inf")

    print(f"\n=== Training LSTM Autoencoder ({EPOCHS} epochs) ===")
    for epoch in range(1, EPOCHS + 1):
        # Train
        model.train()
        epoch_loss = 0
        for xb, _ in train_dl:
            xb = xb.to(DEVICE)
            pred = model(xb)
            loss = criterion(pred, xb)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * len(xb)
        train_loss = epoch_loss / len(train_t)
        train_losses.append(train_loss)

        # Val
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for xb, _ in val_dl:
                xb = xb.to(DEVICE)
                pred = model(xb)
                val_loss += criterion(pred, xb).item() * len(xb)
        val_loss /= len(val_t)
        val_losses.append(val_loss)

        if val_loss < best_val:
            best_val = val_loss
            torch.save(model.state_dict(), f"{MODEL_DIR}/lstm_autoencoder.pth")

        if epoch % 10 == 0 or epoch == 1:
            print(f"  Epoch {epoch:3d}  train_loss={train_loss:.6f}  val_loss={val_loss:.6f}")

    print(f"\nBest val loss: {best_val:.6f}")

    # Plot training curve
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(train_losses, label="Train MSE", linewidth=0.8)
    ax.plot(val_losses, label="Val MSE", linewidth=0.8)
    ax.set_xlabel("Epoch")
    ax.set_ylabel("MSE Loss")
    ax.set_title("LSTM Autoencoder Training Curve")
    ax.legend()
    plt.tight_layout()
    fig.savefig(f"{PLOT_DIR}/training_curve.png", dpi=120)
    plt.close(fig)
    print(f"✓ Saved {PLOT_DIR}/training_curve.png")

    # 4. Compute reconstruction error distribution on validation set
    model.load_state_dict(torch.load(f"{MODEL_DIR}/lstm_autoencoder.pth", weights_only=True))
    model.eval()

    all_errors = []
    per_sensor_errors = []
    with torch.no_grad():
        for xb, _ in val_dl:
            xb = xb.to(DEVICE)
            pred = model(xb)
            # Per-window MSE
            mse = ((pred - xb) ** 2).mean(dim=(1, 2)).cpu().numpy()
            all_errors.extend(mse)
            # Per-sensor MSE (average over sequence length)
            sensor_mse = ((pred - xb) ** 2).mean(dim=1).cpu().numpy()
            per_sensor_errors.append(sensor_mse)

    all_errors = np.array(all_errors)
    per_sensor_errors = np.vstack(per_sensor_errors)

    # Threshold: mean + 3σ
    mean_err = all_errors.mean()
    std_err  = all_errors.std()
    threshold_3s = mean_err + 3 * std_err
    # Also compute 99th percentile
    threshold_99 = np.percentile(all_errors, 99)
    threshold = max(threshold_3s, threshold_99)  # use the more conservative one

    print(f"\n=== Reconstruction Error (Validation) ===")
    print(f"  Mean: {mean_err:.6f}")
    print(f"  Std:  {std_err:.6f}")
    print(f"  Threshold (mean+3σ): {threshold_3s:.6f}")
    print(f"  Threshold (99th pct): {threshold_99:.6f}")
    print(f"  Chosen threshold: {threshold:.6f}")

    # Plot error distribution
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.hist(all_errors, bins=80, color="steelblue", alpha=0.7, edgecolor="none", density=True)
    ax.axvline(threshold, color="red", linestyle="--", label=f"Threshold = {threshold:.5f}")
    ax.set_xlabel("Reconstruction MSE")
    ax.set_ylabel("Density")
    ax.set_title("Reconstruction Error Distribution (Validation — Normal Data)")
    ax.legend()
    plt.tight_layout()
    fig.savefig(f"{PLOT_DIR}/error_distribution.png", dpi=120)
    plt.close(fig)
    print(f"✓ Saved {PLOT_DIR}/error_distribution.png")

    # Per-sensor mean error (baseline)
    sensor_baseline_err = per_sensor_errors.mean(axis=0)
    sensor_baseline_std = per_sensor_errors.std(axis=0)

    # 5. Train Isolation Forest baseline
    print(f"\n=== Training Isolation Forest Baseline ===")
    iforest = IsolationForest(contamination=0.01, random_state=42, n_estimators=200)
    # Flatten windows to 2D for IForest: use last timestep of each window
    iforest.fit(scaled)
    with open(f"{MODEL_DIR}/isolation_forest.pkl", "wb") as f:
        pickle.dump(iforest, f)
    print(f"✓ Saved Isolation Forest model")

    # 6. Save metadata
    meta = {
        "n_features": n_features,
        "feature_names": list(df.columns),
        "seq_len": SEQ_LEN,
        "hidden_dim": HIDDEN_DIM,
        "latent_dim": LATENT_DIM,
        "threshold": float(threshold),
        "mean_error": float(mean_err),
        "std_error": float(std_err),
        "best_val_loss": float(best_val),
        "epochs": EPOCHS,
        "sensor_baseline_error": {col: float(sensor_baseline_err[i])
                                  for i, col in enumerate(df.columns)},
        "sensor_baseline_std":   {col: float(sensor_baseline_std[i])
                                  for i, col in enumerate(df.columns)},
    }
    with open(f"{MODEL_DIR}/metadata.json", "w") as f:
        json.dump(meta, f, indent=2)
    print(f"✓ Saved metadata.json")

    print("\n=== Training Complete ===")
    print(f"  Model: {MODEL_DIR}/lstm_autoencoder.pth")
    print(f"  Scaler: {MODEL_DIR}/scaler.pkl")
    print(f"  Threshold: {threshold:.6f}")

if __name__ == "__main__":
    main()
