import React, { useState, useEffect, useMemo } from "react";
import { usePortal } from "../../context/PortalContext";
import { DepositMethodAddress, DepositMethodType } from "../../types";
import {
  PlusCircle,
  Search,
  Copy,
  Check,
  Edit2,
  Trash2,
  QrCode,
  X,
  CreditCard,
} from "lucide-react";

const METHODS: DepositMethodType[] = ["TRC20", "BEP20", "ERC20", "Bank Transfer"];

const DEFAULT_ADDRESSES: DepositMethodAddress[] = [
  {
    id: "dep-addr-1",
    method: "TRC20",
    label: "Kabi",
    address: "TJhvbYFU9xykCXEbUbKdXKVQvcyziDLWP",
    qrData: "tron:TJhvbYFU9xykCXEbUbKdXKVQvcyziDLWP",
    isActive: true,
    createdAt: "2026-09-01",
  },
  {
    id: "dep-addr-2",
    method: "BEP20",
    label: "Main BSC Treasury",
    address: "0x71C8A97bB36c841A835A1dDb62E52240b9F8D690",
    qrData: "ethereum:0x71C8A97bB36c841A835A1dDb62E52240b9F8D690",
    isActive: true,
    createdAt: "2026-09-02",
  },
  {
    id: "dep-addr-3",
    method: "Bank Transfer",
    label: "Commercial Bank USD Wire",
    address: "IBAN: US94CBNA00001234567890 | SWIFT: CIBNUS33 | Bank: Commercial Bank of NY",
    qrData: "",
    isActive: true,
    createdAt: "2026-08-28",
  },
  {
    id: "dep-addr-4",
    method: "ERC20",
    label: "ETH / USDT Hot Wallet",
    address: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    qrData: "ethereum:0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    isActive: true,
    createdAt: "2026-09-03",
  },
];

export const DepositMethodAddressesTab: React.FC = () => {
  const { companyConfig, addToast } = usePortal();
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  // Persistent addresses state
  const [addresses, setAddresses] = useState<DepositMethodAddress[]>(() => {
    try {
      const saved = localStorage.getItem("nova_deposit_addresses_v2");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ADDRESSES;
  });

  useEffect(() => {
    try {
      localStorage.setItem("nova_deposit_addresses_v2", JSON.stringify(addresses));
    } catch (e) {
      console.error(e);
    }
  }, [addresses]);

  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DepositMethodAddress | null>(null);
  const [formMethod, setFormMethod] = useState<DepositMethodType>("TRC20");
  const [formLabel, setFormLabel] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formQr, setFormQr] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // QR Modal Preview
  const [previewQrItem, setPreviewQrItem] = useState<DepositMethodAddress | null>(null);

  // Counts
  const totalCount = addresses.length;
  const trcCount = addresses.filter((a) => a.method === "TRC20").length;
  const bepCount = addresses.filter((a) => a.method === "BEP20").length;
  const ercCount = addresses.filter((a) => a.method === "ERC20").length;
  const bankCount = addresses.filter((a) => a.method === "Bank Transfer").length;
  const activeCount = addresses.filter((a) => a.isActive).length;
  const inactiveCount = totalCount - activeCount;

  // Filtered List
  const filteredAddresses = useMemo(() => {
    return addresses.filter((item) => {
      if (activeFilter !== "ALL" && item.method !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.address.toLowerCase().includes(q) ||
          item.method.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [addresses, activeFilter, searchQuery]);

  const handleCopy = (item: DepositMethodAddress, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(item.address);
    setCopiedId(item.id);
    addToast("info", "Address Copied", `${item.label} (${item.method}) copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAddresses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
    addToast("info", "Status Updated", "Deposit method status toggled.");
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this deposit method?")) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      addToast("info", "Address Deleted", "Deposit method address removed.");
    }
  };

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setFormMethod("TRC20");
    setFormLabel("");
    setFormAddress("");
    setFormQr("");
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: DepositMethodAddress, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAddress(item);
    setFormMethod(item.method);
    setFormLabel(item.label);
    setFormAddress(item.address);
    setFormQr(item.qrData || "");
    setFormIsActive(item.isActive);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim() || !formAddress.trim()) {
      addToast("error", "Fields Required", "Please enter both a label and address/details.");
      return;
    }

    if (editingAddress) {
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === editingAddress.id
            ? {
                ...a,
                method: formMethod,
                label: formLabel.trim(),
                address: formAddress.trim(),
                qrData: formQr.trim(),
                isActive: formIsActive,
              }
            : a
        )
      );
      addToast("success", "Address Updated", `${formLabel} updated successfully.`);
    } else {
      const newEntry: DepositMethodAddress = {
        id: `dep-addr-${Date.now()}`,
        method: formMethod,
        label: formLabel.trim(),
        address: formAddress.trim(),
        qrData: formQr.trim(),
        isActive: formIsActive,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setAddresses((prev) => [newEntry, ...prev]);
      addToast("success", "Address Added", `New ${formMethod} address added.`);
    }

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
              DEPOSIT ADDRESSES
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredAddresses.length} records
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none hidden sm:inline">|</span>

          {/* Method Filter Pills */}
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
              onClick={() => setActiveFilter("TRC20")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "TRC20"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              TRC20 ({trcCount})
            </button>

            <button
              onClick={() => setActiveFilter("BEP20")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "BEP20"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              BEP20 ({bepCount})
            </button>

            <button
              onClick={() => setActiveFilter("ERC20")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "ERC20"
                  ? "bg-sky-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ERC20 ({ercCount})
            </button>

            <button
              onClick={() => setActiveFilter("Bank Transfer")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeFilter === "Bank Transfer"
                  ? "bg-indigo-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bank ({bankCount})
            </button>
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-2.5 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Active:</span>
            <strong className="text-emerald-700 font-bold">{activeCount}</strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Inactive:</span>
            <strong className="text-slate-700 font-bold">{inactiveCount}</strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Payment Rails:</span>
            <strong className="text-slate-800 font-bold">4 Chains</strong>
          </div>
        </div>

        {/* Right: Add Address Button + Search */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="px-2.5 py-1 rounded text-[10.5px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer"
            style={{ backgroundColor: brandPrimary }}
            title="Create new deposit address or bank wire account"
          >
            <PlusCircle className="w-3 h-3" />
            <span>+ Add Address</span>
          </button>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search method, label, address..."
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
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[120px] text-center">
                  METHOD
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[180px] text-left">
                  LABEL
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[360px] text-left">
                  WALLET ADDRESS / ACCOUNT DETAILS
                </th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-[80px] text-center">
                  QR CODE
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[120px] text-left">
                  CREATED
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[95px] text-center">
                  STATUS
                </th>
                <th className="py-1.5 px-2 text-center w-[120px]">
                  ACTIONS
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredAddresses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No deposit method addresses found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAddresses.map((item, index) => {
                  const isSelected = selectedId === item.id;
                  const isCopied = copiedId === item.id;

                  const methodBadgeClass =
                    item.method === "TRC20"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : item.method === "BEP20"
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : item.method === "ERC20"
                      ? "bg-sky-50 text-sky-800 border-sky-300"
                      : "bg-indigo-50 text-indigo-800 border-indigo-300";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={() => handleCopy(item)}
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
                      title="Click to select • Double-click to copy address"
                    >
                      {/* Method */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-center truncate">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight border ${methodBadgeClass}`}
                        >
                          {item.method}
                        </span>
                      </td>

                      {/* Label */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-sans font-bold text-slate-900 text-[11.5px]">
                        {item.label}
                      </td>

                      {/* Address / Details */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-mono text-slate-800">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{item.address}</span>
                          <button
                            onClick={(e) => handleCopy(item, e)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                            title="Copy address"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600 font-bold" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* QR Code */}
                      <td className="py-1 px-2 border-r border-slate-200 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewQrItem(item);
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-0.5 text-[10px] font-mono border border-slate-200 bg-white"
                          title="View QR Code"
                        >
                          <QrCode className="w-3 h-3 text-slate-600" />
                          <span>QR</span>
                        </button>
                      </td>

                      {/* Created Date */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-500 font-mono text-[10.5px]">
                        {item.createdAt}
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
                          title="Click to toggle status"
                        >
                          {item.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-1 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => handleOpenEditModal(item, e)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-2.5 h-2.5 inline mr-0.5" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-2.5 h-2.5 inline mr-0.5" />
                            Delete
                          </button>
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
              Showing {filteredAddresses.length} of {totalCount} deposit method addresses
            </span>
            {selectedId && (
              <>
                <span>•</span>
                <span className="text-slate-800 font-bold">
                  Selected Address: #{selectedId}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-sans">
              Double-click row to copy address
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">
              {activeCount} Active
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Modal: Add / Edit Deposit Address */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
          <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="px-4 py-3 bg-[#e2e8f0] border-b border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                  {editingAddress ? "EDIT DEPOSIT ADDRESS" : "NEW DEPOSIT ADDRESS"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-4 space-y-3 font-sans text-xs">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormMethod(m)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all border ${
                        formMethod === m
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. Main USDT Treasury, NY Wire Account..."
                  required
                  className="w-full bg-[#f8fafc] focus:bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs font-sans"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Wallet Address / Bank Details
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Address or account instructions..."
                  required
                  className="w-full bg-[#f8fafc] focus:bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  QR Code URI (Optional)
                </label>
                <input
                  type="text"
                  value={formQr}
                  onChange={(e) => setFormQr(e.target.value)}
                  placeholder="tron:... or ethereum:... (leave empty to use address)"
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
                    {editingAddress ? "Save Changes" : "Create Address"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Preview Modal */}
      {previewQrItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
          <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl p-5 max-w-sm w-full text-center space-y-3 animate-scaleIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black uppercase text-slate-800 font-mono">
                {previewQrItem.label} ({previewQrItem.method})
              </span>
              <button
                onClick={() => setPreviewQrItem(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block mx-auto shadow-2xs">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  previewQrItem.qrData || previewQrItem.address
                )}`}
                alt="QR Code"
                className="w-40 h-40 object-contain mx-auto"
              />
            </div>

            <p className="text-[11px] font-mono text-slate-600 break-all px-2 bg-slate-100 py-1.5 rounded border border-slate-200">
              {previewQrItem.address}
            </p>

            <button
              onClick={() => {
                handleCopy(previewQrItem);
                setPreviewQrItem(null);
              }}
              className="w-full py-2 rounded-lg text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: brandPrimary }}
            >
              Copy Address & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
