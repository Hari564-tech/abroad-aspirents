import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { useAppStore } from "@/lib/store";
import { useEmployeeMap, useScopedIds, useStudentMap, useUniversityMap } from "@/lib/scoped";
import { useWorkspace } from "@/lib/workspace";
import { formatShortDate } from "@/lib/format";
import type { Application } from "@/lib/types";

export function ApplicationsPage() {
  const { applications } = useScopedIds();
  const students = useStudentMap();
  const unis = useUniversityMap();
  const empMap = useEmployeeMap();
  const { base } = useWorkspace();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const stats = useMemo(
    () => ({
      total: applications.length,
      submitted: applications.filter((a) => a.submittedAt).length,
      offers: applications.filter((a) => a.offerReceived || a.status === "Offered" || a.status === "Got Visa").length,
      waiting: applications.filter((a) => a.status === "Waiting").length,
      deferred: applications.filter((a) => a.status === "Deferred").length,
      dropped: applications.filter((a) => a.status === "Dropped").length,
    }),
    [applications],
  );

  const columns = useMemo<ColumnDef<Application>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => students[row.original.studentId]?.name ?? row.original.studentId,
      },
      {
        id: "university",
        header: "University",
        cell: ({ row }) => unis[row.original.universityId]?.name ?? row.original.universityId,
      },
      { accessorKey: "course", header: "Course" },
      { accessorKey: "country", header: "Country" },
      {
        accessorKey: "status",
        header: "Application status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "submittedAt",
        header: "Submitted",
        cell: ({ row }) => (row.original.submittedAt ? formatShortDate(row.original.submittedAt) : "—"),
      },
      { id: "offer", header: "Offer", cell: ({ row }) => (row.original.offerReceived ? "Yes" : "—") },
      {
        accessorKey: "deadline",
        header: "Deadline",
        cell: ({ row }) => formatShortDate(row.original.deadline),
      },
      { id: "emp", header: "Employee", cell: ({ row }) => empMap[row.original.employeeId]?.name ?? "—" },
    ],
    [students, unis, empMap],
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Applications" description="Track every university application in flight." />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Submitted" value={stats.submitted} />
        <StatCard label="Offers" value={stats.offers} />
        <StatCard label="Waiting" value={stats.waiting} />
        <StatCard label="Deferred" value={stats.deferred} />
        <StatCard label="Dropped" value={stats.dropped} />
      </div>
      <DataTable
        data={applications}
        columns={columns}
        getRowId={(a) => a.id}
        searchPlaceholder="Search applications…"
        globalFilter={q}
        onGlobalFilterChange={setQ}
        onRowClick={(a) => void navigate({ to: `${base}/students/${a.studentId}` })}
        emptyTitle="No applications found"
        renderMobileCard={(a) => (
          <div>
            <p className="font-medium">{students[a.studentId]?.name}</p>
            <p className="text-xs text-muted-foreground">{unis[a.universityId]?.name}</p>
            <div className="mt-2">
              <StatusBadge status={a.status} />
            </div>
          </div>
        )}
      />
    </div>
  );
}
