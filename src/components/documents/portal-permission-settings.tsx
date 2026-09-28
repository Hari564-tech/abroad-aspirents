import { Switch } from "@/components/ui/switch";
import type { PortalPermissions } from "@/lib/types";

const ITEMS: Array<{ key: keyof PortalPermissions; label: string }> = [
  { key: "view", label: "View documents" },
  { key: "upload", label: "Upload documents" },
  { key: "replace", label: "Replace documents" },
  { key: "delete", label: "Delete documents" },
  { key: "download", label: "Download documents" },
];

export function PortalPermissionSettings({
  value,
  onChange,
}: {
  value: PortalPermissions;
  onChange: (next: PortalPermissions) => void;
}) {
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Student permissions</h3>
      <div className="mt-2 divide-y rounded-lg border">
        {ITEMS.map((item) => (
          <label key={item.key} className="flex items-center justify-between px-3 py-2.5 text-sm">
            {item.label}
            <Switch checked={value[item.key]} onCheckedChange={(v) => onChange({ ...value, [item.key]: !!v })} />
          </label>
        ))}
      </div>
    </section>
  );
}
