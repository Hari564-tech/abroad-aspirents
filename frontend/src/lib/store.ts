import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSeed } from "@/lib/mock-data";
import { copyFileData, removeFileData, setFileData } from "@/lib/file-cache";
import {
  buildRequirementDocs,
  categoryForType,
  DEFAULT_PORTAL_PERMISSIONS,
  documentStats,
  generatePortalToken,
} from "@/lib/documents";
import type {
  Application,
  ApplicationStatus,
  AppNotification,
  AuditAction,
  AuditEvent,
  AuditSeverity,
  DocumentActivity,
  DocumentVersion,
  Lead,
  OrgSettings,
  PaymentRecord,
  PaymentStatus,
  PortalAccessLog,
  PortalAccessMethod,
  PortalPermissions,
  Student,
  StudentDocument,
  StudentDocumentPortal,
  ThemeMode,
  University,
  UniversityShortlist,
  User,
  WorkItem,
} from "@/lib/types";

const seed = createSeed();

function uid(prefix: string) {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

function nextStudentId(students: Student[], intake: string) {
  const prefix = intake.startsWith("Winter")
    ? `W${intake.slice(-2)}`
    : intake.startsWith("Summer")
      ? `S${intake.slice(-2)}`
      : intake.startsWith("January")
        ? "JAN"
        : `SP${intake.slice(-2)}`;
  const nums = students
    .filter((s) => s.id.startsWith(prefix + "_"))
    .map((s) => Number(s.id.split("_")[1]))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}_${String(next).padStart(3, "0")}`;
}

export interface UploadDocumentInput {
  studentId: string;
  type: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  dataUrl?: string;
  replaceExistingId?: string;
  asNewVersionOf?: string;
  actorName?: string;
  actorRole?: "admin" | "employee" | "student";
  studentInstruction?: string;
  internalNote?: string;
  dueDate?: string;
  universityId?: string;
  universityName?: string;
  course?: string;
  required?: boolean;
  fromStudent?: boolean;
  forceNew?: boolean;
}

export interface AppStore {
  hydrated: boolean;
  currentUser: User | null;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  students: Student[];
  employees: User[];
  universities: University[];
  applications: Application[];
  payments: PaymentRecord[];
  leads: Lead[];
  documents: StudentDocument[];
  documentVersions: DocumentVersion[];
  documentActivities: DocumentActivity[];
  portals: StudentDocumentPortal[];
  portalAccessLogs: PortalAccessLog[];
  workItems: WorkItem[];
  shortlists: UniversityShortlist[];
  auditEvents: AuditEvent[];
  notifications: AppNotification[];
  settings: OrgSettings;
  setHydrated: (v: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setSidebarCollapsed: (v: boolean) => void;
  login: (email: string, _password: string) => { ok: true; user: User } | { ok: false; error: string };
  logout: () => void;
  appendAudit: (
    partial: Omit<AuditEvent, "id" | "timestamp" | "user" | "userId" | "role" | "ip" | "userAgent"> & {
      severity?: AuditSeverity;
      user?: string;
      userId?: string;
      role?: AuditEvent["role"];
    },
  ) => void;
  createStudent: (
    data: Omit<Student, "id" | "createdAt" | "updatedAt" | "avatarHue" | "paymentStatus"> & { id?: string },
  ) => Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  changeStudentStatus: (id: string, status: ApplicationStatus) => void;
  assignEmployee: (studentId: string, employeeId: string) => void;
  updatePayment: (studentId: string, patch: Partial<PaymentRecord> & { paidAmount?: number }) => void;
  upsertUniversity: (data: University) => void;
  archiveUniversity: (id: string) => void;
  duplicateUniversity: (id: string) => University | null;
  deleteUniversity: (id: string) => void;
  toggleShortlist: (studentId: string, universityId: string) => void;
  setShortlist: (studentId: string, universityIds: string[]) => void;
  setShortlistMessage: (studentId: string, studentMessage: string) => void;
  clearShortlist: (studentId: string) => void;
  createApplicationsFromShortlist: (
    studentId: string,
    universityIds: string[],
  ) => { created: number; skipped: number };
  upsertLead: (data: Lead) => void;
  deleteLead: (id: string) => void;
  upsertApplication: (data: Application) => void;
  updateEmployee: (id: string, patch: Partial<User>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addDocument: (doc: Omit<StudentDocument, "id">) => StudentDocument;
  uploadDocumentFile: (
    input: UploadDocumentInput,
  ) => { ok: true; document: StudentDocument } | { ok: false; error: string; existing?: StudentDocument };
  verifyDocument: (id: string) => void;
  rejectDocument: (id: string, reason: string, note?: string) => void;
  requestReplacement: (id: string, reason: string, message: string, dueDate?: string) => void;
  requestDocument: (input: {
    studentId: string;
    type: string;
    required: boolean;
    priority?: StudentDocument["priority"];
    dueDate?: string;
    studentInstruction?: string;
    universityId?: string;
    universityName?: string;
    course?: string;
  }) => StudentDocument;
  updateDocumentMeta: (id: string, patch: Partial<StudentDocument>) => void;
  deleteDocuments: (ids: string[]) => void;
  recordDocumentView: (id: string) => void;
  recordDocumentDownload: (id: string) => void;
  seedStudentDocuments: (studentId: string) => void;
  createPortal: (input: {
    studentId: string;
    accessMethod: PortalAccessMethod;
    email?: string;
    expiresAt?: string;
    permissions?: PortalPermissions;
  }) => StudentDocumentPortal;
  updatePortal: (id: string, patch: Partial<StudentDocumentPortal>) => void;
  revokePortal: (id: string) => void;
  regeneratePortal: (id: string) => StudentDocumentPortal | null;
  logPortalAccess: (portalId: string, action: string, actor?: string) => void;
  touchPortalAccess: (token: string) => void;
  updateWorkItem: (id: string, patch: Partial<WorkItem>) => void;
  updateSettings: (patch: Partial<OrgSettings>) => void;
  resetDemo: () => void;
}

function actorSnapshot(state: { currentUser: User | null }) {
  const user = state.currentUser;
  return {
    user: user?.name ?? "System",
    userId: user?.id ?? "system",
    role: (user?.role ?? "admin") as AuditEvent["role"],
    ip: "192.168.14.22",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 48) : "Meridian Web",
  };
}

function makeAudit(
  state: { currentUser: User | null },
  partial: Omit<AuditEvent, "id" | "timestamp" | "user" | "userId" | "role" | "ip" | "userAgent"> & {
    severity?: AuditSeverity;
    user?: string;
    userId?: string;
    role?: AuditEvent["role"];
  },
): AuditEvent {
  const { severity, user, userId, role, ...rest } = partial;
  const snap = actorSnapshot(state);
  return {
    id: uid("AUD"),
    timestamp: new Date().toISOString(),
    ...snap,
    ...rest,
    user: user ?? snap.user,
    userId: userId ?? snap.userId,
    role: role ?? snap.role,
    severity: severity ?? "INFO",
  };
}

function notice(
  title: string,
  body: string,
  href: string,
  kind: AppNotification["kind"] = "document",
): AppNotification {
  return {
    id: uid("NT"),
    title,
    body,
    timestamp: new Date().toISOString(),
    read: false,
    href,
    kind,
  };
}

function workspaceHref(state: { currentUser: User | null }, studentId: string) {
  return `/${state.currentUser?.role === "employee" ? "employee" : "admin"}/students/${studentId}`;
}

function activity(
  documentId: string,
  studentId: string,
  actor: string,
  actorRole: DocumentActivity["actorRole"],
  action: string,
  detail?: string,
): DocumentActivity {
  return {
    id: uid("DA"),
    documentId,
    studentId,
    actor,
    actorRole,
    action,
    detail,
    timestamp: new Date().toISOString(),
  };
}

function touchShortlist(
  list: UniversityShortlist[],
  studentId: string,
  mutator: (entry: UniversityShortlist) => UniversityShortlist,
): UniversityShortlist[] {
  const now = new Date().toISOString();
  const existing = list.find((s) => s.studentId === studentId);
  if (!existing) {
    return [
      mutator({
        studentId,
        universityIds: [],
        studentMessage: "",
        createdAt: now,
        updatedAt: now,
      }),
      ...list,
    ];
  }
  return list.map((s) => (s.studentId === studentId ? { ...mutator(s), updatedAt: now } : s));
}

function extrasForStudent(s: { applications: Application[]; universities: University[] }, studentId: string) {
  return s.applications
    .filter((a) => a.studentId === studentId)
    .slice(0, 1)
    .map((a) => {
      const uni = s.universities.find((u) => u.id === a.universityId);
      return uni
        ? { type: "SOP", required: true, universityId: uni.id, universityName: uni.name, course: uni.course }
        : undefined;
    })
    .filter(Boolean) as Array<{ type: string; required: boolean; universityId: string; universityName: string; course: string }>;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      currentUser: null,
      theme: "system",
      sidebarCollapsed: false,
      students: seed.students,
      employees: seed.employees,
      universities: seed.universities,
      applications: seed.applications,
      payments: seed.payments,
      leads: seed.leads,
      documents: seed.documents,
      documentVersions: seed.documentVersions,
      documentActivities: seed.documentActivities,
      portals: seed.portals,
      portalAccessLogs: seed.portalAccessLogs,
      workItems: seed.workItems,
      shortlists: [],
      auditEvents: seed.auditEvents,
      notifications: seed.notifications,
      settings: seed.settings,
      setHydrated: (v) => set({ hydrated: v }),
      setTheme: (theme) => set({ theme }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      login: (email, _password) => {
        const normalized = email.trim().toLowerCase();
        const user = get().employees.find((e) => e.email.toLowerCase() === normalized);
        if (!user) return { ok: false, error: "We couldn't find a workspace for that email." };
        if (user.status === "Inactive") return { ok: false, error: "This account is inactive." };
        set((s) => ({
          currentUser: user,
          auditEvents: [
            makeAudit(s, {
              action: "LOGIN",
              module: "Auth",
              recordId: user.id,
              details: `${user.name} signed in`,
              severity: "INFO",
            }),
            ...s.auditEvents,
          ],
        }));
        return { ok: true, user };
      },
      logout: () => {
        const user = get().currentUser;
        set((s) => ({
          currentUser: null,
          auditEvents: user
            ? [
                makeAudit(
                  { currentUser: user },
                  {
                    action: "LOGOUT",
                    module: "Auth",
                    recordId: user.id,
                    details: `${user.name} signed out`,
                    severity: "INFO",
                  },
                ),
                ...s.auditEvents,
              ]
            : s.auditEvents,
        }));
      },
      appendAudit: (partial) => set((s) => ({ auditEvents: [makeAudit(s, partial), ...s.auditEvents] })),
      createStudent: (data) => {
        const id = data.id?.trim() || nextStudentId(get().students, data.intake);
        const now = new Date().toISOString();
        const paymentStatus: PaymentStatus =
          (data.paidAmount ?? 0) >= data.totalFee - (data.discount ?? 0)
            ? "Paid"
            : (data.paidAmount ?? 0) > 0
              ? "Partially Paid"
              : "Pending";
        const student: Student = {
          ...data,
          id,
          createdAt: now,
          updatedAt: now,
          avatarHue: Math.floor(Math.random() * 360),
          paymentStatus,
          phone2: data.phone2 ?? "",
          notes: data.notes ?? "",
        };
        const extras = extrasForStudent(get(), id);
        const seeded = buildRequirementDocs(student, extras, now).map((d) => ({ ...d, id: uid("DOC") }));
        set((s) => ({
          students: [student, ...s.students],
          documents: [...seeded, ...s.documents],
          payments: [
            {
              id: uid("PAY"),
              studentId: id,
              totalFee: student.totalFee,
              initialPayment: student.paidAmount,
              remaining: Math.max(0, student.totalFee - student.discount - student.paidAmount),
              discount: student.discount,
              status: paymentStatus,
              lastPayment: student.paidAmount > 0 ? now : undefined,
              method: student.paidAmount > 0 ? "UPI" : undefined,
            },
            ...s.payments,
          ],
          notifications: [
            notice("New student registered", `${student.name} (${student.id}) was added.`, `/${s.currentUser?.role === "employee" ? "employee" : "admin"}/students/${student.id}`, "student"),
            ...s.notifications,
          ],
          auditEvents: [
            makeAudit(s, {
              action: "CREATE",
              module: "Students",
              recordId: id,
              details: `Created student ${student.name}`,
              after: student.status,
              severity: "SUCCESS",
            }),
            ...s.auditEvents,
          ],
        }));
        return student;
      },
      updateStudent: (id, patch) =>
        set((s) => ({
          students: s.students.map((st) =>
            st.id === id ? { ...st, ...patch, updatedAt: new Date().toISOString() } : st,
          ),
          auditEvents: [
            makeAudit(s, {
              action: "UPDATE",
              module: "Students",
              recordId: id,
              details: `Updated student ${id}`,
              severity: "INFO",
            }),
            ...s.auditEvents,
          ],
        })),
      deleteStudent: (id) =>
        set((s) => ({
          students: s.students.filter((st) => st.id !== id),
          applications: s.applications.filter((a) => a.studentId !== id),
          payments: s.payments.filter((p) => p.studentId !== id),
          documents: s.documents.filter((d) => d.studentId !== id),
          documentVersions: s.documentVersions.filter((d) => d.studentId !== id),
          documentActivities: s.documentActivities.filter((d) => d.studentId !== id),
          portals: s.portals.filter((p) => p.studentId !== id),
          portalAccessLogs: s.portalAccessLogs.filter((p) => p.studentId !== id),
          workItems: s.workItems.filter((w) => w.studentId !== id),
          auditEvents: [
            makeAudit(s, {
              action: "DELETE",
              module: "Students",
              recordId: id,
              details: `Deleted student ${id}`,
              severity: "CRITICAL",
            }),
            ...s.auditEvents,
          ],
        })),
      changeStudentStatus: (id, status) =>
        set((s) => {
          const prev = s.students.find((st) => st.id === id)?.status;
          return {
            students: s.students.map((st) =>
              st.id === id ? { ...st, status, updatedAt: new Date().toISOString() } : st,
            ),
            auditEvents: [
              makeAudit(s, {
                action: "STATUS_CHANGE",
                module: "Students",
                recordId: id,
                before: prev,
                after: status,
                details: `Status ${prev} → ${status}`,
                severity: "WARNING",
              }),
              ...s.auditEvents,
            ],
            notifications: [
              notice(
                "Employee changed student status",
                `${s.currentUser?.name ?? "Someone"} moved ${id} to ${status}.`,
                workspaceHref(s, id),
                "student",
              ),
              ...s.notifications,
            ],
          };
        }),
      assignEmployee: (studentId, employeeId) =>
        set((s) => {
          const prev = s.students.find((st) => st.id === studentId)?.employeeId;
          return {
            students: s.students.map((st) =>
              st.id === studentId ? { ...st, employeeId, updatedAt: new Date().toISOString() } : st,
            ),
            auditEvents: [
              makeAudit(s, {
                action: "EMPLOYEE_ASSIGN",
                module: "Students",
                recordId: studentId,
                before: prev,
                after: employeeId,
                details: `Assigned counselor ${employeeId}`,
                severity: "INFO",
              }),
              ...s.auditEvents,
            ],
          };
        }),
      updatePayment: (studentId, patch) =>
        set((s) => {
          const student = s.students.find((st) => st.id === studentId);
          const paidAmount = patch.paidAmount ?? student?.paidAmount ?? 0;
          const totalFee = patch.totalFee ?? student?.totalFee ?? 0;
          const discount = patch.discount ?? student?.discount ?? 0;
          const remaining = Math.max(0, totalFee - discount - paidAmount);
          const status: PaymentStatus =
            patch.status ??
            (paidAmount >= totalFee - discount ? "Paid" : paidAmount > 0 ? "Partially Paid" : "Pending");
          const now = new Date().toISOString();
          return {
            students: s.students.map((st) =>
              st.id === studentId
                ? { ...st, paidAmount, totalFee, discount, paymentStatus: status, updatedAt: now }
                : st,
            ),
            payments: s.payments.map((p) =>
              p.studentId === studentId
                ? {
                    ...p,
                    ...patch,
                    totalFee,
                    discount,
                    remaining,
                    status,
                    lastPayment: now,
                    initialPayment: p.initialPayment || paidAmount,
                  }
                : p,
            ),
            auditEvents: [
              makeAudit(s, {
                action: "PAYMENT_UPDATE",
                module: "Payments",
                recordId: studentId,
                before: student?.paymentStatus,
                after: status,
                details: `Payment updated for ${studentId}`,
                severity: "WARNING",
              }),
              ...s.auditEvents,
            ],
          };
        }),
      upsertUniversity: (data) =>
        set((s) => {
          const exists = s.universities.some((u) => u.id === data.id);
          return {
            universities: exists
              ? s.universities.map((u) => (u.id === data.id ? data : u))
              : [data, ...s.universities],
            auditEvents: [
              makeAudit(s, {
                action: exists ? "UNIVERSITY_UPDATE" : "CREATE",
                module: "Universities",
                recordId: data.id,
                details: exists ? `Updated ${data.name}` : `Added ${data.name}`,
                severity: exists ? "INFO" : "SUCCESS",
              }),
              ...s.auditEvents,
            ],
          };
        }),
      archiveUniversity: (id) =>
        set((s) => ({
          universities: s.universities.map((u) => (u.id === id ? { ...u, archived: true } : u)),
          auditEvents: [
            makeAudit(s, {
              action: "UNIVERSITY_UPDATE",
              module: "Universities",
              recordId: id,
              details: `Archived university ${id}`,
              severity: "WARNING",
            }),
            ...s.auditEvents,
          ],
        })),
      duplicateUniversity: (id) => {
        const src = get().universities.find((u) => u.id === id);
        if (!src) return null;
        const copy: University = { ...src, id: uid("UNI"), name: `${src.name} (Copy)`, archived: false };
        set((s) => ({
          universities: [copy, ...s.universities],
          auditEvents: [
            makeAudit(s, {
              action: "CREATE",
              module: "Universities",
              recordId: copy.id,
              details: `Duplicated ${src.name}`,
              severity: "SUCCESS",
            }),
            ...s.auditEvents,
          ],
        }));
        return copy;
      },
      deleteUniversity: (id) =>
        set((s) => ({
          universities: s.universities.filter((u) => u.id !== id),
          auditEvents: [
            makeAudit(s, {
              action: "DELETE",
              module: "Universities",
              recordId: id,
              details: `Deleted university ${id}`,
              severity: "CRITICAL",
            }),
            ...s.auditEvents,
          ],
        })),
      toggleShortlist: (studentId, universityId) =>
        set((s) => {
          const current = s.shortlists.find((x) => x.studentId === studentId)?.universityIds ?? [];
          const has = current.includes(universityId);
          const universityIds = has ? current.filter((id) => id !== universityId) : [...current, universityId];
          const uni = s.universities.find((u) => u.id === universityId);
          const student = s.students.find((st) => st.id === studentId);
          return {
            shortlists: touchShortlist(s.shortlists, studentId, (entry) => ({ ...entry, universityIds })),
            auditEvents: [
              makeAudit(s, {
                action: "SHORTLIST",
                module: "Universities",
                recordId: studentId,
                details: has
                  ? `Removed ${uni?.name ?? universityId} from ${student?.name ?? studentId} shortlist`
                  : `Shortlisted ${uni?.name ?? universityId} for ${student?.name ?? studentId}`,
                after: universityIds.join(", "),
                severity: "INFO",
              }),
              ...s.auditEvents,
            ],
          };
        }),
      setShortlist: (studentId, universityIds) =>
        set((s) => {
          const student = s.students.find((st) => st.id === studentId);
          return {
            shortlists: touchShortlist(s.shortlists, studentId, (entry) => ({ ...entry, universityIds })),
            auditEvents: [
              makeAudit(s, {
                action: "SHORTLIST",
                module: "Universities",
                recordId: studentId,
                details: `Set shortlist of ${universityIds.length} universities for ${student?.name ?? studentId}`,
                after: universityIds.join(", "),
                severity: "SUCCESS",
              }),
              ...s.auditEvents,
            ],
          };
        }),
      setShortlistMessage: (studentId, studentMessage) =>
        set((s) => ({
          shortlists: touchShortlist(s.shortlists, studentId, (entry) => ({ ...entry, studentMessage })),
        })),
      clearShortlist: (studentId) =>
        set((s) => ({
          shortlists: s.shortlists.filter((x) => x.studentId !== studentId),
          auditEvents: [
            makeAudit(s, {
              action: "SHORTLIST",
              module: "Universities",
              recordId: studentId,
              details: `Cleared university shortlist for ${studentId}`,
              severity: "WARNING",
            }),
            ...s.auditEvents,
          ],
        })),
      createApplicationsFromShortlist: (studentId, universityIds) => {
        const state = get();
        const student = state.students.find((st) => st.id === studentId);
        if (!student) return { created: 0, skipped: 0 };
        const existing = new Set(
          state.applications.filter((a) => a.studentId === studentId).map((a) => a.universityId),
        );
        const now = new Date().toISOString();
        const created: Application[] = [];
        for (const universityId of universityIds) {
          if (existing.has(universityId)) continue;
          const uni = state.universities.find((u) => u.id === universityId);
          if (!uni) continue;
          created.push({
            id: uid("APP"),
            studentId,
            universityId,
            course: uni.course,
            country: uni.country,
            status: "Shortlisting Sent",
            offerReceived: false,
            deadline: uni.deadline,
            employeeId: student.employeeId,
            createdAt: now,
          });
        }
        const locked = new Set<ApplicationStatus>([
          "Applications Started",
          "Applications on Hold",
          "Offered",
          "Waiting",
          "Got Visa",
          "Private Registered",
          "Private Shifted",
        ]);
        const nextStatus: ApplicationStatus = locked.has(student.status) ? student.status : "Shortlisting Sent";
        set((s) => ({
          applications: [...created, ...s.applications],
          students: s.students.map((st) =>
            st.id === studentId ? { ...st, status: nextStatus, updatedAt: now } : st,
          ),
          auditEvents: [
            makeAudit(s, {
              action: "CREATE",
              module: "Applications",
              recordId: studentId,
              details: `Created ${created.length} applications from shortlist for ${student.name}`,
              after: nextStatus,
              severity: "SUCCESS",
            }),
            ...s.auditEvents,
          ],
        }));
        return { created: created.length, skipped: universityIds.length - created.length };
      },
      upsertLead: (data) =>
        set((s) => {
          const exists = s.leads.some((l) => l.id === data.id);
          return {
            leads: exists ? s.leads.map((l) => (l.id === data.id ? data : l)) : [data, ...s.leads],
            auditEvents: [
              makeAudit(s, {
                action: exists ? "UPDATE" : "CREATE",
                module: "Leads",
                recordId: data.id,
                details: exists ? `Updated lead ${data.name}` : `Created lead ${data.name}`,
                severity: exists ? "INFO" : "SUCCESS",
              }),
              ...s.auditEvents,
            ],
          };
        }),
      deleteLead: (id) =>
        set((s) => ({
          leads: s.leads.filter((l) => l.id !== id),
          auditEvents: [
            makeAudit(s, {
              action: "DELETE",
              module: "Leads",
              recordId: id,
              details: `Deleted lead ${id}`,
              severity: "CRITICAL",
            }),
            ...s.auditEvents,
          ],
        })),
      upsertApplication: (data) =>
        set((s) => {
          const exists = s.applications.some((a) => a.id === data.id);
          return {
            applications: exists
              ? s.applications.map((a) => (a.id === data.id ? data : a))
              : [data, ...s.applications],
            auditEvents: [
              makeAudit(s, {
                action: exists ? "UPDATE" : "CREATE",
                module: "Applications",
                recordId: data.id,
                details: exists ? `Updated application ${data.id}` : `Created application ${data.id}`,
                severity: exists ? "INFO" : "SUCCESS",
              }),
              ...s.auditEvents,
            ],
          };
        }),
      updateEmployee: (id, patch) =>
        set((s) => ({
          employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          currentUser: s.currentUser?.id === id ? { ...s.currentUser, ...patch } : s.currentUser,
          auditEvents: [
            makeAudit(s, {
              action: "UPDATE",
              module: "Employees",
              recordId: id,
              details: `Updated employee ${id}`,
              severity: "INFO",
            }),
            ...s.auditEvents,
          ],
        })),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      addDocument: (doc) => {
        const created: StudentDocument = { ...doc, id: uid("DOC") };
        set((s) => ({
          documents: [created, ...s.documents],
          auditEvents: [
            makeAudit(s, {
              action: "DOCUMENT_UPLOADED",
              module: "Documents",
              recordId: doc.studentId,
              details: `Added ${doc.type}`,
              severity: "SUCCESS",
            }),
            ...s.auditEvents,
          ],
        }));
        return created;
      },
      uploadDocumentFile: (input) => {
        const state = get();
        const student = state.students.find((st) => st.id === input.studentId);
        if (!student) return { ok: false, error: "Student not found." };
        const actorName = input.actorName ?? state.currentUser?.name ?? "Staff";
        const actorRole = input.actorRole ?? state.currentUser?.role ?? "employee";
        const fromStudent = Boolean(input.fromStudent) || actorRole === "student";
        const targetId = input.replaceExistingId ?? input.asNewVersionOf;
        const duplicate =
          !targetId &&
          !input.forceNew &&
          state.documents.find((d) => d.studentId === input.studentId && d.type === input.type && d.status !== "pending");
        if (duplicate) {
          return { ok: false, error: `A ${input.type} document already exists.`, existing: duplicate };
        }
        const now = new Date().toISOString();
        const nextStatus = fromStudent ? "under_review" : "uploaded";
        const existing = targetId ? state.documents.find((d) => d.id === targetId) : state.documents.find((d) => d.studentId === input.studentId && d.type === input.type && d.status === "pending");
        const id = existing?.id ?? uid("DOC");
        const version = (existing?.version ?? 0) + 1;
        const next: StudentDocument = {
          id,
          studentId: input.studentId,
          name: input.name,
          type: input.type,
          category: existing?.category ?? (input.universityName ? "University" : categoryForType(input.type)),
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          status: nextStatus,
          uploadedBy: actorName,
          uploadedByRole: actorRole,
          uploadedAt: now,
          updatedAt: now,
          required: input.required ?? existing?.required ?? true,
          priority: existing?.priority ?? "normal",
          version,
          internalNote: input.internalNote ?? existing?.internalNote,
          studentInstruction: input.studentInstruction ?? existing?.studentInstruction,
          dueDate: input.dueDate ?? existing?.dueDate,
          universityId: input.universityId ?? existing?.universityId,
          universityName: input.universityName ?? existing?.universityName,
          course: input.course ?? existing?.course,
          rejectReason: undefined,
          rejectNote: undefined,
          replacementRequested: false,
          replacementMessage: undefined,
        };
        const ver: DocumentVersion = {
          id: uid("VER"),
          documentId: id,
          studentId: input.studentId,
          version,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          uploadedBy: actorName,
          uploadedByRole: actorRole,
          uploadedAt: now,
        };
        if (input.dataUrl) {
          if (existing) copyFileData(existing.id, `${existing.id}:v${existing.version}`);
          setFileData(id, input.dataUrl);
          setFileData(ver.id, input.dataUrl);
        }
        const action: AuditAction = fromStudent
          ? existing && existing.version > 0
            ? "STUDENT_REPLACED_DOCUMENT"
            : "STUDENT_UPLOADED_DOCUMENT"
          : existing && existing.version > 0
            ? "DOCUMENT_REPLACED"
            : "DOCUMENT_UPLOADED";
        set((s) => {
          const nextDocs = existing ? s.documents.map((d) => (d.id === id ? next : d)) : [next, ...s.documents];
          const stats = documentStats(nextDocs.filter((d) => d.studentId === input.studentId));
          const extraNotices: AppNotification[] = [];
          if (fromStudent) {
            extraNotices.push(
              notice(
                `${student.name} uploaded ${input.fileName}`,
                "A student upload is waiting for review.",
                workspaceHref(s, student.id),
              ),
            );
          }
          if (stats.remaining === 0 && stats.requiredTotal > 0) {
            extraNotices.push(
              notice(
                "Student completed document submission",
                `${student.name} submitted all currently requested documents.`,
                workspaceHref(s, student.id),
              ),
            );
          }
          return {
          documents: nextDocs,
          documentVersions: [ver, ...s.documentVersions],
          documentActivities: [
            activity(id, input.studentId, actorName, actorRole, existing && existing.version > 0 ? "replaced document" : "uploaded document", input.fileName),
            ...s.documentActivities,
          ],
          auditEvents: [
            makeAudit(s, {
              action,
              module: "Documents",
              recordId: input.studentId,
              details: `${fromStudent ? "Student uploaded" : "Uploaded"} ${input.fileName}`,
              before: existing?.status,
              after: nextStatus,
              severity: "SUCCESS",
              user: actorName,
              userId: fromStudent ? student.id : s.currentUser?.id,
              role: fromStudent ? "student" : s.currentUser?.role,
            }),
            ...s.auditEvents,
          ],
          notifications: extraNotices.length ? [...extraNotices, ...s.notifications] : s.notifications,
          };
        });
        return { ok: true, document: next };
      },
      verifyDocument: (id) =>
        set((s) => {
          const doc = s.documents.find((d) => d.id === id);
          if (!doc) return s;
          const actor = s.currentUser?.name ?? "Staff";
          return {
            documents: s.documents.map((d) =>
              d.id === id
                ? { ...d, status: "verified", rejectReason: undefined, rejectNote: undefined, replacementRequested: false, updatedAt: new Date().toISOString() }
                : d,
            ),
            documentActivities: [activity(id, doc.studentId, actor, s.currentUser?.role ?? "employee", "verified document"), ...s.documentActivities],
            auditEvents: [
              makeAudit(s, {
                action: "DOCUMENT_VERIFIED",
                module: "Documents",
                recordId: doc.studentId,
                details: `Verified ${doc.type}`,
                before: doc.status,
                after: "verified",
                severity: "SUCCESS",
              }),
              ...s.auditEvents,
            ],
          };
        }),
      rejectDocument: (id, reason, note) =>
        set((s) => {
          const doc = s.documents.find((d) => d.id === id);
          if (!doc) return s;
          const actor = s.currentUser?.name ?? "Staff";
          const student = s.students.find((st) => st.id === doc.studentId);
          return {
            documents: s.documents.map((d) =>
              d.id === id
                ? { ...d, status: "rejected", rejectReason: reason, rejectNote: note, replacementRequested: true, updatedAt: new Date().toISOString() }
                : d,
            ),
            documentActivities: [activity(id, doc.studentId, actor, s.currentUser?.role ?? "employee", "rejected document", reason), ...s.documentActivities],
            auditEvents: [
              makeAudit(s, {
                action: "DOCUMENT_REJECTED",
                module: "Documents",
                recordId: doc.studentId,
                details: `Rejected ${doc.type}: ${reason}`,
                before: doc.status,
                after: "rejected",
                severity: "WARNING",
              }),
              ...s.auditEvents,
            ],
            notifications: [
              notice(`Document rejected by ${actor}`, `${doc.type} for ${student?.name ?? doc.studentId} was rejected.`, workspaceHref(s, doc.studentId)),
              ...s.notifications,
            ],
          };
        }),
      requestReplacement: (id, reason, message, dueDate) =>
        set((s) => {
          const doc = s.documents.find((d) => d.id === id);
          if (!doc) return s;
          const actor = s.currentUser?.name ?? "Staff";
          return {
            documents: s.documents.map((d) =>
              d.id === id
                ? {
                    ...d,
                    replacementRequested: true,
                    replacementMessage: message,
                    studentInstruction: message,
                    rejectReason: d.rejectReason ?? reason,
                    dueDate: dueDate ?? d.dueDate,
                    updatedAt: new Date().toISOString(),
                  }
                : d,
            ),
            documentActivities: [activity(id, doc.studentId, actor, s.currentUser?.role ?? "employee", "requested replacement", reason), ...s.documentActivities],
            auditEvents: [
              makeAudit(s, {
                action: "DOCUMENT_REQUESTED",
                module: "Documents",
                recordId: doc.studentId,
                details: `Requested replacement for ${doc.type}`,
                severity: "WARNING",
              }),
              ...s.auditEvents,
            ],
          };
        }),
      requestDocument: (input) => {
        const state = get();
        const student = state.students.find((st) => st.id === input.studentId);
        const now = new Date().toISOString();
        const created: StudentDocument = {
          id: uid("DOC"),
          studentId: input.studentId,
          name: `${input.type} — ${student?.name ?? input.studentId}`,
          type: input.type,
          category: input.universityName ? "University" : categoryForType(input.type),
          status: "pending",
          required: input.required,
          priority: input.priority ?? (input.required ? "high" : "optional"),
          version: 0,
          updatedAt: now,
          dueDate: input.dueDate,
          studentInstruction: input.studentInstruction,
          universityId: input.universityId,
          universityName: input.universityName,
          course: input.course,
        };
        set((s) => ({
          documents: [created, ...s.documents],
          documentActivities: [
            activity(created.id, input.studentId, s.currentUser?.name ?? "Staff", s.currentUser?.role ?? "employee", "requested document", input.type),
            ...s.documentActivities,
          ],
          auditEvents: [
            makeAudit(s, {
              action: "DOCUMENT_REQUESTED",
              module: "Documents",
              recordId: input.studentId,
              details: `Requested ${input.type}`,
              after: "pending",
              severity: "SUCCESS",
            }),
            ...s.auditEvents,
          ],
        }));
        return created;
      },
      updateDocumentMeta: (id, patch) =>
        set((s) => ({
          documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d)),
        })),
      deleteDocuments: (ids) =>
        set((s) => {
          const setIds = new Set(ids);
          ids.forEach(removeFileData);
          const first = s.documents.find((d) => setIds.has(d.id));
          return {
            documents: s.documents.filter((d) => !setIds.has(d.id)),
            documentVersions: s.documentVersions.filter((v) => !setIds.has(v.documentId)),
            documentActivities: s.documentActivities.filter((a) => !setIds.has(a.documentId)),
            auditEvents: first
              ? [
                  makeAudit(s, {
                    action: "DOCUMENT_DELETED",
                    module: "Documents",
                    recordId: first.studentId,
                    details: `Deleted ${ids.length} document${ids.length === 1 ? "" : "s"}`,
                    severity: "CRITICAL",
                  }),
                  ...s.auditEvents,
                ]
              : s.auditEvents,
          };
        }),
      recordDocumentView: (id) => {
        const doc = get().documents.find((d) => d.id === id);
        if (!doc) return;
        set((s) => ({
          auditEvents: [
            makeAudit(s, {
              action: "DOCUMENT_VIEWED",
              module: "Documents",
              recordId: doc.studentId,
              details: `Viewed ${doc.fileName ?? doc.type}`,
              severity: "INFO",
            }),
            ...s.auditEvents,
          ],
        }));
      },
      recordDocumentDownload: (id) => {
        const doc = get().documents.find((d) => d.id === id);
        if (!doc) return;
        set((s) => ({
          auditEvents: [
            makeAudit(s, {
              action: "DOCUMENT_DOWNLOADED",
              module: "Documents",
              recordId: doc.studentId,
              details: `Downloaded ${doc.fileName ?? doc.type}`,
              severity: "INFO",
            }),
            ...s.auditEvents,
          ],
        }));
      },
      seedStudentDocuments: (studentId) => {
        const s = get();
        const student = s.students.find((st) => st.id === studentId);
        if (!student) return;
        if (s.documents.some((d) => d.studentId === studentId)) return;
        const extras = extrasForStudent(s, studentId);
        const seeded = buildRequirementDocs(student, extras).map((d) => ({ ...d, id: uid("DOC") }));
        set({ documents: [...seeded, ...s.documents] });
      },
      createPortal: (input) => {
        const state = get();
        const student = state.students.find((st) => st.id === input.studentId);
        const now = new Date().toISOString();
        const portal: StudentDocumentPortal = {
          id: uid("PRT"),
          studentId: input.studentId,
          accessMethod: input.accessMethod,
          email: input.email ?? student?.email,
          token: generatePortalToken(),
          status: "active",
          expiresAt: input.expiresAt,
          permissions: input.permissions ?? { ...DEFAULT_PORTAL_PERMISSIONS },
          createdAt: now,
        };
        set((s) => ({
          portals: [
            portal,
            ...s.portals.map((p) =>
              p.studentId === input.studentId && p.status === "active" ? { ...p, status: "revoked" as const } : p,
            ),
          ],
          auditEvents: [
            makeAudit(s, {
              action: "PORTAL_CREATED",
              module: "Documents",
              recordId: input.studentId,
              details: `Created student upload portal`,
              after: input.accessMethod,
              severity: "SUCCESS",
            }),
            ...s.auditEvents,
          ],
        }));
        return portal;
      },
      updatePortal: (id, patch) =>
        set((s) => ({
          portals: s.portals.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      revokePortal: (id) =>
        set((s) => {
          const portal = s.portals.find((p) => p.id === id);
          return {
            portals: s.portals.map((p) => (p.id === id ? { ...p, status: "revoked" } : p)),
            auditEvents: portal
              ? [
                  makeAudit(s, {
                    action: "PORTAL_REVOKED",
                    module: "Documents",
                    recordId: portal.studentId,
                    details: "Revoked student upload portal",
                    before: "active",
                    after: "revoked",
                    severity: "WARNING",
                  }),
                  ...s.auditEvents,
                ]
              : s.auditEvents,
          };
        }),
      regeneratePortal: (id) => {
        const current = get().portals.find((p) => p.id === id);
        if (!current) return null;
        const next: StudentDocumentPortal = {
          ...current,
          id: uid("PRT"),
          token: generatePortalToken(),
          status: "active",
          createdAt: new Date().toISOString(),
          lastAccessedAt: undefined,
        };
        set((s) => ({
          portals: [next, ...s.portals.map((p) => (p.id === id ? { ...p, status: "revoked" as const } : p))],
          auditEvents: [
            makeAudit(s, {
              action: "PORTAL_REGENERATED",
              module: "Documents",
              recordId: current.studentId,
              details: "Regenerated student upload portal",
              severity: "SUCCESS",
            }),
            ...s.auditEvents,
          ],
        }));
        return next;
      },
      logPortalAccess: (portalId, action, actor) =>
        set((s) => {
          const portal = s.portals.find((p) => p.id === portalId);
          if (!portal) return s;
          const student = s.students.find((st) => st.id === portal.studentId);
          const log: PortalAccessLog = {
            id: uid("PAL"),
            portalId,
            studentId: portal.studentId,
            actor: actor ?? student?.name ?? "Student",
            action,
            timestamp: new Date().toISOString(),
          };
          return {
            portalAccessLogs: [log, ...s.portalAccessLogs],
            portals: s.portals.map((p) => (p.id === portalId ? { ...p, lastAccessedAt: log.timestamp } : p)),
          };
        }),
      touchPortalAccess: (token) =>
        set((s) => {
          const portal = s.portals.find((p) => p.token === token);
          if (!portal) return s;
          const student = s.students.find((st) => st.id === portal.studentId);
          return {
            portals: s.portals.map((p) => (p.token === token ? { ...p, lastAccessedAt: new Date().toISOString() } : p)),
            portalAccessLogs: [
              {
                id: uid("PAL"),
                portalId: portal.id,
                studentId: portal.studentId,
                actor: student?.name ?? "Student",
                action: "accessed portal",
                timestamp: new Date().toISOString(),
              },
              ...s.portalAccessLogs,
            ],
            auditEvents: [
              makeAudit(s, {
                action: "PORTAL_ACCESSED",
                module: "Documents",
                recordId: portal.studentId,
                details: `${student?.name ?? "Student"} accessed portal`,
                user: student?.name,
                userId: student?.id,
                role: "student",
                severity: "INFO",
              }),
              ...s.auditEvents,
            ],
          };
        }),
      updateWorkItem: (id, patch) =>
        set((s) => ({
          workItems: s.workItems.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),
      updateSettings: (patch) =>
        set((s) => ({
          settings: { ...s.settings, ...patch },
          auditEvents: [
            makeAudit(s, {
              action: "UPDATE",
              module: "Settings",
              recordId: "ORG",
              details: "Updated organization settings",
              severity: "WARNING",
            }),
            ...s.auditEvents,
          ],
        })),
      resetDemo: () => {
        const fresh = createSeed();
        const user = get().currentUser;
        set({
          ...fresh,
          shortlists: [],
          currentUser: user ? (fresh.employees.find((e) => e.email === user.email) ?? user) : null,
          theme: get().theme,
        });
      },
    }),
    {
      name: "meridian-docs-v3",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? {
              getItem: () => null,
              setItem: () => undefined,
              removeItem: () => undefined,
            }
          : localStorage,
      ),
      skipHydration: true,
      partialize: (s) => ({
        currentUser: s.currentUser,
        theme: s.theme,
        sidebarCollapsed: s.sidebarCollapsed,
        students: s.students,
        employees: s.employees,
        universities: s.universities,
        applications: s.applications,
        payments: s.payments,
        leads: s.leads,
        documents: s.documents,
        documentVersions: s.documentVersions,
        documentActivities: s.documentActivities,
        portals: s.portals,
        portalAccessLogs: s.portalAccessLogs,
        workItems: s.workItems,
        shortlists: s.shortlists,
        auditEvents: s.auditEvents,
        notifications: s.notifications,
        settings: s.settings,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
        else useAppStore.setState({ hydrated: true });
      },
    },
  ),
);

export function useHydrateStore() {
  const hydrated = useAppStore((s) => s.hydrated);
  if (typeof window !== "undefined" && !hydrated) {
    void useAppStore.persist.rehydrate();
  }
  return hydrated;
}
