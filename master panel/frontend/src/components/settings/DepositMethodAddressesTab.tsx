import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePortal } from "../../context/PortalContext";
import { DepositMethodAddress, DepositMethodType } from "../../types";
import { api } from "../../services/api";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const METHODS: DepositMethodType[] = ["TRC20", "BEP20", "ERC20", "Bank Transfer"];

const DEFAULT_ADDRESSES: DepositMethodAddress[] = [
  {
    id: "dep-addr-1",
    method: "TRC20",
    label: "TRC20 Main Wallet",
    address: "TYD2b2D8vX4g5M6n7P8q9R0s1T2u3V4w5X",
    qrData: "TYD2b2D8vX4g5M6n7P8q9R0s1T2u3V4w5X",
    isActive: true,
    createdAt: "2026-08-17",
  },
];

export const DepositMethodAddressesTab: React.FC = () => {
  const { companyConfig, currentCompany, addToast } = usePortal();
  const brandPrimary = companyConfig?.primaryColor || "#D97706";
  const formRef = useRef<HTMLDivElement>(null);

  const [addresses, setAddresses] = useState<DepositMethodAddress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch real deposit addresses from DB
  const loadAddresses = async () => {
    setLoading(true);
    try {
      const dbAddresses = await api.getDepositMethodAddresses(currentCompany);
      if (dbAddresses && dbAddresses.length > 0) {
        setAddresses(dbAddresses);
      } else {
        // Fallback to saved local or default
        try {
          const saved = localStorage.getItem(`nova_deposit_addresses_${currentCompany}`);
          if (saved) {
            setAddresses(JSON.parse(saved));
          } else {
            setAddresses(DEFAULT_ADDRESSES);
          }
        } catch {
          setAddresses(DEFAULT_ADDRESSES);
        }
      }
    } catch (err) {
      console.error("Failed to load deposit addresses:", err);
      setAddresses(DEFAULT_ADDRESSES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [currentCompany]);

  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [editingAddress, setEditingAddress] = useState<DepositMethodAddress | null>(null);
  const [formMethod, setFormMethod] = useState<DepositMethodType>("TRC20");
  const [formLabel, setFormLabel] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formQr, setFormQr] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const [previewQrItem, setPreviewQrItem] = useState<DepositMethodAddress | null>(null);

  const totalCount = addresses.length;
  const trcCount = addresses.filter((a) => a.method === "TRC20").length;
  const bepCount = addresses.filter((a) => a.method === "BEP20").length;
  const ercCount = addresses.filter((a) => a.method === "ERC20").length;
  const bankCount = addresses.filter((a) => a.method === "Bank Transfer").length;
  const activeCount = addresses.filter((a) => a.isActive).length;
  const inactiveCount = totalCount - activeCount;

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

  const handleToggleActive = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = addresses.find((a) => a.id === id);
    if (!target) return;
    const nextStatus = !target.isActive;

    // Optimistic UI update
    setAddresses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: nextStatus } : a))
    );

    try {
      await api.updateDepositMethodAddress(currentCompany, id, {
        method: target.method,
        label: target.label,
        address: target.address,
        qrData: target.qrData,
        isActive: nextStatus,
      });
      addToast("info", "Status Updated", `Status updated to ${nextStatus ? "ACTIVE" : "INACTIVE"}.`);
    } catch {
      addToast("info", "Status Updated", "Deposit method status toggled locally.");
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this deposit method?")) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      if (editingAddress?.id === id) {
        handleResetForm();
      }
      try {
        await api.deleteDepositMethodAddress(currentCompany, id);
      } catch (err) {
        console.warn("Delete API failed, removed locally:", err);
      }
      addToast("info", "Address Deleted", "Deposit method address removed.");
    }
  };

  const handleEdit = (item: DepositMethodAddress, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAddress(item);
    setFormMethod(item.method);
    setFormLabel(item.label);
    setFormAddress(item.address);
    setFormQr(item.qrData || "");
    setFormIsActive(item.isActive);
    setShowForm(true);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleResetForm = () => {
    setEditingAddress(null);
    setFormMethod("TRC20");
    setFormLabel("");
    setFormAddress("");
    setFormQr("");
    setFormIsActive(true);
    setShowForm(false);
  };

  const handleSaveForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formLabel.trim() || !formAddress.trim()) {
      addToast("error", "Fields Required", "Please enter both a label and address/details.");
      return;
    }

    const payload: Partial<DepositMethodAddress> = {
      method: formMethod,
      label: formLabel.trim(),
      address: formAddress.trim(),
      qrData: formQr.trim(),
      isActive: formIsActive,
    };

    if (editingAddress) {
      // Update existing address
      try {
        const updated = await api.updateDepositMethodAddress(currentCompany, editingAddress.id, payload);
        if (updated) {
          setAddresses((prev) => prev.map((a) => (a.id === editingAddress.id ? updated : a)));
        } else {
          setAddresses((prev) =>
            prev.map((a) => (a.id === editingAddress.id ? { ...a, ...payload } as DepositMethodAddress : a))
          );
        }
      } catch {
        setAddresses((prev) =>
          prev.map((a) => (a.id === editingAddress.id ? { ...a, ...payload } as DepositMethodAddress : a))
        );
      }
      addToast("success", "Address Updated", `${formLabel} updated successfully.`);
    } else {
      // Create new address
      try {
        const created = await api.createDepositMethodAddress(currentCompany, payload);
        if (created) {
          setAddresses((prev) => [created, ...prev]);
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
        }
      } catch {
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
      }
      addToast("success", "Address Added", `New ${formMethod} address added.`);
    }

    handleResetForm();
  };

  return (
    <div className="space-y-2 animate-fadeIn font-sans select-none flex-1 min-h-0 flex flex-col pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white border border-slate-300 p-2 rounded-lg shadow-2xs">
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

          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px] overflow-x-auto">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalCount})
            </button>

            <button
              onClick={() => setActiveFilter("TRC20")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "TRC20"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              TRC20 ({trcCount})
            </button>

            <button
              onClick={() => setActiveFilter("BEP20")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "BEP20"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              BEP20 ({bepCount})
            </button>

            <button
              onClick={() => setActiveFilter("ERC20")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "ERC20"
                  ? "bg-sky-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ERC20 ({ercCount})
            </button>

            <button
              onClick={() => setActiveFilter("Bank Transfer")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === "Bank Transfer"
                  ? "bg-indigo-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bank ({bankCount})
            </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2.5 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white border border-slate-300 p-2 rounded-lg shadow-2xs">
        <button
          onClick={() => {
            if (showForm && !editingAddress) {
              setShowForm(false);
            } else {
              setEditingAddress(null);
              setFormMethod("TRC20");
              setFormLabel("");
              setFormAddress("");
              setFormQr("");
              setFormIsActive(true);
              setShowForm(true);
            }
          }}
          className="px-3 py-1 rounded-md text-xs font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer"
          style={{ backgroundColor: brandPrimary }}
          title="Create new deposit address or bank wire account"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>{showForm && !editingAddress ? "Close Form" : "+ Add Address"}</span>
        </button>

        <div className="relative w-64 sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search method, label, address..."
            className="w-full bg-[#f8fafc] border border-slate-300 rounded-md pl-8 pr-6 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs font-mono transition-all"
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

      {showForm && (
        <div
          ref={formRef}
          className="bg-white border border-amber-300/80 rounded-xl p-4 shadow-sm space-y-3.5 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                {editingAddress ? `EDIT DEPOSIT METHOD ADDRESS (${editingAddress.method})` : "ADD DEPOSIT METHOD ADDRESS"}
              </h2>
            </div>
            <button
              onClick={handleResetForm}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close Form</span>
            </button>
          </div>

          <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payment Method
              </label>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((m) => {
                  const isSelected = formMethod === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormMethod(m)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-amber-100 text-amber-900 border-amber-400 font-extrabold shadow-2xs"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="Main USDT wallet, UPI account, Bank A..."
                className="w-full bg-[#f8fafc] focus:bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs font-sans transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Address / Payment Detail
              </label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Wallet address, UPI ID, bank details..."
                className="w-full bg-[#f8fafc] focus:bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                QR Data (Optional)
              </label>
              <input
                type="text"
                value={formQr}
                onChange={(e) => setFormQr(e.target.value)}
                placeholder="Leave empty to encode address"
                className="w-full bg-[#f8fafc] focus:bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs font-mono transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFormIsActive((prev) => !prev)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                  formIsActive
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-slate-100 text-slate-500 border-slate-300"
                }`}
              >
                {formIsActive ? "Active" : "Inactive"}
              </button>

              <button
                type="submit"
                className="px-5 py-1.5 rounded-lg text-xs font-bold text-slate-950 shadow-2xs transition-all cursor-pointer hover:brightness-105"
                style={{ backgroundColor: brandPrimary }}
              >
                {editingAddress ? "Save Changes" : "Add Address"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex-1 flex flex-col min-h-[380px]">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed">
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

            <tbody className="font-mono text-[11px] leading-tight select-none">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans text-xs">
                    Loading live deposit addresses from database...
                  </td>
                </tr>
              ) : filteredAddresses.length === 0 ? (
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
                      className={`cursor-pointer transition-colors duration-75 border-b border-slate-200 h-8 ${
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
                      <td className="py-1 px-2.5 border-r border-slate-200 text-center truncate">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight border ${methodBadgeClass}`}
                        >
                          {item.method}
                        </span>
                      </td>

                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-sans font-bold text-slate-900 text-[11.5px]">
                        {item.label}
                      </td>

                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-mono text-slate-800">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{item.address}</span>
                          <button
                            onClick={(e) => handleCopy(item, e)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors shrink-0 cursor-pointer"
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

                      <td className="py-1 px-2 border-r border-slate-200 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewQrItem(item);
                          }}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-0.5 text-[10px] font-mono border border-slate-200 bg-white cursor-pointer"
                          title="View QR Code"
                        >
                          <QrCode className="w-3 h-3 text-slate-600" />
                          <span>QR</span>
                        </button>
                      </td>

                      <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-500 font-mono text-[10.5px]">
                        {item.createdAt}
                      </td>

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

                      <td className="py-1 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => handleEdit(item, e)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-2.5 h-2.5 inline mr-0.5" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all cursor-pointer"
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

      {previewQrItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
          <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl p-5 max-w-sm w-full text-center space-y-3 animate-scaleIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black uppercase text-slate-800 font-mono">
                {previewQrItem.label} ({previewQrItem.method})
              </span>
              <button
                onClick={() => setPreviewQrItem(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
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
              className="w-full py-2 rounded-lg text-xs font-bold text-slate-950 shadow-xs cursor-pointer hover:brightness-105"
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

export default DepositMethodAddressesTab;
