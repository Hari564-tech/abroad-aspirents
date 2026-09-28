import { Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { isOverdue, relativeShort } from "@/lib/documents";
import { formatShortDate } from "@/lib/format";
import type { StudentDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

function actionFor(doc: StudentDocument) {
  if (doc.status === "pending" || doc.status === "rejected" || doc.status === "expired") {
    return { label: "Upload", kind: "upload" as const };
  }
  if (doc.status === "under_review" || doc.status === "uploaded") {
    return { label: "Review", kind: "review" as const };
  }
  return { label: "View", kind: "view" as const };
}

export function DocumentRow({
  doc,
  onView,
  onUpload,
  onReview,
}: {
  doc: StudentDocument;
  onView: () => void;
  onUpload: () => void;
  onReview: () => void;
}) {
  const overdue = isOverdue(doc.dueDate, doc.status);
  const action = actionFor(doc);
  const run = action.kind === "upload" ? onUpload : action.kind === "review" ? onReview : onView;

  return (
    <div className="grid grid-cols-1 items-center gap-2 border-b px-3 py-2.5 last:border-0 sm:grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr_0.8fr_0.7fr_0.7fr_auto] sm:gap-3">
      <div>
        <p className="text-sm font-medium">{doc.universityName ? `${doc.type} — ${doc.universityName}` : doc.type}</p>
        {doc.universityName && <p className="text-micro text-muted-foreground">{doc.course}</p>}
      </div>
      <p className="hidden text-sm text-muted-foreground sm:block">{doc.category}</p>
      <p className="text-sm">{doc.required ? "Required" : "Optional"}</p>
      <DocumentStatusBadge status={doc.status} />
      <p className="hidden text-sm text-muted-foreground sm:block">{doc.uploadedBy ?? "—"}</p>
      <p className="hidden text-sm text-muted-foreground sm:block">{relativeShort(doc.updatedAt)}</p>
      <p className={cn("hidden text-sm sm:block", overdue && "font-medium text-destructive")}>
        {doc.dueDate ? formatShortDate(doc.dueDate) : "—"}
      </p>
      <Button size="xs" variant="outline" onClick={run}>
        {action.kind === "upload" ? <Upload className="size-3.5" /> : <Eye className="size-3.5" />}
        {action.label}
      </Button>
    </div>
  );
}
