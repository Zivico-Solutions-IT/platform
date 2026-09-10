import React, { useState, useEffect } from "react";
import { usePortal } from "../context/PortalContext";
import { ActiveNavTab } from "../types";
import { TradingOpenPage } from "./TradingOpenPage";
import { TradingHistoryPage } from "./TradingHistoryPage";
import { Clock, TrendingUp } from "lucide-react";

export type TradingSubTab = "open-trades" | "history";

export const TradingPage: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    companyConfig,
    openTrades,
    closedTrades,
  } = usePortal();

  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const getSubTabFromActive = (tab: ActiveNavTab): TradingSubTab => {
    if (tab === "trading-history") return "history";
    return "open-trades";
  };

  const [currentSubTab, setCurrentSubTab] = useState<TradingSubTab>(() =>
    getSubTabFromActive(activeTab)
  );

  useEffect(() => {
    if (activeTab.startsWith("trading")) {
      setCurrentSubTab(getSubTabFromActive(activeTab));
    }
  }, [activeTab]);

  const handleSwitchTab = (tab: TradingSubTab) => {
    setCurrentSubTab(tab);
    if (tab === "open-trades") setActiveTab("trading-open");
    else if (tab === "history") setActiveTab("trading-history");
  };

  return (
    <div className="p-3 sm:p-3.5 space-y-2.5 font-sans select-none bg-[#f8fafc] flex flex-col min-h-[calc(100vh-65px)]">
      {/* Top Navigation Ribbon Bar */}
      <div className="bg-white border border-slate-300 p-2 rounded-xl shadow-2xs flex items-center justify-between gap-2.5 flex-wrap shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto select-none">
          {/* 1. Open Trades Tab */}
          <button
            onClick={() => handleSwitchTab("open-trades")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              currentSubTab === "open-trades"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Trades</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                currentSubTab === "open-trades"
                  ? "bg-slate-800 text-amber-300 border border-slate-700"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {openTrades.length}
            </span>
          </button>

          {/* 2. Trading History Tab */}
          <button
            onClick={() => handleSwitchTab("history")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              currentSubTab === "history"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Trading History</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                currentSubTab === "history"
                  ? "bg-slate-800 text-amber-300 border border-slate-700"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {closedTrades.length}
            </span>
          </button>
        </div>

        {/* Brand System Tag */}
        <div className="flex items-center gap-2 pr-1 text-xs font-mono font-bold text-slate-500">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: brandPrimary }}
          />
          <span className="hidden sm:inline uppercase">
            {companyConfig?.name || "NOVAFXM"} TRADING MANAGEMENT
          </span>
        </div>
      </div>

      {/* Main Sub-Tab Workspace */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* SUB-TAB 1: OPEN TRADES */}
        {currentSubTab === "open-trades" && <TradingOpenPage embedded={true} />}

        {/* SUB-TAB 2: TRADING HISTORY */}
        {currentSubTab === "history" && <TradingHistoryPage embedded={true} />}
      </div>
    </div>
  );
};

export default TradingPage;
