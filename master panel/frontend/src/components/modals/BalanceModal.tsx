import React, { useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { X, DollarSign, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export const BalanceModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { clients, adjustClientBalance } = usePortal();

  const [selectedLogin, setSelectedLogin] = useState<number>(clients[0]?.login || 0);
  const [actionType, setActionType] = useState<"DEPOSIT" | "WITHDRAW" | "CREDIT_ADD" | "CREDIT_REMOVE">("DEPOSIT");
  const [amount, setAmount] = useState<string>("1000");
  const [bonus, setBonus] = useState<string>("0");
  const [comment, setComment] = useState<string>("Manager manual adjustment");

  if (!isOpen) return null;

  const currentClient = clients.find((c) => c.login === selectedLogin);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valAmount = parseFloat(amount) || 0;
    const valBonus = parseFloat(bonus) || 0;

    if (valAmount <= 0 && valBonus <= 0) return;

    if (valAmount > 0) {
      let deltaAmount = valAmount;
      let isCredit = false;

      if (actionType === "WITHDRAW") {
        deltaAmount = -valAmount;
      } else if (actionType === "CREDIT_ADD") {
        isCredit = true;
      } else if (actionType === "CREDIT_REMOVE") {
        deltaAmount = -valAmount;
        isCredit = true;
      }

      adjustClientBalance(selectedLogin, deltaAmount, isCredit);
    }

    if (valBonus > 0) {
      const deltaBonus = actionType === "CREDIT_REMOVE" ? -valBonus : valBonus;
      adjustClientBalance(selectedLogin, deltaBonus, true);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
              Financial Operation — Adjust Balance / Credit
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target Client Account */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Target Account
            </label>
            <select
              value={selectedLogin}
              onChange={(e) => setSelectedLogin(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-sans shadow-2xs"
            >
              {clients.map((c) => (
                <option key={c.login} value={c.login}>
                  #{c.login} — {c.name} (Bal: ${c.balance.toLocaleString()} | Credit: ${c.credit.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Current Account Summary Banner */}
          {currentClient && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs grid grid-cols-2 gap-2 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">Current Balance</span>
                <span className="text-slate-800 font-bold">${currentClient.balance.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">Credit / Bonus</span>
                <span className="text-amber-600 font-bold">${currentClient.credit.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">Current Equity</span>
                <span className="text-emerald-600 font-bold">${currentClient.equity.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">Free Margin</span>
                <span className="text-slate-700 font-bold">${currentClient.freeMargin.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Operation Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Operation Type
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActionType("DEPOSIT")}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  actionType === "DEPOSIT"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Deposit (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType("WITHDRAW")}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  actionType === "WITHDRAW"
                    ? "bg-rose-50 border-rose-300 text-rose-800 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Withdraw (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType("CREDIT_ADD")}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  actionType === "CREDIT_ADD"
                    ? "bg-amber-50 border-amber-300 text-amber-800 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-amber-600" />
                <span>Add Credit</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType("CREDIT_REMOVE")}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  actionType === "CREDIT_REMOVE"
                    ? "bg-rose-50 border-rose-300 text-rose-800 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                <X className="w-3.5 h-3.5 text-rose-600" />
                <span>Revoke Credit</span>
              </button>
            </div>
          </div>

          {/* Amount (USD) and Bonus (USD) side-by-side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  placeholder="1000.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Bonus (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Reason / Comment */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Manager Note / Audit Comment
            </label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-sans shadow-2xs"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              Apply Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
