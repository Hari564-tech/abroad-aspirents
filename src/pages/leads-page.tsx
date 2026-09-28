import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { LayoutGrid, Plus, Table as TableIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { useEmployeeMap, useScopedIds } from "@/lib/scoped";
import { INTAKES, type Country, type Intake, type Lead, type LeadPipeline, type LeadType } from "@/lib/types";
import { relativeTime } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PIPELINES: LeadPipeline[] = ["New", "Shortlisting", "Applications", "Offer", "Visa"];

export function LeadsPage() {
  const { leads } = useScopedIds();
  const employees = useAppStore((s) => s.employees);
  const upsertLead = useAppStore((s) => s.upsertLead);
  const empMap = useEmployeeMap();
  const currentUser = useAppStore((s) => s.currentUser);
  const [view, setView] = useState<"table" | "pipeline">("pipeline");
  const [employee, setEmployee] = useState("all");
  const [type, setType] = useState("all");
  const [country, setCountry] = useState("all");
  const [status, setStatus] = useState("all");
  const [intake, setIntake] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Lead>>({});

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        if (employee !== "all" && l.employeeId !== employee) return false;
        if (type !== "all" && l.type !== type) return false;
        if (country !== "all" && l.country !== country) return false;
        if (status !== "all" && l.pipeline !== status) return false;
        if (intake !== "all" && l.intake !== intake) return false;
        return true;
      }),
    [leads, employee, type, country, status, intake],
  );

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      { accessorKey: "name", header: "Lead" },
      { accessorKey: "type", header: "Type" },
      { accessorKey: "b2bOrg", header: "B2B org", cell: ({ row }) => row.original.b2bOrg ?? "—" },
      { accessorKey: "country", header: "Country" },
      { accessorKey: "intake", header: "Intake" },
      { id: "emp", header: "Employee", cell: ({ row }) => empMap[row.original.employeeId]?.name ?? "—" },
      { accessorKey: "pipeline", header: "Status" },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => relativeTime(row.original.updatedAt),
      },
    ],
    [empMap],
  );

  function create() {
    if (!draft.name) {
      toast.error("Name is required");
      return;
    }
    const id = `LD-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    upsertLead({
      id,
      name: draft.name,
      email: draft.email ?? "",
      phone: draft.phone ?? "",
      country: (draft.country as Country) ?? "Germany",
      intake: (draft.intake as Intake) ?? "Winter 2026",
      employeeId: draft.employeeId ?? currentUser?.id ?? employees[1]?.id ?? "EMP-002",
      type: (draft.type as LeadType) ?? "Direct",
      b2bOrg: draft.type === "B2B" ? draft.b2bOrg : undefined,
      pipeline: "New",
      status: "New",
      createdAt: now,
      updatedAt: now,
      notes: "",
    });
    toast.success("Lead created");
    setOpen(false);
    setDraft({});
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads"
        description="Track inbound Direct and B2B enquiries through the pipeline."
        actions={
          <>
            <div className="inline-flex rounded-lg bg-secondary p-1">
              <Button size="xs" variant={view === "table" ? "default" : "ghost"} onClick={() => setView("table")}>
                <TableIcon className="size-3.5" /> Table
              </Button>
              <Button size="xs" variant={view === "pipeline" ? "default" : "ghost"} onClick={() => setView("pipeline")}>
                <LayoutGrid className="size-3.5" /> Pipeline
              </Button>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Add lead
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          value={employee}
          onChange={setEmployee}
          placeholder="Employee"
          options={employees.filter((e) => e.role === "employee").map((e) => ({ value: e.id, label: e.name }))}
        />
        <FilterSelect value={type} onChange={setType} placeholder="Lead type" options={["Direct", "B2B"]} />
        <FilterSelect value={country} onChange={setCountry} placeholder="Country" options={["Germany", "UK", "USA"]} />
        <FilterSelect value={status} onChange={setStatus} placeholder="Status" options={PIPELINES} />
        <FilterSelect value={intake} onChange={setIntake} placeholder="Intake" options={INTAKES} />
      </div>

      {view === "table" ? (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(l) => l.id}
          searchPlaceholder="Search leads…"
          emptyTitle="No leads found"
          onClearFilters={() => {
            setEmployee("all");
            setType("all");
            setCountry("all");
            setStatus("all");
            setIntake("all");
          }}
        />
      ) : (
        <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-5">
          {PIPELINES.map((col) => {
            const items = filtered.filter((l) => l.pipeline === col);
            return (
              <div key={col} className="min-w-[200px]">
                <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {col}
                  <span className="tabular-nums">{items.length}</span>
                </div>
                <div className="grid gap-2">
                  {items.map((l) => (
                    <Card key={l.id} className="p-3">
                      <p className="text-sm font-medium">{l.name}</p>
                      <p className="text-micro text-muted-foreground">
                        {l.country} · {l.type}
                        {l.b2bOrg ? ` · ${l.b2bOrg}` : ""}
                      </p>
                      <Select
                        value={l.pipeline}
                        onValueChange={(v) => {
                          upsertLead({ ...l, pipeline: v as LeadPipeline, status: v, updatedAt: new Date().toISOString() });
                          toast.success("Lead moved");
                        }}
                      >
                        <SelectTrigger className="mt-2 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PIPELINES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <div className={cn("rounded-xl border border-dashed px-3 py-8 text-center text-xs text-muted-foreground")}>
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <FormField label="Name" required>
              <Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </FormField>
            <FormField label="Email">
              <Input value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </FormField>
            <FormField label="Phone">
              <Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </FormField>
            <FormField label="Country">
              <Select
                value={(draft.country as string) ?? "Germany"}
                onValueChange={(v) => setDraft({ ...draft, country: v as Country })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Germany", "UK", "USA"] as const).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Lead type">
              <Select
                value={(draft.type as string) ?? "Direct"}
                onValueChange={(v) => setDraft({ ...draft, type: v as LeadType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="B2B">B2B</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            {draft.type === "B2B" && (
              <FormField label="B2B organization">
                <Input value={draft.b2bOrg ?? ""} onChange={(e) => setDraft({ ...draft, b2bOrg: e.target.value })} />
              </FormField>
            )}
            <Button onClick={create}>Create lead</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
