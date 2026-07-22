import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radar, CheckCheck } from "lucide-react";
import { getActiveAlerts, getAlertHistory, SENSOR_META, SENSOR_TYPES, UNITS, unitLabel, type Alert, type Severity, type SensorType, type UnitId } from "@/lib/api";
import { StatusChip, elapsed } from "@/components/telemetry";
import { PageHeader } from "@/components/page-header";
import { AlertActions } from "@/components/alert-actions";
import { SlaKpiStrip } from "@/components/sla-kpi-strip";
import { SlaCountdown } from "@/components/sla-countdown";
import { AlertAnalysisSheet } from "@/components/alert-analysis-sheet";
import { ResolveDialog } from "@/components/resolve-dialog";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts · NTPC Lara Telemetry" },
      { name: "description", content: "Active alerts and full alert history with filtering by unit, severity, and sensor type." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { hasRole } = useAuth();
  const isOp = hasRole("ROLE_OPERATOR");
  const [tab, setTab] = useState<"active" | "history">("active");
  const [unit, setUnit] = useState<UnitId | "all">("all");
  const [sev, setSev] = useState<Severity | "all">("all");
  const [stype, setStype] = useState<SensorType | "all">("all");

  const [analyzing, setAnalyzing] = useState<Alert | null>(null);
  const [resolving, setResolving] = useState<Alert | null>(null);

  const active = useQuery({ queryKey: ["alerts", "active"], queryFn: getActiveAlerts, refetchInterval: 4000 });
  const history = useQuery({ queryKey: ["alerts", "history"], queryFn: getAlertHistory, refetchInterval: 15000 });

  const list = (tab === "active" ? active.data : history.data) ?? [];
  const filtered = useMemo(() => list.filter((a) => {
    if (unit !== "all" && a.unit !== unit) return false;
    if (sev !== "all" && a.severity !== sev) return false;
    if (stype !== "all" && a.sensorType !== stype) return false;
    return true;
  }), [list, unit, sev, stype]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      <PageHeader title="Alert Lifecycle & SLA Center" subtitle="Live alert queue with SLA countdowns, root-cause analysis, and resolution" />

      <SlaKpiStrip />

      <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-surface w-fit">
        <TabBtn active={tab === "active"} onClick={() => setTab("active")}>
          Active Alerts <CountPill n={active.data?.length ?? 0} accent={(active.data?.length ?? 0) > 0 ? "critical" : "muted"} />
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>
          Alert History <CountPill n={history.data?.length ?? 0} accent="muted" />
        </TabBtn>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <FilterSelect label="Unit" value={unit} onChange={(v) => setUnit(v as any)}
          options={[{ value: "all", label: "All units" }, ...UNITS.map((u) => ({ value: u, label: unitLabel(u) }))]} />
        <FilterSelect label="Severity" value={sev} onChange={(v) => setSev(v as any)}
          options={[{ value: "all", label: "All severities" }, { value: "critical", label: "Critical" }, { value: "warning", label: "Warning" }, { value: "consequential", label: "Consequential" }, { value: "normal", label: "Normal" }]} />
        <FilterSelect label="Sensor" value={stype} onChange={(v) => setStype(v as any)}
          options={[{ value: "all", label: "All sensors" }, ...SENSOR_TYPES.map((s) => ({ value: s, label: SENSOR_META[s].label }))]} />
        <div className="ml-auto text-xs text-muted-foreground font-num">{filtered.length} result{filtered.length === 1 ? "" : "s"}</div>
      </div>

      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface/40">
              <th className="text-left font-medium px-5 py-2.5">Severity</th>
              <th className="text-left font-medium px-2 py-2.5">Unit · Sensor</th>
              <th className="text-right font-medium px-2 py-2.5">Value</th>
              <th className="text-right font-medium px-2 py-2.5">Threshold</th>
              {tab === "active" && <th className="text-left font-medium px-2 py-2.5 w-[220px]">SLA</th>}
              <th className="text-right font-medium px-2 py-2.5">{tab === "active" ? "Age" : "When"}</th>
              <th className="text-right font-medium px-5 py-2.5 w-[220px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr><td colSpan={tab === "active" ? 7 : 6} className="px-5 py-12 text-center text-muted-foreground">No alerts match the current filters.</td></tr>
            )}
            {filtered.map((a) => (
              <tr key={a.alertId} className="hover:bg-accent/20 group">
                <td className="px-5 py-3"><StatusChip severity={a.severity} /></td>
                <td className="px-2 py-3">
                  <div className="font-medium">{unitLabel(a.unit)}</div>
                  <div className="text-xs text-muted-foreground flex items-center">
                    <span className="font-num">{a.sensorId}</span>
                    <span className="mx-1 opacity-40">·</span>
                    <span>{SENSOR_META[a.sensorType].label}</span>
                    {a.count && a.count > 1 && (
                      <span className="ml-1.5 px-1 py-0.5 rounded-sm bg-status-warning-bg/50 text-status-warning font-semibold text-[10px]">
                        {a.count}x
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-3 text-right font-num">{a.value}{SENSOR_META[a.sensorType].unitOfMeasure}</td>
                <td className="px-2 py-3 text-right font-num text-muted-foreground">{a.threshold}{SENSOR_META[a.sensorType].unitOfMeasure}</td>
                {tab === "active" && (
                  <td className="px-2 py-3"><SlaCountdown alert={a} compact /></td>
                )}
                <td className="px-2 py-3 text-right font-num text-xs text-muted-foreground">
                  {elapsed(a.timestamp)}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex items-center gap-1.5 justify-end">
                    {tab === "active" && (
                      <>
                        <button
                          onClick={() => setAnalyzing(a)}
                          className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-surface/60 hover:border-primary/50 hover:bg-primary/10 text-[11px] transition-colors"
                          title="Analyze correlated sensors"
                        >
                          <Radar className="size-3" /> Analyze
                        </button>
                        {isOp && !a.acknowledgedBy && (
                          <button
                            onClick={() => setResolving(a)}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-surface/60 hover:border-status-normal/50 hover:bg-status-normal-bg text-[11px] text-status-normal transition-colors"
                            title="Resolve alert"
                          >
                            <CheckCheck className="size-3" /> Resolve
                          </button>
                        )}
                      </>
                    )}
                    <AlertActions alert={a} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <AlertAnalysisSheet alert={analyzing} open={!!analyzing} onOpenChange={(v) => !v && setAnalyzing(null)} />
      <ResolveDialog alert={resolving} open={!!resolving} onOpenChange={(v) => !v && setResolving(null)} />
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "px-3 py-1.5 text-sm rounded-sm inline-flex items-center gap-2 transition-colors",
      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
    )}>{children}</button>
  );
}

function CountPill({ n, accent }: { n: number; accent: "critical" | "muted" }) {
  return (
    <span className={cn(
      "min-w-[20px] h-[18px] px-1.5 grid place-items-center rounded-full text-[10px] font-num font-semibold",
      accent === "critical" ? "bg-status-critical text-white" : "bg-surface-2 text-muted-foreground",
    )}>{n}</span>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="text-muted-foreground uppercase tracking-wider text-[11px]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-border rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
