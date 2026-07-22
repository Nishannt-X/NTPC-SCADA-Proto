import { useQuery } from "@tanstack/react-query";
import { Timer, ShieldAlert, TrendingUp, Activity } from "lucide-react";
import { getSlaMetrics } from "@/lib/api";
import { cn } from "@/lib/utils";

function fmtDuration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function SlaKpiStrip() {
  const q = useQuery({ queryKey: ["alerts", "sla"], queryFn: getSlaMetrics, refetchInterval: 10000 });
  const d = q.data;
  const compliance = d ? Math.round(d.slaCompliance * 1000) / 10 : 0;

  const kpis = [
    { icon: Timer, label: "Avg Ack Time", value: d ? fmtDuration(d.avgAckSeconds) : "—", tone: "primary" },
    { icon: Activity, label: "MTTR", value: d ? fmtDuration(d.mttrSeconds) : "—", tone: "primary" },
    { icon: ShieldAlert, label: "SLA Breaches (24h)", value: d ? `${d.ackBreachCount + d.resolveBreachCount}` : "—", tone: (d && d.ackBreachCount + d.resolveBreachCount > 0) ? "critical" : "normal" },
    { icon: TrendingUp, label: "SLA Compliance", value: d ? `${compliance.toFixed(1)}%` : "—", tone: compliance >= 95 ? "normal" : compliance >= 90 ? "warning" : "critical" },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k) => {
        const Icon = k.icon;
        const toneClass =
          k.tone === "critical" ? "text-status-critical"
          : k.tone === "warning" ? "text-status-warning"
          : k.tone === "normal" ? "text-status-normal"
          : "text-primary";
        return (
          <div key={k.label} className="rounded-lg border border-border bg-card p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{k.label}</div>
              <Icon className={cn("size-4", toneClass)} />
            </div>
            <div className={cn("mt-3 text-3xl font-num font-semibold tabular-nums", toneClass)}>{k.value}</div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        );
      })}
    </div>
  );
}
