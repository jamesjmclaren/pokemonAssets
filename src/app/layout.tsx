import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { PortfolioProvider } from "@/lib/portfolio-context";
import { CurrencyProvider } from "@/lib/currency-context";

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
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://images.pokemontcg.io" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased">
          <PortfolioProvider>
            <CurrencyProvider>
              <LayoutShell>{children}</LayoutShell>
            </CurrencyProvider>
          </PortfolioProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
