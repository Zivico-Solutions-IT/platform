import { useEffect, useMemo, useState } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  CheckCircle2,
  Clock3,
  CreditCard,
  Plus,
  Gift,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react-native';
import CustomButton from '../src/components/common/CustomButton';
import LoadingSpinner, { LOADING_SPINNER_MIN_MS } from '../src/components/common/LoadingSpinner';
import DepositForm from '../src/components/wallet/DepositForm';
import WithdrawForm from '../src/components/wallet/WithdrawForm';
import TransactionList from '../src/components/wallet/TransactionList';
import DashboardTabs from '../src/components/layout/DashboardTabs';
import { dashboardService } from '../src/services/dashboardService';
import { walletService } from '../src/services/walletService';
import { useAuth } from '../src/hooks/useAuth';
import { useWallet } from '../src/hooks/useWallet';
import { useAppTheme } from '../src/context/ThemeContext';
import { dateTime, money, transactionTypeLabel } from '../src/utils/formatters';
import { storage } from '../src/utils/storage';

const DEMO_ACCOUNT_LIMIT = 2;
const LIVE_ACCOUNT_LIMIT = 3;

function Card({ title, subtitle, children, colors, mobile = false }) {
  return (
    <View className={`${mobile ? 'p-4' : 'p-5'} rounded-2xl border`} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
      <View className={mobile ? 'mb-4' : 'mb-5'}>
        <Text className={`${mobile ? 'text-lg' : 'text-xl'} font-medium`} style={{ color: colors.text }}>{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm" style={{ color: colors.muted }}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Stat({ label, value, colors, mobile = false }) {
  return (
    <View className="flex-1 rounded-xl border p-4" style={{ minWidth: mobile ? '48%' : 150, backgroundColor: colors.surface, borderColor: colors.border }}>
      <Text className="text-xs font-semimedium uppercase" style={{ color: colors.muted }}>{label}</Text>
      <Text className={`${mobile ? 'text-base' : 'text-xl'} mt-2 font-medium`} numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.text }}>{value}</Text>
    </View>
  );
}

function accountNumber(account) {
  return String(Number(account?.id || 0) + 4999).padStart(6, '0');
}

function AccountCard({ account, colors, mobile = false }) {
  const active = account.status === 'active';
  const demo = account.type === 'Demo';
  const tone = active ? '#12cf7a' : '#D4AF37';
  const openTradingAccount = () => {
    if (active) router.push(`/trading?accountId=${account.id}`);
  };

  return (
    <View className={`${mobile ? 'p-4' : 'p-5'} flex-1 rounded-2xl border`} style={{ minWidth: mobile ? '100%' : 260, backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="mb-5 flex-row items-start justify-between">
        <View className="min-w-0 flex-1 flex-row items-center pr-3">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: demo ? '#D4AF3722' : '#12cf7a22' }}>
            {demo ? <Wallet size={21} color="#D4AF37" /> : <ShieldCheck size={21} color="#12cf7a" />}
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-medium" numberOfLines={1} style={{ color: colors.text }}>{account.name}</Text>
            <Text className="mt-1 text-xs" style={{ color: colors.muted }}>Account ID : {accountNumber(account)}</Text>
          </View>
        </View>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${tone}1f` }}>
          <Text className="text-xs font-medium" style={{ color: tone }}>{account.status || 'active'}</Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <View className="flex-1 rounded-xl border p-3" style={{ minWidth: mobile ? '100%' : 130, backgroundColor: colors.panel, borderColor: colors.border }}>
          <Text className="text-xs font-semimedium uppercase" style={{ color: colors.muted }}>Balance</Text>
          <Text className="mt-2 text-lg font-medium" style={{ color: colors.text }}>{Number(account.balance || 0).toFixed(2)} {account.currency || 'USD'}</Text>
        </View>
        <View className="rounded-xl border p-3" style={{ minWidth: mobile ? '100%' : 110, backgroundColor: colors.panel, borderColor: colors.border }}>
          <Text className="text-xs font-semimedium uppercase" style={{ color: colors.muted }}>Type</Text>
          <Text className="mt-2 text-lg font-medium" style={{ color: colors.text }}>{account.type}</Text>
        </View>
      </View>

      <Pressable
        onPress={openTradingAccount}
        disabled={!active}
        className={`mt-4 flex-row items-center justify-between border-t pt-4 ${active ? '' : 'opacity-70'}`}
        style={{ borderColor: colors.border }}
      >
        <View className="min-w-0 flex-1 flex-row items-center pr-2">
          {active ? <CheckCircle2 size={16} color="#12cf7a" /> : <Clock3 size={16} color="#D4AF37" />}
          <Text className="ml-2 text-xs font-semimedium" numberOfLines={1} style={{ color: colors.muted }}>{active ? 'Ready for trading' : 'Waiting for activation'}</Text>
        </View>
        <ArrowUpRight size={17} color={active ? '#D4AF37' : '#8fa0bb'} />
      </Pressable>
    </View>
  );
}

function AccountGroup({ title, subtitle, accounts, emptyText, colors, mobile = false }) {
  return (
    <View className="rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="mb-4">
        <Text className="text-lg font-medium" style={{ color: colors.text }}>{title}</Text>
        <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{subtitle}</Text>
      </View>
      <View className="flex-row flex-wrap gap-4">
        {accounts.map((account) => <AccountCard key={account.id} account={account} colors={colors} mobile={mobile} />)}
        {!accounts.length ? (
          <View className="w-full items-center rounded-2xl border border-dashed p-8" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
            <Plus size={26} color="#D4AF37" />
            <Text className="mt-3 text-lg font-medium" style={{ color: colors.text }}>{emptyText}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function EmptyActivity({ title, description, colors }) {
  return (
    <View className="rounded-xl border border-dashed p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <Text className="font-medium" style={{ color: colors.text }}>{title}</Text>
      <Text className="mt-1 text-sm" style={{ color: colors.muted }}>{description}</Text>
    </View>
  );
}

function TradeActivityList({ trades = [], colors }) {
  return (
    <View>
      {trades.length ? trades.map((trade) => {
        const profit = Number(trade.profit || 0);
        const isProfit = profit >= 0;
        const sideColor = trade.side === 'BUY' ? colors.success : colors.danger;
        const profitColor = isProfit ? colors.success : colors.danger;
        return (
          <View key={trade.id} className="mb-3 rounded-xl border p-4 relative overflow-hidden" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            {/* Accent indicator on left */}
            <View className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: sideColor }} />
            <View className="pl-1.5">
              {/* Header: Symbol, Side, Profit */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold" style={{ color: colors.text }}>
                    {trade.symbol}
                  </Text>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: sideColor + '15' }}>
                    <Text className="text-[10px] font-bold uppercase" style={{ color: sideColor }}>
                      {trade.side}
                    </Text>
                  </View>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.border + '30' }}>
                    <Text className="text-[10px] font-semibold capitalize" style={{ color: colors.muted }}>
                      {trade.status}
                    </Text>
                  </View>
                </View>
                <Text className="text-base font-bold" style={{ color: profitColor }}>
                  {isProfit ? '+' : ''}${money(profit)}
                </Text>
              </View>

              {/* Thin separator */}
              <View className="my-2.5 h-[1px]" style={{ backgroundColor: colors.border + '40' }} />

              {/* Grid detail row 1 */}
              <View className="flex-row justify-between mb-2">
                <View>
                  <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.muted }}>Lots</Text>
                  <Text className="text-xs font-semibold mt-0.5" style={{ color: colors.text }}>{Number(trade.lots || 0)} lots</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.muted }}>Date</Text>
                  <Text className="text-[10px] font-medium mt-0.5" style={{ color: colors.muted }}>{dateTime(trade.createdAt)}</Text>
                </View>
              </View>

              {/* Grid detail row 2 */}
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.muted }}>Open Price</Text>
                  <Text className="text-xs font-medium mt-0.5" style={{ color: colors.text }}>
                    {Number(trade.openPrice || 0).toFixed(5).replace(/\.?0+$/, '')}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.muted }}>Close Price</Text>
                  <Text className="text-xs font-medium mt-0.5" style={{ color: colors.text }}>
                    {trade.closePrice ? Number(trade.closePrice).toFixed(5).replace(/\.?0+$/, '') : '-'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      }) : (
        <EmptyActivity
          title="No live trades yet"
          description="Live account trades will appear here after orders are opened from a Live account."
          colors={colors}
        />
      )}
    </View>
  );
}

function LiveTransactionActivityList({ transactions = [], colors }) {
  return (
    <View>
      {transactions.length ? transactions.map((item) => {
        const status = item.status?.toLowerCase();
        const isApproved = ['approved', 'completed', 'success'].includes(status);
        const isRejected = ['rejected', 'failed', 'cancelled'].includes(status);
        const statusColor = isApproved ? colors.success : isRejected ? colors.danger : colors.primary;
        
        const isDeposit = item.type?.toLowerCase().includes('deposit') || item.type?.toLowerCase().includes('add');
        const sign = isDeposit ? '+' : '-';
        const amountColor = isDeposit ? colors.success : colors.danger;
        const Icon = isDeposit ? ArrowDownRight : ArrowUpRight;
        
        return (
          <View key={item.id} className="mb-3 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                {/* Icon Circle */}
                <View className="h-10 w-10 rounded-full items-center justify-center" style={{ backgroundColor: amountColor + '15' }}>
                  <Icon size={20} color={amountColor} />
                </View>
                <View>
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                    {transactionTypeLabel(item.type, item.note)}
                  </Text>
                  <Text className="text-[10px] mt-0.5" style={{ color: colors.muted }}>
                    {dateTime(item.createdAt)}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-sm font-bold" style={{ color: amountColor }}>
                  {sign}${money(item.amount)}
                </Text>
                <View className="px-2 py-0.5 rounded-full mt-1.5" style={{ backgroundColor: statusColor + '15' }}>
                  <Text className="text-[9px] font-bold capitalize" style={{ color: statusColor }}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      }) : (
        <EmptyActivity
          title="No live transactions yet"
          description="Approved deposits, withdrawals, balance updates, and live trade results will appear here."
          colors={colors}
        />
      )}
    </View>
  );
}

function ActivitySelector({ active, tradesCount, transactionsCount, onChange, colors }) {
  const items = [
    { key: 'trades', label: 'Trades', count: tradesCount },
    { key: 'transactions', label: 'Transactions', count: transactionsCount },
  ];
  return (
    <View className="mb-4 flex-row rounded-xl border p-1" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      {items.map((item) => {
        const selected = active === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            className="flex-1 flex-row items-center justify-center rounded-lg px-3 py-2"
            style={{ backgroundColor: selected ? colors.primary : 'transparent' }}
          >
            <Text className="text-sm font-medium" style={{ color: selected ? '#0B0B0B' : colors.text }}>{item.label}</Text>
            <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: selected ? 'rgba(11,11,11,0.12)' : colors.panel }}>
              <Text className="text-[10px] font-medium" style={{ color: selected ? '#0B0B0B' : colors.muted }}>{item.count}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function LiveActivityPanel({ activeView, onChangeView, trades, transactions, colors }) {
  return (
    <View>
      <ActivitySelector
        active={activeView}
        tradesCount={trades.length}
        transactionsCount={transactions.length}
        onChange={onChangeView}
        colors={colors}
      />
      <View className="rounded-2xl border" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          className="max-h-[440px]"
          contentContainerClassName="p-3"
        >
          {activeView === 'trades'
            ? <TradeActivityList trades={trades} colors={colors} />
            : <LiveTransactionActivityList transactions={transactions} colors={colors} />}
        </ScrollView>
      </View>
      </View>
  );
}

function CreateAccountConfirm({ type, loading, onCancel, onConfirm, colors }) {
  return (
    <Modal visible={Boolean(type)} transparent animationType="fade" onRequestClose={loading ? undefined : onCancel}>
      <View className="flex-1 items-center justify-center bg-medium/70 p-5">
        <View className="w-full max-w-[420px] rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.primary }}>
          <Text className="text-xl font-medium" style={{ color: colors.text }}>Create {type || ''} account?</Text>
          <Text className="mt-2 text-sm leading-5" style={{ color: colors.muted }}>
            Please verify this action. The {String(type || '').toLowerCase()} account will be created only after you confirm.
          </Text>
          <View className="mt-5 flex-row flex-wrap gap-3">
            <CustomButton title={loading ? 'Creating...' : 'Verify & Create'} onPress={onConfirm} loading={loading} disabled={loading} className="min-w-[170px]" />
            <CustomButton title="Cancel" variant="secondary" onPress={onCancel} disabled={loading} className="min-w-[120px]" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NotificationRow({ Icon, title, body, time, tone, colors, read, onPress }) {
  return (
    <Pressable onPress={onPress} className="flex-row border-b px-4 py-3" style={{ borderColor: colors.border, opacity: read ? 0.68 : 1 }}>
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${tone}22` }}>
        <Icon size={17} color={tone} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium" numberOfLines={1} style={{ color: colors.text }}>{title}</Text>
        <Text className="mt-1 text-xs" numberOfLines={2} style={{ color: colors.muted }}>{body}</Text>
        <Text className="mt-2 text-[10px] font-medium uppercase" numberOfLines={1} style={{ color: colors.muted }}>{time}</Text>
      </View>
    </Pressable>
  );
}

function DashboardNotificationMenu({ notifications, readIds, unreadCount, colors, onClose, onReadAll }) {
  return (
    <View className="w-[380px] max-w-[92vw] overflow-hidden rounded-2xl border shadow-2xl" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
      <View className="flex-row items-center justify-between border-b px-4 py-3" style={{ borderColor: colors.border }}>
        <View>
          <Text className="text-base font-medium" style={{ color: colors.text }}>Notifications</Text>
          <Text className="text-xs" style={{ color: colors.muted }}>{unreadCount} unread</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => onReadAll?.(notifications.map((item) => item.id))} className="rounded-lg px-3 py-2" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xs font-medium" style={{ color: colors.primary }}>Read all</Text>
          </Pressable>
          <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: colors.surface }}>
            <X size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <ScrollView style={{ maxHeight: 430 }} showsVerticalScrollIndicator={false}>
        {notifications.length ? notifications.map((item) => (
          <NotificationRow
            key={item.id}
            colors={colors}
            read={readIds.includes(item.id)}
            {...item}
            onPress={() => {
              onReadAll?.([item.id]);
              item.onPress?.();
            }}
          />
        )) : (
          <Text className="p-5 text-sm" style={{ color: colors.muted }}>No account notifications yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const reviewedStatuses = ['approved', 'completed', 'rejected'];
const notificationDate = (value) => (value ? dateTime(value) : 'Recent update');
const notificationTimestamp = (...values) => {
  for (const value of values) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};
const statusWord = (status) => (['approved', 'completed'].includes(status) ? 'Approved' : 'Rejected');

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const { user, logout, loading: authLoading } = useAuth();
  const { colors } = useAppTheme();
  const { deposit, withdraw, loading: walletLoading } = useWallet();
  const [activeSection, setActiveSection] = useState(String(params.section || 'overview'));
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [pendingAccountType, setPendingAccountType] = useState(null);
  const [accountCreating, setAccountCreating] = useState(false);
  const [activityView, setActivityView] = useState('trades');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [splashDone, setSplashDone] = useState(false);
  const [showBirthdayBonusPopup, setShowBirthdayBonusPopup] = useState(false);
  const [claimingBirthdayBonus, setClaimingBirthdayBonus] = useState(false);
  const mobile = width < 640;

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), LOADING_SPINNER_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  const loadDashboard = async ({ silent = false } = {}) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const db = await dashboardService.getDashboard();
      setDashboard(db);
      if (db?.canClaimBirthdayBonus && !silent) {
        setShowBirthdayBonusPopup(true);
      }
      setAccountError('');
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        await logout();
        router.replace('/login');
        return;
      }
      setAccountError(requestError.response?.data?.message || 'Dashboard could not be loaded.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    loadDashboard().catch(() => {});
    const timer = setInterval(() => {
      loadDashboard({ silent: true }).catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, [authLoading, user]);

  useEffect(() => {
    if (params.section) setActiveSection(String(params.section));
  }, [params.section]);

  useEffect(() => {
    if (!user?.id) {
      setReadNotificationIds([]);
      return;
    }
    storage.get(`read_notifications_${user.id}`, [])
      .then((ids) => setReadNotificationIds(Array.isArray(ids) ? ids : []))
      .catch(() => {});
  }, [user?.id]);

  const wallet = dashboard?.wallet || user?.wallet || {};
  const dashboardUser = dashboard?.user || user;
  const withdrawalLocked = Boolean(dashboardUser && dashboardUser.verificationStatus !== 'approved');
  const withdrawalLockedMessage = 'Verification approval is required before withdrawals.';
  const referral = dashboard?.referral || {};
  const accounts = dashboard?.accounts || [];
  const demoAccounts = accounts.filter((account) => account.type === 'Demo');
  const liveAccounts = accounts.filter((account) => account.type === 'Live');
  const demoAccountCount = demoAccounts.length;
  const liveAccountCount = liveAccounts.length;
  const transactions = dashboard?.transactions || [];
  const liveTrades = dashboard?.liveTrades || [];
  const depositTransactions = transactions.filter((item) => item.type === 'deposit');
  const bankAccounts = dashboard?.bankAccounts || [];
  const referrals = referral.referrals || [];
  const referralText = useMemo(() => referral.url || '', [referral.url]);
  const notifications = useMemo(() => {
    const items = [];
    const reviewedVerification = ['approved', 'rejected'].includes(dashboardUser?.verificationStatus);
    if (reviewedVerification) {
      const approved = dashboardUser.verificationStatus === 'approved';
      const notificationAt = dashboardUser.verificationReviewedAt || dashboardUser.updatedAt || dashboardUser.createdAt;
      items.push({
        id: `verification-${dashboardUser.verificationStatus}`,
        Icon: approved ? CheckCircle2 : AlertTriangle,
        title: `Verification ${approved ? 'Approved' : 'Rejected'}`,
        body: approved
          ? 'Your account verification has been approved.'
          : 'Your account verification was rejected. Please upload clear documents again.',
        sortAt: notificationTimestamp(notificationAt),
        time: notificationDate(notificationAt),
        tone: approved ? colors.success : colors.danger,
        onPress: () => {
          setNotificationsOpen(false);
          router.push('/trading?panel=verification');
        },
      });
    }
    transactions
      .filter((item) => ['deposit', 'withdrawal'].includes(item.type) && reviewedStatuses.includes(item.status))
      .forEach((item) => {
        const approved = ['approved', 'completed'].includes(item.status);
        const label = item.type === 'deposit' ? 'Deposit' : 'Withdrawal';
        const notificationAt = item.reviewedAt || item.updatedAt || item.createdAt;
        items.push({
          id: `${item.type}-${item.id}`,
          Icon: approved ? CheckCircle2 : AlertTriangle,
          title: `${label} ${statusWord(item.status)}`,
          body: `${label} request for ${money(item.amount)} USD was ${approved ? 'approved' : 'rejected'}.`,
          sortAt: notificationTimestamp(notificationAt),
          time: notificationDate(notificationAt),
          tone: approved ? colors.success : colors.danger,
          onPress: () => {
            setNotificationsOpen(false);
            router.push('/trading?panel=history');
          },
        });
      });
    bankAccounts
      .filter((item) => ['approved', 'rejected'].includes(item.status))
      .forEach((item) => {
        const approved = item.status === 'approved';
        const payoutType = String(`${item.bankName || ''} ${item.branchName || ''}`).toLowerCase().includes('trc20') ? 'TRC20' : 'Bank';
        const notificationAt = item.reviewedAt || item.updatedAt || item.createdAt;
        items.push({
          id: `bank-${item.id}`,
          Icon: CreditCard,
          title: `${payoutType} Details ${approved ? 'Approved' : 'Rejected'}`,
          body: approved
            ? `${payoutType} withdrawal details are approved for future withdrawals.`
            : `${payoutType} withdrawal details were rejected. Please edit and resubmit.`,
          sortAt: notificationTimestamp(notificationAt),
          time: notificationDate(notificationAt),
          tone: approved ? colors.success : colors.danger,
          onPress: () => {
            setNotificationsOpen(false);
            router.push('/trading?panel=settings&section=payments');
          },
        });
      });

    const birthdayBonusTx = transactions.find((item) => item.referenceType === 'birthday_bonus');
    if (birthdayBonusTx) {
      items.push({
        id: `birthday-bonus-claimed`,
        Icon: Gift,
        title: 'Happy Birthday!',
        body: `Wishing you a fantastic day! A $${birthdayBonusTx.amount.toFixed(2)} Birthday Bonus has been added to your wallet.`,
        sortAt: notificationTimestamp(birthdayBonusTx.createdAt),
        time: notificationDate(birthdayBonusTx.createdAt),
        tone: colors.success,
        onPress: () => {
          setNotificationsOpen(false);
          router.push('/trading?panel=history');
        },
      });
    }

    return items.sort((a, b) => b.sortAt - a.sortAt).slice(0, 12);
  }, [bankAccounts, colors.danger, colors.success, dashboardUser, transactions]);
  const unreadNotificationCount = notifications.filter((item) => !readNotificationIds.includes(item.id)).length;
  const readAllNotifications = (ids = notifications.map((item) => item.id)) => {
    const next = Array.from(new Set([...readNotificationIds, ...ids]));
    setReadNotificationIds(next);
    if (user?.id) storage.set(`read_notifications_${user.id}`, next).catch(() => {});
  };

  const askCreateAccount = (type) => {
    setAccountError('');
    setPendingAccountType(type);
  };

  const createAccount = async () => {
    const type = pendingAccountType;
    if (!type) return;
    setAccountError('');
    if (!user) {
      router.replace('/login');
      return;
    }
    setAccountCreating(true);
    try {
      await dashboardService.createAccount(type, true);
      setPendingAccountType(null);
      await loadDashboard();
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        await logout();
        router.replace('/login');
        return;
      }
      setAccountError(requestError.response?.data?.message || 'Account could not be created.');
    } finally {
      setAccountCreating(false);
    }
  };

  const claimBirthdayBonus = async () => {
    setClaimingBirthdayBonus(true);
    try {
      await walletService.claimBirthdayBonus();
      setShowBirthdayBonusPopup(false);
      alert('Happy Birthday! $200 Bonus has been added to your wallet.');
      await loadDashboard({ silent: true });
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to claim bonus.');
    } finally {
      setClaimingBirthdayBonus(false);
    }
  };

  const copyReferral = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && referralText) {
      await navigator.clipboard.writeText(referralText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  if (authLoading || !user || !splashDone) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="mx-auto w-full max-w-[1180px] p-3 sm:p-4 lg:p-8">
      <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className={`${mobile ? 'text-2xl' : 'text-3xl'} font-medium`} style={{ color: colors.text }}>Account Dashboard</Text>
          <Text className="mt-1" style={{ color: colors.muted }}>{user?.email || 'Manage accounts, funds, and rewards'}</Text>
        </View>
        <View className="relative flex-row flex-wrap items-center justify-end gap-3">
          <Pressable
            onPress={() => setNotificationsOpen((current) => !current)}
            className="relative h-10 w-10 items-center justify-center rounded-xl border"
            style={{ backgroundColor: colors.panel, borderColor: colors.border }}
          >
            <Bell size={18} color={colors.text} />
            {unreadNotificationCount ? (
              <Text className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-danger px-1 text-center text-[10px] font-medium text-white">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </Text>
            ) : null}
          </Pressable>
          <Modal visible={notificationsOpen} transparent animationType="fade" onRequestClose={() => setNotificationsOpen(false)}>
            <Pressable className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.12)' }} onPress={() => setNotificationsOpen(false)}>
              <View className="absolute right-4 top-16">
                <Pressable onPress={(event) => event.stopPropagation?.()}>
                  <DashboardNotificationMenu notifications={notifications} readIds={readNotificationIds} unreadCount={unreadNotificationCount} colors={colors} onClose={() => setNotificationsOpen(false)} onReadAll={readAllNotifications} />
                </Pressable>
              </View>
            </Pressable>
          </Modal>
          <Link href="/trading" asChild><Pressable><Text style={{ color: '#D4AF37' }}>Back to Trading</Text></Pressable></Link>
          <Pressable onPress={signOut}><Text className="text-danger">Sign Out</Text></Pressable>
        </View>
      </View>

      <DashboardTabs activeKey={activeSection} onSectionChange={setActiveSection} userRole={user?.role} />

      {activeSection === 'overview' ? (
        <View className="mb-5 flex-row flex-wrap gap-3">
          <Stat label="Balance" value={`${Number(wallet.balance || 0).toFixed(2)} ${wallet.currency || 'USD'}`} colors={colors} mobile={mobile} />
          <Stat label="Equity" value={`${Number(wallet.equity || wallet.balance || 0).toFixed(2)} ${wallet.currency || 'USD'}`} colors={colors} mobile={mobile} />
          <Stat label="Free Funds" value={`${Number(wallet.freeFunds || 0).toFixed(2)} ${wallet.currency || 'USD'}`} colors={colors} mobile={mobile} />
          {referral ? <Stat label="Referral Commission" value={`${Number(referral.commission || 0).toFixed(2)} USD`} colors={colors} mobile={mobile} /> : null}
        </View>
      ) : null}

      {activeSection === 'overview' ? (
        <View className="gap-4 lg:flex-row">
          <View className="flex-1 gap-4">
            <Card title="Account Details" colors={colors} mobile={mobile}>
              <Text style={{ color: colors.text }}>Name: {dashboard?.user?.name || user?.name || '-'}</Text>
              <Text className="mt-2" style={{ color: colors.text }}>Email: {dashboard?.user?.email || user?.email || '-'}</Text>
              <Text className="mt-2" style={{ color: colors.text }}>Phone: {dashboard?.user?.phone || '-'}</Text>
              <Text className="mt-2" style={{ color: colors.text }}>Trading Status: {dashboard?.user?.tradingStatus || 'active'}</Text>
            </Card>
            {referral ? (
              <Card title="Broker Referral" colors={colors} mobile={mobile}>
                <Text style={{ color: colors.muted }}>Share this URL. New users who register from it are linked to you.</Text>
                <TextInput
                  editable={false}
                  value={referralText}
                  className="mt-4 rounded-xl border p-3"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                />
                <CustomButton title={copied ? 'Copied' : 'Copy Referral URL'} onPress={copyReferral} className="mt-4" />
              </Card>
            ) : null}
          </View>
          <View className="flex-1">
            <Card title="Live Account Activity" colors={colors} mobile={mobile}>
              <LiveActivityPanel
                activeView={activityView}
                onChangeView={setActivityView}
                trades={liveTrades}
                transactions={transactions}
                colors={colors}
              />
            </Card>
          </View>
        </View>
      ) : null}

      {activeSection === 'accounts' ? (
        <Card title="Demo and Live Accounts" subtitle="Create, review, and manage all trading accounts from one clean workspace." colors={colors} mobile={mobile}>
          <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <View>
              <Text className="text-sm font-medium" style={{ color: colors.text }}>Account slots</Text>
              <Text className="mt-1 text-xs" style={{ color: colors.muted }}>Demo {demoAccountCount}/{DEMO_ACCOUNT_LIMIT} | Live {liveAccountCount}/{LIVE_ACCOUNT_LIMIT}</Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              <CustomButton title="Create Demo Account" onPress={() => askCreateAccount('Demo')} disabled={demoAccountCount >= DEMO_ACCOUNT_LIMIT || accountCreating} className={mobile ? 'w-full' : 'min-w-[210px]'} />
              <CustomButton title="Create Live Account" onPress={() => askCreateAccount('Live')} disabled={liveAccountCount >= LIVE_ACCOUNT_LIMIT || accountCreating} variant="secondary" className={mobile ? 'w-full' : 'min-w-[210px]'} />
            </View>
          </View>
          {accountError ? <Text className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-danger">{accountError}</Text> : null}
          <View className="gap-4">
            <AccountGroup
              title="Demo Accounts"
              subtitle={`${demoAccountCount}/${DEMO_ACCOUNT_LIMIT} demo account slots used`}
              accounts={demoAccounts}
              emptyText={loading ? 'Loading demo accounts...' : 'No demo accounts yet'}
              colors={colors}
              mobile={mobile}
            />
            <AccountGroup
              title="Live Accounts"
              subtitle={`${liveAccountCount}/${LIVE_ACCOUNT_LIMIT} live account slots used`}
              accounts={liveAccounts}
              emptyText={loading ? 'Loading live accounts...' : 'No live accounts yet'}
              colors={colors}
              mobile={mobile}
            />
          </View>
        </Card>
      ) : null}

      <CreateAccountConfirm
        type={pendingAccountType}
        loading={accountCreating}
        onCancel={() => setPendingAccountType(null)}
        onConfirm={createAccount}
        colors={colors}
      />

      {activeSection === 'deposit' ? (
        <Card title="Deposit" subtitle="Submit a funding request with your payment reference." colors={colors} mobile={mobile}>
          <DepositForm onSubmit={(values) => deposit(values, Boolean(user)).then(loadDashboard)} loading={walletLoading} />
          <TransactionList transactions={depositTransactions} title="Deposit History" />
        </Card>
      ) : null}

      {activeSection === 'withdraw' ? (
        <Card title="Withdraw Funds" colors={colors} mobile={mobile}>
          <WithdrawForm
            onSubmit={(values) => withdraw(values, Boolean(user)).then(loadDashboard)}
            loading={walletLoading}
            disabled={withdrawalLocked}
            disabledMessage={withdrawalLockedMessage}
            summary={wallet}
            transactions={transactions}
          />
        </Card>
      ) : null}

      <Modal visible={showBirthdayBonusPopup} transparent animationType="fade" onRequestClose={() => setShowBirthdayBonusPopup(false)}>
        <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="w-full max-w-sm rounded-3xl p-6 items-center" style={{ backgroundColor: colors.card }}>
            <Text className="text-3xl mb-2">🎁</Text>
            <Text className="text-2xl font-bold mb-2 text-center" style={{ color: colors.text }}>Happy Birthday!</Text>
            <Text className="text-sm mb-8 text-center" style={{ color: colors.muted }}>
              It's your special day! Claim your $200 Birthday Bonus now.
            </Text>
            <View className="w-full flex-row gap-3">
              <Pressable
                onPress={() => setShowBirthdayBonusPopup(false)}
                className="flex-1 py-3 rounded-xl items-center justify-center border"
                style={{ borderColor: colors.border }}
              >
                <Text className="font-bold" style={{ color: colors.text }}>Later</Text>
              </Pressable>
              <Pressable
                onPress={claimBirthdayBonus}
                disabled={claimingBirthdayBonus}
                className="flex-1 py-3 rounded-xl items-center justify-center"
                style={{ backgroundColor: colors.primary, opacity: claimingBirthdayBonus ? 0.7 : 1 }}
              >
                <Text className="font-bold text-white">{claimingBirthdayBonus ? 'Claiming...' : 'Get Bonus'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}
