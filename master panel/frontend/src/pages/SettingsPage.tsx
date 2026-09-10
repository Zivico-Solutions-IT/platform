import React, { useState, useEffect } from "react";
import { usePortal } from "../context/PortalContext";
import { ActiveNavTab } from "../types";
import { AssignUsersTab } from "../components/settings/AssignUsersTab";
import { DepositMethodAddressesTab } from "../components/settings/DepositMethodAddressesTab";
import { ReferralRewardsTab } from "../components/settings/ReferralRewardsTab";
import { ReferralCodeTab } from "../components/settings/ReferralCodeTab";
import { StaffPermissionsTab } from "../components/settings/StaffPermissionsTab";
import { SymbolSettingsTab } from "../components/settings/SymbolSettingsTab";
import { BrokerGatewayTab } from "../components/settings/BrokerGatewayTab";
import {
  Users,
  CreditCard,
  Gift,
  Key,
  Shield,
  SlidersHorizontal,
  Server,
} from "lucide-react";

export type SettingsSubTab =
  | "assign-users"
  | "deposit-methods"
  | "referral-rewards"
  | "referral-code"
  | "staff-permissions"
  | "symbol-settings"
  | "broker-gateway";

interface SettingsPageProps {
  initialSubTab?: ActiveNavTab;
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { activeTab, setActiveTab, companyConfig } = usePortal();
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  // Map activeTab to SettingsSubTab
  const getSubTabFromActiveTab = (tab: ActiveNavTab): SettingsSubTab => {
    switch (tab) {
      case "settings-assign-users":
        return "assign-users";
      case "settings-deposit-methods":
        return "deposit-methods";
      case "settings-referral-rewards":
        return "referral-rewards";
      case "settings-referral-code":
        return "referral-code";
      case "settings-staff-permissions":
        return "staff-permissions";
      case "settings-symbol-settings":
        return "symbol-settings";
      case "settings-broker-gateway":
        return "broker-gateway";
      default:
        return "assign-users";
    }
  };

  const [currentSubTab, setCurrentSubTab] = useState<SettingsSubTab>(() =>
    getSubTabFromActiveTab(activeTab)
  );

  // Sync if activeTab changes externally (e.g. from Sidebar)
  useEffect(() => {
    if (activeTab.startsWith("settings")) {
      setCurrentSubTab(getSubTabFromActiveTab(activeTab));
    }
  }, [activeTab]);

  const handleSwitchTab = (subTab: SettingsSubTab) => {
    setCurrentSubTab(subTab);
    // Sync with global activeTab
    switch (subTab) {
      case "assign-users":
        setActiveTab("settings-assign-users");
        break;
      case "deposit-methods":
        setActiveTab("settings-deposit-methods");
        break;
      case "referral-rewards":
        setActiveTab("settings-referral-rewards");
        break;
      case "referral-code":
        setActiveTab("settings-referral-code");
        break;
      case "staff-permissions":
        setActiveTab("settings-staff-permissions");
        break;
      case "symbol-settings":
        setActiveTab("settings-symbol-settings");
        break;
      case "broker-gateway":
        setActiveTab("settings-broker-gateway");
        break;
    }
  };

  return (
    <div className="p-3 sm:p-4 space-y-3 font-sans select-none bg-[#f8fafc] min-h-[calc(100vh-65px)]">
      {/* Top Excel Segmented Navigation Ribbon Bar */}
      <div className="bg-white border border-slate-300 p-2 rounded-xl shadow-2xs flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto select-none">
          {/* 1. Assign Users to Agents (Image 1) */}
          <button
            onClick={() => handleSwitchTab("assign-users")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              currentSubTab === "assign-users"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Assign Users</span>
          </button>

          {/* 2. Deposit Method Addresses (Images 2 & 3) */}
          <button
            onClick={() => handleSwitchTab("deposit-methods")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              currentSubTab === "deposit-methods"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Deposit Addresses</span>
          </button>

          {/* 3. Referral Rewards (Image 4) */}
          <button
            onClick={() => handleSwitchTab("referral-rewards")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              currentSubTab === "referral-rewards"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Referral Rewards</span>
          </button>

          {/* 4. Referral Code (Image 5) */}
          <button
            onClick={() => handleSwitchTab("referral-code")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              currentSubTab === "referral-code"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Referral Code</span>
          </button>

          {/* 5. Staff & Permissions (Images 1, 2, 3) */}
          <button
            onClick={() => handleSwitchTab("staff-permissions")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              currentSubTab === "staff-permissions"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>Staff & Permissions</span>
          </button>

          {/* 6. Symbol Settings (Image 4) */}
          <button
            onClick={() => handleSwitchTab("symbol-settings")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              currentSubTab === "symbol-settings"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-500" />
            <span>Symbol Settings</span>
          </button>

          {/* 7. Broker & Gateway Settings */}
          <button
            onClick={() => handleSwitchTab("broker-gateway")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              currentSubTab === "broker-gateway"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Broker & Gateway</span>
          </button>
        </div>

        {/* Brand System Tag */}
        <div className="flex items-center gap-2 pr-1 text-xs font-mono font-bold text-slate-500">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: brandPrimary }}
          />
          <span className="hidden xl:inline uppercase">{companyConfig.name} Master Settings</span>
        </div>
      </div>

      {/* Sub-Tab Content View */}
      <div className="transition-all duration-150">
        {currentSubTab === "assign-users" && <AssignUsersTab />}
        {currentSubTab === "deposit-methods" && <DepositMethodAddressesTab />}
        {currentSubTab === "referral-rewards" && <ReferralRewardsTab />}
        {currentSubTab === "referral-code" && <ReferralCodeTab />}
        {currentSubTab === "staff-permissions" && <StaffPermissionsTab />}
        {currentSubTab === "symbol-settings" && <SymbolSettingsTab />}
        {currentSubTab === "broker-gateway" && <BrokerGatewayTab />}
      </div>
    </div>
  );
};
