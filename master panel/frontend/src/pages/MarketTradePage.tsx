import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";

export const MarketTradePage: React.FC = () => {
  const { clients, symbols, placeOrder, openTrades, closeTrade } = usePortal();

  const [selectedLogin, setSelectedLogin] = useState<number>(clients[0]?.login || 0);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("EURUSD");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [lots, setLots] = useState<number>(1.0);
  const [sl, setSl] = useState<string>("");
  const [tp, setTp] = useState<string>("");
  const [comment, setComment] = useState<string>("Manager Trading Terminal");

  const currentClient = clients.find((c) => c.login === selectedLogin);
  const currentSymbol = symbols.find((s) => s.symbol === selectedSymbol) || symbols[0];

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !currentSymbol) return;

    placeOrder({
      login: selectedLogin,
      symbol: selectedSymbol,
      type: orderType,
      lots: Number(lots),
      sl: sl ? parseFloat(sl) : null,
      tp: tp ? parseFloat(tp) : null,
      comment,
    });
  };

  const lotPresets = [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0];

  return (
    <div className="p-6 space-y-6 animate-fadeIn font-sans select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
            <span>MANAGER TRADING TERMINAL</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              DIRECT EXECUTION
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Execute manual trades, institutional hedges, and position overrides on behalf of client accounts
          </p>
        </div>
      </div>

      {/* Terminal Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Order Form & Instrument Depth */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Instrument Picker Bar */}
          <div className="bg-[#0b101f] border border-[#1a263f] p-3 rounded-xl flex items-center gap-2 overflow-x-auto">
            {symbols.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSymbol(s.symbol)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold shrink-0 transition-all ${
                  selectedSymbol === s.symbol
                    ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20"
                    : "bg-[#0e1628] text-slate-300 hover:bg-[#141f36] border border-[#1b2742]"
                }`}
              >
                {s.symbol}
                <span className="ml-1.5 text-[10px] font-normal opacity-80">
                  {s.bid.toFixed(s.digits)}
                </span>
              </button>
            ))}
          </div>

          {/* Execution Form Card */}
          <div className="bg-[#0b101f] border border-[#1a263f] rounded-xl overflow-hidden shadow-lg">
            <div className="px-5 py-3.5 border-b border-[#1a263f] bg-[#0e1628] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-black text-base">{currentSymbol.symbol}</span>
                <span className="text-xs text-sky-400 font-bold">({currentSymbol.category})</span>
                <span className="text-[11px] text-slate-400">Spread: {currentSymbol.spread} pips</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Contract Size: {currentSymbol.contractSize.toLocaleString()}
              </div>
            </div>

            <form onSubmit={handleExecute} className="p-6 space-y-5">
              {/* Client Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Client Trading Account
                </label>
                <select
                  value={selectedLogin}
                  onChange={(e) => setSelectedLogin(Number(e.target.value))}
                  className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-sans"
                >
                  {clients.map((c) => (
                    <option key={c.login} value={c.login}>
                      Account #{c.login} — {c.name} (Equity: ${c.equity.toLocaleString()} | Lev: {c.leverage})
                    </option>
                  ))}
                </select>
              </div>

              {/* Big Buy / Sell Quote Boxes */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setOrderType("BUY")}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    orderType === "BUY"
                      ? "bg-emerald-600/20 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/40"
                      : "bg-[#080d17] border-[#1d2b45] hover:border-slate-600"
                  }`}
                >
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4" />
                    BUY (ASK)
                  </span>
                  <span className="text-2xl font-black font-mono text-white">
                    {currentSymbol.ask.toFixed(currentSymbol.digits)}
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-mono mt-1">Instant Market</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType("SELL")}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    orderType === "SELL"
                      ? "bg-rose-600/20 border-rose-500 shadow-lg shadow-rose-500/10 ring-2 ring-rose-500/40"
                      : "bg-[#080d17] border-[#1d2b45] hover:border-slate-600"
                  }`}
                >
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <ArrowDownRight className="w-4 h-4" />
                    SELL (BID)
                  </span>
                  <span className="text-2xl font-black font-mono text-white">
                    {currentSymbol.bid.toFixed(currentSymbol.digits)}
                  </span>
                  <span className="text-[10px] text-rose-400/80 font-mono mt-1">Instant Market</span>
                </button>
              </div>

              {/* Volume (Lots) & Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Volume in Lots
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Est. Margin: ${(
                      (lots * currentSymbol.contractSize * currentSymbol.bid) /
                      (parseInt(currentClient?.leverage.replace("1:", "") || "500"))
                    ).toFixed(2)}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min={currentSymbol.minLot}
                  max={currentSymbol.maxLot}
                  value={lots}
                  onChange={(e) => setLots(parseFloat(e.target.value) || 0.01)}
                  className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-4 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                />
                <div className="flex gap-2 mt-2">
                  {lotPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLots(preset)}
                      className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                        lots === preset
                          ? "bg-sky-500 text-slate-950 font-bold"
                          : "bg-[#121c32] text-slate-300 hover:bg-[#1a2745]"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* SL / TP */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Stop Loss Rate
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional SL"
                    value={sl}
                    onChange={(e) => setSl(e.target.value)}
                    className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Take Profit Rate
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional TP"
                    value={tp}
                    onChange={(e) => setTp(e.target.value)}
                    className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Order Execution Commentary
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Execute Action Bar */}
              <div className="pt-4 border-t border-[#1a263f] flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Account: <span className="text-white font-bold font-mono">#{selectedLogin}</span> • Available Free Margin:{" "}
                  <span className="text-emerald-400 font-bold font-mono">
                    ${currentClient?.freeMargin.toLocaleString()}
                  </span>
                </div>
                <button
                  type="submit"
                  className={`px-8 py-3 rounded-lg font-black text-sm uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                    orderType === "BUY"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30"
                      : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30"
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    Execute {orderType} {lots} Lots
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Account Live Monitor & Quick Info */}
        <div className="space-y-6">
          {currentClient && (
            <div className="bg-[#0b101f] border border-[#1a263f] p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-white tracking-wide border-b border-[#1a263f] pb-3">
                Selected Account Status
              </h3>
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Login ID:</span>
                  <span className="text-white font-bold">#{currentClient.login}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Client Name:</span>
                  <span className="text-slate-200 font-sans">{currentClient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Balance:</span>
                  <span className="text-white font-bold">${currentClient.balance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Equity:</span>
                  <span className="text-sky-400 font-bold">${currentClient.equity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Used Margin:</span>
                  <span className="text-slate-300">${currentClient.margin.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Free Margin:</span>
                  <span className="text-emerald-400 font-bold">${currentClient.freeMargin.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Margin Level:</span>
                  <span className="text-emerald-400 font-bold">
                    {currentClient.marginLevel > 0 ? `${currentClient.marginLevel.toFixed(1)}%` : "100%"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Leverage:</span>
                  <span className="text-amber-400 font-bold">{currentClient.leverage}</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Trades on this Account */}
          <div className="bg-[#0b101f] border border-[#1a263f] p-5 rounded-xl">
            <h3 className="text-sm font-bold text-white tracking-wide mb-3 flex items-center justify-between">
              <span>Account Open Trades</span>
              <span className="text-xs font-mono text-sky-400">
                {openTrades.filter((t) => t.login === selectedLogin).length} active
              </span>
            </h3>

            <div className="space-y-2">
              {openTrades
                .filter((t) => t.login === selectedLogin)
                .map((t) => (
                  <div
                    key={t.ticket}
                    className="p-2.5 rounded-lg bg-[#0e1628] border border-[#1b2742] flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span>{t.symbol}</span>
                        <span
                          className={`text-[10px] px-1 rounded ${
                            t.type === "BUY"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {t.type} {t.lots}L
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Open: {t.openPrice} • Live: {t.currentPrice}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          t.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {t.profit > 0 ? "+" : ""}${t.profit.toFixed(2)}
                      </div>
                      <button
                        onClick={() => closeTrade(t.ticket)}
                        className="text-[10px] text-rose-400 hover:underline mt-0.5 font-sans"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
