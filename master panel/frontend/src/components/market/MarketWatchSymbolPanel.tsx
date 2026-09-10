import React, { useState, useMemo, useEffect, useRef } from "react";
import { usePortal } from "../../context/PortalContext";
import { SymbolData } from "../../types";
import { Search, Star, ChevronDown, Activity, Layers } from "lucide-react";

const CATEGORY_OPTIONS = [
  "Popular",
  "Forex",
  "Crypto CFD",
  "Metals",
  "Energies",
  "Indices",
  "All",
] as const;

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

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Forex");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState<boolean>(false);

  const [favoriteSymbols, setFavoriteSymbols] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("MASTER_PANEL_FAVORITE_SYMBOLS");
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not read favorite symbols from localStorage", e);
    }
    return new Set(["EUR/USD", "XAU/USD", "BTC/USD", "ADA/USD"]);
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Toggle favorite symbol
  const toggleFavorite = (symbolCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(symbolCode)) {
        next.delete(symbolCode);
      } else {
        next.add(symbolCode);
      }
      try {
        localStorage.setItem(
          "MASTER_PANEL_FAVORITE_SYMBOLS",
          JSON.stringify(Array.from(next))
        );
      } catch (err) {
        console.warn("Failed to save favorites:", err);
      }
      return next;
    });
  };

  const isFavoritesMode = selectedCategory === "Favorites";

  // Filter symbols based on category & search query
  const filteredSymbols = useMemo(() => {
    return symbols.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const cleanCode = s.symbol.replace("/", "").toUpperCase();
      const catLower = (s.category || "").toLowerCase();

      const matchesSearch =
        !q ||
        s.symbol.toLowerCase().includes(q) ||
        cleanCode.toLowerCase().includes(q) ||
        catLower.includes(q);

      if (!matchesSearch) return false;

      if (isFavoritesMode) return favoriteSymbols.has(s.symbol) || favoriteSymbols.has(cleanCode);
      if (selectedCategory === "All") return true;

      if (selectedCategory === "Popular") {
        return (
          s.popular === true ||
          [
            "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "ADA/USD", "WTI/USD", "DJI/USD",
            "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD", "ADAUSD", "WTIUSD", "US30", "SOLUSD", "ETHUSD"
          ].includes(s.symbol) ||
          [
            "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD", "ADAUSD", "WTIUSD", "US30", "SOLUSD", "ETHUSD"
          ].includes(cleanCode)
        );
      }

      if (selectedCategory === "Crypto CFD" || selectedCategory === "Crypto") {
        return s.category === "Crypto CFD" || s.category === "Crypto" || catLower.includes("crypto");
      }

      if (selectedCategory === "Energies" || selectedCategory === "Energy") {
        return (
          s.category === "Energies" ||
          catLower.includes("energ") ||
          cleanCode.includes("WTI") ||
          cleanCode.includes("BRN") ||
          cleanCode.includes("NGC")
        );
      }

      if (selectedCategory === "Forex") {
        return s.category === "Forex" || catLower.includes("forex");
      }

      if (selectedCategory === "Metals") {
        return (
          s.category === "Metals" ||
          catLower.includes("metal") ||
          cleanCode.startsWith("XAU") ||
          cleanCode.startsWith("XAG") ||
          cleanCode.startsWith("XPT") ||
          cleanCode.startsWith("XPD")
        );
      }

      if (selectedCategory === "Indices") {
        return (
          s.category === "Indices" ||
          catLower.includes("indic") ||
          cleanCode.includes("US30") ||
          cleanCode.includes("DJI") ||
          cleanCode.includes("SPX") ||
          cleanCode.includes("NDX") ||
          cleanCode.includes("DAX") ||
          cleanCode.includes("NIK")
        );
      }

      return s.category === selectedCategory || catLower === selectedCategory.toLowerCase();
    });
  }, [symbols, searchQuery, selectedCategory, isFavoritesMode, favoriteSymbols]);

  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  return (
    <div
      className={`bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex flex-col h-full font-sans select-none ${className}`}
    >
      {/* Header Bar matching User Side (SymbolPanel / ChartSymbolPanel) */}
      <div className="p-3 border-b border-slate-200 bg-white flex flex-col gap-2.5 shrink-0 z-20">
        {/* Category Dropdown Select + Favorites Button */}
        <div className="flex items-center gap-2 relative">
          {/* Category Dropdown Select */}
          <div ref={dropdownRef} className="relative flex-1">
            <button
              type="button"
              onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md text-xs font-semibold text-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              <span className="truncate">{selectedCategory}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {isCategoryMenuOpen && (
              <div className="absolute left-0 right-0 top-10 bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-30 animate-fadeIn">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCategoryMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Favorites Star Toggle Button */}
          <button
            type="button"
            onClick={() => setSelectedCategory(isFavoritesMode ? "Forex" : "Favorites")}
            className={`flex items-center justify-center gap-1.5 px-3 h-9 rounded-md border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              isFavoritesMode
                ? "bg-amber-400 text-slate-950 border-amber-500 font-bold"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300"
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isFavoritesMode ? "fill-slate-950 text-slate-950" : "text-amber-500 fill-amber-400"
              }`}
            />
            <span>Favorites</span>
            {favoriteSymbols.size > 0 && (
              <span className="ml-0.5 text-[10px] font-mono font-bold px-1 rounded-full bg-slate-200 text-slate-800">
                {favoriteSymbols.size}
              </span>
            )}
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-300 rounded-md pl-8 pr-7 h-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white font-mono shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Column Headers matching User Side: Symbols / Vol, Bid, Ask */}
      <div className="flex items-center px-3 py-2 bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 select-none">
        <span className="flex-1 font-bold">Symbols / Vol</span>
        <span className="w-20 text-right pr-2 font-bold">Bid</span>
        <span className="w-20 text-right font-bold">Ask</span>
      </div>

      {/* Main Symbols Scroll List */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
        {filteredSymbols.map((item) => {
          const isSelected =
            selectedSymbolCode === item.symbol ||
            selectedSymbolCode.replace("/", "") === item.symbol.replace("/", "");
          const isFavorite = favoriteSymbols.has(item.symbol);
          const isUp = item.changeDirection === "up";

          return (
            <div
              key={item.id || item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className={`flex items-center px-3 py-2.5 h-[48px] cursor-pointer transition-colors duration-100 ${
                isSelected
                  ? "bg-amber-100/90 font-bold border-l-4 border-l-amber-500"
                  : "bg-white hover:bg-slate-50"
              }`}
            >
              {/* Star + Symbol Name + Category Group */}
              <div className="flex items-center flex-1 min-w-0 pr-2 gap-2">
                <button
                  onClick={(e) => toggleFavorite(item.symbol, e)}
                  className="p-1 hover:scale-110 transition-transform cursor-pointer shrink-0"
                >
                  <Star
                    className={`w-4 h-4 ${
                      isFavorite
                        ? "text-amber-500 fill-amber-400"
                        : "text-slate-300 hover:text-slate-400"
                    }`}
                  />
                </button>
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-xs font-semibold truncate ${
                      isSelected ? "text-slate-950 font-extrabold" : "text-slate-800"
                    }`}
                  >
                    {item.symbol}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">
                    {item.category}
                  </span>
                </div>
              </div>

              {/* Bid Quote */}
              <div className="w-20 text-right pr-2 font-mono text-xs font-semibold shrink-0">
                <span className={isUp ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                  {item.bid.toFixed(item.digits)}
                </span>
              </div>

              {/* Ask Quote */}
              <div className="w-20 text-right font-mono text-xs font-semibold shrink-0">
                <span className={isUp ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                  {item.ask.toFixed(item.digits)}
                </span>
              </div>
            </div>
          );
        })}

        {filteredSymbols.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-400 font-sans text-xs">
            <Star className="w-6 h-6 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No symbols found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Try switching category or clearing search filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
