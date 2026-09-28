import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { PortalShareDrawer } from "@/components/documents/portal-share-drawer";
import { useAppStore } from "@/lib/store";
import { useWorkspace } from "@/lib/workspace";
import { COUNTRY_DOCUMENT_RULES, categoryForType } from "@/lib/documents";
import {
  APPLICATION_STATUSES,
  BRANCHES,
  GERMAN_LEVELS,
  INTAKES,
  type ApplicationStatus,
  type Country,
  type Intake,
  type LeadType,
  type Student,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = ["Personal", "Academic", "Account", "Application", "Payment", "Documents", "Review"] as const;
const DRAFT_KEY = "meridian-student-editor-draft";

type Draft = Omit<Student, "createdAt" | "updatedAt" | "avatarHue" | "paymentStatus">;

function emptyDraft(employeeId: string, intake: Intake): Draft {
  return {
    id: "",
    name: "",
    email: "",
    phone1: "",
    phone2: "",
    country: "Germany",
    intake,
    branch: "Computer Science",
    college: "",
    employeeId,
    status: "Shortlisting Sent",
    cgpa: 0,
    germanLanguage: "None",
    gmailId: "",
    gmailPassword: "",
    recoveryNumber: "",
    device: "",
    twoStep: false,
    uniAssistDocuments: "Not Uploaded",
    blockedAccount: "Not Applied",
    enrollment: "Not Applied",
    studentDorm: "Not Applied",
    totalFee: 100000,
    paidAmount: 0,
    discount: 0,
    leadType: "Direct",
    notes: "",
  };
}

export function StudentFormPage({ studentId }: { studentId?: string }) {
  const existing = useAppStore((s) => s.students.find((st) => st.id === studentId));
  const employees = useAppStore((s) => s.employees);
  const currentUser = useAppStore((s) => s.currentUser);
  const settings = useAppStore((s) => s.settings);
  const createStudent = useAppStore((s) => s.createStudent);
  const updateStudent = useAppStore((s) => s.updateStudent);
  const { base, role } = useWorkspace();
  const navigate = useNavigate();
  const defaultEmp = role === "employee" ? currentUser?.id ?? "" : employees.find((e) => e.role === "employee")?.id ?? "";
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? {
          ...existing,
        }
      : emptyDraft(defaultEmp, settings.defaultIntake),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [portalStudent, setPortalStudent] = useState<Student | null>(null);
  const [savedId, setSavedId] = useState<string | undefined>(studentId);
  const lastSaved = useRef(JSON.stringify(draft));
  const createPortal = useAppStore((s) => s.createPortal);
  const seedDocs = useAppStore((s) => s.seedStudentDocuments);
  const liveStudent = useAppStore((s) => s.students.find((st) => st.id === (existing?.id ?? savedId)));
  const blocker = useBlocker({
    shouldBlockFn: () => JSON.stringify(draft) !== lastSaved.current,
    withResolver: true,
    enableBeforeUnload: true,
  });

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setSaveState("unsaved");
  };

  useEffect(() => {
    if (existing) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Draft;
      if (parsed?.name !== undefined) {
        setDraft((d) => ({ ...d, ...parsed }));
        lastSaved.current = JSON.stringify({ ...emptyDraft(defaultEmp, settings.defaultIntake), ...parsed });
        setSaveState("saved");
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveDraft();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (blocker.status === "blocked") setLeaveOpen(true);
  }, [blocker.status]);

  useEffect(() => {
    if (step !== 5) return;
    if (existing || savedId) return;
    if (!draft.name.trim() || !draft.phone1.trim() || !draft.college.trim() || !draft.cgpa || draft.totalFee <= 0) {
      return;
    }
    persistStudent();
    // Persist once when entering Documents so the workspace can attach to a saved student.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const germany = draft.country === "Germany";

  function validate(at = step) {
    const e: Record<string, string> = {};
    if (at === 0) {
      if (!draft.name.trim()) e.name = "Name is required";
      if (!draft.phone1.trim()) e.phone1 = "Phone is required";
      if (!draft.college.trim()) e.college = "College is required";
    }
    if (at === 1 && (!draft.cgpa || draft.cgpa < 0)) e.cgpa = "Enter CGPA";
    if (at === 4 && draft.totalFee <= 0) e.totalFee = "Enter a fee";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate()) return;
    if (step === 4 || step === 5) {
      if (!validate(0) || !validate(1) || !validate(4)) {
        setStep(0);
        return;
      }
      persistStudent();
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function persistLocal() {
    if (existing) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function saveDraft() {
    setSaveState("saving");
    persistLocal();
    if (existing) {
      updateStudent(existing.id, draft);
    }
    lastSaved.current = JSON.stringify(draft);
    window.setTimeout(() => setSaveState("saved"), 280);
    toast.success("Draft saved");
  }

  function persistStudent() {
    if (existing || savedId) {
      const id = existing?.id ?? savedId!;
      updateStudent(id, draft);
      seedDocs(id);
      lastSaved.current = JSON.stringify(draft);
      setSaveState("saved");
      return useAppStore.getState().students.find((s) => s.id === id)!;
    }
    const created = createStudent(draft);
    setSavedId(created.id);
    lastSaved.current = JSON.stringify(draft);
    setSaveState("saved");
    localStorage.removeItem(DRAFT_KEY);
    return created;
  }

  function save() {
    if (!validate(0) || !validate(1) || !validate(4)) {
      setStep(0);
      return;
    }
    const created = persistStudent();
    lastSaved.current = JSON.stringify(draft);
    toast.success(existing ? "Student updated" : "Student created successfully");
    void navigate({ to: `${base}/students/${created.id}` });
  }

  function saveAndPortal() {
    if (!validate(0) || !validate(1) || !validate(4)) {
      setStep(0);
      return;
    }
    const created = persistStudent();
    createPortal({
      studentId: created.id,
      accessMethod: "email_and_link",
      email: created.email || created.gmailId,
    });
    setPortalStudent(created);
    toast.success("Portal created");
  }

  const counselors = useMemo(
    () => employees.filter((e) => e.role === "employee" && e.status === "Active"),
    [employees],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={existing ? `Edit ${existing.name}` : "Add student"}
        description="Capture personal, academic and application details."
      />
      <p className="text-micro text-muted-foreground" aria-live="polite">
        {saveState === "saving" && "Saving…"}
        {saveState === "saved" && "Saved just now"}
        {saveState === "unsaved" && "Unsaved changes"}
      </p>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => {
                if (i >= 5 && !existing && !savedId) {
                  if (!validate(0) || !validate(1) || !validate(4)) return;
                  persistStudent();
                }
                setStep(i);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                i === step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              {String(i + 1).padStart(2, "0")} {label}
            </button>
          </li>
        ))}
      </ol>

      <Card className="p-5">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Student ID" hint="Leave blank to auto-generate (W26_001)">
              <Input value={draft.id} onChange={(e) => patch({ id: e.target.value })} placeholder="W26_001" />
            </FormField>
            <FormField label="Intake" required>
              <Select value={draft.intake} onValueChange={(v) => patch({ intake: v as Intake })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTAKES.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Country" required>
              <Select value={draft.country} onValueChange={(v) => patch({ country: v as Country })}>
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
            <FormField label="Name" required error={errors.name}>
              <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
            </FormField>
            <FormField label="Phone 1" required error={errors.phone1}>
              <Input value={draft.phone1} onChange={(e) => patch({ phone1: e.target.value })} />
            </FormField>
            <FormField label="Phone 2">
              <Input value={draft.phone2} onChange={(e) => patch({ phone2: e.target.value })} />
            </FormField>
            <FormField label="Branch">
              <Select value={draft.branch} onValueChange={(v) => patch({ branch: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="College / University" required error={errors.college}>
              <Input value={draft.college} onChange={(e) => patch({ college: e.target.value })} />
            </FormField>
            {role === "admin" && (
              <FormField label="Assigned employee">
                <Select value={draft.employeeId} onValueChange={(v) => patch({ employeeId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {counselors.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="CGPA" required error={errors.cgpa}>
              <Input
                type="number"
                step="0.01"
                value={draft.cgpa || ""}
                onChange={(e) => patch({ cgpa: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="IELTS">
              <Input
                type="number"
                step="0.5"
                value={draft.ielts ?? ""}
                onChange={(e) => patch({ ielts: e.target.value ? Number(e.target.value) : undefined })}
              />
            </FormField>
            {(draft.country === "USA" || draft.country === "UK") && (
              <FormField label="TOEFL">
                <Input
                  type="number"
                  value={draft.toefl ?? ""}
                  onChange={(e) => patch({ toefl: e.target.value ? Number(e.target.value) : undefined })}
                />
              </FormField>
            )}
            <FormField label="Duolingo">
              <Input
                type="number"
                value={draft.duolingo ?? ""}
                onChange={(e) => patch({ duolingo: e.target.value ? Number(e.target.value) : undefined })}
              />
            </FormField>
            {germany && (
              <FormField label="German grade">
                <Input
                  type="number"
                  step="0.1"
                  value={draft.germanGrade ?? ""}
                  onChange={(e) => patch({ germanGrade: e.target.value ? Number(e.target.value) : undefined })}
                />
              </FormField>
            )}
            {draft.country === "USA" && (
              <FormField label="GRE">
                <Input
                  type="number"
                  value={draft.gre ?? ""}
                  onChange={(e) => patch({ gre: e.target.value ? Number(e.target.value) : undefined })}
                />
              </FormField>
            )}
            <FormField label="German language">
              <Select value={draft.germanLanguage} onValueChange={(v) => patch({ germanLanguage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GERMAN_LEVELS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              Sensitive information. Handle account credentials carefully. This is a frontend prototype and does
              not provide production-grade credential security.
            </p>
            <FormField label="Gmail ID">
              <Input value={draft.gmailId} onChange={(e) => patch({ gmailId: e.target.value, email: e.target.value })} />
            </FormField>
            <PasswordField label="Gmail password" value={draft.gmailPassword} onChange={(v) => patch({ gmailPassword: v })} />
            <FormField label="Recovery number">
              <Input value={draft.recoveryNumber} onChange={(e) => patch({ recoveryNumber: e.target.value })} />
            </FormField>
            <FormField label="Device">
              <Input value={draft.device} onChange={(e) => patch({ device: e.target.value })} />
            </FormField>
            <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              2-step verification
              <Switch checked={draft.twoStep} onCheckedChange={(v) => patch({ twoStep: !!v })} />
            </label>
            {germany && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="APS username">
                  <Input value={draft.apsUsername ?? ""} onChange={(e) => patch({ apsUsername: e.target.value })} />
                </FormField>
                <PasswordField
                  label="APS password"
                  value={draft.apsPassword ?? ""}
                  onChange={(v) => patch({ apsPassword: v })}
                />
                <FormField label="Uni-Assist ID">
                  <Input value={draft.uniAssistId ?? ""} onChange={(e) => patch({ uniAssistId: e.target.value })} />
                </FormField>
                <PasswordField
                  label="Uni-Assist password"
                  value={draft.uniAssistPassword ?? ""}
                  onChange={(v) => patch({ uniAssistPassword: v })}
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Application status">
              <Select value={draft.status} onValueChange={(v) => patch({ status: v as ApplicationStatus })}>
                <SelectTrigger>
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
            </FormField>
            <FormField label="Lead type">
              <Select value={draft.leadType} onValueChange={(v) => patch({ leadType: v as LeadType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="B2B">B2B</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            {draft.leadType === "B2B" && (
              <FormField label="B2B organization">
                <Input value={draft.b2bOrg ?? ""} onChange={(e) => patch({ b2bOrg: e.target.value })} />
              </FormField>
            )}
            {germany && (
              <>
                <FormField label="Uni-Assist documents">
                  <Select
                    value={draft.uniAssistDocuments ?? "Not Uploaded"}
                    onValueChange={(v) => patch({ uniAssistDocuments: v as "Uploaded" | "Not Uploaded" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Uploaded">Uploaded</SelectItem>
                      <SelectItem value="Not Uploaded">Not Uploaded</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Blocked account">
                  <Select
                    value={draft.blockedAccount ?? "Not Applied"}
                    onValueChange={(v) => patch({ blockedAccount: v as "Applied" | "Not Applied" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Applied">Applied</SelectItem>
                      <SelectItem value="Not Applied">Not Applied</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Enrollment">
                  <Select
                    value={draft.enrollment ?? "Not Applied"}
                    onValueChange={(v) => patch({ enrollment: v as "Applied" | "Not Applied" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Applied">Applied</SelectItem>
                      <SelectItem value="Not Applied">Not Applied</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Student dorm">
                  <Select
                    value={draft.studentDorm ?? "Not Applied"}
                    onValueChange={(v) => patch({ studentDorm: v as "Applied" | "Not Applied" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Applied">Applied</SelectItem>
                      <SelectItem value="Not Applied">Not Applied</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Total fee (₹)" required error={errors.totalFee}>
              <Input
                type="number"
                value={draft.totalFee}
                onChange={(e) => patch({ totalFee: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Initial payment (₹)">
              <Input
                type="number"
                value={draft.paidAmount}
                onChange={(e) => patch({ paidAmount: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Discount (₹)">
              <Input
                type="number"
                value={draft.discount}
                onChange={(e) => patch({ discount: Number(e.target.value) })}
              />
            </FormField>
          </div>
        )}

        {step === 5 && (
          <DocumentsStep
            draft={draft}
            student={existing ?? liveStudent}
            onUploadPortal={() => saveAndPortal()}
          />
        )}

        {step === 6 && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Name", draft.name],
              ["Intake", draft.intake],
              ["Country", draft.country],
              ["College", draft.college],
              ["Status", draft.status],
              ["Fee", `₹${draft.totalFee.toLocaleString("en-IN")}`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-2">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveDraft}>
              Save draft
            </Button>
            {step === 5 && (
              <Button variant="outline" onClick={saveAndPortal}>
                Save & create upload portal
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>{step === 5 ? "Save & continue" : "Continue"}</Button>
            ) : (
              <Button onClick={save}>{existing ? "Save changes" : "Create student"}</Button>
            )}
          </div>
        </div>
      </Card>
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={(v) => {
          setLeaveOpen(v);
          if (!v && blocker.status === "blocked") blocker.reset();
        }}
        title="You have unsaved changes."
        description="Leave this student without saving?"
        confirmLabel="Leave without saving"
        cancelLabel="Stay"
        destructive
        onConfirm={() => {
          lastSaved.current = JSON.stringify(draft);
          setLeaveOpen(false);
          if (blocker.status === "blocked") blocker.proceed();
          else void navigate({ to: `${base}/students` });
        }}
      />
      {portalStudent && (
        <PortalShareDrawer
          open={!!portalStudent}
          onOpenChange={(v) => {
            if (!v) {
              const id = portalStudent.id;
              setPortalStudent(null);
              void navigate({ to: `${base}/students/${id}` });
            }
          }}
          student={portalStudent}
          startCreated
        />
      )}
    </div>
  );
}

function DocumentsStep({
  draft,
  student,
  onUploadPortal,
}: {
  draft: Draft;
  student?: Student;
  onUploadPortal: () => void;
}) {
  const rules = COUNTRY_DOCUMENT_RULES[draft.country];
  if (student) {
    return (
      <div className="-mx-1">
        <DocumentWorkspace student={student} compactHeader showPortalBanner onCreatePortal={onUploadPortal} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Documents</h2>
        <p className="text-sm text-muted-foreground">Upload, manage and collect documents for this student.</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Requirements below are configured for {draft.country}. They are business rules for this destination, not universal
        requirements. Saving this student creates the checklist. Use Save & create upload portal to generate a student
        link.
      </p>
      <ul className="divide-y rounded-xl border">
        {rules.map((rule) => (
          <li key={rule.type} className="flex items-center justify-between px-3 py-2.5 text-sm">
            <span>
              <span className="font-medium">{rule.type}</span>
              <span className="ml-2 text-micro text-muted-foreground">{categoryForType(rule.type)}</span>
            </span>
            <span className="text-micro text-muted-foreground">{rule.required ? "Required" : "Optional"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
