"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  Save,
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
  const [managerDrafts, setManagerDrafts] = useState<Record<string, { clickRate: string; commissionRate: string }>>({});
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
      setManagerDrafts(Object.fromEntries(managerOptions.map((manager: ManagerOption) => [manager.id, {
        clickRate: String(manager.clickRate),
        commissionRate: String(manager.commissionRate),
      }])));
    };

    void fetchManagers();
  }, [userInfo?.role]);

  const updateManagerDraft = (managerId: string, field: "clickRate" | "commissionRate", value: string) => {
    setManagerDrafts((current) => ({
      ...current,
      [managerId]: { ...current[managerId], [field]: value },
    }));
  };

  const handleManagerClickRateSubmit = async (event: FormEvent<HTMLFormElement>, managerId: string) => {
    event.preventDefault();
    const draft = managerDrafts[managerId];
    if (!draft) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-manager-click-rate", managerId, clickRate: Number(draft.clickRate) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update manager click rate");
      setManagers((current) => current.map((manager) => manager.id === managerId ? { ...manager, clickRate: Number(data.clickRate) } : manager));
      updateManagerDraft(managerId, "clickRate", String(data.clickRate));
      setFeedback({ type: "success", message: data.message || "Manager click rate updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to update manager click rate" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManagerCommissionSubmit = async (event: FormEvent<HTMLFormElement>, managerId: string) => {
    event.preventDefault();
    const draft = managerDrafts[managerId];
    if (!draft) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-manager-commission-rate", managerId, commissionRate: Number(draft.commissionRate) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update manager commission rate");
      setManagers((current) => current.map((manager) => manager.id === managerId ? { ...manager, commissionRate: Number(data.commissionRate) } : manager));
      updateManagerDraft(managerId, "commissionRate", String(data.commissionRate));
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
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Manager controls</h3>
                        <p className="mt-0.5 text-xs text-slate-400">Set account-level click rates and commission shares.</p>
                      </div>
                      <span className="text-[11px] text-slate-500">{managers.length} active account{managers.length === 1 ? "" : "s"}</span>
                    </div>

                    {managers.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-700 shadow-inner shadow-black/10">
                        <div className="min-w-[760px]">
                          <div className="grid grid-cols-[minmax(220px,1fr)_220px_220px] gap-3 border-b border-slate-700 bg-slate-800/80 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <span>Account</span>
                            <span>Click rate per unique referrer</span>
                            <span>Commission share</span>
                          </div>
                          {managers.map((manager) => {
                            const draft = managerDrafts[manager.id] || { clickRate: String(manager.clickRate), commissionRate: String(manager.commissionRate) };
                            return (
                              <div key={manager.id} className="grid grid-cols-[minmax(220px,1fr)_220px_220px] items-center gap-3 border-b border-slate-700/80 px-3 py-3.5 last:border-b-0 hover:bg-cyan-500/[0.04]">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <User className="h-4 w-4 shrink-0 text-cyan-300" />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-white">{manager.fullName || manager.username}</p>
                                    <p className="truncate text-xs text-slate-400">@{manager.username} · current ${manager.clickRate.toFixed(3)} / {manager.commissionRate}% share</p>
                                  </div>
                                </div>
                                <form onSubmit={(event) => void handleManagerClickRateSubmit(event, manager.id)} className="flex items-end gap-2">
                                  <label className="min-w-0 flex-1 text-[10px] font-medium text-slate-500">
                                    USD per click
                                    <input aria-label={`Click rate for ${manager.username}`} type="number" min="0" step="0.001" value={draft.clickRate} onChange={(event) => updateManagerDraft(manager.id, "clickRate", event.target.value)} required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs tabular-nums text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                                  </label>
                                  <button type="submit" disabled={isSubmitting} aria-label={`Save click rate for ${manager.username}`} title="Save click rate" className="inline-flex items-center gap-1 rounded-md bg-cyan-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-3 w-3" />Save rate</button>
                                </form>
                                <form onSubmit={(event) => void handleManagerCommissionSubmit(event, manager.id)} className="flex items-end gap-2">
                                  <label className="min-w-0 flex-1 text-[10px] font-medium text-slate-500">
                                    Share (%)
                                    <input aria-label={`Commission rate for ${manager.username}`} type="number" min="0" max="100" step="0.01" value={draft.commissionRate} onChange={(event) => updateManagerDraft(manager.id, "commissionRate", event.target.value)} required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs tabular-nums text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                                  </label>
                                  <button type="submit" disabled={isSubmitting} aria-label={`Save commission for ${manager.username}`} title="Save commission share" className="inline-flex items-center gap-1 rounded-md bg-cyan-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-3 w-3" />Save share</button>
                                </form>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-700 px-4 py-5 text-center">
                        <p className="text-xs font-medium text-slate-400">No active manager accounts</p>
                        <p className="mt-1 text-[11px] text-slate-500">Approved manager accounts will appear here when they are available.</p>
                      </div>
                    )}
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