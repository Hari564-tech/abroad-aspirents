import { Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { isOverdue, relativeShort } from "@/lib/documents";
import { formatShortDate } from "@/lib/format";
import type { StudentDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DocumentCard({
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
  const needsUpload = doc.status === "pending" || doc.status === "rejected" || doc.status === "expired";
  const needsReview = doc.status === "under_review" || doc.status === "uploaded";
  return (
    <div className="rounded-xl border bg-card p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{doc.universityName ? `${doc.type} — ${doc.universityName}` : doc.type}</p>
          <p className="text-micro text-muted-foreground">
            {doc.category} · {doc.required ? "Required" : "Optional"}
          </p>
        </div>
        <DocumentStatusBadge status={doc.status} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-micro text-muted-foreground">
        <div>By {doc.uploadedBy ?? "—"}</div>
        <div>{relativeShort(doc.updatedAt)}</div>
        <div className={cn(overdue && "font-medium text-destructive")}>
          {doc.dueDate ? `Due ${formatShortDate(doc.dueDate)}` : "No due date"}
        </div>
        <div>v{doc.version || "—"}</div>
      </dl>
      <Button
        size="sm"
        variant="outline"
        className="mt-3 w-full"
        onClick={needsUpload ? onUpload : needsReview ? onReview : onView}
      >
        {needsUpload ? <Upload className="size-3.5" /> : <Eye className="size-3.5" />}
        {needsUpload ? "Upload" : needsReview ? "Review" : "View"}
      </Button>
    </div>
  );
}
