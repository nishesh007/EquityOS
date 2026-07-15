"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Briefcase,
  Star,
  Newspaper,
  Calendar,
  Settings,
  TrendingUp,
  Bot,
  ChevronLeft,
  ChevronRight,
  Building2,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, exact: true },
  { label: "Research", href: "/research", icon: BookOpen },
  { label: "Markets", href: "/markets", icon: LineChart },
  { label: "Portfolio", href: "/portfolio", icon: Briefcase },
  { label: "Watchlist", href: "/watchlist", icon: Star },
  { label: "News", href: "/news", icon: Newspaper },
  { label: "Results", href: "/results", icon: Calendar },
  { label: "AI Insights", href: "/ai", icon: Bot, badge: "New" },
];

const bottomNavItems = [
  { label: "Screener", href: "/screener", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
];

function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const isCompanyPage = pathname.startsWith("/company/");
  const companySymbol = isCompanyPage
    ? pathname.split("/company/")[1]?.toUpperCase()
    : null;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 isolate flex h-screen flex-col border-r border-surface-border-subtle bg-surface/95 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex h-14 items-center gap-3 border-b border-surface-border-subtle px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 ring-1 ring-accent/30">
          <TrendingUp className="h-4 w-4 text-accent" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-text-primary">
              EquityOS
            </span>
            <span className="text-[10px] text-text-muted">Pro Terminal</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {isCompanyPage && !collapsed && (
          <div className="mb-4 rounded-lg border border-accent/20 bg-accent/5 p-3">
            <div className="flex items-center gap-2 text-accent">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Company Research
              </span>
            </div>
            {companySymbol && (
              <p className="mt-1.5 text-sm font-medium text-text-primary">
                {companySymbol}
              </p>
            )}
            <Link
              href="/"
              className="mt-2 flex items-center gap-1.5 text-[10px] text-text-muted transition-colors hover:text-text-secondary"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Dashboard
            </Link>
          </div>
        )}

        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(pathname, item.href, item.exact);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-accent/10 text-accent shadow-glow"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive ? "text-accent" : "text-text-muted group-hover:text-text-secondary"
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-4 h-px bg-surface-border-subtle" />

        <ul className="space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-surface-overlay text-text-primary"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 text-text-muted group-hover:text-text-secondary" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-surface-border-subtle p-3">
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
