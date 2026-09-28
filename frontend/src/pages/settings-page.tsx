import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { INTAKES, type Intake, type ThemeMode } from "@/lib/types";
import { toast } from "sonner";

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const employees = useAppStore((s) => s.employees);

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Organization preferences. Controls are simulated." />
      <Tabs defaultValue="org">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="org">Organization</TabsTrigger>
          <TabsTrigger value="users">Users & roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="audit">Audit settings</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <Card className="grid max-w-xl gap-4 p-5">
            <label className="grid gap-1.5 text-sm">
              Workspace name
              <Input value={settings.name} onChange={(e) => update({ name: e.target.value })} />
            </label>
            <label className="grid gap-1.5 text-sm">
              Legal name
              <Input value={settings.legalName} onChange={(e) => update({ legalName: e.target.value })} />
            </label>
            <label className="grid gap-1.5 text-sm">
              Default intake
              <Select value={settings.defaultIntake} onValueChange={(v) => update({ defaultIntake: v as Intake })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTAKES.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <Button
              onClick={() => toast.success("Organization updated")}
              className="w-fit"
            >
              Save
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="overflow-hidden p-0">
            <table className="w-full text-table">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="px-5 py-2">Name</th>
                  <th className="px-5 py-2">Role</th>
                  <th className="px-5 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="px-5 py-2">{e.name}</td>
                    <td className="px-5 py-2 capitalize">{e.role}</td>
                    <td className="px-5 py-2">{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card className="p-5 text-sm text-muted-foreground">
            Role permissions are simulated. Admins can view Audit Center, Employees, Reports and Settings.
            Employees operate students, leads, applications and payments for their own book.
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="space-y-4 p-5">
            <Row
              label="Email alerts"
              checked={settings.emailAlerts}
              onChange={(v) => update({ emailAlerts: v })}
            />
            <Row
              label="Slack alerts"
              checked={settings.slackAlerts}
              onChange={(v) => update({ slackAlerts: v })}
            />
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="space-y-4 p-5">
            <Row
              label="Two-factor authentication"
              checked={settings.twoFactor}
              onChange={(v) => update({ twoFactor: v })}
            />
            <Row
              label="Login notifications"
              checked={settings.loginNotifications}
              onChange={(v) => update({ loginNotifications: v })}
            />
            <label className="grid max-w-xs gap-1.5 text-sm">
              Session timeout (minutes)
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => update({ sessionTimeout: Number(e.target.value) })}
              />
            </label>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="p-5">
            <p className="mb-3 text-sm font-medium">Theme</p>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as ThemeMode[]).map((t) => (
                <Button key={t} variant={theme === t ? "default" : "outline"} className="capitalize" onClick={() => setTheme(t)}>
                  {t}
                </Button>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="space-y-4 p-5">
            <label className="grid max-w-xs gap-1.5 text-sm">
              Retention (days)
              <Input
                type="number"
                value={settings.auditRetentionDays}
                onChange={(e) => update({ auditRetentionDays: Number(e.target.value) })}
              />
            </label>
            <Button
              variant="outline"
              onClick={() => {
                resetDemo();
                toast.message("Demo data reset");
              }}
            >
              Reset demo data
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
