import { createFileRoute } from "@tanstack/react-router";
import { AuditPage } from "@/pages/audit-page";

export const Route = createFileRoute("/admin/audit")({
  component: AuditPage,
});
