import { DocumentCategory } from "@/components/documents/document-category";
import { groupedByCategory } from "@/lib/documents";
import type { StudentDocument } from "@/lib/types";

export function DocumentChecklist({
  documents,
  onAdd,
  onView,
  onUpload,
  onReview,
}: {
  documents: StudentDocument[];
  onAdd: (category: string) => void;
  onView: (doc: StudentDocument) => void;
  onUpload: (doc: StudentDocument) => void;
  onReview: (doc: StudentDocument) => void;
}) {
  const groups = groupedByCategory(documents);
  return (
    <div className="grid gap-3">
      {groups.map((g) => (
        <DocumentCategory
          key={g.category}
          category={g.category}
          items={g.items}
          onAdd={() => onAdd(g.category)}
          onView={onView}
          onUpload={onUpload}
          onReview={onReview}
        />
      ))}
    </div>
  );
}
