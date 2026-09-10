import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Trade } from "../types";
import { Download, Search } from "lucide-react";

export interface TradingHistoryPageProps {
  embedded?: boolean;
}

export const TradingHistoryPage: React.FC<TradingHistoryPageProps> = ({ embedded = false }) => {
  const { closedTrades, clients, setSelectedClient, companyConfig } = usePortal();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [outcomeFilter, setOutcomeFilter] = useState<"ALL" | "WIN" | "LOSS">("ALL");
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);

  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const filteredHistory: Trade[] = closedTrades.filter((t: Trade) => {
    if (outcomeFilter === "WIN" && t.profit < 0) return false;
    if (outcomeFilter === "LOSS" && t.profit >= 0) return false;

    const q = searchQuery.toLowerCase();
    return (
      t.ticket.toString().includes(q) ||
      t.login.toString().includes(q) ||
      t.clientName.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q)
    );
  });

  // Performance metrics
  const totalClosedProfit = closedTrades.reduce((acc: number, t: Trade) => acc + t.profit, 0);
  const winCount = closedTrades.filter((t: Trade) => t.profit > 0).length;
  const lossCount = closedTrades.filter((t: Trade) => t.profit < 0).length;
  const winRate =
    closedTrades.length > 0 ? ((winCount / closedTrades.length) * 100).toFixed(1) : "0.0";
  const totalVolume = closedTrades.reduce((acc: number, t: Trade) => acc + t.lots, 0);

  // CSV Export
  const exportToCsv = () => {
    const headers = [
      "Ticket",
      "Login",
      "ClientName",
      "Symbol",
      "Type",
      "Lots",
      "OpenPrice",
      "ClosePrice",
      "OpenTime",
      "CloseTime",
      "Profit",
    ];

    const rows = filteredHistory.map((t: Trade) => [
      t.ticket,
      t.login,
      `"${t.clientName}"`,
      t.symbol,
      t.type,
      t.lots,
      t.openPrice,
      t.closePrice,
      t.openTime,
      t.closeTime,
      t.profit,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${companyConfig?.name || "MT5"}_Trade_History_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedTrade = closedTrades.find((t) => t.ticket === selectedTicket);

  return (
    <div
      className={
        embedded
          ? "space-y-2 animate-fadeIn font-sans select-none flex-1 min-h-0 flex flex-col"
          : "p-3 sm:p-3.5 space-y-2 animate-fadeIn font-sans select-none bg-[#f8fafc] flex flex-col h-[calc(100vh-65px)]"
      }
    >
      {/* Top Compact Excel Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white border border-slate-300 p-2 rounded-lg shadow-2xs">
        {/* Left: Title + Outcome Filter Pills */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: brandPrimary }}
            />
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
              TRADE HISTORY
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredHistory.length} closed
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none">|</span>

          {/* Outcome Filter Switcher */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px]">
            <button
              onClick={() => setOutcomeFilter("ALL")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                outcomeFilter === "ALL"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({closedTrades.length})
            </button>
            <button
              onClick={() => setOutcomeFilter("WIN")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                outcomeFilter === "WIN"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-emerald-700 hover:text-emerald-900"
              }`}
            >
              <span>Wins ({winCount})</span>
            </button>
            <button
              onClick={() => setOutcomeFilter("LOSS")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                outcomeFilter === "LOSS"
                  ? "bg-rose-700 text-white shadow-2xs"
                  : "text-rose-700 hover:text-rose-900"
              }`}
            >
              <span>Losses ({lossCount})</span>
            </button>
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Realized P&L:</span>
            <strong
              className={`font-bold ${
                totalClosedProfit >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {totalClosedProfit >= 0 ? "+" : ""}${totalClosedProfit.toFixed(2)}
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Win Rate:</span>
            <strong className="text-slate-900 font-bold">
              {winRate}% ({winCount}W / {lossCount}L)
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Volume:</span>
            <strong className="text-slate-800 font-bold">
              {totalVolume.toFixed(2)} lots
            </strong>
          </div>
        </div>

        {/* Right: CSV Export + Search */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCsv}
            className="px-2.5 py-1 rounded text-[10.5px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-all flex items-center gap-1 font-mono"
            title="Export trade history to CSV"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket, login, symbol..."
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
                  Ticket
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[95px] text-left">
                  ID
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[160px] text-left">
                  Name
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[85px] text-left">
                  Symbol
                </th>
                <th className="py-1.5 px-1.5 border-r border-slate-300 w-[65px] text-center">
                  Type
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[75px] text-right">
                  Lots
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[125px] text-left">
                  Open Time
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[125px] text-left">
                  Close Time
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[95px] text-right">
                  Open Price
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[95px] text-right">
                  Close Price
                </th>
                <th className="py-1.5 px-2.5 text-right w-[115px]">
                  Realized P&L
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows (h-7.5 compact height) */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredHistory.map((t: Trade, index: number) => {
                const isSelected = selectedTicket === t.ticket;
                const isBuy = t.type === "BUY";
                const isProfit = t.profit >= 0;

                return (
                  <tr
                    key={t.ticket}
                    onClick={() => setSelectedTicket(t.ticket)}
                    onDoubleClick={() => {
                      const cl = clients.find((c) => c.login === t.login);
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
                    {/* Ticket */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-700">
                      #{t.ticket}
                    </td>

                    {/* Login */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-900">
                      #{t.login}
                    </td>

                    {/* Client Name */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-900 font-sans font-semibold text-[11.5px]">
                      {t.clientName}
                    </td>

                    {/* Symbol */}
                    <td className="py-1 px-2 border-r border-slate-200 truncate font-bold text-slate-900">
                      {t.symbol}
                    </td>

                    {/* Type */}
                    <td className="py-1 px-1.5 border-r border-slate-200 text-center truncate">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-tight ${
                          isBuy
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>

                    {/* Volume (Lots) */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right truncate font-bold text-slate-900">
                      {(t.lots || 0).toFixed(2)}
                    </td>

                    {/* Open Time */}
                    <td className="py-1 px-2 border-r border-slate-200 truncate text-slate-500 text-[10.5px]">
                      {t.openTime}
                    </td>

                    {/* Close Time */}
                    <td className="py-1 px-2 border-r border-slate-200 truncate text-slate-500 text-[10.5px]">
                      {t.closeTime || "-"}
                    </td>

                    {/* Open Price */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right truncate text-slate-800">
                      {(t.openPrice || 0).toFixed(5)}
                    </td>

                    {/* Close Price */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right truncate text-slate-800 font-bold">
                      {t.closePrice ? Number(t.closePrice).toFixed(5) : "-"}
                    </td>

                    {/* Realized P&L */}
                    <td
                      className={`py-1 px-2.5 text-right truncate font-black text-[11.5px] ${
                        isProfit ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {isProfit ? "+" : ""}${t.profit.toFixed(2)}
                    </td>
                  </tr>
                );
              })}

              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No closed trades matching "{searchQuery}"
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
              Showing {filteredHistory.length} of {closedTrades.length} historical trades
            </span>
            {selectedTicket && (
              <>
                <span>•</span>
                <span className="text-slate-800 font-bold">
                  Selected Ticket: #{selectedTicket}
                </span>
                {selectedTrade && (
                  <span
                    className={`font-black ${
                      selectedTrade.profit >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    ({selectedTrade.profit >= 0 ? "+" : ""}${selectedTrade.profit.toFixed(2)})
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-sans">
              Double-click row to view client
            </span>
            <span>•</span>
            <button
              onClick={exportToCsv}
              className="px-2 py-0.5 rounded text-[10px] font-bold border bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs transition-all"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
