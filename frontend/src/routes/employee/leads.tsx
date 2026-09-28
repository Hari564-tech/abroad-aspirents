import { createFileRoute } from "@tanstack/react-router";
import { LeadsPage } from "@/pages/leads-page";

export const Route = createFileRoute("/employee/leads")({
  component: LeadsPage,
});
