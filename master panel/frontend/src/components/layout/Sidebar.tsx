import React, { useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { ActiveNavTab } from "../../types";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  CreditCard,
  ShieldCheck,
  CandlestickChart,
  Settings,
  ChevronDown,
  ChevronRight,
  Server,
  Activity,
  Clock,
} from "lucide-react";

type MenuCategory = "payments" | "trading" | "settings";

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    clients,
    deposits,
    withdrawals,
    kycVerifications,
    openTrades,
    currentCompany,
    companyConfig,
    settings,
  } = usePortal();

  // Accordion state: only one category open at a time
  const getCategoryFromTab = (tab: ActiveNavTab): MenuCategory | null => {
    if (tab.startsWith("payments")) return "payments";
    if (tab.startsWith("trading")) return "trading";
    if (tab.startsWith("settings")) return "settings";
    return null;
  };

  const [openCategory, setOpenCategory] = useState<MenuCategory | null>(() => {
    return getCategoryFromTab(activeTab);
  });

  // When activeTab changes, auto-open its corresponding category
  React.useEffect(() => {
    const cat = getCategoryFromTab(activeTab);
    if (cat) {
      setOpenCategory(cat);
    }
  }, [activeTab]);

  const toggleCategory = (cat: MenuCategory) => {
    setOpenCategory((prev) => (prev === cat ? null : cat));
  };

  const paymentsOpen = openCategory === "payments";
  const tradingOpen = openCategory === "trading";
  const settingsOpen = openCategory === "settings";

  // Badge counts
  const pendingDepositsCount = deposits.filter((d) => d.status === "PENDING").length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === "PENDING").length;
  const pendingKycCount = kycVerifications.filter((k) => k.status === "PENDING").length;
  const activeTradesCount = openTrades.length;

  const isTabActive = (tab: ActiveNavTab) => activeTab === tab;

  // Dynamic brand styles per company
  const activeNavClass =
    currentCompany === "novafxm"
      ? "bg-amber-50/90 text-amber-900 border border-amber-300/80 font-semibold shadow-xs"
      : currentCompany === "a5markets"
      ? "bg-teal-50/90 text-teal-900 border border-teal-300/80 font-semibold shadow-xs"
      : "bg-emerald-50/90 text-emerald-900 border border-emerald-300/80 font-semibold shadow-xs";

  const activeSubNavClass =
    currentCompany === "novafxm"
      ? "bg-amber-50 text-amber-900 font-semibold"
      : currentCompany === "a5markets"
      ? "bg-teal-50 text-teal-900 font-semibold"
      : "bg-emerald-50 text-emerald-900 font-semibold";

  const brandIconClass =
    currentCompany === "novafxm"
      ? "text-amber-600"
      : currentCompany === "a5markets"
      ? "text-teal-600"
      : "text-emerald-700";

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none shrink-0 font-sans z-30 shadow-sm">
      {/* Brand Header with Dynamic Company Logo */}
      <div className="p-3.5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {companyConfig.logoUrl ? (
              <img
                key={companyConfig.id}
                src={companyConfig.logoUrl}
                alt={companyConfig.fullName}
                className="h-10 w-auto max-w-[170px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-xs bg-gradient-to-tr ${companyConfig.avatarGradient}`}
                >
                  {companyConfig.initials}
                </div>
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  {companyConfig.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center" title={`${companyConfig.serverName} Online`}>
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  currentCompany === "novafxm"
                    ? "bg-amber-400"
                    : currentCompany === "a5markets"
                    ? "bg-teal-400"
                    : "bg-emerald-400"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  currentCompany === "novafxm"
                    ? "bg-amber-500"
                    : currentCompany === "a5markets"
                    ? "bg-teal-500"
                    : "bg-emerald-600"
                }`}
              ></span>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 text-xs">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
            isTabActive("dashboard")
              ? activeNavClass
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${isTabActive("dashboard") ? brandIconClass : "text-slate-500"}`} />
          <span>Dashboard</span>
        </button>

        {/* Markets Direct Tab */}
        <button
          onClick={() => setActiveTab("market-symbols")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-all ${
            isTabActive("market-symbols")
              ? activeNavClass
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <TrendingUp className={`w-4 h-4 ${isTabActive("market-symbols") ? brandIconClass : "text-slate-500"}`} />
          <span>Markets</span>
        </button>

        {/* Direct Navigation: Clients */}
        <button
          onClick={() => setActiveTab("clients-all")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
            isTabActive("clients-all") || isTabActive("clients-active") || isTabActive("clients-verified")
              ? activeNavClass
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users
              className={`w-4 h-4 ${
                isTabActive("clients-all") || isTabActive("clients-active") || isTabActive("clients-verified")
                  ? brandIconClass
                  : "text-slate-500"
              }`}
            />
            <span>Clients</span>
          </div>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
            {clients.length}
          </span>
        </button>

        {/* Direct Navigation: Payments (Sub-tabs removed per user instructions) */}
        <button
          onClick={() => setActiveTab("payments")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
            isTabActive("payments") || isTabActive("payments-deposits") || isTabActive("payments-withdrawals")
              ? activeNavClass
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CreditCard
              className={`w-4 h-4 ${
                isTabActive("payments") || isTabActive("payments-deposits") || isTabActive("payments-withdrawals")
                  ? brandIconClass
                  : "text-slate-500"
              }`}
            />
            <span>Payments</span>
          </div>
          {pendingDepositsCount + pendingWithdrawalsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {pendingDepositsCount + pendingWithdrawalsCount}
            </span>
          )}
        </button>

        {/* Verification (KYC) */}
        <div className="pt-1">
          <button
            onClick={() => setActiveTab("verification")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${
              isTabActive("verification")
                ? activeNavClass
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={`w-4 h-4 ${isTabActive("verification") ? brandIconClass : "text-emerald-600"}`} />
              <span>Verification</span>
            </div>
            {pendingKycCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {pendingKycCount} new
              </span>
            )}
          </button>
        </div>

        {/* Trading Accordion */}
        <div className="pt-1">
          <button
            onClick={() => {
              toggleCategory("trading");
              if (!activeTab.startsWith("trading")) {
                setActiveTab("trading-open");
              }
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-slate-400 hover:text-slate-700 font-bold tracking-wider text-[10px] uppercase transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CandlestickChart className={`w-3.5 h-3.5 ${activeTab.startsWith("trading") ? brandIconClass : "text-sky-600"}`} />
              <span className={activeTab.startsWith("trading") ? "text-slate-900 font-extrabold" : ""}>Trading</span>
            </div>
            {tradingOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {tradingOpen && (
            <div className="ml-3 pl-3 border-l border-slate-200 mt-1 space-y-0.5">
              <button
                onClick={() => setActiveTab("trading-open")}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isTabActive("trading-open") || activeTab === "trading"
                    ? activeSubNavClass
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Open Trades</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                  {activeTradesCount}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("trading-history")}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isTabActive("trading-history")
                    ? activeSubNavClass
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>History</span>
                <Clock className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          )}
        </div>

        {/* Settings Accordion */}
        <div className="pt-1">
          <button
            onClick={() => {
              toggleCategory("settings");
              if (!activeTab.startsWith("settings")) {
                setActiveTab("settings-assign-users");
              }
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-slate-400 hover:text-slate-700 font-bold tracking-wider text-[10px] uppercase transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Settings className={`w-3.5 h-3.5 ${activeTab.startsWith("settings") ? brandIconClass : "text-slate-500"}`} />
              <span>Settings</span>
            </div>
            {settingsOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {settingsOpen && (
            <div className="ml-3 pl-3 border-l border-slate-200 mt-1 space-y-0.5">
              <button
                onClick={() => setActiveTab("settings-assign-users")}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isTabActive("settings-assign-users") || isTabActive("settings")
                    ? activeSubNavClass
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Assign Users</span>
              </button>
              <button
                onClick={() => setActiveTab("settings-deposit-methods")}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isTabActive("settings-deposit-methods")
                    ? activeSubNavClass
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Deposit Addresses</span>
              </button>
              <button
                onClick={() => setActiveTab("settings-referral-rewards")}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isTabActive("settings-referral-rewards")
                    ? activeSubNavClass
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Referral Rewards</span>
              </button>
              <button
                onClick={() => setActiveTab("settings-referral-code")}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isTabActive("settings-referral-code")
                    ? activeSubNavClass
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Referral Code</span>
              </button>
              <button
                onClick={() => setActiveTab("settings-staff-permissions")}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isTabActive("settings-staff-permissions")
                    ? activeSubNavClass
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Staff & Permissions</span>
              </button>
              <button
                onClick={() => setActiveTab("settings-symbol-settings")}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isTabActive("settings-symbol-settings")
                    ? activeSubNavClass
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Symbol Settings</span>
              </button>
              <button
                onClick={() => setActiveTab("settings-broker-gateway")}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isTabActive("settings-broker-gateway")
                    ? activeSubNavClass
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>Broker & Gateway</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Server Status */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] space-y-2">
        <div className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-1.5 truncate">
            <Server className={`w-3.5 h-3.5 shrink-0 ${brandIconClass}`} />
            <span className="font-semibold text-slate-700 truncate">{companyConfig.name} Gateway</span>
          </div>
          <span className={`font-mono font-bold flex items-center gap-1 shrink-0 ${brandIconClass}`}>
            <Activity className="w-2.5 h-2.5 animate-pulse" />
            {settings.pingMs}ms
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-500 font-mono text-[10px]">
          <span>Server Time</span>
          <span className="text-slate-700 font-medium">GMT+2 (London)</span>
        </div>
      </div>
    </aside>
  );
};
