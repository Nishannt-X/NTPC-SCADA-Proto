import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOperators, setOperatorShift, type OperatorProfile } from "@/lib/api";
import { UserCircle2, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo } from "react";

export function OperatorManagementPanel() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const isSupervisor = hasRole("ROLE_SUPERVISOR");

  const query = useQuery({
    queryKey: ["operators"],
    queryFn: getOperators,
    enabled: isSupervisor,
  });

  const assign = useMutation({
    mutationFn: (vars: { username: string; assignedShift: 1 | 2 | 3 | null }) => setOperatorShift(vars.username, vars.assignedShift),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operators"] });
    },
  });

  const { shift1, shift2, shift3, unassigned } = useMemo(() => {
    const ops = query.data ?? [];
    return {
      shift1: ops.filter(o => o.assignedShift === 1),
      shift2: ops.filter(o => o.assignedShift === 2),
      shift3: ops.filter(o => o.assignedShift === 3),
      unassigned: ops.filter(o => !o.assignedShift),
    };
  }, [query.data]);

  if (!isSupervisor) return null;

  return (
    <section className="rounded-lg border border-border bg-card flex flex-col min-h-0 h-full max-h-[600px]">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <UserCircle2 className="size-4 text-primary" /> Operator Shift Assignments
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Assign operators to static shifts (Supervisor override)</p>
        </div>
        <button onClick={() => query.refetch()} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`size-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {query.isLoading && (
          <div className="py-8 grid place-items-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        
        {!query.isLoading && (
          <>
            <ShiftGroup title="Shift 1 (08:00 - 16:00 UTC)" operators={shift1} assign={assign.mutate} isPending={assign.isPending} />
            <ShiftGroup title="Shift 2 (16:00 - 00:00 UTC)" operators={shift2} assign={assign.mutate} isPending={assign.isPending} />
            <ShiftGroup title="Shift 3 (00:00 - 08:00 UTC)" operators={shift3} assign={assign.mutate} isPending={assign.isPending} />
            <ShiftGroup title="Unassigned" operators={unassigned} assign={assign.mutate} isPending={assign.isPending} emptyMessage="No operators unassigned" />
          </>
        )}
      </div>
    </section>
  );
}

function ShiftGroup({ title, operators, assign, isPending, emptyMessage = "No operators assigned" }: { 
  title: string; 
  operators: OperatorProfile[];
  assign: (vars: { username: string; assignedShift: 1 | 2 | 3 | null }) => void;
  isPending: boolean;
  emptyMessage?: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-1.5">
        {operators.length === 0 && (
          <div className="text-[11px] text-muted-foreground/60 italic px-2">{emptyMessage}</div>
        )}
        {operators.map(op => (
          <div key={op.username} className="flex items-center justify-between px-3 py-2 rounded-md border border-border bg-surface/40 hover:bg-surface transition-colors">
            <div className="flex items-center gap-3">
              <div className="size-6 rounded-full bg-primary/10 border border-primary/20 grid place-items-center text-[10px] font-semibold uppercase text-primary">
                {op.username.slice(0, 2)}
              </div>
              <div className="text-xs font-medium">{op.username}</div>
            </div>
            
            <div className="w-32">
              <Select 
                disabled={isPending}
                value={op.assignedShift ? String(op.assignedShift) : "none"} 
                onValueChange={(v) => assign({ username: op.username, assignedShift: v === "none" ? null : Number(v) as 1 | 2 | 3 })}
              >
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-[11px]">Shift 1</SelectItem>
                  <SelectItem value="2" className="text-[11px]">Shift 2</SelectItem>
                  <SelectItem value="3" className="text-[11px]">Shift 3</SelectItem>
                  <SelectItem value="none" className="text-[11px]">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
