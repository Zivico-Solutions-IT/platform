import React, { useState, useEffect } from "react";
import { usePortal } from "../../context/PortalContext";
import { KycVerification } from "../../types";
import { api } from "../../services/api";
import { X, Check, FileText, Upload, Download, AlertCircle } from "lucide-react";

export const KycInspectionModal: React.FC<{
  kyc: KycVerification | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ kyc, isOpen, onClose }) => {
  const { approveKyc, rejectKyc, addToast, currentCompany } = usePortal();
  
  const [idFrontUrl, setIdFrontUrl] = useState<string>("");
  const [addressProofUrl, setAddressProofUrl] = useState<string>("");
  
  const [idFile, setIdFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);
  
  const [rejectReason, setRejectReason] = useState<string>("Documents invalid or expired");
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState<boolean>(false);

  useEffect(() => {
    if (kyc && isOpen) {
      setIdFrontUrl(kyc.idFrontUrl || "");
      setAddressProofUrl(kyc.addressProofUrl || "");
      setIdFile(null);
      setAddressFile(null);
      setShowRejectBox(false);

      // KYC images are intentionally omitted from the list response. Fetch
      // them only when an administrator opens this inspection dialog.
      if (!kyc.idFrontUrl || !kyc.addressProofUrl) {
        setIsLoadingDocuments(true);
        api.getKycDocuments(currentCompany, kyc.id)
          .then((documents) => {
            setIdFrontUrl(documents.idFrontUrl);
            setAddressProofUrl(documents.addressProofUrl);
          })
          .catch((error) => console.warn("Unable to load KYC documents:", error))
          .finally(() => setIsLoadingDocuments(false));
      }
    }
  }, [kyc, isOpen, currentCompany]);

  if (!isOpen || !kyc) return null;

  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setIdFrontUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddressFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAddressFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAddressProofUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadDocuments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFile && !addressFile && !idFrontUrl && !addressProofUrl) {
      addToast("info", "No Files Selected", "Please select at least one document file to upload.");
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      addToast("success", "Documents Uploaded", `Verification documents updated for ${kyc.clientName}.`);
    }, 400);
  };

  const handleApprove = () => {
    approveKyc(kyc.id);
    addToast("success", "KYC Approved", `Verification approved for ${kyc.clientName}.`);
    onClose();
  };

  const handleReject = () => {
    rejectKyc(kyc.id, rejectReason);
    addToast("info", "KYC Rejected", `Verification rejected for ${kyc.clientName}.`);
    onClose();
  };

  const handleDownload = () => {
    if (idFrontUrl) {
      const link = document.createElement("a");
      link.href = idFrontUrl;
      link.download = `ID_Proof_${kyc.login}.png`;
      link.click();
    } else {
      addToast("info", "No Document", "No ID proof document available for download.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn select-none font-sans">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header matching Image 3 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Verification Documents
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Two Side-by-Side Preview Cards (ID PROOF & ADDRESS PROOF) matching Image 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ID PROOF Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                ID PROOF
              </label>
              <div className="h-44 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden relative group">
                {isLoadingDocuments ? (
                  <span className="text-slate-400 text-sm font-medium">Loading document...</span>
                ) : idFrontUrl ? (
                  <>
                    <img
                      src={idFrontUrl}
                      alt="ID Proof"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <a
                      href={idFrontUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                    >
                      View Full Image
                    </a>
                  </>
                ) : (
                  <span className="text-slate-400 text-sm font-medium">
                    No image uploaded.
                  </span>
                )}
              </div>
            </div>

            {/* ADDRESS PROOF Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                ADDRESS PROOF
              </label>
              <div className="h-44 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden relative group">
                {isLoadingDocuments ? (
                  <span className="text-slate-400 text-sm font-medium">Loading document...</span>
                ) : addressProofUrl ? (
                  <>
                    <img
                      src={addressProofUrl}
                      alt="Address Proof"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <a
                      href={addressProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                    >
                      View Full Image
                    </a>
                  </>
                ) : (
                  <span className="text-slate-400 text-sm font-medium">
                    No image uploaded.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Add Verification Documents Section matching Image 3 */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Add verification documents
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Upload both documents, then approve the submitted verification.
              </p>
            </div>

            <form onSubmit={handleUploadDocuments} className="space-y-3">
              {/* File input 1: ID Proof */}
              <div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleIdFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
                />
              </div>

              {/* File input 2: Address Proof */}
              <div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleAddressFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
                />
              </div>

              {/* Primary Amber Upload Documents Button */}
              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-3 px-4 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-xs tracking-wide shadow-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {isUploading ? "Uploading..." : "Upload documents"}
              </button>
            </form>
          </div>

          {/* Rejection input box if Reject clicked */}
          {showRejectBox && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2 animate-fadeIn">
              <label className="text-xs font-bold text-rose-800 block">
                Reason for Rejection
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="px-3 py-1 rounded-xl text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Buttons matching Image 3 */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
          {/* Green Approve Button */}
          <button
            type="button"
            onClick={handleApprove}
            className="px-6 py-2.5 rounded-xl bg-[#86efac] hover:bg-[#4ade80] text-slate-900 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Approve
          </button>

          {/* Red/Pink Reject Button */}
          <button
            type="button"
            onClick={() => setShowRejectBox(!showRejectBox)}
            className="px-6 py-2.5 rounded-xl bg-[#fca5a5] hover:bg-[#f87171] text-slate-900 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Reject
          </button>

          {/* Light Grey Download / Close Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="px-6 py-2.5 rounded-xl bg-[#e7e5e4] hover:bg-[#d6d3d1] text-slate-800 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};
