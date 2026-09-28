import { createFileRoute } from "@tanstack/react-router";
import { DocumentsPage } from "@/pages/documents-page";

export const Route = createFileRoute("/employee/documents")({
  component: DocumentsPage,
});
