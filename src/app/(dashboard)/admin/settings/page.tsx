"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AfficixoLoading from "@/components/ui/AfficixoLoading";
import {
  User,
  Key,
  LogOut,
  AlertTriangle,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Mail,
  CircleDollarSign,
  Check,
  ChevronDown,
  Search,
} from "lucide-react";

interface FeedbackState {
  type: "success" | "error";
  message: string;
}

interface ManagerOption {
  id: string;
  username: string;
  fullName: string | null;
  clickRate: number;
  commissionRate: number;
  status?: "PENDING" | "ACTIVE" | "DISABLED" | "REJECTED";
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ username?: string; email?: string; role?: string } | null>(null);
  const [clickRate, setClickRate] = useState("0");
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [isManagerMenuOpen, setIsManagerMenuOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState("");
  const managerPickerRef = useRef<HTMLDivElement | null>(null);
  const [managerClickRate, setManagerClickRate] = useState("0");
  const [managerCommissionRate, setManagerCommissionRate] = useState("20");
  const [showClickRateForm, setShowClickRateForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [googleResetReady, setGoogleResetReady] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const selectedManager = managers.find((manager) => manager.id === selectedManagerId);
  const normalizedManagerSearch = managerSearch.trim().toLowerCase();
  const filteredManagers = managers.filter((manager) => {
    if (manager.status && manager.status !== "ACTIVE") return false;
    if (!normalizedManagerSearch) return true;
    return `${manager.fullName || ""} ${manager.username}`.toLowerCase().includes(normalizedManagerSearch);
  });

  useEffect(() => {
    if (!isManagerMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!managerPickerRef.current?.contains(event.target as Node)) {
        setIsManagerMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsManagerMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isManagerMenuOpen]);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setUserInfo({ username: data.username || "admin", email: data.email || "", role: data.role });
          setEmailDraft(data.email || "");
          setClickRate(String(data.clickRate ?? 0));
        } else {
          setUserInfo({ username: "admin", email: "" });
          setEmailDraft("");
        }
      } catch {
        setUserInfo({ username: "admin", email: "" });
        setEmailDraft("");
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
    if (new URLSearchParams(window.location.search).get("google_reset") === "1") {
      setGoogleResetReady(true);
      setShowPasswordForm(true);
    }

  }, []);

  const handleClickRateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-click-rate", clickRate: Number(clickRate) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update USA click rate");
      setClickRate(String(data.clickRate));
      setFeedback({ type: "success", message: data.message || "USA click rate updated successfully." });
      setShowClickRateForm(false);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to update USA click rate" });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (userInfo?.role !== "OWNER") return;

    const fetchManagers = async () => {
      const response = await fetch("/api/owner/managers", { credentials: "include" });
      if (!response.ok) return;
      const data = await response.json();
      const managerOptions = Array.isArray(data.managers)
        ? data.managers
            .filter((manager: ManagerOption) => manager.status === "ACTIVE" || !manager.status)
            .map((manager: ManagerOption) => ({
              id: manager.id,
              username: manager.username,
              fullName: manager.fullName || null,
              clickRate: Number(manager.clickRate ?? 0),
              commissionRate: Number(manager.commissionRate ?? 20),
              status: manager.status || "ACTIVE",
            }))
        : [];
      setManagers(managerOptions);
      if (managerOptions.length > 0) {
        const firstManager = managerOptions[0];
        setSelectedManagerId((current) => current || firstManager.id);
        setManagerCommissionRate(String(firstManager.commissionRate));
      } else {
        setSelectedManagerId("");
      }
    };

    void fetchManagers();
  }, [userInfo?.role]);

  useEffect(() => {
    const manager = managers.find((item) => item.id === selectedManagerId);
    if (!manager) return;

    const resolvedManagerClickRate = manager.clickRate > 0 ? manager.clickRate : Number(clickRate || 0);
    setManagerClickRate(String(resolvedManagerClickRate));
    setManagerCommissionRate(String(manager.commissionRate));
  }, [managers, selectedManagerId]);

  const handleManagerClickRateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-manager-click-rate", managerId: selectedManagerId, clickRate: Number(managerClickRate) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update manager click rate");
      setManagers((current) => current.map((manager) => manager.id === selectedManagerId ? { ...manager, clickRate: Number(data.clickRate) } : manager));
      setFeedback({ type: "success", message: data.message || "Manager click rate updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to update manager click rate" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManagerCommissionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-manager-commission-rate", managerId: selectedManagerId, commissionRate: Number(managerCommissionRate) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update manager commission rate");
      setManagers((current) => current.map((manager) => manager.id === selectedManagerId ? { ...manager, commissionRate: Number(data.commissionRate) } : manager));
      setFeedback({ type: "success", message: data.message || "Manager commission rate updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to update manager commission rate" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: googleResetReady ? "reset-password-google" : "change-password",
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({ message: "Password updated" }));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update password");
      }

      setFeedback({ type: "success", message: data.message || "Password updated successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setGoogleResetReady(false);
      setShowPasswordForm(false);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to update password",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDangerAction = async (action: "delete-data" | "reset-analytics") => {
    const confirmMessage =
      action === "delete-data"
        ? "This will permanently remove all workspace data for this account. Continue?"
        : "This will reset all analytics for your workspace. Continue?";

    if (!window.confirm(confirmMessage)) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to complete that action");
      }

      setFeedback({ type: "success", message: data.message || "Action completed." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to complete that action",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <AfficixoLoading compact />;
  }

  return (
    <div className="space-y-6 pb-8 md:space-y-8">
      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="hover:opacity-80">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="space-y-6">
        {/* Account */}
          <div className="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Account</h3>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Username</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {userInfo?.username || "admin"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {userInfo?.email || "No email added yet"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setShowPasswordForm((prev) => !prev)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/20"
                >
                  <Key className="h-3.5 w-3.5" />
                  {showPasswordForm ? "Hide" : "Change password"}
                </button>
                <button
                  onClick={() => window.location.assign(`/api/auth/google/start?redirect=${encodeURIComponent(window.location.pathname)}&purpose=password-reset`)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 text-xs font-semibold text-cyan-700 shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-500/20"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Forget Password? Reset Now
                </button>
                {userInfo?.role !== "MANAGER" && (
                  <button
                    onClick={() => {
                      setShowEmailForm((prev) => !prev);
                      if (!showEmailForm) setEmailDraft(userInfo?.email || "");
                    }}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-100 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:border-sky-400/40 dark:hover:bg-sky-500/20"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {userInfo?.email ? "Update email" : "Add email"}
                  </button>
                )}
                {(userInfo?.role === "OWNER" || userInfo?.role === "ADMIN") && (
                  <button
                    onClick={() => setShowClickRateForm((prev) => !prev)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:border-emerald-400/30 dark:hover:bg-emerald-500/20"
                  >
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    USA click rate: ${Number(clickRate).toFixed(3)}
                  </button>
                )}
                {userInfo?.role !== "MANAGER" && (
                  <button
                    onClick={() => setShowDangerZone((prev) => !prev)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:border-amber-400/30 dark:hover:bg-amber-500/20"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {showDangerZone ? "Hide danger zone" : "Danger zone"}
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 shadow-sm transition-colors hover:border-red-300 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:border-red-400/30 dark:hover:bg-red-500/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>

              {/* Email Form */}
              {showClickRateForm && (userInfo?.role === "OWNER" || userInfo?.role === "ADMIN") && (
                <div className="mt-3 space-y-3">
                <form onSubmit={handleClickRateSubmit} className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">{userInfo.role === "ADMIN" ? "Your default USA click rate per unique referrer click" : "Default USA click rate per unique referrer click"}</label>
                    <input type="number" min="0" step="0.001" value={clickRate} onChange={(event) => setClickRate(event.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  </div>
                  <button type="submit" disabled={isSubmitting} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60">{isSubmitting ? "Saving..." : "Save default click rate"}</button>
                </form>
                {userInfo.role === "OWNER" && (
                  <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Select manager</label>
                      <div ref={managerPickerRef} className="relative">
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={isManagerMenuOpen}
                          onClick={() => {
                            setManagerSearch("");
                            setIsManagerMenuOpen((open) => !open);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-900 shadow-sm transition hover:border-cyan-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:border-cyan-500"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <User className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-300" />
                            <span className="truncate">
                              {selectedManager ? `${selectedManager.fullName || selectedManager.username} (@${selectedManager.username})` : "Select a manager"}
                            </span>
                          </span>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isManagerMenuOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isManagerMenuOpen && (
                          <div className="manager-picker-menu absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                type="search"
                                value={managerSearch}
                                onChange={(event) => setManagerSearch(event.target.value)}
                                placeholder="Search managers..."
                                aria-label="Search managers"
                                autoFocus
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>
                            <div className="mt-2 max-h-52 overflow-y-auto" role="listbox" aria-label="Managers">
                              {filteredManagers.length > 0 ? filteredManagers.map((manager) => {
                                const isSelected = manager.id === selectedManagerId;
                                return (
                                  <button
                                    key={manager.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                      setSelectedManagerId(manager.id);
                                      setIsManagerMenuOpen(false);
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-cyan-50 dark:text-slate-200 dark:hover:bg-cyan-500/10"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate font-medium">{manager.fullName || manager.username}</span>
                                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">@{manager.username}</span>
                                    </span>
                                    {isSelected && <Check className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-300" />}
                                  </button>
                                );
                              }) : (
                                <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">No managers found</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <form onSubmit={handleManagerClickRateSubmit} className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">Manager override click rate per unique referrer click</label>
                        <input type="number" min="0" step="0.001" value={managerClickRate} onChange={(event) => setManagerClickRate(event.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                      </div>
                      <button type="submit" disabled={isSubmitting || !selectedManagerId || managers.length === 0} className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-60">{isSubmitting ? "Saving..." : "Save manager override"}</button>
                    </form>

                    <form onSubmit={handleManagerCommissionSubmit} className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">Manager commission percentage</label>
                        <input type="number" min="0" max="100" step="0.01" value={managerCommissionRate} onChange={(event) => setManagerCommissionRate(event.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                      </div>
                      <button type="submit" disabled={isSubmitting || !selectedManagerId || managers.length === 0} className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-60">{isSubmitting ? "Saving..." : "Save commission percentage"}</button>
                    </form>
                  </div>
                )}
                </div>
              )}

              {showEmailForm && userInfo?.role !== "MANAGER" && (
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setIsSubmitting(true);
                    setFeedback(null);

                    try {
                      const response = await fetch("/api/settings", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "update-email", email: emailDraft.trim() }),
                      });

                      const data = await response.json().catch(() => ({ message: "Email updated" }));
                      if (!response.ok) {
                        throw new Error(data.error || "Unable to update email");
                      }

                      setUserInfo((prev) => (prev ? { ...prev, email: emailDraft.trim() } : prev));
                      setFeedback({ type: "success", message: data.message || "Email updated successfully." });
                      setShowEmailForm(false);
                    } catch (error) {
                      setFeedback({
                        type: "error",
                        message: error instanceof Error ? error.message : "Unable to update email",
                      });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="mt-3 space-y-3 rounded-lg border border-slate-800 bg-slate-800/30 p-4"
                >
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Email address</label>
                    <input
                      type="email"
                      value={emailDraft}
                      onChange={(event) => setEmailDraft(event.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Saving…" : "Save email"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailForm(false)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Password Form */}
              {showPasswordForm && (
                <form
                  onSubmit={handlePasswordSubmit}
                  className="mt-3 space-y-3 rounded-lg border border-slate-800 bg-slate-800/30 p-4"
                >
                  {googleResetReady && (
                    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                      Google verified your account. Choose a new password below.
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {!googleResetReady && <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">
                        Current password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                        }
                        required
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">
                        New password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                        required
                        minLength={8}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      required
                      minLength={8}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Updating…" : "Save password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(false)}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        {showDangerZone && userInfo?.role !== "MANAGER" && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h3 className="text-sm font-semibold text-red-300">Danger zone</h3>
            </div>
            <p className="mb-4 text-sm text-slate-400">These actions are irreversible. Please review them before proceeding.</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleDangerAction("delete-data")}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete all data
              </button>
              <button
                onClick={() => handleDangerAction("reset-analytics")}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset analytics
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}