import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ShellSkeleton } from "@/components/loading-state";
import { WorkspaceContext } from "@/lib/workspace";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/employee")({ component: EmployeeLayout });

function EmployeeLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  const user = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) void navigate({ to: "/login", replace: true });
    else if (user.role !== "employee") void navigate({ to: "/admin/dashboard", replace: true });
  }, [hydrated, user, navigate]);

  if (!hydrated || !user || user.role !== "employee") return <ShellSkeleton />;

  return (
    <WorkspaceContext.Provider value={{ role: "employee", base: "/employee" }}>
      <AppShell />
    </WorkspaceContext.Provider>
  );
}
