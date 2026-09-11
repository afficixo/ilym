"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Globe,
  Layers,
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

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Create links <span className="text-indigo-400">in bulk</span>
              </h1>
              <p className="text-sm text-slate-400">Generate a numbered set of link accounts from one configuration.</p>
            </div>
          </div>
          <Link
            href="/admin/links"
            className="self-start rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 sm:self-center"
          >
            Cancel
          </Link>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          {/* Form Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-start gap-3 border-b border-slate-800 pb-4">
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2">
                <Rocket className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Batch setup</h2>
                <p className="mt-0.5 text-xs text-slate-500">Set the naming range and optional routing overrides.</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Account Name Base</label>
                <input
                  type="text"
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value.replace(/\s+/g, ""))}
                  placeholder="e.g., MR"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Start</label>
                  <input
                    type="number"
                    value={startNumber}
                    onChange={(e) => setStartNumber(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="1"
                    required
                    disabled={loading}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">End</label>
                  <input
                    type="number"
                    value={endNumber}
                    onChange={(e) => setEndNumber(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="10"
                    required
                    disabled={loading}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Custom Domain</label>
                <select
                  value={customDomainId}
                  onChange={(e) => setCustomDomainId(e.target.value)}
                  disabled={loading || selectableDomains.length === 0}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-emerald-300">Batch complete</h2>
                </div>
                <CopyButton text={createdTemplate} onCopy={() => {}} />
              </div>

              <div className="space-y-3 pt-4 max-h-[560px] overflow-y-auto">
                {createdLinks.map((link, index) => (
                  <div
                    key={`${link.accountName}-${index}`}
                    className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-white">{link.accountName}</div>
                        <div className="text-xs text-slate-500">/{link.slug}</div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2 text-xs">
                      <div>
                        <div className="text-slate-500 mb-1">Tracking URL</div>
                        <div className="rounded-md bg-slate-800 px-2 py-1.5 font-mono text-[11px] text-slate-300 break-all">
                          {link.trackingUrl}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1">Public Stats</div>
                        <div className="rounded-md bg-slate-800 px-2 py-1.5 font-mono text-[11px] text-slate-300 break-all">
                          {link.publicStatsUrl}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-6 text-center">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="mb-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
                  <Rocket className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-300">Your batch will appear here</p>
                <p className="mt-1 max-w-xs text-xs text-slate-500">Configure the setup and create your first set of links.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}