import React, { useState, useEffect } from "react";
import { usePortal } from "../../context/PortalContext";
import { api } from "../../services/api";
import {
  Key,
  Save,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
} from "lucide-react";

export const ReferralCodeTab: React.FC = () => {
  const { companyConfig, currentCompany, addToast } = usePortal();
  const companyId = companyConfig?.id || currentCompany || "novafxm";
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const [registrationCode, setRegistrationCode] = useState<string>("");
  const [registrationCodeDraft, setRegistrationCodeDraft] = useState<string>("");
  const [isLoadingCode, setIsLoadingCode] = useState<boolean>(true);
  const [isSavingCode, setIsSavingCode] = useState<boolean>(false);
  const [isDeletingCode, setIsDeletingCode] = useState<boolean>(false);

  const loadRegistrationCode = async () => {
    setIsLoadingCode(true);
    try {
      const code = await api.getRegistrationCode(companyId);
      setRegistrationCode(code || "");
      setRegistrationCodeDraft(code || "");
    } catch (err) {
      console.warn("Failed to load registration code:", err);
    } finally {
      setIsLoadingCode(false);
    }
  };

  useEffect(() => {
    loadRegistrationCode();
  }, [companyId]);

  const handleSaveRegistrationCode = async () => {
    const clean = registrationCodeDraft.trim().toUpperCase();
    if (!clean) {
      addToast("error", "Invalid Code", "Please enter a referral code first.");
      return;
    }
    if (!/^[A-Z0-9_-]{4,40}$/.test(clean)) {
      addToast("error", "Invalid Format", "Use 4–40 characters: letters, numbers, hyphens and underscores.");
      return;
    }
    setIsSavingCode(true);
    try {
      const updated = await api.saveRegistrationCode(companyId, clean);
      const finalCode = updated || clean;
      setRegistrationCode(finalCode);
      setRegistrationCodeDraft(finalCode);
      addToast("success", "Code Saved", "Registration referral code saved. New registrations now require it.");
    } catch (err: any) {
      addToast("error", "Save Failed", err?.message || "Failed to save registration referral code.");
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleDeleteRegistrationCode = async () => {
    if (
      !window.confirm(
        `Delete registration referral code "${registrationCode}"?\n\nDeleting it disables public user registration and displays a support message to clients.`
      )
    ) {
      return;
    }
    setIsDeletingCode(true);
    try {
      await api.deleteRegistrationCode(companyId);
      setRegistrationCode("");
      setRegistrationCodeDraft("");
      addToast("info", "Code Removed", "Referral code removed. Public registration is disabled without a code.");
    } catch (err: any) {
      addToast("error", "Delete Failed", err?.message || "Failed to remove registration referral code.");
    } finally {
      setIsDeletingCode(false);
    }
  };

  const handleCopyLink = () => {
    if (!registrationCode) return;
    const url = `https://portal.${companyId}.com/register?ref=${registrationCode}`;
    navigator.clipboard.writeText(url);
    addToast("info", "Link Copied", `Registration link for code "${registrationCode}" copied!`);
  };

  return (
    <div className="space-y-4 animate-fadeIn font-sans select-none flex-1 min-h-0 flex flex-col p-1">
      {/* Top Title & Subtitle matching Master Console */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
            Referral Code
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Manage client balances, trading access and financial operations.
          </p>
        </div>
        <button
          onClick={loadRegistrationCode}
          disabled={isLoadingCode}
          className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs"
          title="Refresh code from database"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCode ? "animate-spin text-amber-600" : ""}`} />
        </button>
      </div>

      {/* Main Single Registration Referral Code Card matching Old Master Console Screenshot */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 shadow-2xs max-w-4xl">
        <h2 className="text-lg font-bold text-slate-900 font-sans">
          Referral Code
        </h2>
        <p className="mt-1 text-xs text-slate-600 max-w-3xl leading-relaxed font-sans">
          This is the single code required for every new public {companyConfig?.name || companyId} registration. Deleting it disables public registration and displays a support message to clients.
        </p>

        {/* Input Card Container matching media_1789033331334.png */}
        <div className="mt-6 p-5 rounded-xl bg-[#f8fafc] border border-slate-200 max-w-xl">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 font-sans">
            Registration referral code
          </label>

          <input
            type="text"
            value={registrationCodeDraft}
            onChange={(e) => setRegistrationCodeDraft(e.target.value.toUpperCase())}
            placeholder="Example: NOVA2026"
            disabled={isLoadingCode || isSavingCode}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-mono font-bold text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs transition-all"
          />

          <p className="mt-2 text-xs text-slate-500 font-sans">
            4–10 characters: letters, numbers, hyphens and underscores.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSaveRegistrationCode}
              disabled={isSavingCode || isLoadingCode}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-900 shadow-2xs transition-all flex items-center gap-1.5 hover:brightness-105 active:scale-95 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: brandPrimary }}
            >
              {isSavingCode ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSavingCode ? "Saving..." : "Save code"}</span>
            </button>

            {registrationCode ? (
              <button
                type="button"
                onClick={handleDeleteRegistrationCode}
                disabled={isDeletingCode || isLoadingCode}
                className="px-4 py-2 rounded-lg text-xs font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-300 shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDeletingCode ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span>{isDeletingCode ? "Deleting..." : "Delete code"}</span>
              </button>
            ) : null}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-sans">
            {registrationCode ? (
              <div className="flex items-center justify-between w-full flex-wrap gap-2">
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Active code: {registrationCode}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="text-xs text-amber-800 hover:text-amber-900 font-semibold underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Registration Link
                </button>
              </div>
            ) : (
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                No active code — normal public registration is enabled without a code.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
