import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, Loader2, LockKeyhole, Mail, User, UserPlus, Wrench, Eye, ChevronDown } from "lucide-react";
import { useAuth, type DemoRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account · NTPC Lara Telemetry" },
      { name: "description", content: "Register a new operator or supervisor account." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<DemoRole>("ROLE_OPERATOR");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setPending(true);
    try {
      await signup({ username, password, email, role });
      toast.success("Account created — please sign in");
      navigate({ to: "/login", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
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

        <form onSubmit={submit}
          className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-7 shadow-2xl"
          style={{ boxShadow: "0 20px 60px -20px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(1 0 0 / 0.03) inset" }}>
          <div className="mb-5">
            <h1 className="text-xl font-semibold tracking-tight">Create Account</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Register a new console user. All fields required.
            </p>
          </div>

          <div className="space-y-4">
            <Field icon={User} label="Username">
              <input autoFocus required value={username} onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full bg-transparent outline-none text-sm font-num placeholder:text-muted-foreground/60"
                placeholder="j.doe" />
            </Field>
            <Field icon={Mail} label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full bg-transparent outline-none text-sm font-num placeholder:text-muted-foreground/60"
                placeholder="operator@ntpc.co.in" />
            </Field>
            <Field icon={LockKeyhole} label="Password">
              <input type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-transparent outline-none text-sm font-num placeholder:text-muted-foreground/60"
                placeholder="min. 6 characters" />
            </Field>

            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Role</div>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as DemoRole)}
                  className={cn(
                    "appearance-none w-full h-11 pl-10 pr-9 rounded-md border border-border bg-surface/60",
                    "text-sm outline-none focus:border-primary/60 focus:bg-surface transition-colors cursor-pointer",
                  )}>
                  <option value="ROLE_OPERATOR">Operator — full control</option>
                  <option value="ROLE_SUPERVISOR">Supervisor — read-only</option>
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {role === "ROLE_OPERATOR"
                    ? <Wrench className="size-4 text-primary" />
                    : <Eye className="size-4 text-primary" />}
                </div>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 text-xs px-3 py-2 rounded-md bg-status-critical-bg text-status-critical border border-status-critical/30">
              {error}
            </div>
          )}

          <button type="submit" disabled={pending}
            className={cn(
              "mt-6 w-full h-10 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2 transition-all",
              "bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-[0_0_0_1px_var(--primary)]",
            )}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {pending ? "Creating…" : "Create account"}
          </button>

          <div className="mt-5 pt-5 border-t border-border text-[11px] text-muted-foreground text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
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
