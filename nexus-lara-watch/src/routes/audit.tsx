import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronDown, ChevronRight, Search } from "lucide-react";
import { getOperatorActions, unitLabel, type AuditActionType, type UnitId } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { elapsed } from "@/components/telemetry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log · NTPC Lara Telemetry" },
      { name: "description", content: "Read-only operator audit log across acknowledgments, resolutions, overrides, and handovers." },
    ],
  }),
  component: AuditPage,
});

const ACTIONS: (AuditActionType | "all")[] = ["all", "ACK", "RESOLVE", "OVERRIDE"];
const UNIT_OPTS: (UnitId | "all")[] = ["all", "unit-1", "unit-2"];

const ACTION_TONE: Record<AuditActionType, string> = {
  ACK: "text-status-normal bg-status-normal-bg border-status-normal/30",
  RESOLVE: "text-primary bg-primary/10 border-primary/30",
  OVERRIDE: "text-status-maint bg-status-maint-bg border-status-maint/30",
};

function AuditPage() {
  const [action, setAction] = useState<AuditActionType | "all">("all");
  const [unit, setUnit] = useState<UnitId | "all">("all");
  const [user, setUser] = useState("");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["audit"], queryFn: () => getOperatorActions(), refetchInterval: 15000 });
  const entries = query.data ?? [];

  const filtered = useMemo(() => entries.filter((e) => {
    if (action !== "all" && e.action !== action) return false;
    if (unit !== "all" && e.unit !== unit) return false;
    if (user && !e.username.toLowerCase().includes(user.toLowerCase())) return false;
    if (q) {
      const hay = `${e.username} ${e.target} ${e.notes ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [entries, action, unit, user, q]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      <PageHeader title="Operator Audit Log" subtitle="Every operator action, immutable and filterable" />

      <div className="flex flex-wrap gap-3 items-center rounded-lg border border-border bg-card px-4 py-3">
        <Select label="Action" value={action} onChange={(v) => setAction(v as any)}
          options={ACTIONS.map((a) => ({ value: a, label: a === "all" ? "All actions" : a }))} />
        <Select label="Unit" value={unit} onChange={(v) => setUnit(v as any)}
          options={UNIT_OPTS.map((u) => ({ value: u, label: u === "all" ? "All units" : unitLabel(u) }))} />
        <label className="inline-flex items-center gap-2 text-xs">
          <span className="text-muted-foreground uppercase tracking-wider text-[11px]">User</span>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="username"
            className="bg-surface border border-border rounded-md h-8 px-2 text-sm font-num focus:outline-none focus:border-primary/60" />
        </label>
        <label className="inline-flex items-center gap-2 text-xs flex-1 min-w-[200px]">
          <Search className="size-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search target, notes…"
            className="w-full bg-surface border border-border rounded-md h-8 px-2 text-sm focus:outline-none focus:border-primary/60" />
        </label>
        <div className="text-xs text-muted-foreground font-num">{filtered.length} entr{filtered.length === 1 ? "y" : "ies"}</div>
      </div>

      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface/40">
              <th className="w-8"></th>
              <th className="text-left font-medium px-2 py-2.5">Category</th>
              <th className="text-left font-medium px-2 py-2.5">Action</th>
              <th className="text-left font-medium px-2 py-2.5">User</th>
              <th className="text-left font-medium px-2 py-2.5">Target</th>
              <th className="text-left font-medium px-2 py-2.5">Unit</th>
              <th className="text-right font-medium px-4 py-2.5">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No audit entries match the filters.</td></tr>
            )}
            {filtered.map((e) => {
              const open = expanded === e.id;
              return (
                <>
                  <tr key={e.id} className="hover:bg-accent/30 cursor-pointer" onClick={() => setExpanded(open ? null : e.id)}>
                    <td className="px-2 py-2.5">
                      {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        {e.action === "OVERRIDE" ? "THRESHOLD" : "ALERT"}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className={cn("inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border", ACTION_TONE[e.action])}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 font-num text-xs">{e.username}</td>
                    <td className="px-2 py-2.5 font-num text-xs text-muted-foreground">{e.target}</td>
                    <td className="px-2 py-2.5 text-xs text-muted-foreground">{e.unit ? unitLabel(e.unit) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-num text-muted-foreground">{elapsed(e.timestamp)}</td>
                  </tr>
                  {open && (
                    <tr key={`${e.id}-x`} className="bg-surface/30">
                      <td></td>
                      <td colSpan={6} className="px-2 py-3">
                        <div className="text-[11px] text-muted-foreground mb-1">Notes</div>
                        <div className="text-sm border-l-2 border-primary/40 pl-3 py-1">
                          {e.notes ? (
                            <span className="text-foreground">{e.notes}</span>
                          ) : (
                            <span className="text-muted-foreground italic">No notes provided for this action.</span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-3 mb-1">Payload</div>
                        <pre className="text-[11px] font-num bg-surface rounded-md p-2 border border-border overflow-auto">{JSON.stringify(e.payload ?? {}, null, 2)}</pre>
                        <div className="mt-2 text-[10px] font-num text-muted-foreground">
                          {new Date(e.timestamp).toISOString()} · {e.id}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="text-muted-foreground uppercase tracking-wider text-[11px]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-border rounded-md h-8 px-2 text-sm text-foreground focus:outline-none focus:border-primary/60">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
