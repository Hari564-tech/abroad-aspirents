import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ShellSkeleton } from "@/components/loading-state";
import { WorkspaceContext } from "@/lib/workspace";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  const user = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) void navigate({ to: "/login", replace: true });
    else if (user.role !== "admin") void navigate({ to: "/employee/dashboard", replace: true });
  }, [hydrated, user, navigate]);

  if (!hydrated || !user || user.role !== "admin") return <ShellSkeleton />;

  return (
    <WorkspaceContext.Provider value={{ role: "admin", base: "/admin" }}>
      <AppShell />
    </WorkspaceContext.Provider>
  );
}
