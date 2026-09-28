import { createFileRoute } from "@tanstack/react-router";
import { DocumentsPage } from "@/pages/documents-page";

export const Route = createFileRoute("/admin/documents")({
  component: DocumentsPage,
});
