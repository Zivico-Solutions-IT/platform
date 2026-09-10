import React, { useState, useMemo } from "react";
import { usePortal } from "../../context/PortalContext";
import { SymbolData, Client } from "../../types";
import { Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, CheckCircle2 } from "lucide-react";

interface OrderExecutionRailProps {
  selectedSymbolCode: string;
  onSymbolChange?: (symbolCode: string) => void;
  className?: string;
}

export const OrderExecutionRail: React.FC<OrderExecutionRailProps> = ({
  selectedSymbolCode,
  className = "",
}) => {
  const { clients, symbols, placeOrder, companyConfig } = usePortal();

  const [selectedLogin, setSelectedLogin] = useState<number>(() => clients[0]?.login || 0);
  const [orderCategory, setOrderCategory] = useState<"Spot Order" | "Limit Order" | "Stop Order">("Spot Order");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [lots, setLots] = useState<number>(0.01);
  const [enableTpSl, setEnableTpSl] = useState<boolean>(false);
  const [sl, setSl] = useState<string>("");
  const [tp, setTp] = useState<string>("");
  const [comment, setComment] = useState<string>("Manager Execution");

  // Keep client valid
  React.useEffect(() => {
    if (clients.length > 0 && (!selectedLogin || !clients.some((c) => c.login === selectedLogin))) {
      setSelectedLogin(clients[0].login);
    }
  }, [clients, selectedLogin]);

  const currentSymbol = useMemo(() => {
    const cleanTarget = selectedSymbolCode.replace("/", "").toUpperCase();
    return (
      symbols.find(
        (s) => s.symbol === selectedSymbolCode || s.symbol.replace("/", "").toUpperCase() === cleanTarget
      ) ||
      symbols[0] ||
      null
    );
  }, [symbols, selectedSymbolCode]);

  const currentClient = useMemo(() => {
    return clients.find((c) => c.login === selectedLogin) || clients[0] || null;
  }, [clients, selectedLogin]);

  // Financial calculations matching User Side Trade Snapshot
  const leverageNum = parseInt(currentClient?.leverage?.replace("1:", "") || "500");
  const contractSize = currentSymbol?.contractSize || 100000;
  const bidPrice = currentSymbol?.bid || 1.0;
  const askPrice = currentSymbol?.ask || 1.0;
  const price = orderType === "BUY" ? askPrice : bidPrice;

  const requiredMargin = useMemo(() => {
    if (!currentSymbol || !currentClient) return 0;
    return Number(((lots * contractSize * price) / leverageNum).toFixed(2));
  }, [lots, contractSize, price, leverageNum, currentSymbol, currentClient]);

  const freeMargin = currentClient?.freeMargin || 0;
  const freeMarginAfter = Number(Math.max(0, freeMargin - requiredMargin).toFixed(2));

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !currentSymbol) return;

    placeOrder({
      login: selectedLogin,
      symbol: currentSymbol.symbol,
      type: orderType,
      lots: Number(lots),
      sl: enableTpSl && sl ? parseFloat(sl) : null,
      tp: enableTpSl && tp ? parseFloat(tp) : null,
      comment,
    });
  };

  const lotPresets = [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0];
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  return (
    <div
      className={`bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex flex-col h-full font-sans select-none ${className}`}
    >
      {/* Top Header matching User Side (< New Trade ADA/USD) */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold text-xs">›</span>
          <span className="text-xs font-black uppercase text-slate-900 font-mono tracking-tight">
            New Trade
          </span>
          <span
            className="px-2 py-0.5 rounded text-[11px] font-mono font-bold text-white shadow-2xs"
            style={{ backgroundColor: brandPrimary }}
          >
            {currentSymbol?.symbol}
          </span>
        </div>

        <div className="text-[10.5px] font-mono text-slate-500">
          Spread: <strong className="text-slate-900 font-bold">{currentSymbol?.spread}</strong>
        </div>
      </div>

      {/* Main Order Content */}
      <form onSubmit={handlePlaceOrder} className="p-3.5 space-y-3.5 flex-1 overflow-y-auto">
        {/* Client Account Picker */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Client Trading Account
          </label>
          <select
            value={selectedLogin}
            onChange={(e) => setSelectedLogin(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs"
          >
            {clients.map((c) => (
              <option key={c.login} value={c.login}>
                #{c.login} — {c.name} (${c.equity?.toLocaleString()} | Lev: {c.leverage})
              </option>
            ))}
          </select>
        </div>

        {/* Order Category Tabs: Spot Order | Limit Order | Stop Order */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px]">
          {(["Spot Order", "Limit Order", "Stop Order"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setOrderCategory(cat)}
              className={`flex-1 py-1 text-center font-bold rounded-md transition-all cursor-pointer ${
                orderCategory === cat
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Big Bid / Ask Quote Displays */}
        <div className="grid grid-cols-2 gap-2 text-center font-mono">
          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
            <div className="text-[10px] font-bold text-rose-600 uppercase">BID (SELL)</div>
            <div className="text-sm font-black text-rose-700 mt-0.5">
              {bidPrice.toFixed(currentSymbol?.digits || 5)}
            </div>
          </div>
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="text-[10px] font-bold text-emerald-600 uppercase">ASK (BUY)</div>
            <div className="text-sm font-black text-emerald-700 mt-0.5">
              {askPrice.toFixed(currentSymbol?.digits || 5)}
            </div>
          </div>
        </div>

        {/* Volume Lots Input & Presets */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Volume (Lots)
            </label>
            <span className="text-[10px] font-mono text-slate-400">
              Min: {currentSymbol?.minLot} | Max: {currentSymbol?.maxLot}
            </span>
          </div>
          <input
            type="number"
            step="0.01"
            min={currentSymbol?.minLot || 0.01}
            max={currentSymbol?.maxLot || 100}
            value={lots}
            onChange={(e) => setLots(parseFloat(e.target.value) || 0.01)}
            className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs"
          />

          <div className="flex gap-1 mt-1.5 overflow-x-auto">
            {lotPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setLots(preset)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  lots === preset
                    ? "bg-slate-900 text-white font-bold"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-Side SELL & BUY Side Selector Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOrderType("SELL")}
            className={`py-2 rounded-lg font-black text-xs uppercase tracking-wider border transition-all cursor-pointer ${
              orderType === "SELL"
                ? "bg-white border-rose-600 text-rose-600 shadow-xs ring-2 ring-rose-500/20"
                : "bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
          >
            SELL
          </button>
          <button
            type="button"
            onClick={() => setOrderType("BUY")}
            className={`py-2 rounded-lg font-black text-xs uppercase tracking-wider border transition-all cursor-pointer ${
              orderType === "BUY"
                ? "bg-emerald-600 border-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20"
                : "bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
          >
            BUY
          </button>
        </div>

        {/* TP/SL Toggle Switch */}
        <div className="pt-1 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">Take Profit / Stop Loss</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableTpSl}
                onChange={(e) => setEnableTpSl(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {enableTpSl && (
            <div className="grid grid-cols-2 gap-2 animate-fadeIn">
              <div>
                <input
                  type="number"
                  step="any"
                  placeholder="Stop Loss"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="any"
                  placeholder="Take Profit"
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Trade Snapshot Card matching User Side */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-[11px] font-mono">
          <div className="flex items-center justify-between text-slate-500 font-sans font-bold text-[10px] uppercase border-b border-slate-200 pb-1">
            <span>Trade Snapshot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Spread</span>
            <span className="text-slate-900 font-bold">{currentSymbol?.spread}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Volume</span>
            <span className="text-slate-900 font-bold">{lots} lots</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Required Margin</span>
            <span className="text-amber-700 font-bold">${requiredMargin.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Free Margin</span>
            <span className="text-emerald-700 font-bold">${freeMargin.toLocaleString()} USD</span>
          </div>
          <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1">
            <span>After Trade</span>
            <span className="text-slate-900 font-bold">${freeMarginAfter.toLocaleString()} USD</span>
          </div>
        </div>

        {/* Big Green Place Order Button */}
        <button
          type="submit"
          className="w-full py-2.5 px-4 rounded-lg font-black text-xs uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>PLACE ORDER</span>
        </button>
      </form>
    </div>
  );
};
