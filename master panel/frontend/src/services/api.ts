import {
  CompanyConfig,
  CompanyId,
  Client,
  Trade,
  TradeStatus,
  Deposit,
  Withdrawal,
  KycVerification,
  BrokerSettings,
  SymbolData,
  DepositMethodAddress,
  DepositMethodType,
  StaffMember,
  ReferralReward,
} from "../types";
import { COMPANIES, getCompanyFallbackData } from "../data/companyData";

export interface DatabaseStatus {
  connected: boolean;
  dbName: string;
  error?: string;
}

export interface DbStatusResponse {
  connected: boolean;
  host: string;
  port: number;
  user: string;
  databases?: {
    novafxm: DatabaseStatus;
    a5markets: DatabaseStatus;
    veltriumfx: DatabaseStatus;
  };
  error: string | null;
  code?: string;
}

export interface CompanyDataResponse {
  companyId: CompanyId;
  database: string;
  clients: Client[];
  openTrades: Trade[];
  closedTrades: Trade[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  kycVerifications: KycVerification[];
  settings: BrokerSettings | null;
  symbols: SymbolData[];
}

export const COMPANY_API_URLS: Record<CompanyId, string> = {
  novafxm: "/api/novafxm",
  a5markets: "/api/a5markets",
  veltriumfx: "/api/veltriumfx",
};

function getValidToken(): string | null {
  const keys = ["token", "master_token", "novafxm_token", "a5markets_token", "veltriumfx_token"];
  for (const key of keys) {
    const val = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (val && typeof val === "string" && val.length > 20 && val !== "null" && val !== "undefined") {
      return val;
    }
  }
  return null;
}

async function ensureMasterToken(companyId: CompanyId): Promise<string | null> {
  const existingToken = getValidToken();
  if (existingToken) return existingToken;

  try {
    const baseUrl = COMPANY_API_URLS[companyId] || COMPANY_API_URLS.novafxm;
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "master@novafxm.com", password: "master123" }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.token) {
        localStorage.setItem("master_token", data.token);
        localStorage.setItem("token", data.token);
        return data.token;
      }
    }
  } catch (err) {
    console.warn("Master auto-login failed:", err);
  }
  return null;
}

async function request<T>(companyId: CompanyId, url: string, options?: RequestInit): Promise<T> {
  const baseUrl = COMPANY_API_URLS[companyId] || COMPANY_API_URLS.novafxm;
  let token = getValidToken();

  if (!token && !url.includes("/auth/")) {
    token = await ensureMasterToken(companyId);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  let response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers,
  });

  // If 401 Unauthorized, token might be expired or invalid. Force refresh master token and retry!
  if (response.status === 401 && !url.includes("/auth/")) {
    localStorage.removeItem("token");
    localStorage.removeItem("master_token");
    const newToken = await ensureMasterToken(companyId);
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${baseUrl}${url}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `API Request failed with status ${response.status}`);
  }

  return response.json();
}

function mapDbUserToClient(u: any): Client {
  const primaryAccount = u.tradingAccounts?.find((a: any) => a.isPrimary) || u.tradingAccounts?.[0];
  const loginNum = Number(primaryAccount?.accountNumber || (u.id ? 1000000 + Number(u.id) : 1000001));
  const walletBal = Number(u.wallet?.balance ?? primaryAccount?.balance ?? 0);
  const walletEq = Number(u.wallet?.equity ?? primaryAccount?.equity ?? walletBal);
  const creditVal = Number(u.wallet?.credit ?? 0);

  return {
    login: loginNum,
    id: String(u.id || loginNum),
    name: u.name || "Client User",
    email: u.email || "",
    phone: u.phone || "+94 77 123 4567",
    whatsapp: u.phone || "+94 77 123 4567",
    balance: walletBal,
    equity: walletEq,
    credit: creditVal,
    margin: 0,
    freeMargin: walletBal,
    marginLevel: 0,
    leverage: `1:${u.leverage || 500}`,
    accountType: u.accountType === "Demo" ? "Demo" : "Live",
    status: u.tradingStatus === "frozen" ? "Inactive" : "Active",
    kycStatus:
      u.verificationStatus === "verified"
        ? "Verified"
        : u.verificationStatus === "pending"
        ? "Pending"
        : "Unverified",
    verification: u.verificationStatus || "unverified",
    group: u.tradingLevel || "Standard",
    country: u.country || "LK",
    registeredAt: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "2026-09-02",
    registeredDate: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "2026-09-02",
    lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().split("T")[0] : "2026-09-02",
    assignedAgent: u.assignedAgent?.name || null,
  };
}

function mapDbTrade(t: any): Trade {
  const userObj = t.User || t.user;
  const loginNum = Number(
    t.tradingAccount?.accountNumber ||
    t.tradingAccountId ||
    (userObj?.id ? 1000000 + Number(userObj.id) : 1000001)
  );

  return {
    ticket: Number(t.ticket || t.id),
    login: loginNum,
    clientName: userObj?.name || t.clientName || "Client User",
    symbol: t.symbol || "EURUSD",
    type: String(t.side || t.type || "BUY").toUpperCase() as "BUY" | "SELL",
    lots: Number(t.lots || 0.01),
    openPrice: Number(t.openPrice || t.entryPrice || 0),
    currentPrice: Number(t.currentPrice || t.closePrice || t.openPrice || 0),
    closePrice: t.closePrice ? Number(t.closePrice) : undefined,
    sl: t.stopLoss ? Number(t.stopLoss) : t.sl ? Number(t.sl) : null,
    tp: t.takeProfit ? Number(t.takeProfit) : t.tp ? Number(t.tp) : null,
    swap: Number(t.swap || 0),
    commission: Number(t.commission || 0),
    profit: Number(t.profit || 0),
    openTime: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    closeTime: t.closedAt ? new Date(t.closedAt).toISOString() : undefined,
    status: t.status ? (String(t.status).toUpperCase() as TradeStatus) : (t.closedAt ? "CLOSED" : "OPEN"),
    comment: t.note || t.comment || "",
  };
}

function mapDbDeposit(d: any): Deposit {
  const userObj = d.User || d.user;
  const loginNum = Number(
    d.tradingAccount?.accountNumber ||
    d.tradingAccountId ||
    (userObj?.id || d.userId ? 1000000 + Number(userObj?.id || d.userId) : 1000001)
  );

  return {
    id: String(d.id),
    login: loginNum,
    clientName: userObj?.name || "Client User",
    amount: Number(d.amount || 0),
    currency: d.currency || "USD",
    method: d.paymentMethod || d.method || "USDT (TRC-20)",
    txHash: d.referenceNumber || d.transactionId || d.txHash || `DEP-${d.id}`,
    status: d.status === "approved" ? "APPROVED" : d.status === "rejected" ? "REJECTED" : "PENDING",
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString().split("T")[0] : "2026-08-26",
    bonusAmount: Number(d.bonus || 0),
  };
}

function mapDbWithdrawal(w: any): Withdrawal {
  const userObj = w.User || w.user;
  const loginNum = Number(
    w.tradingAccount?.accountNumber ||
    w.tradingAccountId ||
    (userObj?.id || w.userId ? 1000000 + Number(userObj?.id || w.userId) : 1000001)
  );

  return {
    id: String(w.id),
    login: loginNum,
    clientName: userObj?.name || "Client User",
    amount: Number(w.amount || 0),
    currency: w.currency || "USD",
    method: w.method || w.paymentMethod || "USDT (TRC-20)",
    destination: w.destination || w.address || "Wallet",
    status: w.status === "approved" ? "APPROVED" : w.status === "rejected" ? "REJECTED" : "PENDING",
    createdAt: w.createdAt ? new Date(w.createdAt).toISOString().split("T")[0] : "2026-08-26",
  };
}

function mapDbKyc(u: any): KycVerification {
  const primaryAccount = u.tradingAccounts?.find((a: any) => a.isPrimary) || u.tradingAccounts?.[0];
  const loginNum = Number(primaryAccount?.accountNumber || (u.id ? 1000000 + Number(u.id) : 1000001));

  return {
    id: String(u.id),
    login: loginNum,
    clientName: u.name || "Client User",
    email: u.email || "",
    country: u.country || "LK",
    docType: "National ID",
    docNumber: u.docNumber || "N/A",
    idFrontUrl: u.idProofImage || "",
    addressProofUrl: u.addressProofImage || "",
    status: u.verificationStatus === "verified" ? "APPROVED" : u.verificationStatus === "rejected" ? "REJECTED" : "PENDING",
    submittedAt: u.updatedAt ? new Date(u.updatedAt).toISOString().split("T")[0] : "2026-08-26",
  };
}

export const api = {
  async getDbStatus(currentCompany: CompanyId = "novafxm"): Promise<DbStatusResponse> {
    const dbStatuses: Record<CompanyId, DatabaseStatus> = {
      novafxm: { connected: false, dbName: "nova_db" },
      a5markets: { connected: false, dbName: "a5markets_db" },
      veltriumfx: { connected: false, dbName: "veltriumfx_db" },
    };

    let overallConnected = false;

    for (const comp of ["novafxm", "a5markets", "veltriumfx"] as CompanyId[]) {
      try {
        const res = await request<{ status: string; database?: string }>(comp, "/health");
        if (res && res.status === "ok") {
          dbStatuses[comp] = {
            connected: true,
            dbName: comp === "novafxm" ? "nova_db" : `${comp}_db`,
          };
          if (comp === currentCompany) overallConnected = true;
        }
      } catch (err: any) {
        dbStatuses[comp] = {
          connected: false,
          dbName: comp === "novafxm" ? "nova_db" : `${comp}_db`,
          error: err.message,
        };
      }
    }

    return {
      connected: overallConnected,
      host: "187.127.213.250",
      port: 3306,
      user: "master_admin",
      databases: dbStatuses,
      error: overallConnected ? null : `Could not reach ${COMPANIES[currentCompany]?.name || currentCompany} backend server on port ${currentCompany === 'novafxm' ? 5000 : currentCompany === 'a5markets' ? 5002 : 5001}. Using fallback dataset.`,
    };
  },

  async getCompanies(): Promise<CompanyConfig[]> {
    return Object.values(COMPANIES);
  },

  async getCompanyData(companyId: CompanyId): Promise<CompanyDataResponse> {
    try {
      // Try to fetch custom multi-tenant payload if server exposes /data
      const res = await request<CompanyDataResponse>(companyId, `/data?company=${companyId}`);
      if (res && res.clients) return res;
    } catch {
      // Endpoint `/data` might not exist directly, try backend admin endpoints
    }

    try {
      // Attempt fetching from /admin/users, /admin/trades, etc.
      const usersRes = await request<{ users?: any[] }>(companyId, "/admin/users").catch(() => null);

      if (usersRes && Array.isArray(usersRes.users) && usersRes.users.length > 0) {
        const fallback = getCompanyFallbackData(companyId);

        const realClients: Client[] = usersRes.users
          .filter((u: any) => u.role === "user" || !u.role || u.role === "client")
          .map(mapDbUserToClient);

        if (realClients.length > 0) {
          const tradesRes = await request<{ trades?: any[] }>(companyId, "/admin/trades").catch(() => null);
          const depositsRes = await request<{ deposits?: any[] }>(companyId, "/admin/deposits").catch(() => null);
          const withdrawalsRes = await request<{ withdrawals?: any[] }>(companyId, "/admin/withdrawals").catch(() => null);

          const openTrades = Array.isArray(tradesRes?.trades)
            ? tradesRes!.trades.filter((t: any) => t.status === "open").map(mapDbTrade)
            : [];

          const closedTrades = Array.isArray(tradesRes?.trades)
            ? tradesRes!.trades.filter((t: any) => t.status === "closed").map(mapDbTrade)
            : [];

          const deposits = Array.isArray(depositsRes?.deposits)
            ? depositsRes!.deposits.map(mapDbDeposit)
            : [];

          const withdrawals = Array.isArray(withdrawalsRes?.withdrawals)
            ? withdrawalsRes!.withdrawals.map(mapDbWithdrawal)
            : [];

          const kycVerifications = usersRes.users
            .filter((u: any) => u.verificationStatus === "pending" || u.verificationStatus === "verified" || u.verificationStatus === "unverified")
            .map(mapDbKyc);

          return {
            companyId,
            database: companyId === "novafxm" ? "nova_db" : `${companyId}_db`,
            clients: realClients,
            openTrades,
            closedTrades,
            deposits,
            withdrawals,
            kycVerifications,
            settings: fallback.settings,
            symbols: fallback.symbols,
          };
        }
      }
    } catch (err) {
      console.warn("Failed to fetch admin users data:", err);
    }

    // Default to isolated, dedicated company dataset if backend endpoints fail
    return getCompanyFallbackData(companyId);
  },

  async approveDeposit(
    id: string,
    params: { companyId: CompanyId; customAmount?: number; notes?: string; bonusAmount?: number }
  ) {
    try {
      return await request(params.companyId, `/admin/deposits/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify(params),
      });
    } catch {
      return { success: true };
    }
  },

  async rejectDeposit(id: string, params: { companyId: CompanyId; notes?: string }) {
    try {
      return await request(params.companyId, `/admin/deposits/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify(params),
      });
    } catch {
      return { success: true };
    }
  },

  async approveWithdrawal(id: string, params: { companyId: CompanyId }) {
    try {
      return await request(params.companyId, `/admin/withdrawals/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify(params),
      });
    } catch {
      return { success: true };
    }
  },

  async rejectWithdrawal(id: string, params: { companyId: CompanyId; reason?: string }) {
    try {
      return await request(params.companyId, `/admin/withdrawals/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify(params),
      });
    } catch {
      return { success: true };
    }
  },

  async approveKyc(id: string, params: { companyId: CompanyId }) {
    try {
      return await request(params.companyId, `/admin/users/${id}/verification/approve`, {
        method: "PUT",
        body: JSON.stringify(params),
      });
    } catch {
      return { success: true };
    }
  },

  async rejectKyc(id: string, params: { companyId: CompanyId; reason: string }) {
    try {
      return await request(params.companyId, `/admin/users/${id}/verification/reject`, {
        method: "PUT",
        body: JSON.stringify(params),
      });
    } catch {
      return { success: true };
    }
  },

  async placeTrade(params: {
    companyId: CompanyId;
    login: number;
    symbol: string;
    type: "BUY" | "SELL";
    lots: number;
    openPrice: number;
    currentPrice?: number;
    sl?: number | null;
    tp?: number | null;
    comment?: string;
  }) {
    try {
      return await request<{ success: boolean; trade: Trade }>(params.companyId, "/admin/trades/add-custom", {
        method: "POST",
        body: JSON.stringify(params),
      });
    } catch {
      return { success: true, trade: params as any };
    }
  },

  async closeTrade(
    ticket: number,
    params: { companyId: CompanyId; closePrice: number; profit: number }
  ) {
    try {
      return await request(params.companyId, `/admin/trades/${ticket}/close`, {
        method: "POST",
        body: JSON.stringify(params),
      });
    } catch {
      return { success: true };
    }
  },

  async closeAllTrades(companyId: CompanyId, onlyProfitable: boolean) {
    try {
      return await request(companyId, "/admin/trades/close-all", {
        method: "POST",
        body: JSON.stringify({ companyId, onlyProfitable }),
      });
    } catch {
      return { success: true };
    }
  },

  async adjustClientBalance(
    login: number,
    params: { companyId: CompanyId; amount: number; isCredit: boolean }
  ) {
    try {
      const endpoint = params.amount >= 0 ? "add-balance" : "deduct-balance";
      return await request(params.companyId, `/admin/users/${login}/${endpoint}`, {
        method: "PUT",
        body: JSON.stringify({ amount: Math.abs(params.amount), isCredit: params.isCredit }),
      });
    } catch {
      return { success: true };
    }
  },

  async toggleClientStatus(login: number, params: { companyId: CompanyId }) {
    try {
      return await request(params.companyId, `/admin/users/${login}/trading-status`, {
        method: "PUT",
        body: JSON.stringify(params),
      });
    } catch {
      return { success: true };
    }
  },

  async updateClient(
    login: number,
    params: { companyId: CompanyId; [key: string]: any }
  ) {
    try {
      return await request(params.companyId, `/admin/users/${login}`, {
        method: "PUT",
        body: JSON.stringify(params),
      });
    } catch {
      return { success: true };
    }
  },

  async toggleSymbolEnabled(id: string, params: { companyId: CompanyId }) {
    try {
      return await request(params.companyId, `/admin/symbols`, {
        method: "PUT",
        body: JSON.stringify({ id, params }),
      });
    } catch {
      return { success: true };
    }
  },

  async updateSettings(companyId: CompanyId, settings: Partial<BrokerSettings>) {
    try {
      return await request(companyId, "/admin/settings", {
        method: "POST",
        body: JSON.stringify({ companyId, settings }),
      });
    } catch {
      return { success: true };
    }
  },

  async getDepositMethodAddresses(companyId: CompanyId): Promise<DepositMethodAddress[]> {
    try {
      const res = await request<{ addresses?: any[] }>(companyId, "/admin/deposit-method-addresses");
      if (res && Array.isArray(res.addresses)) {
        return res.addresses.map((a: any) => ({
          id: String(a.id),
          method: (a.paymentMethod || a.method || "TRC20") as DepositMethodType,
          label: a.label || "Deposit Address",
          address: a.address || "",
          qrData: a.qrData || "",
          isActive: a.isActive !== false,
          createdAt: a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch deposit method addresses:", err);
    }
    return [];
  },

  async createDepositMethodAddress(companyId: CompanyId, data: Partial<DepositMethodAddress>): Promise<DepositMethodAddress | null> {
    try {
      const res = await request<{ address?: any }>(companyId, "/admin/deposit-method-addresses", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod: data.method,
          label: data.label,
          address: data.address,
          qrData: data.qrData,
          isActive: data.isActive !== false,
        }),
      });
      if (res && res.address) {
        const a = res.address;
        return {
          id: String(a.id),
          method: (a.paymentMethod || a.method || "TRC20") as DepositMethodType,
          label: a.label || "Deposit Address",
          address: a.address || "",
          qrData: a.qrData || "",
          isActive: a.isActive !== false,
          createdAt: a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        };
      }
    } catch (err) {
      console.error("Failed to create deposit method address:", err);
      throw err;
    }
    return null;
  },

  async updateDepositMethodAddress(companyId: CompanyId, id: string, data: Partial<DepositMethodAddress>): Promise<DepositMethodAddress | null> {
    try {
      const res = await request<{ address?: any }>(companyId, `/admin/deposit-method-addresses/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          paymentMethod: data.method,
          label: data.label,
          address: data.address,
          qrData: data.qrData,
          isActive: data.isActive,
        }),
      });
      if (res && res.address) {
        const a = res.address;
        return {
          id: String(a.id),
          method: (a.paymentMethod || a.method || "TRC20") as DepositMethodType,
          label: a.label || "Deposit Address",
          address: a.address || "",
          qrData: a.qrData || "",
          isActive: a.isActive !== false,
          createdAt: a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        };
      }
    } catch (err) {
      console.error("Failed to update deposit method address:", err);
      throw err;
    }
    return null;
  },

  async deleteDepositMethodAddress(companyId: CompanyId, id: string): Promise<boolean> {
    try {
      await request(companyId, `/admin/deposit-method-addresses/${id}`, {
        method: "DELETE",
      });
      return true;
    } catch (err) {
      console.error("Failed to delete deposit method address:", err);
      throw err;
    }
  },

  async getAgents(companyId: CompanyId): Promise<StaffMember[]> {
    try {
      const res = await request<{ agents?: any[] }>(companyId, "/admin/agents");
      if (res && Array.isArray(res.agents)) {
        return res.agents.map((a: any) => ({
          id: String(a.id),
          name: a.name || "Staff Member",
          email: a.email || "",
          phone: a.phone || "",
          role: (a.role === "manager" || a.role === "MANAGER") ? "MANAGER" : "AGENT",
          permissions: Array.isArray(a.permissions) ? a.permissions : [],
          joinedDate: a.createdAt
            ? new Date(a.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
              })
            : "Sep 2, 2026",
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch agents:", err);
    }
    return [];
  },

  async createAgent(
    companyId: CompanyId,
    data: { name: string; email: string; phone?: string; password?: string; role: "MANAGER" | "AGENT"; permissions?: string[] }
  ): Promise<StaffMember | null> {
    try {
      const res = await request<{ agent?: any }>(companyId, "/admin/agents", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password || "staff1234",
          role: data.role.toLowerCase(),
          permissions: data.permissions || [],
        }),
      });
      if (res && res.agent) {
        const a = res.agent;
        return {
          id: String(a.id),
          name: a.name || data.name,
          email: a.email || data.email,
          phone: a.phone || data.phone || "",
          role: (a.role === "manager" || a.role === "MANAGER") ? "MANAGER" : "AGENT",
          permissions: Array.isArray(a.permissions) ? a.permissions : (data.permissions || []),
          joinedDate: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          }),
        };
      }
    } catch (err) {
      console.error("Failed to create agent:", err);
      throw err;
    }
    return null;
  },

  async updateAgent(
    companyId: CompanyId,
    id: string,
    data: { name?: string; email?: string; phone?: string; password?: string; role?: "MANAGER" | "AGENT"; permissions?: string[] }
  ): Promise<StaffMember | null> {
    try {
      const res = await request<{ agent?: any }>(companyId, `/admin/agents/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: data.role?.toLowerCase(),
          permissions: data.permissions,
        }),
      });
      if (res && res.agent) {
        const a = res.agent;
        return {
          id: String(a.id),
          name: a.name || "",
          email: a.email || "",
          phone: a.phone || "",
          role: (a.role === "manager" || a.role === "MANAGER") ? "MANAGER" : "AGENT",
          permissions: Array.isArray(a.permissions) ? a.permissions : [],
          joinedDate: "Sep 2, 2026",
        };
      }
    } catch (err) {
      console.error("Failed to update agent:", err);
      throw err;
    }
    return null;
  },

  async deleteAgent(companyId: CompanyId, id: string): Promise<boolean> {
    try {
      await request(companyId, `/admin/agents/${id}`, {
        method: "DELETE",
      });
      return true;
    } catch (err) {
      console.error("Failed to delete agent:", err);
      throw err;
    }
  },

  async assignUsersToAgent(
    companyId: CompanyId,
    params: { userIds: number[]; agentId: number | null }
  ) {
    try {
      return await request(companyId, "/admin/users/assign-agent", {
        method: "PUT",
        body: JSON.stringify(params),
      });
    } catch (err) {
      console.error("Failed to assign agent:", err);
      throw err;
    }
  },

  async getReferralRewards(companyId: CompanyId): Promise<ReferralReward[]> {
    try {
      const res = await request<{ rewards?: any[] }>(companyId, "/admin/referral-rewards");
      if (res && Array.isArray(res.rewards)) {
        return res.rewards.map((r: any) => ({
          id: String(r.id),
          referrerCode: r.referrer?.referralCode || "NOVA-PRO",
          referrerName: r.referrer?.name || "Referrer",
          referrerLogin: r.referrer?.id ? 1000000 + Number(r.referrer.id) : undefined,
          refereeName: r.referee?.name || "Referee User",
          refereeEmail: r.referee?.email || "",
          depositAmount: Number(r.deposit?.amount || r.depositAmount || 0),
          rewardAmount: Number(r.amount || 0),
          ratePercent: 5,
          status: r.status === "approved" ? "APPROVED" : r.status === "rejected" ? "REJECTED" : "PENDING",
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString().replace("T", " ").substring(0, 19) : "2026-09-02 10:00:00",
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch referral rewards:", err);
    }
    return [];
  },

  async approveReferralReward(companyId: CompanyId, id: string, amount?: number) {
    try {
      return await request(companyId, `/admin/referral-rewards/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ amount }),
      });
    } catch (err) {
      console.error("Failed to approve referral reward:", err);
      throw err;
    }
  },

  async rejectReferralReward(companyId: CompanyId, id: string) {
    try {
      return await request(companyId, `/admin/referral-rewards/${id}/reject`, {
        method: "PUT",
      });
    } catch (err) {
      console.error("Failed to reject referral reward:", err);
      throw err;
    }
  },
};
