import { useMemo } from "react";
import { formatDateTime } from "@/lib/format";
import { useAppStore } from "@/lib/store";

export function PortalActivity({ portalId }: { portalId: string }) {
  const allLogs = useAppStore((s) => s.portalAccessLogs);
  const logs = useMemo(() => allLogs.filter((l) => l.portalId === portalId), [allLogs, portalId]);
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Portal activity</h3>
      <ol className="mt-3 grid gap-3">
        {logs.length === 0 && <p className="text-sm text-muted-foreground">No portal activity yet.</p>}
        {logs.map((l) => (
          <li key={l.id} className="flex items-start justify-between gap-3 text-sm">
            <span>
              {l.actor} {l.action}
            </span>
            <span className="shrink-0 text-micro text-muted-foreground">{formatDateTime(l.timestamp)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
