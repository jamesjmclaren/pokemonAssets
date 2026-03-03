"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Printer,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Table,
} from "lucide-react";
import {
  formatCurrency,
  formatPercentage,
  formatDate,
  fixStorageUrl,
} from "@/lib/format";
import { usePortfolio } from "@/lib/portfolio-context";
import type { PortfolioAsset } from "@/types";

function getEvidenceLink(asset: PortfolioAsset): {
  label: string;
  url: string | null;
  color: string;
} {
  if (asset.pc_url) {
    return {
      label: "PriceCharting",
      url: asset.pc_url,
      color: "text-blue-400 bg-blue-500/10",
    };
  }

  if (
    asset.image_url &&
    asset.image_url.includes("tcgplayer-cdn.tcgplayer.com/product/")
  ) {
    const match = asset.image_url.match(/\/product\/(\d+)/);
    if (match) {
      return {
        label: "TCGPlayer",
        url: `https://www.tcgplayer.com/product/${match[1]}`,
        color: "text-orange-400 bg-orange-500/10",
      };
    }
  }

  if (asset.is_manual_submission) {
    return {
      label: "Manual Entry",
      url: (asset as PortfolioAsset & { evidence_url?: string | null }).evidence_url || null,
      color: "text-warning bg-warning-muted",
    };
  }

  return { label: "API", url: null, color: "text-text-muted bg-surface-hover" };
}

const TYPE_COLORS: Record<string, string> = {
  card: "#D4AF37",
  sealed: "#f59e0b",
  comic: "#22c55e",
};

const TYPE_BADGE_CLASSES: Record<string, string> = {
  card: "text-gold bg-accent-muted",
  sealed: "text-amber-400 bg-amber-500/10",
  comic: "text-emerald-400 bg-emerald-500/10",
};

export default function ReportPage() {
  const { currentPortfolio, loading: portfolioLoading } = usePortfolio();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [sortField, setSortField] = useState<"name" | "type" | "date" | "cost" | "value" | "pl" | "roi">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchAssets() {
      if (!currentPortfolio) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/assets?portfolioId=${currentPortfolio.id}`
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setAssets(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching assets:", error);
        setAssets([]);
      } finally {
        setLoading(false);
      }
    }
    if (currentPortfolio) {
      setLoading(true);
      fetchAssets();
    } else if (!portfolioLoading) {
      setLoading(false);
    }
  }, [currentPortfolio, portfolioLoading]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const margin = 14;
      const contentW = pageW - margin * 2;
      let y = margin;

      // -- Colours --
      const dark: [number, number, number] = [17, 17, 17];
      const gold: [number, number, number] = [212, 175, 55];
      const white: [number, number, number] = [255, 255, 255];
      const grey: [number, number, number] = [160, 160, 160];
      const green: [number, number, number] = [34, 197, 94];
      const red: [number, number, number] = [239, 68, 68];
      const headerBg: [number, number, number] = [30, 30, 30];
      const rowAlt: [number, number, number] = [22, 22, 22];

      // -- Full-page dark background --
      const addPageBg = () => {
        pdf.setFillColor(...dark);
        pdf.rect(0, 0, 210, 297, "F");
      };
      addPageBg();

      // -- Logo --
      try {
        const logoRes = await fetch("/logo.png");
        const logoBlob = await logoRes.blob();
        const logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
        const logoW = 40;
        const logoH = (332 / 968) * logoW;
        pdf.addImage(logoDataUrl, "PNG", margin, y, logoW, logoH);
        y += logoH + 4;
      } catch {
        // Skip logo if unavailable
      }

      // -- Title --
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(...white);
      pdf.text("Portfolio Report", margin, y + 6);
      y += 10;

      // -- Subtitle --
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...grey);
      const portfolioName = currentPortfolio?.name || "Portfolio";
      let subtitle = `${portfolioName}  ·  Generated ${generatedDate}`;
      if (dateFrom || dateTo) {
        subtitle += `  ·  ${dateFrom || "All"} to ${dateTo || "Present"}`;
      }
      pdf.text(subtitle, margin, y + 5);
      y += 10;

      // -- Gold divider --
      pdf.setDrawColor(...gold);
      pdf.setLineWidth(0.6);
      pdf.line(margin, y, pageW - margin, y);
      y += 8;

      // -- Summary boxes --
      const summaryItems = [
        { label: "Total Assets", value: String(filteredAssets.length) },
        { label: "Total Invested", value: formatCurrency(totalInvested) },
        { label: "Current Value", value: formatCurrency(currentValue) },
        { label: "Total P/L", value: formatCurrency(totalProfit), color: totalProfit >= 0 ? green : red },
      ];
      const boxW = (contentW - 6) / 4;
      const boxH = 18;
      summaryItems.forEach((item, i) => {
        const x = margin + i * (boxW + 2);
        pdf.setFillColor(...headerBg);
        pdf.roundedRect(x, y, boxW, boxH, 2, 2, "F");
        pdf.setFontSize(7);
        pdf.setTextColor(...grey);
        pdf.text(item.label.toUpperCase(), x + 4, y + 6);
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...(item.color || white));
        pdf.text(item.value, x + 4, y + 14);
        pdf.setFont("helvetica", "normal");
      });
      y += boxH + 4;

      if (totalInvested > 0) {
        pdf.setFontSize(9);
        pdf.setTextColor(...(totalProfit >= 0 ? green : red));
        pdf.text(`ROI: ${formatPercentage(profitPercent)}`, margin, y + 3);
        y += 7;
      }

      // -- Breakdown by Type --
      if (breakdownData.length > 0) {
        y += 3;
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...white);
        pdf.text("Breakdown by Type", margin, y + 5);
        y += 10;

        const typeColors: Record<string, [number, number, number]> = {
          card: gold,
          sealed: [245, 158, 11],
          comic: green,
        };

        autoTable(pdf, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Type", "Count", "Value", "% of Portfolio"]],
          body: breakdownData.map((d) => [
            d.type.charAt(0).toUpperCase() + d.type.slice(1),
            String(d.count),
            formatCurrency(d.value),
            currentValue > 0 ? `${((d.value / currentValue) * 100).toFixed(1)}%` : "—",
          ]),
          theme: "plain",
          styles: { fontSize: 9, textColor: white, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
          headStyles: { fillColor: headerBg, textColor: gold, fontStyle: "bold", fontSize: 8 },
          alternateRowStyles: { fillColor: rowAlt },
          bodyStyles: { fillColor: dark },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 0) {
              const type = breakdownData[data.row.index]?.type;
              if (type && typeColors[type]) {
                data.cell.styles.textColor = typeColors[type];
              }
            }
          },
        });
        y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      }

      // -- Assets Detail Table --
      if (sortedRows.length > 0) {
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...white);
        pdf.text("Assets Detail", margin, y + 5);
        y += 10;

        autoTable(pdf, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["#", "Asset", "Type", "Grade", "Date", "Cost", "Value", "P/L", "ROI %"]],
          body: sortedRows.map((row, i) => [
            String(i + 1),
            row.asset.name + (row.qty > 1 ? ` (×${row.qty})` : ""),
            row.asset.asset_type,
            row.asset.psa_grade || "—",
            row.asset.purchase_date,
            formatCurrency(row.cost),
            formatCurrency(row.value),
            formatCurrency(row.pl),
            formatPercentage(row.roi),
          ]),
          foot: [["", "Totals", "", "", "", formatCurrency(totalInvested), formatCurrency(currentValue), formatCurrency(totalProfit), formatPercentage(profitPercent)]],
          theme: "plain",
          styles: { fontSize: 8, textColor: white, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, overflow: "ellipsize" },
          headStyles: { fillColor: headerBg, textColor: gold, fontStyle: "bold", fontSize: 7.5 },
          footStyles: { fillColor: headerBg, textColor: gold, fontStyle: "bold", fontSize: 8 },
          alternateRowStyles: { fillColor: rowAlt },
          bodyStyles: { fillColor: dark },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 48 },
            2: { cellWidth: 14 },
            3: { cellWidth: 16 },
            4: { cellWidth: 22 },
            5: { halign: "right" },
            6: { halign: "right" },
            7: { halign: "right" },
            8: { halign: "right" },
          },
          didParseCell: (data) => {
            if (data.section === "body") {
              const row = sortedRows[data.row.index];
              if (!row) return;
              if (data.column.index === 7 || data.column.index === 8) {
                data.cell.styles.textColor = row.pl >= 0 ? green : red;
              }
            }
            if (data.section === "foot") {
              if (data.column.index === 7 || data.column.index === 8) {
                data.cell.styles.textColor = totalProfit >= 0 ? green : red;
              }
            }
          },
          didDrawPage: () => addPageBg(),
        });
        y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      }

      // -- Top Gainers & Losers --
      const drawTopList = (title: string, rows: typeof topGainers, color: [number, number, number], icon: string) => {
        if (y > 250) {
          pdf.addPage();
          addPageBg();
          y = margin;
        }
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...color);
        pdf.text(`${icon}  ${title}`, margin, y + 5);
        y += 9;

        if (rows.length === 0) {
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(...grey);
          pdf.text("No data available", margin, y + 4);
          y += 8;
          return;
        }

        autoTable(pdf, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["#", "Asset", "ROI", "P/L"]],
          body: rows.map((row, i) => [
            String(i + 1),
            row.asset.name,
            formatPercentage(row.roi),
            formatCurrency(row.pl),
          ]),
          theme: "plain",
          styles: { fontSize: 9, textColor: white, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
          headStyles: { fillColor: headerBg, textColor: gold, fontStyle: "bold", fontSize: 8 },
          alternateRowStyles: { fillColor: rowAlt },
          bodyStyles: { fillColor: dark },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            2: { halign: "right", textColor: color },
            3: { halign: "right", textColor: color },
          },
          didDrawPage: () => addPageBg(),
        });
        y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      };

      if (topGainers.length > 0 || topLosers.length > 0) {
        drawTopList("Top 5 Gainers", topGainers, green, "▲");
        drawTopList("Top 5 Losers", topLosers, red, "▼");
      }

      // -- Footer on last page --
      pdf.setFontSize(7);
      pdf.setTextColor(...grey);
      pdf.text("West Investments Ltd  ·  Confidential", margin, 290);
      pdf.text(new Date().toISOString(), pageW - margin, 290, { align: "right" });

      const dateStr = new Date().toISOString().split("T")[0];
      pdf.save(`${portfolioName}-Report-${dateStr}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["#", "Name", "Set", "Type", "Grade", "Purchase Date", "Qty", "Cost", "Current Value", "P/L", "ROI %", "Evidence"];
    const csvRows = [headers.join(",")];
    sortedRows.forEach((row, i) => {
      const evidence = getEvidenceLink(row.asset);
      const escapeCsv = (s: string) => `"${s.replace(/"/g, '""')}"`;
      csvRows.push([
        i + 1,
        escapeCsv(row.asset.name),
        escapeCsv(row.asset.set_name || ""),
        row.asset.asset_type,
        row.asset.psa_grade || "",
        row.asset.purchase_date,
        row.qty,
        row.cost.toFixed(2),
        row.value.toFixed(2),
        row.pl.toFixed(2),
        row.roi.toFixed(2),
        evidence.url || evidence.label,
      ].join(","));
    });
    csvRows.push("");
    csvRows.push(["", "", "", "Totals", "", "", "", totalInvested.toFixed(2), currentValue.toFixed(2), totalProfit.toFixed(2), profitPercent.toFixed(2), ""].join(","));

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const portfolioName = currentPortfolio?.name || "Portfolio";
    const dateStr = new Date().toISOString().split("T")[0];
    a.download = `${portfolioName}-Report-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" || field === "type" || field === "date" ? "asc" : "desc");
    }
  };

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (dateFrom) {
      result = result.filter((a) => a.purchase_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((a) => a.purchase_date <= dateTo);
    }
    return result;
  }, [assets, dateFrom, dateTo]);

  const totalInvested = useMemo(
    () => filteredAssets.reduce((sum, a) => sum + a.purchase_price * (a.quantity || 1), 0),
    [filteredAssets]
  );

  const currentValue = useMemo(
    () =>
      filteredAssets.reduce(
        (sum, a) => sum + (a.current_price ?? a.purchase_price) * (a.quantity || 1),
        0
      ),
    [filteredAssets]
  );

  const totalProfit = currentValue - totalInvested;
  const profitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const breakdownData = useMemo(() => {
    const map: Record<string, { type: string; count: number; value: number }> = {};
    filteredAssets.forEach((a) => {
      const t = a.asset_type;
      if (!map[t]) map[t] = { type: t, count: 0, value: 0 };
      map[t].count += a.quantity || 1;
      map[t].value += (a.current_price ?? a.purchase_price) * (a.quantity || 1);
    });
    return Object.values(map);
  }, [filteredAssets]);

  const assetRows = useMemo(() => {
    return filteredAssets.map((a) => {
      const qty = a.quantity || 1;
      const cost = a.purchase_price * qty;
      const value = (a.current_price ?? a.purchase_price) * qty;
      const pl = value - cost;
      const roi = cost > 0 ? (pl / cost) * 100 : 0;
      return { asset: a, qty, cost, value, pl, roi };
    });
  }, [filteredAssets]);

  const sortedRows = useMemo(() => {
    const sorted = [...assetRows];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.asset.name.localeCompare(b.asset.name);
          break;
        case "type":
          cmp = a.asset.asset_type.localeCompare(b.asset.asset_type);
          break;
        case "date":
          cmp = (a.asset.purchase_date || "").localeCompare(b.asset.purchase_date || "");
          break;
        case "cost":
          cmp = a.cost - b.cost;
          break;
        case "value":
          cmp = a.value - b.value;
          break;
        case "pl":
          cmp = a.pl - b.pl;
          break;
        case "roi":
          cmp = a.roi - b.roi;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [assetRows, sortField, sortDir]);

  const topGainers = useMemo(
    () =>
      [...assetRows]
        .filter((r) => r.asset.current_price != null)
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 5),
    [assetRows]
  );

  const topLosers = useMemo(
    () =>
      [...assetRows]
        .filter((r) => r.asset.current_price != null)
        .sort((a, b) => a.roi - b.roi)
        .slice(0, 5),
    [assetRows]
  );

  if (portfolioLoading || loading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">
            Portfolio Report
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Loading your portfolio...
          </p>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 md:h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-60 md:h-80 rounded-2xl" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <style jsx global>{`
        @media print {
          aside,
          .lg\\:ml-64,
          nav {
            display: none !important;
          }
          main {
            margin-left: 0 !important;
            padding: 16px !important;
          }
          body,
          main,
          div {
            background: white !important;
            color: black !important;
          }
          .text-text-primary,
          .text-text-secondary,
          .text-text-muted {
            color: #1a1a1a !important;
          }
          .text-success {
            color: #16a34a !important;
          }
          .text-danger {
            color: #dc2626 !important;
          }
          .text-gold,
          .text-accent {
            color: #b8860b !important;
          }
          .border-border {
            border-color: #e5e7eb !important;
          }
          .bg-surface,
          .bg-surface-hover,
          .bg-surface-elevated,
          .bg-background {
            background: white !important;
          }
          .bg-accent-muted,
          .bg-success-muted,
          .bg-danger-muted,
          .bg-warning-muted {
            background: #f3f4f6 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .hidden.print\\:block {
            display: block !important;
          }
          .hidden.print\\:table-cell {
            display: table-cell !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div ref={reportRef} className="space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div>
            <p className="text-text-muted text-sm">
              {currentPortfolio?.name}
            </p>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-6 h-6 text-accent" />
              Portfolio Report
            </h1>
            <p className="text-text-muted text-sm mt-1">
              Generated {generatedDate}
              {(dateFrom || dateTo) && (
                <span className="ml-2">
                  · {dateFrom || "All"} to {dateTo || "Present"}
                </span>
              )}
            </p>
          </div>
          <div className="print:hidden flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={assetRows.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:border-border-hover text-text-secondary hover:text-text-primary disabled:opacity-50 font-medium rounded-xl text-sm"
            >
              <Table className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:border-border-hover text-text-secondary hover:text-text-primary font-medium rounded-xl text-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-black font-semibold rounded-xl text-sm"
            >
              {exporting ? (
                <>
                  <Download className="w-4 h-4 animate-pulse" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="print:hidden bg-surface border border-border rounded-2xl p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Date Range</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              />
              <span className="text-text-muted text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-xl text-text-primary text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const now = new Date();
                  const ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setDateFrom(ago.toISOString().split("T")[0]);
                  setDateTo(now.toISOString().split("T")[0]);
                }}
                className="px-3 py-2 bg-surface-hover border border-border rounded-xl text-text-secondary hover:text-text-primary text-xs font-medium"
              >
                30 Days
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                  setDateFrom(ago.toISOString().split("T")[0]);
                  setDateTo(now.toISOString().split("T")[0]);
                }}
                className="px-3 py-2 bg-surface-hover border border-border rounded-xl text-text-secondary hover:text-text-primary text-xs font-medium"
              >
                90 Days
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setDateFrom(`${now.getFullYear()}-01-01`);
                  setDateTo(now.toISOString().split("T")[0]);
                }}
                className="px-3 py-2 bg-surface-hover border border-border rounded-xl text-text-secondary hover:text-text-primary text-xs font-medium"
              >
                YTD
              </button>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="px-3 py-2 bg-danger-muted border border-danger/30 rounded-xl text-danger text-xs font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {(dateFrom || dateTo) && (
            <p className="text-xs text-text-muted mt-2">
              Showing {filteredAssets.length} of {assets.length} assets purchased in this date range
            </p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-5">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Total Assets
            </p>
            <p className="text-3xl font-bold text-text-primary mt-1">
              {filteredAssets.length}
            </p>
            {filteredAssets.length !== assets.length && (
              <p className="text-xs text-text-muted mt-1">of {assets.length} total</p>
            )}
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-5">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Total Invested
            </p>
            <p className="text-3xl font-bold text-text-primary mt-1">
              {formatCurrency(totalInvested)}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-5">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Current Value
            </p>
            <p className="text-3xl font-bold text-text-primary mt-1">
              {formatCurrency(currentValue)}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-5">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Total P/L
            </p>
            <p
              className={`text-3xl font-bold mt-1 ${
                totalProfit >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {formatCurrency(totalProfit)}
            </p>
            <p
              className={`text-sm ${
                totalProfit >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {formatPercentage(profitPercent)}
            </p>
          </div>
        </div>

        {/* Breakdown by Type */}
        {breakdownData.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Breakdown by Type
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Pie Chart (hidden on print) */}
              <div className="print:hidden w-full md:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      dataKey="value"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      strokeWidth={2}
                      stroke="var(--color-surface)"
                    >
                      {breakdownData.map((entry) => (
                        <Cell
                          key={entry.type}
                          fill={TYPE_COLORS[entry.type] || "#6b7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "var(--color-surface-elevated)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.75rem",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Print fallback table */}
              <div className="hidden print:block w-full md:w-1/2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-text-secondary font-medium">
                        Type
                      </th>
                      <th className="text-right py-2 text-text-secondary font-medium">
                        Count
                      </th>
                      <th className="text-right py-2 text-text-secondary font-medium">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownData.map((d) => (
                      <tr key={d.type} className="border-b border-border/50">
                        <td className="py-2 capitalize text-text-primary">
                          {d.type}
                        </td>
                        <td className="py-2 text-right text-text-secondary">
                          {d.count}
                        </td>
                        <td className="py-2 text-right text-text-primary">
                          {formatCurrency(d.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="w-full md:w-1/2 space-y-3">
                {breakdownData.map((d) => (
                  <div
                    key={d.type}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            TYPE_COLORS[d.type] || "#6b7280",
                        }}
                      />
                      <span className="text-sm text-text-primary capitalize">
                        {d.type}
                      </span>
                      <span className="text-xs text-text-muted">
                        ({d.count})
                      </span>
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {formatCurrency(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assets Detail Table */}
        {assetRows.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-4 md:p-6 pb-0">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Assets Detail
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th
                      className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                      onClick={() => handleSort("name")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Asset
                        {sortField === "name" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                      onClick={() => handleSort("type")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Type
                        {sortField === "type" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                      onClick={() => handleSort("date")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Purchase Date
                        {sortField === "date" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="text-right px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                      onClick={() => handleSort("cost")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        Cost
                        {sortField === "cost" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="text-right px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                      onClick={() => handleSort("value")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        Current Value
                        {sortField === "value" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="text-right px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                      onClick={() => handleSort("pl")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        P/L
                        {sortField === "pl" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </span>
                    </th>
                    <th
                      className="text-right px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none"
                      onClick={() => handleSort("roi")}
                    >
                      <span className="inline-flex items-center gap-1 justify-end">
                        ROI %
                        {sortField === "roi" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      Evidence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, i) => {
                    const evidence = getEvidenceLink(row.asset);
                    const imgUrl =
                      fixStorageUrl(row.asset.custom_image_url) ||
                      fixStorageUrl(row.asset.image_url);
                    const typeBadge =
                      TYPE_BADGE_CLASSES[row.asset.asset_type] ||
                      "text-text-muted bg-surface-hover";

                    return (
                      <tr
                        key={row.asset.id}
                        className="border-b border-border/50 hover:bg-surface-hover/50"
                      >
                        <td className="px-4 py-3 text-text-muted">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={row.asset.name}
                                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-surface-hover flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-text-primary font-medium truncate max-w-[200px]">
                                {row.asset.name}
                              </p>
                              <p className="text-text-muted text-xs truncate max-w-[200px]">
                                {row.asset.set_name}
                              </p>
                              {row.asset.psa_grade && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-accent-muted text-gold rounded">
                                  PSA {row.asset.psa_grade}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-lg capitalize ${typeBadge}`}
                          >
                            {row.asset.asset_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {formatDate(row.asset.purchase_date)}
                        </td>
                        <td className="px-4 py-3 text-right text-text-primary">
                          <span>{formatCurrency(row.cost)}</span>
                          {row.qty > 1 && (
                            <span className="block text-xs text-text-muted">
                              {formatCurrency(row.asset.purchase_price)} × {row.qty}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-text-primary">
                          {formatCurrency(row.value)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            row.pl >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {formatCurrency(row.pl)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            row.roi >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {formatPercentage(row.roi)}
                        </td>
                        <td className="px-4 py-3">
                          {evidence.url ? (
                            <a
                              href={evidence.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg ${evidence.color}`}
                            >
                              {evidence.label}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span
                              className={`inline-block px-2 py-1 text-xs font-medium rounded-lg ${evidence.color}`}
                            >
                              {evidence.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals Footer */}
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="px-4 py-3" colSpan={4}>
                      <span className="text-text-primary">Totals</span>
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">
                      {formatCurrency(totalInvested)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">
                      {formatCurrency(currentValue)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        totalProfit >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatCurrency(totalProfit)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        profitPercent >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatPercentage(profitPercent)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Top Performers */}
        {assetRows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Gainers */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-success" />
                Top 5 Gainers
              </h2>
              <div className="space-y-3">
                {topGainers.map((row, i) => (
                  <div
                    key={row.asset.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-text-muted font-medium w-5">
                        {i + 1}.
                      </span>
                      <span className="text-sm text-text-primary truncate">
                        {row.asset.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium text-success">
                        {formatPercentage(row.roi)}
                      </span>
                      <span className="text-xs text-success">
                        {formatCurrency(row.pl)}
                      </span>
                    </div>
                  </div>
                ))}
                {topGainers.length === 0 && (
                  <p className="text-sm text-text-muted">No data available</p>
                )}
              </div>
            </div>

            {/* Top Losers */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-danger" />
                Top 5 Losers
              </h2>
              <div className="space-y-3">
                {topLosers.map((row, i) => (
                  <div
                    key={row.asset.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-text-muted font-medium w-5">
                        {i + 1}.
                      </span>
                      <span className="text-sm text-text-primary truncate">
                        {row.asset.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium text-danger">
                        {formatPercentage(row.roi)}
                      </span>
                      <span className="text-xs text-danger">
                        {formatCurrency(row.pl)}
                      </span>
                    </div>
                  </div>
                ))}
                {topLosers.length === 0 && (
                  <p className="text-sm text-text-muted">No data available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
