"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Menu,
  X,
  Users,
  ChevronDown,
  Plus,
} from "lucide-react";
import { clsx } from "clsx";
import { usePortfolio, Portfolio } from "@/lib/portfolio-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/collection", label: "Collection", icon: FolderOpen, adminOnly: false },
  { href: "/dashboard/add", label: "Add Asset", icon: Search, adminOnly: true },
  { href: "/team", label: "Team", icon: Users, adminOnly: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const { portfolios, currentPortfolio, setCurrentPortfolio, isReadOnly } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [portfolioDropdownOpen, setPortfolioDropdownOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border flex items-center px-4 z-50 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 text-text-secondary hover:text-text-primary"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="ml-3 flex items-center gap-2">
          <img src="/logo.png" alt="West Investments Ltd" className="h-10 object-contain" />
        </Link>

      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed left-0 top-0 h-full w-64 bg-surface border-r border-border flex flex-col z-50",
          "transition-transform duration-200 ease-in-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img src="/logo.png" alt="West Investments Ltd" className="h-14 object-contain" />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-text-secondary hover:text-text-primary lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || !isReadOnly)
            .map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium",
                    isActive
                      ? "bg-accent-muted text-accent-hover"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        {/* Portfolio Switcher */}
        {isSignedIn && (
          <div className="px-4 pb-4">
            <p className="text-xs text-text-muted mb-2 px-4">Portfolio</p>
            {portfolios.length > 0 ? (
              <div className="relative">
                <button
                  onClick={() => setPortfolioDropdownOpen(!portfolioDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-hover text-sm text-text-primary hover:bg-border transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">
                      {currentPortfolio?.name || "Select Portfolio"}
                    </span>
                    {currentPortfolio && (
                      <span
                        className={clsx(
                          "flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                          currentPortfolio.role === "read_only"
                            ? "bg-blue-500/15 text-blue-400"
                            : "bg-accent/15 text-accent"
                        )}
                      >
                        {currentPortfolio.role === "read_only" ? "Viewer" : "Admin"}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={clsx("w-4 h-4 transition-transform flex-shrink-0", portfolioDropdownOpen && "rotate-180")} />
                </button>
                {portfolioDropdownOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-10">
                    {portfolios.map((portfolio) => {
                      const roleLabel = portfolio.role === "read_only" ? "Viewer" : "Admin";
                      const isViewer = portfolio.role === "read_only";
                      return (
                        <button
                          key={portfolio.id}
                          onClick={() => {
                            setCurrentPortfolio(portfolio as Portfolio);
                            setPortfolioDropdownOpen(false);
                          }}
                          className={clsx(
                            "w-full px-4 py-2.5 text-left text-sm hover:bg-surface-hover transition-colors flex items-center justify-between",
                            currentPortfolio?.id === portfolio.id
                              ? "text-accent bg-accent/5"
                              : "text-text-secondary"
                          )}
                        >
                          <span className="truncate">{portfolio.name}</span>
                          <span
                            className={clsx(
                              "flex-shrink-0 ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                              isViewer
                                ? "bg-blue-500/15 text-blue-400"
                                : "bg-accent/15 text-accent"
                            )}
                          >
                            {roleLabel}
                          </span>
                        </button>
                      );
                    })}
                    <Link
                      href="/onboarding?new=true"
                      onClick={() => setPortfolioDropdownOpen(false)}
                      className="w-full px-4 py-2.5 text-left text-sm text-accent hover:bg-surface-hover transition-colors flex items-center gap-2 border-t border-border"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Portfolio
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/onboarding"
                className="block px-4 py-3 rounded-xl bg-surface-hover text-sm text-text-muted hover:text-text-primary hover:bg-border transition-colors text-center"
              >
                Create a Portfolio
              </Link>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border">
          {isSignedIn ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <UserButton afterSignOutUrl="/" />
              <span className="text-sm text-text-secondary">Account</span>
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="block px-4 py-3 rounded-xl bg-accent text-black text-center text-sm font-medium hover:bg-accent-hover"
            >
              Sign In
            </Link>
          )}
          <div className="px-4 py-2 mt-2">
            <p className="text-xs text-text-muted">
              Powered by JustTCG &amp; PokemonPriceTracker
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
