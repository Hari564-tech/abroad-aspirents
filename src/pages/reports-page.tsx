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

  function exportCsv() {
    downloadText(
      `${report.toLowerCase().replaceAll(" ", "-")}.csv`,
      toCsv(
        rows.map((s) => ({
          id: s.id,
          name: s.name,
          country: s.country,
          intake: s.intake,
          status: s.status,
          payment: s.paymentStatus,
        })),
      ),
    );
    appendAudit({
      action: "EXPORT",
      module: "Reports",
      recordId: report,
      details: `Exported ${report}`,
      severity: "INFO",
    });
    toast.success("Report exported");
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
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              downloadText(`${report}.txt`, `${report}\nGenerated ${new Date().toLocaleString()}\nRows: ${rows.length}`);
              toast.message("PDF export is simulated in this prototype.");
            }}
          >
            <FileText className="size-4" /> Export PDF
          </Button>
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
