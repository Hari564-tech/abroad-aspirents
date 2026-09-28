import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormField } from "@/components/form-field";
import type { PortalAccessMethod } from "@/lib/types";

export function PortalAccessSettings({
  method,
  email,
  onMethod,
  onEmail,
}: {
  method: PortalAccessMethod;
  email: string;
  onMethod: (m: PortalAccessMethod) => void;
  onEmail: (v: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <fieldset>
        <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Access method</legend>
        <RadioGroup value={method} onValueChange={(v) => onMethod(v as PortalAccessMethod)} className="mt-2 gap-2">
          {(
            [
              ["email_only", "Email only", "Student must use the configured email address to access the document portal."],
              ["link_only", "Link only", "Anyone with the generated link can access this student's document portal."],
              ["email_and_link", "Email + link", "The student needs the portal link and the configured email address."],
            ] as const
          ).map(([value, label, hint]) => (
            <label key={value} className="flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5">
              <RadioGroupItem value={value} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-micro text-muted-foreground">{hint}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>
      {method !== "link_only" && (
        <FormField label="Student email" required={method === "email_only"}>
          <Input type="email" value={email} onChange={(e) => onEmail(e.target.value)} />
        </FormField>
      )}
    </div>
  );
}
