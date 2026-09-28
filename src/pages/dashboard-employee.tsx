import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonAvatar } from "@/components/ui/avatar";
import { DocumentsAttentionWidget } from "@/components/documents/documents-attention-widget";
import { useAppStore } from "@/lib/store";
import { greetingName, useScopedIds } from "@/lib/scoped";
import { formatShortDate, relativeTime } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export function EmployeeDashboardPage() {
  const user = useAppStore((s) => s.currentUser);
  const updateWork = useAppStore((s) => s.updateWorkItem);
  const { students, workItems } = useScopedIds();
  const { base } = useWorkspace();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    return {
      students: students.length,
      apps: students.filter((s) => s.status === "Applications Started" || s.status === "Shortlisting Sent").length,
      offers: students.filter((s) => s.status === "Offered").length,
      waiting: students.filter((s) => s.status === "Waiting").length,
      visa: students.filter((s) => s.status === "Got Visa").length,
      pay: students.filter((s) => s.paymentStatus !== "Paid").length,
    };
  }, [students]);

  const leads = useAppStore((s) => s.leads).filter((l) => l.employeeId === user?.id && l.pipeline === "New");

  return (
    <div className="space-y-6">
      <PageHeader
        title={greetingName(user?.name ?? "there")}
        description="Here's your current workload."
        actions={
          <Button onClick={() => void navigate({ to: `${base}/students/new` })}>Add student</Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <StatCard label="My students" value={stats.students} />
        <StatCard label="New leads" value={leads.length} />
        <StatCard label="Applications" value={stats.apps} />
        <StatCard label="Offers" value={stats.offers} />
        <StatCard label="Waiting" value={stats.waiting} />
        <StatCard label="Visa received" value={stats.visa} />
        <StatCard label="Payment pending" value={stats.pay} />
      </div>

      <DocumentsAttentionWidget />

      <Card>
        <CardHeader>
          <CardTitle>My work queue</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-table">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                {["Student", "Task", "Priority", "Deadline", "Status"].map((h) => (
                  <th key={h} className="px-5 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Queue is clear for now.
                  </td>
                </tr>
              )}
              {workItems.map((w) => (
                <tr key={w.id} className="border-b last:border-0">
                  <td className="px-5 py-2.5">
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={() => void navigate({ to: `${base}/students/${w.studentId}` })}
                    >
                      {w.studentName}
                    </button>
                  </td>
                  <td className="px-5 py-2.5">{w.task}</td>
                  <td className="px-5 py-2.5">
                    <PriorityBadge priority={w.priority} />
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground">{formatShortDate(w.deadline)}</td>
                  <td className="px-5 py-2.5">
                    <Button
                      size="xs"
                      variant={w.status === "Done" ? "secondary" : "outline"}
                      onClick={() =>
                        updateWork(w.id, { status: w.status === "Done" ? "Pending" : "Done" })
                      }
                    >
                      {w.status}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>My students</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void navigate({ to: `${base}/students` })}>
            View all
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-table">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                {["Student", "Country", "Status", "Updated"].map((h) => (
                  <th key={h} className="px-5 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.slice(0, 8).map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-secondary/60"
                  onClick={() => void navigate({ to: `${base}/students/${s.id}` })}
                >
                  <td className="px-5 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <PersonAvatar name={s.name} hue={s.avatarHue} className="size-6" />
                      <span>
                        <span className="block font-medium">{s.name}</span>
                        <span className="font-mono text-micro text-muted-foreground">{s.id}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-2.5">{s.country}</td>
                  <td className="px-5 py-2.5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground">{relativeTime(s.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
