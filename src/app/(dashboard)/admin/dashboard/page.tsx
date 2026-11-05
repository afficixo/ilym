"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StatsCards from "@/components/dashboard/StatsCards";
import ClickLogs from "@/components/dashboard/ClickLogs";
import { TrafficBreakdown } from "@/components/dashboard/TrafficBreakdown";
interface DashboardStats {
  totalClicks: number;
  uniqueClicks: number;
  totalLinks: number;
  totalEarned: number;
  commission: number;
  commissionRate: number;
  revenue: number;
  totalPayout: number;
  chartData: any;
  countryBreakdown: any[];
  referrerBreakdown: any[];
  browserBreakdown: any[];
  deviceBreakdown: any[];
}

// Safe default chart structure
const createDefaultChart = () => ({
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      label: "Traffic Volume",
      data: [0, 0, 0, 0, 0, 0, 0],
      borderColor: "#4dd935",
      backgroundColor: "rgba(95, 244, 66, 0.1)",
      fill: true,
      tension: 0.35,
      pointRadius: 3,
    },
  ],
});

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalClicks: 0,
    uniqueClicks: 0,
    totalLinks: 0,
    totalEarned: 0,
    commission: 0,
    commissionRate: 20,
    revenue: 0,
    totalPayout: 0,
    chartData: createDefaultChart(),
    countryBreakdown: [],
    referrerBreakdown: [],
    browserBreakdown: [],
    deviceBreakdown: [],
  });
  const [chartData, setChartData] = useState(createDefaultChart());
  const [countryBreakdown, setCountryBreakdown] = useState<any[]>([]);
  const [referrerBreakdown, setReferrerBreakdown] = useState<any[]>([]);
  const [browserBreakdown, setBrowserBreakdown] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);
  const [, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  // ─── ZOOM FIX: ensure viewport meta is correct ───
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
    );
  }, []);

  // ─── Data fetching ───
  const loadDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      try {
        const [response, postbacksResponse] = await Promise.all([
          fetch(
            "/api/analytics/dashboard?period=all",
            { credentials: "include", cache: "no-store" }
          ),
          fetch("/api/postbacks?summary=1", { credentials: "include" }),
        ]);

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (!response.ok) {
          // fallback to zeroed data
          setStats({
            totalClicks: 0,
            uniqueClicks: 0,
            totalLinks: 0,
            totalEarned: 0,
            commission: 0,
            commissionRate: 20,
            revenue: 0,
            totalPayout: 0,
            chartData: createDefaultChart(),
            countryBreakdown: [],
            referrerBreakdown: [],
            browserBreakdown: [],
            deviceBreakdown: [],
          });
          setChartData(createDefaultChart());
          setCountryBreakdown([]);
          setReferrerBreakdown([]);
          setBrowserBreakdown([]);
          setDeviceBreakdown([]);
          return;
        }

        const data = await response.json();
        const postbacksData = postbacksResponse.ok ? await postbacksResponse.json() : null;

        // Safe assignment with defaults
        const safeData: DashboardStats = {
          totalClicks: data.totalClicks ?? 0,
          uniqueClicks: data.uniqueClicks ?? 0,
          totalLinks: data.totalLinks ?? 0,
          totalEarned: data.activeLinkEarnings ?? 0,
          commission: data.activeLinkCommission ?? 0,
          commissionRate: data.activeLinkCommissionRate ?? 20,
          revenue: (data.activeLinkEarnings ?? 0) + (data.activeLinkCommission ?? 0),
          totalPayout: Number(postbacksData?.totalPayout) || 0,
          chartData: data.chartData || createDefaultChart(),
          countryBreakdown: Array.isArray(data.countryBreakdown)
            ? data.countryBreakdown
            : [],
          referrerBreakdown: Array.isArray(data.referrerBreakdown)
            ? data.referrerBreakdown
            : [],
          browserBreakdown: Array.isArray(data.browserBreakdown)
            ? data.browserBreakdown
            : [],
          deviceBreakdown: Array.isArray(data.deviceBreakdown)
            ? data.deviceBreakdown
            : [],
        };

        setStats(safeData);
        setChartData(safeData.chartData);
        setCountryBreakdown(safeData.countryBreakdown);
        setReferrerBreakdown(safeData.referrerBreakdown);
        setBrowserBreakdown(safeData.browserBreakdown);
        setDeviceBreakdown(safeData.deviceBreakdown);
      } catch (error) {
        console.error("Telemetry sync failed:", error);
      } finally {
        if (isManualRefresh) setRefreshing(false);
        setIsDashboardLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadDashboardData();
      }
    };
    const refreshTimer = window.setInterval(refreshWhenVisible, 60_000);

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadDashboardData]);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (!response.ok) return;

        const data = await response.json();
        setUserRole(data.role ?? null);
      } catch (error) {
        console.error("Failed to load user role", error);
      }
    };

    void loadUserRole();
  }, []);

  return (
    // ─── Main container with overflow protection ───
    <div className="w-full max-w-full overflow-x-hidden bg-[var(--page-bg)] pb-20 text-[var(--text-primary)] selection:bg-[var(--aff-accent)] selection:text-[var(--aff-ink)]">
      <div className="relative z-10 w-full px-2 pt-4 sm:px-3 sm:pt-0 lg:px-3">
        {/* ─── Stats & Charts ─── */}
        <section className="relative mb-4 sm:mb-6 lg:mb-4">
          <StatsCards
            stats={stats}
            chartData={chartData}
            countryBreakdown={countryBreakdown}
            totalPayout={stats.totalPayout}
            showConversions={userRole !== "MANAGER"}
            isLoading={isDashboardLoading}
          />
        </section>

        {/* ─── Traffic Breakdown ─── */}
        <section className="mb-4 sm:mb-6 lg:mb-4">
          <TrafficBreakdown
            referrerBreakdown={referrerBreakdown}
            browserBreakdown={browserBreakdown}
            deviceBreakdown={deviceBreakdown}
            countryBreakdown={countryBreakdown}
            isLoading={isDashboardLoading}
          />
        </section>

        <div className="overflow-x-auto">
          <ClickLogs canDelete={userRole === "OWNER" || userRole === "ADMIN"} />
        </div>

      </div>
    </div>
  );
}