import React, { useState, useMemo, useEffect } from "react";
import { usePortal } from "../../context/PortalContext";
import { AgentOption, UserAgentAssignment } from "../../types";
import {
  UserCheck,
  UserX,
  Search,
  Check,
  Users,
} from "lucide-react";

const DEFAULT_AGENTS: AgentOption[] = [
  { id: "agt-1", name: "Alex Morgan", role: "Senior Account Manager", email: "alex.m@novafxm.com" },
  { id: "agt-2", name: "Sarah Jenkins", role: "VIP Desk Specialist", email: "sarah.j@novafxm.com" },
  { id: "agt-3", name: "Michael Chang", role: "APAC Desk Lead", email: "michael.c@novafxm.com" },
  { id: "agt-4", name: "David Silva", role: "Institutional Operations", email: "david.s@novafxm.com" },
  { id: "agt-5", name: "Elena Rostova", role: "Client Relations Manager", email: "elena.r@novafxm.com" },
  { id: "mgr-1", name: "Master Admin Root", role: "Executive Manager", email: "admin@novafxm.com" },
];

export const AssignUsersTab: React.FC = () => {
  const { clients, companyConfig, addToast, setSelectedClient } = usePortal();
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  // Persistent assignments state in localStorage
  const [assignments, setAssignments] = useState<Record<number, UserAgentAssignment>>(() => {
    try {
      const saved = localStorage.getItem("nova_user_agent_assignments_v2");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default initial mock assignments for live accounts
    return {
      1000001: {
        login: 1000001,
        agentId: "agt-1",
        agentName: "Alex Morgan",
        assignedBy: "Admin Root",
        assignedAt: "9/9/2026",
      },
      1000004: {
        login: 1000004,
        agentId: "agt-2",
        agentName: "Sarah Jenkins",
        assignedBy: "Admin Root",
        assignedAt: "9/7/2026",
      },
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem("nova_user_agent_assignments_v2", JSON.stringify(assignments));
    } catch (e) {
      console.error(e);
    }
  }, [assignments]);

  // Selected agent from top dropdown
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // Checkbox selection of client logins
  const [selectedLogins, setSelectedLogins] = useState<number[]>([]);

  // Search and scope filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "UNASSIGNED" | "ASSIGNED">("ALL");

  // Helper to determine if an account is strictly a Live account
  const isLiveClient = (c: { accountType?: string; login: number; group?: string }) => {
    if (c.accountType) {
      return c.accountType.toLowerCase() === "live";
    }
    if (c.group && c.group.toLowerCase().includes("demo")) return false;
    return c.login >= 1000000;
  };

  // All live clients
  const liveClients = useMemo(() => {
    return clients.filter(isLiveClient);
  }, [clients]);

  // Live clients stats
  const totalLive = liveClients.length;
  const assignedCount = useMemo(() => {
    return liveClients.filter((c) => !!assignments[c.login]).length;
  }, [liveClients, assignments]);
  const unassignedCount = totalLive - assignedCount;

  // Filtered client list: STRICTLY LIVE ACCOUNTS ONLY (NO DEMO)
  const filteredClients = useMemo(() => {
    return liveClients.filter((c) => {
      const isAssigned = !!assignments[c.login];
      if (scopeFilter === "UNASSIGNED" && isAssigned) return false;
      if (scopeFilter === "ASSIGNED" && !isAssigned) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesEmail = c.email.toLowerCase().includes(q);
        const matchesLogin = c.login.toString().includes(q);
        const currentAgent = assignments[c.login]?.agentName.toLowerCase() || "";
        const matchesAgent = currentAgent.includes(q);
        return matchesName || matchesEmail || matchesLogin || matchesAgent;
      }
      return true;
    });
  }, [liveClients, assignments, scopeFilter, searchQuery]);

  // Handle master select all checkbox
  const isAllSelected =
    filteredClients.length > 0 &&
    filteredClients.every((c) => selectedLogins.includes(c.login));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLogins((prev) =>
        prev.filter((id) => !filteredClients.some((c) => c.login === id))
      );
    } else {
      const idsToAdd = filteredClients.map((c) => c.login);
      setSelectedLogins((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    }
  };

  const handleToggleRow = (login: number) => {
    setSelectedLogins((prev) =>
      prev.includes(login) ? prev.filter((id) => id !== login) : [...prev, login]
    );
  };

  // Assign action
  const handleAssign = () => {
    if (!selectedAgentId) {
      addToast("error", "Selection Missing", "Please select an Agent or Manager from the dropdown first.");
      return;
    }
    if (selectedLogins.length === 0) {
      addToast("error", "No Users Selected", "Please select at least one user from the list below.");
      return;
    }

    const agent = DEFAULT_AGENTS.find((a) => a.id === selectedAgentId);
    if (!agent) return;

    const todayStr = new Date().toLocaleDateString("en-US");
    const updated = { ...assignments };

    selectedLogins.forEach((login) => {
      updated[login] = {
        login,
        agentId: agent.id,
        agentName: agent.name,
        assignedBy: "Master Admin Root",
        assignedAt: todayStr,
      };
    });

    setAssignments(updated);
    addToast(
      "success",
      "Users Assigned",
      `Successfully assigned ${selectedLogins.length} live user(s) to ${agent.name} (${agent.role}).`
    );
    setSelectedLogins([]);
  };

  // Unassign action
  const handleUnassign = () => {
    if (selectedLogins.length === 0) {
      addToast("error", "No Users Selected", "Please select users to unassign.");
      return;
    }

    const updated = { ...assignments };
    let unassigned = 0;

    selectedLogins.forEach((login) => {
      if (updated[login]) {
        delete updated[login];
        unassigned++;
      }
    });

    setAssignments(updated);
    addToast(
      "info",
      "Users Unassigned",
      `Unassigned ${unassigned} user(s) from their respective agents.`
    );
    setSelectedLogins([]);
  };

  return (
    <div className="space-y-2 animate-fadeIn font-sans select-none flex-1 min-h-0 flex flex-col">
      {/* Top Compact Excel Toolbar matching PaymentsPage */}
      <div className="flex flex-col gap-2 shrink-0 bg-white border border-slate-300 p-2 rounded-lg shadow-2xs">
        {/* Row 1: Title + Filter Pills + Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Title + Scope Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 mr-1">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: brandPrimary }}
              />
              <h1 className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
                ASSIGN USERS
              </h1>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                {filteredClients.length} records
              </span>
            </div>

            <span className="text-slate-300 font-mono select-none hidden sm:inline">|</span>

            {/* Scope Filter Pills */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px] overflow-x-auto">
              <button
                onClick={() => setScopeFilter("ALL")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                  scopeFilter === "ALL"
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Live ({totalLive})
              </button>

              <button
                onClick={() => setScopeFilter("UNASSIGNED")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                  scopeFilter === "UNASSIGNED"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Unassigned ({unassignedCount})
              </button>

              <button
                onClick={() => setScopeFilter("ASSIGNED")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                  scopeFilter === "ASSIGNED"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Assigned ({assignedCount})
              </button>
            </div>
          </div>

          {/* Right: Inline Excel Formula / Stats Bar */}
          <div className="hidden xl:flex items-center gap-2.5 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-sans text-[10.5px]">Total Live:</span>
              <strong className="text-slate-800 font-bold">{totalLive}</strong>
            </div>
            <span className="text-slate-300 select-none">|</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-sans text-[10.5px]">Assigned:</span>
              <strong className="text-emerald-700 font-bold">{assignedCount}</strong>
            </div>
            <span className="text-slate-300 select-none">|</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-sans text-[10.5px]">Unassigned:</span>
              <strong className="text-amber-700 font-bold">{unassignedCount}</strong>
            </div>
          </div>
        </div>

        {/* Row 2: Action Controls & Search */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1.5 border-t border-slate-200">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[300px]">
            {/* Agent Selector Dropdown */}
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="bg-slate-50 hover:bg-white border border-slate-300 focus:border-amber-500 focus:bg-white rounded-md px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none transition-all shadow-2xs cursor-pointer max-w-xs"
            >
              <option value="">Select Agent or Manager...</option>
              {DEFAULT_AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} — {agent.role}
                </option>
              ))}
            </select>

            {/* Assign Button */}
            <button
              onClick={handleAssign}
              className="px-2.5 py-1 rounded text-[10.5px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: brandPrimary }}
              title="Assign selected live users to the chosen agent"
            >
              <UserCheck className="w-3 h-3" />
              <span>Assign</span>
            </button>

            {/* Unassign Button */}
            <button
              onClick={handleUnassign}
              className="px-2.5 py-1 rounded text-[10.5px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Remove agent assignment from selected users"
            >
              <UserX className="w-3 h-3 text-slate-500" />
              <span>Unassign</span>
            </button>

            {selectedLogins.length > 0 && (
              <span className="text-[10.5px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                {selectedLogins.length} selected
              </span>
            )}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, name, email..."
                className="w-full bg-[#f8fafc] border border-slate-300 rounded-md pl-7 pr-6 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs font-mono transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Excel-Style Dense Table Grid Container */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed">
            {/* Excel Table Header */}
            <thead className="sticky top-0 bg-[#e2e8f0] text-slate-800 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-300 z-10 select-none shadow-2xs">
              <tr>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[45px] text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[95px] text-left">
                  ID
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[240px] text-left">
                  USER NAME & EMAIL
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[180px] text-left">
                  CURRENT AGENT
                </th>
                <th className="py-1.5 px-2.5 border-r border-slate-300 w-[160px] text-left">
                  ASSIGNED BY
                </th>
                <th className="py-1.5 px-2.5 text-left w-[120px]">
                  JOINED
                </th>
              </tr>
            </thead>

            {/* Dense Excel Rows */}
            <tbody className="font-mono text-[11px] leading-tight select-none">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans text-xs">
                    No live accounts found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, index) => {
                  const assignment = assignments[client.login];
                  const isChecked = selectedLogins.includes(client.login);

                  return (
                    <tr
                      key={client.login}
                      onClick={() => handleToggleRow(client.login)}
                      className={`cursor-pointer transition-colors duration-75 border-b border-slate-200 h-7.5 ${
                        isChecked
                          ? "bg-amber-100/90 font-bold border-l-4"
                          : index % 2 === 0
                          ? "bg-white hover:bg-slate-100/80"
                          : "bg-[#f8fafc] hover:bg-slate-100"
                      }`}
                      style={{
                        borderLeftColor: isChecked ? brandPrimary : "transparent",
                        backgroundColor: isChecked ? `${brandPrimary}15` : undefined,
                      }}
                      title="Click to select row"
                    >
                      {/* Checkbox */}
                      <td
                        className="py-1 px-2.5 border-r border-slate-200 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(client.login)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {/* ID */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-bold text-slate-900">
                        #{client.login}
                      </td>

                      {/* User Name & Email */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-sans">
                        <div className="font-bold text-slate-900 truncate">
                          {client.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {client.email}
                        </div>
                      </td>

                      {/* Current Agent */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-sans">
                        {assignment ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-bold text-slate-900 truncate">
                              {assignment.agentName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10.5px]">-</span>
                        )}
                      </td>

                      {/* Assigned By */}
                      <td className="py-1 px-2.5 border-r border-slate-200 truncate font-sans text-slate-600">
                        {assignment ? assignment.assignedBy : "-"}
                      </td>

                      {/* Joined Date */}
                      <td className="py-1 px-2.5 truncate font-mono text-slate-600">
                        {client.registeredAt || "2026-07-30"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Excel Bottom Status Strip matching PaymentsPage */}
        <div className="px-3 py-1 bg-[#f1f5f9] border-t border-slate-300 flex flex-wrap items-center justify-between text-[10.5px] text-slate-600 font-mono shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Excel Grid View
            </span>
            <span>•</span>
            <span>
              Showing {filteredClients.length} of {totalLive} live accounts
            </span>
            {selectedLogins.length > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-800 font-bold">
                  Selected: {selectedLogins.length} accounts
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-sans">
              Click any row to toggle selection
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">
              Live Accounts Only
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
