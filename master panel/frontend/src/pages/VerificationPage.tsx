import React, { useState, useMemo } from "react";
import { usePortal } from "../context/PortalContext";
import { KycVerification, PaymentStatus } from "../types";
import { Search, Eye, FileText, UploadCloud, Plus } from "lucide-react";

export const VerificationPage: React.FC<{
  onInspectKyc: (kyc: KycVerification) => void;
}> = ({ onInspectKyc }) => {
  const { kycVerifications, clients } = usePortal();
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus | "UNVERIFIED">("UNVERIFIED");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Combine DB kycVerifications and clients list so ALL users appear under Verifications
  const allVerifications: KycVerification[] = useMemo(() => {
    const map = new Map<string, KycVerification>();

    // 1. Add explicitly submitted KYC records first
    kycVerifications.forEach((k) => {
      const key = (k.email || String(k.login)).toLowerCase().trim();
      map.set(key, k);
    });

    // 2. Add any clients from database/mock list if not already present
    clients.forEach((c) => {
      const key = (c.email || String(c.login)).toLowerCase().trim();
      if (!map.has(key)) {
        const isVer = c.kycStatus === "Verified" || c.verification === "verified";
        const isPend = c.kycStatus === "Pending" || c.verification === "pending";
        map.set(key, {
          id: c.userId ? String(c.userId) : String(c.login),
          login: c.login,
          clientName: c.name,
          email: c.email || `${c.name.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
          country: c.country || "LK",
          docType: "National ID",
          docNumber: "N/A",
          idFrontUrl: "",
          addressProofUrl: "",
          status: isVer ? "APPROVED" : isPend ? "PENDING" : "UNVERIFIED",
          submittedAt: c.registeredAt || "2026-09-10",
          updatedAt: c.lastLogin || c.registeredAt || "2026-09-10",
        });
      }
    });

    return Array.from(map.values());
  }, [kycVerifications, clients]);

  // Counts for tabs
  const pendingCount = useMemo(() => allVerifications.filter((k) => k.status === "PENDING").length, [allVerifications]);
  const unverifiedCount = useMemo(() => allVerifications.filter((k) => k.status === "UNVERIFIED").length, [allVerifications]);
  const verifiedCount = useMemo(() => allVerifications.filter((k) => k.status === "APPROVED").length, [allVerifications]);

  // Filtered verifications list
  const filteredVerifications = useMemo(() => {
    return allVerifications.filter((k) => {
      if (statusFilter !== "ALL" && k.status !== statusFilter) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        k.clientName.toLowerCase().includes(q) ||
        k.email.toLowerCase().includes(q) ||
        k.login.toString().includes(q) ||
        k.status.toLowerCase().includes(q)
      );
    });
  }, [allVerifications, statusFilter, searchQuery]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 animate-fadeIn font-sans bg-[#fbfbf9] min-h-screen text-slate-800">
      {/* Title & Subtitle Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
          Verifications
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          Manage client balances, trading access and financial operations.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email or status"
          className="w-full bg-white border border-slate-200/90 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-xs transition-all font-sans"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Tabs matching Image 2 design */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter("PENDING")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
            statusFilter === "PENDING"
              ? "bg-[#d97706] text-white shadow-amber-500/20"
              : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
          }`}
        >
          Pending ({pendingCount})
        </button>

        <button
          onClick={() => setStatusFilter("UNVERIFIED")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
            statusFilter === "UNVERIFIED"
              ? "bg-[#d97706] text-white shadow-amber-500/20"
              : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
          }`}
        >
          Unverified ({unverifiedCount})
        </button>

        <button
          onClick={() => setStatusFilter("APPROVED")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
            statusFilter === "APPROVED"
              ? "bg-[#d97706] text-white shadow-amber-500/20"
              : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
          }`}
        >
          Verified ({verifiedCount})
        </button>

        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
            statusFilter === "ALL"
              ? "bg-slate-800 text-white"
              : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
          }`}
        >
          All ({allVerifications.length})
        </button>
      </div>

      {/* Clean Minimalist Table Container matching Image 2 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f8faf6] text-slate-400 text-[10.5px] font-extrabold uppercase tracking-wider border-b border-slate-100 select-none">
              <tr>
                <th className="py-3.5 px-6 font-bold text-slate-400">USER</th>
                <th className="py-3.5 px-6 font-bold text-slate-400">STATUS</th>
                <th className="py-3.5 px-6 font-bold text-slate-400">UPDATED</th>
                <th className="py-3.5 px-6 font-bold text-slate-400 text-right pr-8">ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs font-sans">
              {filteredVerifications.map((k) => {
                const isPending = k.status === "PENDING";
                const isApproved = k.status === "APPROVED";
                const isUnverified = k.status === "UNVERIFIED";

                return (
                  <tr
                    key={k.id}
                    className="hover:bg-slate-50/80 transition-colors duration-150"
                  >
                    {/* USER (Name + Email) */}
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 text-sm">
                        {k.clientName}
                      </div>
                      <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                        {k.email}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${
                          isApproved
                            ? "bg-emerald-100 text-emerald-800"
                            : isPending
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : isUnverified
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isApproved ? "Verified" : isPending ? "Pending Review" : isUnverified ? "Unverified" : "Rejected"}
                      </span>
                    </td>

                    {/* UPDATED */}
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                      {formatDate(k.updatedAt || k.submittedAt)}
                    </td>

                    {/* ACTIONS */}
                    <td className="py-4 px-6 text-right pr-8">
                      <button
                        onClick={() => onInspectKyc(k)}
                        className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        {isUnverified ? (
                          <>
                            <Plus className="w-3.5 h-3.5 text-slate-600" />
                            <span>Add documents</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>View Documents</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredVerifications.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 text-xs">
                    No verification records found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
