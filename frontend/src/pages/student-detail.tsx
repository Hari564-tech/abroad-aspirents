import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CreditCard,
  Download,
  GraduationCap,
  MoreHorizontal,
  Pencil,
  Printer,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PasswordField } from "@/components/password-field";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { MatchBadge, ScoreMeter } from "@/components/eligibility-tools";
import { useAppStore } from "@/lib/store";
import { useEmployeeMap, useUniversityMap } from "@/lib/scoped";
import { useWorkspace } from "@/lib/workspace";
import { APPLICATION_STATUSES, type ApplicationStatus, type Student, type University } from "@/lib/types";
import { formatEnglishProfile, matchAllUniversities, studentGermanGrade, summarizeMatches, verdictLabel, type MatchVerdict, type UniversityMatch } from "@/lib/eligibility";
import { formatINR, formatShortDate, relativeTime, toCsv, downloadText } from "@/lib/format";
import { downloadHtmlAsPdf } from "@/lib/pdf";
import { toast } from "sonner";

export function StudentDetailPage({ studentId }: { studentId: string }) {
  const students = useAppStore((s) => s.students);
  const student = students.find((s) => s.id === studentId);
  const applications = useAppStore((s) => s.applications).filter((a) => a.studentId === studentId);
  const documents = useAppStore((s) => s.documents).filter((d) => d.studentId === studentId);
  const payments = useAppStore((s) => s.payments).filter((p) => p.studentId === studentId);
  const audit = useAppStore((s) => s.auditEvents).filter((e) => e.recordId === studentId);
  const universities = useAppStore((s) => s.universities);
  const settings = useAppStore((s) => s.settings);
  const changeStatus = useAppStore((s) => s.changeStudentStatus);
  const deleteStudent = useAppStore((s) => s.deleteStudent);
  const empMap = useEmployeeMap();
  const uniMap = useUniversityMap();
  const { base, role } = useWorkspace();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);

  const timeline = useMemo(() => {
    if (!student) return [];
    const events = [
      {
        id: "reg",
        timestamp: student.createdAt,
        title: "Student registered",
        detail: `${student.name} was added to ${student.intake}.`,
        user: empMap[student.employeeId]?.name,
      },
      ...applications
        .filter((a) => a.submittedAt)
        .map((a) => ({
          id: a.id,
          timestamp: a.submittedAt!,
          title: a.offerReceived ? "Offer received" : "Application submitted",
          detail: `${uniMap[a.universityId]?.name ?? "University"} · ${a.course}`,
          user: empMap[a.employeeId]?.name,
        })),
      ...audit.slice(0, 12).map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        title: e.details,
        detail: e.before && e.after ? `${e.before} → ${e.after}` : undefined,
        user: e.user,
      })),
    ];
    return events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [student, applications, audit, empMap, uniMap]);

  if (!student) {
    return (
      <EmptyState
        title="Student not found"
        description="This record may have been deleted."
        actionLabel="Back to students"
        onAction={() => void navigate({ to: `${base}/students` })}
      />
    );
  }

  const remaining = Math.max(0, student.totalFee - student.discount - student.paidAmount);
  const pct = student.totalFee ? Math.round((student.paidAmount / (student.totalFee - student.discount || 1)) * 100) : 0;
  const counselor = empMap[student.employeeId];
  const offers = applications.filter((a) => a.offerReceived).length;
  const initialTab =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("tab") === "documents" ||
      sessionStorage.getItem(`meridian-upload-${student.id}`) ||
      sessionStorage.getItem(`meridian-portal-${student.id}`))
      ? "documents"
      : "overview";

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.name}
        description={`${student.id} · ${student.country} · ${student.intake}`}
        actions={
          <>
            <Select
              value={student.status}
              onValueChange={(v) => {
                changeStatus(student.id, v as ApplicationStatus);
                toast.success("Status changed");
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void navigate({ to: `${base}/universities?student=${student.id}` })}>
              <GraduationCap className="size-4" /> Check eligibility
            </Button>
            <Button variant="outline" onClick={() => void navigate({ to: `${base}/students/${student.id}/edit` })}>
              <Pencil className="size-4" /> Edit student
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {role === "admin" && (
                  <DropdownMenuItem destructive onClick={() => setConfirm(true)}>
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="flex items-center gap-3">
        <PersonAvatar name={student.name} hue={student.avatarHue} className="size-12" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={student.status} />
            <PaymentBadge status={student.paymentStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {student.branch} · {student.college}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Current status</p>
          <p className="mt-1 text-sm font-semibold">{student.status}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Lead employee</p>
          <p className="mt-1 text-sm font-semibold">{counselor?.name ?? "Unassigned"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Payment</p>
          <p className="mt-1 text-sm font-semibold">
            {formatINR(student.paidAmount)} / {formatINR(student.totalFee)}
          </p>
          <Progress value={Math.min(100, pct)} className="mt-2" />
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Applications</p>
          <p className="mt-1 text-sm font-semibold">
            {applications.length} · {offers} offers
          </p>
        </Card>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {documents.length > 0 && (
              <span className="ml-1.5 text-micro text-muted-foreground">{documents.filter((d) => d.required && (d.status === "uploaded" || d.status === "under_review" || d.status === "verified")).length}/{documents.filter((d) => d.required).length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="universities">Universities</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Phone 1" value={student.phone1} />
              <Field label="Phone 2" value={student.phone2 || "—"} />
              <Field label="Email" value={student.email} />
              <Field label="Lead type" value={student.leadType} />
              {student.b2bOrg && <Field label="B2B organization" value={student.b2bOrg} />}
              <Field label="Device" value={student.device} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Account credentials</CardTitle>
              <span className="inline-flex items-center gap-1 text-micro text-warning">
                <ShieldAlert className="size-3" /> Sensitive data
              </span>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-xs text-muted-foreground">
                Only authorized users should access this information. This prototype does not securely store
                credentials.
              </p>
              <Field label="Gmail ID" value={student.gmailId} />
              <PasswordField label="Gmail password" value={student.gmailPassword} />
              <Field label="Recovery number" value={student.recoveryNumber} />
              <Field label="2-step verification" value={student.twoStep ? "Enabled" : "Off"} />
            </CardContent>
          </Card>
          {student.country === "Germany" && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Germany-specific</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <PasswordField label="APS username" value={student.apsUsername ?? ""} warning={false} />
                <PasswordField label="APS password" value={student.apsPassword ?? ""} />
                <Field label="Uni-Assist ID" value={student.uniAssistId ?? "—"} />
                <PasswordField label="Uni-Assist password" value={student.uniAssistPassword ?? ""} />
                <Field label="Uni-Assist documents" value={student.uniAssistDocuments ?? "—"} />
                <Field label="Blocked account" value={student.blockedAccount ?? "—"} />
                <Field label="Enrollment" value={student.enrollment ?? "—"} />
                <Field label="Student dorm" value={student.studentDorm ?? "—"} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="academic">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="CGPA" value={student.cgpa.toFixed(2)} />
              <Field label="IELTS" value={student.ielts?.toFixed(1) ?? "—"} />
              <Field label="TOEFL" value={student.toefl?.toString() ?? "—"} />
              <Field label="Duolingo" value={student.duolingo?.toString() ?? "—"} />
              <Field label="German grade" value={student.germanGrade?.toFixed(1) ?? "—"} />
              <Field label="GRE" value={student.gre?.toString() ?? "—"} />
              <Field label="German language" value={student.germanLanguage} />
              <Field label="Branch" value={student.branch} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-table">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    {["University", "Course", "Status", "Submitted", "Offer", "Deadline"].map((h) => (
                      <th key={h} className="px-5 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-5 py-2.5">{uniMap[a.universityId]?.name ?? a.universityId}</td>
                      <td className="px-5 py-2.5">{a.course}</td>
                      <td className="px-5 py-2.5">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground">
                        {a.submittedAt ? formatShortDate(a.submittedAt) : "—"}
                      </td>
                      <td className="px-5 py-2.5">{a.offerReceived ? "Yes" : "—"}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">{formatShortDate(a.deadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {applications.length === 0 && <EmptyState title="No applications yet" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" /> Payment summary
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const html = buildEligibilityReceiptHtml(student, universities, [], "Fee", settings.name);
                    downloadText(receiptFilename(student, "Payment", "html"), html, "text/html;charset=utf-8");
                    toast.success("Payment receipt downloaded");
                  }}
                >
                  <Download className="size-4" /> Download receipt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const html = buildEligibilityReceiptHtml(student, universities, [], "Fee", settings.name);
                    const w = window.open("", "_blank", "noopener,noreferrer,width=920,height=1200");
                    if (!w) {
                      downloadText(receiptFilename(student, "Payment", "html"), html, "text/html;charset=utf-8");
                      toast.message("Pop-up blocked — downloaded receipt HTML instead.");
                      return;
                    }
                    w.document.write(html);
                    w.document.close();
                    w.focus();
                    window.setTimeout(() => w.print(), 400);
                  }}
                >
                  <Printer className="size-4" /> Print / Save PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Total fee" value={formatINR(student.totalFee)} />
                <Field label="Collected" value={formatINR(student.paidAmount)} />
                <Field label="Discount" value={formatINR(student.discount)} />
                <Field label="Remaining" value={formatINR(remaining)} />
              </div>
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{p.method ?? "Record"}</span>
                  <span className="text-muted-foreground">
                    {p.lastPayment ? relativeTime(p.lastPayment) : "No payment yet"}
                  </span>
                  <PaymentBadge status={p.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentWorkspace student={student} />
        </TabsContent>

        <TabsContent value="universities">
          <div className="grid gap-3 sm:grid-cols-2">
            {applications.map((a) => {
              const u = uniMap[a.universityId];
              if (!u) return null;
              return (
                <Card key={a.id} className="p-4">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {u.course} · {u.location}
                  </p>
                  <div className="mt-3">
                    <StatusBadge status={a.status} />
                  </div>
                </Card>
              );
            })}
            {applications.length === 0 && <EmptyState title="No universities linked yet" />}
          </div>
        </TabsContent>

        <TabsContent value="eligibility">
          <StudentEligibilityPanel student={student} universities={universities} onOpenTool={() => void navigate({ to: `${base}/universities?student=${student.id}` })} />
        </TabsContent>

        <TabsContent value="activity">
          <Card className="p-5">
            <Timeline events={timeline} />
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete student?"
        description={
          <p>
            This action cannot be undone.
            <br />
            <span className="mt-2 block font-medium text-foreground">
              {student.name}
              <br />
              <span className="font-mono text-xs">{student.id}</span>
            </span>
          </p>
        }
        confirmLabel="Delete student"
        onConfirm={() => {
          deleteStudent(student.id);
          toast.success("Student deleted");
          void navigate({ to: `${base}/students` });
        }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function StudentEligibilityPanel({
  student,
  universities,
  onOpenTool,
}: {
  student: Student;
  universities: University[];
  onOpenTool: () => void;
}) {
  const settings = useAppStore((s) => s.settings);
  const pool = universities.filter((u) => !u.archived && u.country === student.country);
  const matches = matchAllUniversities(student, pool);
  const summary = summarizeMatches(matches);
  const [verdictFilter, setVerdictFilter] = useState<"all" | MatchVerdict | "shortlisted">("all");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (verdictFilter === "all") return matches;
    if (verdictFilter === "shortlisted") return [];
    return matches.filter((m) => m.verdict === verdictFilter);
  }, [matches, verdictFilter]);

  const INITIAL_COUNT = 8;
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);

  const exportReceipt = (label: string, rows: typeof matches, openPrint = false) => {
    if (rows.length === 0) {
      toast.error("No universities to export for this filter");
      return;
    }
    const html = buildEligibilityReceiptHtml(student, universities, rows, label, settings.name);
    if (openPrint) {
      const filename = receiptFilename(student, label, "pdf");
      downloadHtmlAsPdf(html, filename);
    } else {
      downloadText(receiptFilename(student, label, "html"), html, "text/html;charset=utf-8");
      toast.success(`Exported ${rows.length} ${label.toLowerCase()} universities as receipt`);
    }
  };

  const filterTabs = [
    { key: "all" as const, label: "All", count: matches.length },
    { key: "eligible" as const, label: "Eligible", count: summary.eligible },
    { key: "close" as const, label: "Close", count: summary.close },
    { key: "ineligible" as const, label: "Not eligible", count: summary.ineligible },
  ];

  const currentLabel =
    verdictFilter === "all"
      ? "All"
      : verdictFilter === "eligible"
        ? "Eligible"
        : verdictFilter === "close"
          ? "Close"
          : verdictFilter === "ineligible"
            ? "Not_Eligible"
            : "All";

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Eligibility for {student.country}</p>
          <p className="text-sm text-muted-foreground">
            {summary.eligible} eligible · {summary.close} close · {summary.ineligible} not eligible
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportReceipt(currentLabel, filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="size-4" /> Export current view
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportReceipt("All", matches)}
            disabled={matches.length === 0}
          >
            <Download className="size-4" /> Export all
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportReceipt(currentLabel, filtered, true)}
            disabled={filtered.length === 0}
          >
            <Printer className="size-4" /> Print / Save PDF
          </Button>
          <Button variant="outline" onClick={onOpenTool}>
            <GraduationCap className="size-4" /> Open eligibility tool
          </Button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
          <span className="tabular-nums">{summary.eligible}</span> Eligible
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
          <span className="tabular-nums">{summary.close}</span> Close match
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
          <span className="tabular-nums">{summary.ineligible}</span> Not eligible
        </span>
      </div>

      {/* Filter tabs */}
      <div className="inline-flex rounded-lg bg-secondary p-1">
        {filterTabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setVerdictFilter(key);
              setShowAll(false);
            }}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              verdictFilter === key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {label}
            <span className="ml-1.5 tabular-nums text-muted-foreground">({count})</span>
          </button>
        ))}
      </div>

      {/* University cards */}
      <div className="grid gap-3">
        {visible.map((m) => {
          const uni = universities.find((u) => u.id === m.universityId);
          if (!uni) return null;
          return (
            <Card key={m.universityId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{uni.name}</p>
                <p className="text-sm text-muted-foreground">
                  {uni.course} · {uni.location}
                </p>
                {m.gaps[0] && <p className="mt-1 text-micro text-muted-foreground">{m.gaps[0]}</p>}
              </div>
              <div className="flex items-center gap-3">
                <ScoreMeter score={m.score} verdict={m.verdict} />
                <MatchBadge verdict={m.verdict} />
              </div>
            </Card>
          );
        })}
        {filtered.length > INITIAL_COUNT && !showAll && (
          <Button variant="outline" className="w-full" onClick={() => setShowAll(true)}>
            Show all {filtered.length} universities
          </Button>
        )}
        {showAll && filtered.length > INITIAL_COUNT && (
          <Button variant="ghost" className="w-full" onClick={() => setShowAll(false)}>
            Show less
          </Button>
        )}
        {filtered.length === 0 && (
          <EmptyState
            title={
              verdictFilter === "all"
                ? "No universities configured for this destination."
                : `No ${verdictFilter === "ineligible" ? "ineligible" : verdictFilter} universities found.`
            }
          />
        )}
      </div>
    </div>
  );
}

/* ───────── Receipt HTML builder (Modern College & Payment Format) ───────── */

function escHtml(v: string) {
  return (v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function receiptFilename(student: Student, label: string, ext: string) {
  const slug = (student.name || "Student").replaceAll(/\s+/g, "_");
  return `Payment_Receipt_${label}_${slug}_${student.id}.${ext}`;
}

function generateTransactionRef(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5);
  const suffix = Math.abs(hash).toString(36).padEnd(8, "x").slice(0, 8);
  return `pay_${cleanId || "TWRPP"}${suffix}`;
}

function formatReceiptINR(n: number) {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `₹ ${formatted}`;
}

function formatReceiptDate(d: Date = new Date()) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function buildEligibilityReceiptHtml(
  student: Student,
  universities: University[],
  rows: UniversityMatch[],
  filterLabel: string,
  _orgName?: string,
) {
  const now = new Date();
  const dateStr = formatReceiptDate(now);
  const txRef = generateTransactionRef(student.id || "24HU1A05C6");

  // Determine institution name from student college or fallback to RVIT
  const rawCollege = student.college?.trim();
  const instituteName = (rawCollege && rawCollege !== "—" && rawCollege.length > 2)
    ? (rawCollege.toLowerCase().includes("institute") || rawCollege.toLowerCase().includes("university") || rawCollege.toLowerCase().includes("college")
        ? rawCollege.toUpperCase()
        : `${rawCollege.toUpperCase()} INSTITUTE OF TECHNOLOGY`)
    : "RV INSTITUTE OF TECHNOLOGY";

  const shortInstitute = instituteName.includes("RV")
    ? "RVIT"
    : instituteName.split(" ").map((w) => w[0]).filter(Boolean).join("").slice(0, 6) || "RVIT";

  // Calculate pricing & totals
  const hasCustomFees = rows.some((m) => {
    const u = universities.find((x) => x.id === m.universityId);
    return (u?.applicationFee ?? 0) > 0;
  });

  const totalAmount = rows.length === 0
    ? (student.paidAmount > 0 ? student.paidAmount : 8500)
    : rows.length === 1
      ? (student.paidAmount > 0 ? student.paidAmount : 8500)
      : hasCustomFees
        ? rows.reduce((sum, m) => {
            const u = universities.find((x) => x.id === m.universityId);
            return sum + ((u?.applicationFee ?? 0) > 0 ? (u?.applicationFee ?? 0) : 8500);
          }, 0)
        : (student.paidAmount > 0 ? student.paidAmount : 8500);

  // Build table rows
  let rowsHtml = "";
  if (rows.length === 0) {
    rowsHtml = `<tr>
      <td class="td-desc">
        <div class="item-title">Fee Amount</div>
      </td>
      <td class="td-price">${formatReceiptINR(totalAmount)}</td>
      <td class="td-qty">1</td>
      <td class="td-amount">${formatReceiptINR(totalAmount)}</td>
    </tr>`;
  } else if (rows.length === 1) {
    const uni = universities.find((u) => u.id === rows[0].universityId);
    const statusColor = rows[0].verdict === "eligible" ? "#16a34a" : rows[0].verdict === "close" ? "#d97706" : "#dc2626";
    rowsHtml = `<tr>
      <td class="td-desc">
        <div class="item-title">Fee Amount — ${escHtml(uni?.name ?? "College Application Fee")}</div>
        ${uni ? `<div class="item-sub">${escHtml(uni.course)} · ${escHtml(uni.location)}, ${escHtml(uni.country)}</div>` : ""}
        <div class="item-meta">
          <span style="color:${statusColor};font-weight:600">● ${escHtml(verdictLabel(rows[0].verdict))}</span>
          <span style="color:#94a3b8;margin:0 4px">·</span>
          <span>Match: <strong>${rows[0].score}%</strong></span>
          ${uni?.intake ? `<span style="color:#94a3b8;margin:0 4px">·</span><span>Intake: ${escHtml(uni.intake)}</span>` : ""}
        </div>
      </td>
      <td class="td-price">${formatReceiptINR(totalAmount)}</td>
      <td class="td-qty">1</td>
      <td class="td-amount">${formatReceiptINR(totalAmount)}</td>
    </tr>`;
  } else {
    rowsHtml = rows
      .map((m) => {
        const uni = universities.find((u) => u.id === m.universityId);
        if (!uni) return "";
        const statusColor = m.verdict === "eligible" ? "#16a34a" : m.verdict === "close" ? "#d97706" : "#dc2626";
        const itemPrice = hasCustomFees
          ? ((uni.applicationFee ?? 0) > 0 ? uni.applicationFee : 8500)
          : Math.round(totalAmount / rows.length);
        return `<tr>
          <td class="td-desc">
            <div class="item-title">Fee Amount — ${escHtml(uni.name)}</div>
            <div class="item-sub">${escHtml(uni.course)} · ${escHtml(uni.location)}, ${escHtml(uni.country)}</div>
            <div class="item-meta">
              <span style="color:${statusColor};font-weight:600">● ${escHtml(verdictLabel(m.verdict))}</span>
              <span style="color:#94a3b8;margin:0 4px">·</span>
              <span>Match: <strong>${m.score}%</strong></span>
              <span style="color:#94a3b8;margin:0 4px">·</span>
              <span>Intake: ${escHtml(uni.intake)}</span>
            </div>
          </td>
          <td class="td-price">${formatReceiptINR(itemPrice)}</td>
          <td class="td-qty">1</td>
          <td class="td-amount">${formatReceiptINR(itemPrice)}</td>
        </tr>`;
      })
      .join("");
  }

  const studentEmail = student.email || "hcskolluru@gmail.com";
  const studentPhone = student.phone1 || "+916305781406";
  const hallTicket = student.id || "24HU1A05C6";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Payment Receipt — ${escHtml(student.name)} (${escHtml(hallTicket)})</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background: #f8fafc;
      font-size: 13.5px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .page-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px 50px 36px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm 15mm 12mm 15mm;
      }
      body {
        background: #ffffff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-container {
        padding: 0 !important;
        max-width: 100% !important;
        min-height: 98vh;
        box-shadow: none !important;
      }
    }

    /* Header */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 34px;
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-name {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: 0.03em;
      color: #0f172a;
      text-transform: uppercase;
    }
    .bank-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .bank-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 3px;
    }
    .collect-tag {
      background: #ef4444;
      color: #ffffff;
      font-size: 8px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 3px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .bank-text {
      font-size: 10px;
      line-height: 1.35;
      color: #64748b;
      text-align: right;
    }

    /* Title Block */
    .title-block {
      margin-bottom: 26px;
    }
    .title-line {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 12px;
    }
    .receipt-title {
      font-size: 21px;
      font-weight: 700;
      color: #0f172a;
    }
    .tx-ref-wrap {
      font-size: 13px;
      color: #64748b;
      font-weight: 400;
    }
    .tx-code {
      font-weight: 500;
      color: #334155;
    }
    .receipt-sub {
      font-size: 13.5px;
      color: #475569;
      margin-top: 5px;
    }

    /* Amount Hero */
    .amount-hero {
      display: flex;
      align-items: baseline;
      gap: 16px;
      margin-bottom: 32px;
    }
    .amount-label {
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: #475569;
      text-transform: uppercase;
    }
    .amount-val {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    /* Meta Grid */
    .meta-grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 36px;
    }
    .meta-left {
      flex: 1;
    }
    .meta-right {
      width: 220px;
      text-align: left;
    }
    .meta-head {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .meta-subhead {
      font-size: 11.5px;
      font-weight: 500;
      color: #64748b;
      margin-bottom: 5px;
    }
    .meta-text {
      font-size: 13.5px;
      color: #0f172a;
      line-height: 1.4;
    }
    .meta-spacer {
      height: 18px;
    }

    /* Table */
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .receipt-table thead tr {
      background: #f1f5f9;
      border-radius: 4px;
    }
    .receipt-table th {
      padding: 9px 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #64748b;
      text-transform: uppercase;
      border: none;
    }
    .th-desc { text-align: left; }
    .th-price { text-align: right; width: 120px; }
    .th-qty { text-align: center; width: 60px; }
    .th-amount { text-align: right; width: 130px; }

    .receipt-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }
    .receipt-table tbody tr:last-child {
      border-bottom: none;
    }
    .receipt-table td {
      padding: 14px 14px;
      font-size: 13.5px;
      color: #0f172a;
      vertical-align: top;
    }
    .td-desc { text-align: left; }
    .td-price { text-align: right; }
    .td-qty { text-align: center; }
    .td-amount { text-align: right; font-weight: 500; }

    .item-title {
      font-weight: 600;
      color: #0f172a;
      font-size: 13.5px;
    }
    .item-sub {
      color: #64748b;
      font-size: 12px;
      margin-top: 2px;
    }
    .item-meta {
      font-size: 11px;
      margin-top: 3px;
      color: #475569;
    }

    /* Totals */
    .totals-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      margin-top: 12px;
      padding-right: 14px;
    }
    .total-row-item, .paid-row-item {
      display: flex;
      justify-content: flex-end;
      width: 320px;
      gap: 36px;
    }
    .total-title {
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .total-figure {
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
      min-width: 110px;
      text-align: right;
    }
    .paid-title {
      font-size: 14px;
      font-weight: 600;
      color: #10b981;
    }
    .paid-figure {
      font-size: 14px;
      font-weight: 600;
      color: #10b981;
      min-width: 110px;
      text-align: right;
    }

    /* Footer */
    .footer-wrap {
      text-align: center;
      font-size: 11.5px;
      color: #94a3b8;
      margin-top: auto;
      padding-top: 60px;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div>
      <!-- TOP HEADER -->
      <div class="header-row">
        <div class="brand-wrap">
          <svg width="40" height="44" viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="crestGrad" x1="0" y1="0" x2="40" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#1e293b"/>
                <stop offset="100%" stop-color="#0f172a"/>
              </linearGradient>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="40" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#fbbf24"/>
                <stop offset="100%" stop-color="#d97706"/>
              </linearGradient>
            </defs>
            <path d="M20 2L4 7V19C4 30.5 11 38.5 20 42C29 38.5 36 30.5 36 19V7L20 2Z" fill="url(#crestGrad)" stroke="url(#goldGrad)" stroke-width="1.5"/>
            <path d="M20 5L7 9V19C7 28.5 12.5 35.5 20 38.5C27.5 35.5 33 28.5 33 19V9L20 5Z" fill="#0f172a" stroke="#d97706" stroke-width="0.75" opacity="0.9"/>
            <path d="M20 11L11 15L20 19L29 15L20 11Z" fill="url(#goldGrad)"/>
            <path d="M14 17V21.5C14 23.5 16.5 25 20 25C23.5 25 26 23.5 26 21.5V17" stroke="url(#goldGrad)" stroke-width="1.2" fill="none"/>
            <path d="M28 16V22" stroke="url(#goldGrad)" stroke-width="1"/>
            <circle cx="28" cy="22.5" r="1" fill="#fbbf24"/>
            <path d="M13 28C15.5 27 18 27.5 20 29C22 27.5 24.5 27 27 28V33C24.5 32 22 32.5 20 34C18 32.5 15.5 32 13 33V28Z" fill="#ffffff" opacity="0.95"/>
            <line x1="20" y1="29" x2="20" y2="34" stroke="#0f172a" stroke-width="1"/>
            <path d="M8 22C8 28 12 33 16 35" stroke="url(#goldGrad)" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.7"/>
            <path d="M32 22C32 28 28 33 24 35" stroke="url(#goldGrad)" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.7"/>
          </svg>
          <div class="brand-name">${escHtml(instituteName)}</div>
        </div>

        <div class="bank-wrap">
          <div class="bank-badge">
            <svg width="68" height="16" viewBox="0 0 68 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="16" height="16" rx="2" fill="#004c8f"/>
              <rect x="2.5" y="2.5" width="11" height="11" fill="#ed232a"/>
              <rect x="5.5" y="5.5" width="5" height="5" fill="#ffffff"/>
              <rect x="7" y="7" width="2" height="2" fill="#004c8f"/>
              <text x="20" y="12" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="8.5" font-weight="800" fill="#004c8f" letter-spacing="0.02em">HDFC BANK</text>
            </svg>
            <span class="collect-tag">Collect Now</span>
          </div>
          <div class="bank-text">
            Invoicing and payments<br/>powered by HDFC Bank Ltd
          </div>
        </div>
      </div>

      <!-- TITLE SECTION -->
      <div class="title-block">
        <div class="title-line">
          <h1 class="receipt-title">Payment Receipt</h1>
          <span class="tx-ref-wrap">Transaction Reference: <strong class="tx-code">${escHtml(txRef)}</strong></span>
        </div>
        <div class="receipt-sub">This is a payment receipt for your transaction on ${escHtml(shortInstitute)} College Fee Payment</div>
      </div>

      <!-- AMOUNT PAID HERO -->
      <div class="amount-hero">
        <span class="amount-label">AMOUNT PAID</span>
        <span class="amount-val">${formatReceiptINR(totalAmount)}</span>
      </div>

      <!-- METADATA GRID -->
      <div class="meta-grid">
        <div class="meta-left">
          <div class="meta-head">ISSUED TO</div>
          <div class="meta-text">${escHtml(studentEmail)}</div>
          <div class="meta-text">${escHtml(studentPhone)}</div>
          <div class="meta-spacer"></div>
          <div class="meta-subhead">Hall Ticket Number</div>
          <div class="meta-text" style="font-weight: 600;">${escHtml(hallTicket)}</div>
        </div>
        <div class="meta-right">
          <div class="meta-head">PAID ON</div>
          <div class="meta-text">${escHtml(dateStr)}</div>
        </div>
      </div>

      <!-- TABLE -->
      <table class="receipt-table">
        <thead>
          <tr>
            <th class="th-desc">DESCRIPTION</th>
            <th class="th-price">UNIT PRICE</th>
            <th class="th-qty">QTY</th>
            <th class="th-amount">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- TOTALS -->
      <div class="totals-wrap">
        <div class="total-row-item">
          <span class="total-title">Total</span>
          <span class="total-figure">${formatReceiptINR(totalAmount)}</span>
        </div>
        <div class="paid-row-item">
          <span class="paid-title">Amount Paid</span>
          <span class="paid-figure">${formatReceiptINR(totalAmount)}</span>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer-wrap">
      Page 1 of 1
    </div>
  </div>
</body>
</html>`;
}


