// Explicit static mapping of sensor-id-suffix → physical plant segment.
// The suffix is the portion of the sensorId after stripping the "U1-" or "U2-"
// prefix. We deliberately do NOT use substring/prefix matching so grouping
// never silently drifts when new sensors are added on the backend — an unknown
// suffix falls through to the visible "Unclassified" bucket.

export const SEGMENTS = [
  "Fuel Handling & Prep",
  "Boiler Island",
  "Turbine-Generator",
  "Water Cycle",
  "Electrical / Switchyard",
  "Emissions Control",
] as const;

export type Segment = (typeof SEGMENTS)[number];
export const UNCLASSIFIED = "Unclassified" as const;

export const SEGMENT_MAP: Record<string, Segment> = {
  // Fuel Handling & Prep (5)
  MILL_OUTLET_TEMP: "Fuel Handling & Prep",
  MILL_BEARING_VIB: "Fuel Handling & Prep",
  MILL_MOTOR_CURRENT: "Fuel Handling & Prep",
  BUNKER_COAL_TEMP: "Fuel Handling & Prep",
  BELT_MISALIGNMENT: "Fuel Handling & Prep",

  // Boiler Island (7)
  FURNACE_DRAFT_PRES: "Boiler Island",
  DRUM_LEVEL: "Boiler Island",
  MAIN_STEAM_TEMP: "Boiler Island",
  MAIN_STEAM_PRES: "Boiler Island",
  FEGT: "Boiler Island",
  FLAME_SCANNER: "Boiler Island",
  WATERWALL_TEMP: "Boiler Island",

  // Turbine-Generator (5)
  SHAFT_VIB: "Turbine-Generator",
  BEARING_METAL_TEMP: "Turbine-Generator",
  LUBE_OIL_PRES: "Turbine-Generator",
  STATOR_WINDING_TEMP: "Turbine-Generator",
  RPM: "Turbine-Generator",

  // Water Cycle (5)
  CONDENSER_VACUUM: "Water Cycle",
  CONDENSER_COND: "Water Cycle",
  HOTWELL_LEVEL: "Water Cycle",
  BFP_BEARING_VIB: "Water Cycle",
  DEAERATOR_LEVEL: "Water Cycle",

  // Electrical / Switchyard (5)
  GEN_DIFF_PROT: "Electrical / Switchyard",
  TRANSFORMER_DGA: "Electrical / Switchyard",
  TRANSFORMER_TEMP: "Electrical / Switchyard",
  BUCHHOLZ_RELAY: "Electrical / Switchyard",
  BREAKER_STATUS: "Electrical / Switchyard",

  // Emissions Control (5)
  STACK_SO2: "Emissions Control",
  STACK_OPACITY: "Emissions Control",
  ESP_FIELD_CURRENT: "Emissions Control",
  ID_FAN_VIB: "Emissions Control",
  FGD_SLURRY_PH: "Emissions Control",
};

/** Strip the "U1-" / "U2-" / "U1_" / "U2_" unit prefix from a sensorId. */
export function sensorSuffix(sensorId: string): string {
  return sensorId.replace(/^U[12][-_]/, "");
}

/** Segment for a sensorId, or null if the suffix is unclassified. */
export function segmentFor(sensorId: string): Segment | null {
  return SEGMENT_MAP[sensorSuffix(sensorId)] ?? null;
}

/** Human-readable label for a sensor suffix (e.g. MAIN_STEAM_TEMP → Main Steam Temp). */
export function prettySensorName(sensorId: string): string {
  return sensorSuffix(sensorId)
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Digital state semantics: value 1 vs 0 → label + severity. */
export interface DigitalStateDef {
  onLabel: string;   // label when value >= 0.5
  offLabel: string;  // label when value < 0.5
  onIsCritical: boolean; // true if the "on" state means alarm/trip
}

export const DIGITAL_STATE: Record<string, DigitalStateDef> = {
  FLAME_SCANNER:     { onLabel: "OK",     offLabel: "FAULT", onIsCritical: false },
  GEN_DIFF_PROT:     { onLabel: "TRIP",   offLabel: "NORMAL", onIsCritical: true },
  BUCHHOLZ_RELAY:    { onLabel: "TRIP",   offLabel: "NORMAL", onIsCritical: true },
  BREAKER_STATUS:    { onLabel: "CLOSED", offLabel: "OPEN",   onIsCritical: false },
  BELT_MISALIGNMENT: { onLabel: "FAULT",  offLabel: "OK",     onIsCritical: true },
};

export function digitalStateFor(sensorId: string): DigitalStateDef | null {
  return DIGITAL_STATE[sensorSuffix(sensorId)] ?? null;
}
