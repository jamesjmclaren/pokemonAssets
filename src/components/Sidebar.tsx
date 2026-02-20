"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Menu,
  X,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "Collection", icon: FolderOpen },
  { href: "/dashboard/add", label: "Add Asset", icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
        <Link href="/dashboard" className="ml-3">
          <h1 className="text-base font-bold text-text-primary tracking-tight">
            N&C Assets
          </h1>
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
            <div>
              <h1 className="text-lg font-bold text-text-primary tracking-tight">
                N&C Assets
              </h1>
            </div>
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
          {navItems.map((item) => {
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

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="px-4 py-3 rounded-xl bg-surface-hover">
            <p className="text-xs text-text-muted">Powered by</p>
            <p className="text-xs text-text-secondary font-medium">
              PokemonPriceTracker
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
