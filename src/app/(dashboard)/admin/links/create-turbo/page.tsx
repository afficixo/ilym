"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Rocket,
} from "lucide-react";
import { buildOfferGroupList } from "@/lib/utils/offer-groups";
import { coerceArray } from "@/lib/utils/array-response";

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  isActive: boolean;
}

interface CreatedTurboLink {
  accountName: string;
  slug: string;
  trackingUrl: string;
  publicStatsUrl: string;
}

export default function CreateLinkTurboPage() {
  const router = useRouter();
  const [baseName, setBaseName] = useState("");
  const [startNumber, setStartNumber] = useState("1");
  const [endNumber, setEndNumber] = useState("10");
  const [customDomainId, setCustomDomainId] = useState("");
  const [offerGroupName, setOfferGroupName] = useState("");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [offerGroups, setOfferGroups] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdLinks, setCreatedLinks] = useState<CreatedTurboLink[]>([]);
  const [copyAllLabel, setCopyAllLabel] = useState("Copy all");
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const copyText = useCallback(async (text: string) => {
    if (!text) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch (error) {
      console.error("Failed to copy text:", error);
      return false;
    }
  }, []);

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
      setOfferGroups(buildOfferGroupList(data));
    } catch (error) {
      console.error("Failed to fetch offer groups:", error);
    }
  }, [router]);

  useEffect(() => {
    void fetchDomains();
    void fetchOfferGroups();
  }, [fetchDomains, fetchOfferGroups]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/admin/links");
  };

  const selectableDomains = domains.filter((domain) => domain.verified && domain.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreatedLinks([]);
    setLoading(true);

    const start = Number(startNumber);
    const end = Number(endNumber);

    if (!baseName.trim()) {
      setError("Account name is required.");
      setLoading(false);
      return;
    }

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1 || start > end) {
      setError("Please enter a valid number range starting from 1, with start less than or equal to end.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/links/turbo", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseName: baseName.trim(),
          start,
          end,
          customDomainId: customDomainId || null,
          offerGroupName: offerGroupName || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create turbo links");
      }

      setCreatedLinks(data.createdLinks || []);
      setSuccess(`Created ${data.createdCount || 0} link(s) successfully.`);
      setBaseName("");
      setStartNumber("1");
      setEndNumber("10");
      setCustomDomainId("");
      setOfferGroupName("");
    } catch (err: any) {
      setError(err.message || "Failed to create turbo links");
    } finally {
      setLoading(false);
    }
  };

  const createdTemplate = createdLinks.length
    ? createdLinks
        .map((link) => `Account Name: \`${link.accountName}\`\nPublic Analytics: ${link.publicStatsUrl}\nTracking URL: \`${link.trackingUrl}\``)
        .join("\n\n")
    : "";

  const handleCopyAll = async () => {
    const copied = await copyText(createdTemplate);
    setCopyAllLabel(copied ? "Copied!" : "Copy failed");
    window.setTimeout(() => setCopyAllLabel("Copy all"), 1600);
  };

  const handleCopyValue = async (value: string, key: string) => {
    const copied = await copyText(value);
    if (!copied) return;

    setCopiedValue(key);
    window.setTimeout(() => setCopiedValue((current) => (current === key ? null : current)), 1600);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Create links <span className="text-indigo-600">in bulk</span>
              </h1>
              <p className="text-sm text-slate-600">Generate a numbered set of link accounts from one configuration.</p>
            </div>
          </div>
          <Link
            href="/admin/links"
            className="self-start rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 sm:self-center"
          >
            Cancel
          </Link>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          {/* Form Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-start gap-3 border-b border-slate-200 pb-4">
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2">
                <Rocket className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Batch setup</h2>
                <p className="mt-0.5 text-xs text-slate-600">Set the naming range and optional routing overrides.</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Account Name Base</label>
                <input
                  type="text"
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value.replace(/\s+/g, ""))}
                  placeholder="e.g., MR"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">Start</label>
                  <input
                    type="number"
                    value={startNumber}
                    onChange={(e) => setStartNumber(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="1"
                    required
                    disabled={loading}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700">End</label>
                  <input
                    type="number"
                    value={endNumber}
                    onChange={(e) => setEndNumber(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="10"
                    required
                    disabled={loading}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Custom Domain</label>
                <select
                  value={customDomainId}
                  onChange={(e) => setCustomDomainId(e.target.value)}
                  disabled={loading || selectableDomains.length === 0}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
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
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Active offers</label>
                <select
                  value={offerGroupName}
                  onChange={(e) => setOfferGroupName(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select an offer</option>
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating accounts…
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Create Batch
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sidebar / Results */}
          {createdLinks.length > 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3 border-b border-emerald-200 pb-4">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 rounded-lg border border-emerald-200 bg-white p-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-emerald-700">Batch complete</h2>
                    <p className="mt-0.5 text-xs text-slate-600">{createdLinks.length} link accounts are ready to use.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyAll()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                  aria-label="Copy all created links"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copyAllLabel}</span>
                </button>
              </div>

              <div className="space-y-3 pt-4 max-h-[560px] overflow-y-auto">
                {createdLinks.map((link, index) => (
                  <div
                    key={`${link.accountName}-${index}`}
                    className="rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">{link.accountName}</div>
                    </div>
                    <div className="mt-2 space-y-2 text-xs">
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2 text-slate-600"><span>Tracking URL</span><button type="button" onClick={() => void handleCopyValue(link.trackingUrl, `tracking-${link.accountName}`)} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-all duration-200 active:scale-95 ${copiedValue === `tracking-${link.accountName}` ? "border-emerald-300 bg-emerald-600 text-white shadow-sm" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"}`} aria-label={`Copy tracking URL for ${link.accountName}`} title="Copy tracking URL">{copiedValue === `tracking-${link.accountName}` ? "Copied" : "Copy"}</button></div>
                        <a href={link.trackingUrl} target="_blank" rel="noreferrer" className="block rounded-md bg-slate-100 px-2 py-1.5 font-mono text-[11px] leading-4 text-slate-700 break-all transition hover:bg-slate-200 hover:text-slate-900">{link.trackingUrl}</a>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2 text-slate-600"><span>Public Stats</span><button type="button" onClick={() => void handleCopyValue(link.publicStatsUrl, `stats-${link.accountName}`)} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-all duration-200 active:scale-95 ${copiedValue === `stats-${link.accountName}` ? "border-indigo-300 bg-indigo-600 text-white shadow-sm" : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100"}`} aria-label={`Copy public stats for ${link.accountName}`} title="Copy public stats URL">{copiedValue === `stats-${link.accountName}` ? "Copied" : "Copy"}</button></div>
                        <a href={link.publicStatsUrl} target="_blank" rel="noreferrer" className="block rounded-md bg-slate-100 px-2 py-1.5 font-mono text-[11px] leading-4 text-slate-700 break-all transition hover:bg-slate-200 hover:text-slate-900">{link.publicStatsUrl}</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <Rocket className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">Your batch will appear here</p>
                <p className="mt-1 max-w-xs text-xs text-slate-500">Configure the setup and create your first set of links.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}