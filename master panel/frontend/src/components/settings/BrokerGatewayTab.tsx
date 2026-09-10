import React, { useState, useEffect } from "react";
import { usePortal } from "../../context/PortalContext";
import {
  Server,
  Save,
  RotateCcw,
  CheckCircle2,
  Sliders,
  ShieldCheck,
} from "lucide-react";

export interface BrokerParamRow {
  key: string;
  name: string;
  category: "SERVER & BRIDGE" | "RISK & MARGIN" | "AUTOMATION";
  description: string;
  type: "text" | "number" | "select" | "boolean";
  defaultValue: string;
}

const PARAM_DEFINITIONS: BrokerParamRow[] = [
  {
    key: "serverName",
    name: "MT5 Server Instance Name",
    category: "SERVER & BRIDGE",
    description: "Primary MT5 trade routing host gateway",
    type: "text",
    defaultValue: "NOVAFXM Live Server 01",
  },
  {
    key: "brokerBrand",
    name: "Broker Legal Entity Brand",
    category: "SERVER & BRIDGE",
    description: "Brand title presented on reports and trade confirmations",
    type: "text",
    defaultValue: "NOVAFXM PRIME",
  },
  {
    key: "defaultLeverage",
    name: "Default Account Leverage",
    category: "RISK & MARGIN",
    description: "Default leverage multiplier assigned to new live accounts",
    type: "select",
    defaultValue: "1:500",
  },
  {
    key: "marginCall",
    name: "Margin Call Threshold (%)",
    category: "RISK & MARGIN",
    description: "Equity to margin ratio triggering manager margin alerts",
    type: "number",
    defaultValue: "80%",
  },
  {
    key: "stopOut",
    name: "Stop Out Level (%)",
    category: "RISK & MARGIN",
    description: "Automatic liquidation threshold for open negative positions",
    type: "number",
    defaultValue: "50%",
  },
  {
    key: "autoApproveVerifiedDeposits",
    name: "Auto-Approve Verified Deposits",
    category: "AUTOMATION",
    description: "Automatically credit verified client deposits below limit",
    type: "boolean",
    defaultValue: "Enabled",
  },
  {
    key: "soundAlerts",
    name: "Terminal Audio Chimes",
    category: "AUTOMATION",
    description: "Sound notifications on incoming trades, KYC and payment events",
    type: "boolean",
    defaultValue: "Enabled",
  },
  {
    key: "executionMode",
    name: "Price Feed Execution Protocol",
    category: "SERVER & BRIDGE",
    description: "Market execution order filling protocol",
    type: "select",
    defaultValue: "Market Execution (ECN/STP)",
  },
];

export const BrokerGatewayTab: React.FC = () => {
  const { settings, updateSettings, companyConfig, addToast } = usePortal();
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    serverName: settings.serverName || `${companyConfig.name} Live Server 01`,
    brokerBrand: settings.brokerBrand || companyConfig.brand || companyConfig.name,
    defaultLeverage: settings.defaultLeverage || "1:500",
    marginCall: settings.marginCall ?? 80,
    stopOut: settings.stopOut ?? 50,
    soundAlerts: settings.soundAlerts ?? true,
    autoApproveVerifiedDeposits: settings.autoApproveVerifiedDeposits ?? false,
    executionMode: "Market Execution (ECN/STP)",
  });

  useEffect(() => {
    setFormData({
      serverName: settings.serverName || `${companyConfig.name} Live Server 01`,
      brokerBrand: settings.brokerBrand || companyConfig.brand || companyConfig.name,
      defaultLeverage: settings.defaultLeverage || "1:500",
      marginCall: settings.marginCall ?? 80,
      stopOut: settings.stopOut ?? 50,
      soundAlerts: settings.soundAlerts ?? true,
      autoApproveVerifiedDeposits: settings.autoApproveVerifiedDeposits ?? false,
      executionMode: "Market Execution (ECN/STP)",
    });
  }, [settings, companyConfig]);

  const handleSave = () => {
    updateSettings({
      serverName: formData.serverName,
      brokerBrand: formData.brokerBrand,
      defaultLeverage: formData.defaultLeverage,
      marginCall: Number(formData.marginCall),
      stopOut: Number(formData.stopOut),
      soundAlerts: formData.soundAlerts,
      autoApproveVerifiedDeposits: formData.autoApproveVerifiedDeposits,
    });
    addToast(
      "success",
      "Gateway Updated",
      "Broker risk parameters and MT5 gateway settings saved successfully."
    );
  };

  const handleReset = () => {
    if (window.confirm("Reset all gateway parameters to default broker values?")) {
      setFormData({
        serverName: `${companyConfig.name} Live Server 01`,
        brokerBrand: companyConfig.brand || companyConfig.name,
        defaultLeverage: "1:500",
        marginCall: 80,
        stopOut: 50,
        soundAlerts: true,
        autoApproveVerifiedDeposits: false,
        executionMode: "Market Execution (ECN/STP)",
      });
      addToast("info", "Defaults Restored", "Broker parameters restored to defaults.");
    }
  };

  const filteredParams = PARAM_DEFINITIONS.filter((p) => {
    if (activeCategory !== "ALL" && p.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="space-y-2 animate-fadeIn font-sans select-none flex-1 min-h-0 flex flex-col">
      {/* Top Compact Excel Toolbar matching PaymentsPage */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white border border-slate-300 p-2 rounded-lg shadow-2xs">
        {/* Left: Title + Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 mr-1">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: brandPrimary }}
            />
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
              BROKER & GATEWAY
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {filteredParams.length} parameters
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none hidden sm:inline">|</span>

          {/* Subsystem Filter Pills */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px] overflow-x-auto">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeCategory === "ALL"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All (8)
            </button>

            <button
              onClick={() => setActiveCategory("RISK & MARGIN")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeCategory === "RISK & MARGIN"
                  ? "bg-rose-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Risk & Margin (3)
            </button>

            <button
              onClick={() => setActiveCategory("SERVER & BRIDGE")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeCategory === "SERVER & BRIDGE"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bridge & Server (3)
            </button>

            <button
              onClick={() => setActiveCategory("AUTOMATION")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeCategory === "AUTOMATION"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Automation (2)
            </button>
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-2.5 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Gateway Protocol:</span>
            <strong className="text-emerald-700 font-bold">MT5 Bridge v4.2</strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Latency:</span>
            <strong className="text-slate-800 font-bold">4.2 ms</strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Bridge Status:</span>
            <strong className="text-emerald-700 font-bold">ONLINE</strong>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1 rounded text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
            title="Reset parameters to default"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <button
            onClick={handleSave}
            className="px-3 py-1 rounded text-[10.5px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer"
            style={{ backgroundColor: brandPrimary }}
            title="Save and broadcast parameters"
          >
            <Save className="w-3 h-3" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Main Excel-Style Dense Table Grid Container */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed">
            {/* Excel Table Header */}
            <thead className="sticky top-0 bg-[#e2e8f0] text-slate-800 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-300 z-10 select-none shadow-2xs">
              <tr>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[90px] text-left">
                  KEY ID
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[240px] text-left">
                  PARAMETER NAME & PURPOSE
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[140px] text-center">
                  SUBSYSTEM
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[240px] text-left">
                  CONFIGURED ACTIVE VALUE
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[160px] text-left">
                  DEFAULT REFERENCE
                </th>
                <th className="py-1.5 px-2 text-center w-[110px]">
                  POLICY
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredParams.map((param, index) => {
                const isSelected = selectedKey === param.key;

                const categoryBadgeClass =
                  param.category === "RISK & MARGIN"
                    ? "bg-rose-50 text-rose-800 border-rose-300"
                    : param.category === "SERVER & BRIDGE"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-amber-50 text-amber-800 border-amber-300";

                return (
                  <tr
                    key={param.key}
                    onClick={() => setSelectedKey(param.key)}
                    className={`cursor-pointer transition-colors duration-75 border-b border-slate-200 h-8 ${
                      isSelected
                        ? "bg-amber-100/90 font-bold border-l-4"
                        : index % 2 === 0
                        ? "bg-white hover:bg-slate-100/80"
                        : "bg-[#f8fafc] hover:bg-slate-100"
                    }`}
                    style={{
                      borderLeftColor: isSelected ? brandPrimary : "transparent",
                      backgroundColor: isSelected ? `${brandPrimary}15` : undefined,
                    }}
                  >
                    {/* Key ID */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-800">
                      #{param.key}
                    </td>

                    {/* Parameter Name */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate font-sans">
                      <div className="font-bold text-slate-900 text-[11.5px] truncate">
                        {param.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans truncate">
                        {param.description}
                      </div>
                    </td>

                    {/* Subsystem */}
                    <td className="py-1 px-2.5 border-r border-slate-200 text-center truncate">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-tight border ${categoryBadgeClass}`}
                      >
                        {param.category}
                      </span>
                    </td>

                    {/* Configured Value (In-Cell Excel Editor) */}
                    <td
                      className="py-1 px-2.5 border-r border-slate-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {param.type === "select" && param.key === "defaultLeverage" ? (
                        <select
                          value={formData.defaultLeverage}
                          onChange={(e) =>
                            setFormData({ ...formData, defaultLeverage: e.target.value })
                          }
                          className="w-full bg-white border border-slate-300 focus:border-amber-500 rounded px-2 py-0.5 text-xs font-bold text-slate-800 outline-none shadow-2xs"
                        >
                          <option value="1:100">1:100</option>
                          <option value="1:200">1:200</option>
                          <option value="1:400">1:400</option>
                          <option value="1:500">1:500 (Standard)</option>
                          <option value="1:1000">1:1000 (High Risk)</option>
                        </select>
                      ) : param.type === "select" && param.key === "executionMode" ? (
                        <select
                          value={formData.executionMode}
                          onChange={(e) =>
                            setFormData({ ...formData, executionMode: e.target.value })
                          }
                          className="w-full bg-white border border-slate-300 focus:border-amber-500 rounded px-2 py-0.5 text-xs font-bold text-slate-800 outline-none shadow-2xs"
                        >
                          <option value="Market Execution (ECN/STP)">Market Execution (ECN/STP)</option>
                          <option value="Instant Execution">Instant Execution</option>
                        </select>
                      ) : param.type === "boolean" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                [param.key]: !formData[param.key as keyof typeof formData],
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border transition-all ${
                              formData[param.key as keyof typeof formData]
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-slate-100 text-slate-500 border-slate-300"
                            }`}
                          >
                            {formData[param.key as keyof typeof formData] ? "ENABLED" : "DISABLED"}
                          </button>
                        </div>
                      ) : (
                        <input
                          type={param.type === "number" ? "number" : "text"}
                          value={String(formData[param.key as keyof typeof formData])}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [param.key]:
                                param.type === "number" ? Number(e.target.value) : e.target.value,
                            })
                          }
                          className="w-full bg-white border border-slate-300 focus:border-amber-500 rounded px-2 py-0.5 text-xs font-mono font-bold text-slate-900 outline-none shadow-2xs"
                        />
                      )}
                    </td>

                    {/* Default Reference */}
                    <td className="py-1 px-2.5 border-r border-slate-200 truncate font-mono text-slate-500 text-[10.5px]">
                      {param.defaultValue}
                    </td>

                    {/* Policy */}
                    <td className="py-1 px-2 text-center">
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ENFORCED
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Excel Bottom Status Strip */}
        <div className="px-3 py-1 bg-[#f1f5f9] border-t border-slate-300 flex flex-wrap items-center justify-between text-[10.5px] text-slate-600 font-mono shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Excel Grid View
            </span>
            <span>•</span>
            <span>
              Showing {filteredParams.length} of 8 system parameters
            </span>
            {selectedKey && (
              <>
                <span>•</span>
                <span className="text-slate-800 font-bold">
                  Editing: #{selectedKey}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-sans">
              Values apply instantly across gateway instances
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">
              Protected Master Rules
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
