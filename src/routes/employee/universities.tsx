import { createFileRoute } from "@tanstack/react-router";
import { UniversitiesPage } from "@/pages/universities-page";

export const Route = createFileRoute("/employee/universities")({
  component: UniversitiesPage,
});
