import { createFileRoute } from "@tanstack/react-router";
import { StudentFormPage } from "@/pages/student-form";

export const Route = createFileRoute("/admin/students/new")({
  component: () => <StudentFormPage />,
});
