import { useQuery } from "@tanstack/react-query";
import { getClockOffLogs } from "@/lib/api";
import { Clock, AlertTriangle, CheckCircle2, UserCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ClockOffFeed() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["clock-offs"],
    queryFn: getClockOffLogs,
    refetchInterval: 10000,
  });

  return (
    <section className="rounded-lg border border-border bg-card flex flex-col min-h-[500px]">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="size-4 text-primary" /> Shift Track & Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Audit log of operator shift departures</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading && (
          <div className="py-12 text-center text-muted-foreground text-sm animate-pulse">
            Loading logs...
          </div>
        )}

        {logs?.length === 0 && !isLoading && (
          <div className="py-12 text-center text-muted-foreground text-sm italic">
            No clock-offs recorded yet.
          </div>
        )}

        {logs?.map((log) => (
          <div key={log.id} className="border border-border rounded-lg bg-surface/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-start justify-between bg-surface/30">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-primary/10 border border-primary/20 grid place-items-center text-xs font-semibold uppercase text-primary">
                  {log.username.slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-medium">{log.username}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-num mt-0.5">
                    Shift {log.shiftNumber} · {formatDistanceToNow(new Date(log.clockOffTime), { addSuffix: true })}
                  </div>
                </div>
              </div>
              <div>
                {log.isEarly ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-status-critical/10 border border-status-critical/20 text-[10px] uppercase font-bold tracking-widest text-status-critical">
                    <AlertTriangle className="size-3" />
                    Early Departure
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-status-normal/10 border border-status-normal/20 text-[10px] uppercase font-bold tracking-widest text-status-normal">
                    <CheckCircle2 className="size-3" />
                    On Time
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 space-y-4 text-sm">
              {log.isEarly && log.earlyReason && (
                <div className="bg-status-critical/5 border-l-2 border-status-critical/50 pl-3 py-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-status-critical mb-1">Reason for Early Departure</div>
                  <div className="text-muted-foreground italic text-xs leading-relaxed">{log.earlyReason}</div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Operational Notes</div>
                <div className="whitespace-pre-wrap leading-relaxed">{log.notes}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
