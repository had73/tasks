import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ListChecks, GanttChartSquare, UserRound, Shield,
  Search, LogOut, Plus, Menu, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/tasks", label: "Úkoly", icon: ListChecks },
  { to: "/timeline", label: "Timeline", icon: GanttChartSquare },
  { to: "/my", label: "Moje úkoly", icon: UserRound },
];

function SidebarContent({ collapsed, user, onNav }) {
  return (
    <div className="flex flex-col h-full">
      <div className={cn("px-4 h-16 flex items-center border-b border-zinc-200", collapsed && "px-2 justify-center")}>
        <div className="w-9 h-9 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold font-display">TF</div>
        {!collapsed && <span className="ml-2.5 font-display font-bold text-lg tracking-tight">TaskFlow</span>}
      </div>
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNav}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100",
                collapsed && "justify-center px-2"
              )
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
        {user?.role === "admin" && (
          <>
            <div className={cn("mt-4 mb-1 px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider", collapsed && "hidden")}>
              Administrace
            </div>
            <NavLink
              to="/admin"
              onClick={onNav}
              data-testid="nav-admin"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100",
                  collapsed && "justify-center px-2"
                )
              }
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Administrace</span>}
            </NavLink>
          </>
        )}
      </nav>
      <div className={cn("p-3 border-t border-zinc-200", collapsed && "px-2")}>
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <UserAvatar user={user} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</div>
              <div className="text-xs text-zinc-500 truncate">{user?.role === "admin" ? "Administrátor" : "Uživatel"}</div>
            </div>
          </div>
        ) : (
          <UserAvatar user={user} size={32} className="mx-auto" />
        )}
      </div>
    </div>
  );
}

export default function Layout({ children, search, setSearch, onCreateTask }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-30 bg-white border-r border-zinc-200 transition-all duration-200 flex-col",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent collapsed={collapsed} user={user} />
        <button
          onClick={() => setCollapsed((v) => !v)}
          data-testid="sidebar-toggle"
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 shadow-sm"
        >
          {collapsed ? <ChevronsRight className="w-3 h-3" /> : <ChevronsLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent collapsed={false} user={user} onNav={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className={cn("flex-1 flex flex-col", "lg:pl-64", collapsed && "lg:pl-16")}>
        {/* App bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/70 backdrop-blur-xl border-b border-zinc-200/70 flex items-center px-4 gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} data-testid="mobile-menu-btn">
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Hledat úkoly podle názvu nebo textu..."
              value={search || ""}
              onChange={(e) => setSearch?.(e.target.value)}
              className="pl-9 h-9 bg-zinc-50 border-zinc-200"
              data-testid="global-search"
            />
          </div>

          {onCreateTask && (
            <Button onClick={onCreateTask} className="bg-zinc-900 hover:bg-zinc-800 h-9" data-testid="new-task-btn">
              <Plus className="w-4 h-4 mr-1.5" /> Nový úkol
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full" data-testid="user-menu-btn">
                <UserAvatar user={user} size={34} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-medium">{user?.first_name} {user?.last_name}</div>
                <div className="text-xs text-zinc-500 font-normal">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
                <UserRound className="w-4 h-4 mr-2" /> Profil
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                  <Shield className="w-4 h-4 mr-2" /> Administrace
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={doLogout} data-testid="menu-logout">
                <LogOut className="w-4 h-4 mr-2" /> Odhlásit se
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
