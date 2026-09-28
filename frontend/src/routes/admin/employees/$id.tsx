import { createFileRoute } from "@tanstack/react-router";
import { EmployeeDetailPage } from "@/pages/employee-detail";

export const Route = createFileRoute("/admin/employees/$id")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <EmployeeDetailPage employeeId={id} />;
}
