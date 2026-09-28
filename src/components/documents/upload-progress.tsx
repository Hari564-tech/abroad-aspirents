import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function UploadProgress({
  fileName,
  progress,
  complete,
  error,
  className,
}: {
  fileName: string;
  progress: number;
  complete?: boolean;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-secondary/40 p-3", className)}>
      {complete ? (
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <Check className="size-4" /> Upload complete
        </p>
      ) : error ? (
        <p className="text-sm font-medium text-destructive">{error}</p>
      ) : (
        <p className="text-sm font-medium">Uploading…</p>
      )}
      <p className="mt-1 truncate text-micro text-muted-foreground">{fileName}</p>
      {!complete && !error && (
        <div className="mt-2 flex items-center gap-3">
          <Progress value={progress} className="flex-1" />
          <span className="text-micro tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}
