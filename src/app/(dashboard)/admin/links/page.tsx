"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MousePointerClick,
  Users,
  Bot,
  Globe2,
  Link2,
  Sparkles,
  Copy,
  Check,
  CheckCircle,
  Pencil,
  RotateCcw,
  Trash2,
  X,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  Rocket,
  Layers,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { formatNumber } from "@/lib/utils/helpers";
import { buildOfferGroupList } from "@/lib/utils/offer-groups";
import { coerceArray } from "@/lib/utils/array-response";

interface LinkAccount {
  id: string;
  accountName: string;
  slug: string;
  totalClicks: number;
  uniqueClicks: number;
  botClicks: number;
  createdAt: string;
  isActive: boolean;
  offerGroupName: string | null;
  qualifiedClicks: number;
  totalEarning: number;
  subIdPayout: number;
  payoutMethod: string | null;
  payoutAccount: string | null;
  invoices?: Array<{
    invoiceNumber: string;
    totalEarning: number;
    isPaid: boolean;
    createdAt: string;
    paidAt: string | null;
  }>;
  invoiceHistory?: Array<{
    invoiceNumber: string;
    totalEarning: number;
    qualifiedClicks: number;
    clickRate: number;
    payoutMethod: string | null;
    payoutAccount: string | null;
    isPaid: boolean;
    createdAt: string;
    paidAt: string | null;
  }>;
  customDomain: { domain: string } | null;
  customDomainId?: string | null;
  publicDashboard: { publicId: string } | null;
  user?: { username: string } | null;
}

interface DomainOption {
  id: string;
  domain: string;
  verified: boolean;
  isActive: boolean;
}

interface ConfirmInlineState {
  id: string;
  tone: "danger" | "warning";
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
}

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
};

// ===== COPY BUTTON (simplified, no tooltip) =====
const CopyIcon = ({ text, label = "Copy link" }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      aria-label={label}
      title={label}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

export default function LinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<LinkAccount[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksError, setLinksError] = useState("");
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [offerGroups, setOfferGroups] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [bulkCustomDomainId, setBulkCustomDomainId] = useState("");
  const [bulkOfferGroupName, setBulkOfferGroupName] = useState("");
  const [bulkIsActive, setBulkIsActive] = useState(true);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingAccountName, setEditingAccountName] = useState("");
  const [editingSlug, setEditingSlug] = useState("");
  const [editingCustomDomainId, setEditingCustomDomainId] = useState("");
  const [editingOfferGroupName, setEditingOfferGroupName] = useState("");
  const [editingIsActive, setEditingIsActive] = useState(true);
  const [savingLinkId, setSavingLinkId] = useState<string | null>(null);
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);
  const [confirmInline, setConfirmInline] = useState<ConfirmInlineState | null>(null);
  const [invoiceHistoryLink, setInvoiceHistoryLink] = useState<LinkAccount | null>(null);
  const [paymentLink, setPaymentLink] = useState<LinkAccount | null>(null);

  useEffect(() => {
    if (!actionError && !actionMessage) return;

    const timer = window.setTimeout(() => {
      setActionError("");
      setActionMessage("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [actionError, actionMessage]);
  const [paymentReference, setPaymentReference] = useState("");

  // ===== SORT & FILTER =====
  const [sortBy, setSortBy] = useState<"createdAt" | "totalClicks" | "uniqueClicks" | "totalEarning" | "subIdPayout" | "accountName">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "paused">("all");
  const [filterOfferGroup, setFilterOfferGroup] = useState<string>("all");
  const [filterInvoice, setFilterInvoice] = useState<"all" | "unpaid" | "paid">("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<"all" | "BKASH" | "BINANCE">("all");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Offer group options for filter
  const offerGroupFilterOptions = useMemo(() => {
    const groups = new Set<string>();
    links.forEach((link) => {
      if (link.offerGroupName) {
        groups.add(link.offerGroupName);
      }
    });
    return ["all", ...Array.from(groups)];
  }, [links]);

  const creatorFilterOptions = useMemo(() => {
    const creators = new Set<string>();
    links.forEach((link) => {
      if (link.user?.username) creators.add(link.user.username);
    });
    return ["all", ...Array.from(creators).sort()];
  }, [links]);

  const fetchLinks = useCallback(async () => {
    try {
      const response = await fetch("/api/links", { credentials: "include", cache: "no-store" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(`Unable to load links (HTTP ${response.status}).`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid links response.");
      }
      setLinks(coerceArray<LinkAccount>(data));
      setLinksError("");
    } catch (error) {
      console.error("Failed to fetch links:", error);
      setLinksError(error instanceof Error ? error.message : "Unable to load links. Please try again.");
    } finally {
      setLinksLoading(false);
    }
  }, [router]);

  const fetchDomains = useCallback(async () => {
    try {
      const response = await fetch("/api/domains", { credentials: "include" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      setDomains(coerceArray<DomainOption>(data));
    } catch (error) {
      console.error("Failed to fetch domains:", error);
    }
  }, [router]);

  const fetchOfferGroups = useCallback(async () => {
    try {
      const response = await fetch("/api/offers", { credentials: "include" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      setOfferGroups(buildOfferGroupList(data));
    } catch (error) {
      console.error("Failed to fetch offer groups:", error);
    }
  }, [router]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        setUserRole(data?.role ?? null);
      } catch {
        setUserRole(null);
      }
    };

    void (async () => {
      await Promise.all([fetchUser(), fetchLinks(), fetchDomains(), fetchOfferGroups()]);
    })();
  }, [fetchLinks, fetchDomains, fetchOfferGroups]);

  // ===== FILTERED & SORTED LINKS =====
  const filteredLinks = useMemo(() => {
    let result = [...links];

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (link) =>
          link.accountName.toLowerCase().includes(query) ||
          link.slug.toLowerCase().includes(query) ||
          (link.offerGroupName?.toLowerCase() || "").includes(query)
      );
    }

    if (filterStatus !== "all") {
      result = result.filter((link) =>
        filterStatus === "active" ? link.isActive : !link.isActive
      );
    }

    if (filterOfferGroup !== "all") {
      result = result.filter((link) => link.offerGroupName === filterOfferGroup);
    }

    if (filterInvoice !== "all") {
      result = result.filter((link) => {
        const invoices = link.invoiceHistory || [];
        return filterInvoice === "unpaid"
          ? invoices.some((invoice) => !invoice.isPaid)
          : invoices.some((invoice) => invoice.isPaid);
      });
    }

    if (filterPaymentMethod !== "all") {
      result = result.filter((link) => link.payoutMethod === filterPaymentMethod);
    }

    if (filterCreatedBy !== "all") {
      result = result.filter((link) => link.user?.username === filterCreatedBy);
    }

    result.sort((a, b) => {
      let aVal: string | number = a[sortBy];
      let bVal: string | number = b[sortBy];
      if (sortBy === "accountName") {
        aVal = a.accountName.toLowerCase();
        bVal = b.accountName.toLowerCase();
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [links, search, sortBy, sortOrder, filterStatus, filterOfferGroup, filterInvoice, filterPaymentMethod, filterCreatedBy]);

  const activeLinks = links.filter((link) => link.isActive).length;
  const totalClicks = links.reduce((sum, link) => sum + link.totalClicks, 0);
  const uniqueClicks = links.reduce((sum, link) => sum + link.uniqueClicks, 0);
  const botClicks = links.reduce((sum, link) => sum + link.botClicks, 0);

  const selectableDomains = domains.filter((domain) => domain.verified && domain.isActive);

  const getPreviewUrl = (link: LinkAccount) => {
    const baseUrl = link.customDomain?.domain ? `https://${link.customDomain.domain}` : getBaseUrl();
    return `${baseUrl}/${link.slug}`;
  };

  const getPublicStatsUrl = (link: LinkAccount) =>
    `${getBaseUrl()}/stats/${link.publicDashboard?.publicId ?? ""}`;

  const toggleSelectedId = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredLinks.map((link) => link.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const openEdit = (link: LinkAccount) => {
    setActionError("");
    setActionMessage("");
    setEditingLinkId(link.id);
    setEditingAccountName(link.accountName);
    setEditingSlug(link.slug);
    setEditingCustomDomainId(link.customDomainId ?? "");
    setEditingOfferGroupName(link.offerGroupName ?? "");
    setEditingIsActive(link.isActive);
  };

  const closeEdit = () => {
    setEditingLinkId(null);
    setEditingAccountName("");
    setEditingSlug("");
    setEditingCustomDomainId("");
    setEditingOfferGroupName("");
    setEditingIsActive(true);
  };

  const handleToggleStatus = async (link: LinkAccount) => {
    if (busyLinkId === link.id) return;

    setActionError("");
    setActionMessage("");
    setBusyLinkId(link.id);

    try {
      const response = await fetch(`/api/links/${link.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: link.accountName,
          slug: link.slug,
          customDomainId: link.customDomainId ?? null,
          offerGroupName: link.offerGroupName ?? null,
          isActive: !link.isActive,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to update link status");

      setLinks((current) => current.map((item) => item.id === link.id ? { ...item, isActive: !link.isActive } : item));
      setActionMessage(`${link.accountName} is now ${link.isActive ? "paused" : "active"}.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update link status");
    } finally {
      setBusyLinkId(null);
    }
  };

  const isManager = userRole === 'MANAGER';
  const isOwner = userRole === 'OWNER';
  const canViewSubIdPayout = isOwner || userRole === 'ADMIN';

  const handleSaveEdit = async () => {
    if (!editingLinkId) return;

    setActionError("");
    setActionMessage("");
    setSavingLinkId(editingLinkId);

    try {
      const response = await fetch(`/api/links/${editingLinkId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: editingAccountName.trim(),
          slug: editingSlug.trim().toLowerCase().replace(/\s+/g, "-"),
          customDomainId: editingCustomDomainId || null,
          offerGroupName: editingOfferGroupName.trim() || null,
          isActive: editingIsActive,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update link");
      }

      setActionMessage(`Link “${data.accountName}” was updated successfully.`);
      closeEdit();
      await fetchLinks();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update link");
    } finally {
      setSavingLinkId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (isManager) return;

    setConfirmInline({
      id,
      tone: "danger",
      message: "This will remove the link account and its tracked history. This cannot be undone.",
      confirmLabel: "Delete link",
      onConfirm: async () => {
        setActionError("");
        setActionMessage("");
        setBusyLinkId(id);

        try {
          const response = await fetch(`/api/links/${id}`, {
            method: "DELETE",
            credentials: "include",
          });

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(data?.error || "Failed to delete link");
          }

          setActionMessage("Link account deleted successfully.");
          await fetchLinks();
        } catch (error) {
          setActionError(error instanceof Error ? error.message : "Failed to delete link");
        } finally {
          setBusyLinkId(null);
        }
      },
    });
  };

  const handleReset = async (id: string) => {
    if (isManager) return;

    setConfirmInline({
      id,
      tone: "warning",
      message: "This will clear all recorded statistics and matching SubID postbacks for this link. The link will remain active.",
      confirmLabel: "Reset stats",
      onConfirm: async () => {
        setActionError("");
        setActionMessage("");
        setBusyLinkId(id);

        try {
          const response = await fetch(`/api/links/${id}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset" }),
          });

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(data?.error || "Failed to reset link");
          }

          setActionMessage("Link statistics have been reset successfully.");
          await fetchLinks();
        } catch (error) {
          setActionError(error instanceof Error ? error.message : "Failed to reset link");
        } finally {
          setBusyLinkId(null);
        }
      },
    });
  };

  const handleMarkInvoicePaid = async (id: string, reference: string) => {
    setBusyLinkId(id);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch(`/api/links/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-paid", paymentReference: reference }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to mark invoice as paid");
      setActionMessage("Invoice marked as paid.");
      await fetchLinks();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to mark invoice as paid");
      return false;
    } finally {
      setBusyLinkId(null);
    }
  };

  const submitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentLink || !paymentReference.trim()) return;
    const success = await handleMarkInvoicePaid(paymentLink.id, paymentReference.trim());
    if (success) {
      setPaymentLink(null);
      setPaymentReference("");
    }
  };

  const handleBulkReset = async () => {
    if (isManager || selectedIds.length === 0) return;
    setConfirmInline({
      id: "bulk-reset",
      tone: "warning",
      message: `This will clear statistics and matching SubID postbacks for ${selectedIds.length} selected link(s).`,
      confirmLabel: "Reset selected",
      onConfirm: async () => {
        setActionError("");
        setActionMessage("");
        setBusyLinkId("bulk-reset");

        try {
          const response = await fetch("/api/links/bulk", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset", ids: selectedIds }),
          });

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(data?.error || "Failed to reset selected links");
          }

          setSelectedIds([]);
          setActionMessage(`Reset ${data?.resetCount ?? selectedIds.length} link(s) successfully.`);
          await fetchLinks();
        } catch (error) {
          setActionError(error instanceof Error ? error.message : "Failed to reset selected links");
        } finally {
          setBusyLinkId(null);
        }
      },
    });
  };

  const handleBulkDelete = async () => {
    if (isManager || selectedIds.length === 0) return;
    setConfirmInline({
      id: "bulk-delete",
      tone: "danger",
      message: `This will permanently delete ${selectedIds.length} selected link(s) and all their data.`,
      confirmLabel: "Delete selected",
      onConfirm: async () => {
        setActionError("");
        setActionMessage("");
        setBusyLinkId("bulk-delete");

        try {
          const response = await fetch("/api/links/bulk", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", ids: selectedIds }),
          });

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(data?.error || "Failed to delete selected links");
          }

          setSelectedIds([]);
          setActionMessage(`Deleted ${data?.deletedCount ?? selectedIds.length} link(s) successfully.`);
          await fetchLinks();
        } catch (error) {
          setActionError(error instanceof Error ? error.message : "Failed to delete selected links");
        } finally {
          setBusyLinkId(null);
        }
      },
    });
  };

  const handleBulkUpdate = async () => {
    if (isManager || selectedIds.length === 0) return;

    setActionError("");
    setActionMessage("");
    setBusyLinkId("bulk-update");

    try {
      const response = await fetch("/api/links/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          ids: selectedIds,
          customDomainId: bulkCustomDomainId || null,
          offerGroupName: bulkOfferGroupName.trim() || null,
          isActive: bulkIsActive,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update selected links");
      }

      setSelectedIds([]);
      setShowBulkEditor(false);
      setBulkCustomDomainId("");
      setBulkOfferGroupName("");
      setBulkIsActive(true);
      setActionMessage(`Updated ${data?.updatedCount ?? selectedIds.length} link(s) successfully.`);
      await fetchLinks();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update selected links");
    } finally {
      setBusyLinkId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterOfferGroup("all");
    setFilterInvoice("all");
    setFilterPaymentMethod("all");
    setFilterCreatedBy("all");
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  const stats = [
    {
      icon: Zap,
      label: "Active Links",
      value: activeLinks,
      sub: "Live campaigns",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
    },
    {
      icon: MousePointerClick,
      label: "Total Clicks",
      value: formatNumber(totalClicks),
      sub: "All recorded traffic",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Users,
      label: "Unique Visitors",
      value: formatNumber(uniqueClicks),
      sub: "Real audience reach",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      icon: Bot,
      label: "Bot Traffic",
      value: formatNumber(botClicks),
      sub: "Filtered & posted",
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
  ];

  const domainOptions = [
    { value: "", label: "Default domain" },
    ...selectableDomains.map((d) => ({ value: d.id, label: d.domain })),
  ];

  const groupOptions = [
    { value: "", label: "Default routing" },
    ...offerGroups.map((g) => ({ value: g, label: g })),
  ];

  const editingLink = links.find((l) => l.id === editingLinkId);
  const editingDomain = editingCustomDomainId
    ? domains.find((domain) => domain.id === editingCustomDomainId)?.domain ?? editingLink?.customDomain?.domain
    : null;
  const editPreviewUrl = `${editingDomain ? `https://${editingDomain}` : getBaseUrl()}/${editingSlug.trim() || "your-slug"}`;

  const sortOptions = [
    { value: "createdAt", label: "Date" },
    { value: "accountName", label: "Name" },
    { value: "totalClicks", label: "Clicks" },
    { value: "uniqueClicks", label: "Unique" },
    { value: "totalEarning", label: "Highest earnings" },
    { value: "subIdPayout", label: "Highest credit" },
  ];

  const hasActiveFilters = search !== "" || filterStatus !== "all" || filterOfferGroup !== "all" || filterInvoice !== "all" || filterPaymentMethod !== "all" || filterCreatedBy !== "all";

  return (
    <div className="space-y-6">
      {/* ===== STATS ===== */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            {linksLoading ? (
              <div role="status" aria-label={`Loading ${stat.label}`} className="motion-safe:animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="w-full">
                    <div className="h-3 w-20 rounded bg-slate-700" />
                    <div className="mt-2 h-6 w-12 rounded bg-slate-700" />
                    <div className="mt-2 h-2.5 w-24 rounded bg-slate-800" />
                  </div>
                  <div className="h-7 w-7 rounded-md bg-slate-800" />
                </div>
                <span className="sr-only">Loading link statistics</span>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">{stat.label}</p>
                  <p className="mt-1 text-xl font-bold text-white">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{stat.sub}</p>
                </div>
                <div className={`rounded-md ${stat.bg} p-1.5`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ===== SEARCH, SORT & FILTER ===== */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, slug, or pool…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  showFilters
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              {!isManager && (
                <button
                  onClick={toggleSelectAllVisible}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                >
                  {filteredLinks.length > 0 && filteredLinks.every((l) => selectedIds.includes(l.id))
                    ? "Clear"
                    : "Select All"}
                </button>
              )}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-3">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>

              <div className="h-6 w-px bg-slate-700" />

              {/* Status */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-400">Status:</span>
                {["all", "active", "paused"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as typeof filterStatus)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      filterStatus === status
                        ? status === "all"
                          ? "bg-indigo-500/20 text-indigo-300"
                          : status === "active"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {status === "all" ? "All" : status === "active" ? "Active" : "Paused"}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-slate-700" />

              {/* Invoice Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-400">Invoice:</span>
                <select
                  value={filterInvoice}
                  onChange={(e) => setFilterInvoice(e.target.value as typeof filterInvoice)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="h-6 w-px bg-slate-700" />

              {/* Payment Method Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-400">Payment:</span>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value as typeof filterPaymentMethod)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">All methods</option>
                  <option value="BKASH">bKash</option>
                  <option value="BINANCE">Binance</option>
                </select>
              </div>

              <div className="h-6 w-px bg-slate-700" />

              {/* Offer Group Filter */}
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-400">Group:</span>
                <select
                  value={filterOfferGroup}
                  onChange={(e) => setFilterOfferGroup(e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
                >
                  {offerGroupFilterOptions.map((group) => (
                    <option key={group} value={group}>
                      {group === "all" ? "All" : group}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-400">Created by:</span>
                <select
                  value={filterCreatedBy}
                  onChange={(e) => setFilterCreatedBy(e.target.value)}
                  className="max-w-[160px] rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
                >
                  {creatorFilterOptions.map((creator) => (
                    <option key={creator} value={creator}>
                      {creator === "all" ? "All creators" : creator}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <span className="text-sm text-slate-500">
                  {filteredLinks.length} of {links.length}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ===== BULK ACTIONS ===== */}
        {selectedIds.length > 0 && !isManager && (
          <div className="mt-3 border-t border-slate-800 pt-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <span className="text-sm font-medium text-white">
                {selectedIds.length} link{selectedIds.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowBulkEditor(!showBulkEditor)}
                  className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  {showBulkEditor ? "Hide" : "Bulk Edit"}
                </button>
                <button
                  onClick={handleBulkReset}
                  disabled={busyLinkId === "bulk-reset"}
                  className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-60"
                >
                  {busyLinkId === "bulk-reset" ? "…" : "Reset"}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={busyLinkId === "bulk-delete"}
                  className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                >
                  {busyLinkId === "bulk-delete" ? "…" : "Delete"}
                </button>
              </div>
            </div>

            {showBulkEditor && (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Custom Domain</label>
                  <select
                    value={bulkCustomDomainId}
                    onChange={(e) => setBulkCustomDomainId(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Keep current</option>
                    {selectableDomains.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.domain}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Offer Group</label>
                  <select
                    value={bulkOfferGroupName}
                    onChange={(e) => setBulkOfferGroupName(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Keep current</option>
                    {offerGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Status</label>
                  <select
                    value={bulkIsActive ? "active" : "paused"}
                    onChange={(e) => setBulkIsActive(e.target.value === "active")}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <button
                    onClick={handleBulkUpdate}
                    disabled={busyLinkId === "bulk-update"}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {busyLinkId === "bulk-update" ? "Applying…" : "Apply Update"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== MESSAGES ===== */}
      {linksError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{linksError}</span>
          <button
            type="button"
            onClick={() => void fetchLinks()}
            className="rounded-md border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:bg-red-500/15"
          >
            Try again
          </button>
        </div>
      )}
      {(actionError || actionMessage) && (
        <div
          className={`relative z-10 rounded-lg px-4 py-3 text-sm ${
            actionError
              ? "border border-red-500/25 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200"
              : "border border-emerald-500/25 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
          }`}
        >
          {actionError || actionMessage}
        </div>
      )}

      {/* ===== CONFIRMATION (INLINE) ===== */}
      {confirmInline && (confirmInline.id === "bulk-reset" || confirmInline.id === "bulk-delete") && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            confirmInline.tone === "danger"
              ? "bg-red-500/10 text-red-200 border border-red-500/20"
              : "bg-amber-500/10 text-amber-200 border border-amber-500/20"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{confirmInline.message}</span>
            <button
              onClick={() => setConfirmInline(null)}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setConfirmInline(null);
                void confirmInline.onConfirm();
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium text-white ${
                confirmInline.tone === "danger" ? "bg-red-600 hover:bg-red-500" : "bg-amber-600 hover:bg-amber-500"
              }`}
            >
              {confirmInline.confirmLabel}
            </button>
          </div>
        </div>
      )}

      {/* ===== LINK LIST ===== */}
      {linksLoading ? (
        <div role="status" aria-label="Loading links" className="space-y-3 motion-safe:animate-pulse">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="h-4 w-40 max-w-full rounded bg-slate-700" />
                  <div className="mt-3 h-3 w-64 max-w-full rounded bg-slate-800" />
                </div>
                <div className="h-8 w-20 rounded bg-slate-800" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[...Array(4)].map((__, statIndex) => (
                  <div key={statIndex} className="h-10 rounded bg-slate-800/80" />
                ))}
              </div>
            </div>
          ))}
          <span className="sr-only">Loading links</span>
        </div>
      ) : linksError && links.length === 0 ? null : filteredLinks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
          <p className="text-4xl">📭</p>
          <h3 className="mt-2 text-lg font-semibold text-white">No links found</h3>
          <p className="mt-1 text-sm text-slate-400">
            {links.length === 0
              ? "Create your first smart tracking link to get started."
              : "Try adjusting your search or filters."}
          </p>
          {links.length === 0 && (
            <Link
              href="/admin/links/create"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
            >
              Create your first link →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLinks.map((link) => (
            <article
              key={link.id}
              className={`relative rounded-xl border bg-slate-900/60 p-3 pb-12 transition sm:p-4 sm:pb-12 ${
                link.isActive
                  ? "border-emerald-500/30 border-l-2 border-l-emerald-500 hover:border-emerald-500/50"
                  : "border-amber-500/30 border-l-2 border-l-amber-500 hover:border-amber-500/50"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* LEFT: INFO */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!isManager && (
                      <label className="inline-flex h-5 cursor-pointer items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 text-[9px] font-semibold text-indigo-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/20">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(link.id)}
                          onChange={() => toggleSelectedId(link.id)}
                          className="h-3 w-3 rounded border-indigo-300 accent-indigo-600"
                        />
                        Select
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(link)}
                      disabled={busyLinkId === link.id}
                      aria-label={`${link.isActive ? "Pause" : "Activate"} ${link.accountName}`}
                      role="switch"
                      aria-checked={link.isActive}
                      title={link.isActive ? "Pause account" : "Activate account"}
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold shadow-sm transition-colors ${
                        link.isActive
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:border-emerald-500/60 hover:bg-emerald-500/20"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-600 hover:border-amber-500/60 hover:bg-amber-500/20"
                      } disabled:cursor-wait disabled:opacity-60`}>
                      <span className={`relative h-3.5 w-6 rounded-full p-0.5 transition-colors ${link.isActive ? "bg-emerald-500" : "bg-slate-500"}`}>
                        <span className={`block h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform ${link.isActive ? "translate-x-2.5" : "translate-x-0"}`} />
                      </span>
                      {link.isActive ? "Active" : "Paused"}
                    </button>
                    {link.offerGroupName && (
                      <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                        {link.offerGroupName}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                    <h3 className="font-semibold text-white">{link.accountName}</h3>
                    {isOwner && link.user?.username && (
                      <span className="text-xs text-slate-500">
                        Created by <span className="font-medium text-slate-300">{link.user.username}</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex w-auto flex-wrap items-center gap-1.5 overflow-visible text-xs sm:left-4 sm:right-[112px] sm:flex-nowrap sm:overflow-hidden">
                    <span
                      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-slate-800 bg-slate-800/40 px-1 py-0 text-slate-400"
                      title="Tracking link: copy this link to send traffic for this account"
                    >
                      <Link2 className="h-3 w-3 text-indigo-400" aria-label="Tracking link" />
                      <span className="text-[9px] font-medium text-slate-500">Tracking link</span>
                      <CopyIcon text={getPreviewUrl(link)} label="Copy tracking link" />
                    </span>
                    <span
                      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-slate-800 bg-slate-800/40 px-1 py-0 text-slate-400"
                      title="Public stats: open this account's performance dashboard"
                    >
                      <Globe2 className="h-3 w-3 text-emerald-400" />
                      <a
                        href={getPublicStatsUrl(link)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-emerald-400"
                        aria-label="Open public stats"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                      <span className="text-[9px] font-medium text-slate-500">Public stats</span>
                      <CopyIcon text={getPublicStatsUrl(link)} label="Copy public stats link" />
                    </span>
                  </div>
                </div>

                {/* RIGHT: STATS + ACTIONS */}
                <div className="flex w-full flex-wrap items-start justify-end gap-2 sm:w-auto sm:flex-nowrap">
                  <div className={`grid w-full gap-1.5 sm:w-auto ${canViewSubIdPayout ? "grid-cols-5 sm:min-w-[540px]" : "grid-cols-4 sm:min-w-[430px]"}`}>
                    <div className="contents">
                      {[
                        { label: "Clicks", value: formatNumber(link.totalClicks), color: "text-indigo-400" },
                        { label: "Unique", value: formatNumber(link.uniqueClicks), color: "text-emerald-400" },
                        { label: "Bots", value: formatNumber(link.botClicks), color: "text-rose-400" },
                        { label: "Earnings", value: `$${Number(link.totalEarning || 0).toFixed(2)}`, color: "text-emerald-300" },
                        ...(canViewSubIdPayout
                          ? [{ label: "Credit", value: `$${Number(link.subIdPayout || 0).toFixed(2)}`, color: "text-cyan-300" }]
                          : []),
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          title={stat.label === "Earnings" && link.invoiceHistory?.length ? "View invoice history" : stat.label === "Credit" ? `Total postback payout where sub1 matches slug: ${link.slug}` : undefined}
                          className={`min-h-[46px] min-w-0 rounded-md border border-slate-800 bg-slate-800/50 px-1.5 py-1 text-center ${stat.label === "Earnings" && link.invoiceHistory?.length ? "cursor-pointer transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/10" : ""}`}
                          onClick={stat.label === "Earnings" && link.invoiceHistory?.length ? () => setInvoiceHistoryLink(link) : undefined}
                          onKeyDown={stat.label === "Earnings" && link.invoiceHistory?.length ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setInvoiceHistoryLink(link);
                            }
                          } : undefined}
                          role={stat.label === "Earnings" && link.invoiceHistory?.length ? "button" : undefined}
                          tabIndex={stat.label === "Earnings" && link.invoiceHistory?.length ? 0 : undefined}
                          aria-label={stat.label === "Earnings" && link.invoiceHistory?.length ? `View invoice history for ${link.accountName}` : undefined}
                        >
                          <div className="text-[9px] uppercase tracking-wider text-slate-500">{stat.label}</div>
                          <div className={`text-xs font-bold ${stat.color}`}>{stat.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`${canViewSubIdPayout ? "col-span-5" : "col-span-4"} flex min-w-0 items-stretch justify-end gap-1.5`}>
                    {(link.invoices?.length || link.invoiceHistory?.length) ? (
                      <div className="flex min-w-0 flex-[2] items-stretch gap-1.5">
                        {link.invoices?.length ? <div className="flex min-w-0 flex-1 items-center justify-between gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] leading-tight">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold uppercase tracking-wider text-emerald-300">Invoice</span>
                            <span className="text-[9px] font-medium text-slate-500">Unpaid</span>
                          </div>
                          <span className="mt-0.5 block text-xs font-bold leading-none text-emerald-200">${Number(link.invoices[0].totalEarning || 0).toFixed(2)}</span>
                        </div>
                        <button type="button" onClick={() => { setPaymentLink(link); setPaymentReference(""); }} disabled={busyLinkId === link.id} className="inline-flex shrink-0 items-center justify-center gap-1 rounded border border-emerald-400/25 px-1.5 py-1 text-[8px] font-medium text-emerald-300 transition-colors hover:bg-emerald-400/10 disabled:opacity-60" aria-label={`Mark invoice for ${link.accountName} as paid`}>
                            {busyLinkId === link.id ? "Saving..." : <><CheckCircle className="h-3 w-3" /> Paid</>}
                        </button>
                      </div> : null}
                      </div>
                    ) : null}
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 flex shrink-0 gap-1 rounded-md bg-slate-900/80 p-0.5">
                    <button
                      onClick={() => openEdit(link)}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-sky-500/10 hover:text-sky-300"
                      aria-label={`Edit ${link.accountName}`}
                      title="Edit link"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {!isManager && (
                      <>
                        <button
                          onClick={() => handleReset(link.id)}
                          disabled={busyLinkId === link.id}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-60"
                          aria-label={`Reset ${link.accountName}`}
                          title="Reset link"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          disabled={busyLinkId === link.id}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60"
                          aria-label={`Delete ${link.accountName}`}
                          title="Delete link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Inline confirmation for single item */}
              {confirmInline && confirmInline.id === link.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3 text-sm">
                  <span className="text-slate-300">{confirmInline.message}</span>
                  <button
                    onClick={() => setConfirmInline(null)}
                    className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setConfirmInline(null);
                      void confirmInline.onConfirm();
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-medium text-white ${
                      confirmInline.tone === "danger" ? "bg-red-600 hover:bg-red-500" : "bg-amber-600 hover:bg-amber-500"
                    }`}
                  >
                    {confirmInline.confirmLabel}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {paymentLink && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
          <form onSubmit={submitPayment} className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Confirm payout</p>
                <h2 id="payment-dialog-title" className="mt-1 text-base font-bold text-white">Mark invoice as paid</h2>
                <p className="mt-1 text-xs text-slate-400">{paymentLink.accountName}</p>
              </div>
              <button type="button" onClick={() => setPaymentLink(null)} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close payment dialog">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-5 block text-xs font-semibold text-slate-300" htmlFor="payment-reference">
              {paymentLink.payoutMethod === "BKASH" ? "bKash transaction ID" : "Binance order ID"}
              <input id="payment-reference" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} autoFocus required placeholder={paymentLink.payoutMethod === "BKASH" ? "Enter bKash transaction ID" : "Enter Binance order ID"} className="mt-2 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/50" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPaymentLink(null)} className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={!paymentReference.trim() || busyLinkId === paymentLink.id} className="rounded-md bg-emerald-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-200 disabled:opacity-60">{busyLinkId === paymentLink.id ? "Saving..." : "Confirm paid"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {editingLinkId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wider">Edit Link Account</span>
                </div>
                <h2 className="mt-1 text-xl font-bold text-white">Update routing details</h2>
              </div>
              <button
                onClick={closeEdit}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Account Name</label>
                  <input
                    value={editingAccountName}
                    onChange={(e) => setEditingAccountName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g., iPhone Campaign"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Slug</label>
                  <input
                    value={editingSlug}
                    onChange={(e) => setEditingSlug(e.target.value)}
                    readOnly={isManager}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 read-only:cursor-not-allowed read-only:opacity-60"
                    placeholder="e.g., iphone-offer"
                    required
                  />
                  {!isManager && (
                    <p className="mt-1 text-xs text-slate-500">Letters, numbers, and hyphens only</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Custom Domain</label>
                  <select
                    value={editingCustomDomainId}
                    onChange={(e) => setEditingCustomDomainId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {domainOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {!isManager && (
                    <p className="mt-1 text-xs text-slate-500">Only verified domains are eligible</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Offer Group</label>
                  <select
                    value={editingOfferGroupName}
                    onChange={(e) => setEditingOfferGroupName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {groupOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {!isManager && (
                    <p className="mt-1 text-xs text-slate-500">Optional. Overrides default geo routing</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Status</label>
                  <select
                    value={editingIsActive ? "active" : "paused"}
                    onChange={(e) => setEditingIsActive(e.target.value === "active")}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                  <Link2 className="h-3.5 w-3.5 text-indigo-400" />
                  Preview
                </div>
                <div className="mt-2 break-all rounded-md bg-slate-900 px-3 py-2 font-mono text-sm text-indigo-300">
                  {editPreviewUrl}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={savingLinkId === editingLinkId}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {savingLinkId === editingLinkId ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {invoiceHistoryLink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setInvoiceHistoryLink(null);
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">Invoice history</p>
                <h2 className="mt-1 text-xl font-bold text-white">{invoiceHistoryLink.accountName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceHistoryLink(null)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close invoice history"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {invoiceHistoryLink.invoiceHistory?.map((invoice) => (
                <div key={invoice.invoiceNumber} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[10px] text-slate-400">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{new Date(invoice.createdAt).toLocaleString()}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {invoice.payoutMethod === "BKASH" ? "bKash" : invoice.payoutMethod === "BINANCE" ? "Binance" : "Payment method not recorded"}
                        {invoice.payoutAccount ? ` · ${invoice.payoutAccount}` : ""}
                      </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-emerald-300">${Number(invoice.totalEarning || 0).toFixed(2)}</p>
                    <p className={`mt-1 text-[10px] font-medium ${invoice.isPaid ? "text-slate-500" : "text-amber-300"}`}>{invoice.isPaid ? "Paid" : "Unpaid"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}