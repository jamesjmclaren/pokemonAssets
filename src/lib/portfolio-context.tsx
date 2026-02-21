"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";

export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  role: "owner" | "admin" | "read_only";
}

interface PortfolioContextType {
  portfolios: Portfolio[];
  currentPortfolio: Portfolio | null;
  setCurrentPortfolio: (portfolio: Portfolio) => void;
  loading: boolean;
  refetch: () => Promise<Portfolio[]>;
  isReadOnly: boolean;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up", "/invite", "/onboarding"];

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [currentPortfolio, setCurrentPortfolioState] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  async function fetchPortfolios() {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolios");
      const data = await res.json();
      
      if (!res.ok) {
        console.error("Portfolio fetch error:", data.error);
        setLoading(false);
        return [];
      }
      
      if (Array.isArray(data)) {
        setPortfolios(data);
        
        // Restore from localStorage or use first portfolio
        const savedId = typeof window !== "undefined" ? localStorage.getItem("currentPortfolioId") : null;
        const saved = data.find((p: Portfolio) => p.id === savedId);
        if (saved) {
          setCurrentPortfolioState(saved);
        } else if (data.length > 0) {
          setCurrentPortfolioState(data[0]);
          if (typeof window !== "undefined") {
            localStorage.setItem("currentPortfolioId", data[0].id);
          }
        }
        
        setLoading(false);
        return data;
      }
      
      setLoading(false);
      return [];
    } catch (err) {
      console.error("Portfolio fetch exception:", err);
      setLoading(false);
      return [];
    }
  }

  function setCurrentPortfolio(portfolio: Portfolio) {
    setCurrentPortfolioState(portfolio);
    localStorage.setItem("currentPortfolioId", portfolio.id);
  }

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    fetchPortfolios().then((data) => {
      // If no portfolios and not on onboarding/public route, redirect to onboarding
      if (data.length === 0 && !pathname.startsWith("/onboarding") && !isPublicRoute) {
        router.replace("/onboarding");
      }
    });
  }, [isLoaded, isSignedIn, pathname, isPublicRoute, router]);

  const isReadOnly = currentPortfolio?.role === "read_only";

  return (
    <PortfolioContext.Provider
      value={{
        portfolios,
        currentPortfolio,
        setCurrentPortfolio,
        loading,
        refetch: fetchPortfolios,
        isReadOnly,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }
  return context;
}
