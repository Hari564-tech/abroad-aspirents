import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { PersonAvatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { useScopedIds } from "@/lib/scoped";
import { relativeTime } from "@/lib/format";

export function ProfilePage() {
  const user = useAppStore((s) => s.currentUser);
  const { students, applications, auditEvents } = useScopedIds();
  if (!user) return null;
  const offers = students.filter((s) => s.status === "Offered" || s.status === "Got Visa").length;
  const visas = students.filter((s) => s.status === "Got Visa").length;

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" description="Your directory information and recent work." />
      <div className="flex items-center gap-3">
        <PersonAvatar name={user.name} hue={user.avatarHue} className="size-14" />
        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">
            {user.title} · {user.department}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="mt-1 font-medium">{user.email}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="mt-1 font-medium">{user.phone}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Role</p>
          <p className="mt-1 font-medium capitalize">{user.role}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Department</p>
          <p className="mt-1 font-medium">{user.department}</p>
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Students" value={students.length} />
        <StatCard label="Applications" value={applications.length} />
        <StatCard label="Offers" value={offers} />
        <StatCard label="Visas" value={visas} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditEvents.slice(0, 8).map((e) => (
            <div key={e.id} className="text-sm">
              <p className="font-medium">{e.details}</p>
              <p className="text-micro text-muted-foreground">
                {e.recordId} · {relativeTime(e.timestamp)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
