import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type Severity } from "@/lib/api";

export function StatusChip({ severity, className }: { severity: Severity; className?: string }) {
  const map = {
    normal: { label: "Normal", bg: "bg-status-normal-bg", fg: "text-status-normal", dot: "bg-status-normal" },
    warning: { label: "Warning", bg: "bg-status-warning-bg", fg: "text-status-warning", dot: "bg-status-warning" },
    critical: { label: "Critical", bg: "bg-status-critical-bg", fg: "text-status-critical", dot: "bg-status-critical" },
    consequential: { label: "Consequential", bg: "bg-zinc-500/20", fg: "text-zinc-400", dot: "bg-zinc-400" },
    maintenance: { label: "Maint.", bg: "bg-status-maint-bg", fg: "text-status-maint", dot: "bg-status-maint" },
  }[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider",
        map.bg, map.fg, className,
        severity === "critical" && "pulse-alert",
      )}
    >
      <span className={cn("size-1.5 rounded-full", map.dot)} />
      {map.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <StatusChip severity={severity} />;
}

export function AnimatedNumber({
  value,
  decimals = 1,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setFlash(true);
      prev.current = value;
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <span className={cn("font-num tabular-nums", flash && "value-update", className)}>
      {value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}

export function elapsed(from: string | number) {
  const ms = Date.now() - new Date(from).getTime();
  const s = Math.max(1, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function severityColor(sev: Severity) {
  if (sev === "critical") return "var(--status-critical)";
  if (sev === "warning") return "var(--status-warning)";
  if (sev === "maintenance") return "var(--status-maint)";
  return "var(--status-normal)";
}
