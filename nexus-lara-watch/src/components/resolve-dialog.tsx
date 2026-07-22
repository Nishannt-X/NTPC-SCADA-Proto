import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { resolveAlert, type Alert, type ResolutionType } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ResolveDialog({ alert, open, onOpenChange }: { alert: Alert | null; open: boolean; onOpenChange: (v: boolean) => void; }) {
  const qc = useQueryClient();
  const [rtype, setRtype] = useState<ResolutionType>("MANUAL");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!alert) return;
    if (!notes.trim()) { toast.error("Resolution notes are required"); return; }
    setPending(true);
    try {
      await resolveAlert(alert.alertId, { resolutionType: rtype, notes: notes.trim() });
      toast.success("Alert resolved");
      qc.invalidateQueries({ queryKey: ["alerts", "active"] });
      qc.invalidateQueries({ queryKey: ["alerts", "history"] });
      qc.invalidateQueries({ queryKey: ["alerts", "sla"] });
      onOpenChange(false);
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resolve");
    } finally { setPending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-panel">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCheck className="size-4 text-status-normal" /> Resolve Alert
          </DialogTitle>
          <DialogDescription className="text-xs font-num">
            {alert ? `${alert.sensorId} · ${alert.severity.toUpperCase()} · value ${alert.value}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Resolution type</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["MANUAL", "AUTO"] as ResolutionType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setRtype(t)}
                  className={cn(
                    "h-10 rounded-md border text-sm font-num transition-colors",
                    rtype === t
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-surface hover:bg-accent",
                  )}
                >{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1"
              placeholder="Root cause, mitigation, follow-ups…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
            Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
