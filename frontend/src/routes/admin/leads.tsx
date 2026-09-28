import { createFileRoute } from "@tanstack/react-router";
import { LeadsPage } from "@/pages/leads-page";

export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
});
