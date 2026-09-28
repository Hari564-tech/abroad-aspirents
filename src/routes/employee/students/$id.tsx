import { createFileRoute } from "@tanstack/react-router";
import { StudentDetailPage } from "@/pages/student-detail";

export const Route = createFileRoute("/employee/students/$id")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <StudentDetailPage studentId={id} />;
}
