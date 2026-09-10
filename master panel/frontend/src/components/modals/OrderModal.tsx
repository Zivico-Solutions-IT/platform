import React, { useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { X, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ShieldAlert } from "lucide-react";

export const OrderModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { clients, symbols, placeOrder } = usePortal();

  const [selectedLogin, setSelectedLogin] = useState<number>(clients[0]?.login || 0);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbols[0]?.symbol || "EURUSD");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [lots, setLots] = useState<number>(0.1);
  const [sl, setSl] = useState<string>("");
  const [tp, setTp] = useState<string>("");
  const [comment, setComment] = useState<string>("Manager Execution");

  if (!isOpen) return null;

  const currentClient = clients.find((c) => c.login === selectedLogin);
  const currentSymbolObj = symbols.find((s) => s.symbol === selectedSymbol);

  const priceToExecute = currentSymbolObj
    ? orderType === "BUY"
      ? currentSymbolObj.ask
      : currentSymbolObj.bid
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !currentSymbolObj) return;

    const success = placeOrder({
      login: selectedLogin,
      symbol: selectedSymbol,
      type: orderType,
      lots: Number(lots),
      sl: sl ? parseFloat(sl) : null,
      tp: tp ? parseFloat(tp) : null,
      comment,
    });

    if (success) {
      onClose();
    }
  };

  const lotPresets = [0.01, 0.05, 0.1, 0.5, 1.0, 5.0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0d1322] border border-[#1f2c47] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f2c47] bg-[#11192c]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              MT5 Manager Terminal — New Order
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target Client Account */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Client Account
            </label>
            <select
              value={selectedLogin}
              onChange={(e) => setSelectedLogin(Number(e.target.value))}
              className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-sans"
            >
              {clients.map((c) => (
                <option key={c.login} value={c.login}>
                  #{c.login} — {c.name} (Equity: ${c.equity.toLocaleString()}, Lev: {c.leverage})
                </option>
              ))}
            </select>
          </div>

          {/* Symbol & Live Quote Widget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Symbol
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500"
              >
                {symbols.map((s) => (
                  <option key={s.id} value={s.symbol}>
                    {s.symbol} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Pricing Widget */}
            {currentSymbolObj && (
              <div className="bg-[#080d17] border border-[#1d2b45] rounded-lg p-2 flex items-center justify-around font-mono text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Bid</span>
                  <div className="text-rose-400 font-bold text-sm">
                    {currentSymbolObj.bid.toFixed(currentSymbolObj.digits)}
                  </div>
                </div>
                <div className="h-6 w-[1px] bg-[#1d2b45]"></div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Ask</span>
                  <div className="text-emerald-400 font-bold text-sm">
                    {currentSymbolObj.ask.toFixed(currentSymbolObj.digits)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Direction Buttons */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Direction
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderType("BUY")}
                className={`py-2.5 rounded-lg border font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                  orderType === "BUY"
                    ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                    : "bg-[#080d17] border-[#1d2b45] text-slate-400 hover:border-slate-600"
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>BUY @ {currentSymbolObj?.ask.toFixed(currentSymbolObj?.digits)}</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderType("SELL")}
                className={`py-2.5 rounded-lg border font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                  orderType === "SELL"
                    ? "bg-rose-600/20 border-rose-500 text-rose-400 shadow-md shadow-rose-500/10 ring-1 ring-rose-500/30"
                    : "bg-[#080d17] border-[#1d2b45] text-slate-400 hover:border-slate-600"
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
                <span>SELL @ {currentSymbolObj?.bid.toFixed(currentSymbolObj?.digits)}</span>
              </button>
            </div>
          </div>

          {/* Volume (Lots) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Volume (Lots)
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                Min: {currentSymbolObj?.minLot} | Max: {currentSymbolObj?.maxLot}
              </span>
            </div>
            <input
              type="number"
              step="0.01"
              min={currentSymbolObj?.minLot || 0.01}
              max={currentSymbolObj?.maxLot || 100}
              value={lots}
              onChange={(e) => setLots(parseFloat(e.target.value) || 0.01)}
              className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500"
            />
            {/* Quick Lot Chips */}
            <div className="flex gap-1.5 mt-2">
              {lotPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLots(preset)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                    lots === preset
                      ? "bg-sky-500 text-slate-950 font-bold"
                      : "bg-[#11192c] text-slate-400 hover:bg-[#18233e] hover:text-white"
                  }`}
                >
                  {preset.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* SL & TP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Stop Loss
              </label>
              <input
                type="number"
                step="any"
                placeholder="Optional"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Take Profit
              </label>
              <input
                type="number"
                step="any"
                placeholder="Optional"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Execution Comment */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Manager Comment
            </label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-[#080d17] border border-[#1d2b45] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Execution Button */}
          <div className="pt-2 border-t border-[#1f2c47] flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              Est. Commission: <span className="text-white font-mono font-semibold">-${(lots * 3.5).toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#11192c] hover:bg-[#18233e] text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-lg font-bold text-xs shadow-lg transition-all active:scale-95 ${
                  orderType === "BUY"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                    : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20"
                }`}
              >
                Execute {orderType} {lots} Lots
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
