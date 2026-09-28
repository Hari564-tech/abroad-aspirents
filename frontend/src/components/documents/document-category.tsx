import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentRow } from "@/components/documents/document-row";
import { DocumentCard } from "@/components/documents/document-card";
import { cn } from "@/lib/utils";
import type { DocumentCategory as Category, StudentDocument } from "@/lib/types";

export function DocumentCategory({
  category,
  items,
  onAdd,
  onView,
  onUpload,
  onReview,
}: {
  category: Category;
  items: StudentDocument[];
  onAdd: () => void;
  onView: (doc: StudentDocument) => void;
  onUpload: (doc: StudentDocument) => void;
  onReview: (doc: StudentDocument) => void;
}) {
  const [open, setOpen] = useState(true);
  const done = items.filter((d) => d.status === "verified" || d.status === "uploaded" || d.status === "under_review").length;

  return (
    <section className="overflow-hidden rounded-xl bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform duration-150", !open && "-rotate-90")} />
          <span className="font-medium">{category}</span>
          <span className="text-micro text-muted-foreground">
            {done}/{items.length}
          </span>
        </button>
        <Button size="xs" variant="ghost" onClick={onAdd}>
          <Plus className="size-3.5" /> Add document
        </Button>
      </div>
      {open && (
        <>
          <div className="hidden border-t sm:block">
            <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr_0.8fr_0.7fr_0.7fr_auto] gap-3 px-3 py-2 text-micro font-medium text-muted-foreground">
              <span>Document</span>
              <span>Category</span>
              <span>Required</span>
              <span>Status</span>
              <span>Uploaded by</span>
              <span>Updated</span>
              <span>Due</span>
              <span />
            </div>
            {items.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onView={() => onView(doc)}
                onUpload={() => onUpload(doc)}
                onReview={() => onReview(doc)}
              />
            ))}
            {items.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground">No documents in this category yet.</p>
            )}
          </div>
          <div className="grid gap-2 border-t p-3 sm:hidden">
            {items.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onView={() => onView(doc)}
                onUpload={() => onUpload(doc)}
                onReview={() => onReview(doc)}
              />
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No documents in this category yet.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
