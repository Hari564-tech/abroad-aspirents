import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { ShellSkeleton } from "@/components/loading-state";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const hydrated = useAppStore((s) => s.hydrated);
  const user = useAppStore((s) => s.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) void navigate({ to: "/login", replace: true });
    else if (user.role === "admin") void navigate({ to: "/admin/dashboard", replace: true });
    else void navigate({ to: "/employee/dashboard", replace: true });
  }, [hydrated, user, navigate]);

  return <ShellSkeleton />;
}
