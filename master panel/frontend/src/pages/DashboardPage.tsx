import React, { useState, useMemo } from "react";
import { usePortal } from "../context/PortalContext";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  Activity,
  ArrowUpRight,
  AlertCircle,
  CreditCard,
  BarChart3,
  CheckCircle2,
  Layers,
  ArrowDownRight,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  dailyRegistrationData,
  dailyCashflowData,
  dailyProfitLossData,
  monthlyBrokerStats,
  MonthlyBrokerStat,
} from "../data/mockData";

export const DashboardPage: React.FC<{
  onOpenBalanceModal: () => void;
}> = ({ onOpenBalanceModal }) => {
  const {
    clients,
    openTrades,
    closedTrades,
    deposits,
    withdrawals,
    kycVerifications,
    setActiveTab,
    approveDeposit,
    closeTrade,
    setSelectedClient,
    selectedPeriod,
    setSelectedPeriod,
    showMonthlyTable,
    setShowMonthlyTable,
  } = usePortal();

  // Metrics calculations (real-time from context)
  const totalBalance = clients.reduce((acc, c) => acc + c.balance, 0);
  const totalEquity = clients.reduce((acc, c) => acc + c.equity, 0);
  const totalFloatingProfit = openTrades.reduce((acc, t) => acc + t.profit, 0);
  const totalOpenLots = openTrades.reduce((acc, t) => acc + t.lots, 0);
  const pendingDeposits = deposits.filter((d) => d.status === "PENDING" || (d.status as any) === "Pending");
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "PENDING" || (w.status as any) === "Pending");
  const pendingKyc = kycVerifications.filter((k) => k.status === "PENDING" || (k.status as any) === "Pending");

  const approvedDeposits = useMemo(() => {
    return deposits.filter((d) => d.status === "APPROVED" || (d.status as any) === "Approved");
  }, [deposits]);

  const approvedWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => w.status === "APPROVED" || (w.status as any) === "Approved");
  }, [withdrawals]);

  const realDepositsTotal = useMemo(() => {
    return approvedDeposits.reduce((acc, d) => acc + d.amount, 0);
  }, [approvedDeposits]);

  const realWithdrawalsTotal = useMemo(() => {
    return approvedWithdrawals.reduce((acc, w) => acc + w.amount, 0);
  }, [approvedWithdrawals]);

  const realNetCashflow = realDepositsTotal - realWithdrawalsTotal;

  const realRealizedPl = useMemo(() => {
    return closedTrades.reduce((acc, t) => acc + t.profit, 0);
  }, [closedTrades]);

  const realTotalLots = useMemo(() => {
    return closedTrades.reduce((acc, t) => acc + t.lots, 0);
  }, [closedTrades]);

  const realWinRate = useMemo(() => {
    if (closedTrades.length === 0) return 0;
    const wins = closedTrades.filter((t) => t.profit > 0).length;
    return Number(((wins / closedTrades.length) * 100).toFixed(1));
  }, [closedTrades]);

  const isLiveMode = selectedPeriod === "LIVE";

  const liveChartData = useMemo(() => {
    const regMap: Record<string, number> = {};
    const depMap: Record<string, number> = {};
    const wthMap: Record<string, number> = {};
    const profitMap: Record<string, number> = {};
    const lossMap: Record<string, number> = {};

    clients.forEach((c) => {
      const reg = c.registeredAt || (c as any).registeredDate;
      if (!reg) return;
      const dateStr = reg.split("T")[0];
      const dayNum = parseInt(dateStr.split("-")[2], 10);
      if (!isNaN(dayNum)) {
        const key = `Sep ${dayNum}`;
        regMap[key] = (regMap[key] || 0) + 1;
      }
    });

    approvedDeposits.forEach((d) => {
      const dateStr = d.createdAt ? d.createdAt.split("T")[0] : (d as any).date || "2026-09-09";
      const dayNum = parseInt(dateStr.split("-")[2], 10);
      if (!isNaN(dayNum)) {
        const key = `Sep ${dayNum}`;
        depMap[key] = (depMap[key] || 0) + d.amount;
      }
    });

    approvedWithdrawals.forEach((w) => {
      const dateStr = w.createdAt ? w.createdAt.split("T")[0] : (w as any).date || "2026-09-09";
      const dayNum = parseInt(dateStr.split("-")[2], 10);
      if (!isNaN(dayNum)) {
        const key = `Sep ${dayNum}`;
        wthMap[key] = (wthMap[key] || 0) + w.amount;
      }
    });

    closedTrades.forEach((t) => {
      const dateStr = t.closeTime ? t.closeTime.split("T")[0] : t.openTime ? t.openTime.split("T")[0] : "";
      const dayNum = parseInt(dateStr.split("-")[2], 10);
      if (!isNaN(dayNum)) {
        const key = `Sep ${dayNum}`;
        if (t.profit > 0) {
          profitMap[key] = (profitMap[key] || 0) + t.profit;
        } else {
          lossMap[key] = (lossMap[key] || 0) + Math.abs(t.profit);
        }
      }
    });

    const regData = [];
    const cashflowData = [];
    const profitLossData = [];

    for (let i = 1; i <= 30; i++) {
      const label = `Sep ${i}`;
      regData.push({ date: label, registrations: regMap[label] || 0 });
      cashflowData.push({ date: label, deposits: depMap[label] || 0, withdrawals: wthMap[label] || 0 });
      profitLossData.push({ date: label, profit: profitMap[label] || 0, loss: lossMap[label] || 0 });
    }

    return { regData, cashflowData, profitLossData };
  }, [clients, approvedDeposits, approvedWithdrawals, closedTrades]);

  // Active month data
  const activeMonthData = useMemo<MonthlyBrokerStat>(() => {
    const defaultStat = monthlyBrokerStats[0]; // September 2026
    if (isLiveMode) {
      return {
        ...defaultStat,
        totalEquity,
        totalBalance,
        floatingPl: totalFloatingProfit,
        pendingActions: pendingDeposits.length + pendingWithdrawals.length + pendingKyc.length,
        activeAccounts: clients.filter((c) => c.status === "Active").length,
        depositsTotal: realDepositsTotal,
        withdrawalsTotal: realWithdrawalsTotal,
        netCashflow: realNetCashflow,
        depositsCount: approvedDeposits.length,
        withdrawalsCount: approvedWithdrawals.length,
        realizedPl: realRealizedPl,
        totalLots: realTotalLots,
        winRate: realWinRate,
        newRegistrations: clients.length,
      };
    }
    const found = monthlyBrokerStats.find((m) => m.monthKey === selectedPeriod);
    return found || defaultStat;
  }, [
    selectedPeriod,
    isLiveMode,
    totalEquity,
    totalBalance,
    totalFloatingProfit,
    pendingDeposits.length,
    pendingWithdrawals.length,
    pendingKyc.length,
    clients,
    realDepositsTotal,
    realWithdrawalsTotal,
    realNetCashflow,
    approvedDeposits.length,
    approvedWithdrawals.length,
    realRealizedPl,
    realTotalLots,
    realWinRate,
  ]);

  // Daily arrays for the 3 charts below
  const chartRegistrationData = isLiveMode ? liveChartData.regData : (activeMonthData.dailyRegistrations || dailyRegistrationData);
  const chartCashflowData = isLiveMode ? liveChartData.cashflowData : (activeMonthData.dailyCashflow || dailyCashflowData);
  const chartProfitLossData = isLiveMode ? liveChartData.profitLossData : (activeMonthData.dailyProfitLoss || dailyProfitLossData);

  // Generate clean ticks for chart X-axes
  const chartTicks = useMemo(() => {
    if (!chartRegistrationData || chartRegistrationData.length === 0) return [];
    const step = Math.max(1, Math.floor(chartRegistrationData.length / 6));
    const ticks: string[] = [];
    for (let i = 0; i < chartRegistrationData.length; i += step) {
      ticks.push(chartRegistrationData[i].date);
    }
    const lastDate = chartRegistrationData[chartRegistrationData.length - 1].date;
    if (!ticks.includes(lastDate)) {
      ticks.push(lastDate);
    }
    return ticks;
  }, [chartRegistrationData]);

  return (
    <div className="p-6 space-y-6 animate-fadeIn font-sans bg-[#f8fafc]">
      {/* Top Banner: Greeting & Quick Broker Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wide text-slate-900">
              NOVAFXM TRADING SERVER CONSOLE
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
              GATEWAY LIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            NOVAFXM Master Infrastructure • Real-time broker exposure, client oversight, and clearing monitor
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenBalanceModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <DollarSign className="w-4 h-4" />
            <span>Fund / Adjust Account</span>
          </button>
        </div>
      </div>

      {/* MONTHLY HISTORICAL BREAKDOWN TABLE (COLLAPSIBLE) */}
      {showMonthlyTable && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs animate-fadeIn">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                  Month-by-Month Broker Performance Ledger
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audited monthly summary of client capital, deposits, withdrawals, realized broker revenue, and new signups
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                Click any row button to load that month into dashboard cards & charts
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Month-End Equity</th>
                  <th className="py-3 px-4 text-right">Gross Deposits</th>
                  <th className="py-3 px-4 text-right">Gross Withdrawals</th>
                  <th className="py-3 px-4 text-right">Net Cashflow</th>
                  <th className="py-3 px-4 text-right">Realized P&L</th>
                  <th className="py-3 px-4 text-center">Lots / Win %</th>
                  <th className="py-3 px-4 text-center">New Clients</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {monthlyBrokerStats.map((stat) => {
                  const isSelected = selectedPeriod === stat.monthKey;
                  return (
                    <tr
                      key={stat.monthKey}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isSelected ? "bg-emerald-50/50 font-semibold" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {stat.label}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stat.status === "LIVE"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : stat.status === "AUDITED"
                              ? "bg-sky-100 text-sky-800 border border-sky-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {stat.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold">
                        ${stat.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-medium">
                        +${stat.depositsTotal.toLocaleString()}
                        <span className="text-[10px] text-slate-400 ml-1">({stat.depositsCount})</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-medium">
                        -${stat.withdrawalsTotal.toLocaleString()}
                        <span className="text-[10px] text-slate-400 ml-1">({stat.withdrawalsCount})</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        +${stat.netCashflow.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        +${stat.realizedPl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        {stat.totalLots}L <span className="text-slate-400">({stat.winRate}%)</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-800 font-bold">
                        +{stat.newRegistrations}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedPeriod(stat.monthKey)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {isSelected ? "Viewing" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPI Cards (THE 4 CARDS WITH MONTHLY AWARENESS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Managed Equity / Capital Flow */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Client Equity
              </span>
              {!isLiveMode && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">
                  {activeMonthData.shortLabel}
                </span>
              )}
            </div>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              ${activeMonthData.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            {isLiveMode ? (
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span>Balance:</span>
                  <span className="font-mono text-slate-700 font-semibold">
                    ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="font-mono text-emerald-600 font-bold text-[10px]">
                  +{activeMonthData.equityGrowthMoM}% MoM
                </span>
              </div>
            ) : (
              <div className="mt-1 space-y-0.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Balance: ${activeMonthData.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="font-mono text-emerald-600 font-bold text-[10px]">
                    +{activeMonthData.equityGrowthMoM}% MoM
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  In: +${(activeMonthData.depositsTotal / 1000).toFixed(1)}k • Out: -${(activeMonthData.withdrawalsTotal / 1000).toFixed(1)}k
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Live Floating P&L / Monthly Realized P&L */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isLiveMode ? "Live Floating P&L" : "Monthly Realized P&L"}
              </span>
              {!isLiveMode && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {activeMonthData.shortLabel}
                </span>
              )}
            </div>
            <div
              className={`p-2 rounded-xl border ${
                (isLiveMode ? totalFloatingProfit : activeMonthData.realizedPl) >= 0
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-rose-50 text-rose-600 border-rose-100"
              }`}
            >
              {(isLiveMode ? totalFloatingProfit : activeMonthData.realizedPl) >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            {isLiveMode ? (
              <>
                <div
                  className={`text-2xl font-black font-mono tracking-tight transition-colors duration-300 ${
                    totalFloatingProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {totalFloatingProfit >= 0 ? "+" : ""}${totalFloatingProfit.toFixed(2)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                  <span>Open Lots:</span>
                  <span className="font-mono text-slate-700 font-semibold">{totalOpenLots.toFixed(2)} Lots</span>
                  <span className="text-slate-400">({openTrades.length} trades)</span>
                </div>
              </>
            ) : (
              <>
                <div
                  className={`text-2xl font-black font-mono tracking-tight ${
                    activeMonthData.realizedPl >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {activeMonthData.realizedPl >= 0 ? "+" : ""}${activeMonthData.realizedPl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Vol: <strong className="font-mono text-slate-700">{activeMonthData.totalLots} Lots</strong></span>
                  <span className="font-semibold text-emerald-600 font-mono text-[10px]">
                    Win Rate: {activeMonthData.winRate}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Pending Actions / Operations Clearance */}
        <div
          className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs cursor-pointer hover:border-amber-400 transition-colors"
          onClick={() => setActiveTab("payments-deposits")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isLiveMode ? "Pending Actions" : "Operations Handled"}
              </span>
              {!isLiveMode && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {activeMonthData.shortLabel}
                </span>
              )}
            </div>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLiveMode ? (
              <>
                <div className="text-2xl font-black font-mono text-amber-600 tracking-tight">
                  {pendingDeposits.length + pendingWithdrawals.length + pendingKyc.length}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span>{pendingDeposits.length} Deposits</span>
                  <span>•</span>
                  <span>{pendingWithdrawals.length} Wth</span>
                  <span>•</span>
                  <span>{pendingKyc.length} KYC</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                  {activeMonthData.clearedActions} <span className="text-sm font-semibold text-slate-500">Cleared</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                  <span>{activeMonthData.clearedDeposits} Dep</span>
                  <span>•</span>
                  <span>{activeMonthData.clearedWithdrawals} Wth</span>
                  <span>•</span>
                  <span>{activeMonthData.clearedKyc} KYC</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Registered Accounts / Monthly Signups */}
        <div
          className="bg-white border border-slate-200 p-5 rounded-2xl relative overflow-hidden shadow-xs cursor-pointer hover:border-indigo-400 transition-colors"
          onClick={() => setActiveTab("clients-all")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isLiveMode ? "Registered Accounts" : "Monthly Registrations"}
              </span>
              {!isLiveMode && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {activeMonthData.shortLabel}
                </span>
              )}
            </div>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLiveMode ? (
              <>
                <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                  {clients.length}
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <span>Active:</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      {clients.filter((c) => c.status === "Active").length} accounts
                    </span>
                  </div>
                  <span className="font-mono text-indigo-600 font-bold text-[10px]">
                    +{activeMonthData.registrationGrowthMoM}% MoM
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-black font-mono text-indigo-600 tracking-tight">
                  +{activeMonthData.newRegistrations} <span className="text-xs font-normal text-slate-500">Users</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Active: <strong className="font-mono text-slate-800">{activeMonthData.activeAccounts} accounts</strong></span>
                  <span className="font-mono text-emerald-600 font-bold text-[10px]">
                    +{activeMonthData.registrationGrowthMoM}% MoM
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* THREE ULTRA-MODERN METRIC CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Daily Registrations */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between group">
          {/* Ambient background glow */}
          <div className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/15 transition-all duration-500" />

          <div>
            {/* Header: Icon, Title, Badge, Action Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-2xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      Daily Registrations
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800 border border-amber-200/80 font-mono">
                      {activeMonthData.shortLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    New client onboardings & accounts
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("clients-all")}
                className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-all shadow-2xs"
                title="View All Clients"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Headline Metric Strip */}
            <div className="mt-4 flex items-baseline justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-slate-900 tracking-tight">
                    +{activeMonthData.newRegistrations}
                  </span>
                  <span className="text-xs font-bold text-slate-400">Total Traders</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                  <span>Avg: <strong className="font-mono text-slate-700 font-bold">{(activeMonthData.newRegistrations / 30).toFixed(1)}/day</strong></span>
                  <span>•</span>
                  <span>Active: <strong className="font-mono text-emerald-600 font-bold">{activeMonthData.activeAccounts} accounts</strong></span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold font-mono">
                  +{activeMonthData.registrationGrowthMoM}% MoM
                </span>
                <span className="text-[10px] text-slate-400 mt-1">Growth vs Prev Month</span>
              </div>
            </div>

            {/* Modern Recharts Chart */}
            <div className="h-44 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRegistrationData} barSize={7}>
                  <defs>
                    <linearGradient id="regBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    ticks={chartTicks}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(245, 158, 11, 0.08)", radius: 6 }}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "11px",
                      padding: "8px 12px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    }}
                    itemStyle={{ color: "#f59e0b", fontWeight: 700 }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: "2px" }}
                    formatter={(val: any) => [`${val} Clients Joined`, "Registrations"]}
                  />
                  <Bar
                    dataKey="registrations"
                    fill="url(#regBarGrad)"
                    radius={[4, 4, 2, 2]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Card 2: Deposits vs Withdrawals */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between group">
          {/* Ambient background glow */}
          <div className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl group-hover:bg-emerald-400/15 transition-all duration-500" />

          <div>
            {/* Header: Icon, Title, Badge, Action Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      Deposits vs Withdrawals
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 font-mono">
                      {activeMonthData.shortLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Cash inflow vs withdrawal flow
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("payments-deposits")}
                className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-2xs"
                title="View Cashflow"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Headline Metric Strip */}
            <div className="mt-4 flex items-baseline justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-emerald-600 tracking-tight">
                    +${activeMonthData.netCashflow.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-400">Net Inflow</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 text-[10px] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    In: +${(activeMonthData.depositsTotal / 1000).toFixed(1)}k
                  </span>
                  <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60 text-[10px] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Out: -${(activeMonthData.withdrawalsTotal / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold font-mono">
                  +14.8%
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-mono">{activeMonthData.depositsCount} Deposits</span>
              </div>
            </div>

            {/* Modern Recharts Grouped Bar Chart */}
            <div className="h-44 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartCashflowData} barGap={1} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="wthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    ticks={chartTicks}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(16, 185, 129, 0.05)", radius: 6 }}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "11px",
                      padding: "8px 12px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}
                    formatter={(val: any, name: any) => [
                      `$${Number(val || 0).toLocaleString()}`,
                      name === "deposits" ? "Deposits (In)" : "Withdrawals (Out)",
                    ]}
                  />
                  <Bar dataKey="deposits" fill="url(#depGrad)" radius={[4, 4, 1, 1]} barSize={5} />
                  <Bar dataKey="withdrawals" fill="url(#wthGrad)" radius={[4, 4, 1, 1]} barSize={5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Card 3: Traders Profit vs Loss */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between group">
          {/* Ambient background glow */}
          <div className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 bg-indigo-400/10 rounded-full blur-2xl group-hover:bg-indigo-400/15 transition-all duration-500" />

          <div>
            {/* Header: Icon, Title, Badge, Action Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      Traders Profit vs Loss
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-800 border border-indigo-200/80 font-mono">
                      {activeMonthData.shortLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Client win vs loss performance curve
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("trading-open")}
                className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-2xs"
                title="View Trading Activity"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Headline Metric Strip */}
            <div className="mt-4 flex items-baseline justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-slate-900 tracking-tight">
                    +${activeMonthData.realizedPl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-bold text-slate-400">Broker Realized</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 text-[10px] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Win: {activeMonthData.winRate}%
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    Vol: {activeMonthData.totalLots}L
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold font-mono">
                  {activeMonthData.totalTrades} Orders
                </span>
                <span className="text-[10px] text-slate-400 mt-1">Positions Cleared</span>
              </div>
            </div>

            {/* Modern Recharts Smooth Area Curve */}
            <div className="h-44 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartProfitLossData}>
                  <defs>
                    <linearGradient id="profitGradModern" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="lossGradModern" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    ticks={chartTicks}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "11px",
                      padding: "8px 12px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}
                    formatter={(val: any, name: any) => [
                      `$${Number(val || 0).toLocaleString()}`,
                      name === "profit" ? "Client Profits" : "Client Losses",
                    ]}
                  />
                  <Area
                    type="natural"
                    dataKey="profit"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#profitGradModern)"
                  />
                  <Area
                    type="natural"
                    dataKey="loss"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#lossGradModern)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Open Positions + Pending Deposits Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Live Open Positions Snapshot */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                Live Open Positions Monitor
              </h3>
            </div>
            <button
              onClick={() => setActiveTab("trading-open")}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <span>View All ({openTrades.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Lots</th>
                  <th className="py-3 px-4">Open</th>
                  <th className="py-3 px-4">Current</th>
                  <th className="py-3 px-4 text-right">P&L ($)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {openTrades.slice(0, 5).map((t) => (
                  <tr key={t.ticket} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-bold font-mono">#{t.ticket}</td>
                    <td className="py-3 px-4 text-slate-800">
                      <button
                        onClick={() => {
                          const client = clients.find((c) => c.login === t.login);
                          if (client) setSelectedClient(client);
                        }}
                        className="hover:text-emerald-600 text-left font-medium"
                      >
                        #{t.login} <span className="text-slate-400 text-[10px] block">{t.clientName}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{t.symbol}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.type === "BUY"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono">{t.lots.toFixed(2)}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{t.openPrice}</td>
                    <td className="py-3 px-4 text-slate-800 font-bold font-mono">{t.currentPrice}</td>
                    <td
                      className={`py-3 px-4 text-right font-bold font-mono transition-colors duration-300 ${
                        t.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {t.profit > 0 ? "+" : ""}${t.profit.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => closeTrade(t.ticket)}
                        className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold transition-colors"
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

        {/* Pending Deposits 1-Click Action Card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 tracking-wide">
              Deposit Clearance Queue
            </h3>
            <button
              onClick={() => setActiveTab("payments-deposits")}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {pendingDeposits.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                All deposits are processed!
              </div>
            ) : (
              pendingDeposits.map((d) => (
                <div
                  key={d.id}
                  className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 font-mono">
                        ${d.amount.toLocaleString()} {d.currency}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 border border-amber-200 font-mono font-semibold">
                        {d.method}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                      #{d.login} • {d.clientName}
                    </p>
                  </div>

                  <button
                    onClick={() => approveDeposit(d.id)}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    Approve
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
