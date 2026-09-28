import type { ApplicationStatus, AuditSeverity, DocumentStatus, PaymentStatus, Priority } from "@/lib/types";

export function statusTone(status: ApplicationStatus): string {
  switch (status) {
    case "Got Visa":
      return "success";
    case "Offered":
      return "info";
    case "Applications Started":
    case "Shortlisting Sent":
      return "primary";
    case "Waiting":
    case "Applications on Hold":
    case "Still Thinking":
      return "warning";
    case "Dropped":
      return "danger";
    case "Private Registered":
    case "Private Shifted":
      return "private";
    case "Deferred":
    default:
      return "muted";
  }
}

export function paymentTone(status: PaymentStatus): string {
  switch (status) {
    case "Paid":
      return "success";
    case "Partially Paid":
      return "warning";
    case "Overdue":
      return "danger";
    default:
      return "muted";
  }
}

export function severityTone(severity: AuditSeverity): string {
  switch (severity) {
    case "SUCCESS":
      return "success";
    case "WARNING":
      return "warning";
    case "CRITICAL":
      return "danger";
    default:
      return "info";
  }
}

export function documentTone(status: DocumentStatus): string {
  switch (status) {
    case "verified":
      return "success";
    case "uploaded":
      return "primary";
    case "under_review":
      return "info";
    case "rejected":
      return "danger";
    case "expired":
      return "warning";
    default:
      return "muted";
  }
}

export function priorityTone(priority: Priority): string {
  switch (priority) {
    case "High":
      return "danger";
    case "Medium":
      return "warning";
    default:
      return "muted";
  }
}

export const TONE_BADGE: Record<string, string> = {
  success: "bg-success/10 text-success ring-success/15",
  warning: "bg-warning/10 text-warning ring-warning/15",
  danger: "bg-destructive/10 text-destructive ring-destructive/15",
  info: "bg-info/10 text-info ring-info/15",
  primary: "bg-primary/10 text-primary ring-primary/15",
  private: "bg-private/10 text-private ring-private/15",
  muted: "bg-secondary text-muted-foreground ring-border",
};
