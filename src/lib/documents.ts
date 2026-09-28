import type {
  Country,
  DocumentCategory,
  DocumentPriority,
  DocumentStatus,
  Student,
  StudentDocument,
  StudentDocumentPortal,
} from "@/lib/types";

export { DOCUMENT_CATEGORIES } from "@/lib/types";

export const DOCUMENT_TYPE_CATALOG: Array<{
  type: string;
  category: DocumentCategory;
  requiredByDefault: boolean;
  countries?: Country[];
}> = [
  { type: "Passport", category: "Identity", requiredByDefault: true },
  { type: "Photo", category: "Identity", requiredByDefault: false },
  { type: "National ID", category: "Identity", requiredByDefault: false },
  { type: "Degree Certificate", category: "Academic", requiredByDefault: true },
  { type: "Transcript", category: "Academic", requiredByDefault: true },
  { type: "Provisional Certificate", category: "Academic", requiredByDefault: false },
  { type: "Language Certificate", category: "Language", requiredByDefault: true },
  { type: "IELTS Certificate", category: "Language", requiredByDefault: false },
  { type: "TOEFL Certificate", category: "Language", requiredByDefault: false },
  { type: "German Language Certificate", category: "Language", requiredByDefault: false, countries: ["Germany"] },
  { type: "Financial Proof", category: "Financial", requiredByDefault: true },
  { type: "Blocked Account Proof", category: "Financial", requiredByDefault: false, countries: ["Germany"] },
  { type: "SOP", category: "Application", requiredByDefault: true },
  { type: "LOR", category: "Application", requiredByDefault: true },
  { type: "CV", category: "Application", requiredByDefault: true },
  { type: "APS Documents", category: "Application", requiredByDefault: false, countries: ["Germany"] },
  { type: "Uni-Assist Documents", category: "Application", requiredByDefault: false, countries: ["Germany"] },
  { type: "University Offer Letter", category: "University", requiredByDefault: false },
  { type: "Visa Application Form", category: "Visa", requiredByDefault: false },
  { type: "Other", category: "Other", requiredByDefault: false },
];

/** Country-configured requirement lists — business rules, not universal facts. */
export const COUNTRY_DOCUMENT_RULES: Record<
  Country,
  Array<{ type: string; required: boolean; instruction?: string; priority?: DocumentPriority }>
> = {
  Germany: [
    { type: "Passport", required: true, instruction: "Upload a clear colour scan of the photo page." },
    { type: "Degree Certificate", required: true, instruction: "Latest official degree or provisional certificate." },
    { type: "Transcript", required: true, instruction: "Please upload the latest official transcript." },
    { type: "Language Certificate", required: true },
    { type: "APS Documents", required: true, instruction: "APS certificate or acknowledgment, if issued." },
    { type: "Uni-Assist Documents", required: true },
    { type: "German Language Certificate", required: false, priority: "optional" },
    { type: "CV", required: true },
    { type: "SOP", required: true },
    { type: "LOR", required: true },
    { type: "Financial Proof", required: true, instruction: "Blocked account, sponsor letter, or equivalent proof." },
    { type: "Photo", required: false, priority: "optional" },
  ],
  UK: [
    { type: "Passport", required: true },
    { type: "Degree Certificate", required: true },
    { type: "Transcript", required: true },
    { type: "IELTS Certificate", required: true },
    { type: "SOP", required: true },
    { type: "LOR", required: true },
    { type: "CV", required: true },
    { type: "Financial Proof", required: true },
    { type: "Photo", required: false, priority: "optional" },
  ],
  USA: [
    { type: "Passport", required: true },
    { type: "Degree Certificate", required: true },
    { type: "Transcript", required: true },
    { type: "Language Certificate", required: true },
    { type: "SOP", required: true },
    { type: "LOR", required: true },
    { type: "CV", required: true },
    { type: "Financial Proof", required: true },
    { type: "Photo", required: false, priority: "optional" },
  ],
};

export const REJECT_REASONS = [
  "Incorrect document",
  "Document unclear",
  "Expired document",
  "Wrong document",
  "Missing information",
  "Other",
] as const;

export const FILE_RULES = {
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"],
  allowedMime: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  maxBytes: 25 * 1024 * 1024,
  maxNameLength: 120,
};

export const DEFAULT_PORTAL_PERMISSIONS = {
  view: true,
  upload: true,
  replace: true,
  delete: false,
  download: true,
};

export function catalogEntry(type: string) {
  return DOCUMENT_TYPE_CATALOG.find((d) => d.type === type);
}

export function categoryForType(type: string): DocumentCategory {
  return catalogEntry(type)?.category ?? "Other";
}

export function isSubmitted(status: DocumentStatus) {
  return status === "uploaded" || status === "under_review" || status === "verified";
}

export function documentStats(docs: StudentDocument[]) {
  const required = docs.filter((d) => d.required);
  const complete = required.filter((d) => isSubmitted(d.status)).length;
  const remaining = Math.max(0, required.length - complete);
  return {
    total: docs.length,
    requiredTotal: required.length,
    complete,
    remaining,
    percent: required.length ? Math.round((complete / required.length) * 100) : 100,
    uploaded: docs.filter((d) => isSubmitted(d.status)).length,
    pending: docs.filter((d) => d.status === "pending").length,
    underReview: docs.filter((d) => d.status === "under_review").length,
    verified: docs.filter((d) => d.status === "verified").length,
    rejected: docs.filter((d) => d.status === "rejected").length,
    expired: docs.filter((d) => d.status === "expired").length,
    studentUploads: docs.filter((d) => d.uploadedByRole === "student").length,
  };
}

export function groupedByCategory(docs: StudentDocument[], includeEmpty = true) {
  const groups: { category: DocumentCategory; items: StudentDocument[] }[] = [];
  for (const category of [
    "Identity",
    "Academic",
    "Language",
    "Financial",
    "Application",
    "University",
    "Visa",
    "Other",
  ] as DocumentCategory[]) {
    const items = docs.filter((d) => d.category === category);
    if (items.length || includeEmpty) groups.push({ category, items });
  }
  return groups;
}

export function generatePortalToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 13; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function portalPath(token: string) {
  return `/student-upload/${token}`;
}

export function portalUrl(token: string) {
  if (typeof window === "undefined") return `https://meridian.example${portalPath(token)}`;
  return `${window.location.origin}${portalPath(token)}`;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateUploadFile(file: File) {
  const name = file.name.trim();
  if (!name) return "File name is required.";
  if (name.length > FILE_RULES.maxNameLength) return "File name is too long.";
  const ext = name.includes(".") ? `.${name.split(".").pop()!.toLowerCase()}` : "";
  if (!FILE_RULES.allowedExtensions.includes(ext)) {
    return `Unsupported file type. Use ${FILE_RULES.allowedExtensions.join(", ")}.`;
  }
  if (file.size > FILE_RULES.maxBytes) {
    return `File is larger than ${formatBytes(FILE_RULES.maxBytes)}.`;
  }
  return null;
}

export function expiryFromPreset(preset: "never" | "24h" | "7d" | "30d" | "custom", custom?: string) {
  if (preset === "never") return undefined;
  if (preset === "custom") return custom || undefined;
  const days = preset === "24h" ? 1 : preset === "7d" ? 7 : 30;
  return new Date(Date.now() + days * 86400000).toISOString();
}

export function portalEffectiveStatus(portal: StudentDocumentPortal): StudentDocumentPortal["status"] {
  if (portal.status === "revoked") return "revoked";
  if (portal.expiresAt && new Date(portal.expiresAt).getTime() < Date.now()) return "expired";
  return portal.status;
}

export function defaultDocumentName(type: string, studentName: string, universityName?: string) {
  if (universityName) return `${type} — ${universityName}`;
  return `${type} — ${studentName}`;
}

export function buildRequirementDocs(
  student: Pick<Student, "id" | "name" | "country">,
  extras?: Array<{
    type: string;
    required?: boolean;
    universityId?: string;
    universityName?: string;
    course?: string;
  }>,
  now = new Date().toISOString(),
): Omit<StudentDocument, "id">[] {
  const rules = COUNTRY_DOCUMENT_RULES[student.country] ?? COUNTRY_DOCUMENT_RULES.Germany;
  const rows: Omit<StudentDocument, "id">[] = rules.map((rule) => ({
    studentId: student.id,
    name: defaultDocumentName(rule.type, student.name),
    type: rule.type,
    category: categoryForType(rule.type),
    status: "pending",
    required: rule.required,
    priority: rule.priority ?? (rule.required ? "normal" : "optional"),
    version: 0,
    updatedAt: now,
    studentInstruction: rule.instruction,
  }));
  for (const extra of extras ?? []) {
    rows.push({
      studentId: student.id,
      name: defaultDocumentName(extra.type, student.name, extra.universityName),
      type: extra.type,
      category: extra.universityName ? "University" : categoryForType(extra.type),
      status: "pending",
      required: extra.required ?? true,
      priority: extra.required === false ? "optional" : "high",
      version: 0,
      updatedAt: now,
      universityId: extra.universityId,
      universityName: extra.universityName,
      course: extra.course,
    });
  }
  return rows;
}

export function statusLabel(status: DocumentStatus) {
  switch (status) {
    case "verified":
      return "Verified";
    case "uploaded":
      return "Uploaded";
    case "under_review":
      return "Under Review";
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
  }
}

export function canPreview(fileType?: string, fileName?: string) {
  const t = (fileType || "").toLowerCase();
  const n = (fileName || "").toLowerCase();
  return t.startsWith("image/") || t === "application/pdf" || /\.(png|jpe?g|webp|gif|pdf)$/.test(n);
}

export function relativeShort(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = (start.getTime() - day.getTime()) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function isOverdue(dueDate?: string, status?: DocumentStatus) {
  if (!dueDate) return false;
  if (status && isSubmitted(status)) return false;
  return new Date(dueDate).getTime() < Date.now();
}
