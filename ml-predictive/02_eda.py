"""
Step 2: Exploratory Data Analysis.

Reads baseline CSV, computes summary stats, correlation matrix, and generates
diagnostic plots to validate our domain research before building a model.

Usage:  python 02_eda.py
"""
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import os

DATA_FILE = "data/baseline_unit_1.csv"
PLOT_DIR = "plots"

# Stage groupings from our domain research
STAGES = {
    "Fuel Handling": ["MILL_OUTLET_TEMP", "MILL_BEARING_VIB", "MILL_MOTOR_CURRENT",
                      "BUNKER_COAL_TEMP", "BELT_MISALIGNMENT"],
    "Boiler Island": ["FURNACE_DRAFT_PRES", "DRUM_LEVEL", "MAIN_STEAM_TEMP",
                      "MAIN_STEAM_PRES", "FEGT", "FLAME_SCANNER", "WATERWALL_TEMP"],
    "Turbine-Gen": ["SHAFT_VIB", "BEARING_METAL_TEMP", "LUBE_OIL_PRES",
                    "STATOR_WINDING_TEMP", "RPM"],
    "Water Cycle": ["CONDENSER_VACUUM", "CONDENSER_COND", "HOTWELL_LEVEL",
                    "BFP_BEARING_VIB", "DEAERATOR_LEVEL"],
    "Electrical": ["GEN_DIFF_PROT", "TRANSFORMER_DGA", "TRANSFORMER_TEMP",
                   "BUCHHOLZ_RELAY", "BREAKER_STATUS"],
    "Emissions": ["STACK_SO2", "STACK_OPACITY", "ESP_FIELD_CURRENT",
                  "ID_FAN_VIB", "FGD_SLURRY_PH"],
}

def main():
    os.makedirs(PLOT_DIR, exist_ok=True)
    df = pd.read_csv(DATA_FILE, index_col=0, parse_dates=True)
    print(f"Loaded {len(df)} rows × {len(df.columns)} sensors")
    print(f"Time range: {df.index.min()} → {df.index.max()}")
    print(f"Duration: {df.index.max() - df.index.min()}")
    print()

    # 1. Summary statistics
    stats = df.describe().T
    stats["cv"] = stats["std"] / stats["mean"].abs()  # coefficient of variation
    print("=== Summary Statistics ===")
    print(stats[["mean", "std", "min", "max", "cv"]].round(4).to_string())
    print()

    # 2. Missing values
    nulls = df.isnull().sum()
    if nulls.any():
        print(f"WARNING: Null values found:\n{nulls[nulls > 0]}")
    else:
        print("✓ No null values")
    print()

    # 3. Correlation matrix (full 32×32)
    corr = df.corr()
    fig, ax = plt.subplots(figsize=(16, 14))
    sns.heatmap(corr, annot=False, cmap="RdBu_r", center=0, vmin=-1, vmax=1,
                xticklabels=True, yticklabels=True, ax=ax)
    ax.set_title("32-Sensor Correlation Matrix (Baseline Normal Data)")
    plt.tight_layout()
    fig.savefig(f"{PLOT_DIR}/correlation_matrix.png", dpi=150)
    plt.close(fig)
    print(f"✓ Saved {PLOT_DIR}/correlation_matrix.png")

    # 4. Key physical correlations we expect from domain research
    print("\n=== Validating Key Physical Correlations ===")
    checks = [
        ("MILL_BEARING_VIB", "MILL_MOTOR_CURRENT", "Mill degradation"),
        ("WATERWALL_TEMP", "DRUM_LEVEL", "Tube leak triad (1)"),
        ("WATERWALL_TEMP", "MAIN_STEAM_PRES", "Tube leak triad (2)"),
        ("DRUM_LEVEL", "MAIN_STEAM_PRES", "Tube leak triad (3)"),
        ("SHAFT_VIB", "BEARING_METAL_TEMP", "Turbine health"),
        ("SHAFT_VIB", "LUBE_OIL_PRES", "Turbine lubrication"),
        ("CONDENSER_VACUUM", "CONDENSER_COND", "Condenser leak"),
        ("ESP_FIELD_CURRENT", "STACK_OPACITY", "ESP effectiveness"),
        ("FGD_SLURRY_PH", "STACK_SO2", "FGD chemistry"),
        ("TRANSFORMER_DGA", "TRANSFORMER_TEMP", "Transformer health"),
        ("FEGT", "MAIN_STEAM_TEMP", "Boiler heat transfer"),
    ]
    for s1, s2, desc in checks:
        if s1 in df.columns and s2 in df.columns:
            r = df[s1].corr(df[s2])
            strength = "STRONG" if abs(r) > 0.5 else "MODERATE" if abs(r) > 0.3 else "WEAK"
            print(f"  {desc}: corr({s1}, {s2}) = {r:+.4f} [{strength}]")

    # 5. Time series plots per stage
    for stage_name, sensors in STAGES.items():
        avail = [s for s in sensors if s in df.columns]
        if not avail:
            continue
        fig, axes = plt.subplots(len(avail), 1, figsize=(14, 2.5 * len(avail)),
                                 sharex=True)
        if len(avail) == 1:
            axes = [axes]
        for ax, sensor in zip(axes, avail):
            ax.plot(df.index, df[sensor], linewidth=0.5, color="steelblue")
            ax.set_ylabel(sensor, fontsize=7, rotation=0, ha="right")
            ax.tick_params(labelsize=6)
        fig.suptitle(f"Stage: {stage_name} — Baseline Time Series", fontsize=12)
        plt.tight_layout()
        fname = f"{PLOT_DIR}/timeseries_{stage_name.lower().replace(' ', '_').replace('-', '_').replace('/', '_')}.png"
        fig.savefig(fname, dpi=120)
        plt.close(fig)
        print(f"✓ Saved {fname}")

    # 6. Distribution plots
    fig, axes = plt.subplots(8, 4, figsize=(16, 20))
    axes = axes.flatten()
    for i, col in enumerate(df.columns[:32]):
        axes[i].hist(df[col], bins=50, color="steelblue", alpha=0.7, edgecolor="none")
        axes[i].set_title(col, fontsize=7)
        axes[i].tick_params(labelsize=5)
    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)
    fig.suptitle("Sensor Value Distributions (Baseline)", fontsize=14)
    plt.tight_layout()
    fig.savefig(f"{PLOT_DIR}/distributions.png", dpi=120)
    plt.close(fig)
    print(f"✓ Saved {PLOT_DIR}/distributions.png")

    print("\n=== EDA Complete ===")

if __name__ == "__main__":
    main()
