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
  Power,
  PowerOff,
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
  if (!code || code === "GLOBAL") return "https://flagcdn.com/w40/gb.png";
  const normalized = code.toUpperCase();
  if (normalized.length !== 2) return "https://flagcdn.com/w40/gb.png";
  return `https://flagcdn.com/w40/${normalized.toLowerCase()}.png`;
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
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void (async () => {
      await Promise.all([fetchUser(), fetchOffers()])
      setLoading(false)
    })()
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
      const percentageVal = Number(formData.usaSecretRedirectPercentage);
      const payload = {
        country: formData.isGlobal || formData.isContentLocker ? "GLOBAL" : formData.country,
        groupName: formData.groupName.trim(),
        offerUrl: formData.offerUrl.trim(),
        isGlobal: formData.isGlobal,
        isContentLocker: formData.isContentLocker,
        usaSecretRedirectEnabled: Boolean(formData.usaSecretRedirectEnabled),
        usaSecretRedirectPercentage: Number.isFinite(percentageVal)
          ? Math.max(1, Math.min(100, percentageVal))
          : 50,
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-center">
        <div className="flex flex-col items-center justify-center gap-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <Image
              src="/afficixo-logo.png"
              alt="Afficixo logo"
              width={200}
              height={200}
              sizes="(max-width: 768px) 200px, 240px"
              className="mx-auto object-cover"
              priority
            />
            <motion.div
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/30 via-violet-500/20 to-transparent blur-xl"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-white/5 border border-white/10">
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
              className="text-xs text-slate-400"
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
    <div className="space-y-6 pb-8 md:space-y-8">
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
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeFormModal();
            }}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-900/10 max-h-[90vh] overflow-y-auto dark:border-white/10 dark:bg-[#0d1724] dark:text-slate-100 sm:p-6 dark:shadow-indigo-500/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <Plus className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:!text-white">
                    {editingId ? "Edit Offer" : "Add Offer"}
                  </h2>
                </div>
                <button
                  onClick={closeFormModal}
                  className="p-2 rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:!text-white"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {formError && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                    {formError}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:!text-slate-200">Country</label>
                    <div ref={countryPickerRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setCountrySearch("");
                          setIsCountryMenuOpen((prev) => !prev);
                        }}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white flex items-center justify-between hover:border-white/20 transition min-h-[44px]"
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
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </button>
                      {isCountryMenuOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-slate-900/95 p-2 shadow-xl backdrop-blur-xl">
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Search countries…"
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30"
                            autoFocus
                          />
                          <div className="mt-2 space-y-1">
                            {filteredCountryOptions.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => handleCountrySelect(country.code)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5 transition min-h-[44px]"
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
                                <span className="text-xs text-slate-400 truncate">{country.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:!text-slate-200">Routing Pool</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.groupName}
                        onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                        placeholder="Pool name"
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 transition min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setIsGroupCreatorOpen((prev) => !prev)}
                        className="px-3 py-2.5 rounded-lg border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition min-h-[44px]"
                        aria-label="Create new group"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {isGroupCreatorOpen && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="New pool name"
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={createGroup}
                          className="px-3 py-2 rounded-lg bg-indigo-500 text-sm text-white hover:bg-indigo-600 transition"
                        >
                          Save
                        </button>
                      </div>
                    )}
                    {availableGroupNames.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {availableGroupNames.slice(0, 8).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => selectGroup(g)}
                            className={`text-xs px-3 py-1 rounded-full border transition min-h-[30px] ${
                              formData.groupName === g
                                ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-200"
                                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                        {availableGroupNames.length > 8 && (
                          <span className="text-xs text-slate-500">+{availableGroupNames.length - 8} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:!text-slate-200">Priority</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="999"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                        className="priority-slider flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-white min-w-[3rem] text-center">
                        {formData.priority}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:!text-slate-200">Rotator Mood</label>
                    <select
                      value={formData.rotationMode}
                      onChange={(e) =>
                        setFormData({ ...formData, rotationMode: e.target.value as "PRIORITY" | "RANDOM" })
                      }
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 transition min-h-[44px]"
                    >
                      {rotationModeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:!text-slate-200">Offer URL</label>
                  <input
                    type="url"
                    value={formData.offerUrl}
                    onChange={(e) => setFormData({ ...formData, offerUrl: e.target.value })}
                    placeholder="https://affiliate.com/?s1="
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 transition min-h-[44px]"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/5">
                    <input
                      type="checkbox"
                      id="content-locker"
                      checked={formData.isContentLocker}
                      onChange={(e) =>
                        setFormData({ ...formData, isContentLocker: e.target.checked })
                      }
                      className="h-5 w-5 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                    />
                    <label htmlFor="content-locker" className="text-sm text-slate-300 cursor-pointer">
                      Content Locker
                    </label>
                  </div>
                  {canUseSecretRedirect && <div className="rounded-lg border border-white/5 bg-white/5 p-3">
                    <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        id="usa-secret-modal"
                        checked={formData.usaSecretRedirectEnabled}
                        onChange={(e) =>
                          setFormData({ ...formData, usaSecretRedirectEnabled: e.target.checked })
                        }
                        className="h-5 w-5 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                      />
                      Block Proxy
                    </label>
                    {formData.usaSecretRedirectEnabled && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-3">
                          <label htmlFor="usa-secret-percentage" className="text-sm font-medium text-slate-300">
                            Shield Level
                          </label>
                          <input
                            id="usa-secret-percentage"
                            type="number"
                            min={1}
                            max={100}
                            value={formData.usaSecretRedirectPercentage}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                usaSecretRedirectPercentage: Number(e.target.value),
                              })
                            }
                            className="w-20 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 transition min-h-[40px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>}
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="px-5 py-3 rounded-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 transition min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-5 py-3 rounded-lg bg-indigo-500 text-sm font-medium text-white hover:bg-indigo-600 transition disabled:opacity-60 min-h-[44px]"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setIsQuickGroupOpen((prev) => !prev);
                setQuickGroupName("");
              }}
              className="inline-flex min-h-8 items-center gap-1 rounded-md border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Group
            </button>
            <button
              onClick={() => openOfferForm()}
              className="inline-flex min-h-8 items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Offer
            </button>
            <button
              type="button"
              onClick={() => setShowBotFallbackSettings((prev) => !prev)}
              className="inline-flex min-h-8 items-center gap-1 rounded-md border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/20"
            >
              <span>Blocked Url</span>
              <span className={['text-[10px] transition-transform duration-200', showBotFallbackSettings && 'rotate-180'].join(' ')}>▾</span>
            </button>
          </div>
        </div>

        {showBotFallbackSettings && (
          <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
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
                className="h-11 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white placeholder:text-slate-500 transition-colors duration-200 focus:border-indigo-400/70 focus:outline-none focus:ring-3 focus:ring-indigo-500/10"
              />
              <button
                type="button"
                onClick={() => void handleBotFallbackSave()}
                disabled={botFallbackStatus === 'saving'}
                className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {botFallbackStatus === 'saving' ? 'Saving...' : 'Save URL'}
              </button>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              This URL is used when bot or suspicious traffic is detected. Instead of sending visitors to a broken or blocked page, they are redirected here.
            </p>

            {botFallbackMessage && (
              <p
                className={[
                  'mt-2 text-xs',
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
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={quickGroupName}
                    onChange={(e) => setQuickGroupName(e.target.value)}
                    placeholder="Enter a new group name"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white caret-indigo-600 placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 transition min-h-[44px] dark:caret-indigo-300"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createQuickGroup}
                      className="px-4 py-2 rounded-lg bg-indigo-500 text-sm font-medium text-white hover:bg-indigo-600 transition min-h-[44px]"
                    >
                      Save Group
                    </button>
                    <button
                      onClick={() => {
                        setIsQuickGroupOpen(false);
                        setQuickGroupName("");
                      }}
                      className="px-4 py-2 rounded-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 transition min-h-[44px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { 
              label: "Active", 
              value: activeOffers, 
              icon: Zap, 
              color: "border-white/10 bg-white/5"
            },
            { 
              label: "Pools", 
              value: geoPoolCount, 
              icon: Layers, 
              color: "border-white/10 bg-white/5"
            },
            { 
              label: "Global", 
              value: globalOffers, 
              icon: Globe, 
              color: "border-white/10 bg-white/5"
            },
            { 
              label: "Score", 
              value: `${vaultScore}%`, 
              icon: TrendingUp, 
              color: "border-white/10 bg-white/5"
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-lg border ${stat.color} p-3 md:p-4 backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] md:text-xs font-medium text-slate-400">{stat.label}</p>
                <stat.icon className="w-4 h-4 text-white/50" />
              </div>
              <p className="text-lg md:text-xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ===== SEARCH & FILTER BAR ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search offers by country, group, or URL…"
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 transition min-h-[44px]"
          />
        </div>
        <button
          onClick={() => setFilterActiveOnly((prev) => !prev)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition min-h-[44px] ${
            filterActiveOnly
              ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          <Filter className="w-4 h-4" />
          Active only
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="grid gap-3 sm:gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Left Column */}
        <div className="space-y-3 sm:space-y-4">
          {/* Groups */}
          {groupSummaries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Routing Pools</h3>
              {groupSummaries.map((group) => (
                <motion.div
                  key={group.groupName}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className="rounded-lg border border-white/5 bg-white/3 p-3 md:p-4 hover:border-white/15 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 flex-shrink-0">
                          <MapPinned className="w-4 h-4 text-indigo-300" />
                        </div>
                        <span className="text-sm md:text-base font-medium text-white truncate">{group.groupName}</span>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {group.groupOffers.length} offers
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1 ml-8">
                        {group.poolCountries.slice(0, 5).map((c) => (
                          <span
                            key={c}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/5"
                          >
                            {c}
                          </span>
                        ))}
                        {group.poolCountries.length > 5 && (
                          <span className="text-[10px] text-slate-500">+{group.poolCountries.length - 5}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openOfferForm(group.groupName)}
                        className="text-xs px-3 py-2 rounded-lg border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/10 transition min-h-[40px]"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => renameGroup(group.groupName)}
                        className="text-xs px-3 py-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 transition min-h-[40px]"
                        aria-label="Edit group"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteGroup(group.groupName)}
                        className="text-xs px-3 py-2 rounded-lg border border-rose-400/30 text-rose-300 hover:bg-rose-500/10 transition min-h-[40px]"
                        aria-label="Remove group"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Offers */}
          {filteredOffers.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Offers</h3>
              {groupedOffers.map(([groupKey, groupOffers]) => {
                const filteredGroupOffers = groupOffers.filter((offer) =>
                  filteredOffers.some((fo) => fo.id === offer.id)
                );
                if (filteredGroupOffers.length === 0) return null;
                return (
                  <div key={groupKey} className="space-y-2">
                    {filteredGroupOffers.map((offer) => (
                      <motion.div
                        key={offer.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className={`group rounded-lg border p-3 md:p-4 transition-all duration-200 ${
                          offer.isActive 
                            ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40" 
                            : "border-white/5 bg-white/3 hover:border-white/15"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white">
                                {offer.isGlobal ? (
                                  <Globe2 className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <Image
                                    src={getFlagImageUrl(offer.country)}
                                    alt={offer.country}
                                    width={24}
                                    height={16}
                                    className="rounded-sm"
                                  />
                                )}
                                {offer.isGlobal ? "🌍 Global" : offer.country}
                              </span>
                              {offer.groupName && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                  {offer.groupName}
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                                P{offer.priority ?? 100}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                                {offer.rotationMode === "RANDOM" ? "🎲" : "🎯"}
                              </span>
                              {offer.isContentLocker && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">
                                  🧲 Content Locker
                                </span>
                              )}
                              {offer.usaSecretRedirectEnabled && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                  🔒
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                                  offer.isActive
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                }`}
                              >
                                {offer.isActive ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                                {offer.isActive ? "On" : "Off"}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500 break-all font-mono truncate max-w-full">
                              {offer.offerUrl}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                            <button
                              onClick={() => handleToggle(offer.id, offer.isActive)}
                              className={`text-xs px-3 py-2 rounded-lg border transition min-h-[40px] ${
                                offer.isActive
                                  ? "border-amber-400/30 text-amber-300 hover:bg-amber-500/10"
                                  : "border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10"
                              }`}
                            >
                              {offer.isActive ? "Off" : "On"}
                            </button>
                            <button
                              onClick={() => openOfferForm("", offer)}
                              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 transition min-h-[40px]"
                              aria-label="Edit offer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(offer.id)}
                              className="p-2 rounded-lg border border-rose-400/30 text-rose-300 hover:bg-rose-500/10 transition min-h-[40px]"
                              aria-label="Delete offer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/3 p-8 md:p-10 text-center">
              <div className="flex justify-center gap-4 mb-4">
                <Globe className="w-8 h-8 md:w-10 md:h-10 text-slate-600" />
                <Plus className="w-8 h-8 md:w-10 md:h-10 text-slate-600" />
                <Check className="w-8 h-8 md:w-10 md:h-10 text-slate-600" />
              </div>
              <h3 className="text-base md:text-lg font-medium text-white">
                {searchTerm || filterActiveOnly ? "No matching offers" : "Your vault is empty"}
              </h3>
              <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
                {searchTerm || filterActiveOnly
                  ? "Try adjusting your search or filters."
                  : "Create a routing pool, then add offers to start building your geo-smart campaign structure."}
              </p>
              {!searchTerm && !filterActiveOnly && (
                <button
                  onClick={() => openOfferForm()}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 text-sm font-medium text-white hover:bg-indigo-600 transition min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  Create your first offer
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="grid gap-3 sm:gap-4 lg:flex lg:flex-col lg:space-y-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-lg border border-white/5 bg-white/3 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-indigo-300 mb-3 sm:mb-4">
              <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">Vault Health</span>
            </div>
            <div className="space-y-3 sm:space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-300/30 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-3 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm hover:border-slate-400/50 dark:hover:border-white/20 transition">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Regional</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{regionalOffers}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-300/30 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-3 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm hover:border-slate-400/50 dark:hover:border-white/20 transition">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Fallback</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{globalOffers}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-300/30 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-3 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm hover:border-slate-400/50 dark:hover:border-white/20 transition">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Geo pools</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{geoPoolCount}</span>
              </div>
              <div className="rounded-lg border border-slate-300/30 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-3 sm:p-3">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Coverage</span>
                  <span className="font-bold text-slate-900 dark:text-white">{vaultScore}%</span>
                </div>
                <div className="w-full h-3 bg-slate-300 dark:bg-white/10 rounded-full overflow-hidden">
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

          <div className="rounded-lg border border-white/5 bg-white/3 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-3 sm:mb-4">
              <Layers className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">How It Works</span>
            </div>
            <ul className="space-y-3 sm:space-y-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-3">
                <span className="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span className="leading-relaxed">Create a <span className="text-slate-900 dark:text-white font-medium">routing pool</span> for offers.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span className="leading-relaxed">Add offers with <span className="text-slate-900 dark:text-white font-medium">country targeting</span>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span className="leading-relaxed"><span className="text-slate-900 dark:text-white font-medium">Global fallback</span> covers unmapped countries.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0 font-bold">✓</span>
                <span className="leading-relaxed"><span className="text-slate-900 dark:text-white font-medium">Priority</span> or <span className="text-slate-900 dark:text-white font-medium">random</span> rotation.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}