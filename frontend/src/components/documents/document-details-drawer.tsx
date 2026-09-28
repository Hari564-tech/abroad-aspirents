import { useState } from "react";
import { Download, MoreHorizontal, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DocumentPreview } from "@/components/documents/document-preview";
import { DocumentVersionHistory } from "@/components/documents/document-version-history";
import { DocumentRejectModal } from "@/components/documents/document-reject-modal";
import { formatDateTime, formatShortDate } from "@/lib/format";
import { getFileData } from "@/lib/file-cache";
import { useAppStore } from "@/lib/store";
import { useWorkspace } from "@/lib/workspace";
import type { Student, StudentDocument } from "@/lib/types";
import { toast } from "sonner";

export function DocumentDetailsDrawer({
  open,
  onOpenChange,
  document: doc,
  student,
  onReplace,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  document: StudentDocument | null;
  student: Student;
  onReplace: (doc: StudentDocument) => void;
}) {
  const verify = useAppStore((s) => s.verifyDocument);
  const requestReplacement = useAppStore((s) => s.requestReplacement);
  const updateMeta = useAppStore((s) => s.updateDocumentMeta);
  const recordView = useAppStore((s) => s.recordDocumentView);
  const recordDownload = useAppStore((s) => s.recordDocumentDownload);
  const activities = useAppStore((s) => s.documentActivities);
  const { role } = useWorkspace();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [reason, setReason] = useState("Current document is unclear.");
  const [message, setMessage] = useState("Please upload a clear high-resolution scan.");
  const [due, setDue] = useState("");

  if (!doc) return null;

  const events = activities.filter((a) => a.documentId === doc.id);
  const canReview = role === "admin" || role === "employee";
  const canVerify = canReview;

  function download() {
    const data = getFileData(doc!.id);
    recordDownload(doc!.id);
    if (!data) {
      toast.message("No file is stored in this session to download.");
      return;
    }
    const a = document.createElement("a");
    a.href = data;
    a.download = doc!.fileName || `${doc!.type}.pdf`;
    a.click();
    toast.success("Download started");
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (v) recordView(doc.id);
          onOpenChange(v);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-0 sm:max-w-lg max-sm:inset-0 max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none"
        >
          <SheetHeader>
            <SheetTitle>{doc.fileName || doc.name}</SheetTitle>
            <SheetDescription>
              Uploaded by {doc.uploadedBy ?? "—"}
              {doc.uploadedAt ? ` · ${formatDateTime(doc.uploadedAt)}` : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 px-6">
            <Button size="sm" variant="outline" onClick={download}>
              <Download className="size-4" /> Download
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReplace(doc)}>
              <RefreshCw className="size-4" /> Replace
            </Button>
            {canVerify && doc.status !== "verified" && (
              <Button
                size="sm"
                onClick={() => {
                  verify(doc.id);
                  toast.success("Document verified");
                }}
              >
                <ShieldCheck className="size-4" /> Verify
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="size-4" /> More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canReview && <DropdownMenuItem onClick={() => setRejectOpen(true)}>Reject</DropdownMenuItem>}
                {canReview && <DropdownMenuItem onClick={() => setReplaceOpen(true)}>Request replacement</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="grid gap-5 p-6">
            <DocumentPreview doc={doc} />
            {doc.status === "rejected" && doc.rejectReason && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                <DocumentStatusBadge status="rejected" />
                <p className="mt-2">
                  Reason: <span className="font-medium">{doc.rejectReason}</span>
                </p>
                {doc.rejectNote && <p className="text-muted-foreground">{doc.rejectNote}</p>}
              </div>
            )}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Document details</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Field label="Document name" value={doc.fileName || doc.name} />
                <Field label="Document type" value={doc.type} />
                <Field label="Category" value={doc.category} />
                <Field label="Student" value={student.name} />
                <Field label="Student ID" value={student.id} />
                <Field label="Uploaded by" value={doc.uploadedBy ?? "—"} />
                <Field label="Uploaded on" value={doc.uploadedAt ? formatShortDate(doc.uploadedAt) : "—"} />
                <Field label="Status" value={<DocumentStatusBadge status={doc.status} />} />
                <Field label="Version" value={doc.version ? `v${doc.version}` : "—"} />
                {doc.universityName && <Field label="University" value={doc.universityName} />}
                {doc.course && <Field label="Course" value={doc.course} />}
              </dl>
            </section>
            {canReview && (
              <section className="grid gap-3">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</h3>
                <div>
                  <p className="text-micro font-medium">Internal note</p>
                  <p className="mb-1 text-micro text-muted-foreground">Visible only to employees and admins.</p>
                  <Textarea
                    defaultValue={doc.internalNote}
                    onBlur={(e) => updateMeta(doc.id, { internalNote: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <p className="text-micro font-medium">Student instruction</p>
                  <p className="mb-1 text-micro text-muted-foreground">Shown in the student portal.</p>
                  <Textarea
                    defaultValue={doc.studentInstruction}
                    onBlur={(e) => updateMeta(doc.id, { studentInstruction: e.target.value })}
                    rows={2}
                  />
                </div>
              </section>
            )}
            {canVerify && doc.status !== "verified" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    verify(doc.id);
                    toast.success("Document verified");
                  }}
                >
                  Mark as verified
                </Button>
                <Button variant="outline" onClick={() => setRejectOpen(true)}>
                  Reject
                </Button>
                <Button variant="outline" onClick={() => setReplaceOpen(true)}>
                  Request replacement
                </Button>
              </div>
            )}
            {replaceOpen && (
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Request replacement</h3>
                <label className="mt-3 block text-micro text-muted-foreground">Reason</label>
                <input
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <label className="mt-3 block text-micro text-muted-foreground">Message to student</label>
                <textarea
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <label className="mt-3 block text-micro text-muted-foreground">Due date</label>
                <input
                  type="date"
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setReplaceOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      requestReplacement(doc.id, reason, message, due ? new Date(due).toISOString() : undefined);
                      toast.success("Request sent");
                      setReplaceOpen(false);
                    }}
                  >
                    Send request
                  </Button>
                </div>
              </div>
            )}
            <DocumentVersionHistory documentId={doc.id} />
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Activity</h3>
              <ol className="mt-3 grid gap-3">
                {events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
                {events.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="font-medium">
                      {e.actor} {e.action}
                    </p>
                    <p className="text-micro text-muted-foreground">{formatDateTime(e.timestamp)}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </SheetContent>
      </Sheet>
      <DocumentRejectModal open={rejectOpen} onOpenChange={setRejectOpen} document={doc} />
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
