"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RefreshCw,
  Filter,
  X,
  CalendarRange,
  Download,
  ChevronDown,
} from "lucide-react";
import StatsCards from "@/components/dashboard/StatsCards";
import AfficixoLoading from "@/components/ui/AfficixoLoading";

interface DashboardStats {
  totalClicks: number;
  uniqueClicks: number;
  totalLinks: number;
  botClicks: number;
  totalEarned: number;
  commission: number;
  revenue: number;
  accountGeoReport?: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill?: boolean;
      tension?: number;
      pointRadius?: number;
    }[];
    accountBreakdown: Array<{
      accountName: string;
      totalUniqueClicks: number;
      countries: Array<{ country: string; uniqueClicks: number }>;
    }>;
  };
  chartData?: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill?: boolean;
      tension?: number;
      pointRadius?: number;
    }[];
  };
}

interface FilterParams {
  startDate?: string;
  endDate?: string;
  granularity?: string;
  clickType?: string;
}

const datePresets = [
  { label: "Today", value: "today" },
  { label: "Last 7d", value: "last7" },
  { label: "Last 30d", value: "last30" },
  { label: "This Month", value: "month" },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalClicks: 0,
    uniqueClicks: 0,
    botClicks: 0,
    totalLinks: 0,
    totalEarned: 0,
    commission: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    granularity: "daily",
    clickType: "all",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handlePeriodChange = useCallback((newPeriod: 'week' | 'month' | 'year') => {
    setPeriod(newPeriod);
  }, []);

  const fetchStats = useCallback(
    async (
      showRefreshing = false,
      filterParams: Partial<FilterParams> = {},
      selectedPeriod: 'week' | 'month' | 'year' = period
    ) => {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.append("period", selectedPeriod);
        if (filterParams.startDate) params.append("startDate", filterParams.startDate as string);
        if (filterParams.endDate) params.append("endDate", filterParams.endDate as string);
        if (filterParams.granularity) params.append("granularity", filterParams.granularity as string);
        if (filterParams.clickType && filterParams.clickType !== "all") {
          params.append("clickType", filterParams.clickType as string);
        }

        const url = `/api/analytics/dashboard?${params.toString()}`;
        const response = await fetch(url, { credentials: "include" });
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok) throw new Error(`Dashboard stats failed with ${response.status}`);

        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch analytics overview:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, router]
  );

  useEffect(() => {
    void fetchStats(false, filters, period);
  }, [fetchStats, period]);

  const applyFilters = () => {
    void fetchStats(true, filters, period);
    setActivePreset(null);
  };

  const clearFilters = () => {
    const clearedFilters = {
      startDate: "",
      endDate: "",
      granularity: "daily",
      clickType: "all",
    };
    setFilters(clearedFilters);
    setActivePreset(null);
    setTimeout(() => {
      void fetchStats(true, clearedFilters, period);
    }, 100);
  };

  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    const now = new Date();
    let startDate = "";
    let endDate = now.toISOString().split("T")[0];

    switch (preset) {
      case "today":
        startDate = endDate;
        break;
      case "last7": {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split("T")[0];
        break;
      }
      case "last30": {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString().split("T")[0];
        break;
      }
      case "month": {
        const d = new Date(now);
        d.setDate(1);
        startDate = d.toISOString().split("T")[0];
        break;
      }
      default:
        return;
    }

    const newFilters = { ...filters, startDate, endDate };
    setFilters(newFilters);
    void fetchStats(true, newFilters, period);
  };

  const exportCSV = () => {
    const report = stats.accountGeoReport;
    if (!report || report.accountBreakdown.length === 0) return;

    const labelsToExport = isMobile ? visibleLabels : report.labels;
    const headers = ["Account", ...labelsToExport];
    const rows = report.accountBreakdown.map((account) => [
      account.accountName,
      ...labelsToExport.map((country) => {
        const val = account.countries.find((c) => c.country === country);
        return val ? val.uniqueClicks : 0;
      }),
    ]);

    const totals = labelsToExport.map((country) => {
      return report.accountBreakdown.reduce((sum, acc) => {
        const val = acc.countries.find((c) => c.country === country);
        return sum + (val ? val.uniqueClicks : 0);
      }, 0);
    });
    rows.push(["TOTAL", ...totals]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const report = stats.accountGeoReport;
  const reportLabels = report?.labels ?? [];
  const reportRows = report?.accountBreakdown ?? [];

  const MAX_COLUMNS = isMobile ? 8 : 12;
  
  // Mobile: prioritize major geo countries, then show others
  const visibleLabels = (() => {
    if (!isMobile) return reportLabels;

    const priorityCountries = ['US', 'GB', 'CA', 'AU'];
    const maxCountries = MAX_COLUMNS - 1;
    const priorityVisible = priorityCountries.filter(c => reportLabels.includes(c));
    const otherCountries = reportLabels.filter(c => !priorityCountries.includes(c));

    return [...priorityVisible, ...otherCountries].slice(0, maxCountries);
  })();

  const blankColumns = 0;

  const totals = useMemo(() => {
    return visibleLabels.map((country) => {
      return reportRows.reduce((sum, acc) => {
        const val = acc.countries.find((c) => c.country === country);
        return sum + (val ? val.uniqueClicks : 0);
      }, 0);
    });
  }, [visibleLabels, reportRows]);

  const sortedRows = useMemo(() => {
    if (!sortConfig) return reportRows;
    const sorted = [...reportRows];
    sorted.sort((a, b) => {
      let aVal: string | number = a.accountName;
      let bVal: string | number = b.accountName;
      if (sortConfig.key !== "accountName") {
        const country = sortConfig.key;
        const aCountry = a.countries.find((c) => c.country === country);
        const bCountry = b.countries.find((c) => c.country === country);
        aVal = aCountry ? aCountry.uniqueClicks : 0;
        bVal = bCountry ? bCountry.uniqueClicks : 0;
      }
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [reportRows, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return <AfficixoLoading compact />;
  }

  return (
    <div
      className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)] overflow-x-hidden"
    >


      <div className="relative z-10 w-full px-0 py-0">
        {/* ===== TOP BAR ===== */}
        <div className="mb-8 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Analytics</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchStats(true, filters)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link
                href="/admin/links/create"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-200"
              >
                <span>+ New Link</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ===== STATS CARDS ===== */}
        <div className="mb-8 px-4 sm:px-6 lg:px-8">
          <StatsCards
            stats={stats}
            chartData={stats.chartData}
            period={period}
            onPeriodChange={handlePeriodChange}
          />
        </div>

        {/* ===== GEO BREAKDOWN ===== */}
        <div className="overflow-hidden px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Account performance</h2>
              <p className="mt-1 text-sm text-slate-400">Clicks by account and country</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                aria-expanded={showFilters}
                aria-controls="analytics-filters"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">{showFilters ? "Hide" : "Show"} Filters</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-400">
                {report?.datasets?.length ? `${reportRows.length} accounts` : "—"}
              </div>
              {reportRows.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  aria-label="Export account performance as CSV"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              )}
            </div>
          </div>

          {/* ===== FILTER BAR ===== */}
          {showFilters && (
            <div id="analytics-filters" className="border-b border-white/10 bg-slate-900/50 p-4 sm:p-6">
              {/* Quick presets */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-medium text-slate-300 mr-1">Quick:</span>
                {datePresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => applyPreset(preset.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      activePreset === preset.value
                        ? "bg-indigo-500/30 text-white border border-indigo-400/30"
                        : "text-slate-300 hover:text-white hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Filter inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      setFilters({ ...filters, startDate: e.target.value });
                      setActivePreset(null);
                    }}
                    className="w-full rounded-lg border border-white/20 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      setFilters({ ...filters, endDate: e.target.value });
                      setActivePreset(null);
                    }}
                    className="w-full rounded-lg border border-white/20 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Granularity</label>
                  <select
                    value={filters.granularity}
                    onChange={(e) => {
                      setFilters({ ...filters, granularity: e.target.value });
                      setActivePreset(null);
                    }}
                    className="w-full rounded-lg border border-white/20 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Click Type</label>
                  <select
                    value={filters.clickType}
                    onChange={(e) => {
                      setFilters({ ...filters, clickType: e.target.value });
                      setActivePreset(null);
                    }}
                    className="w-full rounded-lg border border-white/20 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                  >
                    <option value="all">All Clicks</option>
                    <option value="unique">Unique Clicks</option>
                    <option value="repeat">Repeat Clicks</option>
                    <option value="direct">Direct Clicks</option>
                    <option value="referrer">Referrer Clicks</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={applyFilters}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  <CalendarRange className="w-4 h-4" />
                  Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
                {(filters.startDate || filters.endDate || filters.clickType !== "all" || filters.granularity !== "daily") && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Filters active
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ===== TABLE ===== */}
          {report?.datasets?.length ? (
            <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/40 w-full">
              <table className="w-full table-auto border-collapse text-left text-xs whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-900/60">
                  <tr className="border-b border-slate-700/50">
                    <th
                      className="px-2.5 py-1.5 font-medium text-slate-300 cursor-pointer hover:text-slate-200 border-r border-slate-700/30 select-none whitespace-normal break-words"
                      onClick={() => requestSort("accountName")}
                      title="Click to sort"
                    >
                      <div className="flex items-center gap-1">
                        <span>Account</span>
                        {sortConfig?.key === "accountName" && (
                          <span className="text-slate-400 text-[10px]">{sortConfig.direction === "ascending" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    {visibleLabels.map((country) => (
                      <th
                        key={country}
                        className="px-2 py-1.5 font-medium text-slate-300 cursor-pointer hover:text-slate-200 border-r border-slate-700/30 last:border-r-0 select-none text-center min-w-[80px]"
                        onClick={() => requestSort(country)}
                        title="Click to sort"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{country}</span>
                          {sortConfig?.key === country && (
                            <span className="text-slate-400 text-[10px]">{sortConfig.direction === "ascending" ? "↑" : "↓"}</span>
                          )}
                        </div>
                      </th>
                    ))}
                    {/* Blank column headers */}
                    {Array.from({ length: blankColumns }).map((_, i) => (
                      <th
                        key={`blank-col-${i}`}
                        className="px-2 py-1.5 border-r border-slate-700/30 last:border-r-0 min-w-[80px] text-center font-medium text-slate-500"
                      >
                        —
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((account, index) => (
                    <tr
                      key={account.accountName}
                      className={`border-b border-slate-800/40 hover:bg-slate-900/30 transition-colors ${index % 2 === 0 ? "bg-slate-950/20" : ""}`}
                    >
                      <td className="px-2.5 py-1.5 font-medium text-slate-200 border-r border-slate-700/30 whitespace-normal break-words">
                        {account.accountName}
                      </td>
                      {visibleLabels.map((country) => {
                        const countryValue = account.countries.find((item) => item.country === country);
                        return (
                          <td 
                            key={`${account.accountName}-${country}`} 
                            className="px-2 py-1.5 border-r border-slate-700/30 last:border-r-0 text-center text-slate-300 min-w-[80px]"
                          >
                            {countryValue ? (
                              <span className="text-slate-100 font-medium">
                                {countryValue.uniqueClicks}
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                        );
                      })}
                      {/* Blank cells */}
                      {Array.from({ length: blankColumns }).map((_, i) => (
                        <td key={`blank-${account.accountName}-${i}`} className="px-2 py-1.5 border-r border-slate-700/30 min-w-[80px] text-center text-slate-600">
                          0
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Totals row */}
                  {totals.some((t) => t > 0) && (
                    <tr className="border-t border-teal-600/50 bg-teal-500/15 font-semibold">
                      <td className="px-2.5 py-1.5 text-teal-200 border-r border-teal-600/30 font-bold">TOTAL</td>
                      {totals.map((total, idx) => (
                        <td key={`total-${idx}`} className="px-2 py-1.5 text-center border-r border-teal-600/30 last:border-r-0 text-teal-100 font-bold min-w-[80px]">
                          {total}
                        </td>
                      ))}
                      {/* Blank cells */}
                      {Array.from({ length: blankColumns }).map((_, i) => (
                        <td key={`total-blank-${i}`} className="px-2 py-1.5 border-r border-teal-600/30 min-w-[80px] text-center text-teal-200/60">
                          0
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="mt-8 text-center text-xs text-slate-500 border-t border-white/5 pt-4">
          <span>© 2026 Afficixo</span>
        </div>
      </div>
    </div>
  );
}