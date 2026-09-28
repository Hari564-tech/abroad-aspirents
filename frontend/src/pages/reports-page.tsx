import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FilterSelect } from "@/components/filter-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { useEmployeeMap } from "@/lib/scoped";
import { APPLICATION_STATUSES, INTAKES } from "@/lib/types";
import { downloadText, toCsv } from "@/lib/format";
import { downloadHtmlAsPdf } from "@/lib/pdf";
import { toast } from "sonner";

const REPORTS = [
  "Student Registration",
  "Employee Performance",
  "Application Funnel",
  "Payment Report",
  "University Report",
  "Visa Report",
  "Status Report",
];

export function ReportsPage() {
  const students = useAppStore((s) => s.students);
  const applications = useAppStore((s) => s.applications);
  const payments = useAppStore((s) => s.payments);
  const universities = useAppStore((s) => s.universities);
  const employees = useAppStore((s) => s.employees);
  const appendAudit = useAppStore((s) => s.appendAudit);
  const empMap = useEmployeeMap();
  const [report, setReport] = useState(REPORTS[0]!);
  const [country, setCountry] = useState("all");
  const [intake, setIntake] = useState("all");
  const [employee, setEmployee] = useState("all");
  const [status, setStatus] = useState("all");
  const [generated, setGenerated] = useState(false);

  const rows = students.filter((s) => {
    if (country !== "all" && s.country !== country) return false;
    if (intake !== "all" && s.intake !== intake) return false;
    if (employee !== "all" && empMap[s.employeeId]?.name !== employee) return false;
    if (status !== "all" && s.status !== status) return false;
    return true;
  });

  function generateReportHtml() {
    return `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${report} Export</title>
        <style>
          body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111; padding: 40px; }
          h1 { margin-bottom: 5px; text-transform: uppercase; }
          p { color: #555; font-size: 14px; margin-bottom: 20px; }
          .stats { display: flex; gap: 40px; margin-bottom: 30px; }
          .stat { border: 1px solid #ccc; padding: 15px; border-radius: 6px; flex: 1; }
          .stat-val { font-size: 24px; font-weight: bold; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #111; color: #fff; text-align: left; padding: 10px; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>${report}</h1>
        <p>Generated on ${new Date().toLocaleString()} &bull; ${rows.length} rows</p>
        
        <div class="stats">
          <div class="stat">Matching students <div class="stat-val">${rows.length}</div></div>
          <div class="stat">Applications <div class="stat-val">${applications.filter((a) => rows.some((s) => s.id === a.studentId)).length}</div></div>
          <div class="stat">Universities <div class="stat-val">${universities.length}</div></div>
        </div>

        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Country</th><th>Status</th><th>Payment</th></tr>
          </thead>
          <tbody>
            ${rows.map(s => `<tr>
              <td>${s.id}</td>
              <td>${s.name}</td>
              <td>${s.country}</td>
              <td>${s.status}</td>
              <td>${s.paymentStatus}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Generate operational summaries for leadership reviews." />
      <Card className="p-5">
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={report} onChange={setReport} placeholder="Report" options={REPORTS} includeAll={false} />
          <FilterSelect value={country} onChange={setCountry} placeholder="Country" options={["Germany", "UK", "USA"]} />
          <FilterSelect value={intake} onChange={setIntake} placeholder="Intake" options={INTAKES} />
          <FilterSelect
            value={employee}
            onChange={setEmployee}
            placeholder="Employee"
            options={employees.filter((e) => e.role === "employee").map((e) => e.name)}
          />
          <FilterSelect value={status} onChange={setStatus} placeholder="Status" options={APPLICATION_STATUSES} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setGenerated(true);
              toast.success("Report generated");
            }}
          >
            Generate report
          </Button>
          
          {generated && (
            <>

              <Button
                variant="outline"
                onClick={() => {
                  const html = generateReportHtml();
                  
                  downloadHtmlAsPdf(html, `${report.replaceAll(" ", "_")}.pdf`);
                  
                  appendAudit({
                    action: "EXPORT",
                    module: "Reports",
                    recordId: report,
                    details: `Exported ${report} as PDF`,
                    severity: "INFO",
                  });
                }}
              >
                <FileText className="size-4" /> Export PDF
              </Button>
            </>
          )}
        </div>
      </Card>

      {generated && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Matching students</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{rows.length}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">
              {applications.filter((a) => rows.some((s) => s.id === a.studentId)).length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Universities</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{universities.length}</CardContent>
          </Card>
          <Card className="sm:col-span-3 overflow-x-auto p-0">
            <table className="w-full text-table">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  {["ID", "Name", "Country", "Status", "Payment"].map((h) => (
                    <th key={h} className="px-5 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-5 py-2 font-mono text-xs">{s.id}</td>
                    <td className="px-5 py-2">{s.name}</td>
                    <td className="px-5 py-2">{s.country}</td>
                    <td className="px-5 py-2">{s.status}</td>
                    <td className="px-5 py-2">{s.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
