import { createFileRoute } from "@tanstack/react-router";
import { StudentsPage } from "@/pages/students-page";

export const Route = createFileRoute("/admin/students/")({
  component: StudentsPage,
});
