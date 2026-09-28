import { useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  ChevronsUpDown,
  CircleAlert,
  GraduationCap,
  ListChecks,
  Loader2,
  Minus,
  X,
} from "lucide-react";
import { PersonAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  formatEnglishProfile,
  studentGermanGrade,
  verdictLabel,
  type MatchVerdict,
  type RequirementCheck,
  type RequirementStatus,
} from "@/lib/eligibility";
import type { Student } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StudentPicker({
  students,
  value,
  onChange,
  disabled,
}: {
  students: Student[];
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = students.find((s) => s.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-10 min-w-0 flex-1 justify-between px-3 font-normal sm:min-w-72"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <PersonAvatar name={selected.name} hue={selected.avatarHue} className="size-6" />
              <span className="truncate">
                <span className="font-medium">{selected.name}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{selected.id}</span>
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select a student…</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(28rem,calc(100vw-2rem))] p-0">
        <Command className="rounded-lg">
          <CommandInput placeholder="Search name, ID, email, college…" />
          <CommandList>
            <CommandEmpty>No matching students.</CommandEmpty>
            <CommandGroup>
              {students.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.name} ${s.id} ${s.email} ${s.college} ${s.country} ${s.branch}`}
                  onSelect={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                >
                  <PersonAvatar name={s.name} hue={s.avatarHue} className="size-7" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{s.name}</span>
                      <span className="font-mono text-micro text-muted-foreground">{s.id}</span>
                    </span>
                    <span className="block truncate text-micro text-muted-foreground">
                      {s.country} · {s.intake} · {s.branch}
                    </span>
                  </span>
                  {value === s.id && <Check className="size-4 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function MatchBadge({ verdict, className }: { verdict: MatchVerdict; className?: string }) {
  const variant = verdict === "eligible" ? "success" : verdict === "close" ? "warning" : "danger";
  return (
    <Badge variant={variant} className={className}>
      {verdictLabel(verdict)}
    </Badge>
  );
}

export function ScoreMeter({ score, verdict }: { score: number; verdict: MatchVerdict }) {
  const bar = verdict === "eligible" ? "bg-success" : verdict === "close" ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex min-w-20 items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.max(4, score)}%` }} />
      </div>
      <span className="tabular-nums text-xs font-medium">{score}%</span>
    </div>
  );
}

function statusIcon(status: RequirementStatus) {
  if (status === "met") return <Check className="size-3.5 text-success" />;
  if (status === "close") return <CircleAlert className="size-3.5 text-warning" />;
  if (status === "na") return <Minus className="size-3.5 text-muted-foreground" />;
  return <X className="size-3.5 text-destructive" />;
}

export function RequirementList({ checks, compact }: { checks: RequirementCheck[]; compact?: boolean }) {
  return (
    <TooltipProvider delayDuration={200}>
      <ul className={cn("grid gap-1.5", compact ? "gap-1" : "gap-1.5")}>
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary">
              {statusIcon(c.status)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium">{c.label}</span>
                <span className="text-micro text-muted-foreground">
                  Need {c.required}
                  {c.status !== "na" ? ` · have ${c.actual}` : ""}
                </span>
              </span>
              {!compact && <span className="mt-0.5 block text-xs text-muted-foreground">{c.detail}</span>}
            </span>
            {compact && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="mt-0.5 text-muted-foreground" aria-label={c.detail}>
                    <CircleAlert className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{c.detail}</TooltipContent>
              </Tooltip>
            )}
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
}

export function EligibilityToolbar({
  students,
  pickedId,
  onPick,
  activeStudent,
  analyzing,
  onAnalyze,
  onClear,
  summary,
  verdictFilter,
  onVerdictFilter,
  shortlistedCount,
  onShortlistTop,
}: {
  students: Student[];
  pickedId: string | null;
  onPick: (id: string | null) => void;
  activeStudent: Student | null;
  analyzing: boolean;
  onAnalyze: () => void;
  onClear: () => void;
  summary: { eligible: number; close: number; ineligible: number; total: number } | null;
  verdictFilter: "all" | MatchVerdict | "shortlisted";
  onVerdictFilter: (v: "all" | MatchVerdict | "shortlisted") => void;
  shortlistedCount: number;
  onShortlistTop: () => void;
}) {
  return (
    <section className="rounded-xl bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Check student eligibility</h2>
            <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
              Select a student to see which universities match their academics — and why.
            </p>
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <StudentPicker students={students} value={pickedId} onChange={onPick} disabled={analyzing} />
          <Button onClick={onAnalyze} disabled={!pickedId || analyzing} className="shrink-0">
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : <ListChecks className="size-4" />}
            {analyzing ? "Analyzing…" : "Check eligibility"}
          </Button>
        </div>
      </div>

      {activeStudent && summary && (
        <div className="mt-5 grid gap-4 border-t border-border pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <PersonAvatar name={activeStudent.name} hue={activeStudent.avatarHue} className="size-10" />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {activeStudent.name}
                  <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{activeStudent.id}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {activeStudent.country} · {activeStudent.intake} · {activeStudent.branch} · {activeStudent.college}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatChip label="CGPA" value={activeStudent.cgpa.toFixed(2)} />
              <StatChip label="Grade" value={studentGermanGrade(activeStudent).toFixed(1)} />
              <StatChip label="English" value={formatEnglishProfile(activeStudent)} />
              <StatChip
                label="German"
                value={activeStudent.germanLanguage === "None" ? "—" : activeStudent.germanLanguage}
              />
              {typeof activeStudent.gre === "number" && <StatChip label="GRE" value={String(activeStudent.gre)} />}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <SummaryPill tone="success" label="Eligible" count={summary.eligible} />
              <SummaryPill tone="warning" label="Close match" count={summary.close} />
              <SummaryPill tone="danger" label="Not eligible" count={summary.ineligible} />
              <SummaryPill tone="primary" label="Shortlisted" count={shortlistedCount} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-secondary p-1">
                {(
                  [
                    ["all", "All"],
                    ["eligible", "Eligible"],
                    ["close", "Close"],
                    ["ineligible", "Not eligible"],
                    ["shortlisted", "Shortlisted"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onVerdictFilter(key)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      verdictFilter === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={onShortlistTop}>
                <BookmarkPlus className="size-3.5" />
                Shortlist top matches
              </Button>
              <Button variant="ghost" size="sm" onClick={onClear}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-micro">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

function SummaryPill({
  tone,
  label,
  count,
}: {
  tone: "success" | "warning" | "danger" | "primary";
  label: string;
  count: number;
}) {
  const cls = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium", cls)}>
      <span className="tabular-nums">{count}</span>
      {label}
    </span>
  );
}

export function ShortlistToggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-8"
      aria-label={active ? "Remove from shortlist" : "Add to shortlist"}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {active ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4 text-muted-foreground" />}
    </Button>
  );
}

export function ShortlistDock({
  student,
  count,
  onReview,
  onReport,
  onCreateApps,
  onClear,
}: {
  student: Student;
  count: number;
  onReview: () => void;
  onReport: () => void;
  onCreateApps: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-3 z-20">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-popover backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          <span className="tabular-nums font-semibold">{count}</span>{" "}
          {count === 1 ? "university" : "universities"} shortlisted for{" "}
          <span className="font-medium">{student.name}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={onReview}>
            Review shortlist
          </Button>
          <Button variant="outline" size="sm" onClick={onCreateApps}>
            Create applications
          </Button>
          <Button size="sm" onClick={onReport}>
            Generate report
          </Button>
        </div>
      </div>
    </div>
  );
}
