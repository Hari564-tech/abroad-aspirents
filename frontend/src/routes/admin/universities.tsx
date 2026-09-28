import { createFileRoute } from "@tanstack/react-router";
import { UniversitiesPage } from "@/pages/universities-page";

export const Route = createFileRoute("/admin/universities")({
  component: UniversitiesPage,
});
