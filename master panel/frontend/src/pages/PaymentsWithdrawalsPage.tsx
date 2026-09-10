import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { PaymentStatus, Withdrawal } from "../types";
import { Search, Check, X } from "lucide-react";

export const PaymentsWithdrawalsPage: React.FC = () => {
  const {
    withdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    clients,
    setSelectedClient,
    companyConfig,
  } = usePortal();

  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);

  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const filteredWithdrawals = withdrawals.filter((w: Withdrawal) => {
    if (statusFilter !== "ALL" && w.status !== statusFilter) return false;
    const q = searchQuery.toLowerCase();
    return (
      w.login.toString().includes(q) ||
      w.clientName.toLowerCase().includes(q) ||
      w.destination.toLowerCase().includes(q)
    );
  });

  const pendingWithdrawals = withdrawals.filter((w: Withdrawal) => w.status === "PENDING");
  const pendingTotal = pendingWithdrawals.reduce((acc: number, w: Withdrawal) => acc + w.amount, 0);
  const approvedTotal = withdrawals
    .filter((w: Withdrawal) => w.status === "APPROVED")
    .reduce((acc: number, w: Withdrawal) => acc + w.amount, 0);

  const selectedWithdrawal = withdrawals.find((w) => w.id === selectedWithdrawalId);

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
              WITHDRAWALS
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredWithdrawals.length} records
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
                  ? `All (${withdrawals.length})`
                  : tab === "PENDING"
                  ? `Pending (${pendingWithdrawals.length})`
                  : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Pending Review:</span>
            <strong className="text-rose-700 font-bold">
              ${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pendingWithdrawals.length})
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

        {/* Right: Search */}
        <div className="relative w-56 sm:w-64">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search destination, login, client..."
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

      {/* Main Excel-Style Dense Table Grid Container */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed">
            {/* Excel Table Header */}
            <thead className="sticky top-0 bg-[#e2e8f0] text-slate-800 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-300 z-10 select-none shadow-2xs">
              <tr>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[95px] text-left">
                  ID
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[95px] text-left">
                  Login
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[180px] text-left">
                  Client
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[240px] text-left">
                  Destination / Payout Address
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[115px] text-right">
                  Amount
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[140px] text-left">
                  Requested At
                </th>
                <th className="py-1.5 px-2.5 text-center w-[110px]">
                  Status
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredWithdrawals.map((w: Withdrawal, index: number) => {
                const isSelected = selectedWithdrawalId === w.id;
                const isPending = w.status === "PENDING";
                const isApproved = w.status === "APPROVED";

                return (
                  <tr
                    key={w.id}
                    onClick={() => setSelectedWithdrawalId(w.id)}
                    onDoubleClick={() => {
                      const cl = clients.find((c) => c.login === w.login);
                      if (cl) setSelectedClient(cl);
                    }}
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
                    title="Click to select • Double-click to inspect client"
                  >
                    {/* ID */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-700">
                      {w.id}
                    </td>

                    {/* Login */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-900">
                      #{w.login}
                    </td>

                    {/* Client Name */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-900 font-sans font-semibold text-[11.5px]">
                      {w.clientName}
                    </td>

                    {/* Destination */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-600 text-[10.5px]">
                      {w.destination}
                    </td>

                    {/* Amount */}
                    <td className="py-1 px-2.5 border-r border-slate-200 text-right truncate font-bold text-rose-700 text-[11.5px]">
                      ${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Requested At */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-500 text-[10.5px]">
                      {w.createdAt}
                    </td>

                    {/* Status */}
                    <td className="py-1 px-2.5 text-center truncate">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-tight ${
                          isApproved
                            ? "bg-emerald-100 text-emerald-800"
                            : isPending
                            ? "bg-rose-100 text-rose-800 animate-pulse"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredWithdrawals.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No withdrawals matching "{searchQuery}"
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
              Showing {filteredWithdrawals.length} of {withdrawals.length} withdrawals
            </span>
            {selectedWithdrawal && (
              <>
                <span>•</span>
                <span className="text-slate-800 font-bold">
                  Selected: {selectedWithdrawal.id} (#{selectedWithdrawal.login})
                </span>
                <span className="text-rose-700 font-bold">
                  ${selectedWithdrawal.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedWithdrawal && selectedWithdrawal.status === "PENDING" && (
              <>
                <button
                  onClick={() => approveWithdrawal(selectedWithdrawal.id)}
                  className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Approve Payout</span>
                </button>
                <button
                  onClick={() => rejectWithdrawal(selectedWithdrawal.id)}
                  className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Reject</span>
                </button>
              </>
            )}

            <span className="text-slate-400 font-sans text-[10.5px]">
              Double-click row to view client profile
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
