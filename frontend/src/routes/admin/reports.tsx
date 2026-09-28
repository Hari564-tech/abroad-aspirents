import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/pages/reports-page";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});
