import { useMemo } from "react";
import { Copy, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { MatchBadge, RequirementList } from "@/components/eligibility-tools";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatEnglishProfile, studentGermanGrade, verdictLabel, type UniversityMatch } from "@/lib/eligibility";
import { downloadText, formatINR, formatShortDate } from "@/lib/format";
import type { OrgSettings, Student, University, User } from "@/lib/types";

export function EligibilityReportDialog({
  open,
  onOpenChange,
  student,
  counselor,
  settings,
  universities,
  matches,
  shortlistedIds,
  studentMessage,
  onMessageChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: Student;
  counselor: User | null;
  settings: OrgSettings;
  universities: University[];
  matches: UniversityMatch[];
  shortlistedIds: string[];
  studentMessage: string;
  onMessageChange: (v: string) => void;
}) {
  const uniMap = useMemo(() => Object.fromEntries(universities.map((u) => [u.id, u])), [universities]);
  const matchMap = useMemo(() => Object.fromEntries(matches.map((m) => [m.universityId, m])), [matches]);
  const rows = shortlistedIds
    .map((id) => {
      const university = uniMap[id];
      const match = matchMap[id];
      if (!university || !match) return null;
      return { university, match };
    })
    .filter((row): row is { university: University; match: UniversityMatch } => row !== null);

  const print = () => {
    const html = buildReportHtml({
      student,
      counselor,
      settings,
      rows,
      studentMessage,
    });
    const w = window.open("", "_blank", "noopener,noreferrer,width=920,height=1200");
    if (!w) {
      downloadText(reportFilename(student, "html"), html, "text/html;charset=utf-8");
      toast.message("Pop-up blocked — downloaded the report instead. Open it and print to PDF.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    window.setTimeout(() => w.print(), 400);
  };

  const downloadHtml = () => {
    downloadText(
      reportFilename(student, "html"),
      buildReportHtml({ student, counselor, settings, rows, studentMessage }),
      "text/html;charset=utf-8",
    );
    toast.success("Report downloaded");
  };

  const copySummary = async () => {
    const text = buildWhatsAppSummary({ student, counselor, rows, studentMessage });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Student summary copied");
    } catch {
      toast.error("Could not copy — download the report instead.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border p-6 pb-4">
          <DialogTitle>University eligibility & shortlist report</DialogTitle>
          <DialogDescription>
            Student-facing document for {student.name}. Print or save as PDF from the browser dialog.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mb-5">
            <label htmlFor="student-message" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Note to student (appears on the report)
            </label>
            <Textarea
              id="student-message"
              value={studentMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="e.g. Rahul, these five programmes are the strongest fit for Winter 2026. Let’s lock documents this week."
              className="min-h-20"
            />
          </div>
          {rows.length === 0 ? (
            <p className="rounded-lg bg-secondary px-3 py-6 text-center text-sm text-muted-foreground">
              Shortlist at least one university to generate a report.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map(({ university, match }) => (
                <article key={university.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{university.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {university.course} · {university.location}, {university.country} · {university.intake}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-xs font-medium text-muted-foreground">{match.score}%</span>
                      <MatchBadge verdict={match.verdict} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <RequirementList checks={match.checks} compact />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" onClick={copySummary} disabled={rows.length === 0}>
            <Copy className="size-4" />
            Copy summary
          </Button>
          <Button variant="outline" onClick={downloadHtml} disabled={rows.length === 0}>
            <Download className="size-4" />
            Download HTML
          </Button>
          <Button onClick={print} disabled={rows.length === 0}>
            <Printer className="size-4" />
            Print / Save PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function reportFilename(student: Student, ext: string) {
  const slug = student.name.replaceAll(/\s+/g, "_");
  return `Meridian_Shortlist_${slug}_${student.id}.${ext}`;
}

function reportId(student: Student) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `RPT-${student.id}-${stamp}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildReportHtml({
  student,
  counselor,
  settings,
  rows,
  studentMessage,
}: {
  student: Student;
  counselor: User | null;
  settings: OrgSettings;
  rows: { university: University; match: UniversityMatch }[];
  studentMessage: string;
}) {
  const generated = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const cards = rows
    .map(({ university, match }, i) => {
      const checks = match.checks
        .filter((c) => c.status !== "na")
        .map((c) => {
          const mark = c.status === "met" ? "Met" : c.status === "close" ? "Close" : "Gap";
          const color = c.status === "met" ? "#16a34a" : c.status === "close" ? "#d97706" : "#dc2626";
          return `<tr>
            <td>${escapeHtml(c.label)}</td>
            <td>${escapeHtml(c.required)}</td>
            <td>${escapeHtml(c.actual)}</td>
            <td style="color:${color};font-weight:600">${mark}</td>
          </tr>`;
        })
        .join("");
      const why =
        match.reasons.length > 0
          ? `<p class="why"><strong>Why this fits:</strong> ${escapeHtml(match.reasons.join(" "))}</p>`
          : "";
      const gaps =
        match.gaps.length > 0
          ? `<p class="gap"><strong>What to strengthen:</strong> ${escapeHtml(match.gaps.join(" "))}</p>`
          : "";
      const steps =
        match.nextSteps.length > 0
          ? `<ul class="steps">${match.nextSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
          : "";
      const tone = match.verdict === "eligible" ? "#16a34a" : match.verdict === "close" ? "#d97706" : "#dc2626";
      return `<article class="card">
        <header>
          <div>
            <div class="kicker">Option ${i + 1}</div>
            <h2>${escapeHtml(university.name)}</h2>
            <p class="meta">${escapeHtml(university.course)} · ${escapeHtml(university.location)}, ${escapeHtml(university.country)}</p>
          </div>
          <div class="pill" style="color:${tone};border-color:${tone}33;background:${tone}14">${escapeHtml(verdictLabel(match.verdict))} · ${match.score}%</div>
        </header>
        <dl class="facts">
          <div><dt>Intake</dt><dd>${escapeHtml(university.intake)}</dd></div>
          <div><dt>Apply via</dt><dd>${escapeHtml(university.applicationVia)}</dd></div>
          <div><dt>Deadline</dt><dd>${escapeHtml(formatShortDate(university.deadline))}</dd></div>
          <div><dt>Application fee</dt><dd>${escapeHtml(formatINR(university.applicationFee))}</dd></div>
          <div><dt>Tuition</dt><dd>${escapeHtml(university.tuitionFees === 0 ? "No tuition / semester fee" : formatINR(university.tuitionFees))}</dd></div>
          <div><dt>MOI accepted</dt><dd>${university.moi ? "Yes" : "No"}</dd></div>
        </dl>
        <table>
          <thead><tr><th>Requirement</th><th>University needs</th><th>Your profile</th><th>Status</th></tr></thead>
          <tbody>${checks}</tbody>
        </table>
        ${why}${gaps}${steps}
      </article>`;
    })
    .join("");

  const note = studentMessage.trim()
    ? `<section class="note"><h3>Message from your counselor</h3><p>${escapeHtml(studentMessage.trim())}</p></section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>University shortlist — ${escapeHtml(student.name)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #111827; background: #fff; font-size: 13px; line-height: 1.5; }
    .page { max-width: 820px; margin: 0 auto; padding: 36px 40px 56px; }
    header.top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { display: flex; gap: 10px; align-items: center; }
    .mark { width: 32px; height: 32px; border-radius: 8px; background: #2563eb; color: #fff; display: grid; place-items: center; font-weight: 700; }
    .brand strong { display: block; font-size: 15px; }
    .brand span { color: #6b7280; font-size: 12px; }
    .docid { text-align: right; color: #6b7280; font-size: 12px; }
    h1 { font-size: 22px; margin: 0 0 6px; letter-spacing: -0.02em; }
    .lede { color: #6b7280; margin: 0 0 20px; }
    .profile { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
    .profile div { background: #f7f8fa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; }
    .profile dt { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
    .profile dd { margin: 2px 0 0; font-weight: 600; }
    .note { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 14px 16px; margin-bottom: 22px; }
    .note h3 { margin: 0 0 6px; font-size: 12px; color: #1d4ed8; }
    .note p { margin: 0; }
    .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 18px 18px; margin-bottom: 16px; break-inside: avoid; }
    .card header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .kicker { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
    .card h2 { margin: 2px 0 4px; font-size: 16px; }
    .meta { margin: 0; color: #6b7280; }
    .pill { font-size: 11px; font-weight: 600; border: 1px solid; border-radius: 999px; padding: 4px 10px; white-space: nowrap; }
    .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; }
    .facts div { background: #f9fafb; border-radius: 8px; padding: 8px 10px; }
    .facts dt { font-size: 11px; color: #6b7280; }
    .facts dd { margin: 0; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; color: #6b7280; font-weight: 500; border-bottom: 1px solid #e5e7eb; padding: 6px 8px; }
    td { border-bottom: 1px solid #f3f4f6; padding: 7px 8px; vertical-align: top; }
    .why, .gap { margin: 12px 0 0; }
    .steps { margin: 8px 0 0; padding-left: 18px; }
    footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 0; }
      .card { break-inside: avoid; }
    }
    @media (max-width: 640px) {
      .profile, .facts { grid-template-columns: 1fr 1fr; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="top">
      <div class="brand">
        <div class="mark">M</div>
        <div>
          <strong>${escapeHtml(settings.name || "Meridian")}</strong>
          <span>Student operations</span>
        </div>
      </div>
      <div class="docid">
        <div>${escapeHtml(reportId(student))}</div>
        <div>Generated ${escapeHtml(generated)}</div>
      </div>
    </header>
    <h1>University Eligibility & Shortlist Report</h1>
    <p class="lede">Prepared for ${escapeHtml(student.name)} · ${escapeHtml(student.id)}${counselor ? ` · Counselor ${escapeHtml(counselor.name)}` : ""}</p>
    <dl class="profile">
      <div><dt>Destination</dt><dd>${escapeHtml(student.country)}</dd></div>
      <div><dt>Intake</dt><dd>${escapeHtml(student.intake)}</dd></div>
      <div><dt>Branch</dt><dd>${escapeHtml(student.branch)}</dd></div>
      <div><dt>College</dt><dd>${escapeHtml(student.college)}</dd></div>
      <div><dt>CGPA</dt><dd>${student.cgpa.toFixed(2)}</dd></div>
      <div><dt>German grade</dt><dd>${studentGermanGrade(student).toFixed(1)}</dd></div>
      <div><dt>English</dt><dd>${escapeHtml(formatEnglishProfile(student))}</dd></div>
      <div><dt>German language</dt><dd>${escapeHtml(student.germanLanguage === "None" ? "—" : student.germanLanguage)}</dd></div>
    </dl>
    ${note}
    ${cards}
    <footer>
      This report is an internal eligibility assessment based on the student's current academic profile and published university requirements.
      Final admission decisions rest with the university. Requirements can change — always reconfirm on the official portal before applying.
      ${settings.legalName ? escapeHtml(settings.legalName) + "." : ""}
    </footer>
  </div>
</body>
</html>`;
}

function buildWhatsAppSummary({
  student,
  counselor,
  rows,
  studentMessage,
}: {
  student: Student;
  counselor: User | null;
  rows: { university: University; match: UniversityMatch }[];
  studentMessage: string;
}) {
  const lines = [
    `University shortlist for ${student.name} (${student.id})`,
    `${student.country} · ${student.intake} · ${student.branch}`,
    `CGPA ${student.cgpa.toFixed(2)} · ${formatEnglishProfile(student)} · German ${student.germanLanguage}`,
    "",
  ];
  if (studentMessage.trim()) {
    lines.push(studentMessage.trim(), "");
  }
  rows.forEach(({ university, match }, i) => {
    lines.push(
      `${i + 1}. ${university.name} — ${university.course}`,
      `   ${verdictLabel(match.verdict)} (${match.score}%) · ${university.intake} · apply via ${university.applicationVia}`,
    );
    if (match.gaps[0]) lines.push(`   Next: ${match.gaps[0]}`);
  });
  if (counselor) lines.push("", `Prepared by ${counselor.name}, Meridian`);
  return lines.join("\n");
}