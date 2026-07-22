import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Clock, AlertTriangle, Loader2 } from "lucide-react";
import { submitClockOff } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ClockOffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClockOffModal({ open, onOpenChange }: ClockOffModalProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [earlyReason, setEarlyReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEarly, setIsEarly] = useState(false);

  useEffect(() => {
    if (open && user?.assignedShift) {
      const h = new Date().getUTCHours();
      const currentShift = h < 8 ? 3 : h < 16 ? 1 : 2;
      setIsEarly(user.assignedShift === currentShift);
    }
  }, [open, user]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setNotes("");
      setEarlyReason("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!notes.trim()) {
      toast.error("Please provide operational notes before clocking off.");
      return;
    }
    if (isEarly && !earlyReason.trim()) {
      toast.error("Please provide a reason for early departure.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitClockOff({
        username: user.username,
        shiftNumber: user.assignedShift || 1,
        isEarly,
        notes,
        earlyReason: isEarly ? earlyReason : undefined,
      });
      toast.success("Clock-off logged successfully");
      
      const today = new Date().toISOString().split("T")[0];
      sessionStorage.setItem(`clockedOff_${user.username}_${user.assignedShift}`, today);
      
      onOpenChange(false);
      // Let the natural polling or shift-lock mechanism take over from here
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log clock-off");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5 text-primary" /> Clock Off
          </DialogTitle>
          <DialogDescription>
            Record your shift notes for the incoming operator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isEarly && (
            <div className="bg-status-critical/10 border border-status-critical/30 rounded-md p-3 space-y-2">
              <div className="flex items-start gap-2 text-status-critical">
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                <div className="text-sm font-semibold">Early Departure Warning</div>
              </div>
              <p className="text-xs text-status-critical/90">
                You are clocking off before your assigned shift (Shift {user.assignedShift}) has ended. A reason is required.
              </p>
              <Textarea
                placeholder="Reason for early departure..."
                className="h-20 text-sm border-status-critical/30 focus-visible:ring-status-critical/50"
                value={earlyReason}
                onChange={(e) => setEarlyReason(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Operational Notes (Required)
            </label>
            <Textarea
              placeholder="List any ongoing issues, false alarms, or overrides..."
              className="h-32 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-24">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
