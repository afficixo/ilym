"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserRound,
  UserX,
  X,
} from "lucide-react";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  status: "ACTIVE" | "DISABLED" | "PENDING" | "REJECTED";
  createdAt: string;
  lastLogin: string | null;
  canUseSecretRedirect: boolean;
};

export default function OwnerAdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    fullName: "",
    password: "",
  });

  const loadAdmins = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch("/api/owner/admins", {
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          router.push("/login");
          return;
        }
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load admin users.");
        setAdmins(data.admins || []);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load admin users.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const filteredAdmins = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return admins;
    return admins.filter((admin) =>
      [admin.username, admin.email, admin.fullName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [admins, search]);

  const updateStatus = async (admin: AdminUser) => {
    const status = admin.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setUpdatingId(admin.id);
    try {
      const response = await fetch(`/api/owner/admins/${admin.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to update admin user.");
      setAdmins((current) =>
        current.map((item) =>
          item.id === admin.id ? { ...item, status } : item,
        ),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update admin user.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteAdmin = async (admin: AdminUser) => {
    if (
      !window.confirm(
        `Delete admin "${admin.username}"? This permanently removes the account and its workspace data.`,
      )
    )
      return;

    setUpdatingId(admin.id);
    try {
      const response = await fetch(`/api/owner/admins/${admin.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to delete admin user.");
      setAdmins((current) => current.filter((item) => item.id !== admin.id));
      setError("");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete admin user.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const createAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/owner/admins", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to create admin user.");
      setAdmins((current) => [data.admin, ...current]);
      setCreateForm({ username: "", email: "", fullName: "", password: "" });
      setShowCreateForm(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create admin user.",
      );
    } finally {
      setCreating(false);
    }
  };

  const activeCount = admins.filter(
    (admin) => admin.status === "ACTIVE",
  ).length;
  const updateSecretRedirectAccess = async (admin: AdminUser, enabled: boolean) => {
    setUpdatingId(admin.id);
    try {
      const response = await fetch(`/api/owner/admins/${admin.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canUseSecretRedirect: enabled }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to update feature access.");
      setAdmins((current) =>
        current.map((item) =>
          item.id === admin.id
            ? { ...item, canUseSecretRedirect: enabled }
            : item,
        ),
      );
      setError("");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update feature access.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-6xl space-y-5 p-3 sm:p-5 lg:p-6">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
        </div>
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                Access control
              </p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight">
                Administrator access
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Provision and manage access to the admin workspace.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/20"
          >
            {showCreateForm ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {showCreateForm ? "Close" : "Add administrator"}
          </button>
          <button
            type="button"
            onClick={() => void loadAdmins(true)}
            disabled={refreshing}
            aria-label="Refresh administrator directory"
            title="Refresh directory"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form
          onSubmit={createAdmin}
          className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4 shadow-sm dark:bg-cyan-500/[0.08]"
        >
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Create an administrator
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                This account will be active immediately and can access the admin
                workspace.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Username
              <input
                required
                value={createForm.username}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Email
              <input
                required
                type="email"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Full name{" "}
              <span className="font-normal text-slate-400">(optional)</span>
              <input
                value={createForm.fullName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Temporary password
              <input
                required
                minLength={8}
                type="password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 disabled:opacity-60"
          >
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}Create
            admin user
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Enabled accounts
            </p>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-300">
            {activeCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Can sign in now</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Directory size</p>
            <UserRound className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {admins.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Administrator accounts
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search admin users"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by username, name, or email"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white"
          />
        </div>
        {error && (
          <p className="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </p>
        )}
        {filteredAdmins.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <UserRound className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">
              Your directory is empty
            </p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
              Add an administrator to share controlled access to the workspace.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 px-3 py-2 text-xs font-medium text-cyan-700 transition hover:bg-cyan-500/10 dark:text-cyan-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Add first administrator
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAdmins.map((admin) => (
              <div
                key={admin.id}
                className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                    {(admin.fullName || admin.username)
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {admin.fullName || admin.username}
                      </p>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <UserRound className="h-3 w-3 shrink-0" />@
                      {admin.username}
                      <span className="text-slate-300 dark:text-slate-700">
                        •
                      </span>
                      <Mail className="h-3 w-3 shrink-0" />
                      {admin.email}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <CalendarDays className="h-3 w-3" />
                      Last login:{" "}
                      {admin.lastLogin
                        ? new Date(admin.lastLogin).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pl-4">
                  <label
                    title={`${admin.canUseSecretRedirect ? "Disable" : "Enable"} Block Proxy for ${admin.username}`}
                    aria-label={`${admin.canUseSecretRedirect ? "Disable" : "Enable"} Block Proxy for ${admin.username}`}
                    className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition hover:bg-cyan-50 dark:hover:bg-cyan-500/10 ${admin.canUseSecretRedirect ? "border-cyan-200 text-cyan-700 dark:border-cyan-500/30 dark:text-cyan-300" : "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"}`}
                  >
                    <input
                      type="checkbox"
                      checked={admin.canUseSecretRedirect}
                      disabled={updatingId === admin.id}
                      onChange={(event) =>
                        void updateSecretRedirectAccess(admin, event.target.checked)
                      }
                      className="sr-only"
                    />
                    {admin.canUseSecretRedirect ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <ShieldOff className="h-4 w-4" />
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => void updateStatus(admin)}
                    disabled={updatingId === admin.id}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-60 ${admin.status === "ACTIVE" ? "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" : "bg-emerald-600 text-white hover:bg-emerald-500"}`}
                  >
                    {updatingId === admin.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : admin.status === "ACTIVE" ? (
                      <UserX className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {admin.status === "ACTIVE" ? "Disable" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteAdmin(admin)}
                    disabled={updatingId === admin.id}
                    aria-label={`Delete ${admin.username}`}
                    title="Delete admin"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

