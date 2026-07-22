import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, MoreHorizontal, BellOff, ShieldCheck, Loader2, Clock } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { acknowledgeAlert, suppressAlert, type Alert } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const SUPPRESS_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "1 hour", minutes: 60 },
  { label: "4 hours", minutes: 240 },
  { label: "8 hours", minutes: 480 },
  { label: "24 hours", minutes: 1440 },
];

export function AlertActions({ alert, compact = false }: { alert: Alert; compact?: boolean }) {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [ackOpen, setAckOpen] = useState(false);
  const [supOpen, setSupOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [minutes, setMinutes] = useState<number>(60);
  const [pending, setPending] = useState(false);

  const isOperator = hasRole("ROLE_OPERATOR");
  const handled = !!alert.acknowledgedBy || (alert.suppressedUntil && new Date(alert.suppressedUntil) > new Date());

  if (handled) {
    return (
      <span
        title={
          alert.acknowledgedBy
            ? `Acknowledged by ${alert.acknowledgedBy}`
            : `Suppressed until ${new Date(alert.suppressedUntil!).toLocaleString()}`
        }
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border",
          alert.acknowledgedBy
            ? "text-status-normal bg-status-normal-bg border-status-normal/30"
            : "text-muted-foreground bg-surface border-border",
        )}
      >
        {alert.acknowledgedBy ? <CheckCircle2 className="size-3" /> : <BellOff className="size-3" />}
        {alert.acknowledgedBy ? "Ack" : "Suppressed"}
      </span>
    );
  }

  if (!isOperator) return <span className="text-[11px] text-muted-foreground">—</span>;

  const runAck = async () => {
    setPending(true);
    try {
      await acknowledgeAlert(alert.alertId, notes);
      toast.success("Alert acknowledged");
      setAckOpen(false);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["alerts", "active"] });
      qc.invalidateQueries({ queryKey: ["alerts", "history"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to acknowledge");
    } finally { setPending(false); }
  };

  const runSuppress = async () => {
    setPending(true);
    try {
      await suppressAlert(alert.alertId, minutes);
      toast.success(`Alert suppressed for ${minutes} min`);
      setSupOpen(false);
      qc.invalidateQueries({ queryKey: ["alerts", "active"] });
      qc.invalidateQueries({ queryKey: ["alerts", "history"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to suppress");
    } finally { setPending(false); }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center justify-center rounded-md border border-border bg-surface/60 hover:bg-accent hover:border-primary/40 transition-colors",
              compact ? "size-7" : "size-8",
            )}
            aria-label="Alert actions"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setAckOpen(true)}>
            <ShieldCheck className="size-4" /> Acknowledge
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSupOpen(true)}>
            <BellOff className="size-4" /> Suppress…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={ackOpen} onOpenChange={setAckOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-status-normal" /> Acknowledge Alert
            </DialogTitle>
            <DialogDescription className="text-xs font-num">
              {alert.sensorId} · {alert.severity.toUpperCase()} · value {alert.value}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Investigating the pressure drop"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckOpen(false)} disabled={pending}>Cancel</Button>
            <Button onClick={runAck} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={supOpen} onOpenChange={setSupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellOff className="size-4 text-status-warning" /> Suppress Alert
            </DialogTitle>
            <DialogDescription className="text-xs font-num">
              {alert.sensorId} · Choose how long to silence this alert.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {SUPPRESS_OPTIONS.map((o) => (
              <button
                key={o.minutes}
                onClick={() => setMinutes(o.minutes)}
                className={cn(
                  "px-3 py-2.5 rounded-md border text-sm inline-flex items-center justify-center gap-1.5 transition-colors font-num",
                  minutes === o.minutes
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-surface hover:bg-accent",
                )}
              >
                <Clock className="size-3.5 opacity-70" /> {o.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupOpen(false)} disabled={pending}>Cancel</Button>
            <Button onClick={runSuppress} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <BellOff className="size-4" />}
              Suppress {minutes}m
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
