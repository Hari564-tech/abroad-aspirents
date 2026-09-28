import { useEffect, useMemo, useState } from "react";
import { Check, Upload } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentPreview } from "@/components/documents/document-preview";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { documentStats, isOverdue, isSubmitted, portalEffectiveStatus } from "@/lib/documents";
import { formatShortDate } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import type { StudentDocument } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function StudentUploadPortal({ token }: { token: string }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const portals = useAppStore((s) => s.portals);
  const students = useAppStore((s) => s.students);
  const documents = useAppStore((s) => s.documents);
  const touch = useAppStore((s) => s.touchPortalAccess);
  const log = useAppStore((s) => s.logPortalAccess);

  const portal = portals.find((p) => p.token === token);
  const student = students.find((s) => s.id === portal?.studentId);
  const docs = documents.filter((d) => d.studentId === portal?.studentId);
  const status = portal ? portalEffectiveStatus(portal) : "invalid";

  const [gate, setGate] = useState<"email" | "code" | "ready">("ready");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [uploadDoc, setUploadDoc] = useState<StudentDocument | null>(null);
  const [viewDoc, setViewDoc] = useState<StudentDocument | null>(null);
  const [replaceConfirm, setReplaceConfirm] = useState<StudentDocument | null>(null);
  const [replaceDoc, setReplaceDoc] = useState<StudentDocument | null>(null);
  const [success, setSuccess] = useState<StudentDocument | null>(null);

  useEffect(() => {
    if (!hydrated || !portal) return;
    const st = portalEffectiveStatus(portal);
    if (st !== "active") return;
    if (portal.accessMethod === "link_only") {
      setGate("ready");
      touch(token);
      return;
    }
    const key = `meridian-portal-auth-${token}`;
    if (sessionStorage.getItem(key) === "1") {
      setGate("ready");
      return;
    }
    setGate("email");
  }, [hydrated, portal, token, touch]);

  const stats = useMemo(() => documentStats(docs), [docs]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 py-10">
        <div className="h-8 w-40 rounded-md bg-secondary skeleton-shimmer" />
        <div className="h-28 rounded-xl bg-secondary skeleton-shimmer" />
        <div className="h-64 rounded-xl bg-secondary skeleton-shimmer" />
      </main>
    );
  }

  if (!portal || !student) {
    return (
      <GateShell>
        <h1 className="text-xl font-semibold">Invalid portal link.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please request a new link from your counselor.</p>
      </GateShell>
    );
  }

  if (status === "expired") {
    return (
      <GateShell>
        <h1 className="text-xl font-semibold">This document portal has expired.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please contact your counselor for a new link.</p>
      </GateShell>
    );
  }

  if (status === "revoked") {
    return (
      <GateShell>
        <h1 className="text-xl font-semibold">Access revoked.</h1>
        <p className="mt-2 text-sm text-muted-foreground">This document portal is no longer active.</p>
      </GateShell>
    );
  }

  if (gate === "email") {
    return (
      <GateShell>
        <h1 className="text-xl font-semibold">Enter your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Access is configured by your counselor. Use the email they registered for you.
        </p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim().toLowerCase() !== (portal.email ?? student.email).toLowerCase()) {
              toast.error("That email does not match this portal.");
              return;
            }
            setGate("code");
          }}
        >
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={student.email} />
          <Button type="submit">Continue</Button>
        </form>
      </GateShell>
    );
  }

  if (gate === "code") {
    return (
      <GateShell>
        <h1 className="text-xl font-semibold">Verification code</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the 6-digit code sent to your email. In this prototype, any 6-digit code works.
        </p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\d{6}$/.test(code)) {
              toast.error("Enter a 6-digit code.");
              return;
            }
            sessionStorage.setItem(`meridian-portal-auth-${token}`, "1");
            touch(token);
            setGate("ready");
          }}
        >
          <Input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            className="text-center font-mono text-lg tracking-[0.4em]"
            aria-label="Verification code"
          />
          <Button type="submit">Verify</Button>
        </form>
      </GateShell>
    );
  }

  const required = docs.filter((d) => d.required);
  const allIn = stats.remaining === 0 && stats.requiredTotal > 0;
  const perms = portal.permissions;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <div>
            <p className="text-micro font-medium uppercase tracking-[0.16em] text-muted-foreground">Meridian</p>
            <p className="text-sm font-semibold">Student Document Portal</p>
          </div>
          <Logo compact />
        </div>
        <div className="mx-auto max-w-lg px-4 pb-4">
          <p className="font-semibold">{student.name}</p>
          <p className="font-mono text-micro text-muted-foreground">{student.id}</p>
          <p className="text-sm text-muted-foreground">
            {student.country} · {student.intake}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 py-6">
        <section>
          <h1 className="text-lg font-semibold">Complete your document submission</h1>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            {stats.complete} / {stats.requiredTotal} documents submitted
          </p>
          <Progress value={stats.percent} className="mt-3 h-2" />
          <p className="mt-2 text-sm text-muted-foreground">{stats.remaining} documents remaining</p>
        </section>

        <Card className="grid grid-cols-2 gap-3 p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Document completion</p>
            <p className="text-lg font-semibold tabular-nums">
              {stats.complete} / {stats.requiredTotal}
            </p>
            <p className="text-micro text-muted-foreground">{stats.percent}%</p>
          </div>
          <div className="grid gap-1 text-micro">
            <p>{stats.verified} Verified</p>
            <p>{stats.underReview} Under Review</p>
            <p>{stats.pending} Pending</p>
          </div>
        </Card>

        {allIn && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <p className="flex items-center gap-2 font-semibold text-success">
              <Check className="size-4" /> Documents submitted
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You have completed all currently requested documents. Your documents are now available to the counselor for
              review.
            </p>
          </div>
        )}

        {docs.length === 0 && (
          <Card className="p-6 text-center">
            <p className="font-medium">No documents requested yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Your counselor has not requested any documents.</p>
          </Card>
        )}

        {required.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Required documents</h2>
            <div className="grid gap-2">
              {required.map((doc) => (
                <StudentDocRow
                  key={doc.id}
                  doc={doc}
                  perms={perms}
                  onUpload={() => setUploadDoc(doc)}
                  onView={() => setViewDoc(doc)}
                  onReplace={() => setReplaceConfirm(doc)}
                />
              ))}
            </div>
          </section>
        )}

        {docs.some((d) => !d.required) && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Optional documents</h2>
            <div className="grid gap-2">
              {docs
                .filter((d) => !d.required)
                .map((doc) => (
                  <StudentDocRow
                    key={doc.id}
                    doc={doc}
                    perms={perms}
                    onUpload={() => setUploadDoc(doc)}
                    onView={() => setViewDoc(doc)}
                    onReplace={() => setReplaceConfirm(doc)}
                  />
                ))}
            </div>
          </section>
        )}

        <p className="pb-8 text-center text-micro text-muted-foreground">
          Need help? Contact your counselor. Access is configured by your counselor.
        </p>
      </main>

      <DocumentUpload
        open={!!uploadDoc}
        onOpenChange={(v) => !v && setUploadDoc(null)}
        student={student}
        presetType={uploadDoc?.type}
        replaceOf={uploadDoc ?? undefined}
        asStudent
        onUploaded={(doc) => {
          setSuccess(doc);
          log(portal.id, `uploaded ${doc.fileName ?? doc.type}`, student.name);
        }}
      />
      <DocumentUpload
        open={!!replaceDoc}
        onOpenChange={(v) => !v && setReplaceDoc(null)}
        student={student}
        replaceOf={replaceDoc ?? undefined}
        asStudent
        onUploaded={(doc) => {
          setSuccess(doc);
          log(portal.id, `replaced ${doc.fileName ?? doc.type}`, student.name);
        }}
      />
      <ConfirmDialog
        open={!!replaceConfirm}
        onOpenChange={(v) => !v && setReplaceConfirm(null)}
        title="Replace document?"
        description="The new file will become the latest version."
        confirmLabel="Upload replacement"
        destructive={false}
        onConfirm={() => {
          setReplaceDoc(replaceConfirm);
          setReplaceConfirm(null);
        }}
      />

      {viewDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background p-4">
          <div className="mx-auto max-w-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{viewDoc.fileName || viewDoc.name}</h2>
              <Button variant="outline" size="sm" onClick={() => setViewDoc(null)}>
                Close
              </Button>
            </div>
            <DocumentPreview doc={viewDoc} />
          </div>
        </div>
      )}

      {success && (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/20 p-4 sm:items-center sm:justify-center">
          <Card className="w-full max-w-md p-5">
            <p className="flex items-center gap-2 font-semibold text-success">
              <Check className="size-4" /> Document uploaded successfully
            </p>
            <p className="mt-2 text-sm">{success.fileName}</p>
            <p className="text-micro text-muted-foreground">Submitted just now</p>
            <p className="mt-3 text-sm">
              Status: <DocumentStatusBadge status="under_review" />
            </p>
            <Button className="mt-4 w-full" onClick={() => setSuccess(null)}>
              Done
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function StudentDocRow({
  doc,
  perms,
  onUpload,
  onView,
  onReplace,
}: {
  doc: StudentDocument;
  perms: { view: boolean; upload: boolean; replace: boolean; delete: boolean; download: boolean };
  onUpload: () => void;
  onView: () => void;
  onReplace: () => void;
}) {
  const overdue = isOverdue(doc.dueDate, doc.status);
  const submitted = isSubmitted(doc.status);
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{doc.universityName ? `${doc.type} — ${doc.universityName}` : doc.type}</p>
          {doc.universityName && <p className="text-micro text-muted-foreground">{doc.course}</p>}
          {doc.studentInstruction && (
            <p className="mt-1 text-micro text-muted-foreground">
              <span className="font-medium text-foreground">Instructions. </span>
              {doc.studentInstruction}
            </p>
          )}
          {doc.replacementRequested && doc.replacementMessage && (
            <p className="mt-1 text-micro text-warning">{doc.replacementMessage}</p>
          )}
          {doc.dueDate && (
            <p className={cn("mt-1 text-micro", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
              {overdue ? "Overdue" : `Due by: ${formatShortDate(doc.dueDate)}`}
            </p>
          )}
        </div>
        {submitted ? (
          <span className="text-micro font-medium text-success">✓ Submitted</span>
        ) : (
          <DocumentStatusBadge status={doc.status} />
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!submitted && perms.upload && (
          <Button size="sm" onClick={onUpload}>
            <Upload className="size-4" /> Upload
          </Button>
        )}
        {submitted && perms.view && (
          <Button size="sm" variant="outline" onClick={onView}>
            View
          </Button>
        )}
        {submitted && perms.replace && (
          <Button size="sm" variant="outline" onClick={onReplace}>
            Replace
          </Button>
        )}
        {(doc.status === "rejected" || doc.replacementRequested) && perms.upload && submitted && (
          <Button size="sm" onClick={onUpload}>
            Upload replacement
          </Button>
        )}
      </div>
    </Card>
  );
}

function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <Logo />
      <p className="mt-8 text-micro font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Student Document Portal
      </p>
      <div className="mt-4">{children}</div>
    </main>
  );
}
