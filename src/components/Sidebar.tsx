"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FolderOpen,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "Collection", icon: FolderOpen },
  { href: "/dashboard/add", label: "Add Asset", icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">
              N&C Assets
            </h1>
          </div>
        </Link>
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
  );
}
