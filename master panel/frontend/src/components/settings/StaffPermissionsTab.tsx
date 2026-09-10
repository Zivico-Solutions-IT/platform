import React, { useState, useMemo, useEffect } from "react";
import { usePortal } from "../../context/PortalContext";
import { StaffMember } from "../../types";
import {
  Shield,
  Users,
  Search,
  Plus,
  Save,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  UserCheck,
} from "lucide-react";

// The 4 permission categories strictly mapped to our portal's actual menus
export interface PermissionSection {
  title: string;
  key: "workspace" | "trading" | "financial" | "settings";
  items: { id: string; label: string; menuName: string }[];
}

export const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    title: "Workspace Access",
    key: "workspace",
    items: [
      { id: "dashboard", label: "Dashboard", menuName: "Dashboard Overview" },
      { id: "markets", label: "Markets", menuName: "Market Watch" },
      { id: "clients", label: "Clients", menuName: "Clients Directory" },
      { id: "verification", label: "Verification", menuName: "KYC Verification" },
    ],
  },
  {
    title: "Trading Operations",
    key: "trading",
    items: [
      { id: "trading_open", label: "Live Open Trades", menuName: "Open Trades" },
      { id: "trading_history", label: "Closed Orders History", menuName: "Trading History" },
      { id: "symbol_settings", label: "Symbol Settings", menuName: "Symbol Settings" },
    ],
  },
  {
    title: "Financial Operations",
    key: "financial",
    items: [
      { id: "payments", label: "Payments", menuName: "Deposits & Withdrawals" },
      { id: "deposit_methods", label: "Deposit Addresses", menuName: "Deposit Method Addresses" },
      { id: "referral_rewards", label: "Referral Rewards", menuName: "Referral Rewards" },
    ],
  },
  {
    title: "Settings & Administration",
    key: "settings",
    items: [
      { id: "assign_users", label: "Assign Users", menuName: "Assign Users to Agents" },
      { id: "referral_code", label: "Referral Code", menuName: "Referral Code" },
      { id: "staff_permissions", label: "Staff & Permissions", menuName: "Staff & Permissions" },
      { id: "broker_gateway", label: "Broker & Gateway", menuName: "Broker & Gateway Settings" },
    ],
  },
];

const ALL_PERMISSION_IDS = PERMISSION_SECTIONS.flatMap((s) => s.items.map((i) => i.id));

// Default role permissions templates strictly using our portal's menus
const DEFAULT_ROLE_TEMPLATES: Record<string, string[]> = {
  Manager: [
    "dashboard",
    "markets",
    "clients",
    "verification",
    "trading_open",
    "trading_history",
    "symbol_settings",
    "payments",
    "deposit_methods",
    "referral_rewards",
    "assign_users",
    "referral_code",
    "staff_permissions",
    "broker_gateway",
  ],
  Agent: [
    "dashboard",
    "markets",
    "clients",
    "verification",
    "trading_open",
    "trading_history",
    "payments",
    "deposit_methods",
    "referral_rewards",
    "assign_users",
  ],
};

// Initial default staff members matching Image 3 with our portal's permissions
const DEFAULT_STAFF: StaffMember[] = [
  {
    id: "staff-1",
    name: "dinith",
    email: "dinith@gmail.com",
    phone: "+94773508025",
    role: "AGENT",
    permissions: [
      "dashboard",
      "markets",
      "clients",
      "verification",
      "trading_open",
      "trading_history",
      "payments",
      "deposit_methods",
      "referral_rewards",
      "assign_users",
    ],
    joinedDate: "Aug 1, 2026, 9:40 AM",
  },
  {
    id: "staff-2",
    name: "Shiva",
    email: "n1@gmail.com",
    phone: "+94774582214",
    role: "MANAGER",
    permissions: [
      "dashboard",
      "markets",
      "clients",
      "verification",
      "trading_open",
      "trading_history",
      "symbol_settings",
      "payments",
      "deposit_methods",
      "referral_rewards",
      "assign_users",
      "referral_code",
      "staff_permissions",
      "broker_gateway",
    ],
    joinedDate: "Jul 30, 2026, 2:04 PM",
  },
];

export const StaffPermissionsTab: React.FC = () => {
  const { companyConfig, addToast } = usePortal();
  const brandPrimary = companyConfig?.primaryColor || "#D97706";

  // Sub-view toggle: 'roles' (Role Permissions) vs 'users' (User Permissions)
  const [activeSubView, setActiveSubView] = useState<"roles" | "users">("roles");

  // Selected role template category: 'Manager' vs 'Agent'
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<"Manager" | "Agent">("Manager");

  // Expanded permissions dropdown row in User Permissions table
  const [expandedStaffRowId, setExpandedStaffRowId] = useState<string | null>(null);

  // Role templates stored in state & localStorage
  const [roleTemplates, setRoleTemplates] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("nova_role_templates_v2");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ROLE_TEMPLATES;
  });

  // Staff members list stored in state & localStorage
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem("nova_staff_list_v2");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STAFF;
  });

  useEffect(() => {
    try {
      localStorage.setItem("nova_role_templates_v2", JSON.stringify(roleTemplates));
    } catch (e) {
      console.error(e);
    }
  }, [roleTemplates]);

  useEffect(() => {
    try {
      localStorage.setItem("nova_staff_list_v2", JSON.stringify(staffList));
    } catch (e) {
      console.error(e);
    }
  }, [staffList]);

  // Counts
  const managerCount = staffList.filter((s) => s.role === "MANAGER").length;
  const agentCount = staffList.filter((s) => s.role === "AGENT").length;

  // Search & Filter in User Permissions
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "OLDEST" | "NAME">("NEWEST");

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    let list = staffList.filter((s) => {
      if (staffSearchQuery.trim()) {
        const q = staffSearchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.role.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortOrder === "NAME") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "OLDEST") {
      list.reverse();
    }
    return list;
  }, [staffList, staffSearchQuery, sortOrder]);

  // Modal State for Create / Edit Staff
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "AGENT" as "MANAGER" | "AGENT",
    permissions: [] as string[],
  });

  // Open modal to create staff
  const handleOpenCreateStaff = () => {
    setEditingStaffId(null);
    setModalForm({
      name: "",
      email: "",
      phone: "",
      role: selectedRoleCategory === "Manager" ? "MANAGER" : "AGENT",
      permissions: roleTemplates[selectedRoleCategory] || [],
    });
    setIsModalOpen(true);
  };

  // Open modal to edit staff
  const handleOpenEditStaff = (staff: StaffMember) => {
    setEditingStaffId(staff.id);
    setModalForm({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      permissions: staff.permissions,
    });
    setIsModalOpen(true);
  };

  // Delete staff
  const handleDeleteStaff = (id: string) => {
    const staff = staffList.find((s) => s.id === id);
    if (!staff) return;
    if (window.confirm(`Are you sure you want to delete staff member "${staff.name}"?`)) {
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      addToast("info", "Staff Removed", `Staff member "${staff.name}" has been removed.`);
    }
  };

  // Submit modal form
  const handleSaveStaffModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.name.trim() || !modalForm.email.trim()) {
      addToast("error", "Missing Details", "Please enter a valid name and email.");
      return;
    }

    if (editingStaffId) {
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === editingStaffId
            ? {
                ...s,
                name: modalForm.name.trim(),
                email: modalForm.email.trim(),
                phone: modalForm.phone.trim(),
                role: modalForm.role,
                permissions: modalForm.permissions,
              }
            : s
        )
      );
      addToast("success", "Staff Updated", `Updated details for ${modalForm.name}.`);
    } else {
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}`,
        name: modalForm.name.trim(),
        email: modalForm.email.trim(),
        phone: modalForm.phone.trim() || "+94770000000",
        role: modalForm.role,
        permissions: modalForm.permissions,
        joinedDate: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
        }),
      };
      setStaffList((prev) => [newStaff, ...prev]);
      addToast("success", "Staff Created", `New staff member ${newStaff.name} added successfully!`);
    }

    setIsModalOpen(false);
  };

  // Role Template Permission Toggle
  const currentRolePermissions = roleTemplates[selectedRoleCategory] || [];

  const handleTogglePermission = (id: string) => {
    const current = [...currentRolePermissions];
    const updated = current.includes(id) ? current.filter((p) => p !== id) : [...current, id];
    setRoleTemplates((prev) => ({ ...prev, [selectedRoleCategory]: updated }));
  };

  const handleToggleSection = (section: PermissionSection) => {
    const sectionIds = section.items.map((i) => i.id);
    const allSelected = sectionIds.every((id) => currentRolePermissions.includes(id));

    let updated: string[];
    if (allSelected) {
      updated = currentRolePermissions.filter((id) => !sectionIds.includes(id));
    } else {
      updated = Array.from(new Set([...currentRolePermissions, ...sectionIds]));
    }
    setRoleTemplates((prev) => ({ ...prev, [selectedRoleCategory]: updated }));
  };

  const handleSaveRoleTemplate = () => {
    addToast(
      "success",
      "Template Saved",
      `Permission template for "${selectedRoleCategory}" saved! (${currentRolePermissions.length} of ${ALL_PERMISSION_IDS.length} portal menus authorized).`
    );
  };

  const getPermissionName = (id: string) => {
    for (const section of PERMISSION_SECTIONS) {
      const item = section.items.find((i) => i.id === id);
      if (item) return item.label;
    }
    return id;
  };

  return (
    <div className="space-y-2 animate-fadeIn font-sans select-none flex-1 min-h-0 flex flex-col">
      {/* Top Compact Excel Toolbar matching PaymentsPage */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white border border-slate-300 p-2 rounded-lg shadow-2xs">
        {/* Left: Title + Sub-View Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 mr-1">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: brandPrimary }}
            />
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-900 font-mono">
              STAFF & PERMISSIONS
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {activeSubView === "users" ? `${filteredStaff.length} records` : `${ALL_PERMISSION_IDS.length} portal menus`}
            </span>
          </div>

          <span className="text-slate-300 font-mono select-none hidden sm:inline">|</span>

          {/* Sub-Tabs Pills */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 text-[11px] overflow-x-auto">
            <button
              onClick={() => setActiveSubView("users")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeSubView === "users"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              User Permissions ({staffList.length})
            </button>

            <button
              onClick={() => setActiveSubView("roles")}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all whitespace-nowrap ${
                activeSubView === "roles"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Role Templates (2)
            </button>
          </div>
        </div>

        {/* Center: Inline Excel Formula / Stats Bar */}
        <div className="hidden xl:flex items-center gap-2.5 text-[11px] font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded-md">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Managers:</span>
            <strong className="text-emerald-700 font-bold">{managerCount}</strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Agents:</span>
            <strong className="text-amber-700 font-bold">{agentCount}</strong>
          </div>
          <span className="text-slate-300 select-none">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-sans text-[10.5px]">Portal Modules:</span>
            <strong className="text-slate-800 font-bold">{ALL_PERMISSION_IDS.length} Menus</strong>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {activeSubView === "users" ? (
            <>
              <button
                onClick={handleOpenCreateStaff}
                className="px-2.5 py-1 rounded text-[10.5px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer"
                style={{ backgroundColor: brandPrimary }}
              >
                <Plus className="w-3 h-3" />
                <span>+ Create Staff</span>
              </button>

              <div className="relative w-48 sm:w-56">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  placeholder="Search staff..."
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-md pl-7 pr-6 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs font-mono transition-all"
                />
              </div>
            </>
          ) : (
            <button
              onClick={handleSaveRoleTemplate}
              className="px-3 py-1 rounded text-[10.5px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: brandPrimary }}
            >
              <Save className="w-3 h-3" />
              <span>Save Template</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ROLE PERMISSIONS VIEW                                                  */}
      {/* ========================================================================= */}
      {activeSubView === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2.5 flex-1 min-h-0 animate-fadeIn">
          {/* Left Column: Role Categories Card */}
          <div className="lg:col-span-1 bg-white border border-slate-300 rounded-lg p-3 shadow-2xs space-y-2.5 h-fit">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                ROLE TEMPLATES
              </h3>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Select role to configure portal module permissions.
              </p>
            </div>

            <div className="space-y-1.5">
              {/* Manager Role Card */}
              <button
                type="button"
                onClick={() => setSelectedRoleCategory("Manager")}
                className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                  selectedRoleCategory === "Manager"
                    ? "bg-amber-50/70 border-amber-400 ring-1 ring-amber-500/20 shadow-2xs"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs font-black text-slate-900 font-sans flex items-center justify-between">
                  <span>Manager</span>
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono bg-emerald-100 text-emerald-800">
                    ALL MENUS
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                  {roleTemplates["Manager"]?.length || 0} of {ALL_PERMISSION_IDS.length} portal modules authorized
                </div>
              </button>

              {/* Agent Role Card */}
              <button
                type="button"
                onClick={() => setSelectedRoleCategory("Agent")}
                className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                  selectedRoleCategory === "Agent"
                    ? "bg-amber-50/70 border-amber-400 ring-1 ring-amber-500/20 shadow-2xs"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs font-black text-slate-900 font-sans flex items-center justify-between">
                  <span>Agent</span>
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono bg-amber-100 text-amber-800">
                    OPERATIONS
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                  {roleTemplates["Agent"]?.length || 0} of {ALL_PERMISSION_IDS.length} portal modules authorized
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateStaff}
              className="w-full py-1.5 px-3 rounded-md text-xs font-bold text-white shadow-2xs transition-all flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: brandPrimary }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add {selectedRoleCategory}</span>
            </button>
          </div>

          {/* Right Column: Permission Matrix Grid strictly using our Portal Menus */}
          <div className="lg:col-span-3 bg-white border border-slate-300 rounded-lg p-3 shadow-2xs space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">
                  {selectedRoleCategory} Module Permissions ({currentRolePermissions.length} / {ALL_PERMISSION_IDS.length})
                </h2>
                <p className="text-[10.5px] text-slate-500 mt-0.5 font-sans">
                  Defaults automatically assigned when adding new {selectedRoleCategory.toLowerCase()} accounts.
                </p>
              </div>

              <button
                onClick={handleSaveRoleTemplate}
                className="px-3 py-1 rounded text-[10.5px] font-bold text-white shadow-2xs transition-all flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer"
                style={{ backgroundColor: brandPrimary }}
              >
                <Save className="w-3 h-3" />
                <span>Save Template</span>
              </button>
            </div>

            {/* 4 Permission Categories Grid using ONLY our portal's active pages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {PERMISSION_SECTIONS.map((section) => {
                const sectionIds = section.items.map((i) => i.id);
                const isAllSelected = sectionIds.every((id) =>
                  currentRolePermissions.includes(id)
                );

                return (
                  <div
                    key={section.key}
                    className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-slate-50/50"
                  >
                    {/* Section Header with Select all button */}
                    <div className="flex items-center justify-between select-none border-b border-slate-200 pb-1">
                      <span className="text-[11px] font-black uppercase text-slate-800 tracking-wide font-mono">
                        {section.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSection(section)}
                        className="text-[10px] font-bold text-amber-800 hover:text-amber-900 cursor-pointer font-sans"
                      >
                        {isAllSelected ? "Deselect all" : "Select all"}
                      </button>
                    </div>

                    {/* Section Checkbox Items strictly matching our portal menus */}
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const isChecked = currentRolePermissions.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex items-center justify-between p-1.5 rounded border transition-all cursor-pointer select-none text-xs ${
                              isChecked
                                ? "bg-white border-amber-300 shadow-2xs"
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(item.id)}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="font-bold text-slate-800 font-sans text-[11.5px]">
                                {item.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.menuName}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. USER PERMISSIONS VIEW (Dense Excel Table Grid)                         */}
      {/* ========================================================================= */}
      {activeSubView === "users" && (
        <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse table-fixed">
              {/* Excel Table Header */}
              <thead className="sticky top-0 bg-[#e2e8f0] text-slate-800 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-300 z-10 select-none shadow-2xs">
                <tr>
                  <th className="py-1.5 px-2.5 border-r border-slate-300 w-[220px] text-left">
                    STAFF MEMBER
                  </th>
                  <th className="py-1.5 px-2.5 border-r border-slate-300 w-[110px] text-center">
                    ROLE
                  </th>
                  <th className="py-1.5 px-2.5 border-r border-slate-300 w-[150px] text-left">
                    PHONE NUMBER
                  </th>
                  <th className="py-1.5 px-2.5 border-r border-slate-300 w-[180px] text-left">
                    PERMISSIONS
                  </th>
                  <th className="py-1.5 px-2.5 border-r border-slate-300 w-[160px] text-left">
                    JOINED DATE
                  </th>
                  <th className="py-1.5 px-2 text-center w-[110px]">
                    ACTIONS
                  </th>
                </tr>
              </thead>

                {/* Body */}
                <tbody className="divide-y divide-slate-200 text-[11.5px]">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-sans text-xs">
                        No staff members found matching search.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff, index) => {
                      const isExpanded = expandedStaffRowId === staff.id;

                      return (
                        <React.Fragment key={staff.id}>
                          <tr
                            className={`h-8 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                            } hover:bg-slate-100`}
                          >
                            {/* STAFF MEMBER */}
                            <td className="py-2 px-3 border-r border-slate-200">
                              <div className="font-black text-slate-900 font-sans text-xs">
                                {staff.name}
                              </div>
                              <div className="text-[10.5px] text-slate-500 font-mono truncate">
                                {staff.email}
                              </div>
                            </td>

                            {/* ROLE */}
                            <td className="py-2 px-3 border-r border-slate-200">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-sans uppercase tracking-wider ${
                                  staff.role === "MANAGER"
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                    : "bg-amber-50 text-amber-800 border border-amber-300"
                                }`}
                              >
                                {staff.role}
                              </span>
                            </td>

                            {/* PHONE NUMBER */}
                            <td className="py-2 px-3 border-r border-slate-200 font-mono text-slate-700 text-xs">
                              {staff.phone}
                            </td>

                            {/* PERMISSIONS (Clickable dropdown badge) */}
                            <td className="py-2 px-3 border-r border-slate-200 font-sans">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedStaffRowId(isExpanded ? null : staff.id)
                                }
                                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="Click to view assigned portal permissions"
                              >
                                <span>{staff.permissions.length} Permissions</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-2.5 h-2.5 text-slate-500" />
                                ) : (
                                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                                )}
                              </button>
                            </td>

                            {/* JOINED DATE */}
                            <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-600 text-xs">
                              {staff.joinedDate}
                            </td>

                            {/* ACTIONS: Edit & Delete matching Image 3 icons */}
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditStaff(staff)}
                                  className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                  title="Edit Staff"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStaff(staff.id)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete Staff"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded row showing active portal permissions */}
                          {isExpanded && (
                            <tr className="bg-amber-50/40 border-b border-amber-200">
                              <td colSpan={6} className="p-3">
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-bold text-amber-950 font-sans">
                                    Authorized Portal Menus for {staff.name} ({staff.role}):
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {staff.permissions.map((pId) => (
                                      <span
                                        key={pId}
                                        className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-white border border-amber-300 text-amber-900 font-bold shadow-2xs"
                                      >
                                        ✓ {getPermissionName(pId)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
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
                  Showing {filteredStaff.length} of {staffList.length} staff accounts ({managerCount} managers, {agentCount} agents)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-sans">
                  Click permissions badge to inspect authorized portal menus
                </span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">
                  Active Directory
                </span>
              </div>
            </div>
          </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT STAFF MEMBER                                         */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden font-sans">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-900 font-sans">
                {editingStaffId ? "Edit Staff Member" : "Create New Staff Member"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffModal} className="p-4 space-y-3.5 max-h-[85vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  placeholder="e.g. dinith"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={modalForm.email}
                    onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
                    placeholder="dinith@gmail.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={modalForm.phone}
                    onChange={(e) => setModalForm({ ...modalForm, phone: e.target.value })}
                    placeholder="+94773508025"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Role Assignment
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setModalForm({
                        ...modalForm,
                        role: "AGENT",
                        permissions: roleTemplates["Agent"] || [],
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      modalForm.role === "AGENT"
                        ? "bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    Agent
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setModalForm({
                        ...modalForm,
                        role: "MANAGER",
                        permissions: roleTemplates["Manager"] || [],
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      modalForm.role === "MANAGER"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    Manager
                  </button>
                </div>
              </div>

              {/* Portal Permissions Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Authorized Portal Menus ({modalForm.permissions.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const all = ALL_PERMISSION_IDS;
                      const hasAll = all.every((id) => modalForm.permissions.includes(id));
                      setModalForm({
                        ...modalForm,
                        permissions: hasAll ? [] : all,
                      });
                    }}
                    className="text-[10.5px] font-bold text-amber-800 hover:text-amber-900 cursor-pointer"
                  >
                    {ALL_PERMISSION_IDS.every((id) => modalForm.permissions.includes(id))
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 max-h-48 overflow-y-auto space-y-2">
                  {PERMISSION_SECTIONS.map((sec) => (
                    <div key={sec.key} className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {sec.title}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {sec.items.map((item) => {
                          const checked = modalForm.permissions.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 text-xs cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const current = modalForm.permissions;
                                  const updated = checked
                                    ? current.filter((id) => id !== item.id)
                                    : [...current, item.id];
                                  setModalForm({ ...modalForm, permissions: updated });
                                }}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="font-semibold text-slate-800 truncate">
                                {item.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all hover:brightness-105 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: brandPrimary }}
                >
                  {editingStaffId ? "Save Changes" : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
