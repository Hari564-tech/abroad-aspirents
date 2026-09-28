export type Role = "admin" | "employee";
export type Country = "Germany" | "UK" | "USA";
export type LeadType = "Direct" | "B2B";
export type PaymentStatus = "Paid" | "Partially Paid" | "Pending" | "Overdue";
export type AuditSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
export type DocumentStatus = "pending" | "uploaded" | "under_review" | "verified" | "rejected" | "expired";
export type DocumentCategory =
  | "Identity"
  | "Academic"
  | "Language"
  | "Financial"
  | "Application"
  | "University"
  | "Visa"
  | "Other";
export type DocumentPriority = "high" | "normal" | "optional";
export type PortalAccessMethod = "email_only" | "link_only" | "email_and_link";
export type PortalStatus = "active" | "revoked" | "expired";
export type ActorRole = "admin" | "employee" | "student" | "system";
export type ThemeMode = "light" | "dark" | "system";
export type LeadPipeline = "New" | "Shortlisting" | "Applications" | "Offer" | "Visa";
export type EmployeeStatus = "Active" | "Inactive";
export type Priority = "High" | "Medium" | "Low";
export type WorkStatus = "Pending" | "In Progress" | "Done";

export const APPLICATION_STATUSES = [
  "Shortlisting Sent",
  "Applications Started",
  "Applications on Hold",
  "Offered",
  "Waiting",
  "Deferred",
  "Dropped",
  "Private Registered",
  "Private Shifted",
  "Still Thinking",
  "Got Visa",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const INTAKES = [
  "Winter 2026",
  "Summer 2026",
  "January 2026",
  "Spring 2026",
  "Winter 2025",
] as const;

export type Intake = (typeof INTAKES)[number];

export const BRANCHES = [
  "Computer Science",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Data Science",
  "Electronics & Communication",
  "Biotechnology",
  "Architecture",
  "Finance",
] as const;

export const GERMAN_LEVELS = ["None", "A1", "A2", "B1", "B2", "C1"] as const;

export const DOCUMENT_CATEGORIES = [
  "Identity",
  "Academic",
  "Language",
  "Financial",
  "Application",
  "University",
  "Visa",
  "Other",
] as const;

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "STATUS_CHANGE",
  "PAYMENT_UPDATE",
  "EMPLOYEE_ASSIGN",
  "UNIVERSITY_UPDATE",
  "EXPORT",
  "VIEW",
  "SHORTLIST",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_VIEWED",
  "DOCUMENT_DOWNLOADED",
  "DOCUMENT_REPLACED",
  "DOCUMENT_VERIFIED",
  "DOCUMENT_REJECTED",
  "DOCUMENT_DELETED",
  "DOCUMENT_REQUESTED",
  "PORTAL_CREATED",
  "PORTAL_ACCESSED",
  "PORTAL_SHARED",
  "PORTAL_LINK_COPIED",
  "PORTAL_REVOKED",
  "PORTAL_REGENERATED",
  "STUDENT_UPLOADED_DOCUMENT",
  "STUDENT_REPLACED_DOCUMENT",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  title: string;
  department: string;
  status: EmployeeStatus;
  lastActive: string;
  joinedAt: string;
  avatarHue: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone1: string;
  phone2: string;
  country: Country;
  intake: Intake;
  branch: string;
  college: string;
  employeeId: string;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  cgpa: number;
  ielts?: number;
  toefl?: number;
  duolingo?: number;
  germanGrade?: number;
  gre?: number;
  germanLanguage: string;
  gmailId: string;
  gmailPassword: string;
  recoveryNumber: string;
  device: string;
  twoStep: boolean;
  apsUsername?: string;
  apsPassword?: string;
  uniAssistId?: string;
  uniAssistPassword?: string;
  uniAssistDocuments?: "Uploaded" | "Not Uploaded";
  blockedAccount?: "Applied" | "Not Applied";
  enrollment?: "Applied" | "Not Applied";
  studentDorm?: "Applied" | "Not Applied";
  totalFee: number;
  paidAmount: number;
  discount: number;
  leadType: LeadType;
  b2bOrg?: string;
  notes: string;
  avatarHue: number;
}

export interface University {
  id: string;
  name: string;
  location: string;
  country: Country;
  course: string;
  branch: string;
  intake: Intake;
  ielts: number;
  toefl: number;
  germanLanguage: string;
  gre: string;
  germanGrade: number;
  applicationVia: string;
  applicationFee: number;
  deadline: string;
  tuitionFees: number;
  moi: boolean;
  documentsCourier: string;
  aptitudeTest: string;
  archived: boolean;
}

export interface Application {
  id: string;
  studentId: string;
  universityId: string;
  course: string;
  country: Country;
  status: ApplicationStatus;
  submittedAt?: string;
  offerReceived: boolean;
  deadline: string;
  employeeId: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  totalFee: number;
  initialPayment: number;
  remaining: number;
  discount: number;
  status: PaymentStatus;
  lastPayment?: string;
  method?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: Country;
  intake: Intake;
  employeeId: string;
  type: LeadType;
  b2bOrg?: string;
  pipeline: LeadPipeline;
  status: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  role: Role | "student";
  action: AuditAction;
  module: string;
  recordId: string;
  before?: string;
  after?: string;
  details: string;
  severity: AuditSeverity;
  ip: string;
  userAgent: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  href: string;
  kind: "student" | "payment" | "application" | "system" | "document";
}

export interface PortalPermissions {
  view: boolean;
  upload: boolean;
  replace: boolean;
  delete: boolean;
  download: boolean;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  name: string;
  type: string;
  category: DocumentCategory;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  status: DocumentStatus;
  uploadedBy?: string;
  uploadedByRole?: ActorRole;
  uploadedAt?: string;
  updatedAt: string;
  required: boolean;
  priority: DocumentPriority;
  version: number;
  internalNote?: string;
  studentInstruction?: string;
  dueDate?: string;
  universityId?: string;
  universityName?: string;
  course?: string;
  rejectReason?: string;
  rejectNote?: string;
  replacementRequested?: boolean;
  replacementMessage?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  studentId: string;
  version: number;
  fileName: string;
  fileType: string;
  fileSize: string;
  uploadedBy: string;
  uploadedByRole: ActorRole;
  uploadedAt: string;
}

export interface DocumentActivity {
  id: string;
  documentId: string;
  studentId: string;
  actor: string;
  actorRole: ActorRole;
  action: string;
  detail?: string;
  timestamp: string;
}

export interface StudentDocumentPortal {
  id: string;
  studentId: string;
  accessMethod: PortalAccessMethod;
  email?: string;
  token: string;
  status: PortalStatus;
  expiresAt?: string;
  permissions: PortalPermissions;
  createdAt: string;
  lastAccessedAt?: string;
}

export interface PortalAccessLog {
  id: string;
  portalId: string;
  studentId: string;
  actor: string;
  action: string;
  timestamp: string;
}

export interface WorkItem {
  id: string;
  studentId: string;
  studentName: string;
  task: string;
  priority: Priority;
  deadline: string;
  status: WorkStatus;
  employeeId: string;
}

export interface UniversityShortlist {
  studentId: string;
  universityIds: string[];
  studentMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgSettings {
  name: string;
  legalName: string;
  timezone: string;
  currency: string;
  twoFactor: boolean;
  sessionTimeout: number;
  loginNotifications: boolean;
  emailAlerts: boolean;
  slackAlerts: boolean;
  auditRetentionDays: number;
  defaultIntake: Intake;
}
