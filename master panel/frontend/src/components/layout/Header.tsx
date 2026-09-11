import React, { useState, useRef, useEffect } from "react";
import { usePortal } from "../../context/PortalContext";
import {
  Search,
  Bell,
  Shield,
  BarChart3,
  ChevronDown,
  Check,
  Database,
  RefreshCw,
  X,
  CheckCheck,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldAlert,
  UserPlus,
  FileText,
  LogOut,
} from "lucide-react";
import { monthlyBrokerStats } from "../../data/mockData";
import { AdminNotificationItem, ActiveNavTab } from "../../types";
import { api } from "../../services/api";

export const Header: React.FC = () => {
  const {
    logout,
    currentUser,
    currentCompany,
    setCompany,
    companyConfig,
    companies,
    globalSearch,
    setGlobalSearch,
    deposits,
    withdrawals,
    kycVerifications,
    setActiveTab,
    selectedPeriod,
    setSelectedPeriod,
    showMonthlyTable,
    setShowMonthlyTable,
    dbStatus,
    isDbLoading,
    refreshDbData,
  } = usePortal();

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState<boolean>(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState<boolean>(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const [dbNotifications, setDbNotifications] = useState<AdminNotificationItem[]>([]);
  const [clearedNotifications, setClearedNotifications] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch db notifications whenever company changes or database refreshes
  useEffect(() => {
    let isMounted = true;
    api.getNotifications(currentCompany).then((list) => {
      if (isMounted) {
        setDbNotifications(list);
        setClearedNotifications(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentCompany, dbStatus.connected]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCompanyDropdownOpen(false);
        setIsNotificationDropdownOpen(false);
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Compute live pending notifications from state (Deposits, Withdrawals, KYC)
  const pendingDepositNotifs: AdminNotificationItem[] = deposits
    .filter((d) => d.status === "PENDING")
    .map((d) => ({
      id: `dep-${d.id}`,
      type: "new_deposit",
      title: "Deposit Approval Pending",
      message: `${d.clientName} requested deposit of $${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} via ${d.method}.`,
      createdAt: d.createdAt || "Recently",
      isRead: false,
      targetTab: "payments-deposits" as ActiveNavTab,
    }));

  const pendingWithdrawalNotifs: AdminNotificationItem[] = withdrawals
    .filter((w) => w.status === "PENDING")
    .map((w) => ({
      id: `wd-${w.id}`,
      type: "new_withdrawal",
      title: "Withdrawal Detail Request",
      message: `${w.clientName} requested withdrawal of $${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} via ${w.method}.`,
      createdAt: w.createdAt || "Recently",
      isRead: false,
      targetTab: "payments-withdrawals" as ActiveNavTab,
    }));

  const pendingKycNotifs: AdminNotificationItem[] = kycVerifications
    .filter((k) => k.status === "PENDING")
    .map((k) => ({
      id: `kyc-${k.id}`,
      type: "kyc_submitted",
      title: "KYC Verification Pending",
      message: `${k.clientName} (${k.country}) submitted ${k.docType} for identity verification.`,
      createdAt: k.submittedAt || "Recently",
      isRead: false,
      targetTab: "verification" as ActiveNavTab,
    }));

  // Combine DB notifications with pending items
  const allNotifications: AdminNotificationItem[] = clearedNotifications
    ? []
    : [...pendingDepositNotifs, ...pendingWithdrawalNotifs, ...pendingKycNotifs, ...dbNotifications.filter((n) => !n.isRead)];

  const totalUnreadCount = allNotifications.length;

  const handleMarkAllRead = () => {
    setClearedNotifications(true);
    api.markAllNotificationsRead(currentCompany);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 select-none shrink-0 sticky top-0 z-20 shadow-xs font-sans">
      {/* Global Search Bar */}
      <div className="flex-1 max-w-xs md:max-w-sm relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search client login, name, ticket #, or symbol..."
          className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-sans"
        />
        {globalSearch && (
          <button
            onClick={() => setGlobalSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Multi-Company Dropdown Switcher */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
            isCompanyDropdownOpen
              ? "bg-slate-50 border-slate-300 ring-2 ring-emerald-500/10"
              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
          }`}
          title="Select Broker Company Entity"
        >
          {/* Company Monogram Badge */}
          <span
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black uppercase text-white shadow-xs bg-gradient-to-tr ${companyConfig.avatarGradient}`}
          >
            {companyConfig.initials}
          </span>

          <div className="text-left flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-slate-800 tracking-tight leading-none">
                {companyConfig.name}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${companyConfig.statusDotColor} animate-pulse`} />
            </div>
            <span className="text-[9px] font-mono text-slate-400 leading-tight">
              {companyConfig.serverName.replace(" Financial", "").replace(" Global", "").replace(" Live", "")}
            </span>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ml-0.5 ${
              isCompanyDropdownOpen ? "rotate-180 text-slate-700" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu Popup */}
        {isCompanyDropdownOpen && (
          <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-fadeIn font-sans">
            {/* Header */}
            <div className="px-3.5 py-1.5 flex items-center justify-between border-b border-slate-100 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Managed Broker Entities
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {companies.length} Brands
              </span>
            </div>

            {/* Company Options */}
            <div className="space-y-0.5 px-1.5">
              {companies.map((comp) => {
                const isSelected = currentCompany === comp.id;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => {
                      setCompany(comp.id);
                      setIsCompanyDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? comp.id === "novafxm"
                          ? "bg-amber-50/90 border border-amber-300 text-amber-950"
                          : comp.id === "a5markets"
                          ? "bg-teal-50/90 border border-teal-300 text-teal-950"
                          : "bg-emerald-50/90 border border-emerald-300 text-emerald-950"
                        : "hover:bg-slate-50 text-slate-700 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black uppercase text-white shadow-2xs shrink-0 bg-gradient-to-tr ${comp.avatarGradient}`}
                      >
                        {comp.initials}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold tracking-tight text-slate-900 truncate">
                            {comp.name}
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full ${comp.statusDotColor} shrink-0 animate-pulse`} />
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {comp.fullName}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="shrink-0 ml-2">
                        <Check
                          className={`w-4 h-4 ${
                            comp.id === "novafxm"
                              ? "text-amber-600"
                              : comp.id === "a5markets"
                              ? "text-teal-600"
                              : "text-emerald-700"
                          }`}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Notice */}
            <div className="mt-1.5 pt-1.5 px-3.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-sans">
              <span>All client data & trades isolated</span>
              <span className="font-mono font-medium text-slate-600 uppercase">LIVE GATEWAY</span>
            </div>
          </div>
        )}
      </div>

      {/* Admin Controls, Month Filter & Notifications */}
      <div className="flex items-center gap-3">
        {/* Month Dropdown & Monthly Breakdown Button */}
        <div className="flex items-center gap-2">
          {/* Month Dropdown */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            aria-label="Select reporting month"
            className="text-xs font-bold bg-white border border-slate-200 text-slate-700 py-1.5 px-3 rounded-xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs"
          >
            <option value="LIVE">⚡ Real-Time (Live Server)</option>
            {monthlyBrokerStats.map((stat) => (
              <option key={stat.monthKey} value={stat.monthKey}>
                {stat.label} {stat.monthKey === "2026-09" ? "(Current)" : `[${stat.status}]`}
              </option>
            ))}
          </select>

          {/* Toggle Monthly Breakdown Table */}
          <button
            onClick={() => {
              setShowMonthlyTable((prev) => !prev);
              setActiveTab("dashboard");
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
              showMonthlyTable
                ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            }`}
            title="Toggle Monthly Breakdown Table"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Monthly Breakdown</span>
          </button>
        </div>

        {/* MySQL Workbench Database Connection Status */}
        {/* <button
          type="button"
          onClick={() => refreshDbData()}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition-all shadow-2xs cursor-pointer ${
            dbStatus.connected
              ? "bg-emerald-50/90 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              : "bg-amber-50/90 border-amber-300 text-amber-800 hover:bg-amber-100"
          }`}
          title={
            dbStatus.connected
              ? `Connected to MySQL: ${dbStatus.database || "mt5_portal"} @ ${dbStatus.host || "localhost"}:${dbStatus.port || 3306}. Click to refresh.`
              : `MySQL Not Connected: ${dbStatus.error || "Execute database/schema.sql in MySQL Workbench"}. Click to retry.`
          }
        >
          <Database className="w-3.5 h-3.5 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="hidden md:inline font-bold text-[11px]">
              {dbStatus.connected ? "MySQL: Live" : "MySQL: Setup"}
            </span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                dbStatus.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
          </div>
          {isDbLoading && <RefreshCw className="w-3 h-3 animate-spin text-slate-500 ml-0.5" />}
        </button> */}

        {/* Notification Bell with Admin Notifications Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setIsNotificationDropdownOpen((prev) => !prev)}
            className={`p-2 rounded-xl border transition-all relative cursor-pointer ${
              isNotificationDropdownOpen
                ? "bg-slate-200 border-slate-300 text-slate-900 shadow-inner"
                : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
            title="Admin Notifications & Requests waiting for action"
          >
            <Bell className="w-4 h-4" />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9.5px] font-extrabold flex items-center justify-center ring-2 ring-white animate-pulse">
                {totalUnreadCount}
              </span>
            )}
          </button>

          {/* Admin Notifications Dropdown Modal */}
          {isNotificationDropdownOpen && (
            <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden z-50 animate-fadeIn font-sans">
              {/* Dropdown Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 tracking-wide font-sans">
                    Admin Notifications
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Requests waiting for action ({companyConfig.name})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {totalUnreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10.5px] font-extrabold transition-colors cursor-pointer"
                    >
                      Read all
                    </button>
                  )}
                  <button
                    onClick={() => setIsNotificationDropdownOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 font-sans">
                {allNotifications.length > 0 ? (
                  allNotifications.map((notif) => {
                    const getIcon = () => {
                      if (notif.type === "new_deposit") return <ArrowDownCircle className="w-4 h-4 text-emerald-600" />;
                      if (notif.type === "new_withdrawal") return <ArrowUpCircle className="w-4 h-4 text-rose-600" />;
                      if (notif.type === "bank_account_pending") return <CreditCard className="w-4 h-4 text-amber-600" />;
                      if (notif.type === "kyc_submitted") return <ShieldAlert className="w-4 h-4 text-sky-600" />;
                      if (notif.type === "new_user") return <UserPlus className="w-4 h-4 text-indigo-600" />;
                      return <FileText className="w-4 h-4 text-amber-600" />;
                    };

                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (notif.targetTab) setActiveTab(notif.targetTab);
                          setIsNotificationDropdownOpen(false);
                        }}
                        className="p-3.5 hover:bg-amber-50/50 transition-colors cursor-pointer flex items-start gap-3 select-none"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          {getIcon()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {notif.title}
                            </h4>
                            <span className="text-[9.5px] font-mono text-slate-400 shrink-0 font-semibold uppercase">
                              {notif.createdAt}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center select-none font-sans">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                      <CheckCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">All notifications cleared!</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No pending approval requests for {companyConfig.name}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile with Logout Dropdown */}
        <div className="relative pl-2 border-l border-slate-200" ref={profileDropdownRef}>
          <button
            type="button"
            onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Account Options"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs bg-gradient-to-tr ${companyConfig.avatarGradient}`}
            >
              {companyConfig.initials}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>{currentUser?.name || "Admin Console"}</span>
                <Shield
                  className={`w-3 h-3 inline ${
                    currentCompany === "novafxm"
                      ? "text-amber-600"
                      : currentCompany === "a5markets"
                      ? "text-teal-600"
                      : "text-emerald-700"
                  }`}
                />
              </div>
              <div className="text-[10px] text-slate-500 font-medium tracking-tight">
                {currentUser?.email || companyConfig.brand}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
          </button>

          {/* Profile Dropdown Popup */}
          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn font-sans">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentUser?.name || "Master Admin"}</p>
                <p className="text-[11px] font-mono text-slate-500 truncate">{currentUser?.email || "master@novafxm.com"}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentUser?.role || "Super Administrator"}
                </span>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out of Master Panel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

