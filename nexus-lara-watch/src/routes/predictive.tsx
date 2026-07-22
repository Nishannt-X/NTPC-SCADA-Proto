import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getPredictiveScores, getPredictiveHealth, type UnitId, type PredictiveScores, type PredictiveSensorScore } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, CheckCircle2, Cpu, Flame, Droplets, Zap, Wind, Gauge, BrainCircuit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/predictive")({
  component: PredictivePage,
});

const STAGE_META: Record<string, { label: string; icon: typeof Flame; color: string }> = {
  fuel:       { label: "Fuel Handling",   icon: Flame,    color: "text-orange-400" },
  boiler:     { label: "Boiler Island",   icon: Activity, color: "text-red-400" },
  turbine:    { label: "Turbine-Gen",     icon: Gauge,    color: "text-blue-400" },
  water:      { label: "Water Cycle",     icon: Droplets, color: "text-cyan-400" },
  electrical: { label: "Electrical",      icon: Zap,      color: "text-yellow-400" },
  emissions:  { label: "Emissions",       icon: Wind,     color: "text-green-400" },
};

function AnomalyGauge({ score, threshold }: { score: number; threshold: number }) {
  const pct = threshold > 0 ? Math.min((score / threshold) * 100, 200) : 0;
  const isAnomaly = score > threshold;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-36">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            strokeWidth="6"
            strokeDasharray={`${Math.min(pct, 100) * 2.64} 264`}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-700",
              isAnomaly ? "text-status-critical" : pct > 60 ? "text-yellow-400" : "text-status-normal"
            )}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-num font-bold", isAnomaly ? "text-status-critical" : "text-foreground")}>
            {score.toFixed(4)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">MSE</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-num">Threshold: {threshold.toFixed(4)}</span>
        {isAnomaly ? (
          <span className="px-1.5 py-0.5 rounded bg-status-critical/15 text-status-critical text-[10px] font-bold uppercase">Anomaly</span>
        ) : (
          <span className="px-1.5 py-0.5 rounded bg-status-normal/15 text-status-normal text-[10px] font-bold uppercase">Normal</span>
        )}
      </div>
    </div>
  );
}

function StageCard({ stage, score, threshold }: { stage: string; score: number; threshold: number }) {
  const meta = STAGE_META[stage];
  if (!meta) return null;
  const Icon = meta.icon;
  const ratio = threshold > 0 ? score / threshold : 0;
  const severity = ratio > 1 ? "critical" : ratio > 0.6 ? "warning" : "normal";

  return (
    <div className={cn(
      "rounded-lg border p-4 transition-all",
      severity === "critical" ? "border-status-critical/40 bg-status-critical/5" :
      severity === "warning" ? "border-yellow-500/40 bg-yellow-500/5" :
      "border-border bg-surface"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("size-4", meta.color)} />
        <span className="text-sm font-medium">{meta.label}</span>
      </div>
      <div className="font-num text-lg font-bold">{score.toFixed(5)}</div>
      <div className="mt-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            severity === "critical" ? "bg-status-critical" :
            severity === "warning" ? "bg-yellow-400" : "bg-status-normal"
          )}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground font-num">
        {(ratio * 100).toFixed(1)}% of threshold
      </div>
    </div>
  );
}

function SensorInsightDialog({ sensor, onClose }: { sensor: PredictiveSensorScore | null; onClose: () => void }) {
  if (!sensor) return null;
  
  const isCritical = sensor.ratio > 3;
  const isWarning = sensor.ratio > 1.5;

  let rootCause = `The sensor is deviating significantly from its historically learned correlation with other plant sensors. The neural network expected this to read around ${sensor.expected_value.toFixed(2)}, but it is currently reading ${sensor.actual_value.toFixed(2)}.`;
  let recommendation = "Schedule inspection during the next maintenance window.";

  if (sensor.sensor.includes("VIB")) {
    rootCause = `High reconstruction error in vibration patterns suggests mechanical wear, misalignment, or bearing degradation. The model expected ${sensor.expected_value.toFixed(2)} mm/s based on current motor RPM, but actual vibration is ${sensor.actual_value.toFixed(2)} mm/s.`;
    recommendation = "Inspect bearing lubrication and run spectral vibration analysis.";
  } else if (sensor.sensor.includes("TEMP")) {
    rootCause = `Thermal deviation detected. The temperature is acting independently of the expected thermodynamic cycle. The model expected ${sensor.expected_value.toFixed(2)}°C, but the sensor reads ${sensor.actual_value.toFixed(2)}°C.`;
    recommendation = "Check cooling flow and verify physical sensor calibration.";
  } else if (sensor.sensor.includes("PRES") || sensor.sensor.includes("VACUUM")) {
    rootCause = `Pressure anomaly detected. The relationship between steam pressure, temperature, and drum levels has broken down. Expected: ${sensor.expected_value.toFixed(2)}, Actual: ${sensor.actual_value.toFixed(2)}.`;
    recommendation = "Inspect valves, seals, and check for micro-leaks in the pressure vessel.";
  }
  
  // Calculate a visual delta percentage for the bar
  const delta = Math.abs(sensor.actual_value - sensor.expected_value);
  const maxRange = Math.max(Math.abs(sensor.actual_value), Math.abs(sensor.expected_value), 1.0);
  const deltaPct = Math.min((delta / maxRange) * 100, 100);

  return (
    <Dialog open={!!sensor} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-primary" />
            AI Insight: {sensor.sensor}
          </DialogTitle>
          <DialogDescription>
            LSTM Autoencoder Prediction Breakdown
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          
          {/* Expected vs Actual Visualizer */}
          <div className="p-4 rounded-lg bg-surface/50 border border-border space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected Value</span>
              <span className="font-num font-medium text-foreground">{sensor.expected_value.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Actual Sensor Reading</span>
              <span className="font-num font-bold text-foreground">{sensor.actual_value.toFixed(4)}</span>
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                <span>Delta</span>
                <span className={cn(isCritical ? "text-status-critical" : isWarning ? "text-yellow-400" : "text-status-normal")}>
                  {delta.toFixed(4)} (Off by {deltaPct.toFixed(1)}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", isCritical ? "bg-status-critical" : isWarning ? "bg-yellow-400" : "bg-status-normal")} 
                  style={{ width: `${Math.max(deltaPct, 2)}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border border-border p-4 rounded-lg bg-surface/50">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Current Error</div>
              <div className="font-num font-bold text-sm">{sensor.error.toFixed(5)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Expected Noise</div>
              <div className="font-num font-bold text-sm text-muted-foreground">{sensor.baseline_error.toFixed(5)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Deviation</div>
              <div className={cn("font-num font-bold text-sm", isCritical ? "text-status-critical" : isWarning ? "text-yellow-400" : "text-status-normal")}>
                {sensor.ratio.toFixed(1)}× Normal
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold mb-1">Why was this flagged?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{rootCause}</p>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold mb-1">Recommended Action</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{recommendation}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SensorTable({ scores }: { scores: PredictiveScores }) {
  const [selectedSensor, setSelectedSensor] = useState<PredictiveSensorScore | null>(null);

  return (
    <>
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Top Anomalous Sensors</h3>
          <p className="text-[10px] text-muted-foreground">Ranked by deviation from learned baseline</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Sensor</th>
                <th className="px-4 py-2 text-right font-medium">Error</th>
                <th className="px-4 py-2 text-right font-medium">Baseline</th>
                <th className="px-4 py-2 text-right font-medium">Ratio</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {scores.top_sensors.map((s) => (
                <tr 
                  key={s.sensor} 
                  onClick={() => setSelectedSensor(s)}
                  className="border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-2.5 font-num text-xs group-hover:text-primary transition-colors">{s.sensor}</td>
                  <td className="px-4 py-2.5 font-num text-xs text-right">{s.error.toFixed(5)}</td>
                  <td className="px-4 py-2.5 font-num text-xs text-right text-muted-foreground">{s.baseline_error.toFixed(5)}</td>
                  <td className="px-4 py-2.5 font-num text-xs text-right font-bold">
                    <span className={cn(
                      s.ratio > 3 ? "text-status-critical" :
                      s.ratio > 1.5 ? "text-yellow-400" : "text-foreground"
                    )}>
                      {s.ratio.toFixed(1)}×
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {s.ratio > 3 ? (
                      <AlertTriangle className="size-3.5 text-status-critical" />
                    ) : s.ratio > 1.5 ? (
                      <AlertTriangle className="size-3.5 text-yellow-400" />
                    ) : (
                      <CheckCircle2 className="size-3.5 text-status-normal" />
                    )}
                  </td>
                </tr>
              ))}
              {scores.top_sensors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-xs">
                    No sensor data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <SensorInsightDialog sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />
    </>
  );
}

function PredictivePage() {
  const [unit, setUnit] = useState<UnitId>("unit-1");

  const health = useQuery({
    queryKey: ["predictive", "health"],
    queryFn: getPredictiveHealth,
    refetchInterval: 10_000,
  });

  const scores = useQuery({
    queryKey: ["predictive", "scores", unit],
    queryFn: () => getPredictiveScores(unit),
    refetchInterval: 5_000,
  });

  const isOnline = health.data?.status === "ok";
  const data = scores.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Predictive Maintenance</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            LSTM Autoencoder anomaly detection · {health.data?.n_features || 0} sensors · seq_len={health.data?.seq_len || 0}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={cn("status-dot", isOnline ? "bg-status-normal pulse-live" : "bg-status-critical")} />
            <span className="text-xs text-muted-foreground">{isOnline ? "Model Online" : "Model Offline"}</span>
          </div>
          <div className="flex rounded-md border border-border overflow-hidden">
            {(["unit-1", "unit-2"] as UnitId[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  unit === u ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-accent"
                )}
              >
                <Cpu className="size-3 inline mr-1" />
                {u === "unit-1" ? "Unit 1" : "Unit 2"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      {data && data.status !== "offline" ? (
        <div className="space-y-6">
          {/* Top row: Gauge + Stage cards */}
          <div className="grid grid-cols-[auto_1fr] gap-6">
            <div className="rounded-lg border border-border bg-surface p-6 flex items-center justify-center">
              <AnomalyGauge score={data.anomaly_score} threshold={data.threshold} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(STAGE_META).map(([key]) => (
                <StageCard
                  key={key}
                  stage={key}
                  score={data.stage_scores[key] ?? 0}
                  threshold={data.threshold}
                />
              ))}
            </div>
          </div>

          {/* Sensor table */}
          <SensorTable scores={data} />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Cpu className="size-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-medium">ML Service Unavailable</h3>
          <p className="text-xs text-muted-foreground mt-1">
            The predictive maintenance model is not running. Start the ml-inference Docker container.
          </p>
        </div>
      )}
    </div>
  );
}
