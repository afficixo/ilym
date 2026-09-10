"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, CheckCircle, ChevronDown, CircleDollarSign, Copy, CreditCard, Eye, EyeOff, Info, Pencil, Search, WalletCards, X } from "lucide-react";
import { coerceArray } from "@/lib/utils/array-response";
import { calculatePendingAmount } from "@/lib/utils/payment-pending";

interface PaymentLink {
  id: string;
  userId: string;
  accountName: string;
  slug: string;
  isActive: boolean;
  totalEarning: number;
  qualifiedClicks: number;
  commissionRate?: number;
  payoutMethod: string | null;
  payoutAccount: string | null;
  selectedInvoiceNumber?: string;
  selectedManagerId?: string;
  invoiceHistory?: Array<{
    invoiceNumber: string;
    totalEarning: number;
    isPaid: boolean;
    createdAt: string;
    paidAt: string | null;
  }>;
}

interface ManagerPayment {
  id: string;
  username: string;
  fullName: string | null;
  status: string;
  payoutMethod: string | null;
  payoutAccount: string | null;
  bkashNumber: string | null;
  commissionRate: number;
  managerPayouts: Array<{
    payoutNumber: string;
    totalEarning: number;
    payoutMethod: string | null;
    paymentReference: string | null;
    isPaid: boolean;
    paidAt: string | null;
    createdAt: string;
  }>;
  linkAccounts: Array<{
    id: string;
    accountName: string;
    payoutMethod: string | null;
    payoutAccount: string | null;
    invoices: Array<{
      invoiceNumber: string;
      totalEarning: number;
      isPaid: boolean;
      paidAt: string | null;
      payoutMethod: string | null;
      payoutAccount: string | null;
      managerPayouts: Array<{ payoutId: string }>;
    }>;
  }>;
}

const money = (value: number) => `$${value.toFixed(2)}`;

export default function PaymentsPage() {
  const router = useRouter();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unpaid">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingLinkId, setPayingLinkId] = useState<string | null>(null);
  const [copiedPaymentAccount, setCopiedPaymentAccount] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [showPayoutTransactions, setShowPayoutTransactions] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("BKASH");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [paymentPassword, setPaymentPassword] = useState("");
  const [showPaymentPassword, setShowPaymentPassword] = useState(false);
  const [isEditingPaymentMethod, setIsEditingPaymentMethod] = useState(false);
  const [bindingMessage, setBindingMessage] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [managerPayments, setManagerPayments] = useState<ManagerPayment[]>([]);
  const [showManagerPayments, setShowManagerPayments] = useState(false);
  const [managerPaymentsError, setManagerPaymentsError] = useState("");

  const fetchPayments = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/links", { credentials: "include" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) throw new Error("Unable to load payment data");
      setLinks(coerceArray<PaymentLink>(await response.json()));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load payment data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const fetchManagerPayments = useCallback(async () => {
    try {
      const response = await fetch("/api/owner/managers", { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load manager payment data");
      const data = await response.json();
      setManagerPayments(data.managers || []);
      setManagerPaymentsError("");
    } catch (managerError) {
      setManagerPayments([]);
      setManagerPaymentsError(managerError instanceof Error ? managerError.message : "Unable to load manager payment data");
    }
  }, []);

  useEffect(() => {
    const loadAccountData = async () => {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (!response.ok) return;
      const data = await response.json();
      setUserRole(data.role || null);
      setPayoutMethod(data.payoutMethod || "BKASH");
      setPayoutAccount(data.payoutAccount || "");

      if (data.role === "OWNER") {
        await fetchManagerPayments();
      }
    };

    void loadAccountData();
  }, [fetchManagerPayments]);

  const handlePaymentBindingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBindingMessage("");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-payment-binding", payoutMethod, payoutAccount, paymentPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to save payment binding");
      setPaymentPassword("");
      setIsEditingPaymentMethod(false);
      setBindingMessage(data.message || "Payment method saved successfully.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to save payment binding");
    }
  };

  const markInvoicePaid = async (linkId: string, reference: string) => {
    setPayingLinkId(linkId);
    setError("");
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-paid", paymentReference: reference, invoiceNumber: paymentLink?.selectedInvoiceNumber }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to mark invoice as paid");
      const paidAt = new Date().toISOString();
      const selectedInvoiceNumber = paymentLink?.selectedInvoiceNumber || data?.invoiceNumber;
      setLinks((currentLinks) => currentLinks.map((link) => ({
        ...link,
        invoiceHistory: link.invoiceHistory?.map((invoice) => invoice.invoiceNumber === selectedInvoiceNumber
          ? { ...invoice, isPaid: true, paidAt }
          : invoice),
      })));
      setManagerPayments((currentManagers) => currentManagers.map((manager) => ({
        ...manager,
        linkAccounts: manager.linkAccounts.map((account) => ({
          ...account,
          invoices: account.invoices.map((invoice) => invoice.invoiceNumber === selectedInvoiceNumber
            ? { ...invoice, isPaid: true, paidAt }
            : invoice),
        })),
      })));
      await fetchPayments();
      if (userRole === "OWNER") await fetchManagerPayments();
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to mark invoice as paid");
      return false;
    } finally {
      setPayingLinkId(null);
    }
  };

  const recordManagerPayout = async (managerId: string, reference: string) => {
    setPayingLinkId(managerId);
    setError("");
    try {
      const response = await fetch(`/api/owner/managers/${managerId}/payout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentReference: reference }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to record manager payout");
      await fetchManagerPayments();
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to record manager payout");
      return false;
    } finally {
      setPayingLinkId(null);
    }
  };

  const submitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentLink || !paymentReference.trim()) return;
    const success = paymentLink.selectedManagerId
      ? await recordManagerPayout(paymentLink.selectedManagerId, paymentReference.trim())
      : await markInvoicePaid(paymentLink.id, paymentReference.trim());
    if (success) {
      setPaymentLink(null);
      setPaymentReference("");
    }
  };

  const copyPaymentAccount = async (linkId: string, account: string) => {
    try {
      await navigator.clipboard.writeText(account);
      setCopiedPaymentAccount(linkId);
      window.setTimeout(() => setCopiedPaymentAccount(null), 1600);
    } catch {
      setError("Unable to copy payment account");
    }
  };

  const activeLinks = useMemo(() => links.filter((link) => link.isActive), [links]);

  const paymentRows = useMemo(() => activeLinks
      .map((link) => {
        const invoices = link.invoiceHistory || [];
        const unpaid = invoices.filter((invoice) => !invoice.isPaid);
        const paid = invoices.filter((invoice) => invoice.isPaid);
        const current = Number(link.totalEarning) || 0;
        const unpaidInvoiceTotal = unpaid.reduce((sum, invoice) => sum + (Number(invoice.totalEarning) || 0), 0);
        const paidInvoiceTotal = paid.reduce((sum, invoice) => sum + (Number(invoice.totalEarning) || 0), 0);
        const invoiceTotal = unpaidInvoiceTotal;
        const commissionRate = Number(link.commissionRate ?? 20) || 20;
        const unpaidAmount = unpaidInvoiceTotal;
        const pendingTotal = calculatePendingAmount(unpaid, commissionRate);
        const paidAmount = paidInvoiceTotal;
        const accrued = unpaidAmount + paidAmount + current;
        const revenue = current + (current * (commissionRate / 100));
        return { link, invoices, current, unpaidAmount, paidAmount, invoiceTotal, pendingTotal, accrued, revenue, commission: current * (commissionRate / 100) };
      }), [activeLinks]);

  const hasUnpaidInvoices = (invoices: Array<{ isPaid?: boolean | null }> = []) => invoices.some((invoice) => !invoice.isPaid);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return paymentRows.filter(({ link, invoices }) => {
      const matchesQuery = !normalizedQuery || `${link.accountName} ${link.slug}`.toLowerCase().includes(normalizedQuery);
      const relevantInvoices = link.invoiceHistory?.length ? link.invoiceHistory : invoices;
      const matchesFilter = filter === "all" || hasUnpaidInvoices(relevantInvoices);
      return matchesQuery && matchesFilter;
    }).sort((first, second) => second.accrued - first.accrued);
  }, [filter, paymentRows, query]);

  const totals = useMemo(() => paymentRows.reduce(
    (summary, row) => ({
      accrued: summary.accrued + row.accrued,
      current: summary.current + row.current,
      invoices: summary.invoices + row.pendingTotal,
      unpaid: summary.unpaid + row.unpaidAmount,
      paid: summary.paid + row.paidAmount,
      commission: summary.commission + row.commission,
    }),
    { accrued: 0, current: 0, invoices: 0, unpaid: 0, paid: 0, commission: 0 },
  ), [paymentRows]);

  const commission = totals.commission;
  const managerRevenueByUserId = paymentRows.reduce((revenueByUserId, row) => {
    revenueByUserId.set(row.link.userId, (revenueByUserId.get(row.link.userId) || 0) + row.revenue);
    return revenueByUserId;
  }, new Map<string, number>());

  const managerPaymentRows = managerPayments.map((manager) => {
    const invoices = manager.linkAccounts.flatMap((link) => link.invoices);
    const commissionRate = Number(manager.commissionRate ?? 20) || 0;
    const paid = manager.managerPayouts.filter((payout) => payout.isPaid).reduce((sum, payout) => sum + Number(payout.totalEarning || 0), 0);
    const pendingInvoices = invoices.filter((invoice) => !invoice.isPaid && invoice.managerPayouts.length === 0);
    const pending = calculatePendingAmount(pendingInvoices, commissionRate);
    const revenue = managerRevenueByUserId.get(manager.id) || 0;
    const firstLink = manager.linkAccounts.find((link) => link.payoutAccount || link.payoutMethod);
    const nextUnpaidInvoice = manager.linkAccounts
      .flatMap((link) => link.invoices.filter((invoice) => !invoice.isPaid && invoice.managerPayouts.length === 0).map((invoice) => ({ invoice, link })))
      .sort((firstInvoice, secondInvoice) => firstInvoice.invoice.invoiceNumber.localeCompare(secondInvoice.invoice.invoiceNumber))[0];
    return {
      manager,
      invoiceCount: invoices.length,
      paid,
      total: revenue,
      pending,
      commissionRate,
      payoutMethod: manager.payoutMethod || firstLink?.payoutMethod || (manager.bkashNumber ? "BKASH" : null),
      payoutAccount: manager.payoutAccount || firstLink?.payoutAccount || manager.bkashNumber,
      nextUnpaidInvoice,
    };
  });
  const pendingSummary = userRole === "OWNER"
    ? managerPaymentRows.reduce((sum, row) => sum + row.pending, 0)
    : totals.invoices;
  const paidOutSummary = userRole === "OWNER"
    ? managerPaymentRows.reduce((sum, row) => sum + row.paid, 0)
    : totals.paid;
  const managerCommissionRates = [...new Set(paymentRows.map((row) => Number(row.link.commissionRate ?? 20)).filter((rate) => Number.isFinite(rate)))];
  const displayedCommissionRates = managerCommissionRates.length > 0 ? managerCommissionRates : [20];
  const payoutTransactions = managerPayments.flatMap((manager) => manager.managerPayouts
    .filter((payout) => payout.isPaid)
    .map((payout) => ({ manager, payout })))
    .sort((first, second) => new Date(second.payout.paidAt || second.payout.createdAt).getTime() - new Date(first.payout.paidAt || first.payout.createdAt).getTime());

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Image
            src="/afficixo-logo.png"
            alt="Afficixo"
            width={150}
            height={40}
            className="h-10 w-auto object-contain object-left"
            priority
          />
        </div>
      </div>

      {bindingMessage && <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">{bindingMessage}</p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Total Earned", value: totals.current, icon: WalletCards, tone: "text-cyan-300", accent: "border-cyan-400/20 bg-cyan-400/[0.07]" },
          { label: "Commission", value: commission, icon: CircleDollarSign, tone: "text-orange-300", accent: "border-orange-400/20 bg-orange-400/[0.07]" },
          { label: "Pending", value: pendingSummary, icon: CreditCard, tone: "text-violet-300", accent: "border-violet-400/20 bg-violet-400/[0.07]" },
          { label: "Paid out", value: paidOutSummary, icon: CircleDollarSign, tone: "text-emerald-300", accent: "border-emerald-400/20 bg-emerald-400/[0.07]" },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={`rounded-lg border p-4 ${card.accent} ${card.label === "Paid out" && userRole === "OWNER" ? "cursor-pointer transition hover:border-emerald-400/50" : ""}`}
            role={card.label === "Paid out" && userRole === "OWNER" ? "button" : undefined}
            tabIndex={card.label === "Paid out" && userRole === "OWNER" ? 0 : undefined}
            onClick={card.label === "Paid out" && userRole === "OWNER" ? () => setShowPayoutTransactions(true) : undefined}
            onKeyDown={card.label === "Paid out" && userRole === "OWNER" ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setShowPayoutTransactions(true);
              }
            } : undefined}
            aria-label={card.label === "Paid out" && userRole === "OWNER" ? "View paid out transactions" : undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{card.label}</span>
              {card.label === "Commission" && userRole === "MANAGER" && (
                <span className="shrink-0 rounded-full border border-orange-300/30 bg-orange-300/10 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-orange-200">
                  {displayedCommissionRates.map((rate) => `${rate.toFixed(2)}%`).join(", ")}
                </span>
              )}
              <card.icon className={`h-4 w-4 ${card.tone}`} />
            </div>
            <div className={`mt-3 text-2xl font-bold ${card.tone}`}>{money(card.value)}</div>
          </motion.div>
        ))}
      </div>
      {userRole === "OWNER" ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-[var(--surface-card)] shadow-sm dark:border-white/10">
          <button
            type="button"
            onClick={() => setShowManagerPayments((current) => !current)}
            aria-expanded={showManagerPayments}
            className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                Manager payments
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-cyan-700 dark:text-cyan-300">{managerPaymentRows.length}</span>
              </span>
              <span className="mt-1 block max-w-2xl text-xs leading-5 text-slate-500">Track pending commission and permanently recorded manager payouts.</span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${showManagerPayments ? "rotate-180" : ""}`} />
          </button>
          {showManagerPayments && managerPaymentsError ? (
            <p className="border-t border-slate-200 p-6 text-sm text-rose-600 dark:border-white/10 dark:text-rose-300">{managerPaymentsError}</p>
          ) : showManagerPayments && (managerPaymentRows.length === 0 ? (
            <p className="border-t border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10">No manager accounts found.</p>
          ) : (
            <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-white/10 dark:border-white/10">
              {managerPaymentRows.map(({ manager, invoiceCount, paid, pending, total, commissionRate, payoutMethod, payoutAccount, nextUnpaidInvoice }) => (
                <div key={manager.id} className="grid gap-4 rounded-lg border border-slate-700/40 bg-slate-900/35 p-3 transition hover:border-cyan-400/25 hover:bg-white/[0.04] sm:rounded-none sm:border-0 sm:border-b sm:border-white/5 sm:bg-transparent sm:p-4 sm:hover:border-white/5 sm:hover:bg-white/[0.025] sm:grid-cols-[1.3fr_repeat(3,0.7fr)_1.4fr] sm:items-center">
                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:hidden">Manager account</p>
                    <p className="truncate text-base font-bold text-slate-900 dark:text-white sm:text-sm sm:font-semibold">{manager.fullName || manager.username}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">@{manager.username} · {invoiceCount} {invoiceCount === 1 ? "invoice" : "invoices"}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:contents">
                    <div className="rounded-md border border-slate-200 bg-white/60 p-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Revenue</p><p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{money(total)}</p><p className="mt-0.5 text-[10px] text-slate-500">{commissionRate.toFixed(2)}%</p></div>
                    <div className="rounded-md border border-emerald-200/70 bg-emerald-50/60 p-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Paid out</p><p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">{money(paid)}</p></div>
                    <div className="rounded-md border border-amber-200/70 bg-amber-50/60 p-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Pending</p><p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">{money(pending)}</p></div>
                  </div>
                  <div className="min-w-0">
                    <p className="border-t border-slate-200 pt-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:border-0 sm:pt-0">Payment details</p>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                      {payoutMethod ? (
                        <p className="break-all text-sm font-medium text-slate-900 dark:text-white sm:truncate">{`${payoutMethod === "BKASH" ? "bKash" : payoutMethod} · ${payoutAccount || "Account missing"}`}</p>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">Not set</span>
                      )}
                      {payoutAccount && <button type="button" onClick={() => void copyPaymentAccount(manager.id, payoutAccount)} className="shrink-0 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-white/10 dark:hover:text-indigo-300" aria-label={`Copy payment account for ${manager.username}`} title={copiedPaymentAccount === manager.id ? "Copied" : "Copy payment account"}>
                        {copiedPaymentAccount === manager.id ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>}
                    </div>
                    {nextUnpaidInvoice && <button type="button" onClick={() => { setPaymentLink({ id: nextUnpaidInvoice.link.id, userId: manager.id, accountName: manager.fullName || manager.username, slug: "", isActive: true, totalEarning: 0, qualifiedClicks: 0, payoutMethod, payoutAccount, selectedInvoiceNumber: nextUnpaidInvoice.invoice.invoiceNumber, selectedManagerId: manager.id }); setPaymentReference(""); }} className="mt-2 inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1.5 text-[10px] font-semibold text-white transition hover:bg-indigo-500">Mark manager paid</button>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      ) : (
      <section className="space-y-4 rounded-lg border border-slate-200 bg-[var(--surface-card)] p-4 shadow-sm dark:border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Payout details</h2>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${payoutAccount ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" : "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300"}`}>
                  {payoutAccount ? "Payable" : "Action needed"}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{payoutAccount ? "Your saved payout details are visible here. An access password is required only when you edit them." : "Add a payout method so your account is ready for payouts."}</p>
            </div>
            {!isEditingPaymentMethod && <button type="button" title={payoutAccount ? "Edit payment method" : "Set up payment method"} aria-label={payoutAccount ? "Edit payment method" : "Set up payment method"} onClick={() => setIsEditingPaymentMethod(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-500/20 dark:text-indigo-300">
              <Pencil className="h-3 w-3" />
              {payoutAccount ? "Edit" : "Set up"}
            </button>}
          </div>
          {!isEditingPaymentMethod ? (
            payoutAccount ? (
              <dl className="grid gap-4 border-t border-slate-200 pt-4 dark:border-white/10 sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Payment method</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{payoutMethod === "BINANCE" ? "Binance" : "bKash"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Account</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-slate-900 dark:text-white">{payoutAccount}</dd>
                </div>
              </dl>
            ) : (
              <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No payout method added yet</p>
                <p className="mt-1 text-xs text-slate-500">Select Set up to choose a payout method and add the account details needed for payments.</p>
              </div>
            )
          ) : (
            <form onSubmit={handlePaymentBindingSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Payment method
                  <select value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value)} className="w-full rounded-md border border-slate-200 bg-[var(--surface-elevated)] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:text-white">
                    <option value="BKASH">bKash</option>
                    <option value="BINANCE">Binance</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {payoutMethod === "BINANCE" ? "Binance ID" : "bKash number"}
                  <input value={payoutAccount} onChange={(event) => setPayoutAccount(event.target.value)} placeholder={payoutMethod === "BINANCE" ? "Enter your Binance ID" : "Enter your bKash number"} required className="w-full rounded-md border border-slate-200 bg-[var(--surface-elevated)] px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 dark:border-slate-700 dark:text-white" />
                </label>
              </div>
              <label className="block space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                Access password to confirm changes
                <span className="relative block">
                  <input type={showPaymentPassword ? "text" : "password"} minLength={8} value={paymentPassword} onChange={(event) => setPaymentPassword(event.target.value)} placeholder="At least 8 characters" required className="w-full rounded-md border border-slate-200 bg-[var(--surface-elevated)] px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 dark:border-slate-700 dark:text-white" />
                  <button type="button" onClick={() => setShowPaymentPassword((previous) => !previous)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white" aria-label={showPaymentPassword ? "Hide access password" : "Show access password"} title={showPaymentPassword ? "Hide password" : "Show password"}>
                    {showPaymentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setIsEditingPaymentMethod(false); setPaymentPassword(""); }} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/10">Cancel</button>
                <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500">Save payment method</button>
              </div>
            </form>
          )}
      </section>
      )}

      {showPayoutTransactions && userRole === "OWNER" && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="payout-transactions-title">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <h2 id="payout-transactions-title" className="text-sm font-bold text-white">History</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">Here is your all Pay Out Record</p>
              </div>
              <button type="button" onClick={() => setShowPayoutTransactions(false)} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close paid out transactions">
                <X className="h-4 w-4" />
              </button>
            </div>
            {payoutTransactions.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No paid out transactions yet.</p>
            ) : (
              <div className="max-h-[60vh] divide-y divide-white/10 overflow-y-auto">
                {payoutTransactions.map(({ manager, payout }) => (
                  <div key={payout.payoutNumber} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{manager.fullName || manager.username}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{payout.payoutNumber} · {new Date(payout.paidAt || payout.createdAt).toLocaleString()}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">Method: {payout.payoutMethod || "Not provided"} · Transaction ID: {payout.paymentReference || "Not provided"}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-300">{money(Number(payout.totalEarning || 0))}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Active link earnings</h2>
            <p className="mt-0.5 text-xs text-slate-500">{rows.length === activeLinks.length ? `${activeLinks.length} active ${activeLinks.length === 1 ? "link" : "links"}` : `Showing ${rows.length} of ${activeLinks.length} active links`}</p>
              <div className="mt-3 flex max-w-2xl gap-2.5 border-l-2 border-indigo-500/30 bg-indigo-500/5 px-3 py-2.5 text-[11px] leading-5 text-slate-600 dark:border-indigo-400/30 dark:bg-indigo-400/5 dark:text-slate-300">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-300" />
                  <p><strong className="font-semibold text-slate-800 dark:text-slate-200">Team payout process:</strong> Valid-click earnings are paid to the account manager first. The manager then pays team members. Add payment details from your public Stats link so they appear here.</p>
              </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative block min-w-0 flex-1" htmlFor="payment-link-search">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input id="payment-link-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search account or slug" aria-label="Search links by account name or slug" autoComplete="off" className="h-9 w-full rounded-lg border border-white/10 bg-black/20 pl-8 pr-8 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/40 sm:w-56" />
              {query && <button type="button" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-white/10 hover:text-white" aria-label="Clear link search" title="Clear search"><X className="h-3.5 w-3.5" /></button>}
            </label>
            <div className="flex shrink-0 rounded-lg border border-white/10 bg-black/20 p-0.5">
              {(["all", "unpaid"] as const).map((option) => (
                <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold capitalize transition ${filter === option ? "bg-cyan-300 text-slate-950" : "text-slate-400 hover:text-white"}`}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <div className="p-6 text-center text-sm text-rose-300">{error}</div> : loading ? <div className="p-10 text-center text-sm text-slate-400">Loading payments...</div> : rows.length === 0 ? <div className="p-10 text-center"><WalletCards className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm font-semibold text-slate-300">{activeLinks.length === 0 ? "No active links yet" : "No matching active links"}</p><p className="mt-1 text-xs text-slate-500">{activeLinks.length === 0 ? "Activate a link to start tracking earnings and payouts." : "Try clearing your search or changing the payment filter."}</p></div> : (
          <div className="divide-y divide-white/5">
            {rows.map(({ link, invoices, current, invoiceTotal, paidAmount }) => {
              const hasUnpaidInvoice = invoices.some((invoice) => !invoice.isPaid);
              const hasPaidInvoice = paidAmount > 0;
              return (
                <div key={link.id} className="mx-3 my-2 grid gap-4 rounded-lg border border-slate-700/40 bg-slate-900/35 p-3 transition hover:border-cyan-400/25 hover:bg-white/[0.04] sm:mx-0 sm:my-0 sm:gap-4 sm:rounded-none sm:border-0 sm:border-b sm:border-white/5 sm:bg-transparent sm:p-4 sm:hover:border-white/5 sm:hover:bg-white/[0.025] sm:grid-cols-[minmax(180px,1.25fr)_minmax(150px,1fr)_repeat(3,minmax(88px,0.75fr))_minmax(120px,auto)] sm:items-center">
                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:hidden">Account name</p>
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-bold text-white sm:text-sm sm:font-semibold">{link.accountName}</span>
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">Active</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 sm:text-[11px] sm:text-slate-500">
                      <span>/{link.slug}</span>
                      <span>{link.qualifiedClicks.toLocaleString()} qualified clicks</span>
                    </div>
                  </div>
                  <div className="min-w-0 text-xs text-slate-400">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment method</p>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                      {link.payoutMethod ? (
                        <p className="break-all text-sm font-medium text-slate-200 sm:truncate sm:text-xs">{`${link.payoutMethod === "BKASH" ? "bKash" : link.payoutMethod} · ${link.payoutAccount || "Account not set"}`}</p>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">Not set</span>
                      )}
                      {link.payoutAccount && <button type="button" onClick={() => void copyPaymentAccount(link.id, link.payoutAccount!)} className="shrink-0 rounded p-1 text-slate-500 transition hover:bg-white/10 hover:text-cyan-300" aria-label={`Copy payment account for ${link.accountName}`} title="Copy payment account">
                        {copiedPaymentAccount === link.id ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:contents">
                    <div className="rounded-md border border-cyan-200/40 bg-cyan-50/60 p-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Earning</p><p className="mt-1 text-sm font-bold text-cyan-700 dark:text-cyan-200">{money(current)}</p></div>
                    <div className="rounded-md border border-violet-200/50 bg-violet-50/60 p-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Invoice</p><p className="mt-1 text-sm font-bold text-violet-700 dark:text-violet-300">{money(invoiceTotal)}</p></div>
                    <div className="rounded-md border border-emerald-200/60 bg-emerald-50/60 p-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Paid</p><p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">{money(paidAmount)}</p></div>
                  </div>
                  <div className="flex min-w-[120px] items-center gap-2 border-t border-slate-200 pt-3 sm:justify-end sm:border-0 sm:pt-0">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${hasUnpaidInvoice ? "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300" : hasPaidInvoice ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"}`}>{hasUnpaidInvoice ? "Unpaid" : hasPaidInvoice ? "Paid" : "Not invoiced"}</span>
                    {hasUnpaidInvoice && <button type="button" onClick={() => { setPaymentLink(link); setPaymentReference(""); }} disabled={payingLinkId === link.id} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2 py-1.5 text-[10px] font-bold text-emerald-200 transition hover:bg-emerald-300/20 disabled:opacity-60" aria-label={`Mark invoice for ${link.accountName} as paid`}>
                      <CheckCircle className="h-3 w-3" />
                      {payingLinkId === link.id ? "Saving" : "Mark paid"}
                    </button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {paymentLink && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
        <form onSubmit={submitPayment} className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Confirm payout</p>
              <h2 id="payment-dialog-title" className="mt-1 text-base font-bold text-white">Mark invoice as paid</h2>
              <p className="mt-1 text-xs text-slate-400">{paymentLink.accountName}</p>
            </div>
            <button type="button" onClick={() => setPaymentLink(null)} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close payment dialog">
              <X className="h-4 w-4" />
            </button>
          </div>
          <label className="mt-5 block text-xs font-semibold text-slate-300" htmlFor="payment-reference">
            {paymentLink.payoutMethod === "BKASH" ? "bKash transaction ID" : paymentLink.payoutMethod === "BINANCE" ? "Binance order ID" : "Payment reference"}
            <input id="payment-reference" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} autoFocus required placeholder={paymentLink.payoutMethod === "BKASH" ? "Enter bKash transaction ID" : paymentLink.payoutMethod === "BINANCE" ? "Enter Binance order ID" : "Enter payment reference"} className="mt-2 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/50" />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setPaymentLink(null)} className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5">Cancel</button>
            <button type="submit" disabled={!paymentReference.trim() || payingLinkId === paymentLink.id} className="rounded-md bg-emerald-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-200 disabled:opacity-60">{payingLinkId === paymentLink.id ? "Saving..." : "Confirm paid"}</button>
          </div>
        </form>
      </div>}

    </div>
  );
}
