import { createFileRoute } from "@tanstack/react-router";
import { EmployeeDashboardPage } from "@/pages/dashboard-employee";

export const Route = createFileRoute("/employee/dashboard")({
  component: EmployeeDashboardPage,
});
