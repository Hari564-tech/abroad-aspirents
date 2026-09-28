import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-micro font-medium ring-1 ring-inset tabular-nums",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary ring-primary/15",
        secondary: "bg-secondary text-muted-foreground ring-border",
        success: "bg-success/10 text-success ring-success/15",
        warning: "bg-warning/10 text-warning ring-warning/15",
        danger: "bg-destructive/10 text-destructive ring-destructive/15",
        info: "bg-info/10 text-info ring-info/15",
        private: "bg-private/10 text-private ring-private/15",
        outline: "text-foreground ring-border",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
