import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Bell, BrainCircuit, Cpu, Gauge, Settings as SettingsIcon, LogOut, UserCircle2, GitPullRequestArrow, ScrollText } from "lucide-react";
import { getActiveAlerts } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { SystemHealthPill } from "@/components/system-health-pill";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ClockOffModal } from "@/components/clock-off-modal";

const NAV = [
  { to: "/", label: "Overview", icon: Gauge, exact: true },
  { to: "/unit/unit-1", label: "Unit 1", icon: Cpu },
  { to: "/unit/unit-2", label: "Unit 2", icon: Cpu },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/predictive", label: "Predictive", icon: BrainCircuit },
  { to: "/operations", label: "Operations", icon: GitPullRequestArrow },
  { to: "/audit", label: "Audit Log", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const isPublic = pathname === "/login" || pathname === "/signup";

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

  // Route guard: redirect unauthenticated users to /login (except on public routes).
  useEffect(() => {
    if (loading) return;
    if (isPublic) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    
    if (lockedOut && pathname !== "/") {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, isPublic, navigate, pathname, lockedOut]);

  // Public routes: bypass the shell entirely.
  if (isPublic) return <>{children}</>;

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground text-xs uppercase tracking-wider">
        <span className="inline-flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary pulse-live" /> Authenticating…
        </span>
      </div>
    );
  }



  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-surface-2 grid place-items-center border border-border">
              <Activity className="size-4 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">NTPC Lara</div>
              <div className="text-sm font-semibold">Telemetry Console</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.filter(n => {
            if (lockedOut && n.to !== "/") return false;
            if (n.to === "/operations" || n.to === "/audit") {
              return user?.roles?.includes("ROLE_SUPERVISOR");
            }
            return true;
          }).map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                <span>{n.label}</span>
                {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-muted-foreground font-num">
          BUILD 2026.06 · v0.5.0
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const [clockOffOpen, setClockOffOpen] = useState(false);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const alerts = useQuery({
    queryKey: ["alerts", "active"],
    queryFn: getActiveAlerts,
    refetchInterval: 4000,
  });
  const unread = alerts.data?.length ?? 0;

  const currentShift = now ? (
    now.getUTCHours() >= 8 && now.getUTCHours() < 16 ? 1 :
    now.getUTCHours() >= 16 ? 2 : 3
  ) : 1;

  const roleLabel = user?.roles?.[0]?.replace(/^ROLE_/, "") ?? "GUEST";
  const isOperatorOnly = user?.roles?.includes("ROLE_OPERATOR") && !user?.roles?.includes("ROLE_SUPERVISOR") && !user?.roles?.includes("ROLE_ADMIN");

  return (
    <header className="h-14 shrink-0 border-b border-border bg-surface/60 backdrop-blur px-5 flex items-center gap-6">
      <div className="flex items-center gap-2">
        {online ? (
          <>
            <span className="status-dot bg-status-normal pulse-live" />
            <span className="text-xs uppercase tracking-wider text-status-normal font-medium">Live</span>
          </>
        ) : (
          <>
            <span className="status-dot bg-status-critical" />
            <span className="text-xs uppercase tracking-wider text-status-critical font-medium">Disconnected</span>
          </>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Plant ID <span className="font-num text-foreground/80">NTPC-LARA-01</span>
      </div>
      <div className="px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-widest ml-2">
        SHIFT {currentShift}
      </div>
      <div className="ml-auto flex items-center gap-4">
        <SystemHealthPill />
        <div className="text-xs text-muted-foreground font-num min-w-[170px] text-right">
          {now ? now.toISOString().replace("T", " ").slice(0, 19) + " UTC" : "— — —"}
        </div>
        
        {isOperatorOnly && (
          <Button variant="outline" size="sm" onClick={() => setClockOffOpen(true)} className="h-9 px-3 text-xs gap-2">
            Clock Off
          </Button>
        )}

        <Link to="/alerts" className="relative inline-flex items-center justify-center size-9 rounded-md hover:bg-accent border border-border">
          <Bell className="size-4" />
          {unread > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-num font-semibold grid place-items-center bg-status-critical text-white",
                unread > 0 && "pulse-alert",
              )}
            >
              {unread}
            </span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 h-9 pl-2 pr-3 rounded-md border border-border bg-surface/60 hover:bg-accent transition-colors">
              <div className="size-6 rounded-full bg-primary/20 border border-primary/40 grid place-items-center">
                <UserCircle2 className="size-4 text-primary" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-medium">{user?.username ?? "—"}</div>
                <div className="text-[9px] uppercase tracking-wider text-primary font-num">{roleLabel}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs">
              Signed in as <span className="font-num">{user?.username}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Roles</div>
            <div className="px-2 pb-2 flex flex-wrap gap-1">
              {user?.roles?.map((r) => (
                <span key={r} className="text-[10px] font-num px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                  {r.replace(/^ROLE_/, "")}
                </span>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                logout();
                navigate({ to: "/login", replace: true });
              }}
              className="text-status-critical focus:text-status-critical"
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ClockOffModal open={clockOffOpen} onOpenChange={setClockOffOpen} />
    </header>
  );
}
