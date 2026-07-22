import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Activity, AlertTriangle, AlertCircle, Gauge, Timer, LockKeyhole, ArrowUpRight } from "lucide-react";
import {
  getActiveAlerts, getAlertHistory, getLatestReadings, getReadings, SENSOR_META, severityFor,
  unitLabel, type UnitId,
} from "@/lib/api";
import { AnimatedNumber, StatusChip, elapsed } from "@/components/telemetry";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { AlertActions } from "@/components/alert-actions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · NTPC Lara Telemetry" },
      { name: "description", content: "Live plant-wide telemetry overview: sensors, alerts, unit load, and uptime." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { user } = useAuth();
  const activeAlerts = useQuery({ queryKey: ["alerts", "active"], queryFn: getActiveAlerts, refetchInterval: 4000 });
  const history = useQuery({ queryKey: ["alerts", "history"], queryFn: getAlertHistory, refetchInterval: 15000 });
  const u1 = useQuery({ queryKey: ["latest", "unit-1"], queryFn: () => getLatestReadings("unit-1"), refetchInterval: 3000 });
  const u2 = useQuery({ queryKey: ["latest", "unit-2"], queryFn: () => getLatestReadings("unit-2"), refetchInterval: 3000 });

  const totalSensors = 2 * 32;
  const live = (u1.data?.length ?? 0) + (u2.data?.length ?? 0);
  const numActive = activeAlerts.data?.length ?? 0;
  const hasCritical = activeAlerts.data?.some(a => a.severity.toLowerCase() === "critical") ?? false;
  const alertAccent = numActive > 0 ? (hasCritical ? "critical" : "warning") : "normal";

  // Calculate generic load (simple average of load indicators)
  const loadFor = (arr?: { sensorType: string; value: number }[]) => {
    if (!arr) return 0;
    const v = arr.find((a) => a.sensorType === "rpm")?.value ?? 0;
    return Math.min(100, Math.max(0, (v / SENSOR_META.rpm.crit) * 100));
  };
  const l1 = loadFor(u1.data);
  const l2 = loadFor(u2.data);
  const combined = (l1 + l2) / 2;

  const recent = useMemo(() => {
    const all = [...(activeAlerts.data ?? []), ...(history.data ?? [])];
    const uniqueMap = new Map<string, typeof all[0]>();
    for (const a of all) uniqueMap.set(a.alertId, a);
    return [...uniqueMap.values()]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [activeAlerts.data, history.data]);

  const isOperatorOnly = user?.roles?.includes("ROLE_OPERATOR") && !user?.roles?.includes("ROLE_SUPERVISOR") && !user?.roles?.includes("ROLE_ADMIN");
  
  const [currentShift, setCurrentShift] = useState(() => {
    const h = new Date().getUTCHours();
    return h < 8 ? 3 : h < 16 ? 1 : 2;
  });

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const h = new Date().getUTCHours();
      setCurrentShift(h < 8 ? 3 : h < 16 ? 1 : 2);
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const today = new Date().toISOString().split("T")[0];
  const hasClockedOffToday = typeof window !== "undefined" && sessionStorage.getItem(`clockedOff_${user?.username}_${user?.assignedShift}`) === today;
  
  const lockedOut = isOperatorOnly && (user?.assignedShift !== currentShift || hasClockedOffToday);
  const [timeLeft, setTimeLeft] = useState("00:00:00");

  useEffect(() => {
    if (!lockedOut || !user?.assignedShift) return;
    const update = () => {
      const now = new Date();
      let targetDate = new Date(now);
      
      let targetHour = 0;
      const shiftNum = Number(user.assignedShift);
      if (shiftNum === 1) targetHour = 8;
      else if (shiftNum === 2) targetHour = 16;
      else if (shiftNum === 3) targetHour = 0;

      targetDate.setUTCHours(targetHour, 0, 0, 0);

      // Roll over to tomorrow if shift has already started/passed or they clocked off early today
      if (targetDate <= now || hasClockedOffToday) {
        targetDate.setUTCDate(targetDate.getUTCDate() + 1);
      }

      const diff = targetDate.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      
      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lockedOut, user?.assignedShift, hasClockedOffToday]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {lockedOut && (
        <div className="rounded-lg border border-status-critical/30 bg-status-critical-bg p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm relative overflow-hidden">
          <LockKeyhole className="size-12 text-status-critical opacity-80" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Out of Shift</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              You are currently off-duty. Control interfaces and operational panels have been securely locked. 
              You may view the high-level plant overview below.
            </p>
          </div>
          <div className="pt-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Time until next shift</div>
            <div className="font-num text-4xl font-bold text-foreground tracking-tight">
              {!user?.assignedShift ? "NOT ASSIGNED" : timeLeft}
            </div>
          </div>
        </div>
      )}

      <PageHeader title="Plant Overview" subtitle="Live aggregate status across all monitored generating units" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Activity} label="Active Sensors" value={`${live}/${totalSensors}`} hint="Reporting" />
        <KpiCard icon={AlertTriangle} label="Active Alerts" value={String(numActive)} hint={numActive ? (hasCritical ? "Critical action required" : "Warnings present") : "All clear"} accent={alertAccent} />
        <KpiCard icon={Gauge} label="Combined Plant Load" value={`${combined.toFixed(1)}%`} hint={`U1 ${l1.toFixed(0)}% · U2 ${l2.toFixed(0)}%`} />
        <KpiCard icon={Timer} label="System Uptime" value="14d 06:42" hint="Since last restart" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UnitSummaryCard unitId="unit-1" load={l1} />
        <UnitSummaryCard unitId="unit-2" load={l2} />
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Alerts</h2>
          <Link to="/alerts" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            View all <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {recent.length === 0 && (
            <li className="px-5 py-8 text-sm text-muted-foreground text-center">No alerts in window.</li>
          )}
          {recent.map((a) => (
            <li key={a.alertId} className="group relative flex items-center gap-4 px-5 py-3 hover:bg-accent/40 transition-colors">
              <Link to="/alerts" className="flex items-center gap-4 flex-1 min-w-0">
                <StatusChip severity={a.severity} />
                <div className="font-medium text-sm text-foreground flex items-center w-60 shrink-0">
                  {unitLabel(a.unit)} · {SENSOR_META[a.sensorType].label}
                  {'count' in a && (a as any).count > 1 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-status-warning-bg/50 text-status-warning font-semibold text-[10px]">
                      {(a as any).count}x
                    </span>
                  )}
                </div>
                <div className="text-sm flex-1 truncate text-muted-foreground">
                  {a.message}
                </div>
                <div className="font-num text-sm shrink-0">
                  {a.value} <span className="text-muted-foreground">/ {a.threshold}{SENSOR_META[a.sensorType].unitOfMeasure}</span>
                </div>
                <div className="text-xs text-muted-foreground w-24 text-right font-num shrink-0">{elapsed(a.timestamp)}</div>
              </Link>
              <AlertActions alert={a} compact />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}


function KpiCard({
  icon: Icon, label, value, hint, accent = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string; accent?: "neutral" | "normal" | "warning" | "critical";
}) {
  const valueColor = accent === "critical" ? "text-status-critical" : accent === "warning" ? "text-status-warning" : accent === "normal" ? "text-status-normal" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className={cn("text-3xl font-num font-semibold", valueColor)}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function UnitSummaryCard({ unitId, load }: { unitId: UnitId; load: number }) {
  const latest = useQuery({ queryKey: ["latest", unitId], queryFn: () => getLatestReadings(unitId), refetchInterval: 3000 });
  const trend = useQuery({
    queryKey: ["trend", unitId],
    queryFn: () => getReadings({ unitId, from: Date.now() - 60 * 60 * 1000, to: Date.now(), sensorType: "rpm", points: 40 }),
    refetchInterval: 10000,
  });
  const sev = (() => {
    if (!latest.data) return "normal" as const;
    const sevs = latest.data.map((r) => severityFor(r.sensorType, r.value, r.sensorId));
    if (sevs.includes("critical")) return "critical" as const;
    if (sevs.includes("warning")) return "warning" as const;
    return "normal" as const;
  })();

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Generating</div>
          <div className="text-lg font-semibold">{unitLabel(unitId)}</div>
        </div>
        <StatusChip severity={sev} />
      </div>
      <div className="mt-4 flex items-end gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Load</div>
          <div className="text-3xl font-num font-semibold mt-0.5">
            <AnimatedNumber value={load} /> <span className="text-base text-muted-foreground">%</span>
          </div>
        </div>
        <div className="flex-1 h-14">
          {trend.data && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.data.map((d) => ({ v: d.value })).slice().reverse()}>
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
                <Line type="monotone" dataKey="v" stroke="var(--chart-1)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground font-num">
          {latest.data?.length ?? 0} sensors · updated {elapsed(latest.dataUpdatedAt || Date.now())}
        </div>
        <Link to="/unit/$unitId" params={{ unitId }} className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline">
          View Details <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
