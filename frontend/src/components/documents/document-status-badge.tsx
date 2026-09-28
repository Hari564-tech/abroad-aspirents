import { Badge } from "@/components/ui/badge";
import { TONE_BADGE, documentTone } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/lib/types";

const LABELS: Record<DocumentStatus, string> = {
  verified: "✓ Verified",
  uploaded: "✓ Uploaded",
  under_review: "◷ Under Review",
  pending: "! Pending",
  rejected: "× Rejected",
  expired: "Expired",
};

export function DocumentStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-0 font-medium ring-1", TONE_BADGE[documentTone(status)] ?? TONE_BADGE.muted, className)}
      aria-label={LABELS[status]}
    >
      {LABELS[status]}
    </Badge>
  );
}
