import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flame, Waves, Zap, CheckCircle2, ServerCog, Pencil, SlidersHorizontal, Loader2 } from "lucide-react";
import {
  overrideThreshold, SENSOR_META, SENSOR_TYPES, UNITS, unitLabel, getSensorDefinitions,
  type SensorType, type UnitId,
} from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · NTPC Lara Telemetry" },
      { name: "description", content: "Architecture overview, thresholds, and operator demo controls." },
    ],
  }),
  component: SettingsPage,
});

interface SensorRow {
  sensorId: string;
  unit: UnitId;
  sensorType: SensorType;
  warn: number;
  crit: number;
}

function SettingsPage() {
  const { hasRole } = useAuth();
  const isOperator = hasRole("ROLE_OPERATOR");
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [editing, setEditing] = useState<SensorRow | null>(null);
  const [showOverrides, setShowOverrides] = useState(false);

  const { data: sensorDefs, isLoading } = useQuery({
    queryKey: ["sensor-definitions"],
    queryFn: getSensorDefinitions,
  });

  const rows: SensorRow[] = (sensorDefs || []).map(d => ({
    sensorId: d.sensorId,
    unit: d.unit as UnitId,
    sensorType: d.sensorType as SensorType,
    warn: d.currentWarn,
    crit: d.currentCrit,
  }));

  return (
    <div className="space-y-6 max-w-[1200px]">
      <PageHeader title="Settings & About" subtitle="System architecture, threshold overrides, and operator demo tools" />

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">How this works</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {[
            { n: "1", t: "Sensor Edge", d: "32 unique sensors per unit across 6 physical plant segments — fuel handling, boiler, turbine, water cycle, switchyard, and emissions — sampled and pushed to the plant gateway." },
            { n: "2", t: "Telemetry API", d: "REST endpoints under /api/v1/* normalize readings and stream alerts to authenticated operators." },
            { n: "3", t: "This Console", d: "Polls the API on a short interval, evaluates against per-sensor thresholds, and renders live status." },
          ].map((s) => (
            <div key={s.n} className="rounded-md border border-border bg-surface/50 p-4">
              <div className="text-[11px] font-num text-muted-foreground">STEP {s.n}</div>
              <div className="mt-1 font-semibold">{s.t}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
              <SlidersHorizontal className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider">Threshold Overrides</h2>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {isOperator ? "Operator role — editable" : "Read-only (operator role required)"}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowOverrides(true)}>
            Manage Overrides
          </Button>
        </div>
      </section>

      <Dialog open={showOverrides} onOpenChange={setShowOverrides}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-border bg-card">
          <div className="px-6 py-4 border-b border-border bg-surface/40 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <SlidersHorizontal className="size-4 text-primary" />
               <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Threshold Overrides</h2>
             </div>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface/80 sticky top-0 backdrop-blur-md">
                  <th className="text-left font-medium px-6 py-2.5">Sensor</th>
                  <th className="text-left font-medium px-2 py-2.5">Unit · Type</th>
                  <th className="text-right font-medium px-2 py-2.5">Warn</th>
                  <th className="text-right font-medium px-2 py-2.5">Critical</th>
                  <th className="text-right font-medium px-6 py-2.5 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <Loader2 className="size-4 animate-spin inline mr-2" /> Loading sensors...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No sensors found.
                    </td>
                  </tr>
                ) : rows.map((r) => {
                  const meta = SENSOR_META[r.sensorType] || { label: "Unknown", warn: 0, crit: 0, unitOfMeasure: "" };
                  const def = sensorDefs?.find(d => d.sensorId === r.sensorId);
                  const changed = def ? (r.warn !== def.baseWarn || r.crit !== def.baseCrit) : false;
                  
                  return (
                    <tr key={r.sensorId} className="hover:bg-accent/30">
                      <td className="px-6 py-2.5 font-num text-xs">
                        {r.sensorId}
                        {changed && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-status-warning-bg text-status-warning border border-status-warning/30">
                            Override
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="text-xs">{unitLabel(r.unit)}</div>
                        <div className="text-[11px] text-muted-foreground">{meta.label}</div>
                      </td>
                      <td className="px-2 py-2.5 text-right font-num text-status-warning">{r.warn}{meta.unitOfMeasure}</td>
                      <td className="px-2 py-2.5 text-right font-num text-status-critical">{r.crit}{meta.unitOfMeasure}</td>
                      <td className="px-6 py-2.5 text-right">
                        <button
                          disabled={!isOperator}
                          onClick={() => setEditing(r)}
                          className={cn(
                            "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs transition-colors",
                            isOperator
                              ? "border-border bg-surface/60 hover:border-primary/40 hover:bg-accent"
                              : "border-border/50 bg-surface/30 text-muted-foreground/50 cursor-not-allowed",
                          )}
                        >
                          <Pencil className="size-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">API Connection</h2>
        <div className="mt-4 grid sm:grid-cols-3 gap-4">
          <StatusItem icon={CheckCircle2} label="Gateway" value="Reachable" tone="normal" />
          <StatusItem icon={ServerCog} label="Polling Interval" value="3000 ms" tone="neutral" />
          <StatusItem icon={CheckCircle2} label="Auth" value="Bearer token" tone="normal" />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Demo Controls · Complex Scenarios</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Each button issues <span className="font-num text-foreground">POST /api/v1/simulator/inject-scenario</span> to simulate multi-sensor, cascading failures across a unit.
        </p>
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <DemoButton icon={Waves} label="Boiler Tube Leak (Unit 1)" description="Pressure & drum level drop, draft rises."
            loading={pending === "scenario-tube-leak"} onClick={async () => {
              setPending("scenario-tube-leak");
              try { await import("@/lib/api").then(m => m.injectScenario({ scenarioId: "BOILER_TUBE_LEAK", unit: "unit-1" })); toast.success("Scenario injected", { description: "Boiler Tube Leak active on Unit 1." }); } catch { toast.error("Scenario failed"); } finally { setPending(null); }
            }} />
          <DemoButton icon={Flame} label="Coal Mill Trip (Unit 1)" description="Mill current, outlet temp, and FEGT drop."
            loading={pending === "scenario-mill-trip"} onClick={async () => {
              setPending("scenario-mill-trip");
              try { await import("@/lib/api").then(m => m.injectScenario({ scenarioId: "COAL_MILL_TRIP", unit: "unit-1" })); toast.success("Scenario injected", { description: "Coal Mill Trip active on Unit 1." }); } catch { toast.error("Scenario failed"); } finally { setPending(null); }
            }} />
          <DemoButton icon={Zap} label="Air Ingress (Unit 2)" description="Condenser vacuum degrades, RPM drops, Stator temp rises."
            loading={pending === "scenario-air-ingress"} onClick={async () => {
              setPending("scenario-air-ingress");
              try { await import("@/lib/api").then(m => m.injectScenario({ scenarioId: "CONDENSER_AIR_INGRESS", unit: "unit-2" })); toast.success("Scenario injected", { description: "Condenser Air Ingress active on Unit 2." }); } catch { toast.error("Scenario failed"); } finally { setPending(null); }
            }} />
        </div>
      </section>

      <ThresholdEditDialog
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          qc.setQueryData(["sensor-definitions"], (old: any) => {
            if (!old) return old;
            return old.map((r: any) => r.sensorId === updated.sensorId ? { ...r, currentWarn: updated.warn, currentCrit: updated.crit } : r);
          });
          setEditing(null);
        }}
      />
    </div>
  );
}

function ThresholdEditDialog({
  row, onClose, onSaved,
}: {
  row: SensorRow | null;
  onClose: () => void;
  onSaved: (r: SensorRow) => void;
}) {
  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        {row && <ThresholdEditForm key={row.sensorId} row={row} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function ThresholdEditForm({
  row, onClose, onSaved,
}: {
  row: SensorRow;
  onClose: () => void;
  onSaved: (r: SensorRow) => void;
}) {
  const meta = SENSOR_META[row.sensorType] || { label: "Unknown", unitOfMeasure: "" };
  const [warn, setWarn] = useState(String(row.warn));
  const [crit, setCrit] = useState(String(row.crit));
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(24);
  const [pending, setPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nWarn = Number(warn);
    const nCrit = Number(crit);
    if (!Number.isFinite(nWarn) || !Number.isFinite(nCrit)) {
      toast.error("Enter numeric thresholds"); return;
    }
    if (nCrit <= nWarn) {
      toast.error("Critical must exceed warning"); return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required"); return;
    }
    setShowConfirm(true);
  };

  const submit = async () => {
    const nWarn = Number(warn);
    const nCrit = Number(crit);
    
    setPending(true);
    try {
      await overrideThreshold(row.sensorId, {
        sensorType: row.sensorType,
        newWarn: nWarn,
        newCrit: nCrit,
        reason: reason.trim(),
        durationHours: hours,
      });
      toast.success("Threshold override applied", { description: hours === -1 ? `Active permanently` : `Active for ${hours}h` });
      onSaved({ ...row, warn: nWarn, crit: nCrit });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply override");
    } finally { 
      setPending(false); 
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-status-critical flex items-center gap-2">
            Warning: Unadvisable Action
          </DialogTitle>
          <DialogDescription>
            You are about to override the safety thresholds for <strong>{row.sensorId}</strong>.
            This is strictly not advisable unless you are actively mitigating a known false positive or sensor fault.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 text-sm">
          <p>This action and your provided reason will be permanently recorded in the operator audit log.</p>
          <div className="bg-surface/50 p-3 rounded-md border text-xs space-y-1">
            <div><strong>New Warning:</strong> {warn}{meta.unitOfMeasure}</div>
            <div><strong>New Critical:</strong> {crit}{meta.unitOfMeasure}</div>
            <div><strong>Reason:</strong> {reason}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? "Overriding..." : "I understand, Override Threshold"}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Override Threshold</DialogTitle>
        <DialogDescription>
          {row.sensorId} · {unitLabel(row.unit)}
        </DialogDescription>
      </DialogHeader>
      <form id="threshold-form" onSubmit={handleInitialSubmit} className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="New warning" value={warn} onChange={setWarn} unit={meta.unitOfMeasure} tone="warning" />
          <NumField label="New critical" value={crit} onChange={setCrit} unit={meta.unitOfMeasure} tone="critical" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Reason</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="mt-1"
            placeholder="e.g. Temporarily raised due to maintenance" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Duration</label>
          <div className="mt-1 flex gap-2">
            {[1, 4, 8, 24, 72, -1].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHours(h)}
                className={cn(
                  "flex-1 h-9 rounded-md border text-sm font-num transition-colors",
                  hours === h
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-surface hover:bg-accent",
                )}
              >
                {h === -1 ? "PERMA" : `${h}h`}
              </button>
            ))}
          </div>
        </div>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
        <Button onClick={handleInitialSubmit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <SlidersHorizontal className="size-4" />}
          Apply override
        </Button>
      </DialogFooter>
    </>
  );
}

function NumField({ label, value, onChange, unit, tone }: {
  label: string; value: string; onChange: (v: string) => void; unit: string; tone: "warning" | "critical";
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={cn(
        "flex items-center gap-2 px-3 h-10 rounded-md border bg-surface/60 focus-within:border-primary/60",
        tone === "warning" ? "border-status-warning/30" : "border-status-critical/30",
      )}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full bg-transparent outline-none text-sm font-num",
            tone === "warning" ? "text-status-warning" : "text-status-critical",
          )}
        />
        <span className="text-xs text-muted-foreground font-num">{unit}</span>
      </div>
    </label>
  );
}

function StatusItem({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: "normal" | "neutral";
}) {
  return (
    <div className="rounded-md border border-border bg-surface/50 p-3 flex items-center gap-3">
      <Icon className={cn("size-5", tone === "normal" ? "text-status-normal" : "text-muted-foreground")} />
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium font-num">{value}</div>
      </div>
    </div>
  );
}

function DemoButton({ icon: Icon, label, description, loading, onClick }: {
  icon: React.ComponentType<{ className?: string }>; label: string; description: string; loading: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "text-left rounded-md border border-border bg-surface/50 p-4 hover:border-status-warning/60 hover:bg-status-warning-bg transition-colors group",
        loading && "opacity-60 cursor-wait",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="size-9 rounded-md grid place-items-center bg-status-warning-bg text-status-warning border border-status-warning/30">
          <Icon className="size-4" />
        </span>
        <div className="flex-1">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-num text-muted-foreground group-hover:text-status-warning">
          {loading ? "…" : "RUN"}
        </span>
      </div>
    </button>
  );
}
