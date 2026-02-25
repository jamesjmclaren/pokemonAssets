"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

const NO_SIDEBAR_ROUTES = ["/sign-in", "/sign-up", "/invite"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLandingPage = pathname === "/";
  const isNoSidebarRoute = NO_SIDEBAR_ROUTES.some((r) => pathname.startsWith(r));
  const hideSidebar = isLandingPage || isNoSidebarRoute;

  if (hideSidebar) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="lg:ml-64 min-h-screen p-4 pt-18 lg:p-8 lg:pt-8">{children}</main>
    </>
  );
}
