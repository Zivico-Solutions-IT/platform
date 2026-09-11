import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Zap } from "lucide-react";
import { usePortal } from "../context/PortalContext";

export const MarketTradePage: React.FC = () => {
  const { clients, symbols, placeOrder, openTrades, closeTrade } = usePortal();
  const [selectedLogin, setSelectedLogin] = useState(0);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [category, setCategory] = useState("All categories");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [timing, setTiming] = useState<"live" | "past">("live");
  const [pastTradeOpen, setPastTradeOpen] = useState(false);
  const [lots, setLots] = useState(0.01);
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [openPrice, setOpenPrice] = useState("");
  const [closePrice, setClosePrice] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [comment, setComment] = useState("Manager Trading Terminal");

  const liveAccounts = useMemo(
    () => clients.filter((item) => String(item.accountType).toLowerCase() === "live"),
    [clients],
  );

  useEffect(() => {
    if (liveAccounts.length && !liveAccounts.some((item) => item.login === selectedLogin)) {
      setSelectedLogin(liveAccounts[0].login);
    }
  }, [liveAccounts, selectedLogin]);

  useEffect(() => {
    if (!selectedSymbol && symbols[0]) setSelectedSymbol(symbols[0].symbol);
  }, [symbols, selectedSymbol]);

  const categories = useMemo(
    () => ["All categories", ...Array.from(new Set(symbols.map((item) => item.category))).sort()],
    [symbols],
  );
  const availableSymbols = useMemo(
    () => symbols.filter((item) => category === "All categories" || item.category === category),
    [symbols, category],
  );
  const symbol = symbols.find((item) => item.symbol === selectedSymbol) || availableSymbols[0] || symbols[0];
  const account = liveAccounts.find((item) => item.login === selectedLogin) || liveAccounts[0];
  const accountTrades = openTrades.filter((trade) => trade.login === account?.login);
  const leverage = Number(account?.leverage?.replace("1:", "")) || 500;
  const margin = symbol ? (lots * symbol.contractSize * symbol.bid) / leverage : 0;
  const numericOpenPrice = Number(openPrice);
  const numericClosePrice = Number(closePrice);
  const entryPrice = symbol
    ? (timing === "past" && Number.isFinite(numericOpenPrice) && numericOpenPrice > 0
      ? numericOpenPrice
      : side === "BUY" ? symbol.ask : symbol.bid)
    : 0;
  const exitPrice = symbol
    ? (timing === "past" && !pastTradeOpen && Number.isFinite(numericClosePrice) && numericClosePrice > 0
      ? numericClosePrice
      : side === "BUY" ? symbol.bid : symbol.ask)
    : 0;
  const calculatePnl = (price?: number) => {
    if (!symbol || !price || !entryPrice) return null;
    const gross = (price - entryPrice) * (side === "BUY" ? 1 : -1) * lots * symbol.contractSize;
    const commission = lots * 3.5;
    return Number((gross - commission).toFixed(2));
  };
  const currentPnl = calculatePnl(exitPrice);
  const slPnl = sl ? calculatePnl(Number(sl)) : null;
  const tpPnl = tp ? calculatePnl(Number(tp)) : null;

  const chooseCategory = (value: string) => {
    setCategory(value);
    const first = symbols.find((item) => value === "All categories" || item.category === value);
    if (first) setSelectedSymbol(first.symbol);
  };

  const executeOrder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!account || !symbol || lots <= 0) return;
    placeOrder({
      login: account.login,
      symbol: symbol.symbol,
      type: side,
      lots,
      sl: sl ? Number(sl) : null,
      tp: tp ? Number(tp) : null,
      comment,
      openPrice: timing === "past" && openPrice ? Number(openPrice) : undefined,
      openTime: timing === "past" && openTime ? new Date(openTime).toISOString() : undefined,
      closePrice: timing === "past" && !pastTradeOpen && closePrice ? Number(closePrice) : undefined,
      closeTime: timing === "past" && !pastTradeOpen && closeTime ? new Date(closeTime).toISOString() : undefined,
    });
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-50 p-3 sm:p-5 text-slate-800">
      <section className="mx-auto max-w-[1550px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-black tracking-[0.12em] text-slate-950">ADD TRADING</h1>
              <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-emerald-700">DIRECT EXECUTION</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Place a live manual trade for the active broker company.</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            {symbols.length} instruments available
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Instrument category</span>
              <select value={category} onChange={(event) => chooseCategory(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500">
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Symbol</span>
              <select value={symbol?.symbol || ""} onChange={(event) => setSelectedSymbol(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm font-bold text-slate-800 outline-none focus:border-amber-500">
                {availableSymbols.map((item) => <option key={item.id} value={item.symbol}>{item.symbol} — {item.category}</option>)}
              </select>
            </label>
          </div>
        </section>

        {symbol && (
          <div className="grid gap-4 xl:grid-cols-3">
            <form onSubmit={executeOrder} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-black text-slate-950">{symbol.symbol}</span>
                  <span className="rounded bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">{symbol.category}</span>
                  <span className="font-mono text-xs text-slate-500">Spread: {symbol.spread} pips</span>
                </div>
                <span className="font-mono text-xs text-slate-500">Contract size: {symbol.contractSize.toLocaleString()}</span>
              </div>

              <div className="space-y-5 p-4 sm:p-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Trade timing</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setTiming("live")} className={`rounded-lg px-4 py-2 text-xs font-bold ${timing === "live" ? "bg-sky-600 text-white" : "border border-slate-300 bg-white text-slate-600"}`}>Open live trade</button>
                    <button type="button" onClick={() => setTiming("past")} className={`rounded-lg px-4 py-2 text-xs font-bold ${timing === "past" ? "bg-amber-500 text-slate-950" : "border border-slate-300 bg-white text-slate-600"}`}>Add past trade</button>
                  </div>
                  {timing === "past" && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3"><span className="text-xs text-slate-600">Past trade status:</span><button type="button" onClick={() => setPastTradeOpen(true)} className={`rounded px-3 py-1.5 text-xs font-bold ${pastTradeOpen ? "bg-sky-600 text-white" : "border border-slate-300 bg-white text-slate-600"}`}>Still open</button><button type="button" onClick={() => setPastTradeOpen(false)} className={`rounded px-3 py-1.5 text-xs font-bold ${!pastTradeOpen ? "bg-amber-500 text-slate-950" : "border border-slate-300 bg-white text-slate-600"}`}>Already closed</button></div>}
                </div>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Client live account</span>
                  <select value={account?.login || ""} onChange={(event) => setSelectedLogin(Number(event.target.value))} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500">
                    {liveAccounts.map((item) => <option key={item.login} value={item.login}>#{item.login} — {item.name} · Equity ${item.equity.toLocaleString()} · {item.leverage}</option>)}
                  </select>
                  <span className="block text-[10px] text-slate-400">Only Live trading accounts are available for manual execution.</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setSide("BUY")} className={`rounded-xl border p-4 text-center transition ${side === "BUY" ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-300"}`}>
                    <span className="flex justify-center gap-1 text-xs font-black tracking-wider text-emerald-700"><ArrowUpRight className="h-4 w-4" /> BUY · ASK</span>
                    <strong className="mt-2 block font-mono text-2xl text-slate-950">{symbol.ask.toFixed(symbol.digits)}</strong>
                    <span className="mt-1 block text-[10px] text-emerald-600">Instant market execution</span>
                  </button>
                  <button type="button" onClick={() => setSide("SELL")} className={`rounded-xl border p-4 text-center transition ${side === "SELL" ? "border-rose-500 bg-rose-50 ring-2 ring-rose-100" : "border-slate-200 bg-white hover:border-rose-300"}`}>
                    <span className="flex justify-center gap-1 text-xs font-black tracking-wider text-rose-700"><ArrowDownRight className="h-4 w-4" /> SELL · BID</span>
                    <strong className="mt-2 block font-mono text-2xl text-slate-950">{symbol.bid.toFixed(symbol.digits)}</strong>
                    <span className="mt-1 block text-[10px] text-rose-600">Instant market execution</span>
                  </button>
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500"><span>Volume (lots)</span><span className="font-mono normal-case">Estimated margin: ${margin.toFixed(2)}</span></div>
                  <input type="number" min={symbol.minLot} max={symbol.maxLot} step="0.01" value={lots} onChange={(event) => setLots(Number(event.target.value) || 0.01)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-base font-bold outline-none focus:border-sky-500" />
                  <div className="mt-2 flex flex-wrap gap-2">{[0.01, 0.1, 0.5, 1, 2, 5, 10].map((item) => <button key={item} type="button" onClick={() => setLots(item)} className={`rounded px-3 py-1.5 font-mono text-xs ${lots === item ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item}</button>)}</div>
                </div>

                <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Trade snapshot</h3>
                      <p className="mt-0.5 text-[10px] text-slate-500">Includes estimated commission of ${(lots * 3.5).toFixed(2)}.</p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">Entry: {entryPrice.toFixed(symbol.digits)} · Exit: {exitPrice.toFixed(symbol.digits)}</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                      <span className="text-[10px] font-bold uppercase text-slate-500">{timing === "past" && !pastTradeOpen ? "Realized P/L" : "Current estimated P/L"}</span>
                      <strong className={`mt-1 block font-mono text-base ${currentPnl !== null && currentPnl >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{currentPnl === null ? "—" : `${currentPnl >= 0 ? "+" : ""}$${currentPnl.toFixed(2)}`}</strong>
                    </div>
                    <div className="rounded-lg border border-rose-100 bg-white p-2.5">
                      <span className="text-[10px] font-bold uppercase text-slate-500">At stop loss</span>
                      <strong className={`mt-1 block font-mono text-base ${slPnl === null ? "text-slate-400" : slPnl >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{slPnl === null ? "Set SL to calculate" : `${slPnl >= 0 ? "+" : ""}$${slPnl.toFixed(2)}`}</strong>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-white p-2.5">
                      <span className="text-[10px] font-bold uppercase text-slate-500">At take profit</span>
                      <strong className={`mt-1 block font-mono text-base ${tpPnl === null ? "text-slate-400" : tpPnl >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{tpPnl === null ? "Set TP to calculate" : `${tpPnl >= 0 ? "+" : ""}$${tpPnl.toFixed(2)}`}</strong>
                    </div>
                  </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stop loss</span><input type="number" step="any" value={sl} onChange={(event) => setSl(event.target.value)} placeholder="Optional SL" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-rose-500" /></label>
                  <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Take profit</span><input type="number" step="any" value={tp} onChange={(event) => setTp(event.target.value)} placeholder="Optional TP" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-emerald-500" /></label>
                </div>
                {timing === "past" && <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open price</span><input type="number" step="any" value={openPrice} onChange={(event) => setOpenPrice(event.target.value)} placeholder="Chart / price" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-sky-500" /></label>
                  <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open date & time</span><input type="datetime-local" value={openTime} onChange={(event) => setOpenTime(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-500" /></label>
                  {!pastTradeOpen && <><label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Close price</span><input type="number" step="any" value={closePrice} onChange={(event) => setClosePrice(event.target.value)} placeholder="Chart / price" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-amber-500" /></label>
                  <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Close date & time</span><input type="datetime-local" value={closeTime} onChange={(event) => setCloseTime(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-500" /></label></>}
                </div>}
                <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Manager note</span><input value={comment} onChange={(event) => setComment(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-sky-500" /></label>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <span className="text-xs text-slate-500">Free margin: <b className="font-mono text-emerald-700">${account?.freeMargin.toLocaleString() || "0"}</b></span>
                  <button type="submit" className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-black shadow-sm transition hover:brightness-95 ${side === "BUY" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}><Zap className="h-4 w-4" /> {timing === "past" ? "Add past" : "Execute"} {side} {lots} lots</button>
                </div>
              </div>
            </form>

            <aside className="space-y-4">
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="flex items-center gap-2 border-b border-slate-200 pb-3 text-sm font-black text-slate-900"><CircleDollarSign className="h-4 w-4 text-amber-600" /> Selected account</h2>
                {account && <dl className="mt-3 space-y-2.5 font-mono text-xs"><div className="flex justify-between"><dt className="text-slate-500">Login</dt><dd className="font-bold">#{account.login}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Client</dt><dd className="max-w-[60%] truncate font-sans font-semibold">{account.name}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Balance</dt><dd className="font-bold">${account.balance.toLocaleString()}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Equity</dt><dd className="font-bold text-sky-700">${account.equity.toLocaleString()}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Free margin</dt><dd className="font-bold text-emerald-700">${account.freeMargin.toLocaleString()}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Leverage</dt><dd className="font-bold text-amber-700">{account.leverage}</dd></div></dl>}
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="flex justify-between text-sm font-black text-slate-900"><span>Open trades</span><span className="font-mono text-sky-700">{accountTrades.length} active</span></h2>
                <div className="mt-3 space-y-2">{accountTrades.length ? accountTrades.map((trade) => <div key={trade.ticket} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs"><div><b className="font-mono">{trade.symbol}</b><span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${trade.type === "BUY" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{trade.type} {trade.lots}L</span><p className="mt-1 font-mono text-slate-500">${trade.profit.toFixed(2)}</p></div><button type="button" onClick={() => closeTrade(trade.ticket)} className="text-xs font-bold text-rose-600 hover:underline">Close</button></div>) : <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">No open trades for this account.</p>}</div>
              </section>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
};
