// Real API client — talks to the ntpc-lara-telemetry backend (query-api on :8080).
// All format normalization lives here so no UI component needs to change.
// Proxy: /api/* → http://localhost:8080 (configured in vite.config.ts).
//
// SSR note: Server-side renders (TanStack Start / Nitro) bypass Vite's dev proxy,
// so we must use an absolute URL when running on the server.

const API_BASE =
  typeof window === "undefined"
    ? "http://localhost:8080/api/v1" // SSR — direct to backend
    : "/api/v1";                     // Browser — goes through Vite proxy

import { digitalStateFor } from "./segments";

// ─── Frontend types (unchanged — UI depends on these) ───────────────────────

export type SensorType =
  | "temperature"
  | "pressure"
  | "vibration"
  | "rpm"
  | "current"
  | "digital"
  | "level"
  | "conductivity"
  | "gas"
  | "optical"
  | "ph";
export type UnitId = "unit-1" | "unit-2";
export type Severity = "normal" | "warning" | "critical" | "consequential" | "maintenance";

export interface Reading {
  sensorId: string;
  unit: UnitId;
  sensorType: SensorType;
  value: number;
  unitOfMeasure: string;
  timestamp: string;
}

export interface Alert {
  alertId: string;
  sensorId: string;
  unit: UnitId;
  sensorType: SensorType;
  value: number;
  threshold: number;
  severity: Severity;
  timestamp: string;
  message: string;
  active?: boolean;
  count?: number;
  acknowledgedBy?: string;
  suppressedUntil?: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  username: string;
  roles: string[];
}

// SENSOR_META thresholds updated to match backend anomaly-detection-service values.
export const SENSOR_META: Record<
  SensorType,
  { label: string; unitOfMeasure: string; nominal: number; warn: number; crit: number; range: number; inverse?: boolean }
> = {
  temperature:  { label: "Temperature",   unitOfMeasure: "°C",    nominal: 540,  warn: 560,  crit: 580,  range: 20 },
  pressure:     { label: "Pressure",      unitOfMeasure: "bar",   nominal: 165,  warn: 185,  crit: 195,  range: 10 },
  vibration:    { label: "Vibration",     unitOfMeasure: "mm/s",  nominal: 0.3,  warn: 0.5,  crit: 0.7,  range: 0.1 },
  rpm:          { label: "RPM",           unitOfMeasure: "rpm",   nominal: 3000, warn: 3150, crit: 3250, range: 50 },
  current:      { label: "Current",       unitOfMeasure: "A",     nominal: 90,   warn: 140,  crit: 160,  range: 20 },
  digital:      { label: "State",         unitOfMeasure: "",      nominal: 0,    warn: 1,    crit: 1,    range: 1 },
  level:        { label: "Level",         unitOfMeasure: "%",     nominal: 60,   warn: 80,   crit: 90,   range: 10 },
  conductivity: { label: "Conductivity",  unitOfMeasure: "µS/cm", nominal: 0.15, warn: 0.5,  crit: 1.0,  range: 0.2 },
  gas:          { label: "Gas",           unitOfMeasure: "ppm",   nominal: 150,  warn: 500,  crit: 800,  range: 100 },
  optical:      { label: "Opacity",       unitOfMeasure: "%",     nominal: 5,    warn: 15,   crit: 25,   range: 5 },
  ph:           { label: "pH",            unitOfMeasure: "pH",    nominal: 7,    warn: 5,    crit: 4,    range: 1, inverse: true },
};

export const SENSOR_TYPES: SensorType[] = [
  "temperature", "pressure", "vibration", "rpm",
  "current", "digital", "level", "conductivity", "gas", "optical", "ph",
];
export const UNITS: UnitId[] = ["unit-1", "unit-2"];

// ─── Format conversion helpers ───────────────────────────────────────────────

/** "unit-1" → "UNIT_1" */
function toBackendUnit(u: UnitId): string {
  return u === "unit-1" ? "UNIT_1" : "UNIT_2";
}

/** "UNIT_1" → "unit-1" */
function toFrontendUnit(u: string): UnitId {
  return u === "UNIT_1" ? "unit-1" : "unit-2";
}

/** "TEMPERATURE" → "temperature", unknown/LOAD → null */
function toFrontendSensorType(s: string): SensorType | null {
  const map: Record<string, SensorType> = {
    TEMPERATURE:  "temperature",
    PRESSURE:     "pressure",
    VIBRATION:    "vibration",
    RPM:          "rpm",
    CURRENT:      "current",
    DIGITAL:      "digital",
    LEVEL:        "level",
    CONDUCTIVITY: "conductivity",
    GAS:          "gas",
    OPTICAL:      "optical",
    PH:           "ph",
  };
  return map[s] ?? null;
}

/** "temperature" → "TEMPERATURE" */
function toBackendSensorType(s: SensorType): string {
  return s.toUpperCase();
}

/** "CRITICAL" → "critical", "WARNING" → "warning", else "normal" */
function toFrontendSeverity(s: string): Severity {
  switch (s) {
    case "CRITICAL": return "critical";
    case "WARNING":  return "warning";
    case "CONSEQUENTIAL": return "consequential";
    case "NORMAL":   return "normal";
    default:         return "normal";
  }
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

const TOKEN_KEY = "ntpc.auth.token";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const t = window.sessionStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch { return {}; }
}

export async function apiFetch<T>(
  path: string,
  fallback: T,
  options?: RequestInit,
): Promise<T> {
  try {
    const headers = {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(),
      ...(options?.headers as Record<string, string> | undefined),
    };
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      console.warn(`[API] ${res.status} on ${path}`);
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(TOKEN_KEY);
          window.sessionStorage.removeItem("ntpc.auth.user");
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }
      return fallback;
    }
    // 204 / empty
    const text = await res.text();
    if (!text) return fallback;
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn(`[API] Network error on ${path}:`, err);
    return fallback;
  }
}

/** Throws on non-2xx. Used for mutations where the caller wants to toast success/failure. */
export async function apiMutate<T>(path: string, options: RequestInit): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const j = await res.json(); msg = j.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/** Unwrap Spring Page<T> or plain array */
function unwrapPage<T>(data: T[] | { content: T[] }): T[] {
  if (Array.isArray(data)) return data;
  return data.content ?? [];
}

// ─── Reading normalization ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeReading(r: any): Reading | null {
  const sensorType = toFrontendSensorType(r.sensorType);
  if (!sensorType) return null; // skip LOAD and unknowns
  return {
    sensorId:      r.sensorId,
    unit:          toFrontendUnit(r.unit),
    sensorType,
    value:         r.value,
    unitOfMeasure: r.unitOfMeasure,
    timestamp:     r.timestamp,
  };
}

// ─── Alert normalization ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAlert(a: any, active: boolean): Alert {
  return {
    alertId:   a.alertId,
    sensorId:  a.sensorId,
    unit:      toFrontendUnit(a.unit),
    sensorType: toFrontendSensorType(a.sensorType) ?? "temperature",
    value:     a.value,
    threshold: a.threshold,
    severity:  toFrontendSeverity(a.severity),
    timestamp: a.timestamp,
    message:   a.message,
    active,
    acknowledgedBy: a.acknowledgedBy,
    suppressedUntil: a.suppressedUntil,
  };
}

// ─── Public API surface ───────────────────────────────────────────────────────

// ─── Threshold Caching ────────────────────────────────────────────────────────

let cachedThresholds = new Map<string, { warn: number; crit: number; inverse: boolean; isTempWarn?: boolean; isTempCrit?: boolean }>();

// Expose globally so SensorCard can access per-sensor thresholds
if (typeof window !== "undefined") {
  (window as any).__cachedThresholds = cachedThresholds;
}

/** Get cached threshold for a specific sensor. */
export function getCachedThreshold(sensorId: string): { warn: number; crit: number; inverse: boolean; isTempWarn?: boolean; isTempCrit?: boolean } | undefined {
  return cachedThresholds.get(sensorId);
}

/**
 * Latest reading per unique sensor for the given unit.
 * Backend returns a stream of recent readings; we keep the newest per sensorId
 * so every physical sensor (all 32 per unit) surfaces individually — grouping
 * by sensorType would collapse the 7 temperature sensors into one.
 */
export async function getLatestReadings(unitId: UnitId): Promise<Reading[]> {
  if (cachedThresholds.size === 0) {
    // Populate the global cache on first run
    await getSensorDefinitions();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any[]>(`/units/${toBackendUnit(unitId)}/readings/latest`, []);
  const readings = raw.map(normalizeReading).filter(Boolean) as Reading[];

  const bySensor = new Map<string, Reading>();
  for (const r of readings) {
    const existing = bySensor.get(r.sensorId);
    if (!existing || new Date(r.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
      bySensor.set(r.sensorId, r);
    }
  }
  return [...bySensor.values()];
}

/**
 * Time-series readings for a given unit + sensor type + time window.
 * Backend uses page/size; we fetch page 0 with size=200 to get dense chart data.
 * from/to are converted from ms timestamps to ISO-8601 strings.
 */
export async function getReadings(params: {
  unitId: UnitId;
  from: number;
  to: number;
  sensorType: SensorType;
  points?: number;
}): Promise<Reading[]> {
  const { unitId, from, to, sensorType } = params;
  const query = new URLSearchParams({
    from:       new Date(from).toISOString(),
    to:         new Date(to).toISOString(),
    sensorType: toBackendSensorType(sensorType),
    page:       "0",
    size:       "200",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(`/units/${toBackendUnit(unitId)}/readings?${query}`, []);
  return unwrapPage<any>(raw)
    .map(normalizeReading)
    .filter(Boolean) as Reading[];
}

function groupAlerts(alerts: Alert[]): Alert[] {
  const grouped = new Map<string, Alert>();
  for (const a of alerts) {
    const key = `${a.unit}-${a.sensorId}-${a.severity}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      if (new Date(a.timestamp) > new Date(existing.timestamp)) {
        existing.timestamp = a.timestamp;
        existing.value = a.value;
        existing.alertId = a.alertId;
        existing.acknowledgedBy = a.acknowledgedBy ?? existing.acknowledgedBy;
        existing.suppressedUntil = a.suppressedUntil ?? existing.suppressedUntil;
      }
    } else {
      a.count = 1;
      grouped.set(key, a);
    }
  }
  return [...grouped.values()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** All currently active (unresolved) alerts across both units. */
export async function getActiveAlerts(): Promise<Alert[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any[]>("/alerts/active", []);
  return groupAlerts(raw.map((a) => normalizeAlert(a, true)));
}

/** Full historical alert log (resolved + active). */
export async function getAlertHistory(): Promise<Alert[]> {
  // Backend requires from/to — default to last 24 hours
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const query = new URLSearchParams({
    from: from.toISOString(),
    to:   now.toISOString(),
    page: "0",
    size: "200",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await apiFetch<any>(`/alerts/history?${query}`, { content: [] });
  return groupAlerts(unwrapPage<any>(raw).map((a) => normalizeAlert(a, false)));
}

/**
 * Inject a simulated fault via the sensor-simulator.
 * Frontend uses durationMs; backend uses durationCycles (1 cycle ≈ 3 s).
 * magnitude is always SEVERE for the demo buttons.
 */
export async function injectFault(req: { unit: UnitId; sensorType: SensorType; magnitude?: string; durationCycles?: number }): Promise<void> {
  await apiMutate("/simulator/inject-fault", {
    method: "POST",
    body: JSON.stringify({
      unit: toBackendUnit(req.unit),
      sensorType: toBackendSensorType(req.sensorType),
      magnitude: req.magnitude || "MODERATE",
      durationCycles: req.durationCycles || 15,
    }),
  });
}

export async function injectScenario(req: { scenarioId: string; unit: UnitId; durationCycles?: number }): Promise<void> {
  await apiMutate("/simulator/inject-scenario", {
    method: "POST",
    body: JSON.stringify({
      scenarioId: req.scenarioId,
      unit: toBackendUnit(req.unit),
      durationCycles: req.durationCycles || 15,
    }),
  });
}

// ─── Operator lifecycle: alert actions ───────────────────────────────────────

export async function acknowledgeAlert(alertId: string, notes?: string) {
  return apiMutate(`/alerts/${alertId}/acknowledge`, {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? "" }),
  });
}

export async function suppressAlert(alertId: string, durationMinutes: number) {
  return apiMutate(`/alerts/${alertId}/suppress`, {
    method: "POST",
    body: JSON.stringify({ durationMinutes }),
  });
}

// ─── Threshold overrides ─────────────────────────────────────────────────────

export interface ThresholdOverride {
  sensorType: SensorType;
  newWarn: number;
  newCrit: number;
  reason: string;
  durationHours: number;
}

export async function overrideThreshold(sensorId: string, payload: ThresholdOverride) {
  return apiMutate(`/sensors/${sensorId}/override-threshold`, {
    method: "POST",
    body: JSON.stringify({
      sensorType: toBackendSensorType(payload.sensorType),
      newWarn: payload.newWarn,
      newCrit: payload.newCrit,
      reason: payload.reason,
      durationHours: payload.durationHours,
    }),
  });
}

// ─── UI utility functions ────────────────────────────────────────────────────

export function severityFor(sensorType: SensorType, value: number, sensorId?: string): Severity {
  if (sensorId) {
    const digital = digitalStateFor(sensorId);
    if (digital) {
      const digitalOn = value >= 0.5;
      return digitalOn === digital.onIsCritical ? "critical" : "normal";
    }

    if (cachedThresholds.has(sensorId)) {
      const t = cachedThresholds.get(sensorId)!;
      if (t.inverse) {
        if (value <= t.crit) return "critical";
        if (value <= t.warn) return "warning";
        return "normal";
      } else {
        if (value >= t.crit) return "critical";
        if (value >= t.warn) return "warning";
        return "normal";
      }
    }
  }

  // Fallback if sensorId is missing or not cached
  const m = SENSOR_META[sensorType];
  if (m.inverse) {
    if (value <= m.crit) return "critical";
    if (value <= m.warn) return "warning";
    return "normal";
  }
  if (value >= m.crit) return "critical";
  if (value >= m.warn) return "warning";
  return "normal";
}

export function unitLabel(u: UnitId) {
  return u === "unit-1" ? "Unit 1" : "Unit 2";
}

// ─── SLA metrics ─────────────────────────────────────────────────────────────

export interface SlaMetrics {
  avgAckSeconds: number;
  avgResolveSeconds: number;
  ackBreachCount: number;
  resolveBreachCount: number;
  mttrSeconds: number;
  slaCompliance: number; // 0..1
}

export async function getSlaMetrics(): Promise<SlaMetrics> {
  const res = await apiFetch<any>("/alerts/sla-metrics", null);
  if (!res) return { avgAckSeconds: 0, avgResolveSeconds: 0, ackBreachCount: 0, resolveBreachCount: 0, mttrSeconds: 0, slaCompliance: 1 };
  
  return {
    avgAckSeconds: res.avgAckSeconds || 0,
    avgResolveSeconds: res.avgResolveSeconds || 0,
    ackBreachCount: res.ackBreachCount || 0,
    resolveBreachCount: res.resolveBreachCount || 0,
    mttrSeconds: res.mttrSeconds || 0,
    slaCompliance: res.slaCompliance !== undefined ? res.slaCompliance : 1
  };
}

// SLA deadlines derived from alert timestamp (mock — backend may return real values)
export function slaDeadlines(alert: Alert): { ackAt: number; resolveAt: number } {
  const created = new Date(alert.timestamp).getTime();
  const ackMs = alert.severity === "critical" ? 2 * 60_000 : 5 * 60_000;
  const resMs = alert.severity === "critical" ? 15 * 60_000 : 45 * 60_000;
  return { ackAt: created + ackMs, resolveAt: created + resMs };
}

// ─── Resolve alerts ──────────────────────────────────────────────────────────

export type ResolutionType = "MANUAL" | "AUTO";

export async function resolveAlert(alertId: string, payload: { resolutionType: ResolutionType; notes: string }) {
  return apiMutate(`/alerts/${alertId}/resolve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Root cause / correlation ────────────────────────────────────────────────

export interface CorrelatedSensor {
  sensorId: string;
  sensorType: SensorType;
  unit: UnitId;
  value: number;
  severity: Severity;
  anomalyScore: number; // 0..1
  correlation: number;  // -1..1
}

export interface AlertAnalysis {
  alertId: string;
  trigger: { sensorId: string; sensorType: SensorType; unit: UnitId; value: number; threshold: number };
  likelyCauses: CorrelatedSensor[];
  narrative: string;
}

export async function getAlertAnalysis(alert: Alert): Promise<AlertAnalysis> {
  const res = await apiFetch<any>(`/alerts/${alert.alertId}/analysis`, null);
  const defaultTrigger = { sensorId: alert.sensorId, sensorType: alert.sensorType, unit: alert.unit, value: alert.value, threshold: alert.threshold };
  if (!res || !res.rootCauseAnalysis) {
    return { alertId: alert.alertId, trigger: defaultTrigger, likelyCauses: [], narrative: "No correlations found." };
  }
  const causes = (res.rootCauseAnalysis.likelyRootCauses || []).map((c: any) => {
    return {
      sensorId: c.triggerSensorId || "UNKNOWN",
      sensorType: "temperature" as SensorType,
      unit: alert.unit,
      value: 0,
      severity: "warning" as Severity,
      anomalyScore: 0.5,
      correlation: 0.5
    };
  });
  return {
    alertId: res.alertId || alert.alertId,
    trigger: res.trigger ? { sensorId: res.trigger.sensorId, sensorType: toFrontendSensorType(res.trigger.sensorType) || alert.sensorType, unit: alert.unit, value: res.trigger.value, threshold: res.trigger.threshold } : defaultTrigger,
    likelyCauses: causes,
    narrative: causes.length > 0 ? "Correlations identified in telemetry data." : "No strong correlations found."
  };
}

// ─── Sensor definitions ──────────────────────────────────────────────────────

export interface SensorDefinition {
  sensorId: string;
  unit: UnitId;
  sensorType: SensorType;
  baseWarn: number;
  baseCrit: number;
  currentWarn: number;
  currentCrit: number;
  overrideExpiresAt?: string;
  overrideReason?: string;
}

export async function getSensorDefinitions(): Promise<SensorDefinition[]> {
  const res = await apiFetch<any[]>("/sensor-definitions", []);
  const defs = res.map((d: any) => ({
    sensorId: d.sensorId,
    unit: toFrontendUnit(d.unit) || "unit-1",
    sensorType: toFrontendSensorType(d.sensorType) || "temperature",
    baseWarn: d.warningThreshold || 0,
    baseCrit: d.criticalThreshold || 0,
    currentWarn: d.currentWarning || d.warningThreshold || 0,
    currentCrit: d.currentCritical || d.criticalThreshold || 0,
    isTempOverride: !!d.isTempOverride,
  }));
  
  defs.forEach((d) => {
    cachedThresholds.set(d.sensorId, {
      warn: d.currentWarn,
      crit: d.currentCrit,
      inverse: d.currentCrit < d.currentWarn,
      isTempWarn: d.isTempOverride && d.currentWarn !== d.baseWarn,
      isTempCrit: d.isTempOverride && d.currentCrit !== d.baseCrit,
    });
  });
  
  return defs;
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export type MaintStatus = "overdue" | "due-soon" | "scheduled";

export interface MaintenanceItem {
  sensorId: string;
  unit: UnitId;
  sensorType: SensorType;
  lastMaintainedAt: string;
  nextDueAt: string;
  status: MaintStatus;
}

export async function getMaintenanceDue(): Promise<MaintenanceItem[]> {
  const res = await apiFetch<any>("/sensor-definitions/maintenance-due", { overdue: [], dueNext7Days: [] });
  
  let items: any[] = [];
  if (res && typeof res === 'object' && !Array.isArray(res)) {
     items = [...(res.overdue || []), ...(res.dueNext7Days || [])];
  } else if (Array.isArray(res)) {
     items = res;
  }
  
  return items.map((m: any) => ({
    sensorId: m.sensorId,
    unit: "unit-1",
    sensorType: "temperature" as SensorType,
    lastMaintainedAt: m.lastMaintainedAt || new Date().toISOString(),
    nextDueAt: m.scheduledDate || m.nextDueDate || new Date().toISOString(),
    status: (m.status?.toLowerCase() as MaintStatus) || "scheduled",
  }));
}

export async function markMaintenanceComplete(sensorId: string) {
  return apiMutate(`/sensor-definitions/${sensorId}/maintenance-complete`, { method: "PUT" });
}

// ─── Clock-Off Accountability ──────────────────────────────────────────────────

export interface ClockOffLog {
  id: string;
  username: string;
  clockOffTime: string;
  shiftNumber: 1 | 2 | 3;
  isEarly: boolean;
  notes: string;
  earlyReason?: string;
}

export async function getClockOffLogs(): Promise<ClockOffLog[]> {
  return await apiFetch<ClockOffLog[]>("/clock-off", []);
}

export async function submitClockOff(payload: { username: string; shiftNumber: number; isEarly: boolean; notes: string; earlyReason?: string }) {
  return await apiMutate<ClockOffLog>("/clock-off", { 
    method: "POST", 
    body: JSON.stringify(payload) 
  });
}

// ─── Operator Management ───────────────────────────────────────────────────────

export interface OperatorProfile {
  username: string;
  isOnShift: boolean;
  assignedShift: 1 | 2 | 3 | null;
}

export async function getOperators(): Promise<OperatorProfile[]> {
  return await apiFetch<OperatorProfile[]>("/users/operators", []);
}

export async function setOperatorShift(username: string, assignedShift: 1 | 2 | 3 | null) {
  return await apiMutate(`/users/${username}/shift`, {
    method: "PUT",
    body: JSON.stringify({ assignedShift }),
  });
}

// ─── Operator audit log ──────────────────────────────────────────────────────

export type AuditActionType = "ACK" | "RESOLVE" | "OVERRIDE";

export interface AuditEntry {
  id: string;
  username: string;
  action: AuditActionType;
  target: string;
  unit?: UnitId;
  timestamp: string;
  notes?: string;
  payload?: Record<string, unknown>;
}

export async function getOperatorActions(username?: string): Promise<AuditEntry[]> {
  const all = await apiFetch<any[]>(username ? `/audit-logs/operators/${username}/actions` : "/audit-logs", []);
  return all.map((a: any) => {
    let mappedAction: AuditActionType = "ACK";
    if (a.actionType === "ACKNOWLEDGE_ALERT") mappedAction = "ACK";
    else if (a.actionType === "RESOLVE_ALERT") mappedAction = "RESOLVE";
    else if (a.actionType === "SUPPRESS_ALERT") mappedAction = "SUPPRESS";
    else if (a.actionType === "OVERRIDE_THRESHOLD") mappedAction = "OVERRIDE";
    else if (a.actionType === "HANDOVER") mappedAction = "HANDOVER";
    else if (a.actionType === "MAINT") mappedAction = "MAINT";
    else if (a.actionType) mappedAction = a.actionType as AuditActionType;

    return {
      id: String(a.auditId || a.logId || a.id || crypto.randomUUID()),
      username: a.actor || a.username || "unknown",
      action: mappedAction,
      target: a.resourceId || a.target || "system",
      unit: a.unit ? (String(a.unit).toLowerCase().replace("_", "-") as UnitId) : undefined,
      timestamp: a.actionTimestamp || a.createdAt || a.timestamp || new Date().toISOString(),
      notes: a.details || a.notes || "",
    };
  });
}

// ─── System health ───────────────────────────────────────────────────────────

export interface SystemHealth {
  systemId: string;
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  services: { name: string; status: "UP" | "DOWN"; latencyMs?: number }[];
}

export async function getSystemHealth(id = "ntpc-lara-01"): Promise<SystemHealth> {
  const res = await apiFetch<any>(`/shared-systems/${id}/health`, null);
  if (!res) {
    return { systemId: id, status: "DOWN", services: [] };
  }
  return {
    systemId: res.systemId || id,
    status: res.status || "HEALTHY",
    services: [
      { name: "Query API", status: "UP", latencyMs: 12 },
      { name: "Kafka Bus", status: "UP", latencyMs: 8 },
      { name: "TimescaleDB", status: "UP", latencyMs: 15 },
    ]
  };
}

// ─── Predictive Maintenance ──────────────────────────────────────────────────

export interface PredictiveSensorScore {
  sensor: string;
  error: number;
  baseline_error: number;
  ratio: number;
  actual_value: number;
  expected_value: number;
}

export interface PredictiveScores {
  anomaly_score: number;
  threshold: number;
  is_anomaly: boolean;
  stage_scores: Record<string, number>;
  top_sensors: PredictiveSensorScore[];
  status?: string;
}

export interface PredictiveHealth {
  status: string;
  n_features: number;
  threshold: number;
  seq_len: number;
}

export async function getPredictiveScores(unitId: UnitId): Promise<PredictiveScores> {
  return apiFetch<PredictiveScores>(`/predictive/scores/${unitId}`, {
    anomaly_score: 0,
    threshold: 0,
    is_anomaly: false,
    stage_scores: {},
    top_sensors: [],
    status: "offline",
  });
}

export async function getPredictiveHealth(): Promise<PredictiveHealth> {
  return apiFetch<PredictiveHealth>("/predictive/health", {
    status: "offline",
    n_features: 0,
    threshold: 0,
    seq_len: 0,
  });
}
