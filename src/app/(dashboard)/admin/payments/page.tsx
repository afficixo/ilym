"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, CheckCircle, ChevronDown, CircleDollarSign, Copy, CreditCard, Eye, EyeOff, Info, Pencil, Search, UserRound, WalletCards, X } from "lucide-react";
import { coerceArray } from "@/lib/utils/array-response";
import { calculateManagerOwnerPendingAmount, calculatePendingAmount, getManagerInvoicePaymentState, type ManagerPayoutStatus } from "@/lib/utils/payment-pending";

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
  user?: { role: string };
  selectedInvoiceNumber?: string;
  selectedManagerId?: string;
  invoiceSummary?: {
    pendingAmount: number;
    paidAmount: number;
    unpaidCount: number;
    paidCount: number;
  };
  invoiceHistory?: Array<{
    invoiceNumber: string;
    totalEarning: number;
    isPaid: boolean;
    createdAt: string;
    paidAt: string | null;
    managerPayoutStatus?: ManagerPayoutStatus;
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
  referralCommissionsEarned: Array<{
    amount: number;
    paidAt: string | null;
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

const USD_TO_BDT = 118;
const PAYMENT_CURRENCY_STORAGE_KEY = "afficixo-payment-currency";
const PAYMENT_NOTICE_TITLE = "Weekly validation and payout schedule:";
const PAYMENT_NOTICE_BODY = " Valid clicks are reviewed every Monday. Approved payments are released the next business day.";
const formatMoney = (value: number, currency: "USD" | "BDT") => currency === "BDT"
  ? `৳${(value * USD_TO_BDT).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : `$${value.toFixed(2)}`;

export default function PaymentsPage() {
  const router = useRouter();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unpaid">("all");
  const [currency, setCurrency] = useState<"USD" | "BDT">("USD");
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
  const [managerPaidOutAmount, setManagerPaidOutAmount] = useState(0);
  const [managerPaidOutError, setManagerPaidOutError] = useState("");
  const [managerPayments, setManagerPayments] = useState<ManagerPayment[]>([]);
  const [showManagerPayments, setShowManagerPayments] = useState(false);
  const [managerPaymentFilter, setManagerPaymentFilter] = useState<"all" | "unpaid">("all");
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

  useEffect(() => {
    const storedCurrency = window.localStorage.getItem(PAYMENT_CURRENCY_STORAGE_KEY);
    if (storedCurrency === "USD" || storedCurrency === "BDT") {
      setCurrency(storedCurrency);
    }
  }, []);

  const changeCurrency = (nextCurrency: "USD" | "BDT") => {
    setCurrency(nextCurrency);
    window.localStorage.setItem(PAYMENT_CURRENCY_STORAGE_KEY, nextCurrency);
  };

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
      } else if (data.role === "MANAGER") {
        try {
          const payoutResponse = await fetch("/api/referrals", { credentials: "include" });
          if (!payoutResponse.ok) throw new Error("Unable to load manager payout totals");
          const payoutData = await payoutResponse.json();
          setManagerPaidOutAmount(Number(payoutData.summary?.managerPaidOutAmount) || 0);
          setManagerPaidOutError("");
        } catch (payoutError) {
          setManagerPaidOutError(payoutError instanceof Error ? payoutError.message : "Unable to load manager payout totals");
        }
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
      await fetchPayments();
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
        const unpaidInvoiceTotal = Number(link.invoiceSummary?.pendingAmount ?? unpaid.reduce((sum, invoice) => sum + (Number(invoice.totalEarning) || 0), 0));
        const paidInvoiceTotal = Number(link.invoiceSummary?.paidAmount ?? paid.reduce((sum, invoice) => sum + (Number(invoice.totalEarning) || 0), 0));
        const invoiceTotal = unpaidInvoiceTotal;
        const commissionRate = Number(link.commissionRate ?? 20);
        const unpaidAmount = unpaidInvoiceTotal;
        const pendingTotal = calculatePendingAmount([{ totalEarning: unpaidInvoiceTotal, isPaid: false }], commissionRate);
        const paidAmount = paidInvoiceTotal;
        const accrued = unpaidAmount + paidAmount + current;
        const revenue = current + (current * (commissionRate / 100));
        return { link, invoices, current, unpaidAmount, paidAmount, invoiceTotal, pendingTotal, accrued, revenue, commission: current * (commissionRate / 100) };
      }), [activeLinks]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return paymentRows.filter(({ link, invoices }) => {
      const matchesQuery = !normalizedQuery || `${link.accountName} ${link.slug}`.toLowerCase().includes(normalizedQuery);
      const relevantInvoices = link.invoiceHistory?.length ? link.invoiceHistory : invoices;
      const unpaidCount = link.invoiceSummary?.unpaidCount ?? relevantInvoices.filter((invoice) => !invoice.isPaid).length;
      const matchesFilter = filter === "all" || unpaidCount > 0;
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
    const referralPending = manager.referralCommissionsEarned
      .filter((commission) => !commission.paidAt)
      .reduce((sum, commission) => sum + Number(commission.amount || 0), 0);
    const pending = calculatePendingAmount(pendingInvoices, commissionRate) + referralPending;
    const revenue = managerRevenueByUserId.get(manager.id) || 0;
    const nextUnpaidInvoice = manager.linkAccounts
      .flatMap((link) => link.invoices.filter((invoice) => !invoice.isPaid && invoice.managerPayouts.length === 0).map((invoice) => ({ invoice, link })))
      .sort((firstInvoice, secondInvoice) => firstInvoice.invoice.invoiceNumber.localeCompare(secondInvoice.invoice.invoiceNumber))[0];
    return {
      manager,
      invoiceCount: invoices.length,
      paid,
      total: revenue,
      pending,
      referralPending,
      commissionRate,
      payoutMethod: manager.payoutMethod || (manager.bkashNumber ? "BKASH" : null),
      payoutAccount: manager.payoutAccount || manager.bkashNumber,
      nextUnpaidInvoice,
    };
  });
  const activeManagerPaymentRows = useMemo(
    () => managerPaymentRows.filter(({ manager }) => manager.status === "ACTIVE"),
    [managerPaymentRows],
  );
  const visibleManagerPaymentRows = useMemo(
    () => managerPaymentFilter === "unpaid"
      ? activeManagerPaymentRows.filter(({ pending, nextUnpaidInvoice }) => pending > 0 || Boolean(nextUnpaidInvoice))
      : activeManagerPaymentRows,
    [activeManagerPaymentRows, managerPaymentFilter],
  );
  const pendingSummary = userRole === "OWNER"
    ? activeManagerPaymentRows.reduce((sum, row) => sum + row.pending, 0)
    : userRole === "MANAGER"
      ? paymentRows.reduce((sum, row) => sum + calculateManagerOwnerPendingAmount(row.invoices, Number(row.link.commissionRate ?? 20)), 0)
    : totals.invoices;
  const paidOutSummary = userRole === "OWNER"
    ? activeManagerPaymentRows.reduce((sum, row) => sum + row.paid, 0)
    : userRole === "MANAGER"
      ? managerPaidOutAmount
    : totals.paid;
  const managerCommissionRates = [...new Set(paymentRows.map((row) => Number(row.link.commissionRate ?? 20)).filter((rate) => Number.isFinite(rate)))];
  const displayedCommissionRates = managerCommissionRates.length > 0 ? managerCommissionRates : [20];
  const payoutTransactions = managerPayments.flatMap((manager) => manager.managerPayouts
    .filter((payout) => payout.isPaid)
    .map((payout) => ({ manager, payout })))
    .sort((first, second) => new Date(second.payout.paidAt || second.payout.createdAt).getTime() - new Date(first.payout.paidAt || first.payout.createdAt).getTime());
  const money = (value: number) => formatMoney(value, currency);

  return (
    <div className="w-full space-y-4 pb-8 sm:space-y-5">
      <header className="flex flex-col gap-2 rounded-xl bg-gradient-to-r from-white to-emerald-50/70 px-3 py-2 shadow-sm shadow-slate-900/[0.04] dark:from-[#202b2f] dark:to-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">Finance</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">Review earnings, balances, and recorded payouts.</p>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-2 py-1 dark:bg-[#192326]/80 sm:justify-end">
          <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">1 USD = ৳118 BDT</p>
          <div role="group" className="flex rounded-md bg-slate-100 p-0.5 dark:bg-slate-950/70" aria-label="Display currency">
            {(["USD", "BDT"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeCurrency(option)}
                aria-pressed={currency === option}
                className={`rounded px-2 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${currency === option ? "bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:text-emerald-50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-sky-50/80 px-3 py-2 text-xs leading-5 text-slate-600 dark:bg-sky-400/[0.06] dark:text-slate-300">
          <Info className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden="true" />
          <p className="min-w-0">
            <strong className="font-semibold text-slate-900 dark:text-white">{PAYMENT_NOTICE_TITLE}</strong>{" "}
            {PAYMENT_NOTICE_BODY.trim()}
          </p>
      </div>

      {bindingMessage && <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">{bindingMessage}</p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Earning", value: totals.current, icon: WalletCards, tone: "text-slate-950 dark:text-white", iconTone: "bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300", stripe: "bg-sky-500 dark:bg-sky-400", surface: "bg-gradient-to-br from-white to-sky-50/90 dark:from-[#202b2f] dark:to-sky-950/30" },
          { label: "Commission", value: commission, icon: CircleDollarSign, tone: "text-slate-950 dark:text-white", iconTone: "bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300", stripe: "bg-violet-500 dark:bg-violet-400", surface: "bg-gradient-to-br from-white to-violet-50/90 dark:from-[#202b2f] dark:to-violet-950/30" },
          { label: userRole === "MANAGER" ? "Pending from owner" : "Pending", value: pendingSummary, icon: CreditCard, tone: "text-amber-950 dark:text-amber-50", iconTone: "bg-amber-200/80 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200", stripe: "bg-amber-600 dark:bg-amber-400", surface: "bg-gradient-to-br from-amber-50 via-amber-50/80 to-orange-100/90 dark:from-[#202b2f] dark:via-amber-950/30 dark:to-orange-950/35" },
          { label: userRole === "MANAGER" ? "Paid by owner" : "Paid out", value: paidOutSummary, icon: CircleDollarSign, tone: "text-slate-950 dark:text-white", iconTone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300", stripe: "bg-emerald-500 dark:bg-emerald-400", surface: "bg-gradient-to-br from-white to-emerald-50/90 dark:from-[#202b2f] dark:to-emerald-950/30" },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={`relative flex min-h-[116px] flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-sm shadow-slate-900/[0.04] transition duration-200 ${card.surface} ${card.label === "Paid out" && userRole === "OWNER" ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70" : ""}`}
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
            <span className={`absolute inset-x-0 top-0 h-1 ${card.stripe}`} aria-hidden="true" />
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-semibold text-slate-600 dark:text-slate-300" title={card.label === "Pending from owner" ? "Manager payouts the owner has not recorded as paid" : card.label}>{card.label}</span>
              {card.label === "Commission" && userRole === "MANAGER" && (
                <span className="shrink-0 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold tabular-nums text-violet-900 dark:bg-violet-300/15 dark:text-violet-100">
                  {displayedCommissionRates.map((rate) => `${rate.toFixed(2)}%`).join(", ")}
                </span>
              )}
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${card.iconTone}`}>
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            <div>
              <div className={`min-w-0 break-words tabular-nums text-[clamp(0.75rem,2.4vw,1.75rem)] font-bold leading-tight tracking-tight ${card.tone}`} title={money(card.value)}>{money(card.value)}</div>
            </div>
          </motion.div>
        ))}
      </div>
      {managerPaidOutError && userRole === "MANAGER" && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-400/[0.08] dark:text-rose-200">{managerPaidOutError}</p>
      )}
      {userRole === "OWNER" ? (
        <section id="manager-payments" className="scroll-mt-4 overflow-hidden rounded-2xl bg-white/75 shadow-sm shadow-slate-900/[0.04] dark:bg-[#202b2f]/80">
          <div className="flex flex-col gap-2 bg-emerald-50/60 p-3 dark:bg-emerald-400/[0.035] sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
            <button
              type="button"
              onClick={() => setShowManagerPayments((current) => !current)}
              aria-expanded={showManagerPayments}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"><WalletCards className="h-4 w-4" /></span>
                  Manager payouts
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">{visibleManagerPaymentRows.length}{managerPaymentFilter === "unpaid" ? `/${activeManagerPaymentRows.length}` : ""}</span>
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-slate-600 dark:text-slate-300">Manager balances and payout history</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${showManagerPayments ? "rotate-180" : ""}`} />
            </button>
            <div className="flex w-fit shrink-0 rounded-lg bg-white/80 p-0.5 dark:bg-slate-950/50" aria-label="Filter manager payments">
              {(["all", "unpaid"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setManagerPaymentFilter(option);
                    setShowManagerPayments(true);
                  }}
                  aria-pressed={managerPaymentFilter === option}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${managerPaymentFilter === option ? "bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:text-emerald-50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"}`}
                >
                  {option === "all" ? "All accounts" : "Unpaid"}
                </button>
              ))}
            </div>
          </div>
          {showManagerPayments && managerPaymentsError ? (
            <p className="p-6 text-sm text-rose-600 dark:text-rose-300">{managerPaymentsError}</p>
          ) : showManagerPayments && (visibleManagerPaymentRows.length === 0 ? (
            <p className="p-6 text-sm text-slate-700 dark:text-slate-300">{managerPaymentFilter === "unpaid" ? "No unpaid manager balances found." : "No active manager accounts found."}</p>
          ) : (
            <div className="grid gap-2.5 bg-slate-50/60 p-3 dark:bg-black/10 sm:gap-3">
              {visibleManagerPaymentRows.map(({ manager, invoiceCount, paid, pending, referralPending, total, commissionRate, payoutMethod, payoutAccount, nextUnpaidInvoice }) => {
                const canRecordManagerPayout = Boolean(payoutMethod && payoutAccount);
                const hasPendingFunds = pending > 0;
                const openManagerPayoutDialog = () => {
                  setPaymentLink({
                    id: manager.id,
                    userId: manager.id,
                    accountName: manager.fullName || manager.username,
                    slug: "",
                    isActive: true,
                    totalEarning: 0,
                    qualifiedClicks: 0,
                    payoutMethod,
                    payoutAccount,
                    selectedManagerId: manager.id,
                  });
                  setPaymentReference("");
                };
                return (
                <div key={manager.id} className="relative grid gap-2.5 overflow-hidden rounded-2xl border border-l-[3px] border-teal-200/80 border-l-teal-600 bg-white p-2.5 shadow-sm shadow-slate-900/[0.04] transition duration-200 hover:-translate-y-px hover:border-teal-300 hover:shadow-md sm:gap-3 sm:p-3 lg:grid-cols-[minmax(190px,1.1fr)_minmax(330px,2fr)_minmax(175px,1.2fr)] lg:items-center dark:border-teal-300/10 dark:border-l-teal-400 dark:bg-[#202b2f] dark:hover:border-teal-300/20 dark:shadow-black/10">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"><UserRound className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-slate-950 dark:text-white">{manager.fullName || manager.username}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-700 dark:text-slate-300">@{manager.username} · {invoiceCount} {invoiceCount === 1 ? "invoice" : "invoices"}{referralPending > 0 ? ` · ${money(referralPending)} referral` : ""}</p>
                      </div>
                    </div>
                    <div className="mt-2 min-w-0 rounded-xl bg-slate-50/80 px-2.5 py-2 dark:bg-white/[0.025] sm:hidden">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {payoutMethod ? (
                          <p className="min-w-0 break-all text-xs font-semibold text-slate-900 dark:text-white">{`${payoutMethod === "BKASH" ? "bKash" : payoutMethod} · ${payoutAccount || "Account missing"}`}</p>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-200/70 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">Not configured</span>
                        )}
                        {payoutAccount && <button type="button" onClick={() => void copyPaymentAccount(manager.id, payoutAccount)} className="shrink-0 rounded-md p-1.5 text-slate-500 transition hover:bg-white hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-emerald-300" aria-label={`Copy payment account for ${manager.username}`} title={copiedPaymentAccount === manager.id ? "Copied" : "Copy payment account"}>
                          {copiedPaymentAccount === manager.id ? <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>}
                      </div>
                      {hasPendingFunds && (canRecordManagerPayout ? <button type="button" onClick={openManagerPayoutDialog} aria-label={nextUnpaidInvoice ? "Record manager payout" : "Pay referral commission"} className="mt-1.5 inline-flex min-h-8 w-fit items-center justify-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 transition-colors hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:border-teal-400/20 dark:bg-teal-400/[0.08] dark:text-teal-200 dark:hover:border-teal-300/30 dark:hover:bg-teal-400/[0.14] dark:focus-visible:ring-offset-[#202b2f]"><CheckCircle className="h-3.5 w-3.5" />{nextUnpaidInvoice ? "Record payout" : "Pay referral"}</button> : <p className="mt-1.5 text-xs leading-5 text-amber-800 dark:text-amber-200">Add payout details to release this balance.</p>)}
                    </div>
                  </div>
                  <div className="grid min-w-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-2">
                  <div className="relative flex min-h-[76px] min-w-0 flex-col justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-sky-100/70 p-2 pt-3.5 leading-tight sm:min-h-[82px] sm:p-3 sm:pt-4 dark:from-sky-400/[0.08] dark:to-sky-400/[0.03]"><span className="absolute inset-x-0 top-0 h-1 bg-sky-500 dark:bg-sky-400" aria-hidden="true" /><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Revenue</p><p className="mt-1 truncate text-sm font-bold tabular-nums text-slate-950 dark:text-white sm:mt-1.5 sm:text-base">{money(total)}</p><p className="mt-1 truncate text-[10px] tabular-nums text-slate-500 dark:text-slate-400 sm:text-[11px]">{commissionRate.toFixed(2)}% share</p></div>
                  <div className="relative flex min-h-[76px] min-w-0 flex-col justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/70 p-2 pt-3.5 leading-tight sm:min-h-[82px] sm:p-3 sm:pt-4 dark:from-emerald-400/[0.08] dark:to-emerald-400/[0.03]"><span className="absolute inset-x-0 top-0 h-1 bg-emerald-500 dark:bg-emerald-400" aria-hidden="true" /><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Paid out</p><p className="mt-1 truncate text-sm font-bold tabular-nums text-slate-950 dark:text-white sm:mt-1.5 sm:text-base">{money(paid)}</p></div>
                  <div className={`relative flex min-h-[76px] min-w-0 flex-col justify-center overflow-hidden rounded-xl p-2 pt-3.5 leading-tight sm:min-h-[82px] sm:p-3 sm:pt-4 ${hasPendingFunds ? "bg-gradient-to-br from-amber-100 to-orange-100/80 dark:from-amber-400/[0.12] dark:to-orange-400/[0.06]" : "bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-white/[0.045] dark:to-white/[0.02]"}`} aria-label={hasPendingFunds ? `Pending funds ${money(pending)}` : "No pending funds"}>
                    <span className={`absolute inset-x-0 top-0 h-1 ${hasPendingFunds ? "bg-amber-500 dark:bg-amber-400" : "bg-slate-300 dark:bg-slate-600"}`} aria-hidden="true" />
                    <div className="flex items-center justify-between gap-1"><p className={`text-[10px] font-semibold uppercase tracking-wide ${hasPendingFunds ? "text-amber-800 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}>Pending</p>{hasPendingFunds && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />}</div>
                    <p className={`mt-1.5 truncate text-base font-bold tabular-nums ${hasPendingFunds ? "text-amber-950 dark:text-amber-100" : "text-slate-900 dark:text-white"}`}>{money(pending)}</p>
                    {hasPendingFunds && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Action needed</p>}
                    </div>
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Payout details</p>
                    <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                      {payoutMethod ? (
                        <p className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-white">{`${payoutMethod === "BKASH" ? "bKash" : payoutMethod} · ${payoutAccount || "Account missing"}`}</p>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">Not configured</span>
                      )}
                      {payoutAccount && <button type="button" onClick={() => void copyPaymentAccount(manager.id, payoutAccount)} className="shrink-0 rounded p-1 text-slate-700 transition hover:bg-slate-100 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-indigo-200" aria-label={`Copy payment account for ${manager.username}`} title={copiedPaymentAccount === manager.id ? "Copied" : "Copy payment account"}>
                        {copiedPaymentAccount === manager.id ? <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>}
                    </div>
                    {hasPendingFunds && (canRecordManagerPayout ? <button type="button" onClick={openManagerPayoutDialog} aria-label={nextUnpaidInvoice ? "Record manager payout" : "Pay referral commission"} className="mt-2 inline-flex min-h-9 max-w-full items-center justify-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition-colors hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:border-teal-400/20 dark:bg-teal-400/[0.08] dark:text-teal-200 dark:hover:border-teal-300/30 dark:hover:bg-teal-400/[0.14] dark:focus-visible:ring-offset-[#202b2f]"><CheckCircle className="h-3.5 w-3.5 shrink-0" />{nextUnpaidInvoice ? "Record payout" : "Pay referral"}</button> : <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">Add manager payment details to release pending funds.</p>)}
                  </div>
                </div>
                );
              })}
            </div>
          ))}
        </section>
      ) : userRole === "MANAGER" ? (
      <section className="space-y-4 rounded-2xl bg-white/70 p-4 dark:bg-[#202b2f]/70">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Payout details</h2>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${payoutAccount ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200" : "bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-100"}`}>
                  {payoutAccount ? "Payable" : "Action needed"}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-300">{payoutAccount ? "Your saved payout details are visible here. An access password is required only when you edit them." : "Add a payout method so your account is ready for payouts."}</p>
            </div>
            {!isEditingPaymentMethod && <button type="button" title={payoutAccount ? "Edit payment method" : "Set up payment method"} aria-label={payoutAccount ? "Edit payment method" : "Set up payment method"} onClick={() => setIsEditingPaymentMethod(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:bg-indigo-300/10 dark:text-indigo-100 dark:hover:bg-indigo-300/20">
              <Pencil className="h-3 w-3" />
              {payoutAccount ? "Edit" : "Set up"}
            </button>}
          </div>
          {!isEditingPaymentMethod ? (
            payoutAccount ? (
              <dl className="grid gap-4 pt-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Payment method</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{payoutMethod === "BINANCE" ? "Binance" : "bKash"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Account</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-slate-900 dark:text-white">{payoutAccount}</dd>
                </div>
              </dl>
            ) : (
              <div className="pt-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No payout method added yet</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Select Set up to choose a payout method and add the account details needed for payments.</p>
              </div>
            )
          ) : (
            <form onSubmit={handlePaymentBindingSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                  Payment method
                  <select value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value)} className="w-full rounded-md bg-[var(--surface-elevated)] px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500/40 dark:text-white">
                    <option value="BKASH">bKash</option>
                    <option value="BINANCE">Binance</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {payoutMethod === "BINANCE" ? "Binance ID" : "bKash number"}
                  <input value={payoutAccount} onChange={(event) => setPayoutAccount(event.target.value)} placeholder={payoutMethod === "BINANCE" ? "Enter your Binance ID" : "Enter your bKash number"} required className="w-full rounded-md bg-[var(--surface-elevated)] px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/40 dark:text-white dark:placeholder:text-slate-400" />
                </label>
              </div>
              <label className="block space-y-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                Access password to confirm changes
                <span className="relative block">
                  <input type={showPaymentPassword ? "text" : "password"} minLength={8} value={paymentPassword} onChange={(event) => setPaymentPassword(event.target.value)} placeholder="At least 8 characters" required className="w-full rounded-md bg-[var(--surface-elevated)] px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/40 dark:text-white dark:placeholder:text-slate-400" />
                  <button type="button" onClick={() => setShowPaymentPassword((previous) => !previous)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label={showPaymentPassword ? "Hide access password" : "Show password"}>
                    {showPaymentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setIsEditingPaymentMethod(false); setPaymentPassword(""); }} className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10">Cancel</button>
                <button type="submit" className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:bg-indigo-400 dark:text-slate-950 dark:hover:bg-indigo-300">Save payment method</button>
              </div>
            </form>
          )}
      </section>
      ) : null}

      {showPayoutTransactions && userRole === "OWNER" && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="payout-transactions-title">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h2 id="payout-transactions-title" className="text-sm font-bold text-white">History</h2>
                <p className="mt-0.5 text-sm text-slate-300">Here is your all Pay Out Record</p>
              </div>
              <button type="button" onClick={() => setShowPayoutTransactions(false)} className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Close paid out transactions">
                <X className="h-4 w-4" />
              </button>
            </div>
            {payoutTransactions.length === 0 ? (
              <p className="p-6 text-sm text-slate-300">No paid out transactions yet.</p>
            ) : (
              <div className="max-h-[60vh] divide-y divide-white/10 overflow-y-auto">
                {payoutTransactions.map(({ manager, payout }) => (
                  <div key={payout.payoutNumber} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{manager.fullName || manager.username}</p>
                      <p className="mt-1 text-xs text-slate-300">{payout.payoutNumber} · {new Date(payout.paidAt || payout.createdAt).toLocaleString()}</p>
                      <p className="mt-1 text-xs text-slate-300">Method: {payout.payoutMethod || "Not provided"} · Transaction ID: {payout.paymentReference || "Not provided"}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-300">{money(Number(payout.totalEarning || 0))}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl bg-white/75 shadow-sm shadow-slate-900/[0.04] dark:bg-[#202b2f]/80">
        <div className="flex flex-col gap-3 bg-slate-50/70 p-3 dark:bg-white/[0.025] sm:p-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"><WalletCards className="h-4 w-4" /></span>
              <h2 className="truncate text-base font-bold text-slate-950 dark:text-white">Active link earnings</h2>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold tabular-nums text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">{rows.length === activeLinks.length ? `${activeLinks.length} active` : `${rows.length} of ${activeLinks.length}`}</span>
            </div>
            <div className="mt-2 flex max-w-2xl items-start gap-2 rounded-lg bg-sky-100/70 px-2.5 py-2 text-xs leading-5 text-slate-600 dark:bg-sky-400/[0.06] dark:text-slate-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden="true" />
              <p><strong className="font-semibold text-slate-900 dark:text-white">Team payouts:</strong> Earnings are paid to the account manager, who then pays team members. Add payout details from your public Stats link.</p>
            </div>
          </div>
          <div className="flex w-full min-w-0 gap-2 sm:items-center lg:w-auto lg:shrink-0">
            <label className="relative block min-w-0 flex-1" htmlFor="payment-link-search">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-700 dark:text-slate-300" />
              <input id="payment-link-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search account or slug" aria-label="Search links by account name or slug" autoComplete="off" className="h-10 w-full rounded-lg bg-white pl-9 pr-8 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-400 sm:w-56" />
              {query && <button type="button" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Clear link search" title="Clear search"><X className="h-3.5 w-3.5" /></button>}
            </label>
            <div className="flex shrink-0 rounded-lg bg-white p-1 dark:bg-slate-950/60">
              {(["all", "unpaid"] as const).map((option) => (
                <button key={option} type="button" onClick={() => setFilter(option)} aria-pressed={filter === option} className={`rounded-md px-3 py-2 text-xs font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${filter === option ? "bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:text-emerald-50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"}`}>
                  {option === "all" ? "All" : "Unpaid"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <div className="p-6 text-center text-sm font-medium text-rose-700 dark:text-rose-300">{error}</div> : loading ? <div className="p-10 text-center text-sm text-slate-700 dark:text-slate-300">Loading payments...</div> : rows.length === 0 ? <div className="p-10 text-center"><WalletCards className="mx-auto h-8 w-8 text-slate-600 dark:text-slate-400" /><p className="mt-3 text-base font-semibold text-slate-900 dark:text-white">{activeLinks.length === 0 ? "No active links yet" : "No matching active links"}</p><p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{activeLinks.length === 0 ? "Activate a link to start tracking earnings and payouts." : "Try clearing your search or changing the payment filter."}</p></div> : (
          <div className="space-y-1 bg-sky-50/60 p-1 dark:bg-black/10">
            {rows.map(({ link, invoices, current, invoiceTotal, paidAmount }) => {
              const hasUnpaidInvoice = (link.invoiceSummary?.unpaidCount ?? invoices.filter((invoice) => !invoice.isPaid).length) > 0;
              const hasPaidInvoice = paidAmount > 0;
              const hasPendingBalance = invoiceTotal > 0;
              const requiresManagerPayout = link.user?.role === "MANAGER";
              const managerInvoiceStates = (link.invoiceHistory || invoices)
                .filter((invoice) => !invoice.isPaid)
                .map((invoice) => getManagerInvoicePaymentState({
                  isPaid: invoice.isPaid,
                  managerPayoutStatus: invoice.managerPayoutStatus ?? null,
                }));
              const hasManagerPayoutDue = managerInvoiceStates.includes("MANAGER_PAYOUT_DUE");
              const hasManagerPaymentDue = managerInvoiceStates.includes("MANAGER_PAYMENT_DUE");
              const hasManagerPayoutPending = managerInvoiceStates.includes("MANAGER_PAYOUT_PENDING");
              const linkManager = requiresManagerPayout && userRole === "OWNER"
                ? managerPayments.find((manager) => manager.id === link.userId)
                : undefined;
              const managerPayoutMethod = linkManager?.payoutMethod || (linkManager?.bkashNumber ? "BKASH" : null);
              const managerPayoutAccount = linkManager?.payoutAccount || linkManager?.bkashNumber || null;
              const canRecordLinkedManagerPayout = Boolean(managerPayoutMethod && managerPayoutAccount);
              return (
                <div key={link.id} className="grid min-w-0 gap-2.5 rounded-2xl border border-l-[3px] border-teal-200/80 border-l-teal-600 bg-white p-2.5 shadow-sm shadow-slate-900/[0.04] transition duration-200 hover:-translate-y-px hover:border-teal-300 hover:shadow-md sm:gap-3 sm:p-4 lg:grid-cols-[minmax(180px,1.1fr)_minmax(300px,1.8fr)_minmax(190px,1.2fr)] lg:items-center lg:gap-4 dark:border-teal-300/10 dark:border-l-teal-400 dark:bg-[#202b2f] dark:hover:border-teal-300/20 dark:shadow-black/10">
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300 sm:hidden">Account name</p>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-base font-bold text-slate-950 dark:text-white">{link.accountName}</span>
                      <span className="rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200">Active</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-700 dark:text-slate-300 sm:gap-x-3">
                      <span>/{link.slug}</span>
                      <span>{link.qualifiedClicks.toLocaleString()} qualified clicks</span>
                    </div>
                  </div>
                  <div className="min-w-0 text-sm text-slate-800 dark:text-slate-200 lg:col-start-3 lg:row-start-1">
                    <p className="hidden text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 sm:block">Payment method</p>
                    <div className="mt-1.5 flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-50/80 px-2.5 py-2 dark:bg-white/[0.025] sm:mt-0.5 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 sm:dark:bg-transparent">
                      {link.payoutMethod ? (
                        <p className="min-w-0 truncate text-xs font-semibold text-slate-900 dark:text-slate-100 sm:text-sm sm:font-medium">{`${link.payoutMethod === "BKASH" ? "bKash" : link.payoutMethod} · ${link.payoutAccount || "Account not set"}`}</p>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100/80 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-300/10 dark:text-amber-100">Not set</span>
                      )}
                      {link.payoutAccount && <button type="button" onClick={() => void copyPaymentAccount(link.id, link.payoutAccount!)} className="shrink-0 rounded p-1 text-slate-700 transition hover:bg-slate-100 hover:text-cyan-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-cyan-200" aria-label={`Copy payment account for ${link.accountName}`} title="Copy payment account">
                        {copiedPaymentAccount === link.id ? <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>}
                    </div>
                  </div>
                  <div className="grid min-w-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-2 lg:col-start-2 lg:row-span-2">
                    <div className="relative flex min-h-[70px] min-w-0 flex-col justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-sky-100/70 p-2 pt-3.5 leading-tight sm:min-h-[78px] sm:p-3 sm:pt-4 dark:from-sky-400/[0.08] dark:to-sky-400/[0.03]"><span className="absolute inset-x-0 top-0 h-1 bg-sky-500 dark:bg-sky-400" aria-hidden="true" /><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Earning</p><p className="mt-1 truncate text-sm font-bold tabular-nums text-slate-950 dark:text-white sm:mt-1.5 sm:text-base">{money(current)}</p></div>
                    <div className={`relative flex min-h-[70px] min-w-0 flex-col justify-center overflow-hidden rounded-xl p-2 pt-3.5 leading-tight sm:min-h-[78px] sm:p-3 sm:pt-4 ${hasPendingBalance ? "bg-gradient-to-br from-amber-100 to-orange-100/80 dark:from-amber-400/[0.12] dark:to-orange-400/[0.06]" : "bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-white/[0.045] dark:to-white/[0.02]"}`}><span className={`absolute inset-x-0 top-0 h-1 ${hasPendingBalance ? "bg-amber-500 dark:bg-amber-400" : "bg-slate-300 dark:bg-slate-600"}`} aria-hidden="true" /><p className={`truncate text-[10px] font-semibold uppercase tracking-wide ${hasPendingBalance ? "text-amber-800 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}>Pending</p><p className={`mt-1 truncate text-sm font-bold tabular-nums sm:mt-1.5 sm:text-base ${hasPendingBalance ? "text-amber-950 dark:text-amber-100" : "text-slate-900 dark:text-white"}`}>{money(invoiceTotal)}</p></div>
                    <div className="relative flex min-h-[70px] min-w-0 flex-col justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/70 p-2 pt-3.5 leading-tight sm:min-h-[78px] sm:p-3 sm:pt-4 dark:from-emerald-400/[0.08] dark:to-emerald-400/[0.03]"><span className="absolute inset-x-0 top-0 h-1 bg-emerald-500 dark:bg-emerald-400" aria-hidden="true" /><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Paid</p><p className="mt-1 truncate text-sm font-bold tabular-nums text-slate-950 dark:text-white sm:mt-1.5 sm:text-base">{money(paidAmount)}</p></div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 pt-1 lg:col-start-3 lg:row-start-2 lg:pt-0">
                    {!hasUnpaidInvoice && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${hasPaidInvoice ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{hasPaidInvoice ? "Paid" : "Not invoiced"}</span>}
                    {requiresManagerPayout && userRole === "OWNER" && hasManagerPayoutDue && canRecordLinkedManagerPayout && <span className="inline-flex items-center rounded-lg bg-amber-100/80 px-2.5 py-2 text-xs font-medium text-amber-800 dark:bg-amber-400/[0.08] dark:text-amber-200">Manager payout due · see Manager balances</span>}
                    {requiresManagerPayout && userRole === "OWNER" && hasManagerPayoutDue && !canRecordLinkedManagerPayout && <span className="inline-flex items-center rounded-lg bg-sky-100/80 px-2.5 py-2 text-xs font-medium text-sky-800 dark:bg-sky-400/[0.08] dark:text-sky-200">Add manager payout details</span>}
                    {requiresManagerPayout && userRole === "OWNER" && hasManagerPaymentDue && <span className="inline-flex items-center rounded-lg bg-emerald-100/80 px-2.5 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-400/[0.08] dark:text-emerald-200">Paid to manager · awaiting account payment</span>}
                    {requiresManagerPayout && userRole === "OWNER" && hasManagerPayoutPending && <span className="inline-flex items-center rounded-lg bg-sky-100/80 px-2.5 py-2 text-xs font-medium text-sky-800 dark:bg-sky-400/[0.08] dark:text-sky-200">Manager payout pending</span>}
                    {requiresManagerPayout && userRole === "MANAGER" && hasManagerPaymentDue && <button type="button" onClick={() => { setPaymentLink(link); setPaymentReference(""); }} disabled={payingLinkId === link.id} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:from-emerald-500 dark:to-teal-500 dark:text-slate-950 dark:hover:from-emerald-400 dark:hover:to-teal-400" aria-label={`Mark invoice for ${link.accountName} as paid`} title="Record link-account payment">
                      <CheckCircle className="h-3 w-3" />
                      {payingLinkId === link.id ? "Saving" : "Mark paid"}
                    </button>}
                    {requiresManagerPayout && userRole === "MANAGER" && hasUnpaidInvoice && !hasManagerPaymentDue && <span className="inline-flex items-center rounded-lg bg-sky-100/80 px-2.5 py-2 text-xs font-medium text-sky-800 dark:bg-sky-400/[0.08] dark:text-sky-200">Owner payout required</span>}
                    {hasUnpaidInvoice && !requiresManagerPayout && userRole !== "MANAGER" && <button type="button" onClick={() => { setPaymentLink(link); setPaymentReference(""); }} disabled={payingLinkId === link.id} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:from-emerald-500 dark:to-teal-500 dark:text-slate-950 dark:hover:from-emerald-400 dark:hover:to-teal-400" aria-label={`Mark invoice for ${link.accountName} as paid`} title="Mark invoice as paid">
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

      {paymentLink && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title" aria-describedby="payment-dialog-description">
        <form onSubmit={submitPayment} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-xl bg-slate-900 p-4 shadow-2xl shadow-black/40 sm:max-h-[calc(100vh-2rem)] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><CheckCircle className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Payment confirmation</p>
                <h2 id="payment-dialog-title" className="mt-1 text-base font-bold text-white">Record payment</h2>
              </div>
            </div>
            <button type="button" onClick={() => setPaymentLink(null)} className="rounded-md p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70" aria-label="Close payment dialog" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 rounded-lg bg-black/20 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-white">{paymentLink.accountName}</p>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-300">
              {paymentLink.selectedInvoiceNumber && <span>Invoice {paymentLink.selectedInvoiceNumber}</span>}
              {paymentLink.payoutMethod && <span className="shrink-0 rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-200">{paymentLink.payoutMethod === "BKASH" ? "bKash" : paymentLink.payoutMethod}</span>}
              {paymentLink.payoutAccount && (
                <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-white/[0.04] py-1 pl-2 text-sm font-semibold text-white">
                  <span className="break-all leading-5">{paymentLink.payoutAccount}</span>
                  <button type="button" onClick={() => void copyPaymentAccount(paymentLink.id, paymentLink.payoutAccount!)} className="shrink-0 rounded p-1 text-slate-300 transition hover:bg-white/10 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70" aria-label="Copy payout account" title={copiedPaymentAccount === paymentLink.id ? "Copied" : "Copy payout account"}>
                    {copiedPaymentAccount === paymentLink.id ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </span>
              )}
            </div>
          </div>
          <p id="payment-dialog-description" className="mt-3 text-xs leading-5 text-slate-300">{paymentLink.selectedManagerId ? "This payout settles all outstanding team invoices and available referral commissions." : "This records the payment and closes the outstanding invoice."}</p>
          <label className="mt-4 block text-sm font-semibold text-slate-200" htmlFor="payment-reference">
            {paymentLink.payoutMethod === "BKASH" ? "bKash transaction ID" : paymentLink.payoutMethod === "BINANCE" ? "Binance order ID" : "Payment reference"}
            <input id="payment-reference" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} autoFocus required placeholder={paymentLink.payoutMethod === "BKASH" ? "Enter bKash transaction ID" : paymentLink.payoutMethod === "BINANCE" ? "Enter Binance order ID" : "Enter payment reference"} className="mt-1.5 h-10 w-full rounded-lg bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-400 transition focus:ring-2 focus:ring-emerald-300/30" />
          </label>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setPaymentLink(null)} className="rounded-lg bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">Cancel</button>
            <button type="submit" disabled={!paymentReference.trim() || payingLinkId === paymentLink.id} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 shadow-sm shadow-emerald-950/30 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 disabled:cursor-not-allowed disabled:opacity-60"><CheckCircle className="h-3.5 w-3.5" />{payingLinkId === paymentLink.id ? "Recording..." : "Record payment"}</button>
          </div>
        </form>
      </div>}

    </div>
  );
}
