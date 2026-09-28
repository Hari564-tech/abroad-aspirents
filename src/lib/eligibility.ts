import type { Student, University } from "@/lib/types";

export type MatchVerdict = "eligible" | "close" | "ineligible";
export type RequirementStatus = "met" | "close" | "missing" | "na";

export interface RequirementCheck {
  id: string;
  label: string;
  required: string;
  actual: string;
  status: RequirementStatus;
  detail: string;
  hard: boolean;
}

export interface UniversityMatch {
  universityId: string;
  score: number;
  verdict: MatchVerdict;
  checks: RequirementCheck[];
  reasons: string[];
  gaps: string[];
  nextSteps: string[];
}

const LANG_RANK: Record<string, number> = {
  None: 0,
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

const RELATED_BRANCHES: Record<string, string[]> = {
  "Computer Science": ["Data Science"],
  "Data Science": ["Computer Science"],
  "Electrical Engineering": ["Electronics & Communication"],
  "Electronics & Communication": ["Electrical Engineering"],
  "Business Administration": ["Finance"],
  Finance: ["Business Administration"],
};

function langRank(level: string | undefined) {
  if (!level) return 0;
  return LANG_RANK[level] ?? 0;
}

function langLabel(level: string | undefined) {
  if (!level || level === "None") return "Not required";
  return level;
}

export function cgpaToGermanGrade(cgpa: number, scale = 10) {
  const nmin = 4;
  const nmax = scale;
  const clamped = Math.min(nmax, Math.max(nmin, cgpa));
  return Number((1 + (3 * (nmax - clamped)) / (nmax - nmin)).toFixed(1));
}

export function studentGermanGrade(student: Student) {
  if (typeof student.germanGrade === "number") return student.germanGrade;
  return cgpaToGermanGrade(student.cgpa);
}

function greFloor(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("not required") || normalized.includes("optional")) return null;
  const m = value.match(/(\d{3})/);
  return m ? Number(m[1]) : null;
}

export function formatEnglishProfile(student: Student) {
  const parts: string[] = [];
  if (typeof student.ielts === "number") parts.push(`IELTS ${student.ielts}`);
  if (typeof student.toefl === "number") parts.push(`TOEFL ${student.toefl}`);
  if (typeof student.duolingo === "number") parts.push(`Duolingo ${student.duolingo}`);
  return parts.join(" · ") || "Not submitted";
}

function check(
  partial: Omit<RequirementCheck, "hard"> & { hard?: boolean },
): RequirementCheck {
  return { hard: false, ...partial };
}

export function matchStudentToUniversity(student: Student, university: University): UniversityMatch {
  const checks: RequirementCheck[] = [];
  const reasons: string[] = [];
  const gaps: string[] = [];
  const nextSteps: string[] = [];
  let score = 0;

  const countryOk = student.country === university.country;
  checks.push(
    check({
      id: "country",
      label: "Destination",
      required: university.country,
      actual: student.country,
      status: countryOk ? "met" : "missing",
      detail: countryOk
        ? `Applying to ${university.country}, matching this programme.`
        : `Student is targeting ${student.country}; this university is in ${university.country}.`,
      hard: true,
    }),
  );
  if (countryOk) {
    score += 22;
    reasons.push(`Destination matches (${university.country}).`);
  } else {
    gaps.push(`Country mismatch — student is targeting ${student.country}.`);
  }

  const branchExact = student.branch === university.branch;
  const branchRelated = RELATED_BRANCHES[student.branch]?.includes(university.branch) ?? false;
  checks.push(
    check({
      id: "branch",
      label: "Field of study",
      required: university.branch,
      actual: student.branch,
      status: branchExact ? "met" : branchRelated ? "close" : "missing",
      detail: branchExact
        ? "Programme is in the student's declared branch."
        : branchRelated
          ? `${university.branch} is closely related to ${student.branch}.`
          : `Student's branch is ${student.branch}.`,
      hard: !branchRelated,
    }),
  );
  if (branchExact) {
    score += 16;
    reasons.push(`Branch aligned (${student.branch}).`);
  } else if (branchRelated) {
    score += 9;
    reasons.push(`Related field: ${university.branch} ↔ ${student.branch}.`);
    nextSteps.push(`Confirm the student is comfortable shifting from ${student.branch} to ${university.branch}.`);
  } else {
    gaps.push(`Field mismatch — ${student.branch} vs ${university.branch}.`);
  }

  const intakeOk = student.intake === university.intake;
  checks.push(
    check({
      id: "intake",
      label: "Intake",
      required: university.intake,
      actual: student.intake,
      status: intakeOk ? "met" : "close",
      detail: intakeOk
        ? "Intake matches the student's plan."
        : `Student is targeting ${student.intake}; this course opens ${university.intake}.`,
    }),
  );
  if (intakeOk) {
    score += 6;
    reasons.push(`Intake ${university.intake} matches.`);
  } else {
    score += 3;
    nextSteps.push(`Discuss moving the student to ${university.intake} if this programme is a priority.`);
  }

  const ieltsOk = typeof student.ielts === "number" && student.ielts >= university.ielts;
  const ieltsClose =
    typeof student.ielts === "number" && student.ielts >= university.ielts - 0.5 && student.ielts < university.ielts;
  const toeflOk = typeof student.toefl === "number" && student.toefl >= university.toefl;
  const toeflClose =
    typeof student.toefl === "number" && student.toefl >= university.toefl - 7 && student.toefl < university.toefl;
  const duolingoClose =
    university.country === "USA" && typeof student.duolingo === "number" && student.duolingo >= 120;
  const englishTestOk = ieltsOk || toeflOk;
  const englishClose = !englishTestOk && (ieltsClose || toeflClose || duolingoClose);
  const moiCovers = university.moi && !englishTestOk;

  let englishStatus: RequirementStatus = "missing";
  let englishDetail = "No recognised English score on file.";
  if (englishTestOk) {
    englishStatus = "met";
    englishDetail = ieltsOk
      ? `IELTS ${student.ielts} meets the ${university.ielts} minimum.`
      : `TOEFL ${student.toefl} meets the ${university.toefl} minimum.`;
    score += 20;
    reasons.push(englishDetail);
  } else if (moiCovers) {
    englishStatus = "met";
    englishDetail = "University accepts Medium of Instruction (MOI) in place of IELTS/TOEFL.";
    score += 15;
    reasons.push("MOI accepted — English test can be waived.");
    nextSteps.push("Collect an official MOI letter from the student's college.");
  } else if (englishClose) {
    englishStatus = "close";
    englishDetail = ieltsClose
      ? `IELTS ${student.ielts} is 0.5 below the ${university.ielts} cut-off.`
      : toeflClose
        ? `TOEFL ${student.toefl} is just below the ${university.toefl} cut-off.`
        : `Duolingo ${student.duolingo} may be considered; confirm if this university accepts it.`;
    score += 10;
    gaps.push(englishDetail);
    nextSteps.push(
      ieltsClose || toeflClose
        ? "Plan a re-test, or shortlist MOI-friendly universities as backup."
        : "Confirm Duolingo acceptance with the admissions office.",
    );
  } else {
    englishDetail = `Requires IELTS ${university.ielts} or TOEFL ${university.toefl}. Student has ${formatEnglishProfile(student)}.`;
    gaps.push("English score does not meet the published requirement.");
    nextSteps.push(
      university.moi
        ? "Submit MOI, or book IELTS/TOEFL."
        : `Book IELTS (target ${university.ielts}+) or TOEFL (target ${university.toefl}+).`,
    );
  }
  checks.push(
    check({
      id: "english",
      label: "English proficiency",
      required: `IELTS ${university.ielts} / TOEFL ${university.toefl}${university.moi ? " / MOI" : ""}`,
      actual: formatEnglishProfile(student),
      status: englishStatus,
      detail: englishDetail,
      hard: true,
    }),
  );

  const studentGrade = studentGermanGrade(student);
  const gradeDelta = studentGrade - university.germanGrade;
  let gradeStatus: RequirementStatus = "missing";
  let gradeDetail = "";
  if (studentGrade <= university.germanGrade) {
    gradeStatus = "met";
    gradeDetail = `Academic grade ${studentGrade.toFixed(1)} is within the ${university.germanGrade.toFixed(1)} cap.`;
    score += 18;
    reasons.push(gradeDetail);
  } else if (gradeDelta <= 0.3) {
    gradeStatus = "close";
    gradeDetail = `Grade ${studentGrade.toFixed(1)} is slightly above the ${university.germanGrade.toFixed(1)} cap.`;
    score += 10;
    gaps.push(gradeDetail);
    nextSteps.push("Check if a grade conversion letter or subject-wise evaluation can improve the German grade.");
  } else {
    gradeStatus = "missing";
    gradeDetail = `Grade ${studentGrade.toFixed(1)} is above the ${university.germanGrade.toFixed(1)} maximum.`;
    gaps.push(gradeDetail);
    nextSteps.push("Prioritise universities with a more flexible grade cap.");
  }
  checks.push(
    check({
      id: "grade",
      label: "Academic grade",
      required: `≤ ${university.germanGrade.toFixed(1)} (German scale)`,
      actual: `${studentGrade.toFixed(1)} · CGPA ${student.cgpa.toFixed(2)}`,
      status: gradeStatus,
      detail: gradeDetail,
      hard: true,
    }),
  );

  const germany = university.country === "Germany";
  if (germany && university.germanLanguage !== "None") {
    const have = langRank(student.germanLanguage);
    const need = langRank(university.germanLanguage);
    const langOk = have >= need;
    const langClose = !langOk && have === need - 1;
    checks.push(
      check({
        id: "german",
        label: "German language",
        required: langLabel(university.germanLanguage),
        actual: student.germanLanguage === "None" ? "None" : student.germanLanguage,
        status: langOk ? "met" : langClose ? "close" : "missing",
        detail: langOk
          ? `${student.germanLanguage} meets the ${university.germanLanguage} requirement.`
          : langClose
            ? `${student.germanLanguage || "None"} is one level below ${university.germanLanguage}.`
            : `Requires ${university.germanLanguage}; student is at ${student.germanLanguage || "None"}.`,
        hard: !langClose,
      }),
    );
    if (langOk) {
      score += 12;
      reasons.push(`German ${student.germanLanguage} meets ${university.germanLanguage}.`);
    } else if (langClose) {
      score += 6;
      gaps.push(`German language is one level short of ${university.germanLanguage}.`);
      nextSteps.push(`Enrol the student in ${university.germanLanguage} and target completion before the visa stage.`);
    } else {
      gaps.push(`German language gap: needs ${university.germanLanguage}.`);
      nextSteps.push(`Start ${university.germanLanguage} classes immediately.`);
    }
  } else {
    checks.push(
      check({
        id: "german",
        label: "German language",
        required: "Not required",
        actual: student.germanLanguage === "None" ? "Not studying German" : student.germanLanguage,
        status: "na",
        detail: "This programme is taught without a German-language minimum.",
      }),
    );
    score += 12;
  }

  const greNeed = greFloor(university.gre);
  if (greNeed == null) {
    checks.push(
      check({
        id: "gre",
        label: "GRE",
        required: university.gre,
        actual: student.gre ? String(student.gre) : "Not taken",
        status: "na",
        detail: "GRE is not a hard requirement for this programme.",
      }),
    );
    score += 6;
  } else if (typeof student.gre === "number" && student.gre >= greNeed) {
    checks.push(
      check({
        id: "gre",
        label: "GRE",
        required: university.gre,
        actual: String(student.gre),
        status: "met",
        detail: `GRE ${student.gre} meets ${university.gre}.`,
      }),
    );
    score += 6;
    reasons.push(`GRE ${student.gre} meets the ${greNeed}+ bar.`);
  } else if (typeof student.gre === "number" && student.gre >= greNeed - 8) {
    checks.push(
      check({
        id: "gre",
        label: "GRE",
        required: university.gre,
        actual: String(student.gre),
        status: "close",
        detail: `GRE ${student.gre} is just under ${greNeed}.`,
      }),
    );
    score += 3;
    gaps.push(`GRE is slightly below ${greNeed}.`);
  } else {
    checks.push(
      check({
        id: "gre",
        label: "GRE",
        required: university.gre,
        actual: student.gre ? String(student.gre) : "Not taken",
        status: "missing",
        detail: `Programme lists ${university.gre}.`,
        hard: true,
      }),
    );
    gaps.push(`GRE ${university.gre} is not yet met.`);
    nextSteps.push("Schedule GRE, or move this university to a stretch list.");
  }

  const deadline = new Date(university.deadline).getTime();
  const now = Date.now();
  const daysLeft = Math.ceil((deadline - now) / 86400000);
  if (daysLeft < 0) {
    checks.push(
      check({
        id: "deadline",
        label: "Deadline",
        required: "Open",
        actual: "Closed",
        status: "missing",
        detail: "The published deadline has passed.",
        hard: true,
      }),
    );
    gaps.push("Application deadline has passed.");
    score -= 8;
  } else if (daysLeft <= 21) {
    checks.push(
      check({
        id: "deadline",
        label: "Deadline",
        required: "Open",
        actual: `${daysLeft} days left`,
        status: "close",
        detail: "Deadline is within three weeks — documents must move immediately.",
      }),
    );
    nextSteps.push("Deadline is close — lock documents and application portal access this week.");
  } else {
    checks.push(
      check({
        id: "deadline",
        label: "Deadline",
        required: "Open",
        actual: `${daysLeft} days left`,
        status: "met",
        detail: "Enough time remains to file a complete application.",
      }),
    );
  }

  if (university.moi && englishTestOk) {
    reasons.push("MOI is also accepted, which keeps a fallback if a re-test is needed.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const hardFails = checks.filter((c) => c.hard && c.status === "missing").length;
  let verdict: MatchVerdict;
  if (!countryOk || hardFails >= 3) verdict = "ineligible";
  else if (hardFails === 0 && score >= 78) verdict = "eligible";
  else if (hardFails <= 1 && score >= 52) verdict = "close";
  else verdict = "ineligible";

  if (verdict === "eligible" && nextSteps.length === 0) {
    nextSteps.push("Ready to shortlist — confirm documents and portal credentials.");
  }

  return {
    universityId: university.id,
    score,
    verdict,
    checks,
    reasons,
    gaps,
    nextSteps: [...new Set(nextSteps)],
  };
}

export function matchAllUniversities(student: Student, universities: University[]) {
  return universities
    .filter((u) => !u.archived)
    .map((u) => matchStudentToUniversity(student, u))
    .sort((a, b) => b.score - a.score || a.universityId.localeCompare(b.universityId));
}

export function summarizeMatches(matches: UniversityMatch[]) {
  let eligible = 0;
  let close = 0;
  let ineligible = 0;
  for (const m of matches) {
    if (m.verdict === "eligible") eligible += 1;
    else if (m.verdict === "close") close += 1;
    else ineligible += 1;
  }
  return { eligible, close, ineligible, total: matches.length };
}

export function suggestedShortlist(matches: UniversityMatch[], limit = 5) {
  const eligible = matches.filter((m) => m.verdict === "eligible");
  const close = matches.filter((m) => m.verdict === "close");
  return [...eligible, ...close].slice(0, limit).map((m) => m.universityId);
}

export function verdictLabel(verdict: MatchVerdict) {
  if (verdict === "eligible") return "Eligible";
  if (verdict === "close") return "Close match";
  return "Not eligible";
}
