import { useEffect, useState } from "react";
import { slaDeadlines, type Alert } from "@/lib/api";
import { cn } from "@/lib/utils";

function fmt(ms: number) {
  const abs = Math.abs(ms);
  const s = Math.floor(abs / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

export function SlaCountdown({ alert, compact = false }: { alert: Alert; compact?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const { ackAt, resolveAt } = slaDeadlines(alert);
  const created = new Date(alert.timestamp).getTime();

  const acked = !!alert.acknowledgedBy;
  const ackTarget = acked ? { pct: 100, ms: 0 } : bar(created, ackAt, now);
  const resTarget = bar(created, resolveAt, now);

  return (
    <div className={cn("w-full space-y-1", compact && "space-y-0.5")}>
      <Line label="ACK" pct={ackTarget.pct} ms={ackAt - now} done={acked} compact={compact} />
      <Line label="RES" pct={resTarget.pct} ms={resolveAt - now} done={false} compact={compact} />
    </div>
  );
}

function bar(start: number, end: number, now: number) {
  const total = end - start;
  const used = now - start;
  const pct = Math.min(100, Math.max(0, (used / total) * 100));
  return { pct, ms: end - now };
}

function Line({ label, pct, ms, done, compact }: { label: string; pct: number; ms: number; done: boolean; compact?: boolean }) {
  const breach = ms < 0;
  const warn = !breach && pct >= 75;
  const tone = done ? "bg-status-normal" : breach ? "bg-status-critical" : warn ? "bg-status-warning" : "bg-primary";
  const textTone = done ? "text-status-normal" : breach ? "text-status-critical" : warn ? "text-status-warning" : "text-muted-foreground";
  return (
    <div className={cn("flex items-center gap-2", compact ? "text-[9px]" : "text-[10px]")}>
      <span className="font-num text-muted-foreground w-8">{label}</span>
      <div className={cn("flex-1 rounded-full bg-surface-2 overflow-hidden", compact ? "h-1" : "h-1.5")}>
        <div className={cn("h-full transition-all duration-500", tone, breach && "pulse-alert")} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className={cn("font-num tabular-nums w-14 text-right", textTone)}>
        {done ? "DONE" : (breach ? "-" : "") + fmt(ms)}
      </span>
    </div>
  );
}
