import { useMemo } from "react";
import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { getFileData } from "@/lib/file-cache";

export function DocumentVersionHistory({ documentId }: { documentId: string }) {
  const allVersions = useAppStore((s) => s.documentVersions);
  const versions = useMemo(
    () => allVersions.filter((v) => v.documentId === documentId),
    [allVersions, documentId],
  );
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  if (!sorted.length) {
    return <p className="text-sm text-muted-foreground">No previous versions.</p>;
  }

  function open(id: string, fileName: string) {
    const data = getFileData(id);
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = fileName;
    a.click();
  }

  return (
    <div className="grid gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Version history</h3>
      {sorted.map((v) => (
        <div key={v.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div>
            <p className="text-sm font-medium">v{v.version}</p>
            <p className="text-micro text-muted-foreground">
              {formatShortDate(v.uploadedAt)} · Uploaded by {v.uploadedBy}
            </p>
          </div>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => open(v.id, v.fileName)} disabled={!getFileData(v.id)}>
              <Eye className="size-3.5" /> View
            </Button>
            <Button size="xs" variant="ghost" onClick={() => open(v.id, v.fileName)} disabled={!getFileData(v.id)}>
              <Download className="size-3.5" /> Download
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
