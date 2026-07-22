import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Wrench, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { getMaintenanceDue, markMaintenanceComplete, SENSOR_META, unitLabel, type MaintenanceItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function MaintenancePanel() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["maintenance"], queryFn: getMaintenanceDue, refetchInterval: 30000 });
  const [pending, setPending] = useState<string | null>(null);
  const isOp = hasRole("ROLE_OPERATOR");

  const items = q.data ?? [];
  const overdue = items.filter((i) => i.status === "overdue");
  const dueSoon = items.filter((i) => i.status === "due-soon");
  const scheduled = items.filter((i) => i.status === "scheduled");

  const complete = async (item: MaintenanceItem) => {
    setPending(item.sensorId);
    try {
      await markMaintenanceComplete(item.sensorId);
      toast.success(`Maintenance logged for ${item.sensorId}`);
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record");
    } finally { setPending(null); }
  };

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col min-h-[520px]">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Preventive Maintenance</h2>
        </div>
        <div className="text-[11px] font-num text-muted-foreground">{items.length} tracked</div>
      </div>

      {overdue.length > 0 && (
        <div className="mx-5 mt-4 rounded-md border border-status-critical/50 bg-status-critical-bg px-3 py-2 text-xs flex items-center gap-2 text-status-critical">
          <AlertTriangle className="size-4" /> {overdue.length} sensor{overdue.length === 1 ? "" : "s"} overdue for service
        </div>
      )}
      {dueSoon.length > 0 && (
        <div className="mx-5 mt-2 rounded-md border border-status-warning/40 bg-status-warning-bg px-3 py-2 text-xs flex items-center gap-2 text-status-warning">
          <AlertTriangle className="size-4" /> {dueSoon.length} due within 7 days
        </div>
      )}

      <div className="p-3 space-y-4 overflow-auto flex-1">
        <Group title="Overdue" tone="critical" items={overdue} onComplete={complete} pending={pending} isOp={isOp} />
        <Group title="Due Soon" tone="warning" items={dueSoon} onComplete={complete} pending={pending} isOp={isOp} />
        <Group title="Scheduled" tone="normal" items={scheduled} onComplete={complete} pending={pending} isOp={isOp} />
      </div>
    </div>
  );
}

function Group({
  title, tone, items, onComplete, pending, isOp,
}: {
  title: string;
  tone: "critical" | "warning" | "normal";
  items: MaintenanceItem[];
  onComplete: (i: MaintenanceItem) => void;
  pending: string | null;
  isOp: boolean;
}) {
  if (items.length === 0) return null;
  const toneText = tone === "critical" ? "text-status-critical" : tone === "warning" ? "text-status-warning" : "text-status-normal";
  return (
    <div>
      <div className={cn("text-[10px] uppercase tracking-wider mb-2 flex items-center gap-2", toneText)}>
        <span className={cn("size-1.5 rounded-full", tone === "critical" ? "bg-status-critical" : tone === "warning" ? "bg-status-warning" : "bg-status-normal")} />
        {title} · <span className="font-num">{items.length}</span>
      </div>
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {items.map((i) => {
              const due = new Date(i.nextDueAt).getTime();
              const days = Math.round((due - Date.now()) / (24 * 3600_000));
              return (
                <tr key={i.sensorId} className="hover:bg-accent/30">
                  <td className="px-3 py-2.5">
                    <div className="font-num text-xs">{i.sensorId}</div>
                    <div className="text-[11px] text-muted-foreground">{SENSOR_META[i.sensorType].label} · {unitLabel(i.unit)}</div>
                  </td>
                  <td className="px-2 py-2.5 text-right font-num text-xs">
                    <div className={toneText}>{days < 0 ? `${-days}d overdue` : days === 0 ? "today" : `in ${days}d`}</div>
                    <div className="text-[10px] text-muted-foreground">last {new Date(i.lastMaintainedAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      disabled={!isOp || pending === i.sensorId}
                      onClick={() => onComplete(i)}
                      className={cn(
                        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs transition-colors",
                        isOp
                          ? "border-border bg-surface/60 hover:border-status-normal/50 hover:bg-status-normal-bg"
                          : "border-border/40 bg-surface/30 text-muted-foreground/50 cursor-not-allowed",
                      )}
                    >
                      {pending === i.sensorId ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                      Mark complete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
