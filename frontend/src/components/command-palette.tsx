import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Files, GraduationCap, LayoutDashboard, Plus, UserRound } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useWorkspace } from "@/lib/workspace";
import { useAppStore } from "@/lib/store";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { base, role } = useWorkspace();
  const students = useAppStore((s) => s.students);
  const employees = useAppStore((s) => s.employees);
  const universities = useAppStore((s) => s.universities);
  const applications = useAppStore((s) => s.applications);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const query = q.trim().toLowerCase();
  const matchedStudents = useMemo(
    () =>
      students
        .filter((s) => !query || `${s.name} ${s.id} ${s.country} ${s.status}`.toLowerCase().includes(query))
        .slice(0, 6),
    [students, query],
  );
  const matchedUnis = useMemo(
    () =>
      universities
        .filter((u) => !query || `${u.name} ${u.course} ${u.country}`.toLowerCase().includes(query))
        .slice(0, 5),
    [universities, query],
  );
  const matchedEmps = useMemo(
    () =>
      role === "admin"
        ? employees
            .filter((e) => !query || `${e.name} ${e.email} ${e.department}`.toLowerCase().includes(query))
            .slice(0, 5)
        : [],
    [employees, query, role],
  );
  const matchedApps = useMemo(
    () =>
      applications
        .filter((a) => !query || `${a.id} ${a.course} ${a.status}`.toLowerCase().includes(query))
        .slice(0, 5),
    [applications, query],
  );

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search anything…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>No matches. Try a student ID or university.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go(`${base}/dashboard`)}>
            <LayoutDashboard className="size-4 text-muted-foreground" />
            Go to overview
          </CommandItem>
          <CommandItem onSelect={() => go(`${base}/students/new`)}>
            <Plus className="size-4 text-muted-foreground" />
            Add student
          </CommandItem>
          <CommandItem onSelect={() => go(`${base}/documents`)}>
            <Files className="size-4 text-muted-foreground" />
            Documents
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Students">
          {matchedStudents.map((s) => (
            <CommandItem key={s.id} value={`${s.name} ${s.id}`} onSelect={() => go(`${base}/students/${s.id}`)}>
              <GraduationCap className="size-4 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium">{s.name}</div>
                <div className="text-micro text-muted-foreground">
                  {s.id} · {s.country} · {s.status}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Universities">
          {matchedUnis.map((u) => (
            <CommandItem key={u.id} value={u.name} onSelect={() => go(`${base}/universities?u=${u.id}`)}>
              <Building2 className="size-4 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium">{u.name}</div>
                <div className="text-micro text-muted-foreground">
                  {u.course} · {u.country}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        {matchedEmps.length > 0 && (
          <CommandGroup heading="Employees">
            {matchedEmps.map((e) => (
              <CommandItem key={e.id} value={e.name} onSelect={() => go(`/admin/employees/${e.id}`)}>
                <UserRound className="size-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-micro text-muted-foreground">
                    {e.title} · {e.department}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Applications">
          {matchedApps.map((a) => (
            <CommandItem key={a.id} value={a.id} onSelect={() => go(`${base}/applications`)}>
              <div>
                <div className="font-medium">{a.id}</div>
                <div className="text-micro text-muted-foreground">
                  {a.course} · {a.status}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
