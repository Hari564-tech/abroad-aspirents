import { Check, FileText, Mail, QrCode, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalLink } from "@/components/documents/portal-link";
import { documentStats, portalEffectiveStatus } from "@/lib/documents";
import type { Student, StudentDocumentPortal } from "@/lib/types";

export function PortalCreatedSuccess({
  student,
  portal,
  stats,
  expiresLabel,
  onEmail,
  onQr,
  onEdit,
  onRevoke,
  onDone,
  onPrint,
  onRegenerate,
}: {
  student: Student;
  portal: StudentDocumentPortal;
  stats: ReturnType<typeof documentStats>;
  expiresLabel: string;
  onCopyAudit?: () => void;
  onEmail: () => void;
  onQr: () => void;
  onEdit: () => void;
  onRevoke: () => void;
  onDone: () => void;
  onPrint: () => void;
  onRegenerate: () => void;
}) {
  const status = portalEffectiveStatus(portal);
  const methodLabel =
    portal.accessMethod === "email_only" ? "Email only" : portal.accessMethod === "link_only" ? "Link only" : "Email + Link";

  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="size-5" />
        </span>
        <div>
          <h3 className="font-semibold">Student portal created</h3>
          <p className="text-sm text-muted-foreground">
            {student.name} · {student.id}
          </p>
        </div>
      </div>
      {status === "revoked" && (
        <div className="rounded-lg border px-3 py-2 text-sm">
          <span className="mr-2 inline-block size-2 rounded-full bg-destructive" /> Revoked
          <Button size="sm" className="ml-3" onClick={onRegenerate}>
            Generate new link
          </Button>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Documents requested</dt>
          <dd className="font-semibold tabular-nums">{stats.requiredTotal}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Currently submitted</dt>
          <dd className="font-semibold tabular-nums">{stats.complete}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Access method</dt>
          <dd className="font-medium">{methodLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Expires</dt>
          <dd className="font-medium">{expiresLabel}</dd>
        </div>
      </dl>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Portal link</p>
        <PortalLink token={portal.token} studentId={student.id} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onEmail}>
          <Mail className="size-4" /> Send email
        </Button>
        <Button size="sm" variant="outline" onClick={onQr}>
          <QrCode className="size-4" /> Generate QR
        </Button>
        <Button size="sm" variant="outline" onClick={onPrint}>
          <FileText className="size-4" /> Instructions
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          Edit access
        </Button>
        <Button size="sm" variant="outline" onClick={onRegenerate}>
          <RotateCcw className="size-4" /> Regenerate
        </Button>
        <Button size="sm" variant="destructive" onClick={onRevoke}>
          Revoke
        </Button>
        <Button size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
      <p className="text-micro text-muted-foreground">Access is configured by your counselor. This prototype does not claim production-grade security.</p>
    </div>
  );
}
