import { useCallback, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { UploadProgress } from "@/components/documents/upload-progress";
import { DOCUMENT_TYPE_CATALOG, defaultDocumentName, FILE_RULES, formatBytes, validateUploadFile } from "@/lib/documents";
import { useAppStore } from "@/lib/store";
import type { Student, StudentDocument } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DocumentUpload({
  open,
  onOpenChange,
  student,
  presetType,
  replaceOf,
  asStudent,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: Student;
  presetType?: string;
  replaceOf?: StudentDocument;
  asStudent?: boolean;
  onUploaded?: (doc: StudentDocument) => void;
}) {
  const upload = useAppStore((s) => s.uploadDocumentFile);
  const [type, setType] = useState(presetType || replaceOf?.type || "Passport");
  const [name, setName] = useState(replaceOf?.name || defaultDocumentName(presetType || "Passport", student.name));
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "done" | "fail">("idle");
  const [duplicate, setDuplicate] = useState<StudentDocument | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const nextType = replaceOf?.type || presetType || "Passport";
    setType(nextType);
    setName(replaceOf?.name || defaultDocumentName(nextType, student.name));
    setPhase("idle");
    setProgress(0);
    setError("");
    setDuplicate(null);
  }, [open, presetType, replaceOf, student.name]);

  const reset = () => {
    setFile(null);
    setError("");
    setProgress(0);
    setPhase("idle");
    setDuplicate(null);
    setDescription("");
  };

  const onFile = useCallback((f: File | null) => {
    if (!f) return;
    const v = validateUploadFile(f);
    if (v) {
      setError(v);
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  }, []);

  async function runUpload(opts?: { replaceExistingId?: string; asNewVersionOf?: string; forceNew?: boolean }) {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setPhase("uploading");
    setProgress(8);
    const dataUrl = await readFile(file);
    await animateProgress(setProgress);
    const result = upload({
      studentId: student.id,
      type,
      name: name.trim() || defaultDocumentName(type, student.name),
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: formatBytes(file.size),
      dataUrl,
      studentInstruction: description.trim() || undefined,
      replaceExistingId: opts?.replaceExistingId ?? replaceOf?.id,
      asNewVersionOf: opts?.asNewVersionOf,
      forceNew: opts?.forceNew,
      fromStudent: asStudent,
      actorName: asStudent ? student.name : undefined,
      actorRole: asStudent ? "student" : undefined,
    });
    if (!result.ok) {
      if (result.existing) {
        setPhase("idle");
        setProgress(0);
        setDuplicate(result.existing);
        return;
      }
      setPhase("fail");
      setError(result.error);
      return;
    }
    setPhase("done");
    toast.success(replaceOf ? "Document replaced" : "Document uploaded");
    onUploaded?.(result.document);
    window.setTimeout(() => {
      onOpenChange(false);
      reset();
    }, 650);
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (!v) reset();
          onOpenChange(v);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-0 sm:max-w-md max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:h-[92dvh] max-sm:max-w-none max-sm:rounded-t-2xl max-sm:border-t max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom"
        >
          <SheetHeader>
            <SheetTitle>{replaceOf ? "Replace document" : "Upload document"}</SheetTitle>
            <SheetDescription>
              {replaceOf
                ? "The new file will become the latest version."
                : "Files stay in this browser session for preview. Access is controlled by your counselor."}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 p-6">
            <FormField label="Document type" required>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v);
                  setName(defaultDocumentName(v, student.name));
                }}
                disabled={Boolean(replaceOf)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_CATALOG.map((d) => (
                    <SelectItem key={d.type} value={d.type}>
                      {d.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Document name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Description" hint="Optional">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </FormField>
            <DropZone file={file} onFile={onFile} inputRef={inputRef} disabled={phase === "uploading"} />
            {file && (phase === "uploading" || phase === "done") && (
              <UploadProgress fileName={file.name} progress={progress} complete={phase === "done"} />
            )}
            {phase === "fail" && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive">Unable to upload document.</p>
                <p className="mt-1 text-muted-foreground">{error || "Please try again."}</p>
                <Button size="sm" className="mt-3" onClick={() => void runUpload()}>
                  Retry
                </Button>
              </div>
            )}
            {error && phase === "idle" && <p className="text-micro text-destructive">{error}</p>}
            <p className="text-micro text-muted-foreground">
              Accepted: {FILE_RULES.allowedExtensions.join(", ")} · up to {formatBytes(FILE_RULES.maxBytes)}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={phase === "uploading"} onClick={() => void runUpload()}>
                {replaceOf ? "Upload replacement" : "Upload"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <DuplicateChooser
        open={!!duplicate}
        type={duplicate?.type ?? type}
        onCancel={() => setDuplicate(null)}
        onReplace={() => {
          const id = duplicate?.id;
          setDuplicate(null);
          if (id) void runUpload({ replaceExistingId: id });
        }}
        onVersion={() => {
          const id = duplicate?.id;
          setDuplicate(null);
          if (id) void runUpload({ asNewVersionOf: id, forceNew: false });
        }}
      />
    </>
  );
}

function DuplicateChooser({
  open,
  type,
  onCancel,
  onReplace,
  onVersion,
}: {
  open: boolean;
  type: string;
  onCancel: () => void;
  onReplace: () => void;
  onVersion: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/20 p-4 sm:items-center"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="dup-title" className="w-full max-w-md rounded-xl bg-card p-6 shadow-popover">
        <h2 id="dup-title" className="text-base font-semibold">
          A {type} document already exists.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Choose how this file should be stored.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onVersion}>
            Upload as new version
          </Button>
          <Button onClick={onReplace}>Replace existing</Button>
        </div>
      </div>
    </div>
  );
}

function DropZone({
  file,
  onFile,
  inputRef,
  disabled,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFile(e.dataTransfer.files?.[0] ?? null);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors duration-150",
        over ? "border-primary bg-accent" : "border-border bg-secondary/30",
      )}
    >
      <Upload className="size-5 text-muted-foreground" />
      <p className="text-sm font-medium">Drag & drop your file here</p>
      <p className="text-micro text-muted-foreground">or</p>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={FILE_RULES.allowedExtensions.join(",")}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
        Choose file
      </Button>
      {file && (
        <p className="mt-1 text-micro text-muted-foreground">
          {file.name} · {formatBytes(file.size)}
        </p>
      )}
    </div>
  );
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function animateProgress(setProgress: (n: number) => void) {
  return new Promise<void>((resolve) => {
    let n = 8;
    const t = window.setInterval(() => {
      n = Math.min(92, n + 10 + Math.random() * 12);
      setProgress(n);
      if (n >= 82) {
        window.clearInterval(t);
        setProgress(100);
        resolve();
      }
    }, 90);
  });
}
