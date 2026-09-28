import { useEffect, useMemo, useState } from "react";
import { Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { PortalAccessSettings } from "@/components/documents/portal-access-settings";
import { PortalPermissionSettings } from "@/components/documents/portal-permission-settings";
import { PortalLink } from "@/components/documents/portal-link";
import { PortalQRCode } from "@/components/documents/portal-qr-code";
import { PortalActivity } from "@/components/documents/portal-activity";
import { PortalCreatedSuccess } from "@/components/documents/portal-created-success";
import { printPortalInstructions } from "@/components/documents/portal-instructions-print";
import { DEFAULT_PORTAL_PERMISSIONS, documentStats, expiryFromPreset, portalEffectiveStatus, portalUrl } from "@/lib/documents";
import { formatShortDate } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import type { PortalAccessMethod, PortalPermissions, Student } from "@/lib/types";
import { toast } from "sonner";

export function PortalShareDrawer({
  open,
  onOpenChange,
  student,
  startCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: Student;
  startCreated?: boolean;
}) {
  const portals = useAppStore((s) => s.portals);
  const allDocuments = useAppStore((s) => s.documents);
  const createPortal = useAppStore((s) => s.createPortal);
  const updatePortal = useAppStore((s) => s.updatePortal);
  const revokePortal = useAppStore((s) => s.revokePortal);
  const regeneratePortal = useAppStore((s) => s.regeneratePortal);
  const appendAudit = useAppStore((s) => s.appendAudit);
  const documents = useMemo(
    () => allDocuments.filter((d) => d.studentId === student.id),
    [allDocuments, student.id],
  );

  const existing = useMemo(
    () => portals.find((p) => p.studentId === student.id && portalEffectiveStatus(p) !== "expired") ?? portals.find((p) => p.studentId === student.id),
    [portals, student.id],
  );

  const [method, setMethod] = useState<PortalAccessMethod>(existing?.accessMethod ?? "email_and_link");
  const [email, setEmail] = useState(existing?.email ?? student.email);
  const [permissions, setPermissions] = useState<PortalPermissions>(existing?.permissions ?? { ...DEFAULT_PORTAL_PERMISSIONS });
  const [expiry, setExpiry] = useState<"never" | "24h" | "7d" | "30d" | "custom">("7d");
  const [customExpiry, setCustomExpiry] = useState("");
  const [phase, setPhase] = useState<"form" | "creating" | "created" | "email" | "qr">(
    startCreated && existing ? "created" : "form",
  );
  const [ticks, setTicks] = useState([false, false, false]);
  const [portalId, setPortalId] = useState(existing?.id);
  const [revokeOpen, setRevokeOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const current =
      portals.find((p) => p.studentId === student.id && portalEffectiveStatus(p) !== "expired") ??
      portals.find((p) => p.studentId === student.id);
    setEmail(current?.email ?? student.email);
    setMethod(current?.accessMethod ?? "email_and_link");
    setPermissions(current?.permissions ?? { ...DEFAULT_PORTAL_PERMISSIONS });
    setPortalId(current?.id);
    if (startCreated && current) setPhase("created");
    else if (current && portalEffectiveStatus(current) === "active") setPhase("created");
    else setPhase("form");
    // Sync form from current portal only when the drawer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const portal = portals.find((p) => p.id === portalId) ?? existing;
  const stats = documentStats(documents);
  const expiresLabel = portal?.expiresAt ? formatShortDate(portal.expiresAt) : "Never";

  function simulateCreate(existingPortal = false) {
    setPhase("creating");
    setTicks([false, false, false]);
    window.setTimeout(() => setTicks([true, false, false]), 280);
    window.setTimeout(() => setTicks([true, true, false]), 560);
    window.setTimeout(() => setTicks([true, true, true]), 840);
    window.setTimeout(() => {
      let next = portal;
      if (!existingPortal || !next || next.status !== "active") {
        next = createPortal({
          studentId: student.id,
          accessMethod: method,
          email: method === "link_only" ? undefined : email,
          expiresAt: expiryFromPreset(expiry, customExpiry ? new Date(customExpiry).toISOString() : undefined),
          permissions,
        });
        setPortalId(next.id);
      } else {
        updatePortal(next.id, { accessMethod: method, email, permissions, expiresAt: expiryFromPreset(expiry, customExpiry ? new Date(customExpiry).toISOString() : undefined), status: "active" });
      }
      setPhase("created");
      toast.success("Portal created");
    }, 1100);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:h-[94dvh] max-sm:max-w-none max-sm:rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Student document portal</SheetTitle>
            <SheetDescription>
              {student.name} · {student.id}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 p-6">
            {phase === "creating" && (
              <div className="rounded-xl border p-5">
                <p className="font-medium">Creating student portal…</p>
                <ul className="mt-4 grid gap-2 text-sm">
                  {["Saving permissions", "Preparing document workspace", "Generating access link"].map((label, i) => (
                    <li key={label} className="flex items-center gap-2">
                      {ticks[i] ? <Check className="size-4 text-success" /> : <span className="size-4 rounded-full border" />}
                      {ticks[i] ? `✓ ${label}` : label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {phase === "form" && (
              <>
                {portal && portalEffectiveStatus(portal) === "revoked" && (
                  <div className="rounded-lg border px-3 py-2 text-sm">
                    <span className="mr-2 inline-block size-2 rounded-full bg-destructive" /> Revoked
                    <Button size="sm" className="ml-3" onClick={() => simulateCreate(false)}>
                      Generate new link
                    </Button>
                  </div>
                )}
                <PortalAccessSettings method={method} email={email} onMethod={setMethod} onEmail={setEmail} />
                <PortalPermissionSettings value={permissions} onChange={setPermissions} />
                <FormField label="Portal expiration">
                  <Select value={expiry} onValueChange={(v) => setExpiry(v as typeof expiry)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="24h">24 hours</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                {expiry === "custom" && (
                  <FormField label="Expires on">
                    <Input type="datetime-local" value={customExpiry} onChange={(e) => setCustomExpiry(e.target.value)} />
                  </FormField>
                )}
                {expiry !== "never" && (
                  <p className="text-micro text-muted-foreground">
                    Expires {formatShortDate(expiryFromPreset(expiry, customExpiry ? new Date(customExpiry).toISOString() : undefined) ?? new Date().toISOString())}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => simulateCreate(false)}>Generate student upload link</Button>
                </div>
                {portal && portalEffectiveStatus(portal) === "active" && (
                  <div className="grid gap-4 border-t pt-4">
                    <PortalLink token={portal.token} studentId={student.id} />
                    <PortalActivity portalId={portal.id} />
                  </div>
                )}
              </>
            )}

            {phase === "created" && portal && (
              <PortalCreatedSuccess
                student={student}
                portal={portal}
                stats={stats}
                expiresLabel={expiresLabel}
                onCopyAudit={() =>
                  appendAudit({
                    action: "PORTAL_LINK_COPIED",
                    module: "Documents",
                    recordId: student.id,
                    details: "Copied student portal link",
                    severity: "INFO",
                  })
                }
                onEmail={() => setPhase("email")}
                onQr={() => setPhase("qr")}
                onEdit={() => setPhase("form")}
                onRevoke={() => setRevokeOpen(true)}
                onDone={() => onOpenChange(false)}
                onPrint={() => printPortalInstructions(student, portal, stats)}
                onRegenerate={() => {
                  const next = regeneratePortal(portal.id);
                  if (next) {
                    setPortalId(next.id);
                    toast.success("Portal created");
                  }
                }}
              />
            )}

            {phase === "email" && portal && (
              <EmailComposer
                student={student}
                email={email || student.email}
                url={portalUrl(portal.token)}
                onCancel={() => setPhase("created")}
                onSend={() => {
                  appendAudit({
                    action: "PORTAL_SHARED",
                    module: "Documents",
                    recordId: student.id,
                    details: `Shared portal with ${email || student.email}`,
                    severity: "SUCCESS",
                  });
                  toast.success("Email simulated successfully");
                  setPhase("created");
                }}
              />
            )}

            {phase === "qr" && portal && (
              <div className="grid gap-4">
                <PortalQRCode token={portal.token} />
                <Button variant="outline" onClick={() => setPhase("created")}>
                  Back
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke student portal?"
        description="The current link will no longer provide access to the document portal."
        confirmLabel="Revoke access"
        onConfirm={() => {
          if (portal) {
            revokePortal(portal.id);
            toast.success("Portal revoked");
            setPhase("form");
          }
        }}
      />
    </>
  );
}

function EmailComposer({
  student,
  email,
  url,
  onCancel,
  onSend,
}: {
  student: Student;
  email: string;
  url: string;
  onCancel: () => void;
  onSend: () => void;
}) {
  const [to, setTo] = useState(email);
  const [subject, setSubject] = useState("Complete your Meridian document submission");
  const [message, setMessage] = useState(
    `Hello ${student.name.split(" ")[0]},\n\nPlease use the Meridian student document portal to upload your pending documents.\n\nPortal:\n${url}\n\nThank you,\nMeridian Student Operations`,
  );
  return (
    <div className="grid gap-4">
      <h3 className="font-semibold">Send document portal</h3>
      <FormField label="To">
        <Input value={to} onChange={(e) => setTo(e.target.value)} />
      </FormField>
      <FormField label="Subject">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </FormField>
      <FormField label="Message">
        <Textarea rows={8} value={message} onChange={(e) => setMessage(e.target.value)} />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSend}>
          <Mail className="size-4" /> Send email
        </Button>
      </div>
    </div>
  );
}
