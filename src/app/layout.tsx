import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { PortfolioProvider } from "@/lib/portfolio-context";

export const metadata: Metadata = {
  title: "N&C Assets",
  description: "Professional card and sealed product portfolio tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased">
          <PortfolioProvider>
            <Sidebar />
            <main className="lg:ml-64 min-h-screen p-4 pt-18 lg:p-8 lg:pt-8">{children}</main>
          </PortfolioProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
