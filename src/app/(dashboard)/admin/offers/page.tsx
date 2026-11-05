"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ShieldCheck,
  MapPinned,
  Flag,
  RotateCcw,
  AlertTriangle,
  Globe,
  Globe2,
  Layers,
  ChevronDown,
  Zap,
  TrendingUp,
  Search,
  Menu,
  Filter,
} from "lucide-react";
import { coerceArray } from "@/lib/utils/array-response";

interface Offer {
  id: string;
  country: string;
  groupName: string | null;
  offerUrl: string;
  isActive: boolean;
  isGlobal: boolean;
  isContentLocker: boolean;
  usaSecretRedirectEnabled: boolean;
  usaSecretRedirectPercentage: number;
  priority: number;
  rotationMode: "PRIORITY" | "RANDOM";
}

function OfferStatusSwitch({
  isActive,
  offerLabel,
  onToggle,
}: {
  isActive: boolean;
  offerLabel: string;
  onToggle: () => void;
}) {
  const nextAction = isActive ? "Pause" : "Activate";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      aria-label={`${offerLabel} offer status`}
      title={`${nextAction} offer`}
      onClick={onToggle}
      className="offer-vault-muted inline-flex h-8 items-center gap-2 rounded-md border-0 bg-transparent px-2 text-xs font-medium transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          isActive ? "bg-emerald-500" : "bg-slate-400/50"
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
            isActive ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </span>
      <span className={isActive ? "text-emerald-500" : "offer-vault-muted"}>
        {isActive ? "Active" : "Paused"}
      </span>
    </button>
  );
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "warning";
  onConfirm: () => Promise<void> | void;
}

interface RenameModalState {
  isOpen: boolean;
  currentName: string;
  newName: string;
}

const getFlagImageUrl = (code: string) => {
  if (!code || code === "GLOBAL") return "https://flagcdn.com/gb.svg";
  const normalized = code.toUpperCase();
  if (normalized.length !== 2) return "https://flagcdn.com/gb.svg";
  return `https://flagcdn.com/${normalized.toLowerCase()}.svg`;
};

const normalizeGroupName = (value?: string | null) => value?.trim() ?? "";
const normalizeCountryCode = (value?: string | null) => value?.trim().toUpperCase() ?? "";
const buildGroupKey = (offer: Offer) => {
  const groupName = normalizeGroupName(offer.groupName);
  if (groupName) return groupName;
  if (offer.isContentLocker) return "CONTENT_LOCKER";
  if (offer.isGlobal) return "GLOBAL";
  const countryCode = normalizeCountryCode(offer.country);
  if (countryCode) return countryCode;
  return "UNASSIGNED";
};
const getPoolLabel = (groupKey: string, groupOffers: Offer[]) => {
  const namedPool = normalizeGroupName(groupOffers[0]?.groupName);
  if (namedPool) return namedPool;
  if (groupKey === "CONTENT_LOCKER") return "Content Locker";
  if (groupKey === "GLOBAL") return "Global Smart Link";
  if (groupKey === "UNASSIGNED") return "Unassigned";
  return groupKey;
};
const getPoolCountries = (groupOffers: Offer[]) =>
  Array.from(
    new Set(
      groupOffers.map((offer) =>
        offer.isContentLocker ? "CONTENT LOCKER" : offer.isGlobal ? "GLOBAL SMART LINK" : normalizeCountryCode(offer.country)
      )
    )
  ).sort((a, b) => a.localeCompare(b));

// Country options (full list)
const countryOptions = [
  { code: "GLOBAL", name: "Global Smart Link (Fallback for all countries)" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "RU", name: "Russia" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "MX", name: "Mexico" },
  { code: "KR", name: "South Korea" },
  { code: "NL", name: "Netherlands" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SG", name: "Singapore" },
  { code: "SE", name: "Sweden" },
  { code: "NZ", name: "New Zealand" },
  { code: "TR", name: "Turkey" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "BD", name: "Bangladesh" },
  { code: "UA", name: "Ukraine" },
  { code: "PL", name: "Poland" },
  { code: "AR", name: "Argentina" },
  { code: "CH", name: "Switzerland" },
  { code: "NG", name: "Nigeria" },
  { code: "MY", name: "Malaysia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "HK", name: "Hong Kong" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "PK", name: "Pakistan" },
  { code: "EG", name: "Egypt" },
  { code: "RO", name: "Romania" },
  { code: "CZ", name: "Czechia" },
  { code: "GR", name: "Greece" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" },
  { code: "DK", name: "Denmark" },
  { code: "HU", name: "Hungary" },
];

const rotationModeOptions = [
  { value: "PRIORITY", label: "Priority winner" },
  { value: "RANDOM", label: "Random rotation" },
];

const DRAFT_GROUP_STORAGE_KEY = "offer-vault-draft-groups";

// ===== ANIMATION VARIANTS =====
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", damping: 26, stiffness: 320, mass: 0.7 },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15 },
  },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 30, stiffness: 400, mass: 0.7 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 20,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [canUseSecretRedirect, setCanUseSecretRedirect] = useState(true);
  const [botFallbackUrl, setBotFallbackUrl] = useState('');
  const [botFallbackStatus, setBotFallbackStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [botFallbackMessage, setBotFallbackMessage] = useState('');
  const [showBotFallbackSettings, setShowBotFallbackSettings] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    country: "",
    groupName: "",
    offerUrl: "",
    isGlobal: false,
    isContentLocker: false,
    usaSecretRedirectEnabled: false,
    usaSecretRedirectPercentage: 50,
    priority: 100,
    rotationMode: "PRIORITY" as "PRIORITY" | "RANDOM",
  });
  const normalizedSecretRedirectPercentage = Number.isFinite(formData.usaSecretRedirectPercentage)
    ? Math.round(Math.max(1, Math.min(100, formData.usaSecretRedirectPercentage)))
    : 50;
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [isGroupCreatorOpen, setIsGroupCreatorOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isQuickGroupOpen, setIsQuickGroupOpen] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState("");
  const [draftGroupNames, setDraftGroupNames] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [renameModal, setRenameModal] = useState<RenameModalState>({
    isOpen: false,
    currentName: "",
    newName: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [expandedPools, setExpandedPools] = useState<Record<string, boolean>>({});
  const countryPickerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' })
      if (!response.ok) return
      const data = await response.json()
      setUserRole(data?.role ?? null)
      setCanUseSecretRedirect(data?.canUseSecretRedirect !== false)
      setBotFallbackUrl(data?.botFallbackUrl ?? '')
    } catch {
      setUserRole(null)
    }
  }, [])

  const fetchOffers = useCallback(async () => {
    try {
      const response = await fetch("/api/offers", { credentials: "include" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      setOffers(coerceArray<Offer>(data));
    } catch (error) {
      console.error("Failed to fetch offers:", error);
    }
  }, [router]);

  useEffect(() => {
    void Promise.all([fetchUser(), fetchOffers()])
  }, [fetchUser, fetchOffers]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(DRAFT_GROUP_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as string[];
      if (Array.isArray(parsed)) {
        setDraftGroupNames(parsed.filter((v): v is string => Boolean(v.trim())));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DRAFT_GROUP_STORAGE_KEY, JSON.stringify(draftGroupNames));
  }, [draftGroupNames]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(event.target as Node)) {
        setIsCountryMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Memoized derived data for performance
  const activeOffers = useMemo(() => offers.filter((o) => o.isActive).length, [offers]);
  const globalOffers = useMemo(() => offers.filter((o) => o.isGlobal).length, [offers]);
  const regionalOffers = useMemo(() => offers.length - globalOffers, [offers, globalOffers]);
  const vaultScore = useMemo(() => Math.min(100, Math.round((activeOffers / Math.max(offers.length, 1)) * 100)), [activeOffers, offers.length]);

  const groupedOffers = useMemo(() => {
    return Array.from(
      offers.reduce((groups, offer) => {
        const key = buildGroupKey(offer);
        const current = groups.get(key) ?? [];
        current.push(offer);
        groups.set(key, current);
        return groups;
      }, new Map<string, Offer[]>())
    ).sort((a, b) => {
      const aIsGlobal = a[0] === "GLOBAL";
      const bIsGlobal = b[0] === "GLOBAL";
      if (aIsGlobal !== bIsGlobal) return aIsGlobal ? -1 : 1;
      return getPoolLabel(a[0], a[1]).localeCompare(getPoolLabel(b[0], b[1]));
    });
  }, [offers]);

  const availableGroupNames = useMemo(() => {
    return Array.from(
      new Set([
        ...offers.map((o) => normalizeGroupName(o.groupName)).filter((v): v is string => Boolean(v)),
        ...draftGroupNames,
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [offers, draftGroupNames]);

  const groupSummaries = useMemo(() => {
    return availableGroupNames.map((groupName) => {
      const groupOffers = offers.filter((o) => normalizeGroupName(o.groupName) === groupName);
      return {
        groupName,
        groupOffers,
        poolCountries: getPoolCountries(groupOffers),
      };
    });
  }, [availableGroupNames, offers]);

  const geoPoolCount = groupSummaries.length;
  const activeGroupName = normalizeGroupName(formData.groupName);
  const selectedGroupOffers = activeGroupName
    ? offers.filter((o) => normalizeGroupName(o.groupName) === activeGroupName)
    : [];
  const selectedGroupCountries = useMemo(() => {
    return Array.from(
      new Set(
        selectedGroupOffers.map((o) =>
          o.isGlobal ? "GLOBAL" : normalizeCountryCode(o.country)
        )
      )
    );
  }, [selectedGroupOffers]);

  const selectedCountry = countryOptions.find((c) => c.code === formData.country);
  const normalizedCountrySearch = countrySearch.trim().toLowerCase();
  const filteredCountryOptions = useMemo(() => {
    return countryOptions.filter((c) => {
      if (!normalizedCountrySearch) return true;
      const haystack = `${c.code} ${c.name}`.toLowerCase();
      return haystack.includes(normalizedCountrySearch);
    });
  }, [normalizedCountrySearch]);

  // Filter offers based on search and active filter
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const matchesSearch =
        !searchTerm.trim() ||
        offer.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.groupName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.offerUrl.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActive = !filterActiveOnly || offer.isActive;
      return matchesSearch && matchesActive;
    });
  }, [offers, searchTerm, filterActiveOnly]);
  const filteredUngroupedOffers = filteredOffers.filter((offer) => !normalizeGroupName(offer.groupName));

  const handleCountrySelect = (countryCode: string) => {
    setFormData((prev) => ({
      ...prev,
      country: countryCode,
      isGlobal: countryCode === "GLOBAL",
    }));
    setCountrySearch("");
    setIsCountryMenuOpen(false);
  };

  const openOfferForm = (groupName = "", editOffer?: Offer) => {
    if (editOffer) {
      setEditingId(editOffer.id);
      setFormData({
        country: editOffer.country,
        groupName: editOffer.groupName ?? "",
        offerUrl: editOffer.offerUrl,
        isGlobal: editOffer.isGlobal,
        isContentLocker: editOffer.isContentLocker,
        usaSecretRedirectEnabled: editOffer.usaSecretRedirectEnabled ?? false,
        usaSecretRedirectPercentage: editOffer.usaSecretRedirectPercentage ?? 50,
        priority: editOffer.priority ?? 100,
        rotationMode: editOffer.rotationMode ?? "PRIORITY",
      });
    } else {
      setEditingId(null);
      setFormData({
        country: "",
        groupName,
        offerUrl: "",
        isGlobal: false,
        isContentLocker: false,
        usaSecretRedirectEnabled: false,
        usaSecretRedirectPercentage: 50,
        priority: 100,
        rotationMode: "PRIORITY",
      });
    }
    setFormError("");
    setIsGroupCreatorOpen(false);
    setNewGroupName("");
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingId(null);
    setFormData({
      country: "",
      groupName: "",
      offerUrl: "",
      isGlobal: false,
      isContentLocker: false,
      usaSecretRedirectEnabled: false,
      usaSecretRedirectPercentage: 50,
      priority: 100,
      rotationMode: "PRIORITY",
    });
    setFormError("");
  };

  const selectGroup = (groupName: string) => {
    setFormData((prev) => ({ ...prev, groupName }));
    setIsGroupCreatorOpen(false);
    setNewGroupName("");
  };

  const createGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    setDraftGroupNames((prev) => Array.from(new Set([...prev, trimmed])));
    selectGroup(trimmed);
  };

  const createQuickGroup = () => {
    const trimmed = quickGroupName.trim();
    if (!trimmed) return;
    setDraftGroupNames((prev) => Array.from(new Set([...prev, trimmed])));
    setQuickGroupName("");
    setIsQuickGroupOpen(false);
  };

  const applyGroupNameToOffers = async (groupName: string, nextGroupName: string | null) => {
    const affected = offers.filter((o) => normalizeGroupName(o.groupName) === groupName);
    await Promise.all(
      affected.map(async (offer) => {
        const resp = await fetch(`/api/offers/${offer.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: offer.country,
            groupName: nextGroupName ?? "",
            offerUrl: offer.offerUrl,
            isActive: offer.isActive,
            isGlobal: offer.isGlobal,
            priority: offer.priority ?? 100,
            rotationMode: offer.rotationMode ?? "PRIORITY",
          }),
        });
        if (!resp.ok) throw new Error("Failed to update group membership");
      })
    );
    await fetchOffers();
  };

  const renameGroup = (currentGroupName: string) => {
    setRenameModal({
      isOpen: true,
      currentName: currentGroupName,
      newName: currentGroupName,
    });
  };

  const handleRenameConfirm = async () => {
    const { currentName, newName } = renameModal;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === currentName) {
      setRenameModal({ isOpen: false, currentName: "", newName: "" });
      return;
    }
    try {
      await applyGroupNameToOffers(currentName, trimmed);
      setDraftGroupNames((prev) => {
        const filtered = prev.filter((n) => n !== currentName);
        return Array.from(new Set([...filtered, trimmed]));
      });
    } catch (error) {
      console.error("Failed to rename group:", error);
    } finally {
      setRenameModal({ isOpen: false, currentName: "", newName: "" });
    }
  };

  const deleteGroup = async (groupName: string) => {
    setConfirmDialog({
      title: "Remove this offer pool?",
      message: `This will permanently delete all offers currently assigned to “${groupName}”.`,
      confirmLabel: "Remove pool",
      tone: "warning",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/offers?groupName=${encodeURIComponent(groupName)}`, {
            method: "DELETE",
            credentials: "include",
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Failed to remove offer pool");
          await fetchOffers();
          setDraftGroupNames((prev) => prev.filter((n) => n !== groupName));
        } catch (error) {
          console.error("Failed to delete group:", error);
        }
      },
    });
  };

  const handleBotFallbackSave = async () => {
    const trimmedUrl = botFallbackUrl.trim();

    if (!trimmedUrl) {
      setBotFallbackStatus('error');
      setBotFallbackMessage('Please enter a valid fallback URL.');
      return;
    }

    setBotFallbackStatus('saving');
    setBotFallbackMessage('Saving fallback URL...');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-bot-fallback-url', botFallbackUrl: trimmedUrl }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Failed to save fallback URL');
      setBotFallbackUrl(data?.botFallbackUrl || trimmedUrl);
      setBotFallbackStatus('saved');
      setBotFallbackMessage('Fallback URL saved successfully.');
    } catch (error: any) {
      setBotFallbackStatus('error');
      setBotFallbackMessage(error.message || 'Unable to save fallback URL.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const url = editingId ? `/api/offers/${editingId}` : "/api/offers";
      const method = editingId ? "PUT" : "POST";
      const priorityVal = Number(formData.priority);
      const payload = {
        country: formData.isGlobal || formData.isContentLocker ? "GLOBAL" : formData.country,
        groupName: formData.groupName.trim(),
        offerUrl: formData.offerUrl.trim(),
        isGlobal: formData.isGlobal,
        isContentLocker: formData.isContentLocker,
        usaSecretRedirectEnabled: Boolean(formData.usaSecretRedirectEnabled),
        usaSecretRedirectPercentage: normalizedSecretRedirectPercentage,
        priority: Number.isFinite(priorityVal) ? Math.max(1, Math.min(999, priorityVal)) : 100,
        rotationMode: formData.rotationMode === "RANDOM" ? "RANDOM" : "PRIORITY",
      };

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to save offer");

      closeFormModal();
      await fetchOffers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      title: "Delete this offer?",
      message: "This will remove the offer from the routing system and its current targeting configuration.",
      confirmLabel: "Delete offer",
      tone: "danger",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/offers/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!response.ok) throw new Error("Failed to delete offer");
          await fetchOffers();
        } catch (error) {
          console.error("Error deleting offer:", error);
        }
      },
    });
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/offers/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!response.ok) throw new Error("Failed to toggle offer");
      await fetchOffers();
    } catch (error) {
      console.error("Error toggling offer:", error);
    }
  };

  if (userRole === 'MANAGER') {
    return (
      <div className="min-h-[320px] rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">Offer Vault Access Restricted</h1>
        <p className="mt-3 text-sm text-slate-400">
          Your account is not authorized to manage offers directly. Use the links dashboard to create and track links.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/admin/links"
            className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-600 transition"
          >
            Return to Links
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="offer-vault-page space-y-6 pb-8 md:space-y-8">
      {/* ===== CONFIRMATION MODAL ===== */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d1724] p-6 shadow-2xl shadow-indigo-500/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    confirmDialog.tone === "danger"
                      ? "border-rose-400/30 bg-rose-500/10 text-rose-300"
                      : "border-amber-400/30 bg-amber-500/10 text-amber-300"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{confirmDialog.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{confirmDialog.message}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmDialog(null);
                    void confirmDialog.onConfirm();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${
                    confirmDialog.tone === "danger"
                      ? "bg-rose-500 hover:bg-rose-600"
                      : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  {confirmDialog.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== RENAME MODAL ===== */}
      <AnimatePresence>
        {renameModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setRenameModal({ isOpen: false, currentName: "", newName: "" })}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d1724] p-6 shadow-2xl shadow-indigo-500/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Edit className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Rename Group</h3>
                  <p className="text-sm text-slate-400">Enter a new name for the routing pool</p>
                </div>
              </div>
              <input
                type="text"
                value={renameModal.newName}
                onChange={(e) => setRenameModal((prev) => ({ ...prev, newName: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 transition"
                placeholder="New group name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleRenameConfirm();
                  }
                }}
              />
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setRenameModal({ isOpen: false, currentName: "", newName: "" })}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenameConfirm}
                  className="px-4 py-2 rounded-lg bg-indigo-500 text-sm font-semibold text-white hover:bg-indigo-600 transition"
                >
                  Rename
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ===== FORM MODAL ===== */}
      <AnimatePresence>
        {showFormModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeFormModal();
            }}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="offer-vault-modal max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border p-4 shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="offer-vault-modal-header sticky top-0 z-10 -mx-4 -mt-4 mb-5 flex items-center justify-between border-b px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <div className="offer-vault-modal-icon flex h-9 w-9 items-center justify-center rounded-lg">
                    {editingId ? <Edit aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
                  </div>
                  <div>
                    <h2 className="offer-vault-title text-base font-semibold">
                      {editingId ? "Edit offer" : "Add offer"}
                    </h2>
                    <p className="offer-vault-muted text-xs">Configure targeting and routing behavior</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="offer-vault-icon-action flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                  aria-label="Close"
                  title="Close"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="offer-vault-form-error rounded-lg border p-3 text-sm">
                    {formError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label htmlFor="offer-country" className="offer-vault-form-label mb-1.5 block text-xs font-semibold">Country</label>
                    <div ref={countryPickerRef} className="relative">
                      <button
                        id="offer-country"
                        type="button"
                        onClick={() => {
                          setCountrySearch("");
                          setIsCountryMenuOpen((prev) => !prev);
                        }}
                        className="offer-vault-input flex min-h-[42px] w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition"
                      >
                        <span className="flex items-center gap-2.5">
                          {selectedCountry ? (
                            <>
                              {selectedCountry.code === "GLOBAL" ? (
                                  <Globe2 className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <Image
                                    src={getFlagImageUrl(selectedCountry.code)}
                                    alt={selectedCountry.code}
                                    width={24}
                                    height={16}
                                    className="rounded-sm"
                                  />
                                )}
                              <span>{selectedCountry.code}</span>
                            </>
                          ) : (
                            <span className="text-slate-400">Select country</span>
                          )}
                        </span>
                        <ChevronDown aria-hidden="true" className="offer-vault-muted h-4 w-4" />
                      </button>
                      {isCountryMenuOpen && (
                        <div className="offer-vault-country-menu absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border p-2 shadow-xl">
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Search countries…"
                            className="offer-vault-input min-h-10 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                            autoFocus
                          />
                          <div className="mt-2 space-y-1">
                            {filteredCountryOptions.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => handleCountrySelect(country.code)}
                                className="offer-vault-country-option flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                              >
                                {country.code === "GLOBAL" ? (
                                  <Globe2 className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <Image
                                    src={getFlagImageUrl(country.code)}
                                    alt={country.code}
                                    width={20}
                                    height={14}
                                    className="rounded-sm"
                                  />
                                )}
                                <span>{country.code}</span>
                                <span className="offer-vault-muted truncate text-xs">{country.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="offer-pool" className="offer-vault-form-label mb-1.5 block text-xs font-semibold">Offer group</label>
                    <div className="flex gap-2">
                      <div className="relative min-w-0 flex-1">
                        <select
                          id="offer-pool"
                          value={formData.groupName}
                          onChange={(e) => selectGroup(e.target.value)}
                          aria-describedby="offer-pool-hint"
                          className="offer-vault-input min-h-[42px] w-full appearance-none rounded-lg border px-3 py-2 pr-10 text-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        >
                          <option value="">No group (unassigned)</option>
                          {availableGroupNames.map((groupName) => (
                            <option key={groupName} value={groupName}>
                              {groupName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown aria-hidden="true" className="offer-vault-muted pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsGroupCreatorOpen((prev) => !prev)}
                        className="offer-vault-secondary-button flex min-h-[42px] w-[42px] items-center justify-center rounded-lg border transition"
                        aria-label={isGroupCreatorOpen ? "Close new group form" : "Create new offer group"}
                        aria-expanded={isGroupCreatorOpen}
                        aria-controls="new-offer-group-form"
                        title={isGroupCreatorOpen ? "Close new group form" : "Create new offer group"}
                      >
                        {isGroupCreatorOpen ? <X aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
                      </button>
                    </div>
                    <p id="offer-pool-hint" className="offer-vault-muted mt-1.5 text-[11px]">
                      Choose a group to route related offers together, or leave unassigned.
                    </p>
                    {isGroupCreatorOpen && (
                      <div id="new-offer-group-form" className="mt-2 flex gap-2">
                        <input
                          aria-label="New offer group name"
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="New pool name"
                          className="offer-vault-input min-h-10 min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        />
                        <button
                          type="button"
                          onClick={createGroup}
                          disabled={!newGroupName.trim()}
                          className="offer-vault-primary-button min-h-10 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Create
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="offer-priority" className="offer-vault-form-label mb-1.5 block text-xs font-semibold">Priority</label>
                    <div className="flex items-center gap-4">
                      <input
                        id="offer-priority"
                        type="range"
                        min="1"
                        max="999"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                        className="priority-slider flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                      />
                      <span className="offer-vault-title min-w-[3rem] text-center text-sm font-semibold tabular-nums">
                        {formData.priority}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="offer-rotation" className="offer-vault-form-label mb-1.5 block text-xs font-semibold">Rotation</label>
                    <select
                      id="offer-rotation"
                      value={formData.rotationMode}
                      onChange={(e) =>
                        setFormData({ ...formData, rotationMode: e.target.value as "PRIORITY" | "RANDOM" })
                      }
                      className="offer-vault-input min-h-[42px] w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    >
                      {rotationModeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="offer-url" className="offer-vault-form-label mb-1.5 block text-xs font-semibold">Offer URL</label>
                  <input
                    id="offer-url"
                    type="url"
                    value={formData.offerUrl}
                    onChange={(e) => setFormData({ ...formData, offerUrl: e.target.value })}
                    placeholder="https://affiliate.com/?s1="
                    className="offer-vault-input min-h-[42px] w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    required
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label htmlFor="content-locker" className="offer-vault-option-card flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      id="content-locker"
                      checked={formData.isContentLocker}
                      onChange={(e) =>
                        setFormData({ ...formData, isContentLocker: e.target.checked })
                      }
                      className="h-4 w-4 rounded border accent-emerald-500"
                    />
                    Content locker
                  </label>
                  {canUseSecretRedirect && <div className="offer-vault-option-card rounded-lg border px-3 py-2">
                    <label htmlFor="usa-secret-modal" className="offer-vault-title flex min-h-7 cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        id="usa-secret-modal"
                        checked={formData.usaSecretRedirectEnabled}
                        onChange={(e) =>
                          setFormData({ ...formData, usaSecretRedirectEnabled: e.target.checked })
                        }
                        className="h-4 w-4 rounded border accent-emerald-500"
                      />
                      Block Proxy
                    </label>
                    {formData.usaSecretRedirectEnabled && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <label htmlFor="usa-secret-percentage" className="offer-vault-muted text-xs font-medium">
                            Proxy block rate
                          </label>
                          <input
                            id="usa-secret-percentage"
                            type="number"
                            min={1}
                            max={100}
                            step={1}
                            value={formData.usaSecretRedirectPercentage}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                usaSecretRedirectPercentage: Number(e.target.value),
                              })
                            }
                            className="offer-vault-input min-h-9 w-20 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                          />
                        </div>
                        <p className="offer-vault-muted basis-full text-[11px] leading-4">
                          Applied independently per link account. {normalizedSecretRedirectPercentage}% of eligible US clicks are secretly redirected.
                        </p>
                      </div>
                    )}
                  </div>}
                </div>

                <div className="offer-vault-modal-actions sticky bottom-0 -mx-4 -mb-4 mt-1 grid grid-cols-2 gap-2 border-t px-4 py-3 sm:-mx-6 sm:-mb-6 sm:px-6">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="offer-vault-secondary-button min-h-10 rounded-lg border px-4 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="offer-vault-primary-button min-h-10 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-60"
                  >
                    {formLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        {editingId ? "Update" : "Add Offer"}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HEADER & STATS ===== */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            {
              label: "Active",
              value: activeOffers,
              icon: Zap,
              color: "offer-vault-stat"
            },
            {
              label: "Pools",
              value: geoPoolCount,
              icon: Layers,
              color: "offer-vault-stat"
            },
            {
              label: "Global",
              value: globalOffers,
              icon: Globe,
              color: "offer-vault-stat"
            },
            {
              label: "Score",
              value: `${vaultScore}%`,
              icon: TrendingUp,
              color: "offer-vault-stat"
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border ${stat.color} p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <p className="offer-vault-muted text-xs font-medium">{stat.label}</p>
                <stat.icon className="offer-vault-accent h-4 w-4" />
              </div>
              <p className="offer-vault-title mt-1 text-xl font-bold tabular-nums md:text-2xl">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <div className="flex w-full flex-row gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setIsQuickGroupOpen((prev) => !prev);
                setQuickGroupName("");
              }}
              aria-expanded={isQuickGroupOpen}
              className="offer-vault-secondary-button inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] sm:min-h-11 sm:flex-none sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="whitespace-nowrap">Add Group</span>
            </button>
            <button
              type="button"
              onClick={() => openOfferForm()}
              className="offer-vault-primary-button inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] sm:min-h-11 sm:flex-none sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="whitespace-nowrap">Add Offer</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBotFallbackSettings((prev) => !prev)}
              aria-expanded={showBotFallbackSettings}
              className="offer-vault-secondary-button inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] sm:min-h-11 sm:flex-none sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="whitespace-nowrap">Fallback URL</span>
              <ChevronDown className={["h-3.5 w-3.5 shrink-0 transition-transform duration-200 sm:h-4 sm:w-4", showBotFallbackSettings && "rotate-180"].filter(Boolean).join(" ")} />
            </button>
          </div>
        </div>

        {showBotFallbackSettings && (
          <div className="w-full bg-transparent py-2">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="url"
                value={botFallbackUrl}
                onChange={(e) => {
                  setBotFallbackUrl(e.target.value);
                  if (botFallbackStatus !== 'idle') {
                    setBotFallbackStatus('idle');
                    setBotFallbackMessage('');
                  }
                }}
                placeholder="https://example.com/fallback"
                className="offer-vault-input h-11 w-full rounded-lg border px-3 text-sm transition-colors duration-200 focus:border-cyan-500/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/10"
              />
              <button
                type="button"
                onClick={() => void handleBotFallbackSave()}
                disabled={botFallbackStatus === 'saving'}
                className="offer-vault-primary-button inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {botFallbackStatus === 'saving' ? 'Saving...' : 'Save URL'}
              </button>
            </div>

            {botFallbackMessage && (
              <p
                className={[
                  'mt-2 text-sm',
                  botFallbackStatus === 'saved' && 'text-emerald-300',
                  botFallbackStatus === 'error' && 'text-rose-300',
                  botFallbackStatus === 'saving' && 'text-amber-300',
                ].join(' ')}
              >
                {botFallbackMessage}
              </p>
            )}
          </div>
        )}

        {/* Quick Group Creator */}
        <AnimatePresence>
          {isQuickGroupOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="offer-vault-panel rounded-xl border p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={quickGroupName}
                    onChange={(e) => setQuickGroupName(e.target.value)}
                    placeholder="Enter a new group name"
                    className="offer-vault-input min-h-[44px] flex-1 rounded-lg border px-4 py-3 text-sm transition focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/10"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createQuickGroup}
                      className="offer-vault-primary-button min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition"
                    >
                      Save Group
                    </button>
                    <button
                      onClick={() => {
                        setIsQuickGroupOpen(false);
                        setQuickGroupName("");
                      }}
                      className="offer-vault-secondary-button min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      {/* ===== SEARCH & FILTER BAR ===== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="offer-vault-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search offers by country, group, or URL…"
            className="offer-vault-input min-h-[44px] w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm transition focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/10"
          />
        </div>
        <button
          onClick={() => setFilterActiveOnly((prev) => !prev)}
          aria-pressed={filterActiveOnly}
          className={`offer-vault-filter inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${filterActiveOnly ? "is-active" : ""}`}
        >
          <Filter className="w-4 h-4" />
          {filterActiveOnly ? "Showing active" : "Active only"}
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Left Column */}
        <div className="min-w-0 space-y-3 sm:space-y-4">
          {/* Groups */}
          {groupSummaries.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="offer-vault-section-title text-sm font-semibold">Routing pools</h3>
                <span className="offer-vault-muted text-xs">{groupSummaries.length} {groupSummaries.length === 1 ? "pool" : "pools"}</span>
              </div>
              {groupSummaries.map((group) => {
                const isExpanded = expandedPools[group.groupName] ?? false;
                const poolOffersId = `pool-offers-${encodeURIComponent(group.groupName)}`;
                const visibleGroupOffers = group.groupOffers.filter((offer) =>
                  filteredOffers.some((filteredOffer) => filteredOffer.id === offer.id)
                );
                const shouldShowGroup = visibleGroupOffers.length > 0 ||
                  (!searchTerm.trim() && !filterActiveOnly && group.groupOffers.length === 0);
                if (!shouldShowGroup) return null;

                return (
                  <div
                    key={group.groupName}
                    className="offer-vault-pool overflow-hidden rounded-xl border transition-colors"
                  >
                    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={poolOffersId}
                        onClick={() => setExpandedPools((current) => ({
                          ...current,
                          [group.groupName]: !isExpanded,
                        }))}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
                      >
                        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <div className="offer-vault-icon flex-shrink-0 rounded-lg p-2">
                          <MapPinned className="h-4 w-4" />
                        </div>
                        <span className="offer-vault-title min-w-0 flex-1 truncate text-sm font-semibold">{group.groupName}</span>
                        <span className="offer-vault-muted shrink-0 text-xs">
                          {group.groupOffers.length} {group.groupOffers.length === 1 ? "offer" : "offers"}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-2 pl-6 sm:pl-0">
                        <div className="hidden min-w-0 flex-1 flex-wrap gap-1 sm:flex">
                          {group.poolCountries.slice(0, 3).map((country) => (
                            <span key={country} className="offer-vault-tag inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                              {country === "GLOBAL SMART LINK" ? (
                                <Globe2 aria-hidden="true" className="h-3 w-3" />
                              ) : country === "CONTENT LOCKER" ? (
                                <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                              ) : (
                                <Image
                                  src={getFlagImageUrl(country)}
                                  alt=""
                                  width={16}
                                  height={12}
                                  className="h-3 w-4 shrink-0 rounded-[2px] object-cover"
                                />
                              )}
                              <span>{country}</span>
                            </span>
                          ))}
                          {group.poolCountries.length > 3 && (
                            <span className="offer-vault-muted self-center text-[10px]">+{group.poolCountries.length - 3}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedPools((current) => ({ ...current, [group.groupName]: true }));
                            openOfferForm(group.groupName);
                          }}
                          className="offer-vault-secondary-button min-h-8 rounded-lg border px-2.5 text-xs font-semibold transition"
                        >
                          Add offer
                        </button>
                        <button
                          type="button"
                          onClick={() => renameGroup(group.groupName)}
                          className="offer-vault-icon-action flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                          aria-label={`Edit ${group.groupName}`}
                          title={`Edit ${group.groupName}`}
                        >
                          <Edit aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGroup(group.groupName)}
                          className="offer-vault-icon-action flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                          aria-label={`Remove ${group.groupName}`}
                          title={`Remove ${group.groupName}`}
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div
                      id={poolOffersId}
                      aria-hidden={!isExpanded}
                      inert={!isExpanded}
                      style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                      className={`grid overflow-hidden border-t transition-[grid-template-rows,border-color] duration-200 ease-out motion-reduce:transition-none ${isExpanded ? "border-[var(--surface-border)]" : "border-transparent"}`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        {visibleGroupOffers.length > 0 ? (
                          <div className="divide-y divide-[var(--surface-border)] px-3 py-2">
                            {visibleGroupOffers.map((offer) => (
                              <div
                                key={offer.id}
                                className="grid grid-cols-1 items-center gap-x-3 gap-y-1.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]"
                              >
                                <div className="col-start-1 flex min-w-0 items-center gap-2">
                                  {offer.isGlobal ? (
                                    <Globe2 className="offer-vault-muted h-4 w-4 shrink-0" />
                                  ) : (
                                    <Image
                                      src={getFlagImageUrl(offer.country)}
                                      alt={offer.country}
                                      width={20}
                                      height={14}
                                      className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
                                    />
                                  )}
                                  <span className="offer-vault-title shrink-0 text-xs font-semibold">
                                    {offer.isGlobal ? "Global" : offer.country}
                                  </span>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${offer.isActive ? 'text-emerald-500' : 'offer-vault-muted'}`}>
                                    {offer.isActive ? "Active" : "Paused"}
                                  </span>
                                </div>
                                <a
                                  href={offer.offerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={offer.offerUrl}
                                  className="offer-vault-url col-start-1 min-w-0 truncate rounded-md px-2 py-1 font-mono text-xs sm:text-[13px] hover:underline"
                                >
                                  {offer.offerUrl}
                                </a>
                                <div className="col-start-1 row-start-3 flex min-w-0 items-center justify-end gap-1 sm:col-start-2 sm:row-span-2 sm:row-start-auto">
                                  <OfferStatusSwitch
                                    isActive={offer.isActive}
                                    offerLabel={`${offer.country}${offer.isGlobal ? " global" : ""}`}
                                    onToggle={() => handleToggle(offer.id, offer.isActive)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openOfferForm(group.groupName, offer)}
                                    className="offer-vault-icon-action flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                                    aria-label={`Edit ${offer.country} offer`}
                                    title={`Edit ${offer.country} offer`}
                                  >
                                    <Edit aria-hidden="true" className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(offer.id)}
                                    className="offer-vault-icon-action flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                                    aria-label={`Delete ${offer.country} offer`}
                                    title={`Delete ${offer.country} offer`}
                                  >
                                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="offer-vault-muted px-3 py-2 text-xs">No offers in this pool yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Offers */}
          {filteredUngroupedOffers.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="offer-vault-section-title text-sm font-semibold">Unassigned offers</h3>
                <span className="offer-vault-muted text-xs">{filteredUngroupedOffers.length} {filteredUngroupedOffers.length === 1 ? "offer" : "offers"}</span>
              </div>
              {groupedOffers.map(([groupKey, groupOffers]) => {
                const filteredGroupOffers = groupOffers.filter((offer) =>
                  filteredUngroupedOffers.some((fo) => fo.id === offer.id)
                );
                if (filteredGroupOffers.length === 0) return null;
                return (
                  <div key={groupKey} className="divide-y divide-[var(--surface-border)]">
                    {filteredGroupOffers.map((offer) => (
                      <motion.div
                        key={offer.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="offer-vault-offer offer-vault-offer-compact group px-1 py-3 transition-colors"
                      >
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {offer.isGlobal ? (
                              <Globe2 aria-hidden="true" className="offer-vault-muted h-4 w-4 shrink-0" />
                            ) : (
                              <Image
                                src={getFlagImageUrl(offer.country)}
                                alt=""
                                width={20}
                                height={14}
                                className="h-3.5 w-5 shrink-0 rounded-sm"
                              />
                            )}
                            <span className="offer-vault-title truncate text-sm font-semibold">
                              {offer.isGlobal ? "Global" : offer.country}
                            </span>
                            <span className={`offer-vault-muted shrink-0 text-xs ${offer.isActive ? "text-emerald-500" : ""}`}>
                              {offer.isActive ? "Active" : "Paused"}
                            </span>
                          </div>
                          <div className="col-start-2 row-span-2 flex shrink-0 items-center gap-1">
                            <OfferStatusSwitch
                              isActive={offer.isActive}
                              offerLabel={`${offer.country}${offer.isGlobal ? " global" : ""}`}
                              onToggle={() => handleToggle(offer.id, offer.isActive)}
                            />
                            <button
                              type="button"
                              onClick={() => openOfferForm("", offer)}
                              className="offer-vault-icon-action flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                              aria-label="Edit offer"
                              title="Edit offer"
                            >
                              <Edit aria-hidden="true" className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(offer.id)}
                              className="offer-vault-icon-action flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                              aria-label="Delete offer"
                              title="Delete offer"
                            >
                              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="offer-vault-muted col-start-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                            {offer.groupName && <span className="truncate">{offer.groupName}</span>}
                            <span>Priority {offer.priority ?? 100}</span>
                            <span>{offer.rotationMode === "RANDOM" ? "Random" : "Priority"}</span>
                            {offer.isContentLocker && <span>Content locker</span>}
                            {offer.usaSecretRedirectEnabled && <span>Proxy protection</span>}
                          </div>
                          <a
                            href={offer.offerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={offer.offerUrl}
                            className="offer-vault-url col-span-2 min-w-0 truncate font-mono text-xs sm:text-[13px] hover:underline"
                          >
                            {offer.offerUrl}
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="offer-vault-empty rounded-xl border border-dashed p-8 text-center md:p-10">
              <div className="offer-vault-muted mb-4 flex justify-center gap-4">
                <Globe className="h-8 w-8 md:h-10 md:w-10" />
                <Plus className="h-8 w-8 md:h-10 md:w-10" />
                <Check className="h-8 w-8 md:h-10 md:w-10" />
              </div>
              <h3 className="offer-vault-title text-base font-semibold md:text-lg">
                {searchTerm || filterActiveOnly ? "No matching offers" : "Your vault is empty"}
              </h3>
              <p className="offer-vault-muted mx-auto mt-1 max-w-md text-sm">
                {searchTerm || filterActiveOnly
                  ? "Try adjusting your search or filters."
                  : "Create a routing pool, then add offers to start building your geo-smart campaign structure."}
              </p>
              {!searchTerm && !filterActiveOnly && (
                <button
                  onClick={() => openOfferForm()}
                  className="offer-vault-primary-button mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create your first offer
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Right Column */}
        <div className="grid gap-3 sm:gap-4 lg:flex lg:flex-col lg:space-y-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
          <div className="offer-vault-sidebar rounded-xl border p-3 sm:p-4">
            <div className="offer-vault-sidebar-heading mb-3 flex items-center gap-2 sm:mb-4">
              <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">Vault Health</span>
            </div>
            <div className="space-y-3 sm:space-y-3">
              <div className="offer-vault-sidebar-item flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs transition sm:py-3 sm:text-sm">
                <span className="offer-vault-muted font-medium">Regional</span>
                <span className="offer-vault-title text-sm font-bold">{regionalOffers}</span>
              </div>
              <div className="offer-vault-sidebar-item flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs transition sm:py-3 sm:text-sm">
                <span className="offer-vault-muted font-medium">Fallback</span>
                <span className="offer-vault-title text-sm font-bold">{globalOffers}</span>
              </div>
              <div className="offer-vault-sidebar-item flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs transition sm:py-3 sm:text-sm">
                <span className="offer-vault-muted font-medium">Geo pools</span>
                <span className="offer-vault-title text-sm font-bold">{geoPoolCount}</span>
              </div>
              <div className="offer-vault-sidebar-item rounded-lg border p-3">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="offer-vault-muted font-medium">Coverage</span>
                  <span className="offer-vault-title font-bold">{vaultScore}%</span>
                </div>
                <div className="offer-vault-coverage-track h-3 w-full overflow-hidden rounded-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${vaultScore}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full rounded-full shadow-lg ${
                      vaultScore > 70 ? "bg-emerald-500" :
                      vaultScore > 40 ? "bg-amber-500" :
                      "bg-rose-500"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="offer-vault-sidebar rounded-xl border p-3 sm:p-4">
            <div className="offer-vault-sidebar-heading mb-3 flex items-center gap-2 sm:mb-4">
              <Layers className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">How It Works</span>
            </div>
            <ul className="offer-vault-muted space-y-3 text-xs sm:space-y-3.5 sm:text-sm">
              <li className="flex items-start gap-3">
                <span className="offer-vault-check mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span className="leading-relaxed">Create a <span className="offer-vault-title font-medium">routing pool</span> for offers.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="offer-vault-check mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span className="leading-relaxed">Add offers with <span className="offer-vault-title font-medium">country targeting</span>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="offer-vault-check mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span className="leading-relaxed"><span className="offer-vault-title font-medium">Global fallback</span> covers unmapped countries.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="offer-vault-check mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span className="leading-relaxed"><span className="offer-vault-title font-medium">Priority</span> or <span className="offer-vault-title font-medium">random</span> rotation.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}