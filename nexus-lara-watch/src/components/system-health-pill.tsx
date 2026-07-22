import { useQuery } from "@tanstack/react-query";
import { HeartPulse } from "lucide-react";
import { getSystemHealth } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  HoverCard, HoverCardTrigger, HoverCardContent,
} from "@/components/ui/hover-card";

export function SystemHealthPill() {
  const q = useQuery({ queryKey: ["system", "health"], queryFn: () => getSystemHealth(), refetchInterval: 8000 });
  const status = q.data?.status ?? "HEALTHY";
  const tone =
    status === "HEALTHY" ? "text-status-normal bg-status-normal-bg border-status-normal/30"
    : status === "DEGRADED" ? "text-status-warning bg-status-warning-bg border-status-warning/30"
    : "text-status-critical bg-status-critical-bg border-status-critical/30";

  return (
    <HoverCard openDelay={80}>
      <HoverCardTrigger asChild>
        <button className={cn(
          "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-[11px] uppercase tracking-wider font-medium",
          tone,
        )}>
          <HeartPulse className="size-3.5" />
          <span>System {status}</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-72 glass-panel">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          {q.data?.systemId ?? "system"}
        </div>
        <div className="space-y-1.5">
          {(q.data?.services ?? []).map((s) => (
            <div key={s.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span className={cn("size-1.5 rounded-full", s.status === "UP" ? "bg-status-normal" : "bg-status-critical")} />
                {s.name}
              </span>
              <span className="font-num text-muted-foreground">{s.latencyMs ?? "—"} ms</span>
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
