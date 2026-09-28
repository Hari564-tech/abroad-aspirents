import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShellSkeleton } from "@/components/loading-state";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

const DEMOS = [
  { role: "Admin", email: "admin@demo.com", password: "demo" },
  { role: "Employee", email: "employee@demo.com", password: "demo" },
];

function LoginPage() {
  const login = useAppStore((s) => s.login);
  const user = useAppStore((s) => s.currentUser);
  const hydrated = useAppStore((s) => s.hydrated);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated || !user) return;
    void navigate({
      to: user.role === "admin" ? "/admin/dashboard" : "/employee/dashboard",
      replace: true,
    });
  }, [hydrated, user, navigate]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter both email and password.");
      return;
    }
    const result = login(email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Welcome back");
    void navigate({
      to: result.user.role === "admin" ? "/admin/dashboard" : "/employee/dashboard",
    });
  }

  if (hydrated && user) return <ShellSkeleton />;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-foreground text-background lg:flex lg:flex-col">
        <div className="relative z-10 flex flex-1 flex-col p-10">
          <Logo className="[&_.text-foreground]:text-background [&_.text-muted-foreground]:text-background/60" />
          <div className="mt-16 max-w-md">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-background/55">Student operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Run applications, payments and visas from one workspace.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-background/70">
              Counselors operate the workflow. Administrators monitor, audit and control it — with the same
              source of truth.
            </p>
          </div>
          <div className="mt-auto">
            <DashboardArt />
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-10 size-96 rounded-full bg-info/20 blur-3xl"
        />
      </aside>

      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to your workspace</p>

          <form onSubmit={submit} className="mt-8 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@meridian.edu"
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary"
                  onClick={() => toast.message("Password reset is simulated in this prototype.")}
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
              Remember me
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-10">
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Demo access</p>
            <div className="mt-3 grid gap-2">
              {DEMOS.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword(d.password);
                    setError("");
                  }}
                  className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <span className="font-medium">{d.role}</span>
                  <span className="font-mono text-xs text-muted-foreground">{d.email}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-micro text-muted-foreground">
              Simulated sign-in only. No production authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardArt() {
  return (
    <div className="rounded-xl border border-background/10 bg-background/5 p-4 shadow-popover">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-2 w-24 rounded-full bg-background/30" />
        <div className="flex gap-1">
          <span className="size-1.5 rounded-full bg-background/30" />
          <span className="size-1.5 rounded-full bg-background/30" />
          <span className="size-1.5 rounded-full bg-background/30" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["Students", "Offers", "Visas"].map((l, i) => (
          <div key={l} className="rounded-lg bg-background/8 p-3">
            <div className="text-[10px] uppercase tracking-wider text-background/45">{l}</div>
            <div className="mt-1 font-mono text-lg text-background">{[72, 18, 7][i]}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-24 items-end gap-1.5 px-1">
        {[40, 55, 48, 70, 62, 80, 74, 88, 92].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-primary/70"
            style={{ height: `${h}%`, opacity: 0.45 + i * 0.05 }}
          />
        ))}
      </div>
    </div>
  );
}
