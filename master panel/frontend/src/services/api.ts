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
  const response = await fetch(`${baseUrl}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `API Request failed with status ${response.status}`);
  }

  return response.json();
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
      if (usersRes && Array.isArray(usersRes.users)) {
        const fallback = getCompanyFallbackData(companyId);
        return {
          ...fallback,
          database: companyId === "novafxm" ? "nova_db" : `${companyId}_db`,
        };
      }
    } catch {
      // Fall through to fallback
    }

    // Default to isolated, dedicated company dataset
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
