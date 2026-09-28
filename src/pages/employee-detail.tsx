import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store";
import { relativeTime } from "@/lib/format";
import { toast } from "sonner";

export function EmployeeDetailPage({ employeeId }: { employeeId: string }) {
  const employee = useAppStore((s) => s.employees.find((e) => e.id === employeeId));
  const allStudents = useAppStore((s) => s.students);
  const allApplications = useAppStore((s) => s.applications);
  const allAudit = useAppStore((s) => s.auditEvents);
  const updateEmployee = useAppStore((s) => s.updateEmployee);
  const navigate = useNavigate();

  const students = useMemo(
    () => allStudents.filter((st) => st.employeeId === employeeId),
    [allStudents, employeeId],
  );
  const applications = useMemo(
    () => allApplications.filter((a) => a.employeeId === employeeId),
    [allApplications, employeeId],
  );
  const activity = useMemo(
    () => allAudit.filter((e) => e.userId === employeeId).slice(0, 12),
    [allAudit, employeeId],
  );

  if (!employee) {
    return (
      <EmptyState
        title="Employee not found"
        actionLabel="Back"
        onAction={() => void navigate({ to: "/admin/employees" })}
      />
    );
  }

  const offers = students.filter((s) => s.status === "Offered" || s.status === "Got Visa").length;
  const visas = students.filter((s) => s.status === "Got Visa").length;

  return (
    <div className="space-y-6">
      <PageHeader title={employee.name} description={`${employee.title} · ${employee.department}`} />
      <div className="flex items-center gap-3">
        <PersonAvatar name={employee.name} hue={employee.avatarHue} className="size-12" />
        <div>
          <p className="text-sm text-muted-foreground">{employee.email}</p>
          <Badge variant={employee.status === "Active" ? "success" : "secondary"}>{employee.status}</Badge>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Students" value={students.length} />
        <StatCard label="Applications" value={applications.length} />
        <StatCard label="Offers" value={offers} />
        <StatCard label="Visas" value={visas} />
      </div>
      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="students">Assigned students</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <Card className="p-5 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{employee.phone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="font-medium">{relativeTime(employee.joinedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last active</p>
              <p className="font-medium">{relativeTime(employee.lastActive)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{employee.role}</p>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="students">
          <Card className="overflow-hidden p-0">
            <table className="w-full text-table">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="px-5 py-2">Student</th>
                  <th className="px-5 py-2">Country</th>
                  <th className="px-5 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-b last:border-0 hover:bg-secondary/60"
                    onClick={() => void navigate({ to: `/admin/students/${s.id}` })}
                  >
                    <td className="px-5 py-2.5">{s.name}</td>
                    <td className="px-5 py-2.5">{s.country}</td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <Card className="p-5 space-y-3">
            {activity.map((e) => (
              <div key={e.id} className="text-sm">
                <p className="font-medium">{e.details}</p>
                <p className="text-micro text-muted-foreground">
                  {e.recordId} · {relativeTime(e.timestamp)}
                </p>
              </div>
            ))}
          </Card>
        </TabsContent>
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center justify-between text-sm">
                Active account
                <Switch
                  checked={employee.status === "Active"}
                  onCheckedChange={(v) => {
                    updateEmployee(employee.id, { status: v ? "Active" : "Inactive" });
                    toast.success("Employee updated");
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground">Permissions are simulated in this prototype.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
