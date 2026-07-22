"""
Step 1: Extract sensor data from TimescaleDB → CSV.

Connects to the local TimescaleDB instance, pulls all readings for a single
unit, pivots them into a wide table (timestamp × 32 sensors), and saves to
data/baseline_{unit}.csv.

Usage:
    python 01_collect_data.py              # defaults to UNIT_1
    python 01_collect_data.py UNIT_2
"""
import sys
import psycopg2
import pandas as pd

UNIT = sys.argv[1] if len(sys.argv) > 1 else "UNIT_1"
DB_CONFIG = dict(host="localhost", port=5432, dbname="telemetry",
                 user="telemetry", password="telemetry_pass")

# ponytail: 32 sensors per unit, defined in SensorFleetConfig.java
SENSORS = [
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

PREFIX = "U1" if UNIT == "UNIT_1" else "U2"

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    query = """
        SELECT reading_time AS timestamp, sensor_id, value
        FROM sensor_readings
        WHERE unit = %s
        ORDER BY reading_time
    """
    print(f"Fetching data for {UNIT}...")
    df = pd.read_sql(query, conn, params=(UNIT,))
    conn.close()

    if df.empty:
        print("No data found. Is the simulator running?")
        sys.exit(1)

    print(f"  Raw rows: {len(df)}")

    # Strip unit prefix from sensor_id for cleaner column names
    df["sensor_name"] = df["sensor_id"].str.replace(f"{PREFIX}-", "", n=1)

    # Pivot: one row per timestamp, one column per sensor
    wide = df.pivot_table(index="timestamp", columns="sensor_name",
                          values="value", aggfunc="first")

    # Keep only the 32 sensors we expect (drop any extras like LOAD)
    cols = [s for s in SENSORS if s in wide.columns]
    missing = set(SENSORS) - set(cols)
    if missing:
        print(f"  WARNING: Missing sensors: {missing}")
    wide = wide[cols]

    # Drop rows with any NaN (incomplete readings at boundaries)
    before = len(wide)
    wide = wide.dropna()
    print(f"  After pivot & dropna: {len(wide)} rows ({before - len(wide)} dropped)")

    out = f"data/baseline_{UNIT.lower()}.csv"
    wide.to_csv(out)
    print(f"  Saved to {out}")
    print(f"  Columns ({len(cols)}): {cols}")
    print(f"  Time range: {wide.index.min()} → {wide.index.max()}")

if __name__ == "__main__":
    main()
