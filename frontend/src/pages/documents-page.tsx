import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { StatCard } from "@/components/stat-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DOCUMENT_CATEGORIES, documentStats, statusLabel } from "@/lib/documents";
import { useStudentMap, useScopedIds } from "@/lib/scoped";
import { useAppStore } from "@/lib/store";
import { useWorkspace } from "@/lib/workspace";
import type { DocumentStatus, StudentDocument } from "@/lib/types";
import { formatShortDate } from "@/lib/format";
import { toast } from "sonner";

const STATUSES: DocumentStatus[] = ["pending", "uploaded", "under_review", "verified", "rejected", "expired"];

export function DocumentsPage() {
  const { documents } = useScopedIds();
  const students = useStudentMap();
  const verify = useAppStore((s) => s.verifyDocument);
  const remove = useAppStore((s) => s.deleteDocuments);
  const { base, role } = useWorkspace();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [country, setCountry] = useState("all");
  const [type, setType] = useState("all");
  const [uploadedBy, setUploadedBy] = useState("all");
  const [studentId, setStudentId] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);

  const types = useMemo(() => [...new Set(documents.map((d) => d.type))].sort(), [documents]);
  const uploaders = useMemo(() => [...new Set(documents.map((d) => d.uploadedBy).filter(Boolean))] as string[], [documents]);
  const studentOptions = useMemo(
    () =>
      [...new Set(documents.map((d) => d.studentId))]
        .map((id) => ({ value: id, label: `${students[id]?.name ?? id} (${id})` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [documents, students],
  );

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const student = students[d.studentId];
      if (status !== "all" && d.status !== status) return false;
      if (category !== "all" && d.category !== category) return false;
      if (type !== "all" && d.type !== type) return false;
      if (uploadedBy !== "all" && d.uploadedBy !== uploadedBy) return false;
      if (studentId !== "all" && d.studentId !== studentId) return false;
      if (country !== "all" && student?.country !== country) return false;
      if (dateRange !== "all") {
        const t = new Date(d.updatedAt).getTime();
        const days = dateRange === "today" ? 1 : dateRange === "7d" ? 7 : 30;
        if (t < Date.now() - days * 86400000) return false;
      }
      if (q) {
        const blob = `${student?.name ?? ""} ${d.studentId} ${d.name} ${d.type} ${d.fileName ?? ""}`.toLowerCase();
        if (!blob.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [documents, students, status, category, type, uploadedBy, country, studentId, dateRange, q]);

  const kpis = useMemo(() => documentStats(documents), [documents]);

  const columns = useMemo<ColumnDef<StudentDocument>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => {
          const s = students[row.original.studentId];
          return (
            <span>
              <span className="block font-medium">{s?.name ?? row.original.studentId}</span>
              <span className="font-mono text-micro text-muted-foreground">{row.original.studentId}</span>
            </span>
          );
        },
      },
      { accessorKey: "type", header: "Document" },
      { accessorKey: "category", header: "Category" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <DocumentStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "uploadedBy",
        header: "Uploaded By",
        cell: ({ row }) => row.original.uploadedBy ?? "—",
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => formatShortDate(row.original.updatedAt),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              void navigate({ to: `${base}/students/${row.original.studentId}` });
            }}
          >
            Open
          </Button>
        ),
      },
    ],
    [students, base, navigate],
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Documents" description="Manage student documents across the organization." />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Documents" value={kpis.total} />
        <StatCard label="Pending Review" value={kpis.underReview + kpis.uploaded} />
        <StatCard label="Verified" value={kpis.verified} />
        <StatCard label="Rejected" value={kpis.rejected} />
        <StatCard label="Student Uploads" value={kpis.studentUploads} />
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(d) => d.id}
        searchPlaceholder="Search documents…"
        globalFilter={q}
        onGlobalFilterChange={setQ}
        selectable
        onRowClick={(d) => void navigate({ to: `${base}/students/${d.studentId}` })}
        emptyTitle="No documents found"
        extraFilters={
          <>
            <FilterSelect
              value={studentId}
              onChange={setStudentId}
              placeholder="Student"
              options={studentOptions}
              className="w-[220px]"
            />
            <FilterSelect
              value={country}
              onChange={setCountry}
              placeholder="Country"
              options={["Germany", "UK", "USA"]}
            />
            <FilterSelect value={type} onChange={setType} placeholder="Document Type" options={types} />
            <FilterSelect
              value={category}
              onChange={setCategory}
              placeholder="Category"
              options={[...DOCUMENT_CATEGORIES]}
            />
            <FilterSelect
              value={status}
              onChange={setStatus}
              placeholder="Status"
              options={STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
            />
            <FilterSelect value={uploadedBy} onChange={setUploadedBy} placeholder="Uploaded By" options={uploaders} />
            <FilterSelect
              value={dateRange}
              onChange={setDateRange}
              placeholder="Date"
              options={[
                { value: "today", label: "Today" },
                { value: "7d", label: "Last 7 days" },
                { value: "30d", label: "Last 30 days" },
              ]}
            />
          </>
        }
        bulkActions={(selected, clear) => (
          <>
            {role === "admin" && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  selected.forEach((d) => verify(d.id));
                  toast.success("Document verified");
                  clear();
                }}
              >
                <ShieldCheck className="size-3.5" /> Mark verified
              </Button>
            )}
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                toast.message("Download is available for files stored in this session.");
              }}
            >
              <Download className="size-3.5" /> Download
            </Button>
            {role === "admin" && (
              <Button size="xs" variant="destructive" onClick={() => setPendingDelete(selected.map((d) => d.id))}>
                <Trash2 className="size-3.5" /> Delete
              </Button>
            )}
          </>
        )}
        renderMobileCard={(d) => (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{d.type}</p>
              <p className="text-micro text-muted-foreground">{students[d.studentId]?.name ?? d.studentId}</p>
            </div>
            <DocumentStatusBadge status={d.status} />
          </div>
        )}
      />
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Delete documents?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) {
            remove(pendingDelete);
            toast.success("Document deleted");
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
