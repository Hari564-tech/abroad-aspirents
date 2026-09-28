import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { StatCard } from "@/components/stat-card";
import { SeverityBadge } from "@/components/status-badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/lib/store";
import { AUDIT_ACTIONS, type AuditEvent, type AuditSeverity } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { isToday } from "date-fns";

export function AuditPage() {
  const events = useAppStore((s) => s.auditEvents);
  const [user, setUser] = useState("all");
  const [role, setRole] = useState("all");
  const [action, setAction] = useState("all");
  const [module, setModule] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const users = useMemo(() => [...new Set(events.map((e) => e.user))], [events]);
  const modules = useMemo(() => [...new Set(events.map((e) => e.module))], [events]);

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (user !== "all" && e.user !== user) return false;
        if (role !== "all" && e.role !== role) return false;
        if (action !== "all" && e.action !== action) return false;
        if (module !== "all" && e.module !== module) return false;
        if (severity !== "all" && e.severity !== severity) return false;
        return true;
      }),
    [events, user, role, action, module, severity],
  );

  const kpis = useMemo(() => {
    const today = events.filter((e) => isToday(new Date(e.timestamp))).length;
    return {
      today,
      critical: events.filter((e) => e.severity === "CRITICAL").length,
      admin: events.filter((e) => e.role === "admin").length,
      failed: events.filter((e) => e.action === "DELETE" || e.severity === "CRITICAL").length,
    };
  }, [events]);

  const columns = useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "Timestamp",
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.timestamp)}</span>,
      },
      { accessorKey: "user", header: "User" },
      { accessorKey: "role", header: "Role", cell: ({ row }) => <span className="capitalize">{row.original.role}</span> },
      { accessorKey: "action", header: "Action" },
      { accessorKey: "module", header: "Module" },
      { accessorKey: "recordId", header: "Record", cell: ({ row }) => <span className="font-mono text-xs">{row.original.recordId}</span> },
      {
        id: "changes",
        header: "Changes",
        cell: ({ row }) =>
          row.original.before && row.original.after ? (
            <span className="text-xs">
              {row.original.before} → {row.original.after}
            </span>
          ) : (
            <span className="text-muted-foreground">{row.original.details}</span>
          ),
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      { accessorKey: "ip", header: "IP", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip}</span> },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Center"
        description="Track every important action performed across the platform."
      />
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Today's events" value={kpis.today.toLocaleString()} />
        <StatCard label="Critical events" value={kpis.critical} />
        <StatCard label="Admin actions" value={kpis.admin} />
        <StatCard label="Failed actions" value={kpis.failed} />
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(e) => e.id}
        searchPlaceholder="Search audit events…"
        extraFilters={
          <>
            <FilterSelect value={user} onChange={setUser} placeholder="User" options={users} />
            <FilterSelect value={role} onChange={setRole} placeholder="Role" options={["admin", "employee", "student"]} />
            <FilterSelect value={action} onChange={setAction} placeholder="Action" options={AUDIT_ACTIONS} />
            <FilterSelect value={module} onChange={setModule} placeholder="Module" options={modules} />
            <FilterSelect
              value={severity}
              onChange={setSeverity}
              placeholder="Severity"
              options={["INFO", "SUCCESS", "WARNING", "CRITICAL"] as AuditSeverity[]}
            />
          </>
        }
        onRowClick={(e) => setSelected(e)}
        emptyTitle="No audit events"
        onClearFilters={() => {
          setUser("all");
          setRole("all");
          setAction("all");
          setModule("all");
          setSeverity("all");
        }}
        pageSize={15}
        renderMobileCard={(e) => (
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{e.user}</p>
              <SeverityBadge severity={e.severity} />
            </div>
            <p className="text-xs text-muted-foreground">{e.details}</p>
            <p className="mt-1 font-mono text-micro">{e.recordId}</p>
          </div>
        )}
      />

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="overflow-y-auto p-0 sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Event details</SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 p-6 text-sm">
                <Row k="Who" v={selected.user} />
                <Row k="Role" v={selected.role} />
                <Row k="What" v={selected.details} />
                <Row k="Action" v={selected.action} />
                <Row k="When" v={formatDateTime(selected.timestamp)} />
                <Row k="Student / record" v={selected.recordId} mono />
                <Row k="Module" v={selected.module} />
                <Row k="IP address" v={selected.ip} mono />
                <Row k="User agent" v={selected.userAgent} />
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Changes</p>
                  {selected.before || selected.after ? (
                    <div className="overflow-hidden rounded-lg border">
                      <div className="grid grid-cols-3 bg-secondary px-3 py-1.5 text-micro font-medium">
                        <span>Field</span>
                        <span>Previous state</span>
                        <span>New state</span>
                      </div>
                      <div className="grid grid-cols-3 px-3 py-2">
                        <span>Status</span>
                        <span className="text-muted-foreground">{selected.before ?? "—"}</span>
                        <span className="font-medium">{selected.after ?? "—"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{selected.details}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className={mono ? "font-mono text-xs" : "font-medium"}>{v}</p>
    </div>
  );
}
