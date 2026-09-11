import React, { useMemo, useState } from "react";
import { usePortal } from "../../context/PortalContext";

type WatchCategory = "All" | "Forex" | "Metals" | "Crypto" | "Indices";

interface MarketWatchSymbolPanelProps {
  selectedSymbolCode: string;
  onSelectSymbol: (symbolCode: string) => void;
  className?: string;
}

const categories: WatchCategory[] = ["All", "Forex", "Metals", "Crypto", "Indices"];

export const MarketWatchSymbolPanel: React.FC<MarketWatchSymbolPanelProps> = ({ selectedSymbolCode, onSelectSymbol, className = "" }) => {
  const { symbols, companyConfig } = usePortal();
  const [selectedCategory, setSelectedCategory] = useState<WatchCategory>("All");
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const visibleSymbols = useMemo(() => symbols.filter((symbol) => {
    if (selectedCategory === "All") return true;
    const category = (symbol.category || "").toLowerCase();
    return selectedCategory === "Crypto" ? category.includes("crypto") : category.includes(selectedCategory.toLowerCase());
  }), [selectedCategory, symbols]);

  const selectedSymbol = symbols.find((symbol) =>
    symbol.symbol === selectedSymbolCode || symbol.symbol.replace("/", "") === selectedSymbolCode.replace("/", "")
  );

  return (
    <section className={`bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex flex-col h-full font-sans select-none ${className}`}>
      <header className="px-3 pt-3 pb-2 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: brandPrimary }} />
          <h2 className="font-mono text-xs font-black tracking-wider text-slate-900">MARKET WATCH</h2>
          <span className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-100 font-mono text-[10px] font-bold text-slate-700">{visibleSymbols.length} pairs</span>
        </div>
        <nav className="inline-flex mt-2 rounded-md border border-slate-300 bg-slate-100 p-0.5">
          {categories.map((category) => (
            <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${selectedCategory === category ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}>
              {category}
            </button>
          ))}
        </nav>
      </header>

      <div className="grid grid-cols-[1.35fr_0.92fr_0.92fr_0.62fr] border-b border-slate-300 bg-[#e2e8f0] font-mono text-[10.5px] font-black uppercase tracking-wider text-slate-800 shrink-0">
        <span className="px-3 py-2 border-r border-slate-300">Instrument</span><span className="px-2 py-2 border-r border-slate-300 text-right">Bid</span><span className="px-2 py-2 border-r border-slate-300 text-right">Ask</span><span className="px-2 py-2 text-right">Spread</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-200 font-mono">
        {visibleSymbols.map((symbol, index) => {
          const isSelected = selectedSymbolCode.replace("/", "") === symbol.symbol.replace("/", "");
          const quoteClass = symbol.changeDirection === "up" ? "text-emerald-600" : "text-rose-600";
          return (
            <button key={symbol.id || symbol.symbol} type="button" onClick={() => onSelectSymbol(symbol.symbol)} className={`w-full grid grid-cols-[1.35fr_0.92fr_0.92fr_0.62fr] items-center min-h-9 text-left transition-colors cursor-pointer ${isSelected ? "bg-amber-50 border-l-4 font-bold" : index % 2 === 0 ? "bg-white hover:bg-slate-50 border-l-4 border-l-transparent" : "bg-slate-50/70 hover:bg-slate-100 border-l-4 border-l-transparent"}`} style={{ borderLeftColor: isSelected ? brandPrimary : undefined }}>
              <span className="px-2.5 truncate text-xs font-bold text-slate-900">{isSelected && <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: brandPrimary }} />}{symbol.symbol.replace("/", "")}</span>
              <span className={`px-2 text-right text-xs font-bold ${quoteClass}`}>{Number(symbol.bid || 0).toFixed(symbol.digits)}</span>
              <span className={`px-2 text-right text-xs font-bold ${quoteClass}`}>{Number(symbol.ask || 0).toFixed(symbol.digits)}</span>
              <span className="px-2 text-right text-xs font-bold text-slate-600">{symbol.spread}</span>
            </button>
          );
        })}
      </div>

      <footer className="flex items-center justify-between px-3 py-2 border-t border-slate-300 bg-slate-50 font-mono text-[10.5px] text-slate-500 shrink-0">
        <span>Active: <strong className="text-slate-900">{selectedSymbol?.symbol.replace("/", "") || "-"}</strong></span><span>Spread: <strong className="text-slate-900">{selectedSymbol?.spread ?? "-"}</strong></span>
      </footer>
    </section>
  );
};
