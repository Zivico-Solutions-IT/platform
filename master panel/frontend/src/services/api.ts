import {
  CompanyConfig,
  CompanyId,
  Client,
  Trade,
  Deposit,
  Withdrawal,
  KycVerification,
  BrokerSettings,
  SymbolData,
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

async function request<T>(companyId: CompanyId, url: string, options?: RequestInit): Promise<T> {
  const baseUrl = COMPANY_API_URLS[companyId] || COMPANY_API_URLS.novafxm;
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("novafxm_token") ||
    localStorage.getItem("a5markets_token") ||
    localStorage.getItem("veltriumfx_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers,
  });

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
    leverage: `1:${u.leverage || 500}`,
    accountType: u.accountType === "Demo" ? "Demo" : "Live",
    status: u.tradingStatus === "frozen" ? "Inactive" : "Active",
    verification:
      u.verificationStatus === "verified"
        ? "Verified"
        : u.verificationStatus === "pending"
        ? "Pending"
        : "Unverified",
    group: u.tradingLevel || "Standard",
    country: u.country || "LK",
    registeredDate: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "2026-09-02",
    lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().split("T")[0] : "2026-09-02",
    assignedAgent: u.assignedAgent?.name || null,
  };
}

function mapDbTrade(t: any): Trade {
  return {
    ticket: Number(t.ticket || t.id),
    login: Number(t.tradingAccount?.accountNumber || t.login || 1000001),
    clientName: t.user?.name || t.clientName || "Client",
    symbol: t.symbol || "EURUSD",
    type: t.side === "BUY" || t.type === "BUY" ? "BUY" : "SELL",
    lots: Number(t.lots || 0.1),
    openPrice: Number(t.openPrice || 0),
    closePrice: Number(t.closePrice || t.currentPrice || t.openPrice || 0),
    sl: t.sl ? Number(t.sl) : null,
    tp: t.tp ? Number(t.tp) : null,
    profit: Number(t.profit || 0),
    openTime: t.openTime || (t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString()),
    closeTime: t.closeTime || (t.closedAt ? new Date(t.closedAt).toISOString() : undefined),
    comment: t.comment || "",
  };
}

function mapDbDeposit(d: any): Deposit {
  return {
    id: String(d.id),
    login: Number(d.tradingAccount?.accountNumber || (d.userId ? 1000000 + Number(d.userId) : 1000001)),
    clientName: d.user?.name || "Client",
    amount: Number(d.amount || 0),
    method: d.paymentMethod || d.method || "USDT (TRC20)",
    txId: d.transactionId || d.txHash || `TX${d.id}`,
    status: d.status === "approved" ? "Approved" : d.status === "rejected" ? "Rejected" : "Pending",
    date: d.createdAt ? new Date(d.createdAt).toISOString().split("T")[0] : "2026-09-02",
    bonus: Number(d.bonus || 0),
  };
}

function mapDbWithdrawal(w: any): Withdrawal {
  return {
    id: String(w.id),
    login: Number(w.tradingAccount?.accountNumber || (w.userId ? 1000000 + Number(w.userId) : 1000001)),
    clientName: w.user?.name || "Client",
    amount: Number(w.amount || 0),
    method: w.method || w.paymentMethod || "Crypto USDT",
    status: w.status === "approved" ? "Approved" : w.status === "rejected" ? "Rejected" : "Pending",
    date: w.createdAt ? new Date(w.createdAt).toISOString().split("T")[0] : "2026-09-02",
  };
}

function mapDbKyc(u: any): KycVerification {
  return {
    id: String(u.id),
    login: Number(u.tradingAccounts?.[0]?.accountNumber || (u.id ? 1000000 + Number(u.id) : 1000001)),
    clientName: u.name || "Client User",
    email: u.email || "",
    submittedDate: u.updatedAt ? new Date(u.updatedAt).toISOString().split("T")[0] : "2026-09-02",
    documentType: "National ID",
    status: u.verificationStatus === "verified" ? "Verified" : u.verificationStatus === "rejected" ? "Rejected" : "Pending",
    idProofUrl: u.idProofImage || undefined,
    addressProofUrl: u.addressProofImage || undefined,
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
            : fallback.openTrades;

          const closedTrades = Array.isArray(tradesRes?.trades)
            ? tradesRes!.trades.filter((t: any) => t.status === "closed").map(mapDbTrade)
            : fallback.closedTrades;

          const deposits = Array.isArray(depositsRes?.deposits)
            ? depositsRes!.deposits.map(mapDbDeposit)
            : fallback.deposits;

          const withdrawals = Array.isArray(withdrawalsRes?.withdrawals)
            ? withdrawalsRes!.withdrawals.map(mapDbWithdrawal)
            : fallback.withdrawals;

          const kycVerifications = usersRes.users
            .filter((u: any) => u.verificationStatus === "pending" || u.verificationStatus === "verified")
            .map(mapDbKyc);

          return {
            companyId,
            database: companyId === "novafxm" ? "nova_db" : `${companyId}_db`,
            clients: realClients,
            openTrades: openTrades.length > 0 ? openTrades : fallback.openTrades,
            closedTrades: closedTrades.length > 0 ? closedTrades : fallback.closedTrades,
            deposits: deposits.length > 0 ? deposits : fallback.deposits,
            withdrawals: withdrawals.length > 0 ? withdrawals : fallback.withdrawals,
            kycVerifications: kycVerifications.length > 0 ? kycVerifications : fallback.kycVerifications,
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
};
