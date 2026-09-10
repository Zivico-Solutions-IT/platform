import React, { useState, useEffect } from "react";
import { usePortal } from "../../context/PortalContext";
import { Deposit } from "../../types";
import {
  X,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  ShieldCheck,
  Building,
  DollarSign,
  Maximize2,
  Minimize2,
} from "lucide-react";

export const DepositSlipModal: React.FC<{
  deposit: Deposit | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ deposit, isOpen, onClose }) => {
  const { approveDeposit, rejectDeposit } = usePortal();

  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [showDeclineBox, setShowDeclineBox] = useState<boolean>(false);
  const [declineReason, setDeclineReason] = useState<string>("Payment proof unverified / Invalid reference");
  const [uploadedSlipUrl, setUploadedSlipUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  useEffect(() => {
    if (deposit) {
      setApprovedAmount(deposit.amount);
      setBonusAmount(deposit.bonusAmount || 0);
      setNotes(deposit.notes || "");
      setShowDeclineBox(false);
      setUploadedSlipUrl(deposit.slipUrl || null);
      setIsZoomed(false);
    }
  }, [deposit]);

  if (!isOpen || !deposit) return null;

  const isAmountAdjusted = Math.abs(approvedAmount - deposit.amount) > 0.001;
  const amountDifference = Number((approvedAmount - deposit.amount).toFixed(2));
  const slipAmount = deposit.slipData?.slipAmount;

  const handleApprove = () => {
    if (isNaN(approvedAmount) || approvedAmount <= 0) {
      alert("Please enter a valid positive approval amount.");
      return;
    }
    approveDeposit(deposit.id, approvedAmount, notes, bonusAmount);
    onClose();
  };

  const handleDecline = () => {
    rejectDeposit(deposit.id, declineReason);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedSlipUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn select-none font-sans">
      <div
        className={`w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isZoomed ? "max-w-5xl h-[94vh]" : "max-w-3xl max-h-[90vh]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                  DEPOSIT VERIFICATION & PAYMENT SLIP
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                    deposit.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : deposit.status === "PENDING"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {deposit.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Ref #{deposit.id} • Account #{deposit.login} ({deposit.clientName}) • {deposit.method}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              title={isZoomed ? "Exit Fullscreen" : "Expand View"}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {isZoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Details Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block font-sans">Claimed Amount</span>
              <span className="font-bold text-slate-900 text-sm">
                ${deposit.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                <span className="text-[10px] font-normal text-slate-400">{deposit.currency}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block font-sans">Payment Method</span>
              <span className="font-bold text-slate-800">{deposit.method}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block font-sans">Reference / Hash</span>
              <span className="text-slate-700 truncate block font-medium" title={deposit.txHash}>
                {deposit.txHash.slice(0, 18)}...
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block font-sans">Submitted At</span>
              <span className="text-slate-600">{deposit.createdAt}</span>
            </div>
          </div>

          {/* Payment Slip Display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Uploaded Payment Slip / Official Transfer Receipt</span>
              </h4>

              <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Replace / Upload Slip</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedSlipUrl ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900/5 flex items-center justify-center p-2">
                <img
                  src={uploadedSlipUrl}
                  alt="Payment Slip Proof"
                  className="max-h-[360px] w-auto object-contain rounded-lg shadow-md"
                />
              </div>
            ) : (
              /* High-Fidelity Stylized Official Payment Slip Receipt */
              <div className="border-2 border-slate-200/90 rounded-2xl bg-white shadow-sm overflow-hidden font-sans">
                {/* Bank / Gateway Official Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                      <Building className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-100">
                        {deposit.slipData?.bankName || "Official Electronic Remittance Slip"}
                      </h5>
                      <p className="text-[10px] text-emerald-400 font-mono">
                        {deposit.slipData?.network || "SWIFT & SEPA INTERBANK CLEARING"} • MT103/CUSTOMER
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 block uppercase font-sans">Transaction Ref</span>
                    <span className="text-xs font-bold text-white tracking-wider">
                      {deposit.slipData?.referenceNumber || deposit.txHash.slice(0, 16)}
                    </span>
                  </div>
                </div>

                {/* Slip Body Details */}
                <div className="p-5 bg-white space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {/* Sender Details */}
                    <div className="space-y-2 border-r border-slate-100 pr-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Sender / Ordering Customer
                      </span>
                      <div className="space-y-1">
                        <div className="text-slate-900 font-bold">
                          {deposit.slipData?.senderName || deposit.clientName}
                        </div>
                        <div className="text-slate-500 text-[11px] font-mono">
                          Account: {deposit.slipData?.accountNumber || `•••• ${deposit.login}`}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Trading Login: <span className="font-mono font-bold text-slate-800">#{deposit.login}</span>
                        </div>
                      </div>
                    </div>

                    {/* Beneficiary Details */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Beneficiary / Receiving Broker
                      </span>
                      <div className="space-y-1">
                        <div className="text-slate-900 font-bold">NOVAFXM Global Prime Ltd</div>
                        <div className="text-slate-500 text-[11px] font-mono">
                          {deposit.slipData?.beneficiaryAccount || "Standard Chartered Bank #4092-8819-2091-USD"}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Currency: <span className="font-mono font-bold text-slate-800">{deposit.currency}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Table inside Slip */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 font-mono text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Original Remittance Amount:</span>
                        <span className="font-bold text-slate-800">
                          ${deposit.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {deposit.currency}
                        </span>
                      </div>

                      {deposit.slipData?.feeDeducted !== undefined && deposit.slipData.feeDeducted > 0 && (
                        <div className="flex items-center justify-between text-rose-600">
                          <span>Intermediary / Sending Bank Fee:</span>
                          <span className="font-bold">
                            -${deposit.slipData.feeDeducted.toLocaleString(undefined, { minimumFractionDigits: 2 })} {deposit.currency}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-900 font-sans">
                          Net Verified Deposit on Slip:
                        </span>
                        <span className="font-black text-emerald-700 text-base">
                          ${(deposit.slipData?.slipAmount || deposit.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}{" "}
                          <span className="text-xs font-normal text-slate-500">{deposit.currency}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stamp & Verification Note */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[11px] text-slate-500">
                        {deposit.slipData?.notes || "Slip electronically verified by banking gateway."}
                      </span>
                    </div>
                    <div className="border border-emerald-500/40 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded font-mono text-[10px] font-bold tracking-widest uppercase">
                      Official Bank Seal • Verified
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual Reconciliation & Amount Adjustment Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Amount Reconciliation & Credit Approval
                </h4>
                <p className="text-[11px] text-slate-500">
                  Verify the receipt amount. You can manually adjust the amount if bank fees were deducted or if the slip amount differs.
                </p>
              </div>

              {/* Quick Match Shortcuts */}
              {slipAmount !== undefined && Math.abs(slipAmount - approvedAmount) > 0.001 && deposit.status === "PENDING" && (
                <button
                  type="button"
                  onClick={() => {
                    setApprovedAmount(slipAmount);
                    setNotes(`Amount adjusted to $${slipAmount.toLocaleString()} as verified on payment slip.`);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition-colors flex items-center gap-1"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Match Slip (${slipAmount.toLocaleString()})</span>
                </button>
              )}
            </div>

            {/* Amount (USD) and Bonus (USD) side-by-side - exactly like Image 1 */}
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
                    disabled={deposit.status !== "PENDING"}
                    value={approvedAmount || ""}
                    onChange={(e) => setApprovedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="1000"
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
                    disabled={deposit.status !== "PENDING"}
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-amber-600 focus:outline-none focus:border-emerald-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Approval Notes / Adjustment Reason */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Approval Notes / Adjustment Reason
              </label>
              <input
                type="text"
                disabled={deposit.status !== "PENDING"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., $50 bank transfer fee deducted as per MT103 slip"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Dynamic Adjustment & Bonus Alert */}
            {(isAmountAdjusted || bonusAmount > 0) && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isAmountAdjusted && (
                      <>
                        Amount modified by{" "}
                        <strong>
                          {amountDifference > 0 ? `+$${amountDifference.toFixed(2)}` : `-$${Math.abs(amountDifference).toFixed(2)}`}
                        </strong>{" "}
                        (Claimed: ${deposit.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                      </>
                    )}
                    {isAmountAdjusted && bonusAmount > 0 && " • "}
                    {bonusAmount > 0 && (
                      <>
                        Bonus: <strong className="text-amber-700">+${bonusAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                      </>
                    )}
                  </span>
                </div>
                <div className="font-bold text-amber-900 font-mono text-right">
                  <span>Balance: ${approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  {bonusAmount > 0 && (
                    <span className="text-emerald-700 block text-[11px]">
                      Total Equity: ${(approvedAmount + bonusAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Decline Confirmation Box */}
          {showDeclineBox && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
              <h5 className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                Decline Deposit Request
              </h5>
              <input
                type="text"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Reason for declining..."
                className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowDeclineBox(false)}
                  className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecline}
                  className="px-3.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {deposit.status === "APPROVED" && (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Approved & Credited: ${deposit.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {deposit.bonusAmount ? ` (+ $${deposit.bonusAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Bonus)` : ""} on{" "}
                  {deposit.processedAt || deposit.createdAt}
                </span>
              </span>
            )}
            {deposit.status === "REJECTED" && (
              <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Declined: {deposit.notes || "Compliance rejected"}</span>
              </span>
            )}
            {deposit.status === "PENDING" && (
              <span>Ready for manager clearance and MT5 balance crediting.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Close
            </button>

            {deposit.status === "PENDING" && !showDeclineBox && (
              <>
                <button
                  onClick={() => setShowDeclineBox(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-rose-700 border border-slate-200 text-xs font-semibold transition-colors"
                >
                  Decline
                </button>

                <button
                  onClick={handleApprove}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Approve & Credit $
                    {approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    {bonusAmount > 0 && ` (+ $${bonusAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Bonus)`}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
