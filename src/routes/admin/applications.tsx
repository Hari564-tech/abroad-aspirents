import { createFileRoute } from "@tanstack/react-router";
import { ApplicationsPage } from "@/pages/applications-page";

export const Route = createFileRoute("/admin/applications")({
  component: ApplicationsPage,
});
