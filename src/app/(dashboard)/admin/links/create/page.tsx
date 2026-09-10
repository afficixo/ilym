"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  Rocket,
  X,
} from "lucide-react";
import { buildOfferGroupList } from "@/lib/utils/offer-groups";
import { coerceArray } from "@/lib/utils/array-response";

// ========== TYPES ==========
interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  isActive: boolean;
}

interface CreatedAccount {
  accountName: string;
  slug: string;
  domain?: string;
  trackingUrl: string;
  publicStatsUrl: string;
}

// ========== SIMPLE COPY BUTTON ==========
const CopyButton = ({ text, onCopy }: { text: string; onCopy: () => void }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
};

const ResultCopyButton = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="self-end inline-flex items-center gap-1.5 rounded-lg border border-slate-600/80 bg-slate-800/70 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-indigo-300/40 hover:bg-indigo-400/10 hover:text-indigo-100"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
};

const buildSmartSlug = (value: string) => {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "is",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
    "media",
    "marketing",
    "campaign",
    "group",
    "team",
    "official",
    "global",
    "network",
    "brand",
    "agency",
    "studio",
    "store",
    "shop",
    "links",
    "link",
  ]);

  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim();

  const words = normalized
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !stopWords.has(word))
    .filter((word, index, array) => array.indexOf(word) === index);

  if (words.length === 0) {
    return "";
  }

  const slug = words.slice(0, 3).join("-");

  if (!slug) {
    return "";
  }

  return slug.slice(0, 32).replace(/-+/g, "-").replace(/^-+|-+$/g, "");
};

// ========== MAIN PAGE ==========
export default function CreateLinkPage() {
  const router = useRouter();
  const [accountName, setAccountName] = useState("");
  const [customDomainId, setCustomDomainId] = useState("");
  const [offerGroupName, setOfferGroupName] = useState("");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [offerGroups, setOfferGroups] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      const response = await fetch("/api/domains", { credentials: "include" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      setDomains(coerceArray<Domain>(data));
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
      const groups = buildOfferGroupList(data);
      setOfferGroups(groups);
    } catch (error) {
      console.error("Failed to fetch offer groups:", error);
    }
  }, [router]);

  useEffect(() => {
    void fetchDomains();
    void fetchOfferGroups();
  }, [fetchDomains, fetchOfferGroups]);

  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.origin.replace(/\/$/, "");
    }
    return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  };

  const selectableDomains = domains.filter((domain) => domain.verified && domain.isActive);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/admin/links");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName,
          customDomainId: customDomainId || null,
          offerGroupName: offerGroupName || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create link");
      }

      const createdTrackingUrl = data.customDomain?.domain
        ? `https://${data.customDomain.domain}/${data.slug}`
        : `${getBaseUrl()}/${data.slug}`;

      const createdPublicStatsUrl = `${getBaseUrl()}/stats/${data.publicDashboard?.publicId}`;

      setCreatedAccount({
        accountName: data.accountName,
        slug: data.slug,
        domain: data.customDomain?.domain,
        trackingUrl: createdTrackingUrl,
        publicStatsUrl: createdPublicStatsUrl,
      });
      setSuccess(`Link account “${data.accountName}” was created successfully.`);
      setAccountName("");
      setCustomDomainId("");
      setOfferGroupName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const templateText = createdAccount
    ? `Account Name: \`${createdAccount.accountName}\`\nPublic Analytics: ${createdAccount.publicStatsUrl}\nTracking URL: \`${createdAccount.trackingUrl}\``
    : "";

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Create Link</h1>
              <p className="text-sm text-slate-400">Launch a new branded tracking link</p>
            </div>
          </div>
          <Link
            href="/admin/links"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-slate-800 self-start sm:self-center"
          >
            Cancel
          </Link>
        </div>

        {/* Main Grid */}
        <div className={createdAccount ? "grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_0.7fr] items-start" : "grid grid-cols-1 gap-6 items-start"}>
          {/* Form Card */}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-[0_12px_30px_rgba(2,6,23,0.45)] sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="rounded-md bg-indigo-500/10 p-1.5 ring-1 ring-indigo-400/20">
                <Rocket className="h-4 w-4 text-indigo-300" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                Campaign Builder
              </span>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-xl border border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 to-emerald-400/5 px-4 py-3 text-sm text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{success}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter Account Holder Name"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner shadow-slate-950/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Custom Domain</label>
                <select
                  value={customDomainId}
                  onChange={(e) => setCustomDomainId(e.target.value)}
                  disabled={loading || selectableDomains.length === 0}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-sm text-white shadow-inner shadow-slate-950/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
                >
                  <option value="">Select a domain</option>
                  {selectableDomains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.domain}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Active offers</label>
                <select
                  value={offerGroupName}
                  onChange={(e) => setOfferGroupName(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-sm font-medium text-slate-300 shadow-inner shadow-slate-950/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="" className="text-slate-400">Select an offer</option>
                  {offerGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(99,102,241,0.32)] transition-all hover:from-indigo-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Create Link Account
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sidebar / Result */}
          {createdAccount && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
              <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.6)] sm:p-6">
                <button
                  type="button"
                  onClick={() => setCreatedAccount(null)}
                  aria-label="Close result panel"
                  className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="space-y-5 pr-8 text-sm">
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                      Public analytics link
                    </div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/45 p-3">
                      <a
                        href={createdAccount.publicStatsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block break-all text-xs font-medium leading-5 text-sky-200 underline decoration-sky-400/70 underline-offset-2 sm:text-[13px]"
                      >
                        {createdAccount.publicStatsUrl}
                      </a>
                      <p className="mt-2.5 text-xs leading-5 text-slate-300">
                        Share this public analytics link with your team to monitor clicks and campaign performance.
                      </p>
                      <div className="mt-3 flex justify-end">
                        <ResultCopyButton text={createdAccount.publicStatsUrl} label="Copy link" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200">
                      Tracking URL
                    </div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/45 p-3">
                      <div className="flex flex-col gap-2.5">
                        <a
                          href={createdAccount.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block break-all text-xs font-medium leading-5 text-sky-200 underline decoration-sky-400/70 underline-offset-2 sm:text-[13px]"
                        >
                          {createdAccount.trackingUrl}
                        </a>
                        <ResultCopyButton text={createdAccount.trackingUrl} label="Copy URL" />
                        <p className="text-xs leading-5 text-slate-300">
                          Copy this tracking link, create a landing page in the Landing Builder, and share it on social media to start earning.
                        </p>
                        <a
                          href="/admin/landing-builder"
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:border-cyan-200/55 hover:bg-cyan-400/20"
                        >
                          <span>Go to Landing Builder</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}