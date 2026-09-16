"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import StatsCards from "@/components/dashboard/StatsCards";
import ClickLogs from "@/components/dashboard/ClickLogs";
import { TrafficBreakdown } from "@/components/dashboard/TrafficBreakdown";
import { getDashboardBasePath } from "@/lib/auth/dashboard-path";
import {
  Plus,
  Clock,
  Calendar,
} from "lucide-react";

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
      borderColor: "#6366f1",
      backgroundColor: "rgba(99, 102, 241, 0.08)",
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
  const [loading, setLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [logFilter] = useState<string>("all");
  const [now, setNow] = useState(() => new Date());
  const [userRole, setUserRole] = useState<string | null>(null);
  const dashboardBasePath = getDashboardBasePath(userRole);

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

  // ─── Clock ───
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = useMemo(
    () =>
      now.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    [now]
  );
  const timeStr = useMemo(
    () => now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    [now]
  );

  // ─── Data fetching ───
  const loadDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      try {
        const response = await fetch(
          "/api/analytics/dashboard?period=all",
          { credentials: "include", cache: "no-store" }
        );

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
        const postbacksResponse = await fetch("/api/postbacks", { credentials: "include" });
        const postbacksData = postbacksResponse.ok ? await postbacksResponse.json() : null;
        const linksResponse = await fetch("/api/links", { credentials: "include" });
        const paymentLinks = linksResponse.ok ? await linksResponse.json() : [];
        const managerCommissionRate = Array.isArray(paymentLinks)
          ? Number(paymentLinks.find((link: { isActive?: boolean }) => link.isActive)?.commissionRate ?? 20) || 20
          : 20;
        const paymentSummary = Array.isArray(paymentLinks)
          ? paymentLinks.filter((link) => link.isActive).reduce(
              (summary, link) => {
                const current = Number(link.totalEarning) || 0;
                const commissionRate = Number(link.commissionRate ?? 20) || 20;
                return { totalEarned: summary.totalEarned + current, commission: summary.commission + current * (commissionRate / 100) };
              },
              { totalEarned: 0, commission: 0 },
            )
          : { totalEarned: 0, commission: 0 };

        // Safe assignment with defaults
        const safeData: DashboardStats = {
          totalClicks: data.totalClicks ?? 0,
          uniqueClicks: data.uniqueClicks ?? 0,
          totalLinks: data.totalLinks ?? 0,
          totalEarned: paymentSummary.totalEarned,
          commission: paymentSummary.commission,
          commissionRate: managerCommissionRate,
          revenue: paymentSummary.totalEarned + paymentSummary.commission,
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
        setLoading(false);
        if (isManualRefresh) setRefreshing(false);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090e] text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <Image
              src="/afficixo-logo.png"
              alt="Afficixo logo"
              width={140}
              height={42}
              sizes="140px"
              className="mx-auto object-contain"
              priority
            />
            <motion.div
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/30 via-violet-500/20 to-transparent blur-xl"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-1 w-24 overflow-hidden rounded-full bg-white/5 border border-white/10">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-0"
                animate={{ x: ["-100%", "100%"], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500"
                animate={{ 
                  x: ["-100%", "300%"],
                  width: ["25%", "50%", "25%"]
                }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity, 
                  ease: [0.43, 0.13, 0.23, 0.96]
                }}
              />
            </div>
            <motion.p
              className="text-[10px] text-slate-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              Loading...
            </motion.p>
          </div>
        </div>
      </div>
    );
  }

  return (
    // ─── Main container with overflow protection ───
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-indigo-500 selection:text-white pb-20 overflow-x-hidden w-full max-w-full">
      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-2 pt-4 sm:px-3 sm:pt-0 lg:px-3">
        {/* ─── Header ─── */}
        <header className="relative flex flex-col sm:hidden sm:flex-row sm:items-center justify-between gap-4 overflow-hidden rounded-2xl border border-amber-300/60 bg-amber-50/80 p-4 shadow-[0_8px_24px_rgba(245,158,11,0.12)] backdrop-blur-md mb-4 sm:mb-6 sm:p-5 dark:border-amber-400/35 dark:bg-slate-900/95 dark:shadow-[0_8px_24px_rgba(245,158,11,0.12)]">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Image
                src="/afficixo-logo.png"
                alt="Afficixo logo"
                width={96}
                height={96}
                className="h-auto w-24 object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {dateStr}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {timeStr}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <Link
              href={`${dashboardBasePath}/links/create`}
              aria-label="Create new link"
              className="min-h-[36px] flex items-center justify-center gap-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[10px] font-medium text-white shadow-md shadow-emerald-600/25 transition-all active:scale-[0.97] w-full sm:w-auto"
            >
              <Plus className="w-3 h-3" />
              <span>New Link</span>
            </Link>
          </div>
        </header>

        {/* ─── Stats & Charts ─── */}
        <section className="relative mb-4 sm:mb-6">
          <StatsCards
            stats={stats}
            chartData={chartData}
            countryBreakdown={countryBreakdown}
            totalPayout={stats.totalPayout}
            showConversions={userRole !== "MANAGER"}
          />
        </section>

        {/* ─── Traffic Breakdown ─── */}
        <section className="mb-4 sm:mb-6">
          <TrafficBreakdown
            referrerBreakdown={referrerBreakdown}
            browserBreakdown={browserBreakdown}
            deviceBreakdown={deviceBreakdown}
            countryBreakdown={countryBreakdown}
          />
        </section>

        <div className="overflow-x-auto">
          <ClickLogs filter={logFilter} />
        </div>

      </div>
    </div>
  );
}