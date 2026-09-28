import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portalUrl } from "@/lib/documents";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

export function PortalLink({
  token,
  studentId,
  showOpen = true,
}: {
  token: string;
  studentId: string;
  showOpen?: boolean;
}) {
  const appendAudit = useAppStore((s) => s.appendAudit);
  const [copied, setCopied] = useState(false);
  const url = portalUrl(token);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      appendAudit({
        action: "PORTAL_LINK_COPIED",
        module: "Documents",
        recordId: studentId,
        details: "Copied student portal link",
        severity: "INFO",
      });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 truncate rounded-md bg-secondary px-3 py-2 font-mono text-xs">{url}</code>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Link copied" : "Copy link"}
        </Button>
        {showOpen && (
          <Button size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Open portal
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
