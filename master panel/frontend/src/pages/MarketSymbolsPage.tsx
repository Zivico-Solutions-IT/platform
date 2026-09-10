import React, { useState, useMemo, useRef } from "react";
import { usePortal } from "../context/PortalContext";
import { ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { TradingViewChart } from "../components/charts/TradingViewChart";
import { MarketWatchSymbolPanel } from "../components/market/MarketWatchSymbolPanel";

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
  const [selectedSymbolCode, setSelectedSymbolCode] = useState<string>(() => {
    return symbols.length > 0 ? symbols[0].symbol : "EUR/USD";
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("15");
  const [viewRange, setViewRange] = useState<"Recent" | "Full">("Recent");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [chartKey, setChartKey] = useState<number>(0);
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState<boolean>(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSymbolDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedSymbol = useMemo(() => {
    const cleanTarget = selectedSymbolCode.replace("/", "").toUpperCase();
    return (
      symbols.find(
        (s) => s.symbol === selectedSymbolCode || s.symbol.replace("/", "").toUpperCase() === cleanTarget
      ) ||
      symbols[0] ||
      null
    );
  }, [symbols, selectedSymbolCode]);

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

  const handleRecentClick = () => {
    setViewRange("Recent");
    setChartKey((prev) => prev + 1);
  };

  const handleFullClick = () => {
    setViewRange("Full");
    setChartKey((prev) => prev + 1);
  };

  const brandPrimary = "#D97706";
  const isUp = selectedSymbol?.changeDirection === "up" || (selectedSymbol?.dailyChange || 0) >= 0;

  return (
    <div className="p-3 sm:p-4 space-y-3 animate-fadeIn font-sans select-none bg-[#f8fafc] min-h-[calc(100vh-65px)]">
      {/* Top Banner Matching User Side */}
      <div className="bg-white border border-slate-300 p-2.5 rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Active Symbol Picker + Live Rate readout */}
        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsSymbolDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-400/20 text-slate-900 border border-amber-300 font-mono font-black text-xs cursor-pointer shadow-2xs"
          >
            <span>{selectedSymbol?.symbol}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
          </button>

          {isSymbolDropdownOpen && (
            <div className="absolute left-0 top-9 w-64 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-40">
              {symbols.map((s) => (
                <button
                  key={s.id || s.symbol}
                  onClick={() => {
                    setSelectedSymbolCode(s.symbol);
                    setIsSymbolDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-mono rounded transition-colors cursor-pointer ${
                    selectedSymbolCode === s.symbol
                      ? "bg-amber-100 text-slate-900 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{s.symbol}</span>
                  <span className="text-[10.5px] text-slate-500">
                    {s.bid.toFixed(s.digits)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Live Quote & Change % readout */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={isUp ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
              {selectedSymbol?.bid.toFixed(selectedSymbol?.digits || 5)}
            </span>
            <span className={`text-[11px] font-bold ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
              {isUp ? "+" : ""}{selectedSymbol?.dailyChange}%
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 text-[11px]">
              Spread: <strong className="text-slate-900">{selectedSymbol?.spread}</strong>
            </span>
          </div>
        </div>

        {/* Right Timeframe selector + Range buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {TIMEFRAMES.map((tf) => {
              const isActive = selectedTimeframe === tf.value;
              return (
                <button
                  key={tf.value}
                  onClick={() => setSelectedTimeframe(tf.value)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-slate-950 shadow-2xs font-extrabold"
                      : "text-slate-600 hover:text-slate-950"
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

          {/* Full / Recent buttons */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={handleFullClick}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                viewRange === "Full" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-600"
              }`}
            >
              Full
            </button>
            <button
              onClick={handleRecentClick}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                viewRange === "Recent" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-600"
              }`}
              style={{
                backgroundColor: viewRange === "Recent" ? brandPrimary : undefined,
                color: viewRange === "Recent" ? "#000000" : undefined,
              }}
            >
              Recent
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chart"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main 2-Panel Grid: Left Symbols Watchlist + Right Full Width TradingView Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Left Col (3.5 cols): Category Market Watch Watchlist */}
        <div className="lg:col-span-4 xl:col-span-3 h-[680px]">
          <MarketWatchSymbolPanel
            selectedSymbolCode={selectedSymbolCode}
            onSelectSymbol={setSelectedSymbolCode}
          />
        </div>

        {/* Right Col (8.5 cols): Full-Width Real-Time Candlestick Chart */}
        <div
          ref={chartContainerRef}
          className={`lg:col-span-8 xl:col-span-9 bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex flex-col h-[680px] ${
            isFullscreen ? "fixed inset-0 z-50 rounded-none border-0 h-screen" : ""
          }`}
        >
          <div className="relative w-full flex-1 bg-white min-h-0">
            {selectedSymbol && (
              <TradingViewChart
                key={`${selectedSymbol.symbol}_${selectedTimeframe}_${viewRange}_${chartKey}`}
                symbol={selectedSymbol.symbol}
                interval={selectedTimeframe}
                viewRange={viewRange}
                theme="light"
                height="100%"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
