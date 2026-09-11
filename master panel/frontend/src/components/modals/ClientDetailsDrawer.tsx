import React, { useState, useEffect, useRef } from "react";
import { usePortal } from "../../context/PortalContext";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  ExternalLink,
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  FileText,
  Clock,
  Layers,
  Save,
  RotateCcw,
  GripHorizontal,
  Gift,
  PlusCircle,
  MinusCircle,
} from "lucide-react";

type DrawerTab = "info" | "open" | "closed" | "deposit-withdraw";

export const ClientDetailsDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialTab?: DrawerTab;
  onOpenBalanceModal?: () => void;
}> = ({ isOpen, onClose, initialTab = "info" }) => {
  const {
    selectedClient,
    clients,
    openTrades,
    closedTrades,
    closeTrade,
    adjustClientBalance,
    updateClient,
    setActiveTab,
    companyConfig,
  } = usePortal();

  // Tab order: Account Information (1st) -> Live Open Positions -> Closed Orders History -> Deposit & Withdrawal
  const [activeTab, setActiveDrawerTab] = useState<DrawerTab>("info");

  // Draggable Modal Window State
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  // Reset position when drawer opens or client changes
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      setActiveDrawerTab(initialTab);
    }
  }, [isOpen, selectedClient?.login, initialTab]);

  // Window drag listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startMouseX;
      const dy = e.clientY - dragRef.current.startMouseY;
      setPosition({
        x: dragRef.current.startPosX + dx,
        y: dragRef.current.startPosY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, select, textarea, a")) {
      return;
    }
    setIsDragging(true);
    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  // Editable form state for Account Information Tab
  const [formData, setFormData] = useState({
    name: selectedClient?.name || "",
    email: selectedClient?.email || "",
    phone: selectedClient?.phone || "",
    whatsapp: selectedClient?.whatsapp || "",
    country: selectedClient?.country || "",
    accountType: selectedClient?.accountType || (selectedClient && selectedClient.login >= 2000000 ? "Demo" : "Live"),
    group: selectedClient?.group || "Standard",
    leverage: selectedClient?.leverage || "1:500",
    kycStatus: selectedClient?.kycStatus || "Unverified",
    status: (selectedClient?.status === "Active" ? "Active" : "Deactive") as "Active" | "Deactive",
  });
  const [infoSaveSuccess, setInfoSaveSuccess] = useState<boolean>(false);

  // Sync formData whenever selectedClient changes
  useEffect(() => {
    if (selectedClient) {
      setFormData({
        name: selectedClient.name,
        email: selectedClient.email,
        phone: selectedClient.phone || "",
        whatsapp: selectedClient.whatsapp || "",
        country: selectedClient.country || "",
        accountType: selectedClient.accountType || (selectedClient.login >= 2000000 ? "Demo" : "Live"),
        group: selectedClient.group || "Standard",
        leverage: selectedClient.leverage || "1:500",
        kycStatus: selectedClient.kycStatus || "Unverified",
        status: selectedClient.status === "Active" ? "Active" : "Deactive",
      });
      setInfoSaveSuccess(false);
    }
  }, [
    selectedClient?.login,
    selectedClient?.name,
    selectedClient?.email,
    selectedClient?.phone,
    selectedClient?.whatsapp,
    selectedClient?.country,
    selectedClient?.accountType,
    selectedClient?.group,
    selectedClient?.leverage,
    selectedClient?.kycStatus,
    selectedClient?.status,
  ]);

  const handleSaveAccountInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    updateClient(selectedClient.login, {
      name: formData.name.trim() || selectedClient.name,
      email: formData.email.trim() || selectedClient.email,
      phone: formData.phone.trim(),
      whatsapp: formData.whatsapp.trim(),
      country: formData.country.trim() || "Global",
      accountType: formData.accountType as any,
      group: formData.group as any,
      leverage: formData.leverage.trim() || selectedClient.leverage,
      kycStatus: formData.kycStatus as any,
      status: formData.status as any,
    });

    setInfoSaveSuccess(true);
    setTimeout(() => setInfoSaveSuccess(false), 2500);
  };

  const handleResetAccountInfo = () => {
    if (!selectedClient) return;
    setFormData({
      name: selectedClient.name,
      email: selectedClient.email,
      phone: selectedClient.phone || "",
      whatsapp: selectedClient.whatsapp || "",
      country: selectedClient.country || "",
      accountType: selectedClient.accountType || (selectedClient.login >= 2000000 ? "Demo" : "Live"),
      group: selectedClient.group || "Standard",
      leverage: selectedClient.leverage || "1:500",
      kycStatus: selectedClient.kycStatus || "Unverified",
      status: selectedClient.status === "Active" ? "Active" : "Deactive",
    });
    setInfoSaveSuccess(false);
  };

  // Form state for Deposit / Withdraw / Bonus Tab
  const [opType, setOpType] = useState<"DEPOSIT" | "WITHDRAW" | "BONUS">("DEPOSIT");
  const [bonusAction, setBonusAction] = useState<"ADD" | "REMOVE">("ADD");
  const [amount, setAmount] = useState<string>("1000");
  const [comment, setComment] = useState<string>(""); // empty default per user instructions
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [targetAccountLogin, setTargetAccountLogin] = useState<number | null>(selectedClient?.login ?? null);
  const [targetAccountSearch, setTargetAccountSearch] = useState<string>("");

  useEffect(() => {
    if (selectedClient) {
      setTargetAccountLogin(selectedClient.login);
      setTargetAccountSearch("");
    }
  }, [selectedClient?.login]);

  if (!isOpen || !selectedClient) return null;

  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const clientTrades = openTrades.filter((t) => t.login === selectedClient.login);
  const clientClosed = closedTrades.filter((t) => t.login === selectedClient.login);
  const liveAccounts = clients
    .filter((client) => client.accountType === "Live" || (client.login >= 1000000 && client.login < 2000000))
    .sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime());
  const targetClient = liveAccounts.find((client) => client.login === targetAccountLogin) || selectedClient;

  const isClientOnline =
    selectedClient.status === "Active" &&
    (Boolean((selectedClient as any).isOnline) ||
      clientTrades.length > 0 ||
      Boolean(
        selectedClient.lastLogin &&
          (selectedClient.lastLogin.includes("2026-09-08") ||
            selectedClient.lastLogin.includes("Recently") ||
            selectedClient.lastLogin.includes("Just now"))
      ));

  const getMarginHealthClass = (level: number) => {
    if (level === 0) return "text-slate-400";
    if (level > 200) return "text-emerald-600";
    if (level > 100) return "text-amber-600";
    return "text-rose-600 font-bold";
  };

  // Handle Save (Deposit / Withdrawal / Bonus operation)
  const handleSaveOperation = (e: React.FormEvent) => {
    e.preventDefault();
    const valAmount = parseFloat(amount) || 0;
    if (valAmount <= 0) return;

    if (opType === "DEPOSIT") {
      // deposit: add to client balance
      adjustClientBalance(targetClient.login, valAmount, false);
    } else if (opType === "WITHDRAW") {
      // withdraw: deduct from client balance
      adjustClientBalance(targetClient.login, -valAmount, false);
    } else if (opType === "BONUS") {
      // bonus: add or remove client bonus/credit
      const deltaBonus = bonusAction === "REMOVE" ? -valAmount : valAmount;
      adjustClientBalance(targetClient.login, deltaBonus, true);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-2 sm:p-4 animate-fadeIn select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-xs pointer-events-auto"
        onClick={onClose}
      />

      {/* Movable Dialog Window */}
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? "none" : "transform 0.05s ease-out",
        }}
        className="relative pointer-events-auto w-full max-w-4xl lg:w-[940px] max-h-[96vh] bg-white border border-slate-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans select-none"
      >
        {/* Drawer / Modal Header - Draggable */}
        <div
          onMouseDown={handleMouseDown}
          className={`px-4 py-2.5 border-b border-slate-300 bg-[#f8fafc] flex items-center justify-between select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          title="Click and drag header to move window anywhere on screen"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-white text-xs shadow-2xs shrink-0"
              style={{ backgroundColor: brandPrimary }}
            >
              #{selectedClient.login.toString().slice(-4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 tracking-wide font-sans">
                  {selectedClient.name}
                </h2>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase font-sans ${
                    selectedClient.status === "Active"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                      : "bg-rose-50 text-rose-800 border border-rose-300"
                  }`}
                >
                  {selectedClient.status === "Active" ? "Active" : "Deactive"}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase flex items-center gap-1 font-sans ${
                    selectedClient.kycStatus === "Verified"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                      : "bg-amber-50 text-amber-800 border border-amber-300"
                  }`}
                >
                  {selectedClient.kycStatus === "Verified" ? (
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-2.5 h-2.5 text-amber-600" />
                  )}
                  {selectedClient.kycStatus}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                {isClientOnline ? (
                  <span
                    className="relative flex h-2 w-2 shrink-0 cursor-help"
                    title="Client is Online (Connected to MT5 Server)"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs"></span>
                  </span>
                ) : (
                  <span
                    className="inline-flex h-2 w-2 rounded-full bg-slate-300 border border-slate-400/40 shrink-0 cursor-help"
                    title={`Client is Offline${selectedClient.lastLogin ? ` (Last seen: ${selectedClient.lastLogin})` : ""}`}
                  ></span>
                )}
                <span>
                  Account #{selectedClient.login} • Group: {selectedClient.group} • Leverage: {selectedClient.leverage}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-300 shadow-2xs"
              title="Click and drag header to move"
            >
              <GripHorizontal className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Move</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* ========================================================================= */}
          {/* 1. FINANCIAL SUMMARY - SINGLE ROW EXCEL VIEW TYPE                         */}
          {/* ========================================================================= */}
          <div>
            <div className="flex items-center justify-between mb-1 px-0.5">
              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider font-mono">
                FINANCIAL SUMMARY (SINGLE ROW EXCEL GRID)
              </span>
            </div>

            {/* Single Row Excel Table */}
            <div className="border border-slate-300 rounded-md overflow-hidden shadow-2xs font-mono">
              <table className="w-full text-center border-collapse table-fixed">
                {/* Excel Header Row */}
                <thead className="bg-[#e2e8f0] text-slate-800 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-300 select-none">
                  <tr>
                    <th className="py-1 px-2 border-r border-slate-300 w-1/6">Balance</th>
                    <th className="py-1 px-2 border-r border-slate-300 w-1/6">Credit</th>
                    <th className="py-1 px-2 border-r border-slate-300 w-1/6">Equity</th>
                    <th className="py-1 px-2 border-r border-slate-300 w-1/6">Used Margin</th>
                    <th className="py-1 px-2 border-r border-slate-300 w-1/6">Free Margin</th>
                    <th className="py-1 px-2 w-1/6">Margin Level</th>
                  </tr>
                </thead>
                {/* Excel Single Value Row */}
                <tbody className="bg-white text-[11.5px] font-bold">
                  <tr className="h-7.5">
                    <td className="py-1 px-2 border-r border-slate-200 text-slate-900 truncate">
                      ${selectedClient.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-200 text-amber-700 truncate">
                      ${selectedClient.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-200 text-emerald-700 truncate">
                      ${selectedClient.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-200 text-slate-700 truncate">
                      ${selectedClient.margin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-200 text-emerald-700 truncate">
                      ${selectedClient.freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-1 px-2 truncate ${getMarginHealthClass(selectedClient.marginLevel)}`}>
                      {selectedClient.marginLevel > 0 ? `${selectedClient.marginLevel.toFixed(1)}%` : "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABS HEADER BAR: Account Info (1st) | Open Positions | Closed Orders | Deposit/Withdraw */}
          {/* ========================================================================= */}
          <div className="pt-0.5">
            <div className="flex items-center gap-1.5 border-b border-slate-300 pb-1.5 select-none">
              <button
                onClick={() => setActiveDrawerTab("info")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "info"
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Account Information</span>
              </button>

              <button
                onClick={() => setActiveDrawerTab("open")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "open"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>Live Open Positions</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20 text-white">
                  {clientTrades.length}
                </span>
              </button>

              <button
                onClick={() => setActiveDrawerTab("closed")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "closed"
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>Closed Orders History</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20 text-white">
                  {clientClosed.length}
                </span>
              </button>

              <button
                onClick={() => setActiveDrawerTab("deposit-withdraw")}
                className={`px-3 py-1 rounded-md text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 shadow-2xs ${
                  activeTab === "deposit-withdraw"
                    ? "bg-amber-500 text-black"
                    : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300"
                }`}
              >
                <DollarSign className="w-3 h-3" />
                <span>Deposit & Withdrawal</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: LIVE OPEN POSITIONS (EXCEL GRID VIEW)                              */}
          {/* ========================================================================= */}
          {activeTab === "open" && (
            <div className="space-y-2 animate-fadeIn font-mono">
              {clientTrades.length === 0 ? (
                <div className="bg-slate-50 border border-slate-300 rounded-md p-6 text-center text-xs text-slate-400 font-sans">
                  No active open positions for account #{selectedClient.login}.
                </div>
              ) : (
                <div className="border border-slate-300 rounded-md overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed text-xs">
                      <thead className="bg-[#e2e8f0] text-slate-800 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-300 select-none">
                        <tr>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[75px]">Ticket</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[75px]">Symbol</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300 w-[55px] text-center">Type</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[60px] text-right">Lots</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[85px] text-right">Open Price</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[85px] text-right">Live Price</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[85px] text-right">P&L ($)</th>
                          <th className="py-1.5 px-2 text-center w-[65px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {clientTrades.map((t, index) => (
                          <tr
                            key={t.ticket}
                            className={`h-7.5 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                            } hover:bg-slate-100`}
                          >
                            <td className="py-1 px-2 border-r border-slate-200 font-bold text-slate-700 truncate">
                              #{t.ticket}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 font-bold text-slate-900 truncate">
                              {t.symbol}
                            </td>
                            <td className="py-1 px-1.5 border-r border-slate-200 text-center truncate">
                              <span
                                className={`px-1 py-0.2 rounded text-[9px] font-black uppercase ${
                                  t.type === "BUY"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {t.type}
                              </span>
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 text-right font-bold truncate">
                              {(t.lots || 0).toFixed(2)}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 text-right text-slate-600 truncate">
                              {(t.openPrice || 0).toFixed(5)}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 text-right font-bold text-slate-800 truncate">
                              {(t.currentPrice || t.openPrice || 0).toFixed(5)}
                            </td>
                            <td
                              className={`py-1 px-2 border-r border-slate-200 text-right font-bold truncate ${
                                (t.profit || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {(t.profit || 0) >= 0 ? "+" : ""}${(t.profit || 0).toFixed(2)}
                            </td>
                            <td className="py-1 px-2 text-center truncate">
                              <button
                                onClick={() => closeTrade(t.ticket)}
                                className="px-1.5 py-0.2 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                Close
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CLOSED ORDERS HISTORY (EXCEL GRID VIEW)                            */}
          {/* ========================================================================= */}
          {activeTab === "closed" && (
            <div className="space-y-2 animate-fadeIn font-mono">
              {clientClosed.length === 0 ? (
                <div className="bg-slate-50 border border-slate-300 rounded-md p-6 text-center text-xs text-slate-400 font-sans">
                  No closed order history for account #{selectedClient.login}.
                </div>
              ) : (
                <div className="border border-slate-300 rounded-md overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed text-xs">
                      <thead className="bg-[#e2e8f0] text-slate-800 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-300 select-none">
                        <tr>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[80px]">Ticket</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[80px]">Symbol</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300 w-[60px] text-center">Type</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[65px] text-right">Lots</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[90px] text-right">Close Price</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-[130px] text-left">Close Time</th>
                          <th className="py-1.5 px-2.5 text-right w-[95px]">Realized P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {clientClosed.map((c, index) => (
                          <tr
                            key={c.ticket}
                            className={`h-7.5 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                            } hover:bg-slate-100`}
                          >
                            <td className="py-1 px-2 border-r border-slate-200 font-bold text-slate-700 truncate">
                              #{c.ticket}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 font-bold text-slate-900 truncate">
                              {c.symbol}
                            </td>
                            <td className="py-1 px-1.5 border-r border-slate-200 text-center truncate">
                              <span
                                className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                  c.type === "BUY"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {c.type}
                              </span>
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 text-right truncate">
                              {c.lots.toFixed(2)}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 text-right text-slate-700 truncate">
                              {c.closePrice ? c.closePrice.toFixed(5) : "-"}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 text-slate-500 text-[10.5px] truncate">
                              {c.closeTime || "-"}
                            </td>
                            <td
                              className={`py-1 px-2.5 text-right font-black truncate ${
                                c.profit >= 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {c.profit >= 0 ? "+" : ""}${c.profit.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ACCOUNT INFORMATION (EDITABLE EXCEL GRID VIEW WITH SAVE BUTTON)    */}
          {/* ========================================================================= */}
          {activeTab === "info" && (
            <div className="space-y-3 animate-fadeIn font-sans">
              <form onSubmit={handleSaveAccountInfo} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Left Column: Client Profile & Contact */}
                  <div className="border border-slate-300 rounded-md overflow-hidden shadow-2xs font-mono bg-white">
                    <div className="bg-[#e2e8f0] text-slate-800 text-[10.5px] font-extrabold uppercase tracking-wider py-1.5 px-3 border-b border-slate-300 flex items-center justify-between select-none">
                      <span>Client Profile & Contact</span>
                      <span className="text-[10px] text-slate-500 font-sans font-normal">6 Fields</span>
                    </div>
                    <table className="w-full border-collapse table-fixed text-xs">
                      <tbody className="text-[11.5px] divide-y divide-slate-200">
                        {/* Account ID (Read-only) */}
                        <tr className="bg-[#f8fafc] hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-500 font-sans font-semibold w-[36%]">
                            Account ID
                          </td>
                          <td className="py-1 px-3 font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 font-mono text-[11px]">
                              #{selectedClient.login}
                            </span>
                          </td>
                        </tr>

                        {/* Client Name (Editable) */}
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-600 font-sans font-semibold">
                            Client Name
                          </td>
                          <td className="py-0.5 px-2">
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-2 py-0.5 text-xs font-bold text-slate-900 outline-none transition-all shadow-2xs"
                              placeholder="Full Name"
                              required
                            />
                          </td>
                        </tr>

                        {/* Email Address (Editable) */}
                        <tr className="bg-[#f8fafc] hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-600 font-sans font-semibold">
                            Email
                          </td>
                          <td className="py-0.5 px-2">
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-2 py-0.5 text-xs text-slate-800 font-mono outline-none transition-all shadow-2xs"
                              placeholder="client@example.com"
                              required
                            />
                          </td>
                        </tr>

                        {/* Phone Number (Editable) */}
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-600 font-sans font-semibold">
                            Phone
                          </td>
                          <td className="py-0.5 px-2">
                            <input
                              type="text"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-2 py-0.5 text-xs text-slate-800 font-mono outline-none transition-all shadow-2xs"
                              placeholder="+1 555 0192"
                            />
                          </td>
                        </tr>

                        {/* WhatsApp Contact (Editable) */}
                        <tr className="bg-[#f8fafc] hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-600 font-sans font-semibold">
                            WhatsApp
                          </td>
                          <td className="py-0.5 px-2">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={formData.whatsapp}
                                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-2 py-0.5 text-xs text-slate-800 font-mono outline-none transition-all shadow-2xs"
                                placeholder="+1 555 0192"
                              />
                              {formData.whatsapp && (
                                <a
                                  href={`https://wa.me/${formData.whatsapp.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-[10.5px] font-bold inline-flex items-center gap-1 shrink-0 transition-colors"
                                  title="Open WhatsApp chat"
                                >
                                  <span>Chat</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Country (Editable) */}
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-600 font-sans font-semibold">
                            Country
                          </td>
                          <td className="py-0.5 px-2">
                            <input
                              type="text"
                              value={formData.country}
                              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                              className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-2 py-0.5 text-xs text-slate-800 font-sans outline-none transition-all shadow-2xs"
                              placeholder="Country"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Right Column: Trading Configuration & Status */}
                  <div className="border border-slate-300 rounded-md overflow-hidden shadow-2xs font-mono bg-white">
                    <div className="bg-[#e2e8f0] text-slate-800 text-[10.5px] font-extrabold uppercase tracking-wider py-1.5 px-3 border-b border-slate-300 flex items-center justify-between select-none">
                      <span>Trading & Account Settings</span>
                      <span className="text-[10px] text-slate-500 font-sans font-normal">Controls</span>
                    </div>
                    <table className="w-full border-collapse table-fixed text-xs">
                      <tbody className="text-[11.5px] divide-y divide-slate-200">
                        {/* Account Type (Editable) */}
                        <tr className="bg-[#f8fafc] hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-600 font-sans font-semibold w-[36%]">
                            Account Type
                          </td>
                          <td className="py-0.5 px-2">
                            <select
                              value={formData.accountType}
                              onChange={(e) => setFormData({ ...formData, accountType: e.target.value as any })}
                              className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-2 py-0.5 text-xs font-bold text-slate-900 outline-none transition-all shadow-2xs cursor-pointer"
                            >
                              <option value="Live">Live Account</option>
                              <option value="Demo">Demo Account</option>
                            </select>
                          </td>
                        </tr>

                        {/* Trading Group (Editable) */}
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-600 font-sans font-semibold">
                            Trading Group
                          </td>
                          <td className="py-0.5 px-2">
                            <select
                              value={formData.group}
                              onChange={(e) => setFormData({ ...formData, group: e.target.value as any })}
                              className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-2 py-0.5 text-xs font-semibold text-slate-900 outline-none transition-all shadow-2xs cursor-pointer"
                            >
                              <option value="Standard">Standard</option>
                              <option value="Raw ECN">Raw ECN</option>
                              <option value="VIP Pro">VIP Pro</option>
                              <option value="Cent">Cent</option>
                            </select>
                          </td>
                        </tr>

                        {/* Leverage Ratio (Editable text input) */}
                        <tr className="bg-[#f8fafc] hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-600 font-sans font-semibold">
                            Leverage Ratio
                          </td>
                          <td className="py-0.5 px-2">
                            <input
                              type="text"
                              value={formData.leverage}
                              onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
                              placeholder="e.g. 1:500"
                              className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-2 py-0.5 text-xs font-bold text-slate-900 font-mono outline-none transition-all shadow-2xs"
                            />
                          </td>
                        </tr>

                        {/* KYC Verification (Editable) */}
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-600 font-sans font-semibold">
                            KYC Status
                          </td>
                          <td className="py-0.5 px-2">
                            <select
                              value={formData.kycStatus}
                              onChange={(e) => setFormData({ ...formData, kycStatus: e.target.value as any })}
                              className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-2 py-0.5 text-xs font-bold text-slate-900 outline-none transition-all shadow-2xs cursor-pointer"
                            >
                              <option value="Verified">Verified</option>
                              <option value="Pending">Pending</option>
                              <option value="Unverified">Unverified</option>
                            </select>
                          </td>
                        </tr>

                        {/* Account Status (Editable: Active / Deactive) */}
                        <tr className="bg-[#f8fafc] hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-600 font-sans font-semibold">
                            Account Status
                          </td>
                          <td className="py-0.5 px-2">
                            <select
                              value={formData.status === "Active" ? "Active" : "Deactive"}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  status: e.target.value as "Active" | "Deactive",
                                })
                              }
                              className="w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-2 py-0.5 text-xs font-bold text-slate-900 outline-none transition-all shadow-2xs cursor-pointer"
                            >
                              <option value="Active">Active</option>
                              <option value="Deactive">Deactive</option>
                            </select>
                          </td>
                        </tr>

                        {/* Registered / Last Login (Read-only) */}
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1 px-3 border-r border-slate-200 text-slate-500 font-sans font-semibold">
                            Activity
                          </td>
                          <td className="py-1 px-2.5 text-slate-600 text-[10.5px]">
                            <span className="font-mono text-slate-700">{selectedClient.registeredAt || "N/A"}</span>
                            <span className="text-slate-400 mx-1">•</span>
                            <span className="text-slate-500">Last: {selectedClient.lastLogin || "N/A"}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Save Bar */}
                <div className="flex items-center justify-between pt-1">
                  {infoSaveSuccess ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg animate-fadeIn shadow-2xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Account information updated and saved successfully!</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Edit details above and click Save to apply changes.
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetAccountInfo}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Reset</span>
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-1.5 rounded-lg text-xs font-black text-white shadow-xs transition-all flex items-center gap-1.5 hover:brightness-105 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: brandPrimary }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: DEPOSIT & WITHDRAWAL FORM (MATCHING 2ND IMAGE DIRECTLY)            */}
          {/* (Operation type: ONLY Deposit and Withdrawal; button: Save)              */}
          {/* ========================================================================= */}
          {activeTab === "deposit-withdraw" && (
            <div className="space-y-4 animate-fadeIn">
              <form
                onSubmit={handleSaveOperation}
                className="bg-white border border-slate-300 rounded-xl p-4 space-y-4 shadow-2xs font-sans"
              >
                {/* Form Title & Target Account */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Target Account
                    </label>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      Current Bal: <strong className="text-slate-900">${targetClient.balance.toLocaleString()}</strong>
                    </span>
                  </div>
                  <input
                    list="live-target-accounts"
                    value={targetAccountSearch || `#${targetClient.login} — ${targetClient.name} (Bal: $${targetClient.balance.toLocaleString()} | Credit: $${targetClient.credit.toLocaleString()})`}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTargetAccountSearch(value);
                      const account = liveAccounts.find((client) => value.startsWith(`#${client.login} `));
                      if (account) {
                        setTargetAccountLogin(account.login);
                        setTargetAccountSearch("");
                      }
                    }}
                    onFocus={() => setTargetAccountSearch("")}
                    placeholder="Search live account by login, name, or email..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 shadow-2xs focus:outline-none focus:border-amber-500"
                  />
                  <datalist id="live-target-accounts">
                    {liveAccounts.map((client) => (
                      <option key={client.login} value={`#${client.login} — ${client.name} (Bal: $${client.balance.toLocaleString()} | Credit: $${client.credit.toLocaleString()})`} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-[10px] font-mono text-slate-400">Searchable live accounts • newest registrations first</p>
                  <div className="hidden w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 shadow-2xs">
                    #{selectedClient.login} — {selectedClient.name} (Bal: ${selectedClient.balance.toLocaleString()} | Credit: ${selectedClient.credit.toLocaleString()})
                  </div>
                </div>

                {/* OPERATION TYPE: DEPOSIT, WITHDRAW, BONUS (3 TABS) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Operation Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setOpType("DEPOSIT")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                        opType === "DEPOSIT"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <ArrowUpCircle className={`w-3.5 h-3.5 ${opType === "DEPOSIT" ? "text-emerald-600" : "text-slate-400"}`} />
                      <span>Deposit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpType("WITHDRAW")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                        opType === "WITHDRAW"
                          ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20 shadow-xs"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <ArrowDownCircle className={`w-3.5 h-3.5 ${opType === "WITHDRAW" ? "text-rose-600" : "text-slate-400"}`} />
                      <span>Withdraw</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpType("BONUS")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                        opType === "BONUS"
                          ? "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Gift className={`w-3.5 h-3.5 ${opType === "BONUS" ? "text-amber-600" : "text-slate-400"}`} />
                      <span>Bonus</span>
                    </button>
                  </div>
                </div>

                {/* BONUS SUB-OPTIONS: ADD BONUS vs REMOVE BONUS */}
                {opType === "BONUS" && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-fadeIn">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                      Bonus Option
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBonusAction("ADD")}
                        className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                          bonusAction === "ADD"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Bonus (Credit In)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBonusAction("REMOVE")}
                        className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                          bonusAction === "REMOVE"
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <MinusCircle className="w-3.5 h-3.5" />
                        <span>Remove Bonus (Credit Out)</span>
                      </button>
                    </div>
                    <p className="text-[10.5px] text-amber-800/90 font-mono">
                      {bonusAction === "ADD"
                        ? "• Deposit Bonus will be added to the trader's account credit."
                        : "• Bonus will be deducted from the trader's account credit."}
                    </p>
                  </div>
                )}

                {/* Amount (USD) Input and Manager Note Side-by-Side in 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      {opType === "BONUS"
                        ? bonusAction === "ADD"
                          ? "Bonus Amount to Add (USD)"
                          : "Bonus Amount to Remove (USD)"
                        : opType === "DEPOSIT"
                        ? "Deposit Amount (USD)"
                        : "Withdrawal Amount (USD)"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Manager Note / Audit Comment (Empty by default per User Request) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Manager Note / Audit Comment
                    </label>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Enter note or audit comment (optional)..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-sans text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Success Message Banner */}
                {saveSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>
                      {opType === "BONUS"
                        ? `Bonus ${bonusAction === "ADD" ? "credited" : "removed"} successfully! Client credit updated.`
                        : opType === "DEPOSIT"
                        ? "Deposit saved successfully! Client balance credited."
                        : "Withdrawal saved successfully! Client balance deducted."}
                    </span>
                  </div>
                )}

                {/* Action Buttons: Button changed from Apply Adjustment to Save (Per User Instructions) */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab("info")}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl text-xs font-black text-white shadow-xs transition-all flex items-center gap-1.5 hover:brightness-105 active:scale-95"
                    style={{ backgroundColor: brandPrimary }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
