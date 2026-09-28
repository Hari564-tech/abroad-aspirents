import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canPreview } from "@/lib/documents";
import { getFileData } from "@/lib/file-cache";
import type { StudentDocument } from "@/lib/types";

export function DocumentPreview({ doc }: { doc: StudentDocument }) {
  const data = getFileData(doc.id);
  const previewable = canPreview(doc.fileType, doc.fileName);
  const isImage = (doc.fileType || "").startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(doc.fileName || "");
  const isPdf = (doc.fileType || "") === "application/pdf" || /\.pdf$/i.test(doc.fileName || "");

  function download() {
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = doc.fileName || `${doc.type}.pdf`;
    a.click();
  }

  if (!doc.fileName) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-lg bg-secondary/50 text-sm text-muted-foreground">
        No file uploaded yet
      </div>
    );
  }

  if (!data || !previewable) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-lg bg-secondary/50">
        <p className="text-sm font-medium">Preview unavailable</p>
        <p className="text-micro text-muted-foreground">{doc.fileName}</p>
        {data && (
          <Button size="sm" variant="outline" onClick={download}>
            <Download className="size-4" /> Download document
          </Button>
        )}
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="overflow-hidden rounded-lg border bg-secondary/30">
        <img src={data} alt={doc.fileName} className="max-h-[420px] w-full object-contain" />
      </div>
    );
  }

  if (isPdf) {
    return (
      <iframe title={doc.fileName} src={data} className="h-[420px] w-full rounded-lg border bg-card" />
    );
  }

  return null;
}
