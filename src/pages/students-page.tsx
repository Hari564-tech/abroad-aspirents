import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, Download, ExternalLink, MoreHorizontal, Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAppStore } from "@/lib/store";
import { useEmployeeMap, useScopedIds } from "@/lib/scoped";
import { useWorkspace } from "@/lib/workspace";
import { APPLICATION_STATUSES, INTAKES, type Student } from "@/lib/types";
import { relativeTime, toCsv, downloadText } from "@/lib/format";
import { portalEffectiveStatus, portalUrl } from "@/lib/documents";
import { toast } from "sonner";

export function StudentsPage() {
  const { students } = useScopedIds();
  const employees = useAppStore((s) => s.employees);
  const deleteStudent = useAppStore((s) => s.deleteStudent);
  const appendAudit = useAppStore((s) => s.appendAudit);
  const portals = useAppStore((s) => s.portals);
  const empMap = useEmployeeMap();
  const { base, role } = useWorkspace();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("all");
  const [intake, setIntake] = useState("all");
  const [employee, setEmployee] = useState("all");
  const [status, setStatus] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (country !== "all" && s.country !== country) return false;
      if (intake !== "all" && s.intake !== intake) return false;
      if (employee !== "all" && s.employeeId !== employee) return false;
      if (status !== "all" && s.status !== status) return false;
      if (q && !`${s.name} ${s.id} ${s.email}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [students, country, intake, employee, status, q]);

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Student ID",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>,
      },
      {
        accessorKey: "name",
        header: "Student",
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
      { accessorKey: "country", header: "Country" },
      { accessorKey: "intake", header: "Intake" },
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => empMap[row.original.employeeId]?.name ?? "—",
      },
      {
        accessorKey: "status",
        header: "Application status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment",
        cell: ({ row }) => <PaymentBadge status={row.original.paymentStatus} />,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => <span className="text-muted-foreground">{relativeTime(row.original.updatedAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => void navigate({ to: `${base}/students/${row.original.id}` })}>
                View student
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  sessionStorage.setItem(`meridian-upload-${row.original.id}`, "1");
                  void navigate({ to: `${base}/students/${row.original.id}` });
                }}
              >
                <Upload className="size-4" /> Upload document
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  sessionStorage.setItem(`meridian-portal-${row.original.id}`, "1");
                  void navigate({ to: `${base}/students/${row.original.id}` });
                }}
              >
                <ExternalLink className="size-4" /> Open document portal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const portal = portals.find(
                    (p) => p.studentId === row.original.id && portalEffectiveStatus(p) === "active",
                  );
                  if (!portal) {
                    toast.message("No active portal yet. Generate one from the student profile.");
                    sessionStorage.setItem(`meridian-portal-${row.original.id}`, "1");
                    void navigate({ to: `${base}/students/${row.original.id}` });
                    return;
                  }
                  void navigator.clipboard.writeText(portalUrl(portal.token)).then(() => {
                    appendAudit({
                      action: "PORTAL_LINK_COPIED",
                      module: "Documents",
                      recordId: row.original.id,
                      details: "Copied student portal link",
                      severity: "INFO",
                    });
                    toast.success("Link copied");
                  });
                }}
              >
                <Copy className="size-4" /> Copy portal link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void navigate({ to: `${base}/students/${row.original.id}/edit` })}>
                Edit
              </DropdownMenuItem>
              {role === "admin" && (
                <DropdownMenuItem destructive onClick={() => setPendingDelete(row.original)}>
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [empMap, base, navigate, role, portals, appendAudit],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        description="Manage registered students and applications."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                downloadText(
                  "students.csv",
                  toCsv(
                    filtered.map((s) => ({
                      id: s.id,
                      name: s.name,
                      country: s.country,
                      intake: s.intake,
                      status: s.status,
                      payment: s.paymentStatus,
                      employee: empMap[s.employeeId]?.name,
                    })),
                  ),
                );
                appendAudit({
                  action: "EXPORT",
                  module: "Students",
                  recordId: "LIST",
                  details: `Exported ${filtered.length} students`,
                  severity: "INFO",
                });
                toast.success("Students exported");
              }}
            >
              <Download className="size-4" /> Export
            </Button>
            <Button onClick={() => void navigate({ to: `${base}/students/new` })}>
              <Plus className="size-4" /> Add student
            </Button>
          </>
        }
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(s) => s.id}
        searchPlaceholder="Search students…"
        globalFilter={q}
        onGlobalFilterChange={setQ}
        selectable
        onRowClick={(s) => void navigate({ to: `${base}/students/${s.id}` })}
        emptyTitle="No students found"
        emptyDescription="Try changing your filters or search query."
        onClearFilters={() => {
          setQ("");
          setCountry("all");
          setIntake("all");
          setEmployee("all");
          setStatus("all");
        }}
        extraFilters={
          <>
            <FilterSelect
              value={country}
              onChange={setCountry}
              placeholder="Country"
              options={["Germany", "UK", "USA"]}
            />
            <FilterSelect value={intake} onChange={setIntake} placeholder="Intake" options={INTAKES} />
            {role === "admin" && (
              <FilterSelect
                value={employee}
                onChange={setEmployee}
                placeholder="Employee"
                options={employees.filter((e) => e.role === "employee").map((e) => ({ value: e.id, label: e.name }))}
              />
            )}
            <FilterSelect
              value={status}
              onChange={setStatus}
              placeholder="Status"
              options={APPLICATION_STATUSES}
            />
          </>
        }
        renderMobileCard={(s) => (
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2">
              <PersonAvatar name={s.name} hue={s.avatarHue} />
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="font-mono text-micro text-muted-foreground">{s.id}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.country} · {s.intake}
                </p>
              </div>
            </div>
            <StatusBadge status={s.status} />
          </div>
        )}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Delete student?"
        description={
          pendingDelete ? (
            <p>
              This action cannot be undone.
              <br />
              <span className="mt-2 block font-medium text-foreground">
                {pendingDelete.name}
                <br />
                <span className="font-mono text-xs">{pendingDelete.id}</span>
              </span>
            </p>
          ) : null
        }
        confirmLabel="Delete student"
        onConfirm={() => {
          if (pendingDelete) {
            deleteStudent(pendingDelete.id);
            toast.success("Student deleted");
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
