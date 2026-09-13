"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  Link2,
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
  const [customSlugEnabled, setCustomSlugEnabled] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (customSlugEnabled && !customSlug.trim()) {
      setError("Enter a custom slug or turn off the custom slug option.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName,
          customSlug: customSlugEnabled ? customSlug : null,
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
      setCustomSlug("");
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
    <div className="campaign-builder-page min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Main Grid */}
        <div className={createdAccount ? "grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_0.7fr] items-start" : "grid grid-cols-1 gap-6 items-start"}>
          {/* Form Card */}
          <div className="campaign-builder-card rounded-2xl p-5 sm:p-7">
            <div className="mb-7 border-b border-slate-700/60 pb-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="campaign-builder-icon rounded-md p-1.5">
                    <Rocket className="h-4 w-4" />
                  </div>
                  <span className="campaign-builder-kicker text-[11px] font-semibold uppercase tracking-[0.16em]">
                    Campaign setup
                  </span>
                </div>
                <h2 className="campaign-builder-title text-lg font-semibold tracking-tight">Create link account</h2>
                <p className="campaign-builder-muted mt-1 text-sm">Set the identity and routing options for this campaign.</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="campaign-builder-success mb-4 rounded-xl border border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 to-emerald-400/5 px-4 py-3 text-sm text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="campaign-builder-success-icon mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{success}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="campaign-builder-field">
                <label className="campaign-builder-label mb-2 block text-xs font-semibold">Account name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter account name"
                  aria-label="Account name"
                  required
                  disabled={loading}
                  className="campaign-builder-input w-full rounded-lg px-3.5 py-3 text-sm transition focus:outline-none focus:ring-2"
                />
              </div>

              <div className="campaign-builder-slug-setting campaign-builder-slug-setting-form">
                <div>
                  <div className="campaign-builder-slug-setting-label">
                    <span className="campaign-builder-slug-setting-icon" aria-hidden="true"><Link2 className="h-3 w-3" /></span>
                    <span>Custom slug</span>
                  </div>
                  <div className="campaign-builder-slug-setting-help">
                    {customSlugEnabled ? "Using your own tracking path" : "If off, your slug will be generated automatically"}
                  </div>
                </div>
                <div className="campaign-builder-slug-setting-control">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={customSlugEnabled}
                    aria-controls="custom-slug-field"
                    aria-label="Use custom slug"
                    onClick={() => setCustomSlugEnabled((enabled) => !enabled)}
                    disabled={loading}
                    className={`campaign-builder-slug-toggle transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-60 ${customSlugEnabled ? "is-active" : ""}`}
                  >
                    <span className="campaign-builder-slug-toggle-track" aria-hidden="true">
                      <span className="campaign-builder-slug-toggle-thumb" />
                    </span>
                  </button>
                </div>
              </div>

              <div
                id="custom-slug-field"
                aria-hidden={!customSlugEnabled}
                className={`campaign-builder-custom-slug campaign-builder-field ${customSlugEnabled ? "is-open" : ""}`}
              >
                  <label className="campaign-builder-label mb-2 block text-xs font-semibold">
                    Custom slug <span className="campaign-builder-muted font-normal">(required)</span>
                  </label>
                  <div className="relative">
                    <span className="campaign-builder-slug-prefix" aria-hidden="true">/</span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.replace(/[^A-Za-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 64))}
                      placeholder="Enter custom slug"
                      required={customSlugEnabled}
                      disabled={!customSlugEnabled || loading}
                      className="campaign-builder-input w-full rounded-lg py-3 pl-8 pr-3.5 text-sm transition focus:outline-none focus:ring-2"
                      aria-describedby="custom-slug-help"
                    />
                  </div>
                  <p id="custom-slug-help" className="campaign-builder-muted mt-1.5 text-xs">
                    Use letters, numbers, and hyphens. This becomes your tracking URL slug.
                  </p>
              </div>

              <div className="campaign-builder-field">
                <label className="campaign-builder-label mb-2 block text-xs font-semibold">Custom domain</label>
                <select
                  value={customDomainId}
                  onChange={(e) => setCustomDomainId(e.target.value)}
                  disabled={loading || selectableDomains.length === 0}
                  className="campaign-builder-input w-full rounded-lg px-3.5 py-3 text-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Select a domain</option>
                  {selectableDomains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.domain}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campaign-builder-field">
                <label className="campaign-builder-label mb-2 block text-xs font-semibold">Offer group</label>
                <select
                  value={offerGroupName}
                  onChange={(e) => setOfferGroupName(e.target.value)}
                  disabled={loading}
                  className="campaign-builder-input w-full rounded-lg px-3.5 py-3 text-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="campaign-builder-submit inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60"
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
            <div
              className="link-result-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="link-result-title"
              onClick={() => setCreatedAccount(null)}
            >
              <div
                className="link-result-modal-panel relative w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.6)] sm:p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setCreatedAccount(null)}
                  aria-label="Close result panel"
                  className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition-all hover:rotate-90 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="space-y-5 pr-8 text-sm">
                  <div className="link-result-modal-header flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.14)]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Link ready</p>
                      <h2 id="link-result-title" className="mt-1 text-lg font-semibold tracking-tight text-white">Your campaign is live</h2>
                      <p className="mt-1 text-xs leading-5 text-slate-300">Use either link below to share or monitor this campaign.</p>
                    </div>
                  </div>

                  <div className="link-result-modal-section">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                      Public analytics link
                    </div>
                    <div className="link-result-modal-card rounded-xl border border-slate-700/70 bg-slate-950/45 p-3">
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

                  <div className="link-result-modal-section">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200">
                      Tracking URL
                    </div>
                    <div className="link-result-modal-card rounded-xl border border-slate-700/70 bg-slate-950/45 p-3">
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
                          className="link-result-builder-link group relative inline-flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                        >
                          <span>Go to Landing Builder</span>
                          <ArrowRight className="link-result-builder-arrow h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
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