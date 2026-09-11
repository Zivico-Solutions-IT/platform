import React, { useState, useMemo } from "react";
import { usePortal } from "../context/PortalContext";
import { PaymentStatus, Deposit, Withdrawal } from "../types";
import {
  Search,
  PlusCircle,
  FileText,
  Check,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Gift,
} from "lucide-react";
import { DepositSlipModal } from "../components/modals/DepositSlipModal";

export type UnifiedFilterTab = "ALL" | "DEPOSIT" | "WITHDRAWAL" | "BONUS" | "PENDING" | "APPROVED" | "REJECTED";

export interface UnifiedPaymentItem {
  key: string;
  id: string;
  login: number;
  clientName: string;
  type: "Deposit" | "Withdrawal" | "Bonus";
  method: string;
  amount: number;
  reference: string;
  submittedAt: string;
  processedAt?: string;
  status: PaymentStatus;
  notes?: string;
  slipUrl?: string;
  slipData?: any;
  rawDeposit?: Deposit;
  rawWithdrawal?: Withdrawal;
}

export const PaymentsPage: React.FC<{ onOpenManualPayment: () => void }> = ({
  onOpenManualPayment,
}) => {
  const {
    deposits,
    withdrawals,
    approveDeposit,
    rejectDeposit,
    approveWithdrawal,
    rejectWithdrawal,
    setSelectedClient,
    clients,
    companyConfig,
  } = usePortal();

  const [activeFilter, setActiveFilter] = useState<UnifiedFilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedSlipDeposit, setSelectedSlipDeposit] = useState<Deposit | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState<boolean>(false);

  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  // Build unified payments list from deposits and withdrawals
  const allPayments: UnifiedPaymentItem[] = useMemo(() => {
    const list: UnifiedPaymentItem[] = [];

    // 1. Deposits & Standalone Bonuses
    deposits.forEach((d) => {
      const hasMainAmount = d.amount > 0;
      const hasBonus = (d.bonusAmount || 0) > 0;

      if (hasMainAmount) {
        list.push({
          key: `dep-${d.id}`,
          id: d.id,
          login: d.login,
          clientName: d.clientName,
          type: "Deposit",
          method: d.method,
          amount: d.amount,
          reference: d.txHash || "-",
          submittedAt: d.createdAt,
          processedAt: d.processedAt,
          status: d.status,
          notes: d.notes,
          slipUrl: d.slipUrl,
          slipData: d.slipData,
          rawDeposit: d,
        });
      }

      // If deposit has a bonus attached, or is purely a bonus record
      if (hasBonus) {
        list.push({
          key: `bon-${d.id}`,
          id: hasMainAmount ? `bon-${d.id}` : d.id,
          login: d.login,
          clientName: d.clientName,
          type: "Bonus",
          method: hasMainAmount ? `${d.method} (Bonus)` : (d.method || "Credit Bonus"),
          amount: d.bonusAmount || 0,
          reference: hasMainAmount ? `Bonus on ${d.id}` : (d.txHash || "Manager Credit"),
          submittedAt: d.createdAt,
          processedAt: d.processedAt,
          status: d.status,
          notes: d.notes,
          rawDeposit: d,
        });
      }
    });

    // 2. Withdrawals
    withdrawals.forEach((w) => {
      list.push({
        key: `wth-${w.id}`,
        id: w.id,
        login: w.login,
        clientName: w.clientName,
        type: "Withdrawal",
        method: w.method,
        amount: w.amount,
        reference: w.destination || "-",
        submittedAt: w.createdAt,
        processedAt: w.processedAt,
        status: w.status,
        notes: w.reason,
        rawWithdrawal: w,
      });
    });

    // Sort by submittedAt descending (newest first)
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [deposits, withdrawals]);

  // Counts for pills
  const totalCount = allPayments.length;
  const depositsCount = allPayments.filter((p) => p.type === "Deposit").length;
  const withdrawalsCount = allPayments.filter((p) => p.type === "Withdrawal").length;
  const bonusCount = allPayments.filter((p) => p.type === "Bonus").length;
  const pendingCount = allPayments.filter((p) => p.status === "PENDING").length;

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return allPayments.filter((p) => {
      // Filter tab
      if (activeFilter === "DEPOSIT" && p.type !== "Deposit") return false;
      if (activeFilter === "WITHDRAWAL" && p.type !== "Withdrawal") return false;
      if (activeFilter === "BONUS" && p.type !== "Bonus") return false;
      if (activeFilter === "PENDING" && p.status !== "PENDING") return false;
      if (activeFilter === "APPROVED" && p.status !== "APPROVED") return false;
      if (activeFilter === "REJECTED" && p.status !== "REJECTED") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.login.toString().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.method.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allPayments, activeFilter, searchQuery]);

  // Totals for stats bar
  const pendingReviewAmount = useMemo(() => {
    return allPayments
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  const totalDepositAmount = useMemo(() => {
    return allPayments
      .filter((p) => p.type === "Deposit" && p.status === "APPROVED")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  const totalWithdrawalAmount = useMemo(() => {
    return allPayments
      .filter((p) => p.type === "Withdrawal" && p.status === "APPROVED")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  const totalBonusAmount = useMemo(() => {
    return allPayments
      .filter((p) => p.type === "Bonus" && p.status === "APPROVED")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  const handleOpenSlip = (item: UnifiedPaymentItem) => {
    if (item.rawDeposit) {
      setSelectedSlipDeposit(item.rawDeposit);
      setIsSlipModalOpen(true);
    }
  };

  const handleRowClick = (item: UnifiedPaymentItem) => {
    setSelectedItemId(item.key);
  };

  const handleClientClick = (login: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const c = clients.find((client) => client.login === login);
    if (c) setSelectedClient(c);
  };

  return (
    <div className="p-3 sm:p-3.5 space-y-2 animate-fadeIn font-sans select-none bg-[#f8fafc] flex flex-col h-[calc(100vh-65px)]">
      {/* Top Compact Excel Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white border border-slate-300 p-2 rounded-lg shadow-2xs">
        {/* Left: Title + Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 mr-1">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: brandPrimary }}
            />
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
              PAYMENTS
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredPayments.length} records
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none hidden sm:inline">|</span>

          {/* Unified Filter Pills */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px] overflow-x-auto">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "ALL"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalCount})
            </button>

            <button
              onClick={() => setActiveFilter("DEPOSIT")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "DEPOSIT"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Deposits ({depositsCount})
            </button>

            <button
              onClick={() => setActiveFilter("WITHDRAWAL")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "WITHDRAWAL"
                  ? "bg-rose-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Withdrawals ({withdrawalsCount})
            </button>

            <button
              onClick={() => setActiveFilter("BONUS")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "BONUS"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bonus ({bonusCount})
            </button>

            <button
              onClick={() => setActiveFilter("PENDING")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "PENDING"
                  ? "bg-amber-500 text-black font-extrabold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending ({pendingCount})
            </button>
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-2.5 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          {pendingCount > 0 && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-sans text-[10.5px]">Pending:</span>
                <strong className="text-amber-700 font-bold">
                  ${pendingReviewAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pendingCount})
                </strong>
              </div>
              <span className="text-slate-300 select-none">|</span>
            </>
          )}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Deposits:</span>
            <strong className="text-emerald-700 font-bold">
              ${totalDepositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Withdrawals:</span>
            <strong className="text-rose-700 font-bold">
              ${totalWithdrawalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
          </div>
          {totalBonusAmount > 0 && (
            <>
              <span className="text-slate-300 select-none">|</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-sans text-[10.5px]">Bonus:</span>
                <strong className="text-amber-700 font-bold">
                  ${totalBonusAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </>
          )}
        </div>

        {/* Right: Manual Payment + Search */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenManualPayment}
            className="px-2.5 py-1 rounded text-[10.5px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer"
            style={{ backgroundColor: brandPrimary }}
            title="Manual deposit / payment adjustment"
          >
            <PlusCircle className="w-3 h-3" />
            <span>Manual Payment</span>
          </button>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, name, method, ref..."
              className="w-full bg-[#f8fafc] border border-slate-300 rounded-md pl-7 pr-6 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs font-mono transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Excel-Style Dense Table Grid Container */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed">
            {/* Excel Table Header */}
            <thead className="sticky top-0 bg-[#e2e8f0] text-slate-800 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-300 z-10 select-none shadow-2xs">
              <tr>
                {/* 1. ID (Previously LOGIN) */}
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[95px] text-left">
                  ID
                </th>

                {/* 2. Name (Previously CLIENT) */}
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[170px] text-left">
                  Name
                </th>

                {/* 3. Type (New Column: Deposit / Withdrawal / Bonus) */}
                <th className="py-1.5 px-2 border-r border-slate-300 w-[110px] text-center">
                  Type
                </th>

                {/* 4. Method */}
                <th className="py-1.5 px-2 border-r border-slate-300 w-[110px] text-left">
                  Method
                </th>

                {/* 5. Amount */}
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[115px] text-right">
                  Amount
                </th>

                {/* 6. Reference / TxHash */}
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[190px] text-left">
                  Reference / TxHash
                </th>

                {/* 7. Submitted At */}
                <th className="py-1.5 px-2 border-r border-slate-300 w-[135px] text-left">
                  Submitted At
                </th>

                {/* 8. Slip */}
                <th className="py-1.5 px-2 border-r border-slate-300 w-[75px] text-center">
                  Slip
                </th>

                {/* 9. Status */}
                <th className="py-1.5 px-2.5 border-r border-slate-300 text-center w-[95px]">
                  Status
                </th>

                {/* 10. Actions */}
                <th className="py-1.5 px-2 text-center w-[110px]">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No payment records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p, index) => {
                  const isSelected = selectedItemId === p.key;
                  const isPending = p.status === "PENDING";
                  const isApproved = p.status === "APPROVED";

                  return (
                    <tr
                      key={p.key}
                      onClick={() => handleRowClick(p)}
                      onDoubleClick={() => handleOpenSlip(p)}
                      className={`cursor-pointer transition-colors duration-75 border-b border-slate-200 h-7.5 ${
                        isSelected
                          ? "bg-amber-100/90 font-bold border-l-4"
                          : index % 2 === 0
                          ? "bg-white hover:bg-slate-100/80"
                          : "bg-[#f8fafc] hover:bg-slate-100"
                      }`}
                      style={{
                        borderLeftColor: isSelected ? brandPrimary : "transparent",
                        backgroundColor: isSelected ? `${brandPrimary}15` : undefined,
                      }}
                      title="Click to select • Double-click to view slip"
                    >
                      {/* 1. ID (Formatted with #) */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-900">
                        #{p.login}
                      </td>

                      {/* 2. Name (Clickable to open Client drawer) */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-900 font-sans font-semibold text-[11.5px]">
                        <button
                          onClick={(e) => handleClientClick(p.login, e)}
                          className="hover:underline hover:text-blue-700 text-left truncate block w-full cursor-pointer"
                          title="Open client details"
                        >
                          {p.clientName}
                        </button>
                      </td>

                      {/* 3. Type: Deposit / Withdrawal / Bonus */}
                      <td className="py-1 px-2 border-r border-slate-200 text-center truncate">
                        {p.type === "Deposit" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <ArrowUpCircle className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Deposit</span>
                          </span>
                        )}
                        {p.type === "Withdrawal" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                            <ArrowDownCircle className="w-2.5 h-2.5 text-rose-600" />
                            <span>Withdrawal</span>
                          </span>
                        )}
                        {p.type === "Bonus" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            <Gift className="w-2.5 h-2.5 text-amber-600" />
                            <span>Bonus</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Method */}
                      <td className="py-1 px-2 border-r border-slate-200 truncate text-slate-700">
                        {p.method}
                      </td>

                      {/* 5. Amount */}
                      <td
                        className={`py-1 px-2.5 border-r border-slate-200 text-right truncate font-bold text-[11.5px] ${
                          p.type === "Deposit"
                            ? "text-emerald-700"
                            : p.type === "Withdrawal"
                            ? "text-rose-700"
                            : "text-amber-700"
                        }`}
                      >
                        {p.type === "Withdrawal" ? "-" : "+"}
                        ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 6. Reference / TxHash */}
                      <td
                        className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-600 select-all"
                        title={p.reference}
                      >
                        {p.reference}
                      </td>

                      {/* 7. Submitted At */}
                      <td className="py-1 px-2 border-r border-slate-200 truncate text-slate-500 text-[10.5px]">
                        {p.submittedAt}
                      </td>

                      {/* 8. Slip (Receipt image modal) */}
                      <td className="py-1 px-2 border-r border-slate-200 text-center truncate">
                        {p.slipUrl ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSlip(p);
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                            title="View Slip Document"
                          >
                            <FileText className="w-2.5 h-2.5 text-slate-500" />
                            <span>Slip</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* 9. Status */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-center truncate">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : isPending
                              ? "bg-amber-100 text-amber-900 border border-amber-400 font-extrabold animate-pulse"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* 10. Actions (Approve / Reject for Pending) */}
                      <td className="py-1 px-2 text-center truncate">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (p.rawDeposit) {
                                  approveDeposit(p.rawDeposit.id, p.rawDeposit.amount);
                                } else if (p.rawWithdrawal) {
                                  approveWithdrawal(p.rawWithdrawal.id);
                                }
                              }}
                              className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-[10px] font-bold transition-all shadow-2xs flex items-center gap-0.5 cursor-pointer"
                              title="Approve immediately"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (p.rawDeposit) {
                                  rejectDeposit(p.rawDeposit.id, "Rejected by Manager");
                                } else if (p.rawWithdrawal) {
                                  rejectWithdrawal(p.rawWithdrawal.id, "Rejected by Manager");
                                }
                              }}
                              className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[10px] font-bold transition-all shadow-2xs flex items-center gap-0.5 cursor-pointer"
                              title="Reject request"
                            >
                              <X className="w-2.5 h-2.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-sans">
                            {p.processedAt ? p.processedAt.split(" ")[0] : "Processed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip Document Modal */}
      {isSlipModalOpen && selectedSlipDeposit && (
        <DepositSlipModal
          deposit={selectedSlipDeposit}
          isOpen={isSlipModalOpen}
          onClose={() => {
            setIsSlipModalOpen(false);
            setSelectedSlipDeposit(null);
          }}
        />
      )}
    </div>
  );
};
