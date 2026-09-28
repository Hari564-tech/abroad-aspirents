import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-background">
      <div className="hidden w-60 border-r lg:block">
        <div className="p-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-2 px-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <PageSkeleton />
      </div>
    </div>
  );
}

export function ErrorPanel({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-card px-6 py-16 text-center shadow-card">
      <h3 className="text-sm font-semibold">Something went wrong</h3>
      <p className="max-w-sm text-sm text-muted-foreground">We couldn't load this information.</p>
      {onRetry && (
        <button type="button" className="mt-3 text-sm font-medium text-primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
