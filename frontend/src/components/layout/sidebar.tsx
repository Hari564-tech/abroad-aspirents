import type { ComponentType } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Building2,
  ChevronUp,
  CreditCard,
  FileText,
  Files,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/lib/workspace";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Item = { to: string; label: string; icon: ComponentType<{ className?: string }> };

function NavItem({ item, collapsed, onClick }: { item: Item; collapsed: boolean; onClick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === item.to || pathname.startsWith(item.to + "/");
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <item.icon className="size-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { role, base } = useWorkspace();
  const user = useAppStore((s) => s.currentUser);
  const setTheme = useAppStore((s) => s.setTheme);
  const logout = useAppStore((s) => s.logout);
  const navigate = useNavigate();

  const workspace: Item[] = [
    { to: `${base}/dashboard`, label: "Overview", icon: LayoutDashboard },
    { to: `${base}/students`, label: "Students", icon: GraduationCap },
    { to: `${base}/documents`, label: "Documents", icon: Files },
    { to: `${base}/leads`, label: "Leads", icon: UserRound },
    { to: `${base}/applications`, label: "Applications", icon: FileText },
    { to: `${base}/payments`, label: "Payments", icon: CreditCard },
    { to: `${base}/universities`, label: "Universities", icon: Building2 },
  ];
  const management: Item[] =
    role === "admin"
      ? [
          { to: "/admin/employees", label: "Employees", icon: Users },
          { to: "/admin/reports", label: "Reports", icon: Activity },
        ]
      : [{ to: `${base}/profile`, label: "My profile", icon: UserRound }];
  const admin: Item[] =
    role === "admin"
      ? [
          { to: "/admin/audit", label: "Audit Center", icon: ShieldCheck },
          { to: "/admin/settings", label: "Settings", icon: Settings },
        ]
      : [];

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-14 items-center px-3", collapsed && "justify-center")}>
        <Link to={base + "/dashboard"} onClick={onNavigate}>
          <Logo compact={collapsed} />
        </Link>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-3">
        {!collapsed && (
          <p className="mb-1.5 px-2 text-micro font-medium uppercase tracking-wider text-muted-foreground">Workspace</p>
        )}
        <nav className="grid gap-0.5">
          {workspace.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} onClick={onNavigate} />
          ))}
        </nav>
        {management.length > 0 && (
          <>
            {!collapsed && (
              <p className="mb-1.5 mt-5 px-2 text-micro font-medium uppercase tracking-wider text-muted-foreground">
                {role === "admin" ? "Management" : "Account"}
              </p>
            )}
            <nav className="mt-2 grid gap-0.5">
              {management.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} onClick={onNavigate} />
              ))}
            </nav>
          </>
        )}
        {admin.length > 0 && (
          <>
            {!collapsed && (
              <p className="mb-1.5 mt-5 px-2 text-micro font-medium uppercase tracking-wider text-muted-foreground">
                Admin
              </p>
            )}
            <nav className="mt-2 grid gap-0.5">
              {admin.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} onClick={onNavigate} />
              ))}
            </nav>
          </>
        )}
      </ScrollArea>
      <Separator />
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={cn("h-auto w-full justify-start gap-2.5 px-2 py-2", collapsed && "justify-center px-0")}>
              {user && <PersonAvatar name={user.name} hue={user.avatarHue} className="size-8" />}
              {!collapsed && user && (
                <>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium">{user.name}</span>
                    <span className="block truncate text-micro text-muted-foreground">
                      {user.role === "admin" ? "Administrator" : user.title}
                    </span>
                  </span>
                  <ChevronUp className="size-4 text-muted-foreground" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem onClick={() => void navigate({ to: role === "admin" ? "/admin/settings" : "/employee/profile" })}>
              {role === "admin" ? <Settings className="size-4" /> : <UserRound className="size-4" />}
              {role === "admin" ? "Settings" : "Profile"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="size-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="size-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="size-4" /> System
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
      </div>
    </div>
  );
}
