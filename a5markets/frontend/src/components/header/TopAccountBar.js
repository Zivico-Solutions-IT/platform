import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Check, ChevronDown, Sun, Moon, UserRound, Wallet, Bell, LayoutDashboard, Activity, RefreshCw, Settings } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { money, quote } from '../../utils/formatters';
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
import FundingMenu from './FundingMenu';
import HeaderSidePanel from './HeaderSidePanel';
import ProfileMenu from './ProfileMenu';
import NotificationMenu from './NotificationMenu';

const visibleMetricCount = 4;

function MetricSettingsMenu({ onClose, colors }) {
  const [enabled, setEnabled] = useState(() => new Set(['Balance', 'Bonus', 'Equity', 'Free Funds', 'Margin', 'Margin Level', 'Profit']));
  const toggle = (label) => setEnabled((current) => {
    const next = new Set(current);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });

  return (
    <View className="absolute z-50 overflow-hidden rounded-2xl border bg-white p-2 shadow-xl" style={{ width: 150, right: 278, top: 74, borderColor: '#e4e7eb', elevation: 12 }}>
      {['Balance', 'Bonus', 'Equity', 'Free Funds', 'Margin', 'Margin Level', 'Profit'].map((label) => {
        const active = enabled.has(label);
        return (
          <Pressable key={label} onPress={() => toggle(label)} className="flex-row items-center px-2 py-2">
            <View className="h-5 w-5 items-center justify-center" style={{ backgroundColor: active ? '#2f65e8' : '#fff', borderWidth: active ? 0 : 1, borderColor: colors.border }}>
              {active ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Text className="ml-2 text-sm" style={{ color: '#343840' }}>{label}</Text>
          </Pressable>
        );
      })}
      <Pressable onPress={onClose} className="mx-auto mt-1 rounded-md px-3 py-2" style={{ backgroundColor: '#1f78bd' }}>
        <Text className="text-sm font-semibold text-white">Close</Text>
      </Pressable>
    </View>
  );
}

export default function TopAccountBar({ onNewOrder }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { currentSymbol, summary, selectedTradingAccount, setSelectedTradingAccount, sidePanel, setSidePanel, transactions } = useDemoTrading();
  const params = useLocalSearchParams();
  const { user, isAdmin, refreshUser } = useAuth();
  const { darkMode, colors, toggleTheme } = useAppTheme();
  const metricsScrollRef = useRef(null);
  const profileHoverCloseRef = useRef(null);
  const [metricsWidth, setMetricsWidth] = useState(0);
  const [menu, setMenu] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [adminNotificationData, setAdminNotificationData] = useState(emptyAdminNotificationData);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [hoveredAction, setHoveredAction] = useState(null);
  const [hasSwitchedToLive, setHasSwitchedToLive] = useState(false);
  const mobile = width < 1024;
  const narrowPhone = width < 380;
  const compactDesktop = !mobile && width < 1450;
  const twoRowDesktop = !mobile && width < 1200;
  const isMobileLayout = width < 760;
  const showHeaderContent = !(isMobileLayout && sidePanel);
  const iconButtonHoverBg = darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(11, 11, 11, 0.04)';

  const fallbackAccount = useMemo(() => ({
    id: 'loading',
    type: user?.accountType || 'Demo',
    name: user?.accountType === 'Live' ? 'Live account 1' : 'Demo account 1',
    status: user?.tradingStatus === 'frozen' ? 'frozen' : 'active',
    balance: summary.balance,
    currency: 'USD',
  }), [summary.balance, user?.accountType, user?.id, user?.tradingStatus]);

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
  const summaryBonus = Number(summary.bonus || 0);
  const summaryFreeFunds = summaryEquity - summaryMargin;
  const metrics = [
    ['Balance', `${money(summaryBalance)} USD`],
    ['Equity', `${money(summaryEquity)} USD`],
    ['Margin', `${money(summaryMargin)} USD`],
    ['Margin Level', `${money(summaryMarginLevel)} %`],
    ['Net Profit', `${money(summaryNetProfit)} USD`],
    ['Bonus', `${money(summaryBonus)} USD`],
    ['Free Funds', `${money(summaryFreeFunds)} USD`],
  ];
  const desktopMetrics = [
    ['Balance', money(summaryBalance), 'USD'],
    ['Equity', money(summaryEquity), 'USD'],
    ['Margin', money(summaryMargin), 'USD'],
    ['Margin Level', money(summaryMarginLevel), '%'],
    ['Net Profit', money(summaryNetProfit), 'USD'],
    ['Bonus', money(summaryBonus), 'USD'],
    ['Free Funds', money(summaryFreeFunds), 'USD'],
  ];
  const symbolPrice = Number(currentSymbol?.price || currentSymbol?.bid || 0);
  const symbolChange = Number(currentSymbol?.change || 0);
  const desktopHeaderBg = darkMode ? '#02070d' : colors.background;
  const desktopDivider = darkMode ? '#172536' : colors.border;
  const desktopText = colors.text;
  const desktopMuted = darkMode ? '#66758a' : colors.muted;
  const sparklinePoints = symbolChange >= 0
    ? '2,34 15,31 26,32 37,24 48,27 58,10 67,18 78,20 90,7 100,12 112,4'
    : '2,7 15,12 26,10 37,18 48,16 58,29 67,22 78,25 90,33 100,28 112,35';

  const maxMetricStep = Math.max(metrics.length - visibleMetricCount, 0);
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
    const refreshProfile = () => {
      refreshUser().catch(() => {});
    };
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
    let active = true;
    if (!user || !isAdmin) {
      setAdminNotificationData(emptyAdminNotificationData);
      return undefined;
    }
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
    if (routeAccount && String(selectedTradingAccount?.id) !== String(routeAccount.id)) { setSelectedTradingAccount(routeAccount); return; }

    const liveAccount = tradingAccounts.find((account) => account.type === 'Live');
    if (liveAccount && selectedTradingAccount?.type === 'Demo' && !hasSwitchedToLive) {
      setHasSwitchedToLive(true);
      setSelectedTradingAccount(liveAccount);
      return;
    }

    const selectedExists = tradingAccounts.some((account) => String(account.id) === String(selectedTradingAccount?.id));
    if (!selectedExists) setSelectedTradingAccount(liveAccount || tradingAccounts[0]);
  }, [routeAccountId, selectedTradingAccount?.id, setSelectedTradingAccount, tradingAccounts, hasSwitchedToLive]);

  const selectAccount = (account) => { setSelectedTradingAccount(account); setMenu(null); };
  const refreshDashboard = async () => {
    try {
      const result = await dashboardService.getDashboard();
      setDashboard(result);
      updateAccounts(result.accounts || [], selectedAccount);
    } catch {
      // Keep the current dashboard visible when a refresh request fails.
    }
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

  const hoverProps = (action) => ({ onHoverIn: () => setHoveredAction(action), onHoverOut: () => setHoveredAction(null) });

  const cancelProfileHoverClose = () => { if (!profileHoverCloseRef.current) return; clearTimeout(profileHoverCloseRef.current); profileHoverCloseRef.current = null; };

  const openProfileMenu = (action) => { cancelProfileHoverClose(); setHoveredAction(action); setMenu((cur) => (cur === 'profile' ? cur : 'profile')); };

  const profileHoverProps = (action) => ({ onHoverIn: () => openProfileMenu(action), onHoverOut: () => setHoveredAction(null) });
  const openWalletMenu = () => setMenu((current) => (current === 'wallet' ? null : 'wallet'));
  const goToAdminDashboard = () => {
    setMenu(null);
    router.push('/admin');
  };
  const readAllNotifications = (ids = notificationIds) => {
    const next = Array.from(new Set([...readNotificationIds, ...ids]));
    setReadNotificationIds(next);
    if (user?.id) storage.set(`read_notifications_${user.id}`, next).catch(() => {});
  };

  const isMenuActionActive = (action) => {
    if (menu === 'wallet' && (action === 'wallet' || action === 'mobile-wallet')) return true;
    if (menu === 'profile' && (action === 'profile' || action === 'mobile-profile')) return true;
    if (menu === 'notifications' && (action === 'notifications' || action === 'mobile-notifications')) return true;
    return false;
  };

  const iconButtonStyle = (action, baseStyle) => {
    const active = isMenuActionActive(action);
    const hovered = hoveredAction === action;
    return [
      baseStyle,
      { cursor: 'pointer' },
      hovered || active
        ? {
            backgroundColor: active ? `${colors.primary}12` : iconButtonHoverBg,
            borderColor: colors.primary,
          }
        : null
    ];
  };

  const iconHoverStyle = (action) => {
    return {};
  };

  const iconColor = (action) => (hoveredAction === action || isMenuActionActive(action) ? colors.primary : colors.text);

  useEffect(() => () => cancelProfileHoverClose(), []);

  // Trading's header stays mounted while Expo changes screens.  Close any
  // header overlay before the next screen is rendered so it cannot follow the
  // user from the chart into the client portal/dashboard.
  useEffect(() => {
    cancelProfileHoverClose();
    setMenu(null);
    setHoveredAction(null);
  }, [pathname]);

  useEffect(() => {
    if (!metricsWidth || maxMetricStep === 0) return undefined;
    let step = 0;
    const itemWidth = (metricsWidth - 24) / visibleMetricCount;
    const interval = setInterval(() => {
      step = step >= maxMetricStep ? 0 : step + 1;
      metricsScrollRef.current?.scrollTo({ x: itemWidth * step, animated: true });
    }, 3800);
    return () => clearInterval(interval);
  }, [maxMetricStep, metricsWidth]);

  return (
    <View
      className={`${mobile ? 'relative z-40 gap-1.5 px-2 py-1.5' : 'relative z-40 py-2'}`}
      style={{
        backgroundColor: mobile ? colors.background : colors.background,
        borderColor: colors.border,
        borderBottomWidth: showHeaderContent ? (mobile ? 0 : 1) : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: mobile ? 0 : 0,
        shadowRadius: 12,
        elevation: mobile ? 0 : (showHeaderContent ? 4 : 0),
        flexDirection: mobile ? 'column' : 'row',
        alignItems: mobile ? undefined : 'center',
        flexWrap: twoRowDesktop ? 'wrap' : 'nowrap',
        columnGap: mobile ? undefined : (compactDesktop ? 8 : 12),
        rowGap: twoRowDesktop ? 2 : 0,
        paddingHorizontal: mobile ? 8 : 14,
        height: showHeaderContent ? undefined : 0,
        paddingVertical: showHeaderContent ? undefined : 0,
        overflow: 'hidden',
      }}
    >
      {showHeaderContent ? (
        <>
          {mobile ? (
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-2">
            <Pressable
              onPress={() => router.push('/')}
              className="min-w-0 flex-1 rounded-xl border px-2 py-1"
              style={{
                cursor: 'pointer',
                backgroundColor: colors.panel,
                borderColor: colors.primary + '55',
                shadowColor: colors.primary,
                shadowOpacity: 0.08,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <NovaLogo dark={darkMode} width={narrowPhone ? 152 : 190} height={narrowPhone ? 44 : 52} />
            </Pressable>
            {user ? (
              <Pressable
                onPress={() => setMenu(menu === 'account' ? null : 'account')}
                className="h-[40px] flex-row items-center justify-between rounded-xl border px-3"
                style={{
                  minWidth: narrowPhone ? 108 : 126,
                  backgroundColor: menu === 'account' ? (darkMode ? '#1E232A' : '#FAFAFA') : colors.panel,
                  borderColor: menu === 'account' ? colors.primary : colors.border,
                  shadowColor: colors.primary,
                  shadowOpacity: menu === 'account' ? (darkMode ? 0.3 : 0.2) : 0,
                  shadowRadius: 8,
                  elevation: menu === 'account' ? 2 : 0,
                }}
              >
                <View className="min-w-0 flex-1 flex-row items-center">
                  <View className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedAccount?.type === 'Live' ? colors.success : colors.primary }} />
                  <Text className="text-xs font-bold uppercase" numberOfLines={1} style={{ color: colors.text }}>
                    {selectedAccount?.type || 'Demo'}
                  </Text>
                </View>
                <ChevronDown size={14} color={colors.muted} />
              </Pressable>
            ) : null}
            <Pressable
              {...hoverProps('mobile-theme')}
              onPress={toggleTheme}
              className="h-[40px] w-[40px] items-center justify-center rounded-xl border"
              style={iconButtonStyle('mobile-theme', { backgroundColor: colors.panel, borderColor: colors.border })}
            >
              <View style={iconHoverStyle('mobile-theme')}>
                {darkMode ? <Sun size={17} color={colors.primary} /> : <Moon size={17} color={colors.primary} />}
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}
      {mobile && !isAdmin ? (
        <ScrollView 
          ref={metricsScrollRef} 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="h-[50px] rounded-2xl mt-3 mx-3" 
          contentContainerStyle={{ paddingHorizontal: 12 }} 
          onLayout={({ nativeEvent }) => setMetricsWidth(nativeEvent.layout.width)} 
          style={{ backgroundColor: `${colors.primary}15` }}
        >
          {metrics.map(([label, value], index) => (
            <View 
              key={label} 
              className="justify-center h-full px-1 items-center"
              style={{
                width: metricsWidth ? (metricsWidth - 24) / visibleMetricCount : 100,
                borderLeftWidth: index === 0 ? 0 : 1,
                borderLeftColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              }}
            >
              <Text className="text-[8px] font-bold tracking-widest uppercase mb-0.5 opacity-60" numberOfLines={1} style={{ color: colors.text }}>{label}</Text>
              <Text className="text-[10px] font-bold tracking-tight" numberOfLines={1} style={{ color: label === 'Net Profit' && summary.openProfit < 0 ? colors.danger : (label === 'Net Profit' && summary.openProfit > 0 ? colors.success : colors.text) }}>{value}</Text>
            </View>
          ))}
        </ScrollView>
      ) : !mobile && !isAdmin ? (
        <View
          className={`${twoRowDesktop ? 'h-[58px]' : compactDesktop ? 'h-[62px]' : 'h-[72px]'} flex-row items-center rounded-lg border`}
          style={twoRowDesktop
            ? { flexBasis: '100%', width: '100%', order: 2, paddingLeft: 0, backgroundColor: darkMode ? colors.panel : '#ffffff', borderColor: desktopDivider }
            : {
                flex: 1,
                minWidth: 0,
                paddingLeft: 0,
                backgroundColor: darkMode ? colors.panel : '#ffffff',
                borderColor: desktopDivider,
                shadowColor: '#16385f',
                shadowOpacity: darkMode ? 0 : 0.03,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: darkMode ? 0 : 1,
              }}
        >
          {desktopMetrics.map(([label, value, unit], index) => (
            <View
              key={label}
              className="min-w-0 justify-center"
              style={{
                flex: label === 'Margin Level' ? 1.12 : 1,
                paddingHorizontal: compactDesktop ? 10 : 14,
                borderLeftWidth: index === 0 ? 0 : 1,
                borderColor: desktopDivider,
              }}
            >
              <Text className={`${compactDesktop ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase`} numberOfLines={1} style={{ color: desktopMuted }}>{label}</Text>
              <Text className={`mt-1 ${compactDesktop ? 'text-[15px]' : 'text-[19px]'} font-bold tracking-tight`} numberOfLines={1} style={{ color: label === 'Net Profit' && summaryNetProfit < 0 ? colors.danger : desktopText }}>
                {label === 'Net Profit' && summaryNetProfit > 0 ? `+${value}` : value}
                <Text className={`${compactDesktop ? 'text-[8px]' : 'text-[10px]'} font-bold`} style={{ color: desktopMuted }}> {unit}</Text>
              </Text>
            </View>
          ))}
          <Pressable
            {...hoverProps('profile')}
            onPress={() => setMenu(menu === 'metrics' ? null : 'metrics')}
            className="items-center justify-center"
            style={{ width: compactDesktop ? 38 : 46, height: '100%', cursor: 'pointer' }}
          >
            <View style={iconHoverStyle('profile')}><Settings size={compactDesktop ? 17 : 19} color={desktopMuted} /></View>
          </Pressable>
        </View>
      ) : null}
      {!mobile && isAdmin ? <View style={{ flex: 1 }} /> : null}
      {!mobile && user && !isAdmin ? (
        <Pressable
          onPress={() => setMenu(menu === 'account' ? null : 'account')}
          className={`${compactDesktop ? 'h-[44px]' : 'h-[52px]'} flex-row items-center justify-center rounded-lg border`}
          style={{
            width: compactDesktop ? 150 : 172,
            paddingHorizontal: compactDesktop ? 12 : 16,
            backgroundColor: darkMode ? colors.panel : '#ffffff',
            borderColor: menu === 'account' ? colors.primary : colors.border,
            cursor: 'pointer',
          }}
        >
          <View className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: '#20c66b' }} />
          <Text className="font-bold uppercase" style={{ color: selectedAccount?.type === 'Live' ? '#20c66b' : colors.primary }}>{selectedAccount?.type || 'Demo'}</Text>
          <ChevronDown className="ml-2" size={14} color={desktopMuted} />
        </Pressable>
      ) : null}
      {!mobile && user && !isAdmin ? (
        <Pressable
          {...hoverProps('theme')}
          onPress={toggleTheme}
          className="hidden items-center justify-center rounded-lg border lg:flex"
          style={iconButtonStyle('theme', { width: compactDesktop ? 44 : 52, height: compactDesktop ? 44 : 52, backgroundColor: darkMode ? colors.panel : '#ffffff', borderColor: colors.border })}
        >
          <View style={iconHoverStyle('theme')}>
            {darkMode ? <Sun size={20} color={desktopMuted} /> : <Moon size={20} color={desktopMuted} />}
          </View>
        </Pressable>
      ) : null}
      {isAdmin ? (
        <Pressable {...hoverProps('admin-dashboard')} onPress={goToAdminDashboard} className="hidden items-center justify-center rounded-full lg:flex" style={iconButtonStyle('admin-dashboard', { width: compactDesktop ? 40 : 44, height: compactDesktop ? 40 : 44, backgroundColor: 'transparent' })}>
          <View style={iconHoverStyle('admin-dashboard')}><LayoutDashboard size={20} color={iconColor('admin-dashboard')} /></View>
        </Pressable>
      ) : null}
      {user && !isAdmin ? (
        <Pressable {...hoverProps('refresh')} onPress={refreshDashboard} className="hidden items-center justify-center rounded-lg border lg:flex" style={iconButtonStyle('refresh', { width: compactDesktop ? 44 : 52, height: compactDesktop ? 44 : 52, backgroundColor: darkMode ? colors.panel : '#ffffff', borderColor: colors.border })}>
          <View style={iconHoverStyle('refresh')}><RefreshCw size={21} color={desktopMuted} /></View>
        </Pressable>
      ) : null}
        </>
      ) : null}
      <Modal visible={Boolean(menu)} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable className="flex-1" style={{ flex: 1 }} onPress={() => setMenu(null)}>
          <View style={{ flex: 1 }} pointerEvents="box-none">
            {menu === 'account' ? (
              <Pressable onPress={(event) => event.stopPropagation()}>
                <DemoAccountMenu
                  accounts={tradingAccounts}
                  selectedAccount={selectedAccount}
                  onSelectAccount={selectAccount}
                  onClose={() => setMenu(null)}
                  onOpenPanel={openSidePanel}
                />
              </Pressable>
            ) : null}
            {menu === 'metrics' ? <Pressable onPress={(event) => event.stopPropagation()}><MetricSettingsMenu colors={colors} onClose={() => setMenu(null)} /></Pressable> : null}
            {menu === 'wallet' ? (
              <Pressable onPress={(event) => event.stopPropagation()}>
                <FundingMenu selectedAccount={selectedAccount} summary={summary} onClose={() => setMenu(null)} onSwitchAccount={() => setMenu('account')} onOpenPanel={openSidePanel} />
              </Pressable>
            ) : null}
            {menu === 'profile' ? (
              <Pressable onPress={(event) => event.stopPropagation()}>
                <ProfileMenu
                  onClose={() => setMenu(null)}
                  onHoverIn={cancelProfileHoverClose}
                  onOpenPanel={openSidePanel}
                  selectedAccount={selectedAccount}
                  deposits={dashboard?.deposits || []}
                  transactions={dashboard?.transactions || transactions || []}
                />
              </Pressable>
            ) : null}
            {menu === 'notifications' ? (
              <Pressable onPress={(event) => event.stopPropagation()}>
                <NotificationMenu onClose={() => setMenu(null)} readIds={readNotificationIds} onReadAll={readAllNotifications} />
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
