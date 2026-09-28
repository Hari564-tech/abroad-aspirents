import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Copy, Download, MoreHorizontal, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { EligibilityReportDialog, buildReportHtml } from "@/components/eligibility-report";
import {
  EligibilityToolbar,
  MatchBadge,
  RequirementList,
  ScoreMeter,
  ShortlistDock,
  ShortlistToggle,
} from "@/components/eligibility-tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/store";
import { useScopedIds } from "@/lib/scoped";
import { matchAllUniversities, suggestedShortlist, summarizeMatches, type MatchVerdict } from "@/lib/eligibility";
import { BRANCHES, INTAKES, type Country, type Intake, type University } from "@/lib/types";
import { formatINR, formatShortDate, toCsv, downloadText } from "@/lib/format";
import { downloadHtmlAsPdf } from "@/lib/pdf";
import { toast } from "sonner";
import { useRouterState } from "@tanstack/react-router";

function blankUni(): University {
  return {
    id: `UNI-${Math.floor(100 + Math.random() * 900)}`,
    name: "",
    location: "",
    country: "Germany",
    course: "",
    branch: "Computer Science",
    intake: "Winter 2026",
    ielts: 6.5,
    toefl: 80,
    germanLanguage: "B1",
    gre: "Not required",
    germanGrade: 2.5,
    applicationVia: "Uni-Assist",
    applicationFee: 75,
    deadline: new Date(Date.now() + 60 * 86400000).toISOString(),
    tuitionFees: 0,
    moi: false,
    documentsCourier: "Required",
    aptitudeTest: "None",
    archived: false,
  };
}

export function UniversitiesPage() {
  const universities = useAppStore((s) => s.universities);
  const upsert = useAppStore((s) => s.upsertUniversity);
  const archive = useAppStore((s) => s.archiveUniversity);
  const duplicate = useAppStore((s) => s.duplicateUniversity);
  const appendAudit = useAppStore((s) => s.appendAudit);
  const shortlists = useAppStore((s) => s.shortlists);
  const toggleShortlist = useAppStore((s) => s.toggleShortlist);
  const setShortlist = useAppStore((s) => s.setShortlist);
  const setShortlistMessage = useAppStore((s) => s.setShortlistMessage);
  const clearShortlist = useAppStore((s) => s.clearShortlist);
  const createApplicationsFromShortlist = useAppStore((s) => s.createApplicationsFromShortlist);
  const currentUser = useAppStore((s) => s.currentUser);
  const settings = useAppStore((s) => s.settings);
  const employees = useAppStore((s) => s.employees);
  const { students } = useScopedIds();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const searchParams = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const initialId = searchParams.get("u");
  const initialStudent = searchParams.get("student");

  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("all");
  const [intake, setIntake] = useState("all");
  const [country, setCountry] = useState("all");
  const [ielts, setIelts] = useState("all");
  const [toefl, setToefl] = useState("all");
  const [course, setCourse] = useState("all");
  const [selected, setSelected] = useState<University | null>(
    () => universities.find((u) => u.id === initialId) ?? null,
  );
  const [editing, setEditing] = useState<University | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(initialStudent);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [verdictFilter, setVerdictFilter] = useState<"all" | MatchVerdict | "shortlisted">("all");
  const [reportOpen, setReportOpen] = useState(false);

  const activeStudent = students.find((s) => s.id === activeStudentId) ?? null;
  const counselor =
    employees.find((e) => e.id === (activeStudent?.employeeId ?? currentUser?.id)) ?? currentUser;
  const shortlist = shortlists.find((s) => s.studentId === activeStudentId);
  const shortlistedIds = shortlist?.universityIds ?? [];
  const shortlistedSet = useMemo(() => new Set(shortlistedIds), [shortlistedIds]);

  const matches = useMemo(
    () => (activeStudent ? matchAllUniversities(activeStudent, universities) : null),
    [activeStudent, universities],
  );
  const matchById = useMemo(
    () => (matches ? Object.fromEntries(matches.map((m) => [m.universityId, m])) : null),
    [matches],
  );
  const summary = useMemo(() => (matches ? summarizeMatches(matches) : null), [matches]);

  const courses = useMemo(() => [...new Set(universities.map((u) => u.course))].sort(), [universities]);

  const filtered = useMemo(() => {
    const rows = universities.filter((u) => {
      if (u.archived) return false;
      if (branch !== "all" && u.branch !== branch) return false;
      if (intake !== "all" && u.intake !== intake) return false;
      if (country !== "all" && u.country !== country) return false;
      if (course !== "all" && u.course !== course) return false;
      if (ielts !== "all" && u.ielts < Number(ielts)) return false;
      if (toefl !== "all" && u.toefl < Number(toefl)) return false;
      if (q && !`${u.name} ${u.course} ${u.country} ${u.branch}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (matchById) {
        const match = matchById[u.id];
        if (!match) return false;
        if (verdictFilter === "shortlisted" && !shortlistedSet.has(u.id)) return false;
        if (verdictFilter !== "all" && verdictFilter !== "shortlisted" && match.verdict !== verdictFilter) return false;
      }
      return true;
    });
    if (!matchById) return rows;
    return [...rows].sort((a, b) => (matchById[b.id]?.score ?? 0) - (matchById[a.id]?.score ?? 0));
  }, [universities, branch, intake, country, course, ielts, toefl, q, matchById, verdictFilter, shortlistedSet]);

  const resetFilters = () => {
    setQ("");
    setBranch("all");
    setIntake("all");
    setCountry("all");
    setCourse("all");
    setIelts("all");
    setToefl("all");
    setVerdictFilter("all");
  };

  const runEligibility = () => {
    if (!pickedId) {
      toast.error("Select a student first");
      return;
    }
    const student = students.find((s) => s.id === pickedId);
    if (!student) {
      toast.error("Student not found");
      return;
    }
    setAnalyzing(true);
    window.setTimeout(() => {
      const result = matchAllUniversities(student, universities);
      const stats = summarizeMatches(result);
      setActiveStudentId(student.id);
      setVerdictFilter("all");
      setAnalyzing(false);
      appendAudit({
        action: "VIEW",
        module: "Universities",
        recordId: student.id,
        details: `Eligibility check for ${student.name}: ${stats.eligible} eligible, ${stats.close} close, ${stats.ineligible} not eligible`,
        severity: "INFO",
      });
      toast.success(
        `${stats.eligible} eligible · ${stats.close} close matches for ${student.name.split(" ")[0]}`,
      );
    }, 420);
  };

  const columns = useMemo<ColumnDef<University>[]>(() => {
    const base: ColumnDef<University>[] = [
      {
        id: "sno",
        header: "S.No",
        cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.index + 1}</span>,
      },
    ];
    if (matchById) {
      base.push(
        {
          id: "shortlist",
          header: "",
          cell: ({ row }) => (
            <ShortlistToggle
              active={shortlistedSet.has(row.original.id)}
              onClick={() => activeStudent && toggleShortlist(activeStudent.id, row.original.id)}
            />
          ),
        },
        {
          id: "match",
          header: "Match",
          cell: ({ row }) => {
            const match = matchById[row.original.id];
            if (!match) return "—";
            return <ScoreMeter score={match.score} verdict={match.verdict} />;
          },
        },
        {
          id: "verdict",
          header: "Eligibility",
          cell: ({ row }) => {
            const match = matchById[row.original.id];
            return match ? <MatchBadge verdict={match.verdict} /> : "—";
          },
        },
      );
    }
    base.push(
      { accessorKey: "name", header: "University" },
      { accessorKey: "course", header: "Course" },
      { accessorKey: "branch", header: "Branch" },
      { accessorKey: "intake", header: "Intake" },
      { accessorKey: "ielts", header: "IELTS" },
      { accessorKey: "toefl", header: "TOEFL" },
      { accessorKey: "germanLanguage", header: "German language" },
      { accessorKey: "gre", header: "GRE" },
      { accessorKey: "germanGrade", header: "German grade" },
      { accessorKey: "applicationVia", header: "Application via" },
      {
        accessorKey: "applicationFee",
        header: "Application fee",
        cell: ({ row }) => formatINR(row.original.applicationFee),
      },
      {
        accessorKey: "deadline",
        header: "Deadline",
        cell: ({ row }) => formatShortDate(row.original.deadline),
      },
      {
        accessorKey: "tuitionFees",
        header: "Tuition fees",
        cell: ({ row }) => formatINR(row.original.tuitionFees),
      },
      { id: "moi", header: "MOI", cell: ({ row }) => (row.original.moi ? "Yes" : "No") },
      {
        id: "act",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {activeStudent && (
                <DropdownMenuItem onClick={() => toggleShortlist(activeStudent.id, row.original.id)}>
                  {shortlistedSet.has(row.original.id) ? "Remove from shortlist" : "Add to shortlist"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setEditing(row.original)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  duplicate(row.original.id);
                  toast.success("University duplicated");
                }}
              >
                <Copy className="size-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  archive(row.original.id);
                  toast.message("University archived");
                }}
              >
                <Archive className="size-4" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    );
    return base;
  }, [archive, duplicate, matchById, shortlistedSet, activeStudent, toggleShortlist]);

  const selectedMatch = selected && matchById ? matchById[selected.id] : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="University database"
        description="Search and compare universities based on student eligibility."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                if (activeStudent) {
                  const exportRows = filtered.map((u) => {
                    const match = matchById?.[u.id] || {
                      verdict: "na",
                      score: 0,
                      checks: [],
                      reasons: [],
                      gaps: [],
                      nextSteps: [],
                    };
                    return { university: u, match };
                  });
                  const html = buildReportHtml({
                    student: activeStudent,
                    counselor: currentUser,
                    settings,
                    rows: exportRows as any,
                    studentMessage: "",
                  });
                  
                  const filename = `Universities_Export_${activeStudent.name.replaceAll(" ", "_")}.pdf`;
                  downloadHtmlAsPdf(html, filename);
                  
                  appendAudit({
                    action: "EXPORT",
                    module: "Universities",
                    recordId: activeStudent.id,
                    details: `Exported eligibility PDF for ${activeStudent.name}`,
                    severity: "INFO",
                  });
                  toast.success("PDF generated");
                } else {
                  const html = `
                    <div style="padding: 40px; font-family: system-ui, sans-serif;">
                      <h1 style="color: #1e293b; margin-bottom: 20px;">Universities Export</h1>
                      <p style="color: #64748b; margin-bottom: 30px;">Total universities: ${filtered.length}</p>
                      
                      <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                            <th style="padding: 12px; color: #475569;">University</th>
                            <th style="padding: 12px; color: #475569;">Course</th>
                            <th style="padding: 12px; color: #475569;">Country</th>
                            <th style="padding: 12px; color: #475569;">IELTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${filtered.map(u => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 12px;"><strong>${u.name}</strong></td>
                              <td style="padding: 12px;">${u.course}</td>
                              <td style="padding: 12px;">${u.country}</td>
                              <td style="padding: 12px;">${u.ielts}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  `;
                  
                  downloadHtmlAsPdf(html, "Universities_List.pdf");
                  
                  appendAudit({
                    action: "EXPORT",
                    module: "Universities",
                    recordId: "LIST",
                    details: "Exported university database to PDF",
                    severity: "INFO",
                  });
                }
              }}
            >
              <Download className="size-4" /> Export
            </Button>
            <Button onClick={() => setEditing(blankUni())}>
              <Plus className="size-4" /> Add university
            </Button>
          </>
        }
      />

      <EligibilityToolbar
        students={students}
        pickedId={pickedId}
        onPick={setPickedId}
        activeStudent={activeStudent}
        analyzing={analyzing}
        onAnalyze={runEligibility}
        onClear={() => {
          setActiveStudentId(null);
          setPickedId(null);
          setVerdictFilter("all");
        }}
        summary={summary}
        verdictFilter={verdictFilter}
        onVerdictFilter={setVerdictFilter}
        shortlistedCount={shortlistedIds.length}
        onShortlistTop={() => {
          if (!activeStudent || !matches) return;
          const ids = suggestedShortlist(matches);
          setShortlist(activeStudent.id, ids);
          setVerdictFilter("shortlisted");
          toast.success(`Shortlisted ${ids.length} top matches`);
        }}
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(u) => u.id}
        getRowClassName={(u) => {
          const verdict = matchById?.[u.id]?.verdict;
          if (verdict === "eligible") return "bg-success/5";
          if (verdict === "close") return "bg-warning/5";
          return undefined;
        }}
        searchPlaceholder="Search university…"
        globalFilter={q}
        onGlobalFilterChange={setQ}
        extraFilters={
          <>
            <FilterSelect value={branch} onChange={setBranch} placeholder="Branch" options={BRANCHES} />
            <FilterSelect value={intake} onChange={setIntake} placeholder="Intake" options={INTAKES} />
            <FilterSelect value={country} onChange={setCountry} placeholder="Country" options={["Germany", "UK", "USA"]} />
            <FilterSelect value={course} onChange={setCourse} placeholder="Course" options={courses} />
            <FilterSelect
              value={ielts}
              onChange={setIelts}
              placeholder="IELTS"
              options={[
                { value: "6", label: "IELTS 6+" },
                { value: "6.5", label: "IELTS 6.5+" },
                { value: "7", label: "IELTS 7+" },
              ]}
            />
            <FilterSelect
              value={toefl}
              onChange={setToefl}
              placeholder="TOEFL"
              options={[
                { value: "80", label: "TOEFL 80+" },
                { value: "90", label: "TOEFL 90+" },
                { value: "100", label: "TOEFL 100+" },
              ]}
            />
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          </>
        }
        onRowClick={(u) => setSelected(u)}
        emptyTitle="No universities found"
        onClearFilters={resetFilters}
        pageSize={12}
        renderMobileCard={(u) => {
          const match = matchById?.[u.id];
          return (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">
                  {u.course} · {u.country}
                </p>
              </div>
              {match && <MatchBadge verdict={match.verdict} />}
            </div>
          );
        }}
      />

      {activeStudent && (
        <ShortlistDock
          student={activeStudent}
          count={shortlistedIds.length}
          onReview={() => setVerdictFilter("shortlisted")}
          onReport={() => {
            if (shortlistedIds.length === 0) {
              toast.error("Shortlist at least one university");
              return;
            }
            setReportOpen(true);
          }}
          onCreateApps={() => {
            if (shortlistedIds.length === 0) {
              toast.error("Shortlist at least one university");
              return;
            }
            const result = createApplicationsFromShortlist(activeStudent.id, shortlistedIds);
            if (result.created === 0) {
              toast.message("Applications already exist for this shortlist");
            } else {
              toast.success(
                result.skipped
                  ? `Created ${result.created} applications (${result.skipped} already existed)`
                  : `Created ${result.created} applications`,
              );
            }
          }}
          onClear={() => {
            clearShortlist(activeStudent.id);
            toast.message("Shortlist cleared");
          }}
        />
      )}

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.location} · {selected.country}
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-5 p-6">
                {selectedMatch && activeStudent && (
                  <div className="rounded-lg border border-border p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Match for {activeStudent.name}
                        </p>
                        <p className="text-sm font-medium">Why this {selectedMatch.verdict === "eligible" ? "fits" : "result"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-xs font-medium">{selectedMatch.score}%</span>
                        <MatchBadge verdict={selectedMatch.verdict} />
                      </div>
                    </div>
                    <RequirementList checks={selectedMatch.checks} />
                    {selectedMatch.reasons.length > 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">{selectedMatch.reasons[0]}</p>
                    )}
                    <Button
                      className="mt-4 w-full"
                      variant={shortlistedSet.has(selected.id) ? "outline" : "default"}
                      onClick={() => toggleShortlist(activeStudent.id, selected.id)}
                    >
                      {shortlistedSet.has(selected.id) ? "Remove from shortlist" : "Add to shortlist"}
                    </Button>
                  </div>
                )}
                <Section title="Program">
                  <Row k="Course" v={selected.course} />
                  <Row k="Branch" v={selected.branch} />
                  <Row k="Intake" v={selected.intake} />
                </Section>
                <Section title="Eligibility">
                  <Row k="IELTS" v={String(selected.ielts)} />
                  <Row k="TOEFL" v={String(selected.toefl)} />
                  <Row k="German language" v={selected.germanLanguage} />
                  <Row k="GRE" v={selected.gre} />
                  <Row k="German grade" v={String(selected.germanGrade)} />
                </Section>
                <Section title="Application">
                  <Row k="Via" v={selected.applicationVia} />
                  <Row k="Fee" v={formatINR(selected.applicationFee)} />
                  <Row k="Deadline" v={formatShortDate(selected.deadline)} />
                  <Row k="Documents courier" v={selected.documentsCourier} />
                  <Row k="Aptitude test" v={selected.aptitudeTest} />
                </Section>
                <Section title="Financial">
                  <Row k="Tuition" v={formatINR(selected.tuitionFees)} />
                  <Row k="MOI based" v={selected.moi ? "Yes" : "No"} />
                </Section>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setEditing(selected);
                      setSelected(null);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      duplicate(selected.id);
                      toast.success("Duplicated");
                    }}
                  >
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      archive(selected.id);
                      setSelected(null);
                      toast.message("Archived");
                    }}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {activeStudent && matches && (
        <EligibilityReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          student={activeStudent}
          counselor={counselor}
          settings={settings}
          universities={universities}
          matches={matches}
          shortlistedIds={shortlistedIds}
          studentMessage={shortlist?.studentMessage ?? ""}
          onMessageChange={(v) => setShortlistMessage(activeStudent.id, v)}
        />
      )}

      <UniversityEditor
        value={editing}
        onClose={() => setEditing(null)}
        onSave={(u) => {
          upsert(u);
          toast.success("University updated");
          setEditing(null);
        }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function UniversityEditor({
  value,
  onClose,
  onSave,
}: {
  value: University | null;
  onClose: () => void;
  onSave: (u: University) => void;
}) {
  const [draft, setDraft] = useState<University>(blankUni());

  useEffect(() => {
    if (value) setDraft(value);
  }, [value]);

  const patch = (p: Partial<University>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <Dialog open={!!value} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{value?.name ? "Edit university" : "Add university"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="University name">
            <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
          </FormField>
          <FormField label="Location">
            <Input value={draft.location} onChange={(e) => patch({ location: e.target.value })} />
          </FormField>
          <FormField label="Country">
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
          <FormField label="Course">
            <Input value={draft.course} onChange={(e) => patch({ course: e.target.value })} />
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
          <FormField label="Intake">
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
          <div className="grid grid-cols-2 gap-3">
            <FormField label="IELTS">
              <Input type="number" step="0.5" value={draft.ielts} onChange={(e) => patch({ ielts: Number(e.target.value) })} />
            </FormField>
            <FormField label="TOEFL">
              <Input type="number" value={draft.toefl} onChange={(e) => patch({ toefl: Number(e.target.value) })} />
            </FormField>
            <FormField label="German grade">
              <Input
                type="number"
                step="0.1"
                value={draft.germanGrade}
                onChange={(e) => patch({ germanGrade: Number(e.target.value) })}
              />
            </FormField>
            <FormField label="Application fee">
              <Input
                type="number"
                value={draft.applicationFee}
                onChange={(e) => patch({ applicationFee: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <FormField label="Application via">
            <Input value={draft.applicationVia} onChange={(e) => patch({ applicationVia: e.target.value })} />
          </FormField>
          <FormField label="Tuition fees (₹)">
            <Input
              type="number"
              value={draft.tuitionFees}
              onChange={(e) => patch({ tuitionFees: Number(e.target.value) })}
            />
          </FormField>
          <label className="flex items-center justify-between text-sm">
            MOI based
            <Switch checked={draft.moi} onCheckedChange={(v) => patch({ moi: !!v })} />
          </label>
          <Button
            onClick={() => {
              if (!draft.name.trim()) {
                toast.error("Name is required");
                return;
              }
              onSave(draft);
            }}
          >
            Save university
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
