import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CircleHelp,
  Keyboard,
  LogOut,
  Menu,
  PanelLeft,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonAvatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";
import { useWorkspace } from "@/lib/workspace";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LABELS: Record<string, string> = {
  admin: "Admin",
  employee: "Employee",
  dashboard: "Overview",
  students: "Students",
  leads: "Leads",
  applications: "Applications",
  payments: "Payments",
  universities: "Universities",
  employees: "Employees",
  documents: "Documents",
  reports: "Reports",
  audit: "Audit Center",
  settings: "Settings",
  profile: "Profile",
  new: "New",
};

export function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const user = useAppStore((s) => s.currentUser);
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAll = useAppStore((s) => s.markAllNotificationsRead);
  const logout = useAppStore((s) => s.logout);
  const { role, base } = useWorkspace();
  const navigate = useNavigate();

  const crumbs = pathname.split("/").filter(Boolean);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/90 px-3 backdrop-blur-sm sm:px-5">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <PanelLeft className="size-4" />
      </Button>

      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
        {crumbs.map((c, i) => {
          const href = "/" + crumbs.slice(0, i + 1).join("/");
          const last = i === crumbs.length - 1;
          const label = LABELS[c] ?? c.replaceAll("_", " ");
          return (
            <span key={href} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              {last ? (
                <span className="truncate font-medium">{label}</span>
              ) : (
                <Link to={href} className="truncate text-muted-foreground hover:text-foreground">
                  {label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSearch}
          className="hidden h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary md:inline-flex"
          aria-label="Search"
        >
          <Search className="size-3.5" />
          <span className="w-28 text-left">Search…</span>
          <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono text-micro">⌘K</kbd>
        </button>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onSearch} aria-label="Search">
          <Search className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-3 py-2.5">
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <button type="button" className="text-micro font-medium text-primary" onClick={() => markAll()}>
                  Mark all read
                </button>
              )}
            </div>
            <Separator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-secondary",
                    !n.read && "bg-accent/40",
                  )}
                  onClick={() => {
                    markRead(n.id);
                    void navigate({ to: n.href.replace("/admin/", `${base}/`).replace("/employee/", `${base}/`) });
                  }}
                >
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.body}</span>
                  <span className="text-micro text-muted-foreground">{relativeTime(n.timestamp)}</span>
                </button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Help">
              <CircleHelp className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Shortcuts</div>
            <DropdownMenuItem disabled>
              <Keyboard className="size-4" /> Search · ⌘K
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.message("This is a frontend prototype — help docs are simulated.")}
            >
              Documentation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account">
                <PersonAvatar name={user.name} hue={user.avatarHue} className="size-7" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void navigate({ to: role === "admin" ? "/admin/settings" : "/employee/profile" })}
              >
                {role === "admin" ? <Settings className="size-4" /> : <UserRound className="size-4" />}
                {role === "admin" ? "Settings" : "Profile"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onClick={() => {
                  logout();
                  toast.message("Signed out");
                  void navigate({ to: "/login" });
                }}
              >
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
