import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CreditCard,
  GraduationCap,
  MoreHorizontal,
  Pencil,
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
import { matchAllUniversities, summarizeMatches } from "@/lib/eligibility";
import { formatINR, formatShortDate, relativeTime } from "@/lib/format";
import { toast } from "sonner";

export function StudentDetailPage({ studentId }: { studentId: string }) {
  const students = useAppStore((s) => s.students);
  const student = students.find((s) => s.id === studentId);
  const applications = useAppStore((s) => s.applications).filter((a) => a.studentId === studentId);
  const documents = useAppStore((s) => s.documents).filter((d) => d.studentId === studentId);
  const payments = useAppStore((s) => s.payments).filter((p) => p.studentId === studentId);
  const audit = useAppStore((s) => s.auditEvents).filter((e) => e.recordId === studentId);
  const universities = useAppStore((s) => s.universities);
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" /> Payment summary
              </CardTitle>
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
  const pool = universities.filter((u) => !u.archived && u.country === student.country);
  const matches = matchAllUniversities(student, pool);
  const summary = summarizeMatches(matches);
  const top = matches.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Eligibility for {student.country}</p>
          <p className="text-sm text-muted-foreground">
            {summary.eligible} eligible · {summary.close} close · {summary.ineligible} not eligible
          </p>
        </div>
        <Button variant="outline" onClick={onOpenTool}>
          <GraduationCap className="size-4" /> Open eligibility tool
        </Button>
      </div>
      <div className="grid gap-3">
        {top.map((m) => {
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
        {top.length === 0 && <EmptyState title="No universities configured for this destination." />}
      </div>
    </div>
  );
}
