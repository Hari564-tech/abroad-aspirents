import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useWorkspace } from "@/lib/workspace";

export function greetingName(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name.split(" ")[0]}`;
}

export function useEmployeeMap() {
  const employees = useAppStore((s) => s.employees);
  return useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
}

export function useUniversityMap() {
  const universities = useAppStore((s) => s.universities);
  return useMemo(() => Object.fromEntries(universities.map((u) => [u.id, u])), [universities]);
}

export function useStudentMap() {
  const students = useAppStore((s) => s.students);
  return useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students]);
}

export function useScopedIds() {
  const { role } = useWorkspace();
  const user = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const applications = useAppStore((s) => s.applications);
  const payments = useAppStore((s) => s.payments);
  const leads = useAppStore((s) => s.leads);
  const documents = useAppStore((s) => s.documents);
  const workItems = useAppStore((s) => s.workItems);
  const auditEvents = useAppStore((s) => s.auditEvents);
  const notifications = useAppStore((s) => s.notifications);

  return useMemo(() => {
    if (role !== "employee" || !user) {
      return { students, applications, payments, leads, documents, workItems, auditEvents, notifications };
    }
    const mine = students.filter((s) => s.employeeId === user.id);
    const ids = new Set(mine.map((s) => s.id));
    return {
      students: mine,
      applications: applications.filter((a) => a.employeeId === user.id || ids.has(a.studentId)),
      payments: payments.filter((p) => ids.has(p.studentId)),
      leads: leads.filter((l) => l.employeeId === user.id),
      documents: documents.filter((d) => ids.has(d.studentId)),
      workItems: workItems.filter((w) => w.employeeId === user.id),
      auditEvents: auditEvents.filter((e) => e.userId === user.id || ids.has(e.recordId)),
      notifications: notifications.map((n) => ({
        ...n,
        href: n.href.replace("/admin/", "/employee/"),
      })),
    };
  }, [role, user, students, applications, payments, leads, documents, workItems, auditEvents, notifications]);
}
