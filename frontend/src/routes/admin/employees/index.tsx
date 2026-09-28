import { createFileRoute } from "@tanstack/react-router";
import { EmployeesPage } from "@/pages/employees-page";

export const Route = createFileRoute("/admin/employees/")({
  component: EmployeesPage,
});
