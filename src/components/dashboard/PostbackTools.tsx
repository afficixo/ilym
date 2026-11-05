"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Copy, Database, MessageCircle, RefreshCw, Search, Trash2, Webhook, XCircle } from "lucide-react";

interface PostbackConfig {
  id: string;
  provider: "AFFMINE" | "ADBLUMEDIA";
  label: string;
  token: string;
  isActive: boolean;
}

interface ConversionLead {
  id: string;
  payout: number | null;
  sub1: string | null;
  sub2: string | null;
  sub3: string | null;
  sub4: string | null;
  createdAt: string;
  postback: { provider: string };
}

function getPostbackTemplate(origin: string, config: PostbackConfig) {
  const receiverUrl = `${origin}/api/postback?secret=${config.token}`;
  return config.provider === "AFFMINE"
    ? `${receiverUrl}&payout=#payout#&subid1=#s1#&subid2=#s2#&subid3=#s3#&subid4=#s4#`
    : `${receiverUrl}&payout={payout}&s1={s1}&s2={s2}&s3={s3}&s4={s4}`;
}

export default function PostbackTools() {
  const router = useRouter();
  const [configs, setConfigs] = useState<PostbackConfig[]>([]);
  const [leads, setLeads] = useState<ConversionLead[]>([]);
  const [totalPayout, setTotalPayout] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [telegramChannelId, setTelegramChannelId] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [telegramSubmitting, setTelegramSubmitting] = useState(false);
  const [showTelegramSettings, setShowTelegramSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/postbacks", { credentials: "include" });
      if (response.status === 403) {
        router.replace("/admin/dashboard");
        return;
      }
      if (!response.ok) throw new Error("Unable to load postback data");
      const data = await response.json();
      setConfigs(data.configs || []);
      setLeads(data.leads || []);
      setTotalPayout(Number(data.totalPayout) || 0);
      setTelegramChannelId(data.telegram?.channelId || "");
      setTelegramConfigured(Boolean(data.telegram));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load postback data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const saveTelegram = async () => {
    setTelegramSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/postbacks", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channelId: telegramChannelId, botToken: telegramBotToken }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to save Telegram settings");
      setTelegramConfigured(true);
      setTelegramBotToken("");
      setMessage("Telegram settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save Telegram settings");
    } finally {
      setTelegramSubmitting(false);
    }
  };

  const testTelegram = async () => {
    setTelegramSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/postbacks", { method: "PATCH", credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to send Telegram test message");
      setMessage(data.message || "Test message sent to Telegram.");
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Unable to send Telegram test message");
    } finally {
      setTelegramSubmitting(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const createPostback = async (provider: "AFFMINE" | "ADBLUMEDIA") => {
    setSubmitting(provider);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/postbacks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create postback");
      setConfigs((current) => [...current.filter((item) => item.provider !== provider), data.config]);
      setMessage(`${data.config.label} postback is ready.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create postback");
    } finally {
      setSubmitting(null);
    }
  };

  const copyPostbackUrl = async (token: string) => {
    const config = configs.find((item) => item.token === token);
    if (!config) return;
    await navigator.clipboard.writeText(getPostbackTemplate(window.location.origin, config));
    setMessage("Postback URL copied to clipboard.");
  };

  const resetLeadData = async () => {
    setShowResetConfirm(false);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/postbacks", { method: "DELETE", credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to reset conversion data");
      setLeads([]);
      setTotalPayout(0);
      setMessage(`${data.deleted || 0} conversion records deleted.`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to reset conversion data");
    }
  };

  const deleteLead = async (leadId: string) => {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/postbacks", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to delete conversion data");

      const nextLeads = leads.filter((lead) => lead.id !== leadId);
      setLeads(nextLeads);
      setTotalPayout(nextLeads.reduce((sum, lead) => sum + (lead.payout ?? 0), 0));
      setMessage(`${data.deleted || 1} conversion record deleted.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete conversion data");
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [
      lead.postback.provider,
      lead.payout?.toFixed(2),
      lead.sub1,
      lead.sub2,
      lead.sub3,
      lead.sub4,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  return (
    <div className="postback-tools w-full space-y-6 pb-8 md:space-y-8">
      {(message || error) && (
        <div className={`postback-alert ${error ? "is-error" : "is-success"}`}>
          {error ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {error || message}
        </div>
      )}

      <section className="postback-section postback-telegram">
        <button
          type="button"
          aria-expanded={showTelegramSettings}
          onClick={() => setShowTelegramSettings((current) => !current)}
          className="postback-accordion-trigger"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="postback-heading-icon is-small"><MessageCircle className="h-4 w-4" /></span>
            <span className="min-w-0 text-left">
              <span className="postback-section-title block">Telegram notifications</span>
              <span className="postback-muted mt-0.5 block text-sm">Configure alerts for pending manager signups and incoming conversions.</span>
            </span>
          </span>
          <ChevronDown className={`postback-chevron h-4 w-4 transition-transform ${showTelegramSettings ? "rotate-180" : ""}`} />
        </button>
        {showTelegramSettings && (
          <div className="postback-telegram-body">
            <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
              <label className="postback-label">
                Channel ID
                <input value={telegramChannelId} onChange={(event) => setTelegramChannelId(event.target.value)} className="postback-input mt-1.5 w-full" />
              </label>
              <label className="postback-label">
                Bot API token
                <input type="password" value={telegramBotToken} onChange={(event) => setTelegramBotToken(event.target.value)} className="postback-input mt-1.5 w-full" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={saveTelegram} disabled={telegramSubmitting || !telegramChannelId || !telegramBotToken} className="postback-primary-button">
                Save Telegram
              </button>
              {telegramConfigured && (
                <button type="button" onClick={testTelegram} disabled={telegramSubmitting} className="postback-secondary-button">
                  Send test message
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="postback-section">
        <div className="postback-endpoint-grid">
          {(["AFFMINE", "ADBLUMEDIA"] as const).map((provider) => {
            const config = configs.find((item) => item.provider === provider);
            const providerName = provider === "AFFMINE" ? "Affmine" : "AdBluMedia";
            const previewUrl = config && typeof window !== "undefined"
              ? getPostbackTemplate(window.location.origin, config).replace(config.token, "••••••••")
              : null;
            return (
              <article key={provider} className="postback-endpoint-card">
                <div className="postback-endpoint-top">
                  <h3 className="postback-endpoint-name">{providerName}</h3>
                </div>
                {config && previewUrl ? (
                  <div className="postback-url-row">
                    <p className="postback-url" aria-label={`${providerName} receiver URL. Secret is hidden.`}>{previewUrl}</p>
                    <button
                      type="button"
                      title="Copy receiver URL"
                      onClick={() => copyPostbackUrl(config.token)}
                      className="postback-secondary-button"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy URL
                    </button>
                  </div>
                ) : (
                  <div className="postback-endpoint-empty">
                    <p className="postback-muted text-sm">Create a receiver URL to start tracking conversions.</p>
                    <button
                      type="button"
                      onClick={() => createPostback(provider)}
                      disabled={submitting === provider}
                      className="postback-primary-button"
                    >
                      <Webhook className="h-4 w-4" />
                      {submitting === provider ? "Creating..." : "Create URL"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="postback-report">
        <div className="postback-report-heading">
          <div className="flex min-w-0 items-center gap-3">
            <span className="postback-heading-icon is-small is-success"><Database className="h-4 w-4" /></span>
            <div>
              <h2 className="postback-section-title">Conversion report</h2>
              <p className="postback-muted mt-0.5 text-sm" aria-live="polite">
                {searchQuery.trim()
                  ? `Showing ${filteredLeads.length} of ${leads.length} conversions`
                  : `${leads.length} ${leads.length === 1 ? "conversion" : "conversions"} received`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showResetConfirm && (
              <div className="postback-reset-confirm">
                <span>Delete all report data?</span>
                <button type="button" onClick={() => setShowResetConfirm(false)} className="postback-text-button">Cancel</button>
                <button type="button" onClick={resetLeadData} className="postback-reset-confirm-action">Reset</button>
              </div>
            )}
            <button
              type="button"
              title="Reset conversion data"
              aria-label="Reset conversion data"
              onClick={() => setShowResetConfirm(true)}
              className="postback-secondary-button"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="postback-report-toolbar">
          <label className="postback-search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-label="Search conversions" placeholder="Search network, payout, or SubID" className="postback-input w-full pl-9" />
          </label>
          <div className="postback-payout">
            <p className="postback-muted text-xs">Total payout</p>
            <p className="postback-payout-value">${totalPayout.toFixed(2)}</p>
          </div>
        </div>
        {loading ? (
          <p className="postback-empty">Loading payout and SubID data...</p>
        ) : leads.length === 0 ? (
          <p className="postback-empty">No conversions received yet.</p>
        ) : filteredLeads.length === 0 ? (
          <p className="postback-empty">No matching conversions.</p>
        ) : (
          <div className="postback-table-wrap">
            <table className="postback-table">
              <caption className="sr-only">Conversion payouts and SubID values</caption>
              <thead>
                <tr>
                  <th scope="col">Network</th>
                  <th scope="col" className="postback-number-column">Payout</th>
                  <th scope="col">SubID 1</th>
                  <th scope="col">SubID 2</th>
                  <th scope="col">SubID 3</th>
                  <th scope="col">SubID 4</th>
                  <th scope="col">Received</th>
                  <th scope="col" className="postback-action-column">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td><span className="postback-network">{lead.postback.provider === "AFFMINE" ? "Affmine" : "AdBluMedia"}</span></td>
                    <td className="postback-payout-cell postback-number-column">{`$${(lead.payout || 0).toFixed(2)}`}</td>
                    <td className={lead.sub1 ? "postback-subid" : "postback-subid is-empty"}>{lead.sub1 || "—"}</td>
                    <td className={lead.sub2 ? "postback-subid" : "postback-subid is-empty"}>{lead.sub2 || "—"}</td>
                    <td className={lead.sub3 ? "postback-subid" : "postback-subid is-empty"}>{lead.sub3 || "—"}</td>
                    <td className={lead.sub4 ? "postback-subid" : "postback-subid is-empty"}>{lead.sub4 || "—"}</td>
                    <td className="postback-date">{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td className="postback-action-column">
                      <button
                        type="button"
                        onClick={() => deleteLead(lead.id)}
                        className="postback-row-delete"
                        aria-label={`Delete ${lead.postback.provider === "AFFMINE" ? "Affmine" : "AdBluMedia"} conversion`}
                        title="Delete conversion"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
