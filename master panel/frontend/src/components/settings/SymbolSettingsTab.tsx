import React, { useState, useMemo, useEffect } from "react";
import { usePortal } from "../../context/PortalContext";
import { api } from "../../services/api";
import {
  Search,
  RotateCcw,
  Save,
  Check,
  X,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Loader2,
  RefreshCw,
} from "lucide-react";

export type SymbolCategoryType = "ALL" | "CRYPTO" | "FOREX" | "INDICES" | "METALS" | "ENERGIES";

export interface SymbolVisibilityItem {
  id: string;
  symbol: string;
  category: "CRYPTO" | "FOREX" | "INDICES" | "METALS" | "ENERGIES";
  description: string;
  contractSpec: string;
  enabled: boolean;
}

function normalizeCategory(group: string): "CRYPTO" | "FOREX" | "INDICES" | "METALS" | "ENERGIES" {
  const g = (group || "").toUpperCase();
  if (g.includes("CRYPTO")) return "CRYPTO";
  if (g.includes("FOREX")) return "FOREX";
  if (g.includes("INDICES") || g.includes("INDEX")) return "INDICES";
  if (g.includes("METALS") || g.includes("METAL")) return "METALS";
  if (g.includes("ENERGIES") || g.includes("ENERGY") || g.includes("OIL")) return "ENERGIES";
  return "FOREX";
}

function generateContractSpec(symbol: string, category: string): string {
  if (category === "CRYPTO") return "1 Token • Floating";
  if (category === "FOREX") return "100,000 Lot • 5 Digits";
  if (category === "INDICES") return "10 Index • 2 Digits";
  if (category === "METALS") return "100 Ounces • 2 Digits";
  if (category === "ENERGIES") return "1,000 Barrels • 2 Digits";
  return "Standard Contract";
}

const DEFAULT_SYMBOLS_LIST: SymbolVisibilityItem[] = [
  // CRYPTO
  { id: "sym-1", symbol: "AAVE/USD", category: "CRYPTO", description: "Aave Protocol Token", contractSpec: "1 Token • Floating", enabled: true },
  { id: "sym-2", symbol: "ADA/USD", category: "CRYPTO", description: "Cardano vs US Dollar", contractSpec: "100 ADA • Floating", enabled: true },
  { id: "sym-3", symbol: "APE/USD", category: "CRYPTO", description: "ApeCoin vs US Dollar", contractSpec: "10 APE • Floating", enabled: true },
  { id: "sym-4", symbol: "APT/USD", category: "CRYPTO", description: "Aptos Network vs US Dollar", contractSpec: "1 APT • Floating", enabled: true },
  { id: "sym-5", symbol: "ARB/USD", category: "CRYPTO", description: "Arbitrum vs US Dollar", contractSpec: "100 ARB • Floating", enabled: true },
  { id: "sym-6", symbol: "ATOM/USD", category: "CRYPTO", description: "Cosmos vs US Dollar", contractSpec: "1 ATOM • Floating", enabled: true },
  { id: "sym-7", symbol: "AVAX/USD", category: "CRYPTO", description: "Avalanche vs US Dollar", contractSpec: "1 AVAX • Floating", enabled: true },
  { id: "sym-8", symbol: "BTC/USD", category: "CRYPTO", description: "Bitcoin vs US Dollar", contractSpec: "1 BTC • 0.01 Min Lot", enabled: true },
  { id: "sym-9", symbol: "ETH/USD", category: "CRYPTO", description: "Ethereum vs US Dollar", contractSpec: "1 ETH • 0.01 Min Lot", enabled: true },
  { id: "sym-10", symbol: "SOL/USD", category: "CRYPTO", description: "Solana vs US Dollar", contractSpec: "1 SOL • Floating", enabled: true },
  { id: "sym-11", symbol: "XRP/USD", category: "CRYPTO", description: "Ripple vs US Dollar", contractSpec: "100 XRP • Floating", enabled: true },

  // FOREX
  { id: "sym-12", symbol: "EUR/USD", category: "FOREX", description: "Euro vs US Dollar", contractSpec: "100,000 EUR • 5 Digits", enabled: true },
  { id: "sym-13", symbol: "GBP/USD", category: "FOREX", description: "Great Britain Pound vs US Dollar", contractSpec: "100,000 GBP • 5 Digits", enabled: true },
  { id: "sym-14", symbol: "USD/JPY", category: "FOREX", description: "US Dollar vs Japanese Yen", contractSpec: "100,000 USD • 3 Digits", enabled: true },
  { id: "sym-15", symbol: "AUD/USD", category: "FOREX", description: "Australian Dollar vs US Dollar", contractSpec: "100,000 AUD • 5 Digits", enabled: true },
  { id: "sym-16", symbol: "USD/CAD", category: "FOREX", description: "US Dollar vs Canadian Dollar", contractSpec: "100,000 USD • 5 Digits", enabled: true },
  { id: "sym-17", symbol: "USD/CHF", category: "FOREX", description: "US Dollar vs Swiss Franc", contractSpec: "100,000 USD • 5 Digits", enabled: true },
  { id: "sym-18", symbol: "NZD/USD", category: "FOREX", description: "New Zealand Dollar vs US Dollar", contractSpec: "100,000 NZD • 5 Digits", enabled: true },

  // INDICES
  { id: "sym-19", symbol: "US500", category: "INDICES", description: "S&P 500 Index Cash", contractSpec: "10 Index • 2 Digits", enabled: true },
  { id: "sym-20", symbol: "USTEC", category: "INDICES", description: "Nasdaq 100 Index Cash", contractSpec: "10 Index • 2 Digits", enabled: true },
  { id: "sym-21", symbol: "US30", category: "INDICES", description: "Dow Jones Industrial Average", contractSpec: "10 Index • 2 Digits", enabled: true },
  { id: "sym-22", symbol: "GER40", category: "INDICES", description: "Germany 40 DAX Cash", contractSpec: "1 Index • 2 Digits", enabled: true },
  { id: "sym-23", symbol: "UK100", category: "INDICES", description: "FTSE 100 Index Cash", contractSpec: "1 Index • 2 Digits", enabled: true },

  // METALS
  { id: "sym-24", symbol: "XAU/USD", category: "METALS", description: "Gold vs US Dollar (Ounce)", contractSpec: "100 Ounces • 2 Digits", enabled: true },
  { id: "sym-25", symbol: "XAG/USD", category: "METALS", description: "Silver vs US Dollar (Ounce)", contractSpec: "5,000 Ounces • 3 Digits", enabled: true },
  { id: "sym-26", symbol: "XPT/USD", category: "METALS", description: "Platinum vs US Dollar", contractSpec: "100 Ounces • 2 Digits", enabled: true },

  // ENERGIES
  { id: "sym-27", symbol: "USOIL", category: "ENERGIES", description: "WTI Crude Light Oil (Barrel)", contractSpec: "1,000 Barrels • 2 Digits", enabled: true },
  { id: "sym-28", symbol: "UKOIL", category: "ENERGIES", description: "Brent Crude Oil (Barrel)", contractSpec: "1,000 Barrels • 2 Digits", enabled: true },
  { id: "sym-29", symbol: "NGAS", category: "ENERGIES", description: "Natural Gas (MMBtu)", contractSpec: "10,000 MMBtu • 3 Digits", enabled: true },
];

export const SymbolSettingsTab: React.FC = () => {
  const { companyConfig, currentCompany, addToast } = usePortal();
  const companyId = companyConfig?.id || currentCompany || "novafxm";
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const [selectedCategory, setSelectedCategory] = useState<SymbolCategoryType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Persistent symbols list
  const [symbols, setSymbols] = useState<SymbolVisibilityItem[]>(() => {
    try {
      const saved = localStorage.getItem(`nova_symbol_visibility_${companyId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SYMBOLS_LIST;
  });

  const loadSymbolsFromApi = async () => {
    setLoading(true);
    try {
      const data = await api.getSymbols(companyId);
      if (data && Array.isArray(data) && data.length > 0) {
        const mapped: SymbolVisibilityItem[] = data.map((item, idx) => {
          const category = normalizeCategory(item.group);
          return {
            id: `sym-${idx + 1}-${item.symbol.replace(/\//g, "-")}`,
            symbol: item.symbol,
            category,
            description: item.description || item.symbol,
            contractSpec: generateContractSpec(item.symbol, category),
            enabled: item.visible !== false,
          };
        });
        setSymbols(mapped);
      }
    } catch (err) {
      console.warn("Failed to load symbols from API, using cached/default dataset:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSymbolsFromApi();
  }, [companyId]);

  useEffect(() => {
    try {
      localStorage.setItem(`nova_symbol_visibility_${companyId}`, JSON.stringify(symbols));
    } catch (e) {
      console.error(e);
    }
  }, [symbols, companyId]);

  // Counts
  const totalCount = symbols.length;
  const cryptoCount = symbols.filter((s) => s.category === "CRYPTO").length;
  const forexCount = symbols.filter((s) => s.category === "FOREX").length;
  const indicesCount = symbols.filter((s) => s.category === "INDICES").length;
  const metalsCount = symbols.filter((s) => s.category === "METALS").length;
  const energiesCount = symbols.filter((s) => s.category === "ENERGIES").length;

  const enabledCount = symbols.filter((s) => s.enabled).length;
  const hiddenCount = totalCount - enabledCount;

  // Filtered List
  const filteredSymbols = useMemo(() => {
    return symbols.filter((s) => {
      if (selectedCategory !== "ALL" && s.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.symbol.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [symbols, selectedCategory, searchQuery]);

  const isAllCurrentEnabled =
    filteredSymbols.length > 0 && filteredSymbols.every((s) => s.enabled);

  const handleToggleSelectAll = () => {
    const targetState = !isAllCurrentEnabled;
    const currentIds = new Set(filteredSymbols.map((s) => s.id));
    setSymbols((prev) =>
      prev.map((s) => (currentIds.has(s.id) ? { ...s, enabled: targetState } : s))
    );
    addToast(
      "info",
      targetState ? "Symbols Visible" : "Symbols Hidden",
      `${filteredSymbols.length} symbol(s) ${targetState ? "enabled" : "hidden"} in client terminal.`
    );
  };

  const handleToggleSymbol = (id: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setSymbols((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleReset = () => {
    if (window.confirm("Reset all symbol visibility settings to default?")) {
      setSymbols(DEFAULT_SYMBOLS_LIST);
      addToast("info", "Reset Complete", "Symbol settings reset to default values.");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const visibilities = symbols.map((s) => ({
        symbol: s.symbol,
        visible: s.enabled,
      }));
      await api.updateSymbols(companyId, visibilities);
      addToast(
        "success",
        "Settings Saved",
        `Saved! ${enabledCount} symbols visible to clients, ${hiddenCount} hidden in ${companyConfig?.name || companyId}.`
      );
    } catch (err: any) {
      addToast("error", "Save Failed", err?.message || "Failed to persist symbol settings to backend.");
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-2 animate-fadeIn font-sans select-none flex-1 min-h-0 flex flex-col">
      {/* Top Compact Excel Toolbar matching PaymentsPage */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white border border-slate-300 p-2 rounded-lg shadow-2xs">
        {/* Left: Title + Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 mr-1">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: brandPrimary }}
            />
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
              SYMBOL SETTINGS
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredSymbols.length} records
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none hidden sm:inline">|</span>

          {/* Category Filter Pills */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px] overflow-x-auto">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                selectedCategory === "ALL"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalCount})
            </button>

            <button
              onClick={() => setSelectedCategory("CRYPTO")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                selectedCategory === "CRYPTO"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Crypto ({cryptoCount})
            </button>

            <button
              onClick={() => setSelectedCategory("FOREX")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                selectedCategory === "FOREX"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Forex ({forexCount})
            </button>

            <button
              onClick={() => setSelectedCategory("INDICES")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                selectedCategory === "INDICES"
                  ? "bg-sky-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Indices ({indicesCount})
            </button>

            <button
              onClick={() => setSelectedCategory("METALS")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                selectedCategory === "METALS"
                  ? "bg-yellow-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Metals ({metalsCount})
            </button>

            <button
              onClick={() => setSelectedCategory("ENERGIES")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                selectedCategory === "ENERGIES"
                  ? "bg-rose-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Energies ({energiesCount})
            </button>
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-2.5 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Visible (Enabled):</span>
            <strong className="text-emerald-700 font-bold">{enabledCount}</strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Hidden:</span>
            <strong className="text-rose-700 font-bold">{hiddenCount}</strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Feeds:</span>
            <strong className="text-slate-800 font-bold">Real-Time</strong>
          </div>
        </div>

        {/* Right: Actions + Search */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSelectAll}
            className="px-2.5 py-1 rounded text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            title="Toggle visibility for all filtered symbols"
          >
            {isAllCurrentEnabled ? (
              <>
                <EyeOff className="w-3 h-3 text-rose-600" />
                <span>Hide All</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 text-emerald-600" />
                <span>Show All</span>
              </>
            )}
          </button>

          <button
            onClick={loadSymbolsFromApi}
            disabled={loading}
            className="p-1 rounded text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
            title="Refresh symbols from database"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-amber-600" : ""}`} />
          </button>

          <button
            onClick={handleReset}
            className="p-1 rounded text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
            title="Reset to default"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-2.5 py-1 rounded text-[10.5px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: brandPrimary }}
            title="Save configuration to database"
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>

          <div className="relative w-40 sm:w-48">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker, name..."
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
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[45px] text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentEnabled}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[120px] text-left">
                  TICKER
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[110px] text-center">
                  CATEGORY
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[240px] text-left">
                  DESCRIPTION
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[180px] text-left">
                  CONTRACT SPECIFICATION
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[120px] text-center">
                  TERMINAL STATUS
                </th>
                <th className="py-1.5 px-2 text-center w-[110px]">
                  ACTIONS
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Loading symbol settings from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSymbols.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No symbols found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredSymbols.map((item, index) => {
                  const isSelected = selectedId === item.id;
                  const isEnabled = item.enabled;

                  const categoryBadgeClass =
                    item.category === "CRYPTO"
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : item.category === "FOREX"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : item.category === "INDICES"
                      ? "bg-sky-50 text-sky-800 border-sky-300"
                      : item.category === "METALS"
                      ? "bg-yellow-50 text-yellow-800 border-yellow-300"
                      : "bg-rose-50 text-rose-800 border-rose-300";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={() => handleToggleSymbol(item.id)}
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
                      title="Click to select • Double-click to toggle visibility"
                    >
                      {/* Checkbox */}
                      <td
                        className="py-1 px-2.5 border-r border-slate-200 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => handleToggleSymbol(item.id, e)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Ticker */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-900 tracking-wide font-mono text-[11.5px]">
                        {item.symbol}
                      </td>

                      {/* Category */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-center truncate">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-tight border ${categoryBadgeClass}`}
                        >
                          {item.category}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-sans text-slate-700 text-[11px]">
                        {item.description}
                      </td>

                      {/* Contract Spec */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-mono text-slate-500 text-[10.5px]">
                        {item.contractSpec}
                      </td>

                      {/* Terminal Status */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-center">
                        <span
                          onClick={(e) => handleToggleSymbol(item.id, e)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight cursor-pointer border ${
                            isEnabled
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-rose-50 text-rose-800 border-rose-300"
                          }`}
                          title="Click to toggle terminal visibility"
                        >
                          {isEnabled ? "VISIBLE" : "HIDDEN"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-1 px-2 text-center">
                        <button
                          onClick={(e) => handleToggleSymbol(item.id, e)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                            isEnabled
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 shadow-2xs"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 shadow-2xs"
                          }`}
                        >
                          {isEnabled ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                  );
                })
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
              Showing {filteredSymbols.length} of {totalCount} symbols
            </span>
            {selectedId && (
              <>
                <span>•</span>
                <span className="text-slate-800 font-bold">
                  Selected: #{selectedId}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-sans">
              Double-click row to toggle client visibility
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">
              {enabledCount} Active on Terminal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
