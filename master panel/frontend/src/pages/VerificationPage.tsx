import React, { useState, useMemo } from "react";
import { usePortal } from "../context/PortalContext";
import { KycVerification } from "../types";
import { Search, Eye } from "lucide-react";

export const VerificationPage: React.FC<{
  onInspectKyc: (kyc: KycVerification) => void;
}> = ({ onInspectKyc }) => {
  const { kycVerifications, clients } = usePortal();
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const allVerifications: KycVerification[] = useMemo(() => {
    const map = new Map<string, KycVerification>();
    kycVerifications.forEach((k) => {
      const key = (k.email || String(k.login)).toLowerCase().trim();
      map.set(key, k);
    });
    clients.forEach((c) => {
      const key = (c.email || String(c.login)).toLowerCase().trim();
      if (!map.has(key)) {
        const isVer = c.kycStatus === "Verified" || c.verification === "verified";
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
          status: isVer ? "APPROVED" : "PENDING",
          submittedAt: c.registeredAt || "2026-09-10",
          updatedAt: c.lastLogin || c.registeredAt || "2026-09-10",
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => Number(b.id) - Number(a.id));
  }, [kycVerifications, clients]);

  const counts = useMemo(() => ({
    all: allVerifications.length,
    pending: allVerifications.filter((k) => k.status === "PENDING").length,
    approved: allVerifications.filter((k) => k.status === "APPROVED").length,
    rejected: allVerifications.filter((k) => k.status === "REJECTED").length,
  }), [allVerifications]);

  const filteredList = useMemo(() => {
    return allVerifications.filter((k) => {
      if (statusFilter !== "ALL" && k.status !== statusFilter) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        k.clientName.toLowerCase().includes(q) ||
        k.email.toLowerCase().includes(q) ||
        k.id.toString().includes(q) ||
        (k.docNumber || "").toLowerCase().includes(q) ||
        (k.country || "").toLowerCase().includes(q)
      );
    });
  }, [allVerifications, statusFilter, searchQuery]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toISOString().slice(0, 10);
    } catch { return dateStr; }
  };

  const tabCls = (active: boolean, activeColor: string) =>
    `px-3 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-all whitespace-nowrap ${
      active ? `${activeColor} text-white shadow` : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="p-4 sm:p-5 animate-fadeIn font-sans select-none flex flex-col gap-3">
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-100 bg-[#f9fafb]">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            <span className="text-[11px] font-black tracking-wider uppercase text-slate-800 font-mono">
              KYC VERIFICATIONS
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-mono font-bold text-slate-600">
              {counts.all} submissions
            </span>
          </div>
          <span className="text-slate-200 hidden sm:inline">|</span>
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
            <button onClick={() => setStatusFilter("ALL")} className={tabCls(statusFilter === "ALL", "bg-slate-800")}>All ({counts.all})</button>
            <button onClick={() => setStatusFilter("PENDING")} className={tabCls(statusFilter === "PENDING", "bg-amber-600")}>Pending ({counts.pending})</button>
            <button onClick={() => setStatusFilter("APPROVED")} className={tabCls(statusFilter === "APPROVED", "bg-emerald-700")}>APPROVED</button>
            <button onClick={() => setStatusFilter("REJECTED")} className={tabCls(statusFilter === "REJECTED", "bg-rose-600")}>REJECTED</button>
          </div>
          <span className="text-slate-200 hidden sm:inline">|</span>
          <div className="flex items-center gap-3 text-[10.5px] font-mono text-slate-500 shrink-0">
            <span>Pending Audit: <strong className="text-amber-600">{counts.pending} files</strong></span>
            <span>Approved: <strong className="text-emerald-600">{counts.approved}</strong></span>
            <span>Rejected: <strong className="text-rose-600">{counts.rejected}</strong></span>
          </div>
          <div className="relative ml-auto">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, name, doc #..."
              className="pl-8 pr-7 py-1 text-[11px] bg-white border border-slate-200 rounded-md text-slate-700 placeholder-slate-400 focus:outline-none focus:border-amber-400 w-48 font-mono"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">x</button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11.5px] font-mono">
            <thead className="bg-[#f1f5f9] text-slate-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">ID</th>
                <th className="py-2.5 px-4">NAME</th>
                <th className="py-2.5 px-4">DOCUMENT TYPE</th>
                <th className="py-2.5 px-4">DOCUMENT NUMBER</th>
                <th className="py-2.5 px-4">COUNTRY</th>
                <th className="py-2.5 px-4">SUBMITTED AT</th>
                <th className="py-2.5 px-4">PREVIEW</th>
                <th className="py-2.5 px-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((k) => {
                const isApproved = k.status === "APPROVED";
                const isRejected = k.status === "REJECTED";
                const numId = Number(k.id) || Number(k.login) || 0;
                const displayId = `#${1000000 + numId}`;
                return (
                  <tr key={k.id} className="hover:bg-amber-50/50 transition-colors duration-100 cursor-pointer" onClick={() => onInspectKyc(k)}>
                    <td className="py-2 px-4"><span className="text-amber-600 font-bold">{displayId}</span></td>
                    <td className="py-2 px-4"><span className="font-bold text-slate-800 font-sans">{k.clientName}</span></td>
                    <td className="py-2 px-4 text-slate-500">{k.docType || "National ID"}</td>
                    <td className="py-2 px-4 text-slate-400">{k.docNumber || "N/A"}</td>
                    <td className="py-2 px-4">
                      <span className={k.country === "Sri Lanka" ? "text-amber-600 font-bold" : "text-slate-500"}>
                        {k.country || "LK"}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-400">{formatDate(k.submittedAt || k.updatedAt || "")}</td>
                    <td className="py-2 px-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); onInspectKyc(k); }}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-amber-600 transition-colors text-[11px] font-bold font-sans"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                    <td className="py-2 px-4">
                      <span className={`text-[10.5px] font-black uppercase tracking-wide ${
                        isApproved ? "text-emerald-600" : isRejected ? "text-rose-600" : "text-amber-600"
                      }`}>
                        {isApproved ? "APPROVED" : isRejected ? "REJECTED" : "PENDING"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400 text-xs font-sans">
                    No KYC submissions matching "{searchQuery}"
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
