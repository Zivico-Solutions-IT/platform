import React, { useState, useMemo, useEffect } from "react";
import { usePortal } from "../../context/PortalContext";
import { ReferralReward } from "../../types";
import {
  Search,
  Check,
  X,
  Gift,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const INITIAL_REWARDS: ReferralReward[] = [
  {
    id: "ref-101",
    referrerCode: "VIP-KABI",
    referrerName: "Kabilan S.",
    referrerLogin: 10001,
    refereeName: "Nilu Nilusha",
    refereeEmail: "sarusanu@gmail.com",
    depositAmount: 1500,
    rewardAmount: 75,
    ratePercent: 5,
    status: "PENDING",
    createdAt: "2026-09-09 10:45:00",
  },
  {
    id: "ref-102",
    referrerCode: "NOVA-PRO",
    referrerName: "Muzammil R.",
    referrerLogin: 10002,
    refereeName: "JEGAN MURUGAN",
    refereeEmail: "selvipm2783@gmail.com",
    depositAmount: 2000,
    rewardAmount: 100,
    ratePercent: 5,
    status: "PENDING",
    createdAt: "2026-09-08 15:20:00",
  },
  {
    id: "ref-103",
    referrerCode: "NOVA-PRO",
    referrerName: "Muzammil R.",
    referrerLogin: 10002,
    refereeName: "RATHINAM R RAVI",
    refereeEmail: "rathinamrravi@gmail.com",
    depositAmount: 800,
    rewardAmount: 40,
    ratePercent: 5,
    status: "APPROVED",
    createdAt: "2026-09-04 11:00:00",
    approvedAt: "2026-09-04 11:30:00",
  },
  {
    id: "ref-104",
    referrerCode: "AFFILIATE-EU",
    referrerName: "David Silva",
    referrerLogin: 10004,
    refereeName: "dinith rusiru",
    refereeEmail: "dinithrusiru@gmail.com",
    depositAmount: 500,
    rewardAmount: 25,
    ratePercent: 5,
    status: "REJECTED",
    createdAt: "2026-09-03 09:15:00",
  },
];

export const ReferralRewardsTab: React.FC = () => {
  const { companyConfig, addToast } = usePortal();
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  // Persistent rewards state in localStorage
  const [rewards, setRewards] = useState<ReferralReward[]>(() => {
    try {
      const saved = localStorage.getItem("nova_referral_rewards_v2");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_REWARDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("nova_referral_rewards_v2", JSON.stringify(rewards));
    } catch (e) {
      console.error(e);
    }
  }, [rewards]);

  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Counts
  const totalCount = rewards.length;
  const pendingCount = rewards.filter((r) => r.status === "PENDING").length;
  const approvedCount = rewards.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = rewards.filter((r) => r.status === "REJECTED").length;

  const pendingAmount = rewards
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  const approvedAmount = rewards
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  // Filtered List
  const filteredRewards = useMemo(() => {
    return rewards.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.referrerCode.toLowerCase().includes(q) ||
          r.referrerName.toLowerCase().includes(q) ||
          r.refereeName.toLowerCase().includes(q) ||
          r.refereeEmail.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rewards, statusFilter, searchQuery]);

  const handleApprove = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const today = new Date().toLocaleString();
    setRewards((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "APPROVED", approvedAt: today } : r
      )
    );
    const reward = rewards.find((r) => r.id === id);
    addToast(
      "success",
      "Reward Approved",
      `$${reward?.rewardAmount.toFixed(2)} referral bonus credited to ${reward?.referrerName}.`
    );
  };

  const handleReject = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRewards((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" } : r))
    );
    addToast("info", "Reward Rejected", "Referral commission claim rejected.");
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
              REFERRAL REWARDS
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredRewards.length} records
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none hidden sm:inline">|</span>

          {/* Status Filter Pills */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px] overflow-x-auto">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                statusFilter === "ALL"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalCount})
            </button>

            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                statusFilter === "PENDING"
                  ? "bg-amber-500 text-black font-extrabold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending ({pendingCount})
            </button>

            <button
              onClick={() => setStatusFilter("APPROVED")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                statusFilter === "APPROVED"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Approved ({approvedCount})
            </button>

            <button
              onClick={() => setStatusFilter("REJECTED")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                statusFilter === "REJECTED"
                  ? "bg-rose-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-2.5 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          {pendingCount > 0 && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-sans text-[10.5px]">Pending:</span>
                <strong className="text-amber-700 font-bold">
                  ${pendingAmount.toFixed(2)} ({pendingCount})
                </strong>
              </div>
              <span className="text-slate-300 select-none">|</span>
            </>
          )}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Approved Rewards:</span>
            <strong className="text-emerald-700 font-bold">
              ${approvedAmount.toFixed(2)}
            </strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Default Rebate:</span>
            <strong className="text-slate-800 font-bold">5.0% Deposit</strong>
          </div>
        </div>

        {/* Right: Search */}
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-60">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, referrer, referee..."
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
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[95px] text-left">
                  REF ID
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[200px] text-left">
                  REFERRER
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[220px] text-left">
                  REFEREE TRADER
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[120px] text-right">
                  DEPOSIT
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[130px] text-right">
                  REWARD (5%)
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[140px] text-left">
                  SUBMITTED AT
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[100px] text-center">
                  STATUS
                </th>
                <th className="py-1.5 px-2 text-center w-[120px]">
                  ACTIONS
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredRewards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No referral reward claims found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredRewards.map((reward, index) => {
                  const isSelected = selectedId === reward.id;
                  const isPending = reward.status === "PENDING";
                  const isApproved = reward.status === "APPROVED";

                  return (
                    <tr
                      key={reward.id}
                      onClick={() => setSelectedId(reward.id)}
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
                      title="Click to select"
                    >
                      {/* Ref ID */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-900">
                        #{reward.id}
                      </td>

                      {/* Referrer */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {reward.referrerCode}
                          </span>
                          <span className="font-sans font-bold text-slate-900 truncate">
                            {reward.referrerName}
                          </span>
                        </div>
                      </td>

                      {/* Referee Trader */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-sans">
                        <div className="font-bold text-slate-900 truncate">
                          {reward.refereeName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {reward.refereeEmail}
                        </div>
                      </td>

                      {/* Deposit Amount */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-right truncate text-slate-800 font-bold">
                        ${reward.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Reward Amount */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-right truncate font-bold text-emerald-700">
                        +${reward.rewardAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Date */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate text-slate-500 text-[10.5px]">
                        {reward.createdAt}
                      </td>

                      {/* Status */}
                      <td className="py-1 px-2.5 border-r border-slate-200 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight border ${
                            isPending
                              ? "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                              : isApproved
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-rose-50 text-rose-800 border-rose-300"
                          }`}
                        >
                          {reward.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-1 px-2 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => handleApprove(reward.id, e)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-2xs transition-all flex items-center gap-0.5"
                              title="Approve Reward"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={(e) => handleReject(reward.id, e)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 shadow-2xs transition-all flex items-center gap-0.5"
                              title="Reject"
                            >
                              <X className="w-2.5 h-2.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {isApproved ? "Credited" : "Declined"}
                          </span>
                        )}
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
              Showing {filteredRewards.length} of {totalCount} referral reward claims
            </span>
            {selectedId && (
              <>
                <span>•</span>
                <span className="text-slate-800 font-bold">
                  Selected: #{selectedId}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-sans">
              Instant balance credit on approval
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">
              {approvedCount} Approved
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
