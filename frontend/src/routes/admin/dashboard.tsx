import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPage } from "@/pages/dashboard-admin";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardPage,
});
