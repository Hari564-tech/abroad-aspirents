import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { PaymentBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { useAppStore } from "@/lib/store";
import { useScopedIds, useStudentMap } from "@/lib/scoped";
import { useWorkspace } from "@/lib/workspace";
import { formatINR, formatLakhs, relativeTime } from "@/lib/format";
import type { PaymentRecord } from "@/lib/types";
import { toast } from "sonner";

export function PaymentsPage() {
  const { payments } = useScopedIds();
  const students = useStudentMap();
  const updatePayment = useAppStore((s) => s.updatePayment);
  const { base } = useWorkspace();
  const navigate = useNavigate();
  const [edit, setEdit] = useState<PaymentRecord | null>(null);
  const [amount, setAmount] = useState("");

  const totals = useMemo(() => {
    const revenue = payments.reduce((n, p) => n + p.totalFee, 0);
    const collected = payments.reduce((n, p) => n + (p.totalFee - p.remaining - p.discount), 0);
    const pending = payments.reduce((n, p) => n + p.remaining, 0);
    const discounts = payments.reduce((n, p) => n + p.discount, 0);
    return { revenue, collected, pending, discounts };
  }, [payments]);

  const columns = useMemo<ColumnDef<PaymentRecord>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => students[row.original.studentId]?.name ?? row.original.studentId,
      },
      {
        accessorKey: "totalFee",
        header: "Total fee",
        cell: ({ row }) => formatINR(row.original.totalFee),
      },
      {
        accessorKey: "initialPayment",
        header: "Initial payment",
        cell: ({ row }) => formatINR(row.original.initialPayment),
      },
      {
        accessorKey: "remaining",
        header: "Remaining",
        cell: ({ row }) => formatINR(row.original.remaining),
      },
      {
        accessorKey: "discount",
        header: "Discount",
        cell: ({ row }) => formatINR(row.original.discount),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <PaymentBadge status={row.original.status} />,
      },
      {
        id: "last",
        header: "Last payment",
        cell: ({ row }) => (row.original.lastPayment ? relativeTime(row.original.lastPayment) : "—"),
      },
      {
        id: "act",
        header: "",
        cell: ({ row }) => (
          <Button
            size="xs"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setEdit(row.original);
              setAmount(String(students[row.original.studentId]?.paidAmount ?? 0));
            }}
          >
            Update
          </Button>
        ),
      },
    ],
    [students],
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" description="Collected fees, remaining balances and discounts." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total revenue" value={formatLakhs(totals.revenue)} />
        <StatCard label="Collected" value={formatLakhs(totals.collected)} />
        <StatCard label="Pending" value={formatLakhs(totals.pending)} />
        <StatCard label="Discounts" value={formatLakhs(totals.discounts)} />
      </div>
      <DataTable
        data={payments}
        columns={columns}
        getRowId={(p) => p.id}
        searchPlaceholder="Search payments…"
        onRowClick={(p) => void navigate({ to: `${base}/students/${p.studentId}` })}
        emptyTitle="No payments found"
        renderMobileCard={(p) => (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{students[p.studentId]?.name}</p>
              <p className="text-xs text-muted-foreground">{formatINR(p.remaining)} remaining</p>
            </div>
            <PaymentBadge status={p.status} />
          </div>
        )}
      />

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update payment</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">{students[edit.studentId]?.name}</p>
              <FormField label="Amount paid (₹)">
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </FormField>
              <Button
                onClick={() => {
                  updatePayment(edit.studentId, { paidAmount: Number(amount) });
                  toast.success("Payment information updated");
                  setEdit(null);
                }}
              >
                Save
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
