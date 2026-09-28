import { useState } from "react";
import { Check, Copy, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PasswordField({
  label,
  value,
  onChange,
  warning = true,
  className,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  warning?: boolean;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {warning && (
          <span className="inline-flex items-center gap-1 text-micro text-warning">
            <ShieldAlert className="size-3" />
            Sensitive
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          autoComplete="off"
          className="pr-20 font-mono"
        />
        <div className="absolute right-1 flex">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide" : "Reveal"}
          >
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label="Copy"
            onClick={async () => {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              toast.message("Copied to clipboard — handle credentials carefully.");
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
