import { createFileRoute } from "@tanstack/react-router";
import { StudentFormPage } from "@/pages/student-form";

export const Route = createFileRoute("/admin/students/$id/edit")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <StudentFormPage studentId={id} />;
}
