import React, { useState, useEffect, useMemo } from "react";
import { usePortal } from "../../context/PortalContext";
import {
  Key,
  PlusCircle,
  Search,
  Copy,
  Check,
  Trash2,
  X,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export interface ReferralCodeItem {
  id: string;
  code: string;
  campaign: string;
  ratePercent: number;
  totalSignups: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

const DEFAULT_CODES: ReferralCodeItem[] = [
  {
    id: "ref-code-1",
    code: "NOVA2026",
    campaign: "Default Global Public Registration",
    ratePercent: 5.0,
    totalSignups: 42,
    isDefault: true,
    isActive: true,
    createdAt: "2026-08-01",
  },
  {
    id: "ref-code-2",
    code: "VIP-KABI",
    campaign: "VIP Partner Institutional Desk",
    ratePercent: 7.5,
    totalSignups: 18,
    isDefault: false,
    isActive: true,
    createdAt: "2026-08-15",
  },
  {
    id: "ref-code-3",
    code: "ASIA-DESK",
    campaign: "APAC Regional Introducing Broker",
    ratePercent: 5.0,
    totalSignups: 27,
    isDefault: false,
    isActive: true,
    createdAt: "2026-08-20",
  },
  {
    id: "ref-code-4",
    code: "SUMMER-PROMO",
    campaign: "Seasonal Registration Rebate",
    ratePercent: 10.0,
    totalSignups: 9,
    isDefault: false,
    isActive: false,
    createdAt: "2026-07-01",
  },
];

export const ReferralCodeTab: React.FC = () => {
  const { companyConfig, addToast } = usePortal();
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  // Persistent codes list in localStorage
  const [codes, setCodes] = useState<ReferralCodeItem[]>(() => {
    try {
      const saved = localStorage.getItem("nova_referral_codes_list_v2");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CODES;
  });

  useEffect(() => {
    try {
      localStorage.setItem("nova_referral_codes_list_v2", JSON.stringify(codes));
    } catch (e) {
      console.error(e);
    }
  }, [codes]);

  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formCampaign, setFormCampaign] = useState("");
  const [formRate, setFormRate] = useState("5.0");
  const [formIsActive, setFormIsActive] = useState(true);

  // Counts
  const totalCount = codes.length;
  const activeCount = codes.filter((c) => c.isActive).length;
  const disabledCount = totalCount - activeCount;
  const defaultCode = codes.find((c) => c.isDefault) || codes[0];

  // Filtered List
  const filteredCodes = useMemo(() => {
    return codes.filter((item) => {
      if (activeFilter === "ACTIVE" && !item.isActive) return false;
      if (activeFilter === "DISABLED" && item.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.code.toLowerCase().includes(q) ||
          item.campaign.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [codes, activeFilter, searchQuery]);

  const getUrl = (code: string) =>
    `https://portal.${companyConfig.id || "novafxm"}.com/register?ref=${code}`;

  const handleCopyLink = (codeItem: ReferralCodeItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(getUrl(codeItem.code));
    setCopiedId(codeItem.id);
    addToast("info", "Link Copied", `Registration link for code "${codeItem.code}" copied!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
    addToast("info", "Status Updated", "Referral code status toggled.");
  };

  const handleSetDefault = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCodes((prev) =>
      prev.map((c) => ({
        ...c,
        isDefault: c.id === id,
      }))
    );
    const item = codes.find((c) => c.id === id);
    addToast("success", "Default Code Set", `"${item?.code}" set as primary registration code.`);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = codes.find((c) => c.id === id);
    if (item?.isDefault) {
      addToast("error", "Cannot Delete", "Cannot delete the default registration code.");
      return;
    }
    if (window.confirm(`Delete referral code "${item?.code}"?`)) {
      setCodes((prev) => prev.filter((c) => c.id !== id));
      addToast("info", "Code Deleted", `Referral code "${item?.code}" deleted.`);
    }
  };

  const handleCreateCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = formCode.trim().toUpperCase();
    if (!clean) return;

    if (codes.some((c) => c.code === clean)) {
      addToast("error", "Code Exists", `Referral code "${clean}" already exists.`);
      return;
    }

    const newEntry: ReferralCodeItem = {
      id: `ref-code-${Date.now()}`,
      code: clean,
      campaign: formCampaign.trim() || "Marketing Campaign",
      ratePercent: parseFloat(formRate) || 5.0,
      totalSignups: 0,
      isDefault: false,
      isActive: formIsActive,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setCodes((prev) => [newEntry, ...prev]);
    addToast("success", "Code Created", `New registration code "${clean}" created.`);
    setIsModalOpen(false);
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
              REFERRAL CODES
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredCodes.length} records
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none hidden sm:inline">|</span>

          {/* Scope Filter Pills */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px] overflow-x-auto">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "ALL"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalCount})
            </button>

            <button
              onClick={() => setActiveFilter("ACTIVE")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "ACTIVE"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active ({activeCount})
            </button>

            <button
              onClick={() => setActiveFilter("DISABLED")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "DISABLED"
                  ? "bg-slate-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Disabled ({disabledCount})
            </button>
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-2.5 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Default Code:</span>
            <strong className="text-amber-800 font-bold font-mono">
              {defaultCode?.code || "NOVA2026"}
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Active Codes:</span>
            <strong className="text-emerald-700 font-bold">{activeCount}</strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Total Registrations:</span>
            <strong className="text-slate-800 font-bold">
              {codes.reduce((sum, c) => sum + c.totalSignups, 0)} traders
            </strong>
          </div>
        </div>

        {/* Right: Actions + Search */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormCode("");
              setFormCampaign("");
              setFormRate("5.0");
              setFormIsActive(true);
              setIsModalOpen(true);
            }}
            className="px-2.5 py-1 rounded text-[10.5px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer"
            style={{ backgroundColor: brandPrimary }}
            title="Create new referral tracking code"
          >
            <PlusCircle className="w-3 h-3" />
            <span>+ Create Code</span>
          </button>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, campaign..."
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
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[140px] text-left">
                  REFERRAL CODE
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[240px] text-left">
                  CAMPAIGN / DESCRIPTION
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[130px] text-center">
                  REBATE RATE
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[300px] text-left">
                  REGISTRATION LINK
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[120px] text-right">
                  SIGNUPS
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[100px] text-center">
                  STATUS
                </th>
                <th className="py-1.5 px-2 text-center w-[140px]">
                  ACTIONS
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No referral codes found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCodes.map((item, index) => {
                  const isSelected = selectedId === item.id;
                  const isCopied = copiedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={() => handleCopyLink(item)}
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
                      title="Click to select • Double-click to copy registration URL"
                    >
                      {/* Code */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-300 font-mono tracking-wide">
                            {item.code}
                          </span>
                          {item.isDefault && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              DEFAULT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Campaign */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-sans font-semibold text-slate-900 text-[11.5px]">
                        {item.campaign}
                      </td>

                      {/* Rebate Rate */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-center truncate font-bold text-emerald-700">
                        +{item.ratePercent.toFixed(1)}% Deposit
                      </td>

                      {/* Link */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-600 font-mono text-[10.5px]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{getUrl(item.code)}</span>
                          <button
                            onClick={(e) => handleCopyLink(item, e)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                            title="Copy registration link"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600 font-bold" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Signups */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-right truncate font-bold text-slate-900">
                        {item.totalSignups} users
                      </td>

                      {/* Status */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-center">
                        <span
                          onClick={(e) => handleToggleActive(item.id, e)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight cursor-pointer border ${
                            item.isActive
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-slate-100 text-slate-500 border-slate-300"
                          }`}
                          title="Click to toggle active status"
                        >
                          {item.isActive ? "ACTIVE" : "DISABLED"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-1 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!item.isDefault && item.isActive && (
                            <button
                              onClick={(e) => handleSetDefault(item.id, e)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all"
                              title="Set as global default registration code"
                            >
                              Make Default
                            </button>
                          )}
                          {!item.isDefault && (
                            <button
                              onClick={(e) => handleDelete(item.id, e)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-2.5 h-2.5 inline" />
                            </button>
                          )}
                        </div>
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
              Showing {filteredCodes.length} of {totalCount} registration codes
            </span>
            {selectedId && (
              <>
                <span>•</span>
                <span className="text-slate-800 font-bold">
                  Selected Code: #{selectedId}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-sans">
              Double-click row to copy referral URL
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">
              Default Code: {defaultCode?.code}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Modal: Create Referral Code */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
          <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="px-4 py-3 bg-[#e2e8f0] border-b border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                  CREATE REGISTRATION REFERRAL CODE
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="p-4 space-y-3 font-sans text-xs">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Referral Code (UPPERCASE)
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. VIP2026, PARTNER-DESK..."
                  required
                  className="w-full bg-[#f8fafc] focus:bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Campaign / Partner Description
                </label>
                <input
                  type="text"
                  value={formCampaign}
                  onChange={(e) => setFormCampaign(e.target.value)}
                  placeholder="e.g. Asia Affiliate Desk, Telegram VIP..."
                  required
                  className="w-full bg-[#f8fafc] focus:bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs font-sans"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rebate / Reward Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  required
                  className="w-full bg-[#f8fafc] focus:bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs font-bold text-slate-700">Set as Active</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md text-xs font-bold text-white shadow-xs hover:brightness-105"
                    style={{ backgroundColor: brandPrimary }}
                  >
                    Create Code
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
