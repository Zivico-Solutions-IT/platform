import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { PaymentStatus, Deposit } from "../types";
import { Search, PlusCircle, FileText, Check, X } from "lucide-react";
import { DepositSlipModal } from "../components/modals/DepositSlipModal";

export const PaymentsDepositsPage: React.FC<{ onOpenBalanceModal: () => void }> = ({
  onOpenBalanceModal,
}) => {
  const {
    deposits,
    approveDeposit,
    rejectDeposit,
    setSelectedClient,
    clients,
    companyConfig,
  } = usePortal();

  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [selectedSlipDeposit, setSelectedSlipDeposit] = useState<Deposit | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState<boolean>(false);

  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const handleOpenSlip = (deposit: Deposit) => {
    setSelectedSlipDeposit(deposit);
    setIsSlipModalOpen(true);
  };

  const filteredDeposits: Deposit[] = deposits.filter((d: Deposit) => {
    if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
    const q = searchQuery.toLowerCase();
    return (
      d.login.toString().includes(q) ||
      d.clientName.toLowerCase().includes(q) ||
      d.method.toLowerCase().includes(q) ||
      d.txHash.toLowerCase().includes(q)
    );
  });

  const pendingDeposits = deposits.filter((d: Deposit) => d.status === "PENDING");
  const pendingTotal = pendingDeposits.reduce((acc: number, d: Deposit) => acc + d.amount, 0);
  const approvedTotal = deposits
    .filter((d: Deposit) => d.status === "APPROVED")
    .reduce((acc: number, d: Deposit) => acc + d.amount, 0);

  const selectedDeposit = deposits.find((d) => d.id === selectedDepositId);

  return (
    <div className="p-3 sm:p-3.5 space-y-2 animate-fadeIn font-sans select-none bg-[#f8fafc] flex flex-col h-[calc(100vh-65px)]">
      {/* Top Compact Excel Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white border border-slate-300 p-2 rounded-lg shadow-2xs">
        {/* Left: Title + Status Filter Pills */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: brandPrimary }}
            />
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
              DEPOSITS
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredDeposits.length} records
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none">|</span>

          {/* Status Filter */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px]">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  statusFilter === tab
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "ALL"
                  ? `All (${deposits.length})`
                  : tab === "PENDING"
                  ? `Pending (${pendingDeposits.length})`
                  : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Pending Review:</span>
            <strong className="text-amber-700 font-bold">
              ${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pendingDeposits.length})
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Approved Total:</span>
            <strong className="text-emerald-700 font-bold">
              ${approvedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Right: Add Deposit + Search */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenBalanceModal}
            className="px-2.5 py-1 rounded text-[10.5px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95"
            style={{ backgroundColor: brandPrimary }}
            title="Manual deposit / balance adjustment"
          >
            <PlusCircle className="w-3 h-3" />
            <span>Manual Deposit</span>
          </button>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search login, client, tx..."
              className="w-full bg-[#f8fafc] border border-slate-300 rounded-md pl-7 pr-6 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs font-mono transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
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
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[95px] text-left">
                  ID / Tx
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[95px] text-left">
                  Login
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[170px] text-left">
                  Client
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[100px] text-left">
                  Method
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[110px] text-right">
                  Amount
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[180px] text-left">
                  Reference / TxHash
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[130px] text-left">
                  Submitted At
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[80px] text-center">
                  Slip
                </th>
                <th className="py-1.5 px-2.5 text-center w-[100px]">
                  Status
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredDeposits.map((d: Deposit, index: number) => {
                const isSelected = selectedDepositId === d.id;
                const isPending = d.status === "PENDING";
                const isApproved = d.status === "APPROVED";

                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedDepositId(d.id)}
                    onDoubleClick={() => handleOpenSlip(d)}
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
                    {/* ID / Tx */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-700">
                      {d.id}
                    </td>

                    {/* Login */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-900">
                      #{d.login}
                    </td>

                    {/* Client Name */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-900 font-sans font-semibold text-[11.5px]">
                      {d.clientName}
                    </td>

                    {/* Method */}
                    <td className="py-1 px-2 border-r border-slate-200 truncate text-slate-700">
                      {d.method}
                    </td>

                    {/* Amount */}
                    <td className="py-1 px-2.5 border-r border-slate-200 text-right truncate font-bold text-emerald-700 text-[11.5px]">
                      ${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Tx Hash */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-500 text-[10.5px]">
                      {d.txHash || "-"}
                    </td>

                    {/* Submitted At */}
                    <td className="py-1 px-2 border-r border-slate-200 truncate text-slate-500 text-[10.5px]">
                      {d.createdAt}
                    </td>

                    {/* Slip Preview Button */}
                    <td
                      className="py-1 px-2 border-r border-slate-200 text-center truncate"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSlip(d);
                      }}
                    >
                      <button
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs"
                        title="View slip proof"
                      >
                        <FileText className="w-2.5 h-2.5 text-slate-500" />
                        <span>Slip</span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-1 px-2.5 text-center truncate">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-tight ${
                          isApproved
                            ? "bg-emerald-100 text-emerald-800"
                            : isPending
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredDeposits.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No deposits matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Excel Bottom Status Strip */}
        <div className="px-3 py-1 bg-[#f1f5f9] border-t border-slate-300 flex flex-wrap items-center justify-between text-[10.5px] text-slate-600 font-mono shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Excel Grid View
            </span>
            <span>•</span>
            <span>
              Showing {filteredDeposits.length} of {deposits.length} deposits
            </span>
            {selectedDeposit && (
              <>
                <span>•</span>
                <span className="text-slate-800 font-bold">
                  Selected: {selectedDeposit.id} (#{selectedDeposit.login})
                </span>
                <span className="text-emerald-700 font-bold">
                  ${selectedDeposit.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedDeposit && selectedDeposit.status === "PENDING" && (
              <>
                <button
                  onClick={() => approveDeposit(selectedDeposit.id)}
                  className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => rejectDeposit(selectedDeposit.id)}
                  className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Reject</span>
                </button>
              </>
            )}

            {selectedDeposit && (
              <button
                onClick={() => handleOpenSlip(selectedDeposit)}
                className="px-2 py-0.5 rounded text-[10px] font-bold border bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs transition-all"
              >
                View Slip
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slip Preview Modal */}
      <DepositSlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        deposit={selectedSlipDeposit}
      />
    </div>
  );
};
