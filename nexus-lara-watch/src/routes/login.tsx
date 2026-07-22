import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2, LockKeyhole, ShieldCheck, User, Eye, Wrench } from "lucide-react";
import { useAuth, DEMO_ACCOUNTS, type DemoRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · NTPC Lara Telemetry" },
      { name: "description", content: "Operator sign-in for the NTPC Lara telemetry console." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<DemoRole>("ROLE_OPERATOR");
  const [username, setUsername] = useState("operator");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  const selectRole = (r: DemoRole) => {
    setRole(r);
    const acc = DEMO_ACCOUNTS.find((a) => a.role === r)!;
    setUsername(acc.username);
    setPassword("");
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setPending(true);
    try {
      await login(username, password);
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally { setPending(false); }
  };

  const demoLogin = async (r: DemoRole) => {
    const acc = DEMO_ACCOUNTS.find((a) => a.role === r)!;
    setRole(r); setUsername(acc.username); setPassword(acc.password);
    setError(null); setPending(true);
    try {
      await login(acc.username, acc.password);
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally { setPending(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 size-[520px] rounded-full blur-3xl opacity-30"
             style={{ background: "radial-gradient(circle, var(--primary), transparent 60%)" }} />
        <div className="absolute -bottom-40 -right-40 size-[520px] rounded-full blur-3xl opacity-20"
             style={{ background: "radial-gradient(circle, var(--chart-5), transparent 60%)" }} />
        <div className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />
      </div>

      <div className="relative w-full max-w-[440px]">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="size-9 rounded-md bg-surface-2 grid place-items-center border border-border">
            <Activity className="size-4 text-primary" />
          </div>
          <div className="leading-tight text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">NTPC Lara</div>
            <div className="text-sm font-semibold">Telemetry Console</div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-7 shadow-2xl relative"
          style={{ boxShadow: "0 20px 60px -20px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(1 0 0 / 0.03) inset" }}
        >
          <div className="mb-5">
            <h1 className="text-xl font-semibold tracking-tight">Operator Sign-in</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Choose a role, then authenticate with your plant credentials.
            </p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-surface/60 border border-border mb-5">
            <RolePill
              active={role === "ROLE_OPERATOR"}
              onClick={() => selectRole("ROLE_OPERATOR")}
              icon={Wrench} label="Operator" hint="Read + Write"
            />
            <RolePill
              active={role === "ROLE_SUPERVISOR"}
              onClick={() => selectRole("ROLE_SUPERVISOR")}
              icon={Eye} label="Supervisor" hint="Read-only"
            />
          </div>

          <div className="space-y-4">
            <Field icon={User} label="Username">
              <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full bg-transparent outline-none text-sm font-num placeholder:text-muted-foreground/60"
                placeholder="operator" />
            </Field>
            <Field icon={LockKeyhole} label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-transparent outline-none text-sm font-num placeholder:text-muted-foreground/60"
                placeholder="••••••••" />
            </Field>
          </div>

          {error && (
            <div className="mt-4 text-xs px-3 py-2 rounded-md bg-status-critical-bg text-status-critical border border-status-critical/30">
              {error}
            </div>
          )}

          <button type="submit" disabled={pending || !username || !password}
            className={cn(
              "mt-6 w-full h-10 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2 transition-all",
              "bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-[0_0_0_1px_var(--primary)]",
            )}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {pending ? "Signing in…" : "Sign in"}
          </button>

          {/* Quick demo logins */}
          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
              One-click demo access
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.role}
                  type="button"
                  disabled={pending}
                  onClick={() => demoLogin(a.role)}
                  className="text-left rounded-md border border-border bg-surface/60 hover:bg-accent hover:border-primary/40 transition-colors px-3 py-2.5 group disabled:opacity-50"
                >
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    {a.role === "ROLE_OPERATOR" ? <Wrench className="size-3.5 text-primary" /> : <Eye className="size-3.5 text-primary" />}
                    Login as {a.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-num mt-0.5">
                    {a.username} / {a.password}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
            <Link to="/signup" className="hover:text-foreground transition-colors">
              Need an account? <span className="text-primary">Sign up</span>
            </Link>
            <span className="text-status-normal inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-status-normal pulse-live" /> Gateway online
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

function RolePill({ active, onClick, icon: Icon, label, hint }: {
  active: boolean; onClick: () => void;
  icon: React.ComponentType<{ className?: string }>; label: string; hint: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all",
        active
          ? "bg-primary/15 text-foreground border border-primary/40 shadow-[0_0_0_1px_var(--primary)]/20"
          : "text-muted-foreground hover:text-foreground border border-transparent",
      )}>
      <Icon className={cn("size-4", active ? "text-primary" : "")} />
      <div className="text-left leading-tight">
        <div className="text-xs font-semibold">{label}</div>
        <div className="text-[10px] opacity-70">{hint}</div>
      </div>
    </button>
  );
}

function Field({ icon: Icon, label, children }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; children: React.ReactNode;
}) {
  return (
    <label className="block group">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">{label}</div>
      <div className="flex items-center gap-2.5 px-3 h-11 rounded-md border border-border bg-surface/60 focus-within:border-primary/60 focus-within:bg-surface transition-colors">
        <Icon className="size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        {children}
      </div>
    </label>
  );
}
