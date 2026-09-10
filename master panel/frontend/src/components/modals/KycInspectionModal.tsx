import React, { useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { KycVerification } from "../../types";
import { X, ShieldCheck, FileText, Check, Eye } from "lucide-react";

export const KycInspectionModal: React.FC<{
  kyc: KycVerification | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ kyc, isOpen, onClose }) => {
  const { approveKyc, rejectKyc } = usePortal();
  const [rejectReason, setRejectReason] = useState<string>("Document unreadable / expired");
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);

  if (!isOpen || !kyc) return null;

  const handleApprove = () => {
    approveKyc(kyc.id);
    onClose();
  };

  const handleReject = () => {
    rejectKyc(kyc.id, rejectReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn select-none font-sans">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
              KYC Document Review — Account #{kyc.login}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* User info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Client Name</span>
              <span className="font-semibold text-slate-800">{kyc.clientName}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Login ID</span>
              <span className="font-mono text-emerald-700 font-bold">#{kyc.login}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Document</span>
              <span className="text-slate-700">{kyc.docType}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Doc Number</span>
              <span className="font-mono text-slate-800 font-medium">{kyc.docNumber}</span>
            </div>
          </div>

          {/* Document Previews */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Identity Proof Document (Front / Passport page)</span>
            </h4>
            <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center group">
              <img
                src={kyc.idFrontUrl}
                alt="Document Front"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a
                  href={kyc.idFrontUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Full Size</span>
                </a>
              </div>
            </div>
          </div>

          {/* Proof of Address */}
          {kyc.addressProofUrl && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Proof of Address (Utility Bill / Bank Statement)</span>
              </h4>
              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center group">
                <img
                  src={kyc.addressProofUrl}
                  alt="Address Proof"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a
                    href={kyc.addressProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open Full Size</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Rejection input box */}
          {showRejectBox && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-semibold text-rose-800 block">
                Reason for Rejection (Sent to client email)
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="px-3 py-1 rounded-lg text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {!showRejectBox && (
              <button
                type="button"
                onClick={() => setShowRejectBox(true)}
                className="px-4 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
              >
                Reject Documents
              </button>
            )}
            <button
              type="button"
              onClick={handleApprove}
              className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Verification</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
