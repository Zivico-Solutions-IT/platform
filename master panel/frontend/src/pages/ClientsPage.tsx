import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Client } from "../types";
import {
  Search,
  Phone,
  MessageCircle,
  Mail,
  MessageSquare,
  Clock,
  Send,
  Trash2,
  X,
} from "lucide-react";

export interface ClientComment {
  id: string;
  text: string;
  date: string; // "YYYY-MM-DD HH:mm"
  author?: string;
}

export const ClientsPage: React.FC<{
  filterMode?: "all" | "active" | "verified";
  onSelectClient: (client: Client) => void;
  onOpenBalanceModal: (login: number) => void;
}> = ({ filterMode = "all", onSelectClient, onOpenBalanceModal }) => {
  const { clients, companyConfig, openTrades } = usePortal();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<"Live" | "Demo" | "All">("Live");
  const [selectedRowLogin, setSelectedRowLogin] = useState<number | null>(null);

  // Client Comments State with LocalStorage persistence
  const [commentsMap, setCommentsMap] = useState<Record<number, ClientComment[]>>(() => {
    try {
      const saved = localStorage.getItem("MT5_CLIENT_COMMENTS_DATA");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Active Comment Modal
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>("");

  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  // Helper to get all comments for a client (with initial fallback history)
  const getClientComments = (client: Client): ClientComment[] => {
    if (commentsMap[client.login] && commentsMap[client.login].length > 0) {
      return commentsMap[client.login];
    }
    const regDate = client.registeredAt || "2026-09-01";
    return [
      {
        id: `c-init-${client.login}`,
        text:
          client.balance > 0
            ? `Live account verified. Initial deposit: $${client.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`
            : `Client profile created and verified for standard execution.`,
        date: `${regDate} 09:30`,
        author: "System",
      },
    ];
  };

  const handleOpenCommentModal = (client: Client) => {
    setActiveClient(client);
    setNewCommentText("");
  };

  // Add new comment to history
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient || !newCommentText.trim()) return;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const newEntry: ClientComment = {
      id: `c-${Date.now()}`,
      text: newCommentText.trim(),
      date: dateStr,
      author: "Manager",
    };

    const currentList = getClientComments(activeClient);
    const updatedList = [newEntry, ...currentList];

    const updatedMap = {
      ...commentsMap,
      [activeClient.login]: updatedList,
    };

    setCommentsMap(updatedMap);
    try {
      localStorage.setItem("MT5_CLIENT_COMMENTS_DATA", JSON.stringify(updatedMap));
    } catch (err) {
      console.error("Failed to save client comments to localStorage", err);
    }
    setNewCommentText("");
  };

  // Delete an individual comment
  const handleDeleteComment = (commentId: string) => {
    if (!activeClient) return;
    const currentList = getClientComments(activeClient);
    const updatedList = currentList.filter((c) => c.id !== commentId);

    const updatedMap = {
      ...commentsMap,
      [activeClient.login]: updatedList,
    };

    setCommentsMap(updatedMap);
    try {
      localStorage.setItem("MT5_CLIENT_COMMENTS_DATA", JSON.stringify(updatedMap));
    } catch (err) {
      console.error("Failed to save updated comments", err);
    }
  };

  const liveAccountsCount = clients.filter(
    (c) => (c.accountType || (c.login >= 2000000 ? "Demo" : "Live")) === "Live"
  ).length;
  const demoAccountsCount = clients.filter(
    (c) => (c.accountType || (c.login >= 2000000 ? "Demo" : "Live")) === "Demo"
  ).length;

  const filteredClients = clients.filter((c) => {
    if (filterMode === "active" && c.status !== "Active") return false;
    if (filterMode === "verified" && c.kycStatus !== "Verified") return false;

    const accType = c.accountType || (c.login >= 2000000 ? "Demo" : "Live");
    if (accountTypeFilter !== "All" && accType !== accountTypeFilter) return false;

    const query = searchQuery.toLowerCase();
    return (
      c.login.toString().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.country.toLowerCase().includes(query) ||
      (c.phone && c.phone.toLowerCase().includes(query)) ||
      (c.whatsapp && c.whatsapp.toLowerCase().includes(query))
    );
  });

  const isClientOnline = (client: Client): boolean => {
    if (client.status !== "Active") return false;
    if ((client as any).isOnline !== undefined) return Boolean((client as any).isOnline);
    if (openTrades && openTrades.some((t) => t.login === client.login)) return true;
    if (
      client.lastLogin &&
      (client.lastLogin.includes("2026-09-08") ||
        client.lastLogin.includes("Recently") ||
        client.lastLogin.includes("Just now"))
    ) {
      return true;
    }
    return false;
  };

  const onlineClientsCount = filteredClients.filter(isClientOnline).length;
  const offlineClientsCount = filteredClients.length - onlineClientsCount;

  const totalBalance = filteredClients.reduce((acc, c) => acc + c.balance, 0);
  const totalCredit = filteredClients.reduce((acc, c) => acc + (c.credit || 0), 0);
  const totalEquity = filteredClients.reduce((acc, c) => acc + c.equity, 0);

  return (
    <div className="p-3 sm:p-3.5 space-y-2 animate-fadeIn font-sans select-none bg-[#f8fafc] flex flex-col h-[calc(100vh-65px)]">
      {/* Top Compact Excel Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white border border-slate-300 p-2 rounded-lg shadow-2xs">
        {/* Left: Title + Live/Demo Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: brandPrimary }}
            />
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
              CLIENTS
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredClients.length} rows
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none">|</span>

          {/* Compact Live / Demo Switcher */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px]">
            <button
              onClick={() => setAccountTypeFilter("Live")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                accountTypeFilter === "Live"
                  ? "bg-white text-emerald-700 shadow-2xs font-extrabold border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live ({liveAccountsCount})</span>
            </button>

            <button
              onClick={() => setAccountTypeFilter("Demo")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                accountTypeFilter === "Demo"
                  ? "bg-white text-sky-700 shadow-2xs font-extrabold border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>Demo ({demoAccountsCount})</span>
            </button>

            <button
              onClick={() => setAccountTypeFilter("All")}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                accountTypeFilter === "All"
                  ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
          </div>

          <span className="text-slate-300 font-mono select-none hidden sm:inline">|</span>

          {/* Online / Offline Status Badge */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold" title={`${onlineClientsCount} Clients currently online`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{onlineClientsCount} Online</span>
            </div>
            <span className="text-slate-300 select-none">/</span>
            <div className="flex items-center gap-1 text-slate-500 font-medium" title={`${offlineClientsCount} Clients offline`}>
              <span className="inline-flex h-2 w-2 rounded-full bg-slate-300"></span>
              <span>{offlineClientsCount} Offline</span>
            </div>
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Balance:</span>
            <strong className="text-slate-900 font-bold">
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Equity:</span>
            <strong className="text-emerald-700 font-bold">
              ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Bonus:</span>
            <strong className="text-amber-700 font-bold">
              +${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Right: Search Box */}
        <div className="relative w-56 sm:w-64">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, name, email..."
            className="w-full bg-[#f8fafc] border border-slate-300 rounded-md pl-7 pr-6 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs font-mono transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Excel-Style Dense Table Grid Container */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed">
            {/* Excel Table Header */}
            <thead className="sticky top-0 bg-[#e2e8f0] text-slate-800 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-300 z-10 select-none shadow-2xs">
              <tr>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[110px] text-left">
                  ID
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[160px] text-left">
                  Name
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[190px] text-left">
                  Email
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[115px] text-left">
                  Phone
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[115px] text-left">
                  WhatsApp
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[105px] text-right">
                  Balance
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[105px] text-right">
                  Equity
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[85px] text-right">
                  Credit
                </th>
                <th className="py-1.5 px-1.5 border-r border-slate-300 w-[75px] text-center">
                  Leverage
                </th>
                <th className="py-1.5 px-2.5 text-left w-[200px]">
                  Comment
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows (h-7.5 compact height, tightly packed) */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredClients.map((client, index) => {
                const isOnline = isClientOnline(client);
                const isProfitable = client.equity >= client.balance + (client.credit || 0);
                const isLive = (client.accountType || (client.login >= 2000000 ? "Demo" : "Live")) === "Live";
                const isSelected = selectedRowLogin === client.login;
                const comments = getClientComments(client);
                const latestComment = comments[0];

                return (
                  <tr
                    key={client.id || `${client.accountType}-${client.login}`}
                    onClick={() => setSelectedRowLogin(client.login)}
                    onDoubleClick={() => onSelectClient(client)}
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
                    title="Click row to select • Double-click to open client details"
                  >
                    {/* 1. ID with Live Status Light */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold">
                      <div className="flex items-center gap-1.5">
                        {isOnline ? (
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
                            title={`Client is Offline${client.lastLogin ? ` (Last seen: ${client.lastLogin})` : ""}`}
                          ></span>
                        )}
                        <span className={isLive ? "text-emerald-700" : "text-sky-700"}>
                          #{client.login}
                        </span>
                        <span
                          className={`text-[8.5px] px-1 py-0 rounded font-sans font-extrabold ${
                            isLive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {isLive ? "L" : "D"}
                        </span>
                      </div>
                    </td>

                    {/* 2. Name */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-900 font-semibold text-[11.5px]">
                      {client.name}
                    </td>

                    {/* 3. Email */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-600 text-[11px]">
                      <div className="flex items-center gap-1 truncate">
                        <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="truncate select-all">{client.email}</span>
                      </div>
                    </td>

                    {/* 4. Phone */}
                    <td className="py-1 px-2 border-r border-slate-200 truncate text-slate-600 text-[10.5px]">
                      <div className="flex items-center gap-1 truncate">
                        <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    </td>

                    {/* 5. WhatsApp */}
                    <td
                      className="py-1 px-2 border-r border-slate-200 truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={`https://wa.me/${client.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors shadow-2xs truncate"
                        title="Open WhatsApp Chat"
                      >
                        <MessageCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{client.whatsapp}</span>
                      </a>
                    </td>

                    {/* 6. Balance */}
                    <td className="py-1 px-2.5 border-r border-slate-200 text-right truncate text-slate-900 font-bold text-[11.5px]">
                      ${client.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* 7. Equity */}
                    <td
                      className={`py-1 px-2.5 border-r border-slate-200 text-right truncate font-bold text-[11.5px] ${
                        isProfitable ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      ${client.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* 8. Credit */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right truncate text-[11px]">
                      {client.credit > 0 ? (
                        <span className="text-amber-700 font-bold">
                          +${client.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400">$0.00</span>
                      )}
                    </td>

                    {/* 9. Leverage */}
                    <td className="py-1 px-1.5 border-r border-slate-200 text-center truncate text-slate-600 text-[10.5px]">
                      {client.leverage}
                    </td>

                    {/* 10. Comment (Clean comment snippet with click to view history & dates) */}
                    <td
                      className="py-1 px-2.5 truncate"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCommentModal(client);
                      }}
                      title="Click to view old comments with dates or add a new comment"
                    >
                      <div className="flex items-center justify-between gap-1.5 truncate group/cmt cursor-pointer">
                        <span className="text-[11px] text-slate-700 truncate font-sans">
                          {latestComment ? (
                            latestComment.text
                          ) : (
                            <span className="text-slate-400 italic">No comments</span>
                          )}
                        </span>
                        {latestComment && (
                          <span className="text-[9.5px] text-slate-400 font-mono shrink-0 hidden xl:inline">
                            {latestComment.date.split(" ")[0]}
                          </span>
                        )}
                        <MessageSquare className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/cmt:opacity-100 transition-opacity shrink-0 ml-1" />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No clients found matching "{searchQuery}"
                  </td>
                </tr>
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
              Showing {filteredClients.length} of {clients.length} accounts
            </span>
            {selectedRowLogin && (
              <>
                <span>•</span>
                <span className="text-slate-800 font-bold">
                  Selected: #{selectedRowLogin}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-sans">
              Double-click row to open client drawer
            </span>
            <span>•</span>
            <button
              onClick={() => selectedRowLogin && onOpenBalanceModal(selectedRowLogin)}
              disabled={!selectedRowLogin}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                selectedRowLogin
                  ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs"
                  : "opacity-40 cursor-not-allowed border-transparent text-slate-400"
              }`}
            >
              Adjust Balance
            </button>
          </div>
        </div>
      </div>

      {/* Client Comments & History Modal (No Ratings, No Tags — Pure Comments with Dates) */}
      {activeClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setActiveClient(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-5 space-y-4 font-sans select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: brandPrimary }}
                >
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Client Comments & Notes
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    #{activeClient.login} • {activeClient.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveClient(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Comment Input */}
            <form onSubmit={handleAddComment} className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Add New Comment
              </label>
              <div className="relative">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Type a new comment or manager note..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 pr-12 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all resize-none font-sans"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="absolute right-2.5 bottom-3 p-1.5 rounded-lg text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-105 active:scale-95 shadow-2xs"
                  style={{ backgroundColor: brandPrimary }}
                  title="Post comment"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Comment History List with Dates ("old comment tika date ekath ekka") */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Comment History</span>
                <span className="text-[10px] font-mono font-normal text-slate-400">
                  {getClientComments(activeClient).length} entries
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {getClientComments(activeClient).map((comment) => (
                  <div
                    key={comment.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs transition-colors group/item"
                  >
                    {/* Comment Header: Author + Date */}
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-500 mb-1">
                      <span className="font-bold text-slate-700">
                        {comment.author || "Manager"}
                      </span>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{comment.date}</span>
                        {comment.author !== "System" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover/item:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 transition-opacity ml-1"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Comment Content */}
                    <p className="text-slate-800 font-sans leading-relaxed whitespace-pre-wrap">
                      {comment.text}
                    </p>
                  </div>
                ))}

                {getClientComments(activeClient).length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-xs italic">
                    No comments recorded for this client yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveClient(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
