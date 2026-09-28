import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { TONE_BADGE, documentTone, paymentTone, priorityTone, severityTone, statusTone } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, AuditSeverity, DocumentStatus, PaymentStatus, Priority } from "@/lib/types";

function ToneBadge({ tone, children, className }: { tone: string; children: ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-0 ring-1", TONE_BADGE[tone] ?? TONE_BADGE.muted, className)}>
      {children}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <ToneBadge tone={statusTone(status)}>{status}</ToneBadge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <ToneBadge tone={paymentTone(status)}>{status}</ToneBadge>;
}

export function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  return <ToneBadge tone={severityTone(severity)}>{severity}</ToneBadge>;
}

export function DocumentBadge({ status }: { status: DocumentStatus }) {
  return <ToneBadge tone={documentTone(status)}>{status.replaceAll("_", " ")}</ToneBadge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <ToneBadge tone={priorityTone(priority)}>{priority}</ToneBadge>;
}
