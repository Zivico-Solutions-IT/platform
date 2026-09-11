import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import {
  ActiveNavTab,
  Client,
  SymbolData,
  Trade,
  Deposit,
  Withdrawal,
  KycVerification,
  BrokerSettings,
  CompanyId,
  CompanyConfig,
} from "../types";
import { COMPANIES } from "../data/companyData";
import { api, DbStatusResponse, getCompanyApiUrl } from "../services/api";

interface PlaceOrderParams {
  login: number;
  symbol: string;
  type: "BUY" | "SELL";
  lots: number;
  sl?: number | null;
  tp?: number | null;
  comment?: string;
  openPrice?: number;
  openTime?: string;
  closePrice?: number;
  closeTime?: string;
}

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

export interface DbConnectionInfo {
  connected: boolean;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  databases?: {
    novafxm?: { connected: boolean; dbName: string; error?: string };
    a5markets?: { connected: boolean; dbName: string; error?: string };
    veltriumfx?: { connected: boolean; dbName: string; error?: string };
  };
  error?: string | null;
  code?: string;
}

interface PortalContextType {
  // Database Connection
  dbStatus: DbConnectionInfo;
  isDbLoading: boolean;
  refreshDbData: () => Promise<void>;

  // Authentication State & Actions
  isAuthenticated: boolean;
  currentUser: { email: string; name: string; role: string } | null;
  login: (email: string, pass: string) => { success: boolean; error?: string };
  logout: () => void;

  // Multi-Company Management
  currentCompany: CompanyId;
  setCompany: (id: CompanyId) => void;
  companyConfig: CompanyConfig;
  companies: CompanyConfig[];

  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  symbols: SymbolData[];
  clients: Client[];
  openTrades: Trade[];
  closedTrades: Trade[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  kycVerifications: KycVerification[];
  settings: BrokerSettings;
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  selectedClient: Client | null;
  setSelectedClient: (c: Client | null) => void;
  toasts: ToastMessage[];
  addToast: (type: "success" | "error" | "info", title: string, message: string) => void;
  removeToast: (id: string) => void;
  
  // Reporting Period & Monthly view
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  showMonthlyTable: boolean;
  setShowMonthlyTable: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  approveDeposit: (id: string, customAmount?: number, notes?: string, bonusAmount?: number) => void;
  rejectDeposit: (id: string, notes?: string) => void;
  approveWithdrawal: (id: string) => void;
  rejectWithdrawal: (id: string, reason?: string) => void;
  approveKyc: (id: string) => void;
  rejectKyc: (id: string, reason: string) => void;
  placeOrder: (order: PlaceOrderParams) => boolean;
  closeTrade: (ticket: number) => void;
  closeAllTrades: (onlyProfitable?: boolean) => void;
  adjustClientBalance: (login: number, amount: number, isCredit?: boolean) => void;
  toggleClientStatus: (login: number) => void;
  updateClient: (login: number, updatedFields: Partial<Client>) => Promise<void> | void;
  toggleSymbolEnabled: (symbolId: string) => void;
  updateSettings: (newSettings: Partial<BrokerSettings>) => void;
  resetAllData: () => void;
  resetPendingDeposits: () => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

import { ALL_MASTER_SYMBOLS } from "../data/allSymbolsData";

const defaultSettings: BrokerSettings = {
  serverName: "NOVAFXM Live Server 01",
  brokerBrand: "NOVAFXM PRIME",
  serverStatus: "LIVE",
  pingMs: 18,
  marginCall: 100,
  stopOut: 50,
  defaultLeverage: "1:500",
  soundAlerts: true,
  autoApproveVerifiedDeposits: false,
  adminUser: {
    name: "Muzammil (Head Administrator)",
    role: "Super Administrator",
    email: "admin@novafxm.com",
  },
};

const defaultSymbols: SymbolData[] = ALL_MASTER_SYMBOLS;

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("MASTER_PANEL_AUTH") === "true";
  });

  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; role: string } | null>(() => {
    const saved = localStorage.getItem("MASTER_PANEL_USER");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return localStorage.getItem("MASTER_PANEL_AUTH") === "true"
      ? { email: "master@novafxm.com", name: "Master Administrator", role: "Super Admin" }
      : null;
  });

  const login = useCallback((email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === "master@novafxm.com" && pass === "master123") {
      const user = { email: "master@novafxm.com", name: "Master Administrator", role: "Super Admin" };
      setIsAuthenticated(true);
      setCurrentUser(user);
      localStorage.setItem("MASTER_PANEL_AUTH", "true");
      localStorage.setItem("MASTER_PANEL_USER", JSON.stringify(user));
      return { success: true };
    }
    return { success: false, error: "Invalid admin email or password." };
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem("MASTER_PANEL_AUTH");
    localStorage.removeItem("MASTER_PANEL_USER");
  }, []);

  // Current active company
  const [currentCompany, setCurrentCompany] = useState<CompanyId>(() => {
    const saved = localStorage.getItem("MT5_PORTAL_ACTIVE_COMPANY") as CompanyId;
    return saved && (saved === "novafxm" || saved === "a5markets" || saved === "veltriumfx")
      ? saved
      : "novafxm";
  });

  const [dbStatus, setDbStatus] = useState<DbConnectionInfo>({
    connected: false,
    host: "localhost",
    port: 3306,
    database: `mt5_${currentCompany}`,
    error: null,
  });
  const [isDbLoading, setIsDbLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<ActiveNavTab>("dashboard");
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("LIVE");
  const [showMonthlyTable, setShowMonthlyTable] = useState<boolean>(false);

  // Entities
  const [symbols, setSymbols] = useState<SymbolData[]>(defaultSymbols);
  const [clients, setClients] = useState<Client[]>([]);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [kycVerifications, setKycVerifications] = useState<KycVerification[]>([]);
  const [settings, setSettings] = useState<BrokerSettings>(defaultSettings);

  const addToast = useCallback((type: "success" | "error" | "info", title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch data directly from MySQL backend or isolated brand dataset
  const loadCompanyData = useCallback(
    async (compId: CompanyId, notify = false) => {
      setIsDbLoading(true);
      try {
        const status = await api.getDbStatus(compId);
        const activeDb = status.databases ? status.databases[compId] : undefined;
        const isConnected = activeDb ? activeDb.connected : status.connected;
        setDbStatus({
          ...status,
          database: activeDb ? activeDb.dbName : `${compId}_db`,
          connected: isConnected,
        });

        const data = await api.getCompanyData(compId);
        setClients(data.clients);
        setOpenTrades(data.openTrades);
        setClosedTrades(data.closedTrades);
        setDeposits(data.deposits);
        setWithdrawals(data.withdrawals);
        setKycVerifications(data.kycVerifications);
        if (data.settings) setSettings(data.settings);
        const loadedSymbols = data.symbols && data.symbols.length > 0 ? data.symbols : [];
        const mergedSymbolsMap = new Map<string, SymbolData>();
        ALL_MASTER_SYMBOLS.forEach((s) => {
          mergedSymbolsMap.set(s.symbol.replace("/", "").toUpperCase(), s);
        });
        loadedSymbols.forEach((s) => {
          const key = s.symbol.replace("/", "").toUpperCase();
          const existing = mergedSymbolsMap.get(key);
          mergedSymbolsMap.set(key, existing ? { ...existing, ...s } : s);
        });
        setSymbols(Array.from(mergedSymbolsMap.values()));

        if (notify) {
          if (isConnected) {
            addToast(
              "success",
              "Database Connected",
              `Connected to MySQL DB '${data.database || `${compId}_db`}' for ${COMPANIES[compId].name}.`
            );
          } else {
            addToast(
              "info",
              `Loaded ${COMPANIES[compId].name}`,
              `Active Broker Entity: ${COMPANIES[compId].fullName}`
            );
          }
        }
      } catch (err: any) {
        console.warn("Could not reach backend API:", err);
        setDbStatus({
          connected: false,
          host: "187.127.213.250",
          port: 3306,
          database: `${compId}_db`,
          error: err?.message || "Backend API server offline.",
        });
      } finally {
        setIsDbLoading(false);
      }
    },
    [addToast]
  );

  // Load silently on startup and company changes. Connection notifications are
  // reserved for a manual refresh or an actual reconnect event.
  useEffect(() => {
    loadCompanyData(currentCompany);
  }, [currentCompany, loadCompanyData]);

  // Periodic health check (every 10s)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await api.getDbStatus(currentCompany);
        const activeDb = status.databases ? status.databases[currentCompany] : undefined;
        setDbStatus((prev) => {
          const isNowConnected = activeDb ? activeDb.connected : status.connected;
          if (prev.connected !== isNowConnected && isNowConnected) {
            loadCompanyData(currentCompany);
            addToast("success", "Database Reconnected", `Reconnected to ${COMPANIES[currentCompany].name} DB.`);
          }
          return {
            ...status,
            database: activeDb ? activeDb.dbName : `${currentCompany}_db`,
            connected: isNowConnected,
          };
        });
      } catch {
        setDbStatus((prev) => ({ ...prev, connected: false }));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentCompany, loadCompanyData, addToast]);

  // Financial metrics recalculation helper
  const recalculateClientFinancials = useCallback(
    (currentClients: Client[], currentOpenTrades: Trade[]): Client[] => {
      return currentClients.map((client) => {
        const clientTrades = currentOpenTrades.filter((t) => t.login === client.login);
        const floatingProfit = clientTrades.reduce((acc, t) => acc + t.profit, 0);
        const equity = Number((client.balance + client.credit + floatingProfit).toFixed(2));
        
        let margin = 0;
        clientTrades.forEach((t) => {
          const levNum = parseInt(client.leverage.replace("1:", "")) || 500;
          const symbolObj = symbols.find((s) => s.symbol === t.symbol);
          const contractSize = symbolObj ? symbolObj.contractSize : 100000;
          margin += (t.lots * contractSize * t.currentPrice) / levNum;
        });
        margin = Number(margin.toFixed(2));

        const freeMargin = Number((equity - margin).toFixed(2));
        const marginLevel = margin > 0 ? Number(((equity / margin) * 100).toFixed(2)) : 0;

        return {
          ...client,
          equity,
          margin,
          freeMargin,
          marginLevel,
        };
      });
    },
    [symbols]
  );

  // Live Real-Time Market Price Feed & Candle Engine (Connected to NovaFXM Backend)
  useEffect(() => {
    let isMounted = true;

    const fetchLivePrices = async (streamedPrices?: any[]) => {
      try {
        let apiSymbols = streamedPrices;
        if (!apiSymbols) {
          const token = localStorage.getItem("token") || sessionStorage.getItem("token");
          const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
          const baseUrl = getCompanyApiUrl(currentCompany);
          let res = await fetch(`${baseUrl}/market/prices`, { headers });
          if (!res.ok && currentCompany !== "novafxm") {
            res = await fetch(`${getCompanyApiUrl("novafxm")}/market/prices`, { headers });
          }
          if (!res.ok) return;
          const json = await res.json();
          apiSymbols = json.symbols || json.data || [];
        }

        if (Array.isArray(apiSymbols) && apiSymbols.length > 0 && isMounted) {
            setSymbols((prevSymbols) => {
              const symbolMap = new Map(
                prevSymbols.map((s) => [s.symbol.replace("/", "").toUpperCase(), s])
              );

              apiSymbols.forEach((item: any) => {
                const rawSym = String(item.symbol || "").trim();
                const key = rawSym.replace("/", "").toUpperCase();
                const existing = symbolMap.get(key);
                const price = Number(item.price ?? item.bid);

                if (Number.isFinite(price) && price > 0) {
                  const bid = Number(item.bid ?? price);
                  const ask = Number(item.ask ?? (bid + (item.spread || 0.0002)));
                  const digits = Number(item.decimals ?? item.digits ?? existing?.digits ?? 5);
                  const spread = Number((item.spreadPoints ?? item.spread ?? existing?.spread ?? 1.2).toFixed(1));
                  const dailyChange = Number((item.change ?? item.dailyChange ?? existing?.dailyChange ?? 0).toFixed(2));
                  const isUp = existing ? (bid >= existing.bid) : (dailyChange >= 0);

                  if (existing) {
                    symbolMap.set(key, {
                      ...existing,
                      bid,
                      ask,
                      spread,
                      digits,
                      dailyChange,
                      changeDirection: isUp ? "up" : "down",
                    });
                  } else {
                    symbolMap.set(key, {
                      id: `sym-${key.toLowerCase()}`,
                      symbol: rawSym.includes("/") ? rawSym : `${rawSym.slice(0, 3)}/${rawSym.slice(3)}`,
                      category: item.group || item.category || "Forex",
                      bid,
                      ask,
                      spread,
                      digits,
                      contractSize: 100000,
                      minLot: 0.01,
                      maxLot: 100,
                      swapLong: -2.0,
                      swapShort: 0.5,
                      enabled: true,
                      dailyChange,
                      changeDirection: isUp ? "up" : "down",
                    });
                  }
                }
              });

              return Array.from(symbolMap.values());
            });
        }
      } catch (e) {
        // Fallback simulation below
      }
    };

    fetchLivePrices();
    const pollInterval = setInterval(fetchLivePrices, 2500);
    const apiBase = getCompanyApiUrl(currentCompany);
    const socketBase = /^https?:\/\//i.test(apiBase)
      ? apiBase.replace(/\/api\/?$/, "")
      : window.location.origin;
    const socket = io(socketBase, { transports: ["websocket"], timeout: 5000, reconnection: true });
    socket.on("market:prices", fetchLivePrices);
    socket.on("market:prices:delta", fetchLivePrices);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [currentCompany]);

  // Update client metrics when open trades change
  useEffect(() => {
    setClients((prevClients) => recalculateClientFinancials(prevClients, openTrades));
  }, [openTrades, recalculateClientFinancials]);

  // Actions connecting to MySQL API
  const approveDeposit = useCallback(
    async (depositId: string, customAmount?: number, notes?: string, bonusAmount?: number) => {
      const deposit = deposits.find((d) => d.id === depositId);
      if (!deposit || deposit.status !== "PENDING") return;

      const finalAmount =
        customAmount !== undefined && !isNaN(customAmount) && customAmount > 0
          ? Number(customAmount.toFixed(2))
          : deposit.amount;

      const finalBonus =
        bonusAmount !== undefined && !isNaN(bonusAmount) && bonusAmount > 0
          ? Number(bonusAmount.toFixed(2))
          : 0;

      const originalAmt = deposit.originalAmount || deposit.amount;
      const isEdited = Math.abs(finalAmount - deposit.amount) > 0.009;
      const adjReason = isEdited
        ? `Adjusted from $${deposit.amount} to $${finalAmount} by Manager`
        : undefined;

      const now = new Date().toISOString().replace("T", " ").substring(0, 19);

      setDeposits((prev) =>
        prev.map((d) => {
          if (d.id === depositId) {
            return {
              ...d,
              amount: finalAmount,
              originalAmount: originalAmt,
              bonusAmount: finalBonus,
              status: "APPROVED",
              processedAt: now,
              notes: notes || d.notes || "Approved by Manager",
              adjustmentReason: adjReason,
            };
          }
          return d;
        })
      );

      setClients((prev) =>
        prev.map((c) => {
          if (c.login === deposit.login) {
            const newBal = Number((c.balance + finalAmount).toFixed(2));
            const newCredit = Number((c.credit + finalBonus).toFixed(2));
            const newEquity = Number((c.equity + finalAmount + finalBonus).toFixed(2));
            const newFree = Number((c.freeMargin + finalAmount + finalBonus).toFixed(2));
            return {
              ...c,
              balance: newBal,
              credit: newCredit,
              equity: newEquity,
              freeMargin: newFree,
            };
          }
          return c;
        })
      );

      if (dbStatus.connected) {
        try {
          await api.approveDeposit(depositId, {
            companyId: currentCompany,
            customAmount: finalAmount,
            notes: notes || "Approved by Manager",
            bonusAmount: finalBonus,
          });
        } catch (err: any) {
          console.error("API deposit approve failed:", err);
          addToast("error", "Database Sync Error", err.message || "Failed to update MySQL.");
        }
      }

      addToast(
        "success",
        "Deposit Approved",
        `$${finalAmount.toLocaleString()}${finalBonus > 0 ? ` + $${finalBonus} Bonus` : ""} credited to #${deposit.login}`
      );
    },
    [deposits, currentCompany, dbStatus.connected, addToast]
  );

  const rejectDeposit = useCallback(
    async (depositId: string, notes?: string) => {
      const deposit = deposits.find((d) => d.id === depositId);
      if (!deposit || deposit.status !== "PENDING") return;

      const now = new Date().toISOString().replace("T", " ").substring(0, 19);

      setDeposits((prev) =>
        prev.map((d) =>
          d.id === depositId
            ? { ...d, status: "REJECTED", processedAt: now, notes: notes || "Rejected by Manager" }
            : d
        )
      );

      if (dbStatus.connected) {
        try {
          await api.rejectDeposit(depositId, { companyId: currentCompany, notes });
        } catch (err: any) {
          console.error("API reject deposit failed:", err);
        }
      }

      addToast("info", "Deposit Rejected", `Deposit #${depositId} marked as rejected.`);
    },
    [deposits, currentCompany, dbStatus.connected, addToast]
  );

  const approveWithdrawal = useCallback(
    async (withdrawalId: string) => {
      const wth = withdrawals.find((w) => w.id === withdrawalId);
      if (!wth || wth.status !== "PENDING") return;

      const now = new Date().toISOString().replace("T", " ").substring(0, 19);

      setWithdrawals((prev) =>
        prev.map((w) => (w.id === withdrawalId ? { ...w, status: "APPROVED", processedAt: now } : w))
      );

      setClients((prev) =>
        prev.map((c) => {
          if (c.login === wth.login) {
            const newBal = Math.max(0, Number((c.balance - wth.amount).toFixed(2)));
            return {
              ...c,
              balance: newBal,
              equity: Math.max(0, Number((c.equity - wth.amount).toFixed(2))),
              freeMargin: Math.max(0, Number((c.freeMargin - wth.amount).toFixed(2))),
            };
          }
          return c;
        })
      );

      if (dbStatus.connected) {
        try {
          await api.approveWithdrawal(withdrawalId, { companyId: currentCompany });
        } catch (err: any) {
          console.error("API approve withdrawal failed:", err);
        }
      }

      addToast("success", "Withdrawal Approved", `$${wth.amount.toLocaleString()} processed for #${wth.login}`);
    },
    [withdrawals, currentCompany, dbStatus.connected, addToast]
  );

  const rejectWithdrawal = useCallback(
    async (withdrawalId: string, reason?: string) => {
      const wth = withdrawals.find((w) => w.id === withdrawalId);
      if (!wth || wth.status !== "PENDING") return;

      const now = new Date().toISOString().replace("T", " ").substring(0, 19);

      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === withdrawalId
            ? { ...w, status: "REJECTED", processedAt: now, reason: reason || "Rejected by Manager" }
            : w
        )
      );

      if (dbStatus.connected) {
        try {
          await api.rejectWithdrawal(withdrawalId, { companyId: currentCompany, reason });
        } catch (err: any) {
          console.error("API reject withdrawal failed:", err);
        }
      }

      addToast("info", "Withdrawal Rejected", `Request #${withdrawalId} rejected.`);
    },
    [withdrawals, currentCompany, dbStatus.connected, addToast]
  );

  const approveKyc = useCallback(
    async (kycId: string) => {
      const kyc = kycVerifications.find((k) => k.id === kycId);
      if (!kyc) return;

      // Persist before updating local state; otherwise a failed API request
      // looks approved until the next refresh.
      if (dbStatus.connected) {
        try {
          await api.approveKyc(kycId, { companyId: currentCompany });
        } catch (err: any) {
          console.error("API approve KYC failed:", err);
          addToast("error", "KYC Approval Failed", err?.message || "Could not approve this verification.");
          return;
        }
      }

      setKycVerifications((prev) =>
        prev.map((k) => (k.id === kycId ? { ...k, status: "APPROVED" } : k))
      );

      setClients((prev) =>
        prev.map((c) => (c.login === kyc.login ? { ...c, kycStatus: "Verified" } : c))
      );

      addToast("success", "KYC Approved", `Account #${kyc.login} is now fully verified.`);
    },
    [kycVerifications, currentCompany, dbStatus.connected, addToast]
  );

  const rejectKyc = useCallback(
    async (kycId: string, reason: string) => {
      const kyc = kycVerifications.find((k) => k.id === kycId);
      if (!kyc) return;

      setKycVerifications((prev) =>
        prev.map((k) => (k.id === kycId ? { ...k, status: "REJECTED", rejectionReason: reason } : k))
      );

      setClients((prev) =>
        prev.map((c) => (c.login === kyc.login ? { ...c, kycStatus: "Unverified" } : c))
      );

      if (dbStatus.connected) {
        try {
          await api.rejectKyc(kycId, { companyId: currentCompany, reason });
        } catch (err: any) {
          console.error("API reject KYC failed:", err);
        }
      }

      addToast("info", "KYC Rejected", `Verification for #${kyc.login} rejected: ${reason}`);
    },
    [kycVerifications, currentCompany, dbStatus.connected, addToast]
  );

  const placeOrder = useCallback(
    (order: PlaceOrderParams): boolean => {
      const client = clients.find((c) => c.login === order.login);
      const symbolObj = symbols.find((s) => s.symbol === order.symbol);

      if (!client) {
        addToast("error", "Order Failed", "Client account not found.");
        return false;
      }
      if (!symbolObj) {
        addToast("error", "Order Failed", "Symbol not found.");
        return false;
      }
      if (!symbolObj.enabled) {
        addToast("error", "Symbol Disabled", `${symbolObj.symbol} trading is currently suspended.`);
        return false;
      }

      const openPrice = Number(order.openPrice) || (order.type === "BUY" ? symbolObj.ask : symbolObj.bid);
      const commission = -Number((order.lots * 3.5).toFixed(2));
      const ticket = Math.floor(Math.random() * 900000) + 8800000;
      const now = new Date().toISOString().replace("T", " ").substring(0, 19);
      const isClosedHistoricalTrade = Boolean(order.closeTime);
      const closePrice = isClosedHistoricalTrade ? Number(order.closePrice) : undefined;
      const tradeProfit = isClosedHistoricalTrade && closePrice !== undefined
        ? Number((((closePrice - openPrice) * (order.type === "BUY" ? 1 : -1) * order.lots * symbolObj.contractSize) + commission).toFixed(2))
        : commission;

      const newTrade: Trade = {
        ticket,
        login: client.login,
        clientName: client.name,
        symbol: symbolObj.symbol,
        type: order.type,
        lots: order.lots,
        openPrice,
        currentPrice: closePrice ?? openPrice,
        sl: order.sl || null,
        tp: order.tp || null,
        swap: 0,
        commission,
        profit: tradeProfit,
        openTime: order.openTime || now,
        closePrice,
        closeTime: order.closeTime,
        status: isClosedHistoricalTrade ? "CLOSED" : "OPEN",
        comment: order.comment || "Manager Terminal Exec",
      };

      if (isClosedHistoricalTrade) {
        setClosedTrades((prev) => [newTrade, ...prev]);
        setClients((prev) => prev.map((item) => item.login === client.login
          ? { ...item, balance: Number((item.balance + tradeProfit).toFixed(2)) }
          : item));
      } else {
        setOpenTrades((prev) => [newTrade, ...prev]);
      }

      if (dbStatus.connected) {
        api.placeTrade({
          companyId: currentCompany,
          userId: client.userId,
          tradingAccountId: client.tradingAccountId,
          symbol: symbolObj.symbol,
          side: order.type,
          lots: order.lots,
          openPrice,
          closePrice,
          status: isClosedHistoricalTrade ? "closed" : "open",
          createdAt: order.openTime,
          closedAt: order.closeTime,
          stopLoss: order.sl || null,
          takeProfit: order.tp || null,
          comment: order.comment || "Manager Terminal Exec",
        }).catch((err) => console.error("Place trade API failed:", err));
      }

      addToast(
        "success",
        isClosedHistoricalTrade ? "Historical Trade Added" : "Order Executed",
        `#${ticket} ${order.type} ${order.lots} ${symbolObj.symbol} @ ${openPrice}`
      );
      return true;
    },
    [clients, symbols, currentCompany, dbStatus.connected, addToast]
  );

  const closeTrade = useCallback(
    async (ticket: number) => {
      const trade = openTrades.find((t) => t.ticket === ticket);
      if (!trade) return;

      const now = new Date().toISOString().replace("T", " ").substring(0, 19);
      const closedTrade: Trade = {
        ...trade,
        closePrice: trade.currentPrice,
        closeTime: now,
        status: "CLOSED",
        comment: `${trade.comment || ""} [Closed by Manager]`,
      };

      setOpenTrades((prev) => prev.filter((t) => t.ticket !== ticket));
      setClosedTrades((prev) => [closedTrade, ...prev]);

      setClients((prev) =>
        prev.map((c) => {
          if (c.login === trade.login) {
            const newBal = Number((c.balance + trade.profit).toFixed(2));
            return { ...c, balance: newBal };
          }
          return c;
        })
      );

      if (dbStatus.connected) {
        try {
          await api.closeTrade(ticket, {
            companyId: currentCompany,
            closePrice: trade.currentPrice,
            profit: trade.profit,
          });
        } catch (err: any) {
          console.error("API close trade failed:", err);
        }
      }

      addToast(
        trade.profit >= 0 ? "success" : "info",
        "Trade Closed",
        `Ticket #${ticket} closed at ${trade.currentPrice} with P&L: $${trade.profit > 0 ? "+" : ""}${trade.profit}`
      );
    },
    [openTrades, currentCompany, dbStatus.connected, addToast]
  );

  const closeAllTrades = useCallback(
    async (onlyProfitable = false) => {
      const tradesToClose = onlyProfitable
        ? openTrades.filter((t) => t.profit > 0)
        : [...openTrades];

      if (tradesToClose.length === 0) {
        addToast("info", "No Trades", "No eligible open positions found.");
        return;
      }

      tradesToClose.forEach((t) => closeTrade(t.ticket));

      if (dbStatus.connected) {
        try {
          await api.closeAllTrades(currentCompany, onlyProfitable);
        } catch (err: any) {
          console.error("API close all trades failed:", err);
        }
      }

      addToast("success", "Bulk Action Completed", `Closed ${tradesToClose.length} position(s).`);
    },
    [openTrades, closeTrade, currentCompany, dbStatus.connected, addToast]
  );

  const adjustClientBalance = useCallback(
    async (login: number, amount: number, isCredit = false) => {
      setClients((prev) =>
        prev.map((c) => {
          if (c.login === login) {
            if (isCredit) {
              const newCredit = Math.max(0, Number((c.credit + amount).toFixed(2)));
              const diff = Number((newCredit - c.credit).toFixed(2));
              return {
                ...c,
                credit: newCredit,
                equity: Number((c.equity + diff).toFixed(2)),
                freeMargin: Number((c.freeMargin + diff).toFixed(2)),
              };
            } else {
              const newBal = Math.max(0, Number((c.balance + amount).toFixed(2)));
              const diff = Number((newBal - c.balance).toFixed(2));
              return {
                ...c,
                balance: newBal,
                equity: Number((c.equity + diff).toFixed(2)),
                freeMargin: Number((c.freeMargin + diff).toFixed(2)),
              };
            }
          }
          return c;
        })
      );

      if (isCredit && amount > 0) {
        const clientObj = clients.find((c) => c.login === login);
        const now = new Date().toISOString().replace("T", " ").substring(0, 19);
        const bonusRecord: Deposit = {
          id: `bon-${Date.now()}`,
          login,
          clientName: clientObj?.name || `Trader #${login}`,
          amount: 0,
          bonusAmount: amount,
          currency: "USD",
          method: "Credit Card",
          txHash: `BONUS-CREDIT-#${login}`,
          status: "APPROVED",
          createdAt: now,
          processedAt: now,
          notes: "Manager Credit Bonus",
        };
        setDeposits((prev) => [bonusRecord, ...prev]);
      }

      if (dbStatus.connected) {
        try {
          const clientObj = clients.find((c) => c.login === login);
          await api.adjustClientBalance(login, {
            companyId: currentCompany,
            amount,
            isCredit,
            userId: clientObj?.userId,
            tradingAccountId: clientObj?.tradingAccountId,
          });
        } catch (err: any) {
          console.error("API adjust balance failed:", err);
        }
      }

      addToast(
        "success",
        isCredit ? "Bonus / Credit Updated" : "Balance Adjusted",
        `Account #${login} adjusted by ${amount >= 0 ? "+" : ""}$${amount} (${isCredit ? "Credit Bonus" : "Balance"})`
      );
    },
    [clients, currentCompany, dbStatus.connected, addToast]
  );

  const toggleClientStatus = useCallback(
    async (login: number) => {
      setClients((prev) =>
        prev.map((c) => {
          if (c.login === login) {
            const nextStatus = c.status === "Active" ? "Suspended" : "Active";
            return { ...c, status: nextStatus };
          }
          return c;
        })
      );

      if (dbStatus.connected) {
        try {
          const clientObj = clients.find((c) => c.login === login);
          await api.toggleClientStatus(login, {
            companyId: currentCompany,
            userId: clientObj?.userId,
          });
        } catch (err: any) {
          console.error("API toggle client status failed:", err);
        }
      }

      addToast("info", "Status Updated", `Client #${login} status toggled.`);
    },
    [clients, currentCompany, dbStatus.connected, addToast]
  );

  const updateClient = useCallback(
    async (login: number, updatedFields: Partial<Client>) => {
      setClients((prev) =>
        prev.map((c) => (c.login === login ? { ...c, ...updatedFields } : c))
      );
      setSelectedClient((prev) =>
        prev && prev.login === login ? { ...prev, ...updatedFields } : prev
      );

      if (dbStatus.connected) {
        try {
          const clientObj = clients.find((c) => c.login === login);
          await api.updateClient(login, {
            companyId: currentCompany,
            userId: clientObj?.userId,
            ...updatedFields,
          });
        } catch (err: any) {
          console.error("API update client failed:", err);
        }
      }

      addToast(
        "success",
        "Account Updated",
        `Account #${login} information saved successfully.`
      );
    },
    [currentCompany, dbStatus.connected, addToast]
  );

  const toggleSymbolEnabled = useCallback(
    async (symbolId: string) => {
      setSymbols((prev) =>
        prev.map((s) => (s.id === symbolId ? { ...s, enabled: !s.enabled } : s))
      );

      if (dbStatus.connected) {
        try {
          await api.toggleSymbolEnabled(symbolId, { companyId: currentCompany });
        } catch (err: any) {
          console.error("API toggle symbol failed:", err);
        }
      }

      addToast("info", "Symbol Updated", "Symbol trading permission modified.");
    },
    [currentCompany, dbStatus.connected, addToast]
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<BrokerSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));

      if (dbStatus.connected) {
        try {
          await api.updateSettings(currentCompany, newSettings);
        } catch (err: any) {
          console.error("API update settings failed:", err);
        }
      }

      addToast("success", "Settings Saved", "Broker configurations updated successfully.");
    },
    [currentCompany, dbStatus.connected, addToast]
  );

  const setCompany = useCallback(
    (newCompanyId: CompanyId) => {
      if (newCompanyId === currentCompany) return;

      setCurrentCompany(newCompanyId);
      setSelectedClient(null);
      localStorage.setItem("MT5_PORTAL_ACTIVE_COMPANY", newCompanyId);

      const targetComp = COMPANIES[newCompanyId];
      addToast(
        "info",
        `Switched to ${targetComp.name}`,
        `Connected to ${targetComp.fullName} (${targetComp.serverName})`
      );
    },
    [currentCompany, loadCompanyData, addToast]
  );

  const refreshDbData = useCallback(async () => {
    await loadCompanyData(currentCompany, true);
  }, [currentCompany, loadCompanyData]);

  const resetAllData = useCallback(() => {
    loadCompanyData(currentCompany, true);
    addToast("info", "Data Refreshed", `Reloaded ${COMPANIES[currentCompany].name} records.`);
  }, [currentCompany, loadCompanyData, addToast]);

  const resetPendingDeposits = useCallback(() => {
    loadCompanyData(currentCompany, true);
    addToast(
      "info",
      "Deposits Refreshed",
      `Fetched latest deposits for ${COMPANIES[currentCompany].name}.`
    );
  }, [currentCompany, loadCompanyData, addToast]);

  return (
    <PortalContext.Provider
      value={{
        dbStatus,
        isDbLoading,
        refreshDbData,
        isAuthenticated,
        currentUser,
        login,
        logout,
        currentCompany,
        setCompany,
        companyConfig: COMPANIES[currentCompany],
        companies: Object.values(COMPANIES),
        activeTab,
        setActiveTab,
        symbols,
        clients,
        openTrades,
        closedTrades,
        deposits,
        withdrawals,
        kycVerifications,
        settings,
        globalSearch,
        setGlobalSearch,
        selectedClient,
        setSelectedClient,
        toasts,
        addToast,
        removeToast,
        selectedPeriod,
        setSelectedPeriod,
        showMonthlyTable,
        setShowMonthlyTable,
        approveDeposit,
        rejectDeposit,
        approveWithdrawal,
        rejectWithdrawal,
        approveKyc,
        rejectKyc,
        placeOrder,
        closeTrade,
        closeAllTrades,
        adjustClientBalance,
        toggleClientStatus,
        updateClient,
        toggleSymbolEnabled,
        updateSettings,
        resetAllData,
        resetPendingDeposits,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortal must be used within a PortalProvider");
  }
  return context;
};
