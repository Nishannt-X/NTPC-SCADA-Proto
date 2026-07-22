import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown, ArrowUp, Minus, ChevronDown,
  Factory, Flame, Cog, Droplets, Zap, Wind, HelpCircle,
  type LucideIcon,
} from "lucide-react";
import {
  getLatestReadings, getActiveAlerts, getAlertHistory,
  SENSOR_META, severityFor, unitLabel, getCachedThreshold,
  type UnitId, type Reading, type Severity,
} from "@/lib/api";
import {
  SEGMENTS, segmentFor, prettySensorName, digitalStateFor,
  type Segment, UNCLASSIFIED,
} from "@/lib/segments";
import { AnimatedNumber, StatusChip, elapsed, severityColor } from "@/components/telemetry";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/unit/$unitId")({
  parseParams: (p) => {
    if (p.unitId !== "unit-1" && p.unitId !== "unit-2") throw notFound();
    return { unitId: p.unitId as UnitId };
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.unitId === "unit-1" ? "Unit 1" : "Unit 2"} · NTPC Lara Telemetry` },
      { name: "description", content: `Live sensor telemetry, trends, and alerts for ${params.unitId === "unit-1" ? "Unit 1" : "Unit 2"}.` },
    ],
  }),
  component: UnitDetail,
});

const RANGES = [
  { label: "5 min", ms: 5 * 60_000 },
  { label: "1 hr", ms: 60 * 60_000 },
  { label: "6 hr", ms: 6 * 60 * 60_000 },
  { label: "24 hr", ms: 24 * 60 * 60_000 },
];

const SEGMENT_ICON: Record<Segment, LucideIcon> = {
  "Fuel Handling & Prep":    Factory,
  "Boiler Island":           Flame,
  "Turbine-Generator":       Cog,
  "Water Cycle":             Droplets,
  "Electrical / Switchyard": Zap,
  "Emissions Control":       Wind,
};

function worstSeverity(sevs: Severity[]): Severity {
  if (sevs.includes("critical")) return "critical";
  if (sevs.includes("warning")) return "warning";
  if (sevs.includes("maintenance")) return "maintenance";
  return "normal";
}

function UnitDetail() {
  const { unitId } = Route.useParams();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const latest = useQuery({ queryKey: ["latest", unitId], queryFn: () => getLatestReadings(unitId), refetchInterval: 3000 });
  const active = useQuery({ queryKey: ["alerts", "active"], queryFn: getActiveAlerts, refetchInterval: 5000 });
  const history = useQuery({ queryKey: ["alerts", "history"], queryFn: getAlertHistory });

  // Overall severity across ALL sensors, regardless of collapse state.
  const overallSev = useMemo<Severity>(() => {
    if (!latest.data?.length) return "normal";
    return worstSeverity(latest.data.map((r) => severityFor(r.sensorType, r.value, r.sensorId)));
  }, [latest.data]);

  // Group readings by segment (exact suffix lookup — no substring matching).
  const grouped = useMemo(() => {
    const map = new Map<string, Reading[]>();
    for (const seg of SEGMENTS) map.set(seg, []);
    map.set(UNCLASSIFIED, []);
    for (const r of latest.data ?? []) {
      const seg = segmentFor(r.sensorId) ?? UNCLASSIFIED;
      map.get(seg)!.push(r);
    }
    return map;
  }, [latest.data]);

  const loadPct = (() => {
    const r = latest.data?.find((x) => x.sensorType === "rpm")?.value ?? 0;
    return Math.min(100, (r / SENSOR_META.rpm.crit) * 100);
  })();

  const unitAlerts = useMemo(() => {
    const all = [...(active.data ?? []), ...(history.data ?? [])].filter(a => a.unit === unitId);
    const uniqueMap = new Map<string, typeof all[0]>();
    for (const a of all) uniqueMap.set(a.alertId, a);
    return [...uniqueMap.values()]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  }, [active.data, history.data, unitId]);

  const totalSensors = latest.data?.length ?? 0;

  return (
    <div className="space-y-6 max-w-[1500px]">
      <PageHeader
        title={`${unitLabel(unitId)} · Detail`}
        subtitle={`Live telemetry across 6 physical segments · ${totalSensors} sensors reporting`}
      />

      {/* Status banner */}
      <div className={cn(
        "rounded-lg border p-5 flex items-center gap-6",
        overallSev === "critical" ? "border-status-critical/40 bg-status-critical-bg" :
        overallSev === "warning" ? "border-status-warning/40 bg-status-warning-bg" :
        "border-status-normal/30 bg-status-normal-bg",
      )}>
        <StatusChip severity={overallSev} />
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Overall Health</div>
          <div className="text-base font-medium mt-0.5">
            {overallSev === "critical" ? "Critical thresholds breached — operator action required" :
             overallSev === "warning" ? "Warning thresholds approached — monitoring closely" :
             "All sensors reporting within nominal operating range"}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Current Load</div>
          <div className="text-2xl font-num font-semibold">
            <AnimatedNumber value={loadPct} /> <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Segment sections */}
      <div className="space-y-4">
        {[...SEGMENTS, UNCLASSIFIED].map((seg) => {
          const readings = grouped.get(seg) ?? [];
          if (seg === UNCLASSIFIED && readings.length === 0) return null;
          return (
            <SegmentSection
              key={seg}
              segment={seg}
              readings={readings}
              collapsed={!!collapsed[seg]}
              onToggle={() => setCollapsed((c) => ({ ...c, [seg]: !c[seg] }))}
            />
          );
        })}
      </div>

      {/* Unit alerts table */}
      <section className="rounded-lg border border-border bg-card">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Alerts · {unitLabel(unitId)}</h2>
          <span className="text-xs text-muted-foreground font-num">{unitAlerts.length} shown</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-medium px-5 py-2">Severity</th>
              <th className="text-left font-medium px-2 py-2">Sensor</th>
              <th className="text-right font-medium px-2 py-2">Value</th>
              <th className="text-right font-medium px-2 py-2">Threshold</th>
              <th className="text-left font-medium px-2 py-2">Message</th>
              <th className="text-right font-medium px-5 py-2">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {unitAlerts.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No alerts for this unit.</td></tr>
            )}
            {unitAlerts.map((a) => (
              <tr key={a.alertId} className="hover:bg-accent/30">
                <td className="px-5 py-2"><StatusChip severity={a.severity} /></td>
                <td className="px-2 py-2">
                  <div className="font-medium text-sm flex items-center">
                    {SENSOR_META[a.sensorType].label}
                    {a.count && a.count > 1 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-status-warning-bg/50 text-status-warning font-semibold text-[10px]">
                        {a.count}x
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Sensor: {a.sensorId}</div>
                </td>
                <td className="px-2 py-2 text-right font-num">{a.value}{SENSOR_META[a.sensorType].unitOfMeasure}</td>
                <td className="px-2 py-2 text-right font-num text-muted-foreground">{a.threshold}{SENSOR_META[a.sensorType].unitOfMeasure}</td>
                <td className="px-2 py-2 text-muted-foreground truncate max-w-xs">{a.message}</td>
                <td className="px-5 py-2 text-right font-num text-xs text-muted-foreground">{elapsed(a.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function SegmentSection({
  segment, readings, collapsed, onToggle,
}: {
  segment: Segment | typeof UNCLASSIFIED;
  readings: Reading[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const isUnclassified = segment === UNCLASSIFIED;
  const Icon = isUnclassified ? HelpCircle : SEGMENT_ICON[segment as Segment];

  const sev = useMemo<Severity>(() => {
    if (!readings.length) return "normal";
    return worstSeverity(readings.map((r) => severityFor(r.sensorType, r.value, r.sensorId)));
  }, [readings]);

  const accentBar =
    sev === "critical" ? "bg-status-critical" :
    sev === "warning" ? "bg-status-warning" :
    sev === "maintenance" ? "bg-status-maint" :
    "bg-status-normal/60";

  return (
    <section className={cn(
      "rounded-lg border bg-card overflow-hidden",
      isUnclassified ? "border-status-warning/50" : "border-border",
    )}>
      <header className="flex items-stretch">
        <span className={cn("w-1 shrink-0", accentBar)} aria-hidden />
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
        >
          <span className={cn(
            "size-8 rounded-md grid place-items-center border",
            isUnclassified
              ? "border-status-warning/40 bg-status-warning-bg text-status-warning"
              : "border-border bg-surface text-muted-foreground",
          )}>
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight uppercase">
              {segment}
              {isUnclassified && (
                <span className="ml-2 text-[10px] font-num normal-case text-status-warning">
                  (missing from SEGMENT_MAP — please classify)
                </span>
              )}
            </h3>
            <div className="text-[11px] text-muted-foreground font-num mt-0.5">
              {readings.length} sensor{readings.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <StatusChip severity={sev} />
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
          </div>
        </button>
      </header>
      {!collapsed && (
        <div className="p-3 border-t border-border">
          {readings.length === 0 ? (
            <div className="px-2 py-6 text-xs text-muted-foreground text-center">No live readings for this segment.</div>
          ) : (
            <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {readings.map((r) => <SensorCard key={r.sensorId} reading={r} />)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

function SensorCard({ reading }: { reading: Reading }) {
  const prevValue = usePrevious(reading.value);
  const meta = SENSOR_META[reading.sensorType];
  const sev = severityFor(reading.sensorType, reading.value, reading.sensorId);
  const digital = digitalStateFor(reading.sensorId);
  const label = prettySensorName(reading.sensorId);

  const Arrow = prevValue === undefined ? Minus
    : reading.value > prevValue ? ArrowUp
    : reading.value < prevValue ? ArrowDown
    : Minus;
  const arrowColor = sev === "critical" ? "text-status-critical"
    : sev === "warning" ? "text-status-warning"
    : "text-status-normal";

  // Digital cards derive severity from the state-def, ignoring numeric thresholds.
  const digitalOn = digital ? reading.value >= 0.5 : false;
  const digitalSev: Severity = digital
    ? (digitalOn === digital.onIsCritical ? "critical" : "normal")
    : sev;

  const ringClass =
    digitalSev === "critical" ? "border-status-critical/60 shadow-[0_0_0_1px_var(--status-critical),0_0_14px_-4px_var(--status-critical)]" :
    digitalSev === "warning" ? "border-status-warning/50" :
    "border-border";

  return (
    <div className={cn(
      "rounded-md border bg-card p-3 flex flex-col gap-2 min-h-[104px] transition-colors",
      ringClass,
    )}>
      <div className="flex items-start gap-2">
        <span
          className="text-[10.5px] uppercase tracking-wider text-muted-foreground leading-tight line-clamp-2 flex-1"
          title={reading.sensorId}
        >
          {label}
        </span>
        <StatusChip severity={digitalSev} className="shrink-0 !px-1.5 !py-0" />
      </div>

      {digital ? (
        <div className="flex-1 flex items-center">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-num text-sm font-semibold tracking-wider border",
              digitalSev === "critical"
                ? "bg-status-critical-bg text-status-critical border-status-critical/40"
                : "bg-status-normal-bg text-status-normal border-status-normal/40",
            )}
          >
            <span className={cn(
              "size-1.5 rounded-full",
              digitalSev === "critical" ? "bg-status-critical" : "bg-status-normal",
            )} />
            {digitalOn ? digital.onLabel : digital.offLabel}
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <div className="text-2xl font-num font-semibold leading-none" style={{ color: severityColor(sev) }}>
              <AnimatedNumber value={reading.value} decimals={reading.sensorType === "vibration" || reading.sensorType === "conductivity" || reading.sensorType === "ph" ? 2 : 1} />
            </div>
            <span className="text-[11px] text-muted-foreground">{reading.unitOfMeasure || meta.unitOfMeasure}</span>
            <Arrow className={cn("size-3.5 ml-auto", arrowColor)} />
          </div>
          <div>
            {(() => {
              const thresholds = getCachedThreshold(reading.sensorId);
              const w = thresholds?.warn ?? meta.warn;
              const c = thresholds?.crit ?? meta.crit;
              
              const range = Math.abs(c - w) || 1;
              const minDisp = w > c ? w + range * 2 : w - range * 2;
              const maxDisp = c;
              
              let pct = ((reading.value - minDisp) / (maxDisp - minDisp)) * 100;
              pct = Math.max(0, Math.min(100, pct));

              return (
                <div className="mt-3">
                  <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(3, pct)}%`,
                        background: severityColor(sev),
                      }}
                    />
                  </div>
                  <div className="relative mt-1.5 h-3 text-[9px] text-muted-foreground font-num">
                    <span className="absolute left-0 opacity-40">{minDisp.toFixed(0)}</span>
                    <span className="absolute" style={{ left: '66.6%', transform: 'translateX(-50%)' }}>
                      w {w} {thresholds?.isTempWarn && <span className="text-status-warning font-sans font-semibold text-[8px]">(T)</span>}
                    </span>
                    <span className="absolute right-0 text-status-critical/80">
                      c {c} {thresholds?.isTempCrit && <span className="text-status-warning font-sans font-semibold text-[8px]">(T)</span>}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
