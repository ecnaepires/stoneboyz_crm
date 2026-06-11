"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Briefcase,
  Calendar,
  KanbanSquare,
  Layers,
  LayoutDashboard,
  PanelLeft,
  Plus,
  Tags,
  UserCog,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface AppShellProps {
  isAdmin: boolean;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Accounts", icon: Users },
  { href: "/projects", label: "Jobs", icon: Briefcase },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/schedule", label: "Calendar", icon: Calendar },
  { href: "/price-lists", label: "Price Lists", icon: Tags },
  { href: "/slabs", label: "Slabs", icon: Layers },
  { href: "/customers/archived", label: "Archived", icon: Archive },
] as const;

const navLinkClass = (active: boolean): string =>
  cn(
    "flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-accent/10 font-semibold text-accent ring-1 ring-inset ring-accent/20"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export function AppShell({ isAdmin, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string): boolean => pathname === href;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <nav
        className={cn(
          "flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200",
          collapsed ? "w-0 min-w-0 overflow-hidden p-0" : "w-64 p-3",
        )}
      >
        <div className="mb-5 flex items-center gap-2.5 px-2 py-1.5">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-accent text-[11px] font-extrabold tracking-wide text-accent-foreground">
            SBZ
          </span>
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">
              Stone Boyz
            </div>
            <div className="text-[8px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Luxury Kitchen
            </div>
          </div>
        </div>

        {!collapsed && (
          <>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Workspace
            </p>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <li key={label}>
                  <Link href={href} className={navLinkClass(isActive(href))}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {isAdmin && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Admin
                </p>
                <ul className="space-y-0.5">
                  <li>
                    <Link
                      href="/admin/users"
                      className={navLinkClass(isActive("/admin/users"))}
                    >
                      <UserCog className="h-4 w-4 shrink-0" />
                      Users
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
      </nav>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-2.5 backdrop-blur">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="ml-auto flex items-center gap-2.5">
            <Link
              href="/customers"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New Quote
            </Link>
            <ThemeToggle />
            <span className="h-9 w-9 rounded-full bg-gradient-to-br from-muted-foreground/40 to-muted-foreground/70" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
