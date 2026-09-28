import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "@/pages/payments-page";

export const Route = createFileRoute("/admin/payments")({
  component: PaymentsPage,
});
