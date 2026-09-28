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
import { downloadHtmlAsPdf } from "@/lib/pdf";
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
    downloadHtmlAsPdf(html, reportFilename(student, "pdf"));
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

export function buildReportHtml({
  student,
  rows,
}: {
  student: Student;
  counselor: User | null;
  settings: OrgSettings;
  rows: { university: University; match: UniversityMatch }[];
  studentMessage: string;
}) {
  const d = new Date();
  const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const generatedDate = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  
  const tableRows = rows.map(({ university }, index) => {
    return `<tr>
      <td class="col-sno">${index + 1}</td>
      <td class="col-uni">${escapeHtml(university.name)}</td>
      <td>${escapeHtml(university.course)}</td>
      <td>${escapeHtml(university.branch)}</td>
      <td>${escapeHtml(university.intake)}</td>
      <td>${university.ielts || "-"}</td>
      <td>${university.toefl || "-"}</td>
      <td>${escapeHtml(university.germanLanguage === "None" ? "Not required" : university.germanLanguage)}</td>
      <td>${escapeHtml(university.gre || "-")}</td>
      <td>${university.germanGrade ? university.germanGrade.toFixed(1) : "-"}</td>
      <td>${escapeHtml(university.applicationVia)}</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>University Export Receipt - ${escapeHtml(student.name)}</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111827; background: #fff; font-size: 11px; line-height: 1.4; }
    .page { padding: 20px; max-width: 1100px; margin: 0 auto; }
    
    header.top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; border-bottom: 2px solid #111; padding-bottom: 12px; }
    .brand-title { font-size: 20px; font-weight: 700; color: #111; letter-spacing: 0.5px; text-transform: uppercase; margin: 0; }
    .brand-sub { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    
    .doc-type { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; text-align: right; margin-bottom: 4px; }
    
    .receipt-title { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 4px; }
    .receipt-title h1 { font-size: 24px; margin: 0; font-weight: 700; text-transform: uppercase; }
    .receipt-title .ref { font-size: 12px; font-weight: 600; }
    .subtitle { font-size: 11px; color: #4b5563; margin: 0 0 16px 0; }

    .grid-meta { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; margin-bottom: 20px; }
    .grid-meta > div { padding: 8px 12px; border-right: 1px solid #e5e7eb; }
    .grid-meta > div:last-child { border-right: none; }
    .grid-meta dl { margin: 0 0 8px 0; }
    .grid-meta dl:last-child { margin: 0; }
    .grid-meta dt { font-size: 9px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid-meta dd { margin: 2px 0 0; font-size: 12px; font-weight: 700; color: #111; }

    .summary-bar { background: #f3f4f6; border-top: 2px solid #111; border-bottom: 2px solid #111; padding: 6px 12px; display: flex; justify-content: space-between; font-weight: 700; font-size: 11px; letter-spacing: 0.5px; margin-bottom: 16px; }

    table.data-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 24px; }
    table.data-table th { background: #111; color: #fff; text-align: left; padding: 6px 8px; font-weight: 600; letter-spacing: 0.5px; font-size: 9px; white-space: nowrap; border: 1px solid #111; }
    table.data-table td { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: middle; }
    table.data-table tr:nth-child(even) { background: #f9fafb; }
    table.data-table tr:last-child td { border-bottom: 2px solid #111; }

    .col-sno { width: 40px; text-align: center; font-weight: 600; }
    .col-uni { font-weight: 600; }
    
    footer { text-align: center; color: #6b7280; font-size: 9px; border-top: 1px solid #e5e7eb; padding-top: 12px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 0; margin: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="doc-type">Export &amp; application planning document</div>
    <header class="top">
      <div>
        <div class="brand-title">RV INSTITUTE OF TECHNOLOGY</div>
        <div class="brand-sub">Study Abroad - ${escapeHtml(student.country)} University Export</div>
      </div>
    </header>

    <div class="receipt-title">
      <h1>University Export Receipt</h1>
      <div class="ref">Document Ref.: ${escapeHtml(student.country.substring(0, 4).toUpperCase())}-EXP-${dateString.replace(/-/g, "")}</div>
    </div>
    <p class="subtitle">${escapeHtml(student.country)} M.Sc. / ${escapeHtml(student.branch)} and related university shortlist - receipt-style export.</p>

    <div class="grid-meta">
      <div>
        <dl><dt>Issued To</dt><dd>${escapeHtml(student.name)}</dd></dl>
        <dl><dt>Program Level</dt><dd>M.Sc.</dd></dl>
      </div>
      <div>
        <dl><dt>Export Date</dt><dd>${generatedDate}</dd></dl>
        <dl><dt>Country</dt><dd>${escapeHtml(student.country)}</dd></dl>
      </div>
      <div>
        <dl><dt>Total Universities</dt><dd>${rows.length}</dd></dl>
        <dl><dt>Status</dt><dd>Prepared for planning</dd></dl>
      </div>
    </div>

    <div class="summary-bar">
      <span>EXPORT SUMMARY</span>
      <span>${rows.length} UNIVERSITIES</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th class="col-sno">S.NO</th>
          <th>UNIVERSITY</th>
          <th>COURSE</th>
          <th>BRANCH</th>
          <th>INTAKE</th>
          <th>IELTS</th>
          <th>TOEFL</th>
          <th>GERMAN</th>
          <th>GRE</th>
          <th>GRADE</th>
          <th>APPLICATION</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <footer>
      This is a system-generated export document. Please review application details on the respective university portals before proceeding.
      <br />Generated by RV Institute of Technology Study Abroad Portal
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