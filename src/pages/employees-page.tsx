import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { relativeTime } from "@/lib/format";
import type { User } from "@/lib/types";

export function EmployeesPage() {
  const employees = useAppStore((s) => s.employees);
  const students = useAppStore((s) => s.students);
  const applications = useAppStore((s) => s.applications);
  const navigate = useNavigate();

  const staff = employees.filter((e) => e.role === "employee");
  const stats = {
    total: staff.length,
    active: staff.filter((e) => e.status === "Active").length,
    inactive: staff.filter((e) => e.status === "Inactive").length,
    newThis: staff.filter((e) => Date.now() - new Date(e.joinedAt).getTime() < 30 * 86400000).length,
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Employee",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <PersonAvatar name={row.original.name} hue={row.original.avatarHue} className="size-7" />
            <span>
              <span className="block font-medium">{row.original.name}</span>
              <span className="text-micro text-muted-foreground">{row.original.email}</span>
            </span>
          </span>
        ),
      },
      { accessorKey: "title", header: "Role" },
      {
        id: "students",
        header: "Students",
        cell: ({ row }) => students.filter((s) => s.employeeId === row.original.id).length,
      },
      {
        id: "apps",
        header: "Applications",
        cell: ({ row }) => applications.filter((a) => a.employeeId === row.original.id).length,
      },
      {
        id: "offers",
        header: "Offers",
        cell: ({ row }) =>
          students.filter(
            (s) => s.employeeId === row.original.id && (s.status === "Offered" || s.status === "Got Visa"),
          ).length,
      },
      {
        id: "visa",
        header: "Visa",
        cell: ({ row }) =>
          students.filter((s) => s.employeeId === row.original.id && s.status === "Got Visa").length,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "Active" ? "success" : "secondary"}>{row.original.status}</Badge>
        ),
      },
      {
        accessorKey: "lastActive",
        header: "Last active",
        cell: ({ row }) => relativeTime(row.original.lastActive),
      },
    ],
    [students, applications],
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Employees" description="Directory, assignments and performance." />
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total employees" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Inactive" value={stats.inactive} />
        <StatCard label="New this month" value={stats.newThis} />
      </div>
      <DataTable
        data={staff}
        columns={columns}
        getRowId={(e) => e.id}
        searchPlaceholder="Search employees…"
        onRowClick={(e) => void navigate({ to: `/admin/employees/${e.id}` })}
        emptyTitle="No employees found"
        renderMobileCard={(e) => (
          <div className="flex items-center gap-2">
            <PersonAvatar name={e.name} hue={e.avatarHue} />
            <div>
              <p className="font-medium">{e.name}</p>
              <p className="text-xs text-muted-foreground">{e.title}</p>
            </div>
          </div>
        )}
      />
    </div>
  );
}
