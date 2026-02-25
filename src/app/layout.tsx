import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { PortfolioProvider } from "@/lib/portfolio-context";

export const metadata: Metadata = {
  title: "West Investments Ltd",
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
            <LayoutShell>{children}</LayoutShell>
          </PortfolioProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
