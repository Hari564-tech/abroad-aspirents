import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, GraduationCap, FileText, Stamp, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonAvatar } from "@/components/ui/avatar";
import { DocumentsAttentionWidget } from "@/components/documents/documents-attention-widget";
import { useAppStore } from "@/lib/store";
import { useEmployeeMap, greetingName } from "@/lib/scoped";
import { formatLakhs, relativeTime, toCsv, downloadText } from "@/lib/format";
import { downloadHtmlAsPdf } from "@/lib/pdf";
import { APPLICATION_STATUSES } from "@/lib/types";
import { toast } from "sonner";

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "#64748b",
  "#94a3b8",
  "#0f766e",
];

export function AdminDashboardPage() {
  const user = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const applications = useAppStore((s) => s.applications);
  const payments = useAppStore((s) => s.payments);
  const employees = useAppStore((s) => s.employees);
  const audit = useAppStore((s) => s.auditEvents);
  const empMap = useEmployeeMap();
  const navigate = useNavigate();
  const [range, setRange] = useState("30");
  const appendAudit = useAppStore((s) => s.appendAudit);

  const kpis = useMemo(() => {
    const activeApps = applications.filter((a) => a.status !== "Dropped").length;
    const offers = students.filter((s) => s.status === "Offered" || s.status === "Got Visa" || s.status === "Waiting").length;
    const visas = students.filter((s) => s.status === "Got Visa").length;
    const pendingPay = payments.filter((p) => p.status === "Pending" || p.status === "Partially Paid" || p.status === "Overdue");
    const pendingAmt = pendingPay.reduce((n, p) => n + p.remaining, 0);
    const activeEmps = employees.filter((e) => e.status === "Active" && e.role === "employee").length;
    return { activeApps, offers, visas, pendingPay: pendingPay.length, pendingAmt, activeEmps };
  }, [students, applications, payments, employees]);

  const trend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const buckets = months.map((m) => ({ month: m, students: 0 }));
    students.forEach((s) => {
      const d = new Date(s.createdAt);
      buckets[d.getMonth()]!.students += 1;
    });
    return buckets.slice(0, 9);
  }, [students]);

  const statusPie = useMemo(
    () =>
      APPLICATION_STATUSES.map((st) => ({
        name: st,
        value: students.filter((s) => s.status === st).length,
      })).filter((d) => d.value > 0),
    [students],
  );

  const byCountry = useMemo(() => {
    const m: Record<string, number> = { Germany: 0, UK: 0, USA: 0 };
    students.forEach((s) => {
      m[s.country] = (m[s.country] ?? 0) + 1;
    });
    return Object.entries(m).map(([country, count]) => ({ country, count }));
  }, [students]);

  const performance = useMemo(() => {
    return employees
      .filter((e) => e.role === "employee" && e.status === "Active")
      .map((e) => {
        const mine = students.filter((s) => s.employeeId === e.id);
        const apps = applications.filter((a) => a.employeeId === e.id);
        return {
          id: e.id,
          name: e.name,
          hue: e.avatarHue,
          students: mine.length,
          applications: apps.length,
          offers: mine.filter((s) => s.status === "Offered" || s.status === "Got Visa").length,
          visas: mine.filter((s) => s.status === "Got Visa").length,
          pending: mine.filter((s) => s.paymentStatus !== "Paid").length,
        };
      })
      .sort((a, b) => b.students - a.students)
      .slice(0, 8);
  }, [employees, students, applications]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={greetingName(user?.name ?? "Admin")}
        description="Here's what's happening across your organization."
        actions={
          <>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                const html = `
                  <div style="padding: 40px; font-family: system-ui, sans-serif;">
                    <h1 style="color: #1e293b; margin-bottom: 20px;">Dashboard Overview Report</h1>
                    <p style="color: #64748b; margin-bottom: 30px;">Timeframe: Last ${range} days</p>
                    <table style="width: 100%; border-collapse: collapse;">
                      <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                          <th style="padding: 12px; color: #475569;">Metric</th>
                          <th style="padding: 12px; color: #475569;">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 12px;">Total Students</td>
                          <td style="padding: 12px;"><strong>${students.length}</strong></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 12px;">Active Applications</td>
                          <td style="padding: 12px;"><strong>${kpis.activeApps}</strong></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 12px;">Offers Received</td>
                          <td style="padding: 12px;"><strong>${kpis.offers}</strong></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 12px;">Visas Approved</td>
                          <td style="padding: 12px;"><strong>${kpis.visas}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                `;
                downloadHtmlAsPdf(html, "Dashboard_Overview.pdf");
                appendAudit({
                  action: "EXPORT",
                  module: "Reports",
                  recordId: "DASH",
                  details: "Exported overview report",
                  severity: "INFO",
                });
                toast.success("Report exported");
              }}
            >
              <Download className="size-4" />
              Export report
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total students" value={students.length} delta={12.4} icon={GraduationCap} />
        <StatCard label="Active applications" value={kpis.activeApps} delta={8.2} icon={FileText} />
        <StatCard label="Offers received" value={kpis.offers} delta={14.6} icon={Stamp} />
        <StatCard label="Visas received" value={kpis.visas} delta={9.8} icon={Stamp} />
        <StatCard
          label="Pending payments"
          value={kpis.pendingPay}
          hint={formatLakhs(kpis.pendingAmt)}
          icon={Wallet}
        />
        <StatCard label="Active employees" value={kpis.activeEmps} icon={Users} />
      </div>

      <DocumentsAttentionWidget />

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Student registration trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="fillStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="students"
                  stroke="var(--color-primary)"
                  fill="url(#fillStudents)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Application status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2}>
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Students by country</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCountry} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="country" tick={{ fontSize: 12 }} width={70} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Employee performance</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-table">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  {["Employee", "Students", "Apps", "Offers", "Visas", "Pending"].map((h) => (
                    <th key={h} className="px-5 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {performance.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b last:border-0 hover:bg-secondary/60"
                    onClick={() => void navigate({ to: `/admin/employees/${row.id}` })}
                  >
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <PersonAvatar name={row.name} hue={row.hue} className="size-6" />
                        {row.name}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 tabular-nums">{row.students}</td>
                    <td className="px-5 py-2.5 tabular-nums">{row.applications}</td>
                    <td className="px-5 py-2.5 tabular-nums">{row.offers}</td>
                    <td className="px-5 py-2.5 tabular-nums">{row.visas}</td>
                    <td className="px-5 py-2.5 tabular-nums">{row.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {audit.slice(0, 6).map((e) => (
            <div key={e.id} className="flex gap-3">
              <div className="w-20 shrink-0 text-micro text-muted-foreground">
                {new Date(e.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </div>
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{e.user}</span>{" "}
                  <span className="text-muted-foreground">{e.details.toLowerCase()}</span>{" "}
                  <span className="font-mono text-xs">{e.recordId}</span>
                </p>
                {e.before && e.after && (
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {e.before} → {e.after}
                  </p>
                )}
                <p className="text-micro text-muted-foreground">{relativeTime(e.timestamp)}</p>
              </div>
              {APPLICATION_STATUSES.includes(e.after as never) && e.after && (
                <div className="ml-auto hidden sm:block">
                  <StatusBadge status={e.after as never} />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
