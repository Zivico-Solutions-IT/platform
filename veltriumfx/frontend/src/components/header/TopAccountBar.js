import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import {
  ChevronDown,
  Sun,
  Moon,
  UserRound,
  Bell,
  LayoutDashboard,
  Activity,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  Layers,
} from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { money, quote, percent } from '../../utils/formatters';
import { storage } from '../../utils/storage';
import { useAppTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { dashboardService } from '../../services/dashboardService';
import {
  buildAdminNotificationItems,
  emptyAdminNotificationData,
  loadAdminNotificationData,
} from '../../utils/adminNotifications';
import NovaLogo from '../brand/NovaLogo';
import DemoAccountMenu from './DemoAccountMenu';
import HeaderSidePanel from './HeaderSidePanel';
import ProfileMenu from './ProfileMenu';
import NotificationMenu from './NotificationMenu';
import SymbolFlagIcon from '../market/SymbolFlagIcon';

export default function TopAccountBar() {
  const { width } = useWindowDimensions();
  const {
    currentSymbol,
    summary,
    selectedTradingAccount,
    setSelectedTradingAccount,
    sidePanel,
    setSidePanel,
    transactions,
    orderPanelVisible,
    setOrderPanelVisible,
  } = useDemoTrading();

  const params = useLocalSearchParams();
  const { user, isAdmin, refreshUser } = useAuth();
  const { darkMode, colors, toggleTheme } = useAppTheme();
  const profileHoverCloseRef = useRef(null);

  const [menu, setMenu] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [adminNotificationData, setAdminNotificationData] = useState(emptyAdminNotificationData);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [hoveredAction, setHoveredAction] = useState(null);
  const [hasSwitchedToLive, setHasSwitchedToLive] = useState(false);

  const mobile = width < 760;
  const tablet = width >= 760 && width < 1180;
  const desktop = width >= 1180;

  const fallbackAccount = useMemo(() => ({
    id: 'loading',
    type: user?.accountType || 'Demo',
    name: user?.accountType === 'Live' ? 'Live account 1' : 'Demo account 1',
    status: user?.tradingStatus === 'frozen' ? 'frozen' : 'active',
    balance: summary.balance,
    currency: 'USD',
  }), [summary.balance, user?.accountType, user?.tradingStatus]);

  const tradingAccounts = useMemo(() => {
    const list = accounts.length ? accounts : [fallbackAccount];
    if (!selectedTradingAccount?.id) return list;
    return list.map((account) => (
      String(account.id) === String(selectedTradingAccount.id)
        ? { ...selectedTradingAccount, ...account }
        : account
    ));
  }, [accounts, fallbackAccount, selectedTradingAccount]);

  const selectedAccount = tradingAccounts.find((account) => String(account.id) === String(selectedTradingAccount?.id)) || selectedTradingAccount || tradingAccounts[0];
  const selectedAccountBalance = Number.isFinite(Number(selectedAccount?.balance)) ? Number(selectedAccount.balance) : summary.balance;
  const routeAccountId = params.accountId ? String(params.accountId) : '';

  const summaryBalance = Number(summary.balance || 0);
  const summaryEquity = Number(summary.equity || 0);
  const summaryMargin = Number(summary.margin || 0);
  const summaryMarginLevel = Number(summary.marginLevel || 0);
  const summaryNetProfit = Number(summary.openProfit || 0);
  const summaryFreeFunds = Math.max(0, summaryEquity - summaryMargin);

  const changeNum = Number(currentSymbol?.change || 0);
  const isPositiveChange = changeNum >= 0;
  const changeColor = isPositiveChange ? colors.success || '#10B981' : colors.danger || '#EF4444';

  const notificationIds = useMemo(() => {
    if (isAdmin) {
      return buildAdminNotificationItems(adminNotificationData, {
        colors,
        dateTime: (value) => value || '',
        money,
      }).map((item) => item.id);
    }

    const dashboardUser = dashboard?.user || user;
    const ids = [];
    if (['approved', 'rejected'].includes(dashboardUser?.verificationStatus)) {
      ids.push(`verification-${dashboardUser.verificationStatus}-${dashboardUser.verificationReviewedAt || dashboardUser.updatedAt || ''}`);
    }
    (dashboard?.transactions || transactions || [])
      .filter((item) => ['deposit', 'withdrawal'].includes(item.type) && ['approved', 'completed', 'rejected'].includes(item.status))
      .forEach((item) => ids.push(`${item.type}-${item.id}-${item.status}`));
    (dashboard?.bankAccounts || [])
      .filter((item) => ['approved', 'rejected'].includes(item.status))
      .forEach((item) => ids.push(`bank-${item.id}-${item.status}`));
    return ids.filter(Boolean);
  }, [adminNotificationData, colors, dashboard, isAdmin, transactions, user]);

  const unreadNotificationCount = notificationIds.filter((id) => !readNotificationIds.includes(id)).length;

  useEffect(() => {
    if (!user?.id) return undefined;
    let active = true;
    const refreshProfile = () => { refreshUser().catch(() => {}); };
    refreshProfile();
    const retryTimers = [3000, 9000].map((delay) => setTimeout(() => {
      if (active) refreshProfile();
    }, delay));
    return () => {
      active = false;
      retryTimers.forEach(clearTimeout);
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    let accountsLoaded = false;
    let accountsRequestInFlight = false;
    if (!user) {
      setAccounts([]);
      setSelectedTradingAccount(null);
      return undefined;
    }

    const loadAccounts = () => {
      if (accountsLoaded || accountsRequestInFlight) return;
      accountsRequestInFlight = true;
      dashboardService.getAccounts()
        .then((result) => {
          if (!active || !Array.isArray(result.accounts)) return;
          accountsLoaded = true;
          setAccounts(result.accounts);
        })
        .catch(() => {})
        .finally(() => { accountsRequestInFlight = false; });
    };

    loadAccounts();
    const retryTimers = [2500, 7000, 15000, 30000].map((delay) => setTimeout(loadAccounts, delay));

    dashboardService.getDashboard()
      .then((result) => {
        if (!active) return;
        setDashboard(result);
        if (Array.isArray(result.accounts)) {
          accountsLoaded = true;
          setAccounts(result.accounts);
        }
      })
      .catch(() => {});

    const timer = setInterval(() => {
      dashboardService.getDashboard()
        .then((result) => {
          if (active) {
            setDashboard(result);
            if (Array.isArray(result.accounts)) setAccounts(result.accounts);
          }
        })
        .catch(() => {});
    }, 60000);

    return () => {
      active = false;
      clearInterval(timer);
      retryTimers.forEach(clearTimeout);
    };
  }, [setSelectedTradingAccount, user]);

  useEffect(() => {
    if (!user || !isAdmin) {
      setAdminNotificationData(emptyAdminNotificationData);
      return undefined;
    }
    let active = true;
    const load = () => {
      loadAdminNotificationData(api)
        .then((result) => {
          if (active) setAdminNotificationData(result);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAdmin, user]);

  useEffect(() => {
    if (!user?.id) {
      setReadNotificationIds([]);
      return;
    }
    storage.get(`read_notifications_${user.id}`, [])
      .then((ids) => setReadNotificationIds(Array.isArray(ids) ? ids : []))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!tradingAccounts.length) return;
    const routeAccount = routeAccountId ? tradingAccounts.find((account) => String(account.id) === routeAccountId) : null;
    if (routeAccount && String(selectedTradingAccount?.id) !== String(routeAccount.id)) {
      setSelectedTradingAccount(routeAccount);
      return;
    }

    const liveAccount = tradingAccounts.find((account) => account.type === 'Live');
    if (liveAccount && selectedTradingAccount?.type === 'Demo' && !hasSwitchedToLive) {
      setHasSwitchedToLive(true);
      setSelectedTradingAccount(liveAccount);
      return;
    }

    const selectedExists = tradingAccounts.some((account) => String(account.id) === String(selectedTradingAccount?.id));
    if (!selectedExists) setSelectedTradingAccount(liveAccount || tradingAccounts[0]);
  }, [routeAccountId, selectedTradingAccount?.id, setSelectedTradingAccount, tradingAccounts, hasSwitchedToLive]);

  const selectAccount = (account) => {
    setSelectedTradingAccount(account);
    setMenu(null);
  };

  const updateAccounts = useCallback((nextAccounts = [], preferredAccount = null) => {
    setAccounts(nextAccounts);
    setSelectedTradingAccount((current) => {
      const preferred = preferredAccount?.id
        ? nextAccounts.find((account) => String(account.id) === String(preferredAccount.id))
        : null;
      if (preferred) return preferred;
      const refreshedCurrent = current?.id
        ? nextAccounts.find((account) => String(account.id) === String(current.id))
        : null;
      if (refreshedCurrent) return refreshedCurrent;
      return nextAccounts.find((account) => account.type === 'Live') || nextAccounts[0] || current;
    });
  }, [setSelectedTradingAccount]);

  const openSidePanel = (panel) => {
    setMenu(null);
    setSidePanel(panel);
  };

  const goToAdminDashboard = () => {
    setMenu(null);
    router.push('/admin');
  };

  const readAllNotifications = (ids = notificationIds) => {
    const next = Array.from(new Set([...readNotificationIds, ...ids]));
    setReadNotificationIds(next);
    if (user?.id) storage.set(`read_notifications_${user.id}`, next).catch(() => {});
  };

  // Header background & border styles
  const headerBg = darkMode ? '#08100d' : colors.panel;
  const pillBg = darkMode ? '#0e1c16' : colors.surface;
  const pillBorder = colors.border;

  return (
    <View
      className="z-40 border-b transition-all"
      style={{
        backgroundColor: headerBg,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center justify-between px-3 py-2 lg:px-4">
        {/* Left Section: Logo - aligned to Market Watch column width on desktop */}
        <View
          style={desktop ? { width: width >= 1280 ? 310 : 290, paddingLeft: 4 } : {}}
          className="flex-row items-center"
        >
          <Pressable onPress={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <NovaLogo dark={darkMode} width={mobile ? 120 : 160} height={mobile ? 32 : 40} />
          </Pressable>
        </View>

        {/* Center / Chart Aligned Section: Starts right where market chart begins */}
        {!mobile ? (
          <View className="flex-1 flex-row items-center min-w-0 mx-2 gap-2">
            {/* Active Pair Chip (Desktop/Tablet) */}
            {currentSymbol ? (
              <View
                className="flex-row items-center px-3 py-1.5 rounded-xl border gap-2.5 shrink-0"
                style={{
                  backgroundColor: pillBg,
                  borderColor: pillBorder,
                }}
              >
                <SymbolFlagIcon symbol={currentSymbol.symbol} size={20} />
                <View>
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>
                    {currentSymbol.symbol}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-0.5">
                    <Text className="text-xs font-bold" style={{ color: changeColor }}>
                      {quote(currentSymbol.price || currentSymbol.bid, currentSymbol.decimals)}
                    </Text>
                    <View
                      className="flex-row items-center px-1 rounded"
                      style={{ backgroundColor: `${changeColor}18` }}
                    >
                      {isPositiveChange ? (
                        <TrendingUp size={9} color={changeColor} style={{ marginRight: 2 }} />
                      ) : (
                        <TrendingDown size={9} color={changeColor} style={{ marginRight: 2 }} />
                      )}
                      <Text className="text-[9px] font-bold" style={{ color: changeColor }}>
                        {percent(currentSymbol.change)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Core Account Metrics Pills */}
            {user && !isAdmin ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, alignItems: 'center' }}
                className="flex-1 min-w-0"
              >
                {/* Balance */}
                <View
                  className="px-3 py-1.5 rounded-xl border min-w-[95px]"
                  style={{ backgroundColor: pillBg, borderColor: pillBorder }}
                >
                  <Text className="text-[8.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
                    Balance
                  </Text>
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>
                    ${money(summaryBalance)}
                  </Text>
                </View>

                {/* Equity */}
                <View
                  className="px-3 py-1.5 rounded-xl border min-w-[95px]"
                  style={{ backgroundColor: pillBg, borderColor: pillBorder }}
                >
                  <Text className="text-[8.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
                    Equity
                  </Text>
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>
                    ${money(summaryEquity)}
                  </Text>
                </View>

                {/* Free Margin */}
                <View
                  className="px-3 py-1.5 rounded-xl border min-w-[95px]"
                  style={{ backgroundColor: pillBg, borderColor: pillBorder }}
                >
                  <Text className="text-[8.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
                    Free Margin
                  </Text>
                  <Text className="text-xs font-bold" style={{ color: colors.success || '#10B981' }}>
                    ${money(summaryFreeFunds)}
                  </Text>
                </View>

                {/* Margin Level */}
                <View
                  className="px-3 py-1.5 rounded-xl border min-w-[85px]"
                  style={{ backgroundColor: pillBg, borderColor: pillBorder }}
                >
                  <Text className="text-[8.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
                    Margin Level
                  </Text>
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>
                    {summaryMargin === 0 ? '—' : `${summaryMarginLevel.toFixed(1)}%`}
                  </Text>
                </View>

                {/* Net Profit */}
                <View
                  className="px-3 py-1.5 rounded-xl border min-w-[85px]"
                  style={{ backgroundColor: pillBg, borderColor: pillBorder }}
                >
                  <Text className="text-[8.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
                    Net Profit
                  </Text>
                  <Text
                    className="text-xs font-bold"
                    style={{
                      color: summaryNetProfit > 0 ? (colors.success || '#10B981') : summaryNetProfit < 0 ? (colors.danger || '#EF4444') : colors.text,
                    }}
                  >
                    {summaryNetProfit > 0 ? `+$${money(summaryNetProfit)}` : `$${money(summaryNetProfit)}`}
                  </Text>
                </View>
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {/* Right Section: Account Badge + Icons (Account, Notifications, Theme) */}
        <View className="flex-row items-center gap-2">
          {/* Static account type badge */}
          {user && !isAdmin ? (
            <View
              className="flex-row items-center px-2.5 py-1.5 rounded-xl border"
              style={{
                backgroundColor: pillBg,
                borderColor: pillBorder,
              }}
            >
              <View
                className="px-1.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: selectedAccount?.type === 'Live' ? `${colors.success || '#10B981'}25` : `${colors.primary}25`,
                }}
              >
                <Text
                  className="text-[9.5px] font-bold uppercase"
                  style={{
                    color: selectedAccount?.type === 'Live' ? (colors.success || '#10B981') : colors.primary,
                  }}
                >
                  {selectedAccount?.type || 'Demo'}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Admin Dashboard */}
          {isAdmin ? (
            <Pressable
              onPress={goToAdminDashboard}
              className="w-9 h-9 items-center justify-center rounded-xl border"
              style={{ backgroundColor: pillBg, borderColor: pillBorder, cursor: 'pointer' }}
            >
              <LayoutDashboard size={16} color={colors.primary} />
            </Pressable>
          ) : null}

          {/* 1. Account / Profile Menu */}
          {user ? (
            <Pressable
              onPress={() => setMenu(menu === 'profile' ? null : 'profile')}
              className="w-9 h-9 items-center justify-center rounded-xl border"
              style={{
                backgroundColor: menu === 'profile' ? `${colors.primary}20` : pillBg,
                borderColor: menu === 'profile' ? colors.primary : pillBorder,
                cursor: 'pointer',
              }}
            >
              <UserRound size={16} color={colors.primary} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/login')}
              className="px-3.5 py-1.5 rounded-xl bg-primary"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-xs font-bold text-white uppercase">Log In</Text>
            </Pressable>
          )}

          {/* 2. Notifications */}
          {user ? (
            <Pressable
              onPress={() => setMenu(menu === 'notifications' ? null : 'notifications')}
              className="relative w-9 h-9 items-center justify-center rounded-xl border"
              style={{
                backgroundColor: menu === 'notifications' ? `${colors.primary}20` : pillBg,
                borderColor: menu === 'notifications' ? colors.primary : pillBorder,
                cursor: 'pointer',
              }}
            >
              <Bell size={16} color={colors.text} />
              {unreadNotificationCount ? (
                <View
                  className="absolute -top-1 -right-1 w-4 h-4 items-center justify-center rounded-full bg-danger"
                  style={{ backgroundColor: colors.danger || '#EF4444' }}
                >
                  <Text className="text-[9px] font-bold text-white">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}

          {/* 3. Dark Mode / Theme Toggle */}
          <Pressable
            onPress={toggleTheme}
            className="w-9 h-9 items-center justify-center rounded-xl border"
            style={{ backgroundColor: pillBg, borderColor: pillBorder, cursor: 'pointer' }}
          >
            {darkMode ? <Sun size={16} color={colors.text} /> : <Moon size={16} color={colors.text} />}
          </Pressable>
        </View>
      </View>

      {/* Mobile Sub-Header: Active Pair & Balance Scrolling Bar */}
      {mobile && user && !isAdmin ? (
        <View className="px-3 pb-2 pt-0.5 border-t" style={{ borderColor: `${colors.border}40` }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <View
              className="flex-row items-center px-2.5 py-1 rounded-lg border gap-1.5"
              style={{ backgroundColor: pillBg, borderColor: pillBorder }}
            >
              <SymbolFlagIcon symbol={currentSymbol.symbol} size={16} />
              <Text className="text-[11px] font-bold" style={{ color: colors.text }}>
                {currentSymbol.symbol}
              </Text>
              <Text className="text-[11px] font-bold" style={{ color: changeColor }}>
                {quote(currentSymbol.price || currentSymbol.bid, currentSymbol.decimals)}
              </Text>
            </View>

            <View
              className="px-2.5 py-1 rounded-lg border"
              style={{ backgroundColor: pillBg, borderColor: pillBorder }}
            >
              <Text className="text-[10px] font-bold" style={{ color: colors.text }}>
                Equity: ${money(summaryEquity)}
              </Text>
            </View>

            <View
              className="px-2.5 py-1 rounded-lg border"
              style={{ backgroundColor: pillBg, borderColor: pillBorder }}
            >
              <Text className="text-[10px] font-bold" style={{ color: colors.success || '#10B981' }}>
                Free: ${money(summaryFreeFunds)}
              </Text>
            </View>

            <View
              className="px-2.5 py-1 rounded-lg border"
              style={{ backgroundColor: pillBg, borderColor: pillBorder }}
            >
              <Text
                className="text-[10px] font-bold"
                style={{
                  color: summaryNetProfit >= 0 ? (colors.success || '#10B981') : (colors.danger || '#EF4444'),
                }}
              >
                P&L: {summaryNetProfit >= 0 ? `+$${money(summaryNetProfit)}` : `-$${money(Math.abs(summaryNetProfit))}`}
              </Text>
            </View>
          </ScrollView>
        </View>
      ) : null}

      {/* Modals & Dropdowns */}
      <Modal visible={Boolean(menu)} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable className="flex-1" style={{ flex: 1 }} onPress={() => setMenu(null)}>
          <View style={{ flex: 1 }} pointerEvents="box-none">
            {menu === 'profile' ? (
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: mobile ? 0 : 54,
                  right: mobile ? 0 : 16,
                  bottom: 0,
                  width: mobile ? '100%' : 380,
                }}
              >
                <ProfileMenu
                  onClose={() => setMenu(null)}
                  onOpenPanel={openSidePanel}
                  selectedAccount={selectedAccount}
                  accounts={tradingAccounts}
                  onSelectAccount={selectAccount}
                  deposits={dashboard?.deposits || []}
                  transactions={dashboard?.transactions || transactions || []}
                  topOffset={mobile ? 0 : 54}
                />
              </Pressable>
            ) : null}
            {menu === 'notifications' ? (
              <Pressable onPress={(e) => e.stopPropagation()}>
                <NotificationMenu
                  onClose={() => setMenu(null)}
                  readIds={readNotificationIds}
                  onReadAll={readAllNotifications}
                  leftRail={false}
                />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(sidePanel)} transparent animationType="fade" onRequestClose={() => setSidePanel(null)}>
        {sidePanel ? (
          <HeaderSidePanel
            type={sidePanel}
            selectedAccount={selectedAccount}
            summary={summary}
            onClose={() => setSidePanel(null)}
            onAccountsChanged={updateAccounts}
            onSelectAccount={selectAccount}
          />
        ) : null}
      </Modal>
    </View>
  );
}
