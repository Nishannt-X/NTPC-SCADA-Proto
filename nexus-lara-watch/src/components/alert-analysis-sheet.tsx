import { useQuery } from "@tanstack/react-query";
import { Radar, Waves, ArrowRight, Loader2 } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { getAlertAnalysis, SENSOR_META, unitLabel, type Alert } from "@/lib/api";
import { StatusChip } from "@/components/telemetry";
import { cn } from "@/lib/utils";

export function AlertAnalysisSheet({
  alert, open, onOpenChange,
}: { alert: Alert | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const q = useQuery({
    queryKey: ["alerts", "analysis", alert?.alertId],
    queryFn: () => getAlertAnalysis(alert!),
    enabled: !!alert && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto glass-panel border-l">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Radar className="size-4 text-primary" /> Root Cause Analysis
          </SheetTitle>
          <SheetDescription className="text-xs font-num">
            {alert ? `${alert.alertId} · ${unitLabel(alert.unit)}` : ""}
          </SheetDescription>
        </SheetHeader>

        {!q.data && (
          <div className="mt-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
            <Loader2 className="size-4 animate-spin" /> Analyzing correlated sensors…
          </div>
        )}

        {q.data && (
          <div className="mt-4 space-y-5 px-1">
            <section className="rounded-md border border-status-critical/40 bg-status-critical-bg/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-status-critical font-semibold">Trigger Sensor</div>
              <div className="mt-1 font-num text-sm">{q.data.trigger.sensorId}</div>
              <div className="mt-2 flex items-baseline gap-4">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Value</div>
                  <div className="font-num text-2xl text-status-critical">
                    {q.data.trigger.value}
                    <span className="text-xs text-muted-foreground ml-1">{SENSOR_META[q.data.trigger.sensorType].unitOfMeasure}</span>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground self-center" />
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Threshold</div>
                  <div className="font-num text-lg text-muted-foreground">
                    {q.data.trigger.threshold}
                    <span className="text-xs ml-1">{SENSOR_META[q.data.trigger.sensorType].unitOfMeasure}</span>
                  </div>
                </div>
              </div>
            </section>

            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/60 pl-3">
              {q.data.narrative}
            </p>

            <NodeGraph analysis={q.data} />

            <section>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Likely Root Causes</div>
              <div className="space-y-2">
                {q.data.likelyCauses.map((c) => (
                  <div key={c.sensorId} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-num text-xs truncate">{c.sensorId}</div>
                        <div className="text-[11px] text-muted-foreground">{SENSOR_META[c.sensorType].label} · {unitLabel(c.unit)}</div>
                      </div>
                      <StatusChip severity={c.severity} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <ScoreBar label="Anomaly" value={c.anomalyScore} tone="critical" />
                      <ScoreBar label="Correlation" value={Math.abs(c.correlation)} tone="primary" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-num text-sm">{c.value.toFixed(2)}</span>
                      <span className="text-[11px] text-muted-foreground">{SENSOR_META[c.sensorType].unitOfMeasure}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: "critical" | "primary" }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-num text-foreground">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-surface-2 overflow-hidden mt-1">
        <div className={cn("h-full", tone === "critical" ? "bg-status-critical" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NodeGraph({ analysis }: { analysis: import("@/lib/api").AlertAnalysis }) {
  // Simple SVG: trigger center, causes on a ring
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = 82;
  const causes = analysis.likelyCauses;
  return (
    <div className="rounded-md border border-border bg-surface/30 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center gap-1.5">
        <Waves className="size-3" /> Correlation Map
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full">
        {causes.map((c, i) => {
          const angle = (i / causes.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const stroke = c.severity === "critical" ? "var(--status-critical)" : c.severity === "warning" ? "var(--status-warning)" : "var(--status-normal)";
          return (
            <g key={c.sensorId}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={stroke} strokeOpacity={0.4 + Math.abs(c.correlation) * 0.5} strokeWidth={1 + Math.abs(c.correlation) * 2} />
              <circle cx={x} cy={y} r={16} fill="var(--surface-2)" stroke={stroke} strokeWidth={1.5} />
              <text x={x} y={y + 3} textAnchor="middle" fontSize="9" fill="currentColor" className="font-num">{c.sensorType.slice(0, 4).toUpperCase()}</text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={22} fill="var(--status-critical-bg)" stroke="var(--status-critical)" strokeWidth={2} className="pulse-alert" />
        <text x={cx} y={cy + 3} textAnchor="middle" fontSize="9" fill="var(--status-critical)" className="font-num" fontWeight="600">TRIG</text>
      </svg>
    </div>
  );
}
