import { createFileRoute } from "@tanstack/react-router";
import { StudentUploadPortal } from "@/components/documents/student-upload-portal";

export const Route = createFileRoute("/student-upload/$token")({
  component: StudentUploadRoute,
});

function StudentUploadRoute() {
  const { token } = Route.useParams();
  return <StudentUploadPortal token={token} />;
}
