import React, { useState, useMemo } from "react";
import { usePortal } from "../../context/PortalContext";

const CATEGORY_TABS = ["All", "Forex", "Metals", "Crypto", "Indices"] as const;
type CategoryTab = typeof CATEGORY_TABS[number];

interface MarketWatchSymbolPanelProps {
  selectedSymbolCode: string;
  onSelectSymbol: (symbolCode: string) => void;
  className?: string;
}

export const MarketWatchSymbolPanel: React.FC<MarketWatchSymbolPanelProps> = ({
  selectedSymbolCode,
  onSelectSymbol,
  className = "",
}) => {
  const { symbols, companyConfig } = usePortal();
  const [activeTab, setActiveTab] = useState<CategoryTab>("All");
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const filteredSymbols = useMemo(() => {
    return symbols.filter((s) => {
      if (activeTab === "All") return true;
      const cat = (s.category || "").toLowerCase();
      const sym = s.symbol.replace("/", "").toUpperCase();
      if (activeTab === "Forex") return cat.includes("forex");
      if (activeTab === "Metals") return cat.includes("metal") || sym.startsWith("XAU") || sym.startsWith("XAG") || sym.startsWith("XPT") || sym.startsWith("XPD");
      if (activeTab === "Crypto") return cat.includes("crypto");
      if (activeTab === "Indices") return cat.includes("indic") || sym.includes("US30") || sym.includes("NAS") || sym.includes("SPX") || sym.includes("DAX");
      return true;
    });
  }, [symbols, activeTab]);

  const selectedSymbol = symbols.find(
    (s) => s.symbol === selectedSymbolCode || s.symbol.replace("/", "") === selectedSymbolCode.replace("/", "")
  );

  return (
    <div className={`bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-full font-sans select-none ${className}`}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: brandPrimary }} />
          <span className="font-black text-sm tracking-wide text-slate-800">MARKET WATCH</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold text-slate-600">
            {filteredSymbols.length} pairs
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            LIVE REAL-TIME FEED
          </span>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-0.5">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? "bg-slate-800 text-white font-bold shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_80px_80px_56px] px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">
        <span>INSTRUMENT</span>
        <span className="text-right">BID</span>
        <span className="text-right">ASK</span>
        <span className="text-right">SPREAD</span>
      </div>

      {/* Symbol Rows */}
      <div className="overflow-y-auto flex-1 font-mono divide-y divide-slate-50">
        {filteredSymbols.map((item) => {
          const isSelected =
            selectedSymbolCode === item.symbol ||
            selectedSymbolCode.replace("/", "") === item.symbol.replace("/", "");
          const isUp = item.changeDirection === "up" || (item.dailyChange || 0) >= 0;

          return (
            <div
              key={item.id || item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`grid grid-cols-[1fr_80px_80px_56px] items-center px-3 py-2 cursor-pointer transition-colors duration-100 ${
                isSelected
                  ? "bg-amber-50 border-l-2 border-l-amber-500"
                  : "hover:bg-slate-50"
              }`}
            >
              {/* INSTRUMENT */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? brandPrimary : (isUp ? "#10b981" : "#ef4444") }}
                />
                <span className={`text-xs font-semibold truncate ${isSelected ? "font-extrabold text-slate-900" : "text-slate-700"}`}>
                  {item.symbol}
                </span>
              </div>

              {/* BID */}
              <div className="text-right text-xs font-semibold">
                <span className="text-rose-600 font-bold">{item.bid.toFixed(item.digits)}</span>
              </div>

              {/* ASK */}
              <div className="text-right text-xs font-semibold">
                <span className="text-emerald-600 font-bold">{item.ask.toFixed(item.digits)}</span>
              </div>

              {/* SPREAD */}
              <div className="text-right text-xs text-slate-500 font-medium">
                {item.spread ?? "-"}
              </div>
            </div>
          );
        })}

        {filteredSymbols.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs font-sans">
            No symbols in this category
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-slate-50 font-mono text-[10.5px] text-slate-500 shrink-0">
        <span>Active: <strong className="text-slate-800">{selectedSymbolCode}</strong></span>
        <span>Spread: <strong className="text-slate-800">{selectedSymbol?.spread ?? "-"}</strong></span>
      </div>
    </div>
  );
};
