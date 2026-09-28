import {
  APPLICATION_STATUSES,
  BRANCHES,
  INTAKES,
  type Application,
  type ApplicationStatus,
  type AppNotification,
  type AuditEvent,
  type AuditSeverity,
  type Country,
  type Intake,
  type Lead,
  type LeadPipeline,
  type OrgSettings,
  type PaymentRecord,
  type PaymentStatus,
  type Student,
  type StudentDocument,
  type StudentDocumentPortal,
  type University,
  type User,
  type WorkItem,
  type DocumentActivity,
  type DocumentStatus,
  type DocumentVersion,
  type PortalAccessLog,
} from "@/lib/types";
import { buildRequirementDocs, DEFAULT_PORTAL_PERMISSIONS } from "@/lib/documents";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}

function pickN<T>(r: () => number, arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(r() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

function pad(n: number, w = 3) {
  return String(n).padStart(w, "0");
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}

function phone(r: () => number) {
  const n = 6000000000 + Math.floor(r() * 3999999999);
  const s = String(n);
  return `+91 ${s.slice(0, 5)} ${s.slice(5)}`;
}

function hue(r: () => number) {
  return Math.floor(r() * 360);
}

const FIRST = [
  "Rahul", "Priya", "Ananya", "Vikram", "Sneha", "Arjun", "Kavya", "Rohan", "Divya", "Aditya",
  "Meera", "Karan", "Pooja", "Siddharth", "Ishita", "Nikhil", "Anjali", "Varun", "Shreya", "Manish",
  "Neha", "Aakash", "Harini", "Suresh", "Deepika", "Ravi", "Nisha", "Gaurav", "Aishwarya", "Sanjay",
  "Lakshmi", "Abhinav", "Tanvi", "Harsh", "Keerthi", "Yash", "Sowmya", "Pranav", "Ritika", "Vivek",
];

const LAST = [
  "Kumar", "Sharma", "Reddy", "Singh", "Patel", "Nair", "Iyer", "Mehta", "Krishnan", "Rao",
  "Joshi", "Malhotra", "Desai", "Gupta", "Verma", "Kapoor", "Bansal", "Tiwari", "Chopra", "Agarwal",
  "Menon", "Pillai", "Bhat", "Saxena", "Ghosh", "Das", "Kulkarni", "Jain", "Choudhary", "Pandey",
];

const COLLEGES = [
  "RV Institute of Technology", "JNTU Hyderabad", "Osmania University", "Andhra University", "VIT Vellore", "SRM Chennai",
  "Anna University", "NIT Warangal", "NIT Trichy", "BITS Hyderabad", "KL University",
  "CBIT Hyderabad", "Vasavi College of Engineering", "CVR College", "Gokaraju Rangaraju",
  "MVSR Engineering", "Chaitanya Bharathi",
];

const DEVICES = ["iPhone 14", "iPhone 15", "Samsung S24", "Pixel 8", "OnePlus 12", "iPad Air", "MacBook Air"];
const AGENTS = [
  "Chrome / macOS", "Chrome / Windows", "Safari / iOS", "Chrome / Android", "Edge / Windows", "Firefox / macOS",
];
const IPS = ["192.168.14.22", "192.168.8.41", "103.210.44.18", "103.77.12.90", "49.37.8.122", "117.192.64.11"];

const UNI_DE = [
  ["Technical University of Munich", "Munich"],
  ["RWTH Aachen University", "Aachen"],
  ["University of Stuttgart", "Stuttgart"],
  ["TU Berlin", "Berlin"],
  ["Heidelberg University", "Heidelberg"],
  ["University of Cologne", "Cologne"],
  ["TU Darmstadt", "Darmstadt"],
  ["University of Hamburg", "Hamburg"],
  ["Karlsruhe Institute of Technology", "Karlsruhe"],
  ["University of Freiburg", "Freiburg"],
  ["TU Dresden", "Dresden"],
  ["University of Bonn", "Bonn"],
];
const UNI_UK = [
  ["University of Manchester", "Manchester"],
  ["University of Birmingham", "Birmingham"],
  ["University of Leeds", "Leeds"],
  ["University of Glasgow", "Glasgow"],
  ["University of Sheffield", "Sheffield"],
  ["King's College London", "London"],
  ["University of Edinburgh", "Edinburgh"],
  ["University of Bristol", "Bristol"],
  ["University of Nottingham", "Nottingham"],
  ["Queen Mary University of London", "London"],
];
const UNI_US = [
  ["Arizona State University", "Tempe"],
  ["Northeastern University", "Boston"],
  ["University of Texas at Dallas", "Dallas"],
  ["New York University", "New York"],
  ["University of Illinois Chicago", "Chicago"],
  ["San Jose State University", "San Jose"],
  ["University of Florida", "Gainesville"],
  ["Boston University", "Boston"],
  ["University of Southern California", "Los Angeles"],
  ["Purdue University", "West Lafayette"],
];

const COURSES: Record<string, string[]> = {
  "Computer Science": ["M.Sc. Computer Science", "M.Sc. Informatics", "MS CS"],
  "Data Science": ["M.Sc. Data Science", "M.Sc. Data Engineering", "MS Data Analytics"],
  "Mechanical Engineering": ["M.Sc. Mechanical Engineering", "M.Sc. Automotive", "MS ME"],
  "Electrical Engineering": ["M.Sc. Electrical Engineering", "M.Sc. Power Engineering"],
  "Business Administration": ["MBA", "M.Sc. Management", "M.Sc. Business Analytics"],
  Finance: ["M.Sc. Finance", "M.Sc. Accounting & Finance"],
  "Electronics & Communication": ["M.Sc. Embedded Systems", "M.Sc. Communications Engineering"],
  Biotechnology: ["M.Sc. Biotechnology", "M.Sc. Molecular Biology"],
  "Civil Engineering": ["M.Sc. Civil Engineering", "M.Sc. Structural Engineering"],
  Architecture: ["M.Arch", "M.Sc. Urban Design"],
};

const TASKS = [
  "Submit Uni-Assist",
  "Collect APS certificate",
  "Upload SOP draft",
  "Follow up on offer",
  "Verify transcripts",
  "Blocked account application",
  "Pay remaining fee",
  "Book visa slot",
  "Courier documents",
  "Update IELTS score",
];

const PIPELINES: LeadPipeline[] = ["New", "Shortlisting", "Applications", "Offer", "Visa"];

function intakePrefix(intake: Intake) {
  if (intake.startsWith("Winter")) return "W" + intake.slice(-2);
  if (intake.startsWith("Summer")) return "S" + intake.slice(-2);
  if (intake.startsWith("January")) return "JAN";
  return "SP" + intake.slice(-2);
}

function weightedStatus(r: () => number): ApplicationStatus {
  const x = r();
  if (x < 0.16) return "Shortlisting Sent";
  if (x < 0.38) return "Applications Started";
  if (x < 0.46) return "Applications on Hold";
  if (x < 0.62) return "Offered";
  if (x < 0.72) return "Waiting";
  if (x < 0.78) return "Deferred";
  if (x < 0.84) return "Dropped";
  if (x < 0.88) return "Private Registered";
  if (x < 0.91) return "Private Shifted";
  if (x < 0.94) return "Still Thinking";
  return "Got Visa";
}

function paymentFromAmounts(total: number, paid: number, discount: number): PaymentStatus {
  if (paid >= total - discount) return "Paid";
  if (paid <= 0) return "Pending";
  if (paid < total * 0.25) return "Overdue";
  return "Partially Paid";
}

export function createSeed(now = Date.now()) {
  const r = rng(26_09_2026);

  const employees: User[] = [
    { id: "EMP-001", name: "Hari", email: "admin@demo.com", phone: "+91 98480 11001", role: "admin", title: "Administrator", department: "Operations", status: "Active", lastActive: iso(now - 8 * 60000), joinedAt: iso(now - 860 * 86400000), avatarHue: 210 },
    { id: "EMP-002", name: "Nagaraju", email: "employee@demo.com", phone: "+91 98480 11002", role: "employee", title: "Senior Counselor", department: "Germany Desk", status: "Active", lastActive: iso(now - 12 * 60000), joinedAt: iso(now - 640 * 86400000), avatarHue: 188 },
    { id: "EMP-003", name: "Bhavani", email: "bhavani@meridian.edu", phone: "+91 98480 11003", role: "employee", title: "Counselor", department: "Germany Desk", status: "Active", lastActive: iso(now - 40 * 60000), joinedAt: iso(now - 500 * 86400000), avatarHue: 320 },
    { id: "EMP-004", name: "Bharathi", email: "bharathi@meridian.edu", phone: "+91 98480 11004", role: "employee", title: "Counselor", department: "UK Desk", status: "Active", lastActive: iso(now - 90 * 60000), joinedAt: iso(now - 430 * 86400000), avatarHue: 12 },
    { id: "EMP-005", name: "Sony", email: "sony@meridian.edu", phone: "+91 98480 11005", role: "employee", title: "Counselor", department: "USA Desk", status: "Active", lastActive: iso(now - 25 * 60000), joinedAt: iso(now - 380 * 86400000), avatarHue: 145 },
    { id: "EMP-006", name: "Nagamani", email: "nagamani@meridian.edu", phone: "+91 98480 11006", role: "employee", title: "Lead Coordinator", department: "Admissions", status: "Active", lastActive: iso(now - 110 * 60000), joinedAt: iso(now - 300 * 86400000), avatarHue: 265 },
    { id: "EMP-007", name: "Chaitanya", email: "chaitanya@meridian.edu", phone: "+91 98480 11007", role: "employee", title: "Counselor", department: "Germany Desk", status: "Active", lastActive: iso(now - 3 * 3600000), joinedAt: iso(now - 280 * 86400000), avatarHue: 28 },
    { id: "EMP-008", name: "Swaroopa", email: "swaroopa@meridian.edu", phone: "+91 98480 11008", role: "employee", title: "Documentation Lead", department: "Operations", status: "Active", lastActive: iso(now - 5 * 3600000), joinedAt: iso(now - 220 * 86400000), avatarHue: 198 },
    { id: "EMP-009", name: "Anil", email: "anil@meridian.edu", phone: "+91 98480 11009", role: "employee", title: "Counselor", department: "UK Desk", status: "Active", lastActive: iso(now - 26 * 3600000), joinedAt: iso(now - 200 * 86400000), avatarHue: 88 },
    { id: "EMP-010", name: "Sravya", email: "sravya@meridian.edu", phone: "+91 98480 11010", role: "employee", title: "Counselor", department: "USA Desk", status: "Active", lastActive: iso(now - 4 * 3600000), joinedAt: iso(now - 160 * 86400000), avatarHue: 340 },
    { id: "EMP-011", name: "Nikhila", email: "nikhila@meridian.edu", phone: "+91 98480 11011", role: "employee", title: "Counselor", department: "Germany Desk", status: "Active", lastActive: iso(now - 50 * 60000), joinedAt: iso(now - 120 * 86400000), avatarHue: 55 },
    { id: "EMP-012", name: "Deepak", email: "deepak@meridian.edu", phone: "+91 98480 11012", role: "employee", title: "Finance Associate", department: "Finance", status: "Active", lastActive: iso(now - 8 * 3600000), joinedAt: iso(now - 90 * 86400000), avatarHue: 170 },
    { id: "EMP-013", name: "Lakshmi", email: "lakshmi@meridian.edu", phone: "+91 98480 11013", role: "employee", title: "Counselor", department: "Admissions", status: "Active", lastActive: iso(now - 2 * 86400000), joinedAt: iso(now - 70 * 86400000), avatarHue: 300 },
    { id: "EMP-014", name: "Ramesh", email: "ramesh@meridian.edu", phone: "+91 98480 11014", role: "employee", title: "University Relations", department: "Partnerships", status: "Inactive", lastActive: iso(now - 18 * 86400000), joinedAt: iso(now - 400 * 86400000), avatarHue: 40 },
    { id: "EMP-015", name: "Kavitha", email: "kavitha@meridian.edu", phone: "+91 98480 11015", role: "employee", title: "Counselor", department: "UK Desk", status: "Active", lastActive: iso(now - 6 * 3600000), joinedAt: iso(now - 45 * 86400000), avatarHue: 220 },
    { id: "EMP-016", name: "Praveen", email: "praveen@meridian.edu", phone: "+91 98480 11016", role: "employee", title: "Junior Counselor", department: "Admissions", status: "Active", lastActive: iso(now - 80 * 60000), joinedAt: iso(now - 20 * 86400000), avatarHue: 130 },
  ];

  const counselors = employees.filter((e) => e.role === "employee" && e.status === "Active");

  const universities: University[] = [];
  const uniRows: Array<[string, string, Country]> = [
    ...UNI_DE.map(([n, l]) => [n, l, "Germany"] as [string, string, Country]),
    ...UNI_UK.map(([n, l]) => [n, l, "UK"] as [string, string, Country]),
    ...UNI_US.map(([n, l]) => [n, l, "USA"] as [string, string, Country]),
  ];
  uniRows.forEach(([name, location, country], i) => {
    const branch = name.includes("Munich") ? "Computer Science" : BRANCHES[i % BRANCHES.length]!;
    const course = name.includes("Munich")
      ? "M.Sc. Computer Science"
      : pick(r, COURSES[branch] ?? ["M.Sc. Engineering"]);
    const intake = pick(r, INTAKES);
    universities.push({
      id: `UNI-${pad(i + 1)}`,
      name,
      location,
      country,
      course,
      branch,
      intake,
      ielts: country === "Germany" ? pick(r, [6, 6.5, 7]) : pick(r, [6.5, 7, 7.5]),
      toefl: country === "USA" ? pick(r, [80, 90, 100]) : pick(r, [72, 79, 88, 94]),
      germanLanguage: country === "Germany" ? pick(r, ["A2", "B1", "B2"]) : "None",
      gre: country === "USA" ? pick(r, ["Optional", "300+", "310+", "Not required"]) : "Not required",
      germanGrade: country === "Germany" ? Number((1.8 + r() * 1.4).toFixed(1)) : 2.5,
      applicationVia: country === "Germany" ? pick(r, ["Uni-Assist", "Direct", "Hochschulstart"]) : country === "UK" ? "UCAS / Direct" : "University portal",
      applicationFee: country === "Germany" ? pick(r, [0, 75, 100]) : country === "UK" ? pick(r, [0, 28, 60]) : pick(r, [50, 75, 85, 125]),
      deadline: iso(now + (20 + Math.floor(r() * 140)) * 86400000),
      tuitionFees: country === "Germany" ? pick(r, [0, 3000, 4500, 12000, 18000]) * 90 : country === "UK" ? pick(r, [18000, 22000, 26500, 31000]) * 105 : pick(r, [28000, 34000, 42000, 52000]) * 83,
      moi: r() > 0.35,
      documentsCourier: country === "Germany" ? pick(r, ["Required", "Not required", "After offer"]) : "Not required",
      aptitudeTest: country === "USA" ? pick(r, ["GRE optional", "None"]) : country === "Germany" ? pick(r, ["None", "TestAS optional"]) : "None",
      archived: i === uniRows.length - 1,
    });
  });

  const featured = ["Rahul Kumar", "Priya Sharma", "Ananya Reddy", "Vikram Singh", "Sneha Patel", "Arjun Nair"];
  const names: string[] = [...featured];
  const used = new Set(featured);
  while (names.length < 72) {
    const n = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    if (!used.has(n)) {
      used.add(n);
      names.push(n);
    }
  }

  const counters: Record<string, number> = { W26: 1 };
  const students: Student[] = names.map((name, i) => {
    const country: Country = i === 0 ? "Germany" : i % 10 < 5 ? "Germany" : i % 10 < 8 ? "UK" : "USA";
    const intake: Intake = i === 0 ? "Winter 2026" : pick(r, INTAKES);
    const prefix = intakePrefix(intake);
    let id: string;
    if (i === 0) {
      id = "W26_001";
    } else {
      counters[prefix] = (counters[prefix] ?? 0) + 1;
      id = `${prefix}_${pad(counters[prefix]!)}`;
    }
    const status = i < 6
      ? (["Applications Started", "Offered", "Got Visa", "Waiting", "Shortlisting Sent", "Applications Started"][i] as ApplicationStatus)
      : weightedStatus(r);
    const branch = pick(r, BRANCHES);
    const totalFee = pick(r, [75000, 85000, 100000, 120000, 150000]);
    const discount = r() > 0.7 ? pick(r, [5000, 8000, 10000, 15000]) : 0;
    const paidRatio = status === "Dropped" ? r() * 0.2 : 0.2 + r() * 0.8;
    const paidAmount = Math.min(totalFee - discount, Math.round((totalFee * paidRatio) / 1000) * 1000);
    const employee = i < 12 ? counselors[1 % counselors.length] : pick(r, counselors);
    // First 12 students assigned to Nagaraju so the employee demo is rich
    const assigned = i < 12 ? employees.find((e) => e.id === "EMP-002")! : employee!;
    const createdAt = now - Math.floor((20 + r() * 250) * 86400000);
    const updatedAt = now - Math.floor(r() * 12 * 86400000);
    const slug = name.toLowerCase().replaceAll(" ", ".");
    const germany = country === "Germany";
    return {
      id,
      name,
      email: `${slug}@gmail.com`,
      phone1: phone(r),
      phone2: r() > 0.55 ? phone(r) : "",
      country,
      intake,
      branch,
      college: pick(r, COLLEGES),
      employeeId: assigned.id,
      status,
      paymentStatus: paymentFromAmounts(totalFee, paidAmount, discount),
      createdAt: iso(createdAt),
      updatedAt: iso(Math.max(createdAt, updatedAt)),
      cgpa: Number((6.8 + r() * 2.6).toFixed(2)),
      ielts: r() > 0.15 ? Number((6 + r() * 2.5).toFixed(1)) : undefined,
      toefl: country === "USA" || r() > 0.7 ? Math.round(78 + r() * 30) : undefined,
      duolingo: r() > 0.8 ? Math.round(105 + r() * 40) : undefined,
      germanGrade: germany ? Number((1.6 + r() * 1.8).toFixed(1)) : undefined,
      gre: country === "USA" && r() > 0.4 ? Math.round(300 + r() * 28) : undefined,
      germanLanguage: germany ? pick(r, ["A1", "A2", "B1", "B2"]) : "None",
      gmailId: `${slug}@gmail.com`,
      gmailPassword: `Meridian!${pad(i + 11, 2)}`,
      recoveryNumber: phone(r),
      device: pick(r, DEVICES),
      twoStep: r() > 0.35,
      apsUsername: germany ? `aps.${slug.split(".")[0]}` : undefined,
      apsPassword: germany ? `Aps#${pad(i + 21, 2)}` : undefined,
      uniAssistId: germany ? `UA${800000 + i}` : undefined,
      uniAssistPassword: germany ? `Ua@${pad(i + 31, 2)}` : undefined,
      uniAssistDocuments: germany ? (r() > 0.4 ? "Uploaded" : "Not Uploaded") : undefined,
      blockedAccount: germany ? (r() > 0.55 ? "Applied" : "Not Applied") : undefined,
      enrollment: germany ? (status === "Got Visa" || r() > 0.75 ? "Applied" : "Not Applied") : undefined,
      studentDorm: germany ? (r() > 0.7 ? "Applied" : "Not Applied") : undefined,
      totalFee,
      paidAmount,
      discount,
      leadType: r() > 0.78 ? "B2B" : "Direct",
      b2bOrg: undefined,
      notes: "",
      avatarHue: hue(r),
    } satisfies Student;
  });

  const rahul = students[0];
  if (rahul) {
    const clash = students.findIndex((s, i) => i !== 0 && s.id === "W26_001");
    if (clash >= 0) students[clash]!.id = `W26_${pad(90 + clash)}`;
    Object.assign(rahul, {
      id: "W26_001",
      name: "Rahul Kumar",
      email: "rahul.kumar@gmail.com",
      gmailId: "rahul.kumar@gmail.com",
      country: "Germany",
      intake: "Winter 2026",
      branch: "Computer Science",
      college: "RV Institute of Technology",
      employeeId: "EMP-002",
      status: "Applications Started",
      paidAmount: 8500,
      totalFee: 8500,
      discount: 0,
      paymentStatus: "Paid",
    } satisfies Partial<Student>);
  }

  const kolluru = students[1];
  if (kolluru) {
    Object.assign(kolluru, {
      id: "24HU1A05C6",
      name: "H C S Kolluru",
      email: "hcskolluru@gmail.com",
      gmailId: "hcskolluru@gmail.com",
      phone1: "+916305781406",
      country: "Germany",
      intake: "Winter 2026",
      branch: "Computer Science",
      college: "RV Institute of Technology",
      employeeId: "EMP-002",
      status: "Applications Started",
      paidAmount: 8500,
      totalFee: 8500,
      discount: 0,
      paymentStatus: "Paid",
    } satisfies Partial<Student>);
  }

  students.forEach((s) => {
    if (s.leadType === "B2B") {
      s.b2bOrg = pick(r, ["EdVista Partners", "Global Path Academy", "Horizon Overseas", "Brightway Consultants", "Aarambh Education"]);
    }
  });

  const applications: Application[] = [];
  let appN = 1;
  students.forEach((s) => {
    const pool = universities.filter((u) => u.country === s.country && !u.archived);
    const tum = universities.find((u) => u.name.includes("Munich"));
    const count = 1 + Math.floor(r() * 3);
    let chosen = pickN(r, pool, Math.min(count, pool.length));
    if (s.id === "W26_001" && tum) {
      chosen = [tum, ...chosen.filter((u) => u.id !== tum.id)].slice(0, Math.max(2, chosen.length));
    }
    chosen.forEach((u, idx) => {
      const submitted = s.status !== "Shortlisting Sent" && s.status !== "Still Thinking";
      applications.push({
        id: `APP-${pad(appN++, 4)}`,
        studentId: s.id,
        universityId: u.id,
        course: u.course,
        country: u.country,
        status: idx === 0 ? s.status : pick(r, APPLICATION_STATUSES),
        submittedAt: submitted ? iso(now - Math.floor(r() * 60) * 86400000) : undefined,
        offerReceived: s.status === "Offered" || s.status === "Got Visa" || s.status === "Waiting" ? idx === 0 : r() > 0.85,
        deadline: u.deadline,
        employeeId: s.employeeId,
        createdAt: s.createdAt,
      });
    });
  });

  const payments: PaymentRecord[] = students.map((s, i) => ({
    id: `PAY-${pad(i + 1, 3)}`,
    studentId: s.id,
    totalFee: s.totalFee,
    initialPayment: Math.min(s.paidAmount, Math.round(s.totalFee * 0.4)),
    remaining: Math.max(0, s.totalFee - s.discount - s.paidAmount),
    discount: s.discount,
    status: s.paymentStatus,
    lastPayment: s.paidAmount > 0 ? s.updatedAt : undefined,
    method: s.paidAmount > 0 ? pick(r, ["UPI", "NEFT", "Card", "Cash"]) : undefined,
  }));

  const leads: Lead[] = Array.from({ length: 32 }, (_, i) => {
    const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    const pipeline = pick(r, PIPELINES);
    const type = r() > 0.7 ? "B2B" : "Direct";
    const created = now - Math.floor(r() * 40) * 86400000;
    return {
      id: `LD-${pad(i + 1, 3)}`,
      name,
      email: `${name.toLowerCase().replaceAll(" ", ".")}@gmail.com`,
      phone: phone(r),
      country: pick(r, ["Germany", "UK", "USA"] as const),
      intake: pick(r, INTAKES),
      employeeId: i < 6 ? "EMP-002" : pick(r, counselors).id,
      type,
      b2bOrg: type === "B2B" ? pick(r, ["EdVista Partners", "Global Path Academy", "Horizon Overseas", "Brightway Consultants"]) : undefined,
      pipeline,
      status: pipeline,
      createdAt: iso(created),
      updatedAt: iso(created + Math.floor(r() * 8) * 86400000),
      notes: "",
    };
  });

  const documents: StudentDocument[] = [];
  const documentVersions: DocumentVersion[] = [];
  const documentActivities: DocumentActivity[] = [];
  const portals: StudentDocumentPortal[] = [];
  const portalAccessLogs: PortalAccessLog[] = [];
  let docN = 1;
  let verN = 1;
  let actN = 1;

  const tum = universities.find((u) => u.name.includes("Munich")) ?? universities.find((u) => u.country === "Germany");

  function pushActivity(
    documentId: string,
    studentId: string,
    actor: string,
    actorRole: DocumentActivity["actorRole"],
    action: string,
    timestamp: string,
    detail?: string,
  ) {
    documentActivities.push({
      id: `DA-${pad(actN++, 4)}`,
      documentId,
      studentId,
      actor,
      actorRole,
      action,
      detail,
      timestamp,
    });
  }

  students.forEach((s, si) => {
    const extras =
      s.id === "W26_001" && tum
        ? [{ type: "SOP", required: true, universityId: tum.id, universityName: tum.name, course: tum.course }]
        : s.country === "Germany" && tum && r() > 0.72
          ? [{ type: "SOP", required: true, universityId: tum.id, universityName: tum.name, course: tum.course }]
          : [];
    const reqs = buildRequirementDocs(s, extras, iso(now));
    reqs.forEach((req, ri) => {
      const id = `DOC-${pad(docN++, 4)}`;
      let status: DocumentStatus = "pending";
      let uploadedBy: string | undefined;
      let uploadedByRole: StudentDocument["uploadedByRole"];
      let uploadedAt: string | undefined;
      let fileName: string | undefined;
      let fileType: string | undefined;
      let fileSize: string | undefined;
      let version = 0;
      const due =
        ri % 4 === 1 ? iso(now + (3 + Math.floor(r() * 18)) * 86400000) : ri % 7 === 0 ? iso(now - 2 * 86400000) : undefined;

      if (s.id === "W26_001") {
        const script: Array<{ status: DocumentStatus; by: "Nagaraju" | "Rahul Kumar"; role: "employee" | "student"; days: number }> = [
          { status: "verified", by: "Nagaraju", role: "employee", days: 0 },
          { status: "under_review", by: "Rahul Kumar", role: "student", days: 0 },
          { status: "verified", by: "Nagaraju", role: "employee", days: 1 },
          { status: "pending", by: "Nagaraju", role: "employee", days: 0 },
          { status: "uploaded", by: "Nagaraju", role: "employee", days: 2 },
          { status: "under_review", by: "Rahul Kumar", role: "student", days: 0 },
          { status: "verified", by: "Nagaraju", role: "employee", days: 3 },
          { status: "verified", by: "Nagaraju", role: "employee", days: 4 },
          { status: "pending", by: "Nagaraju", role: "employee", days: 0 },
          { status: "verified", by: "Nagaraju", role: "employee", days: 5 },
          { status: "verified", by: "Nagaraju", role: "employee", days: 6 },
          { status: "uploaded", by: "Rahul Kumar", role: "student", days: 0 },
          { status: "pending", by: "Nagaraju", role: "employee", days: 0 },
        ];
        const row = script[ri] ?? { status: "pending" as const, by: "Nagaraju" as const, role: "employee" as const, days: 0 };
        status = row.status;
        if (status !== "pending") {
          uploadedBy = row.by;
          uploadedByRole = row.role;
          uploadedAt = iso(now - row.days * 86400000 - 90 * 60000);
          fileName = `${req.type.replaceAll(" ", "-")}.pdf`;
          fileType = "application/pdf";
          fileSize = `${(0.6 + r() * 2.4).toFixed(1)} MB`;
          version = req.type === "Passport" ? 2 : 1;
        }
      } else {
        const roll = r();
        if (roll > 0.22) {
          status = roll > 0.72 ? "verified" : roll > 0.5 ? "under_review" : roll > 0.38 ? "uploaded" : roll > 0.3 ? "rejected" : "uploaded";
          uploadedBy = r() > 0.55 ? s.name : employees.find((e) => e.id === s.employeeId)?.name ?? "Nagaraju";
          uploadedByRole = uploadedBy === s.name ? "student" : "employee";
          uploadedAt = iso(now - Math.floor(r() * 40) * 86400000);
          fileName = `${req.type.replaceAll(" ", "-")}.${r() > 0.85 ? "jpg" : "pdf"}`;
          fileType = fileName.endsWith(".jpg") ? "image/jpeg" : "application/pdf";
          fileSize = `${(0.4 + r() * 3.6).toFixed(1)} MB`;
          version = 1;
        } else if (r() > 0.92) {
          status = "expired";
        }
      }

      const doc: StudentDocument = {
        ...req,
        id,
        status,
        uploadedBy,
        uploadedByRole,
        uploadedAt,
        fileName,
        fileType,
        fileSize,
        version,
        dueDate: due,
        rejectReason: status === "rejected" ? "Document unclear" : undefined,
        updatedAt: uploadedAt ?? req.updatedAt,
      };
      documents.push(doc);

      if (version > 0 && fileName) {
        for (let v = 1; v <= version; v++) {
          documentVersions.push({
            id: `VER-${pad(verN++, 4)}`,
            documentId: id,
            studentId: s.id,
            version: v,
            fileName,
            fileType: fileType ?? "application/pdf",
            fileSize: fileSize ?? "1.0 MB",
            uploadedBy: v === version ? (uploadedBy ?? "Nagaraju") : "Nagaraju",
            uploadedByRole: v === version ? (uploadedByRole ?? "employee") : "employee",
            uploadedAt: iso((uploadedAt ? new Date(uploadedAt).getTime() : now) - (version - v) * 86400000),
          });
        }
        pushActivity(id, s.id, uploadedBy ?? "Nagaraju", uploadedByRole ?? "employee", "uploaded document", uploadedAt ?? iso(now), fileName);
        if (status === "verified") {
          pushActivity(id, s.id, "Nagaraju", "employee", "verified document", iso(now - 45 * 60000));
        }
        if (status === "rejected") {
          pushActivity(id, s.id, "Nagaraju", "employee", "rejected document", iso(now - 20 * 60000), "Document unclear");
        }
      }
    });

    if (s.id === "W26_001" || (si < 10 && r() > 0.35)) {
      const token = s.id === "W26_001" ? "Ab92Xk7Pq82Lm" : `Tk${pad(si, 3)}${Math.floor(r() * 90000 + 10000)}`;
      const portal: StudentDocumentPortal = {
        id: `PRT-${pad(si + 1, 3)}`,
        studentId: s.id,
        accessMethod: s.id === "W26_001" ? "email_and_link" : r() > 0.5 ? "link_only" : "email_and_link",
        email: s.email,
        token,
        status: "active",
        expiresAt: iso(now + 7 * 86400000),
        permissions: { ...DEFAULT_PORTAL_PERMISSIONS },
        createdAt: iso(now - 2 * 86400000),
        lastAccessedAt: s.id === "W26_001" ? iso(now - 28 * 60000) : undefined,
      };
      portals.push(portal);
      if (s.id === "W26_001") {
        portalAccessLogs.push(
          { id: "PAL-001", portalId: portal.id, studentId: s.id, actor: s.name, action: "accessed portal", timestamp: iso(now - 28 * 60000) },
          { id: "PAL-002", portalId: portal.id, studentId: s.id, actor: s.name, action: "uploaded Transcript.pdf", timestamp: iso(now - 26 * 60000) },
          { id: "PAL-003", portalId: portal.id, studentId: s.id, actor: s.name, action: "uploaded Passport.pdf", timestamp: iso(now - 23 * 60000) },
        );
      }
    }
  });

  const workItems: WorkItem[] = [];
  const nagarajuStudents = students.filter((s) => s.employeeId === "EMP-002");
  nagarajuStudents.slice(0, 8).forEach((s, i) => {
    workItems.push({
      id: `WQ-${pad(i + 1, 3)}`,
      studentId: s.id,
      studentName: s.name,
      task: TASKS[i % TASKS.length]!,
      priority: i < 3 ? "High" : i < 6 ? "Medium" : "Low",
      deadline: iso(now + (i - 1) * 86400000),
      status: i === 2 ? "In Progress" : "Pending",
      employeeId: "EMP-002",
    });
  });
  students.filter((s) => s.employeeId !== "EMP-002").slice(0, 10).forEach((s, i) => {
    workItems.push({
      id: `WQ-${pad(i + 20, 3)}`,
      studentId: s.id,
      studentName: s.name,
      task: pick(r, TASKS),
      priority: pick(r, ["High", "Medium", "Low"] as const),
      deadline: iso(now + Math.floor(r() * 10 - 2) * 86400000),
      status: "Pending",
      employeeId: s.employeeId,
    });
  });

  const auditEvents: AuditEvent[] = [];
  const modules = ["Students", "Applications", "Payments", "Universities", "Employees", "Leads", "Reports"];
  const actions = [
    { action: "CREATE" as const, severity: "SUCCESS" as AuditSeverity, details: "Created student" },
    { action: "STATUS_CHANGE" as const, severity: "WARNING" as AuditSeverity, details: "Updated application status" },
    { action: "PAYMENT_UPDATE" as const, severity: "WARNING" as AuditSeverity, details: "Recorded payment" },
    { action: "UPDATE" as const, severity: "INFO" as AuditSeverity, details: "Updated student profile" },
    { action: "UNIVERSITY_UPDATE" as const, severity: "INFO" as AuditSeverity, details: "Updated university record" },
    { action: "EMPLOYEE_ASSIGN" as const, severity: "INFO" as AuditSeverity, details: "Reassigned counselor" },
    { action: "LOGIN" as const, severity: "INFO" as AuditSeverity, details: "Signed in" },
    { action: "EXPORT" as const, severity: "INFO" as AuditSeverity, details: "Exported report" },
    { action: "DELETE" as const, severity: "CRITICAL" as AuditSeverity, details: "Deleted draft record" },
    { action: "VIEW" as const, severity: "INFO" as AuditSeverity, details: "Viewed student credentials" },
  ];

  for (let i = 0; i < 220; i++) {
    const actor = i % 17 === 0 ? employees[0]! : pick(r, counselors);
    const student = pick(r, students);
    const spec = pick(r, actions);
    const ts = now - Math.floor(r() * (i < 48 ? 16 : 30 * 24) * 3600000);
    const before = spec.action === "STATUS_CHANGE" ? pick(r, APPLICATION_STATUSES) : spec.action === "PAYMENT_UPDATE" ? "Pending" : undefined;
    const after = spec.action === "STATUS_CHANGE" ? student.status : spec.action === "PAYMENT_UPDATE" ? student.paymentStatus : undefined;
    auditEvents.push({
      id: `AUD-${800000 + i}`,
      timestamp: iso(ts),
      user: actor.name,
      userId: actor.id,
      role: actor.role,
      action: spec.action,
      module: spec.action === "LOGIN" ? "Auth" : spec.action === "UNIVERSITY_UPDATE" ? "Universities" : spec.action === "EXPORT" ? "Reports" : pick(r, modules),
      recordId: spec.action === "LOGIN" ? actor.id : student.id,
      before,
      after,
      details: spec.details,
      severity: spec.severity,
      ip: pick(r, IPS),
      userAgent: pick(r, AGENTS),
    });
  }
  auditEvents.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  // Pin a few highly readable recent events
  auditEvents.unshift(
    {
      id: "AUD-DOC-1",
      timestamp: iso(now - 23 * 60000),
      user: "Rahul Kumar",
      userId: "W26_001",
      role: "student",
      action: "STUDENT_UPLOADED_DOCUMENT",
      module: "Documents",
      recordId: "W26_001",
      details: "Uploaded document Transcript.pdf",
      after: "under_review",
      severity: "SUCCESS",
      ip: "49.37.8.122",
      userAgent: "Chrome / Android",
    },
    {
      id: "AUD-DOC-2",
      timestamp: iso(now - 15 * 60000),
      user: "Nagaraju",
      userId: "EMP-002",
      role: "employee",
      action: "PORTAL_CREATED",
      module: "Documents",
      recordId: "W26_001",
      details: "Created student upload portal · Access: Email + Link",
      after: "email_and_link",
      severity: "SUCCESS",
      ip: "192.168.14.22",
      userAgent: "Chrome / Android",
    },
    {
      id: "AUD-DOC-3",
      timestamp: iso(now - 45 * 60000),
      user: "Nagaraju",
      userId: "EMP-002",
      role: "employee",
      action: "DOCUMENT_VERIFIED",
      module: "Documents",
      recordId: "W26_001",
      details: "Verified Passport.pdf",
      before: "under_review",
      after: "verified",
      severity: "SUCCESS",
      ip: "192.168.14.22",
      userAgent: "Chrome / Android",
    },
    {
      id: "AUD-DOC-4",
      timestamp: iso(now - 70 * 60000),
      user: "Priya Sharma",
      userId: students[1]!.id,
      role: "student",
      action: "STUDENT_REPLACED_DOCUMENT",
      module: "Documents",
      recordId: students[1]!.id,
      details: "Replaced Passport.pdf",
      before: "rejected",
      after: "under_review",
      severity: "INFO",
      ip: "103.210.44.18",
      userAgent: "Chrome / Windows",
    },
    {
      id: "AUD-829182",
      timestamp: iso(now - 15 * 60000),
      user: "Nagaraju",
      userId: "EMP-002",
      role: "employee",
      action: "STATUS_CHANGE",
      module: "Students",
      recordId: students[0]!.id,
      before: "Applications Started",
      after: "Offered",
      details: "Updated student status",
      severity: "WARNING",
      ip: "192.168.14.22",
      userAgent: "Chrome / Android",
    },
    {
      id: "AUD-829183",
      timestamp: iso(now - 29 * 60000),
      user: "Priya Sharma",
      userId: "EMP-003",
      role: "employee",
      action: "CREATE",
      module: "Students",
      recordId: students[1]!.id,
      details: "Registered a new student",
      severity: "SUCCESS",
      ip: "103.210.44.18",
      userAgent: "Chrome / Windows",
    },
    {
      id: "AUD-829184",
      timestamp: iso(now - 63 * 60000),
      user: "Hari",
      userId: "EMP-001",
      role: "admin",
      action: "UNIVERSITY_UPDATE",
      module: "Universities",
      recordId: universities[0]!.id,
      details: "Updated university eligibility data",
      severity: "INFO",
      ip: "192.168.8.41",
      userAgent: "Chrome / macOS",
    },
  );

  const notifications: AppNotification[] = [
    { id: "NT-1", title: "New student registered", body: `${students[1]!.name} was added to Winter 2026.`, timestamp: iso(now - 18 * 60000), read: false, href: `/admin/students/${students[1]!.id}`, kind: "student" },
    { id: "NT-2", title: "Payment pending", body: `Balance remaining for ${students[0]!.name}.`, timestamp: iso(now - 42 * 60000), read: false, href: `/admin/payments`, kind: "payment" },
    { id: "NT-3", title: "Application deadline approaching", body: `${universities[2]!.name} deadline is in 6 days.`, timestamp: iso(now - 2 * 3600000), read: false, href: `/admin/universities`, kind: "application" },
    { id: "NT-4", title: "Offer received", body: `${students[0]!.name} received an offer.`, timestamp: iso(now - 5 * 3600000), read: false, href: `/admin/students/${students[0]!.id}`, kind: "application" },
    { id: "NT-5", title: "Status changed", body: `Nagaraju updated ${students[0]!.id} to Offered.`, timestamp: iso(now - 15 * 60000), read: false, href: `/admin/audit`, kind: "student" },
    { id: "NT-6", title: "Visa received", body: `${students[2]!.name} received a visa.`, timestamp: iso(now - 26 * 3600000), read: false, href: `/admin/students/${students[2]!.id}`, kind: "application" },
    { id: "NT-7", title: "Overdue payment", body: `A student payment marked overdue needs review.`, timestamp: iso(now - 30 * 3600000), read: false, href: `/admin/payments`, kind: "payment" },
    { id: "NT-8", title: "University data updated", body: "TUM eligibility thresholds were revised.", timestamp: iso(now - 2 * 86400000), read: true, href: `/admin/universities`, kind: "system" },
    { id: "NT-9", title: "Weekly report ready", body: "Employee performance report is available to export.", timestamp: iso(now - 3 * 86400000), read: true, href: `/admin/reports`, kind: "system" },
    { id: "NT-10", title: "Rahul uploaded Transcript.pdf", body: "A student upload is waiting for review.", timestamp: iso(now - 26 * 60000), read: false, href: `/admin/students/W26_001`, kind: "document" },
    { id: "NT-11", title: "Priya replaced Passport.pdf", body: "A replacement file was submitted.", timestamp: iso(now - 70 * 60000), read: false, href: `/admin/students/${students[1]!.id}`, kind: "document" },
    { id: "NT-12", title: "A document request is overdue", body: "SOP for Rahul Kumar is past its due date.", timestamp: iso(now - 3 * 3600000), read: false, href: `/admin/documents`, kind: "document" },
    { id: "NT-13", title: "Student portal expires tomorrow", body: "Rahul Kumar’s upload portal expires in 24 hours.", timestamp: iso(now - 5 * 3600000), read: false, href: `/admin/students/W26_001`, kind: "document" },
    { id: "NT-14", title: "Student completed document submission", body: `${students[2]!.name} submitted all requested documents.`, timestamp: iso(now - 9 * 3600000), read: false, href: `/admin/students/${students[2]!.id}`, kind: "document" },
    { id: "NT-15", title: "Document rejected by Nagaraju", body: "A document was rejected and a replacement was requested.", timestamp: iso(now - 11 * 3600000), read: false, href: `/admin/documents`, kind: "document" },
  ];

  const settings: OrgSettings = {
    name: "Meridian",
    legalName: "Meridian Education Pvt. Ltd.",
    timezone: "Asia/Kolkata",
    currency: "INR",
    twoFactor: false,
    sessionTimeout: 30,
    loginNotifications: true,
    emailAlerts: true,
    slackAlerts: false,
    auditRetentionDays: 90,
    defaultIntake: "Winter 2026",
  };

  return {
    employees,
    students,
    universities,
    applications,
    payments,
    leads,
    documents,
    documentVersions,
    documentActivities,
    portals,
    portalAccessLogs,
    workItems,
    auditEvents,
    notifications,
    settings,
  };
}

export type SeedData = ReturnType<typeof createSeed>;
