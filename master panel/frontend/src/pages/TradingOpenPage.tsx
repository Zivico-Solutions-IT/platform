import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Trade } from "../types";
import {
  Search,
  CheckCircle2,
  XCircle,
  Layers,
  Check,
} from "lucide-react";

export interface TradingOpenPageProps {
  embedded?: boolean;
}

export const TradingOpenPage: React.FC<TradingOpenPageProps> = ({ embedded = false }) => {
  const {
    openTrades,
    closeTrade,
    closeAllTrades,
    clients,
    setSelectedClient,
    companyConfig,
  } = usePortal();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [symbolFilter, setSymbolFilter] = useState<string>("All");
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);

  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const filteredTrades: Trade[] = openTrades.filter((t: Trade) => {
    if (symbolFilter !== "All" && t.symbol !== symbolFilter) return false;
    const q = searchQuery.toLowerCase();
    return (
      t.ticket.toString().includes(q) ||
      t.login.toString().includes(q) ||
      t.clientName.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q)
    );
  });

  // Analytics
  const totalProfit = openTrades.reduce((acc: number, t: Trade) => acc + t.profit, 0);
  const totalBuyLots = openTrades
    .filter((t: Trade) => t.type === "BUY")
    .reduce((acc: number, t: Trade) => acc + t.lots, 0);
  const totalSellLots = openTrades
    .filter((t: Trade) => t.type === "SELL")
    .reduce((acc: number, t: Trade) => acc + t.lots, 0);
  const totalCommissions = openTrades.reduce((acc: number, t: Trade) => acc + t.commission, 0);
  const totalSwaps = openTrades.reduce((acc: number, t: Trade) => acc + t.swap, 0);

  const uniqueSymbols: string[] = Array.from(new Set(openTrades.map((t: Trade) => t.symbol)));

  const selectedTrade = openTrades.find((t) => t.ticket === selectedTicket);

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
        {/* Left: Title + Symbol Filter Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: brandPrimary }}
            />
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
              OPEN TRADES
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredTrades.length} positions
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none">|</span>

          {/* Symbol Filter */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-xs sm:max-w-md">
            <button
              onClick={() => setSymbolFilter("All")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                symbolFilter === "All"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-300"
              }`}
            >
              All
            </button>
            {uniqueSymbols.map((sym: string) => (
              <button
                key={sym}
                onClick={() => setSymbolFilter(sym)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                  symbolFilter === sym
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-300"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Floating P&L:</span>
            <strong
              className={`font-bold ${
                totalProfit >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Volume:</span>
            <strong className="text-slate-900 font-bold">
              {totalBuyLots.toFixed(2)}B / {totalSellLots.toFixed(2)}S
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Commissions:</span>
            <strong className="text-slate-800 font-bold">
              -${Math.abs(totalCommissions).toFixed(2)}
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Swaps:</span>
            <strong
              className={`font-bold ${
                totalSwaps >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {totalSwaps >= 0 ? "+" : ""}${totalSwaps.toFixed(2)}
            </strong>
          </div>
        </div>

        {/* Right: Close All Buttons & Search */}
        <div className="flex items-center gap-2">
          {openTrades.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => closeAllTrades(true)}
                className="px-2 py-1 rounded text-[10.5px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs transition-all flex items-center gap-1"
                title="Close all positions currently in profit"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Close Profitable</span>
              </button>
              <button
                onClick={() => closeAllTrades(false)}
                className="px-2 py-1 rounded text-[10.5px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs transition-all flex items-center gap-1"
                title="Emergency liquidation: close all open positions"
              >
                <XCircle className="w-3 h-3 text-rose-600" />
                <span>Liquidate All</span>
              </button>
            </div>
          )}

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
                <th className="py-1.5 px-2 border-r border-slate-300 w-[95px] text-right">
                  Open Price
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[95px] text-right">
                  Live Price
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[110px] text-center">
                  SL / TP
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[70px] text-right">
                  Swap
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[75px] text-right">
                  Comm.
                </th>
                <th className="py-1.5 px-2.5 text-right w-[110px]">
                  P&L ($)
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows (h-7.5 compact height) */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredTrades.map((t: Trade, index: number) => {
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
                      {t.lots.toFixed(2)}
                    </td>

                    {/* Open Time */}
                    <td className="py-1 px-2 border-r border-slate-200 truncate text-slate-500 text-[10.5px]">
                      {t.openTime}
                    </td>

                    {/* Open Price */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right truncate text-slate-800">
                      {t.openPrice.toFixed(5)}
                    </td>

                    {/* Live Price */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right truncate text-slate-800 font-bold">
                      {t.currentPrice.toFixed(5)}
                    </td>

                    {/* SL / TP */}
                    <td className="py-1 px-2 border-r border-slate-200 text-center truncate text-[10px] text-slate-500">
                      {t.sl ? t.sl.toFixed(4) : "-"}{" "}
                      <span className="text-slate-300">/</span>{" "}
                      {t.tp ? t.tp.toFixed(4) : "-"}
                    </td>

                    {/* Swap */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right truncate text-[10.5px] text-slate-500">
                      {t.swap.toFixed(2)}
                    </td>

                    {/* Commission */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right truncate text-[10.5px] text-slate-500">
                      {t.commission.toFixed(2)}
                    </td>

                    {/* Floating P&L */}
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

              {filteredTrades.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No open positions matching "{searchQuery}"
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
              Showing {filteredTrades.length} of {openTrades.length} open positions
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
              onClick={() => selectedTicket && closeTrade(selectedTicket)}
              disabled={!selectedTicket}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                selectedTicket
                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 shadow-2xs"
                  : "opacity-40 cursor-not-allowed border-transparent text-slate-400"
              }`}
            >
              Close Position
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
