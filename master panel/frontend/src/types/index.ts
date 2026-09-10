export type ClientGroup = "Standard" | "Raw ECN" | "VIP Pro" | "Cent";
export type ClientStatus = "Active" | "Inactive" | "Suspended" | "Deactive";
export type KycStatus = "Verified" | "Pending" | "Unverified";
export type AccountType = "Live" | "Demo";

export interface Client {
  id: string;
  login: number;
  userId?: number;
  tradingAccountId?: number;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  country: string;
  accountType: AccountType;
  balance: number;
  credit: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  leverage: string;
  group: ClientGroup;
  status: ClientStatus;
  kycStatus: KycStatus;
  registeredAt: string;
  lastLogin: string;
  verification?: any;
  registeredDate?: string;
  assignedAgent?: string | null;
}

export type SymbolCategory = "Forex" | "Metals" | "Crypto" | "Crypto CFD" | "Indices" | "Energies" | "Popular";

export interface SymbolData {
  id: string;
  symbol: string;
  category: SymbolCategory;
  bid: number;
  ask: number;
  spread: number;
  digits: number;
  contractSize: number;
  minLot: number;
  maxLot: number;
  swapLong: number;
  swapShort: number;
  enabled: boolean;
  dailyChange: number;
  changeDirection?: "up" | "down" | "neutral";
  popular?: boolean;
}

export type TradeType = "BUY" | "SELL";
export type TradeStatus = "OPEN" | "CLOSED";

export interface Trade {
  ticket: number;
  login: number;
  clientName: string;
  symbol: string;
  type: TradeType;
  lots: number;
  openPrice: number;
  currentPrice: number;
  sl: number | null;
  tp: number | null;
  swap: number;
  commission: number;
  profit: number;
  openTime: string;
  closePrice?: number;
  closeTime?: string;
  status: TradeStatus;
  comment?: string;
  pipChange?: number;
}

export type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DepositSlipData {
  senderName?: string;
  bankName?: string;
  accountNumber?: string;
  referenceNumber?: string;
  transferDate?: string;
  slipAmount?: number;
  feeDeducted?: number;
  network?: string;
  beneficiaryAccount?: string;
  notes?: string;
}

export interface Deposit {
  id: string;
  login: number;
  clientName: string;
  amount: number;
  originalAmount?: number;
  currency: string;
  method: "USDT (TRC-20)" | "Bank Wire" | "Credit Card" | "Skrill" | "Bitcoin";
  txHash: string;
  status: PaymentStatus;
  createdAt: string;
  processedAt?: string;
  notes?: string;
  slipUrl?: string;
  slipData?: DepositSlipData;
  adjustmentReason?: string;
  bonusAmount?: number;
}

export interface Withdrawal {
  id: string;
  login: number;
  clientName: string;
  amount: number;
  currency: string;
  method: "USDT (TRC-20)" | "Bank Wire" | "Crypto Wallet" | "Local Bank";
  destination: string;
  status: PaymentStatus;
  createdAt: string;
  processedAt?: string;
  reason?: string;
}

export interface KycVerification {
  id: string;
  login: number;
  clientName: string;
  email: string;
  country: string;
  docType: "National ID" | "Passport" | "Driving License";
  docNumber: string;
  idFrontUrl: string;
  idBackUrl?: string;
  addressProofUrl: string;
  status: PaymentStatus | "UNVERIFIED";
  submittedAt: string;
  updatedAt?: string;
  rejectionReason?: string;
}

export interface BrokerSettings {
  serverName: string;
  brokerBrand: string;
  serverStatus: "LIVE" | "DEMO" | "MAINTENANCE";
  pingMs: number;
  marginCall: number;
  stopOut: number;
  defaultLeverage: string;
  soundAlerts: boolean;
  autoApproveVerifiedDeposits: boolean;
  adminUser: {
    name: string;
    role: string;
    email: string;
  };
}

export type ActiveNavTab =
  | "dashboard"
  | "market-symbols"
  | "market-trade"
  | "clients-all"
  | "clients-active"
  | "clients-verified"
  | "payments"
  | "payments-deposits"
  | "payments-withdrawals"
  | "verification"
  | "trading"
  | "trading-open"
  | "trading-history"
  | "settings"
  | "settings-assign-users"
  | "settings-deposit-methods"
  | "settings-referral-rewards"
  | "settings-referral-code"
  | "settings-staff-permissions"
  | "settings-symbol-settings"
  | "settings-broker-gateway";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "MANAGER" | "AGENT";
  permissions: string[];
  joinedDate: string;
}

export type DepositMethodType = "TRC20" | "BEP20" | "ERC20" | "Bank Transfer" | "Polygon" | "BTC";

export interface DepositMethodAddress {
  id: string;
  method: DepositMethodType;
  label: string;
  address: string;
  qrData?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ReferralReward {
  id: string;
  referrerCode: string;
  referrerName: string;
  referrerLogin?: number;
  refereeName: string;
  refereeEmail: string;
  depositAmount: number;
  rewardAmount: number;
  ratePercent: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  approvedAt?: string;
}

export interface AgentOption {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface UserAgentAssignment {
  login: number;
  agentId: string;
  agentName: string;
  assignedBy: string;
  assignedAt: string;
}

export type CompanyId = "novafxm" | "a5markets" | "veltriumfx";

export interface CompanyConfig {
  id: CompanyId;
  name: string;
  brand: string;
  fullName: string;
  serverName: string;
  tagline: string;
  themeColor: "gold" | "teal" | "forest";
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  initials: string;
  logoUrl?: string;
  currency: string;
  defaultLeverage: string;
  primaryColor: string;
  avatarGradient: string;
  statusDotColor: string;
}

export interface AdminNotificationItem {
  id: string;
  type: "new_user" | "new_deposit" | "new_withdrawal" | "kyc_submitted" | "bank_account_pending" | "user_notification";
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  targetTab?: ActiveNavTab;
}
