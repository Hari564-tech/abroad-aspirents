import type { ReactNode, ComponentType } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  delta?: number;
  icon?: ComponentType<{ className?: string }>;
}) {
  const up = delta != null && delta >= 0;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
          <div className="mt-1.5 flex items-center gap-2">
            {delta != null && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-micro font-medium tabular-nums",
                  up ? "text-success" : "text-destructive",
                )}
              >
                {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {up ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            )}
            {hint && <span className="text-micro text-muted-foreground">{hint}</span>}
          </div>
        </div>
        {Icon && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Icon className="size-4" />
          </div>
        )}
      </div>
    </Card>
  );
}
