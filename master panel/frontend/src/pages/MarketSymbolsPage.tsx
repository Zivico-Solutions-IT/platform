import React, { useState, useMemo, useRef } from "react";
import { usePortal } from "../context/PortalContext";
import {
  Search,
  Maximize2,
  Minimize2,
  RotateCcw,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  TradingViewChart,
  TRADINGVIEW_SYMBOL_MAP,
} from "../components/charts/TradingViewChart";

const TIMEFRAMES = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "1h", value: "60" },
  { label: "4h", value: "240" },
  { label: "1D", value: "D" },
  { label: "1W", value: "W" },
  { label: "1M", value: "M" },
];

export const MarketSymbolsPage: React.FC = () => {
  const { symbols, companyConfig } = usePortal();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSymbolCode, setSelectedSymbolCode] = useState<string>(() => {
    return symbols.length > 0 ? symbols[0].symbol : "EURUSD";
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("15"); // 15m default like Image 2
  const [viewRange, setViewRange] = useState<"Recent" | "Full">("Recent");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [chartKey, setChartKey] = useState<number>(0);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Selected symbol object
  const selectedSymbol = useMemo(() => {
    return (
      symbols.find((s) => s.symbol === selectedSymbolCode) ||
      symbols[0] ||
      null
    );
  }, [symbols, selectedSymbolCode]);

  // Unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(symbols.map((s) => s.category)));
    return ["All", ...cats];
  }, [symbols]);

  // Filtered symbols based on search & category
  const filteredSymbols = useMemo(() => {
    return symbols.filter((s) => {
      const matchesSearch = s.symbol
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());
      const matchesCat =
        selectedCategory === "All" || s.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [symbols, searchQuery, selectedCategory]);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!chartContainerRef.current) return;

    if (!document.fullscreenElement) {
      chartContainerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Fullscreen error:", err));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.error("Exit fullscreen error:", err));
    }
  };

  // Re-center / Reset to Recent live candles
  const handleRecentClick = () => {
    setViewRange("Recent");
    setChartKey((prev) => prev + 1);
  };

  const handleFullClick = () => {
    setViewRange("Full");
    setChartKey((prev) => prev + 1);
  };

  // Company Brand Color
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fadeIn font-sans select-none bg-[#f8fafc]">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-wide text-slate-900 flex items-center gap-2.5">
            <span>MARKETS</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
              {symbols.length} Instruments
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              LIVE REAL-TIME FEED
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real global institutional market feeds with live TradingView candlestick charts & MT5 quotes
          </p>
        </div>

        {/* Global Instrument Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instrument..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 shadow-2xs transition-all font-mono"
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

      {/* Main Grid: Left Excel-Style Quotes Grid + Right TradingView Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ========================================================================= */}
        {/* LEFT PANEL: Excel-Style Symbols Grid (Instrument, Bid, Ask, Spread)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex flex-col">
          {/* Top Compact Excel Toolbar */}
          <div className="bg-white p-2 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: brandPrimary }}
              />
              <span className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
                MARKET WATCH
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                {filteredSymbols.length} pairs
              </span>
            </div>

            {/* Category Filter Pills (Excel Segmented Switcher) */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-white text-slate-900 shadow-2xs font-extrabold border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Main Excel-Style Dense Table Grid Container */}
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-left border-collapse table-fixed">
              {/* Excel Table Header */}
              <thead className="sticky top-0 bg-[#e2e8f0] text-slate-800 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-300 z-10 select-none shadow-2xs">
                <tr>
                  <th className="py-1.5 px-2.5 border-r border-slate-300 w-[36%] text-left font-extrabold text-slate-800">
                    Instrument
                  </th>
                  <th className="py-1.5 px-2.5 border-r border-slate-300 text-right w-[24%] font-extrabold text-slate-800">
                    Bid
                  </th>
                  <th className="py-1.5 px-2.5 border-r border-slate-300 text-right w-[24%] font-extrabold text-slate-800">
                    Ask
                  </th>
                  <th className="py-1.5 px-2 text-center w-[16%] font-extrabold text-slate-800">
                    Spread
                  </th>
                </tr>
              </thead>

              {/* Dense Excel Rows (h-7.5 compact height) */}
              <tbody className="font-mono text-[11px] leading-tight select-none">
                {filteredSymbols.map((sym, index) => {
                  const isSelected = selectedSymbol?.symbol === sym.symbol;
                  const isUp = sym.changeDirection === "up";

                  return (
                    <tr
                      key={sym.id || sym.symbol}
                      onClick={() => setSelectedSymbolCode(sym.symbol)}
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
                      title="Click to view live TradingView chart"
                    >
                      {/* Instrument */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{sym.symbol}</span>
                          {isSelected && (
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: brandPrimary }}
                            />
                          )}
                        </div>
                      </td>

                      {/* Bid */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-right truncate font-mono font-bold">
                        <span
                          className={`transition-colors duration-150 ${
                            isUp ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {sym.bid.toFixed(sym.digits)}
                        </span>
                      </td>

                      {/* Ask */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-right truncate font-mono font-bold">
                        <span
                          className={`transition-colors duration-150 ${
                            isUp ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {sym.ask.toFixed(sym.digits)}
                        </span>
                      </td>

                      {/* Spread */}
                      <td className="py-1 px-2 border-r border-slate-200 text-center font-mono font-semibold text-slate-700 truncate">
                        {sym.spread}
                      </td>
                    </tr>
                  );
                })}

                {filteredSymbols.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-10 text-center text-slate-400 font-sans text-xs"
                    >
                      No instruments found matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Excel Formula/Status Bar */}
          <div className="px-3 py-1 bg-slate-50 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600 font-mono select-none">
            <span className="truncate">Active: <strong className="text-slate-900 font-bold">{selectedSymbol?.symbol}</strong></span>
            <span className="text-slate-500">Spread: <strong className="text-slate-800 font-bold">{selectedSymbol?.spread}</strong></span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Professional TradingView Real-Time Candlestick Chart        */}
        {/* (Matching Image 2 with Timeframe bar, OHLC, Live Ticks & Fullscreen)     */}
        {/* ========================================================================= */}
        <div
          ref={chartContainerRef}
          className={`lg:col-span-7 xl:col-span-8 bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex flex-col ${
            isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : ""
          }`}
        >
          {/* Top Timeframe Bar (Directly matching Image 2) */}
          <div className="px-4 py-2 bg-[#fdfdfd] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {/* Left: Active Symbol Callout & Exchange Info */}
            <div className="flex items-center gap-3">
              <div
                className="px-2.5 py-1 rounded text-white font-mono font-black text-xs shadow-2xs uppercase tracking-wider"
                style={{ backgroundColor: brandPrimary }}
              >
                {selectedSymbol?.symbol}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">Live:</span>
                <span className="font-bold text-slate-900">
                  {selectedSymbol?.bid.toFixed(selectedSymbol?.digits || 5)}
                </span>
                <span className="text-slate-400">/</span>
                <span className="font-bold text-slate-900">
                  {selectedSymbol?.ask.toFixed(selectedSymbol?.digits || 5)}
                </span>
              </div>
            </div>

            {/* Right: Timeframe Selector & Full / Recent buttons (Identical to Image 2) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Timeframes: 1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {TIMEFRAMES.map((tf) => {
                  const isActive = selectedTimeframe === tf.value;
                  return (
                    <button
                      key={tf.value}
                      onClick={() => setSelectedTimeframe(tf.value)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                        isActive
                          ? "text-slate-950 font-black shadow-xs"
                          : "text-slate-600 hover:text-slate-950 hover:bg-slate-200/60"
                      }`}
                      style={{
                        backgroundColor: isActive ? brandPrimary : undefined,
                        color: isActive ? "#000000" : undefined,
                      }}
                    >
                      {tf.label}
                    </button>
                  );
                })}
              </div>

              {/* Range Toggle: Full vs Recent */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={handleFullClick}
                  className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                    viewRange === "Full" ? "bg-white text-slate-950 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Full
                </button>
                <button
                  onClick={handleRecentClick}
                  className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                    viewRange === "Recent" ? "bg-white text-slate-950 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={{
                    backgroundColor: viewRange === "Recent" ? brandPrimary : undefined,
                    color: viewRange === "Recent" ? "#000000" : undefined,
                  }}
                >
                  Recent
                </button>
              </div>

              {/* Divider | */}
              <span className="text-slate-300 px-0.5 font-mono select-none">|</span>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1 transition-all shadow-2xs"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chart"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Exit</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Full</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* TradingView Advanced Real-Time Chart Widget Container */}
          <div className="relative w-full flex-1 bg-white" style={{ minHeight: isFullscreen ? "calc(100vh - 55px)" : "600px" }}>
            {selectedSymbol && (
              <TradingViewChart
                key={`${selectedSymbol.symbol}_${selectedTimeframe}_${viewRange}_${chartKey}`}
                symbol={selectedSymbol.symbol}
                interval={selectedTimeframe}
                viewRange={viewRange}
                theme="light"
                height={isFullscreen ? "100%" : "600px"}
              />
            )}
          </div>

          {/* Chart Bottom Info Strip */}
          <div className="px-4 py-2 bg-[#f8fafc] border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Broker Engine
              </span>
              <span>•</span>
              <span>{companyConfig?.name || "NovaFXM"} Candlestick Feed</span>
            </div>

            <div className="flex items-center gap-3">
              <span>Digits: {selectedSymbol?.digits}</span>
              <span>•</span>
              <span>Contract: {selectedSymbol?.contractSize?.toLocaleString()}</span>
              <span>•</span>
              <span>Leverage: {companyConfig?.defaultLeverage || "1:500"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
