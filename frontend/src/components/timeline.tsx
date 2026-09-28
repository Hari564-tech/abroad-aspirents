import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  detail?: string;
  user?: string;
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="relative space-y-0">
      {events.map((e, i) => (
        <li key={e.id} className="flex gap-3 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <span className="mt-1 size-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
            {i < events.length - 1 && <span className="w-px flex-1 bg-border" />}
          </div>
          <div className={cn("min-w-0 pb-1")}>
            <p className="text-sm font-medium">{e.title}</p>
            {e.detail && <p className="mt-0.5 text-sm text-muted-foreground">{e.detail}</p>}
            <p className="mt-1 text-micro text-muted-foreground">
              {formatDateTime(e.timestamp)}
              {e.user ? ` · ${e.user}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
