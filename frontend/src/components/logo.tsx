import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M16 6.5 L16 25.5 M16 6.5 L19.2 11.2 M16 6.5 L12.8 11.2 M8.5 16 H23.5 M8.5 16 L12.2 13.2 M8.5 16 L12.2 18.8 M23.5 16 L19.8 13.2 M23.5 16 L19.8 18.8"
        stroke="white"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.2" fill="white" />
    </svg>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-foreground">Meridian</div>
          <div className="text-micro text-muted-foreground">Student operations</div>
        </div>
      )}
    </div>
  );
}
