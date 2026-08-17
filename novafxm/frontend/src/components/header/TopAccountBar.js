import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ChevronDown, Sun, Moon, UserRound, Wallet, ArrowUp, Bell, LayoutDashboard, Activity } from 'lucide-react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Polygon, Circle, RadialGradient } from 'react-native-svg';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { money, percent, quote } from '../../utils/formatters';
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

export default function TopAccountBar() {
  const { width } = useWindowDimensions();
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
    // Display-only while the real accounts request is in flight. Never make
    // this look like a real trading-account id.
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
    ['Balance', money(summaryBalance)],
    ['Equity', money(summaryEquity)],
    ['Margin', money(summaryMargin)],
    ['Margin Level', `${money(summaryMarginLevel)}%`],
    ['Net Profit', money(summaryNetProfit)],
    ['Bonus', money(summaryBonus)],
    ['Free Funds', money(summaryFreeFunds)],
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
    // Profile and verification state are deliberately refreshed separately
    // from the heavy dashboard response.
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
    // Retry quickly after login instead of leaving the selector on the
    // fallback until the normal one-minute dashboard refresh.
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
  // `user` is refreshed for presence/profile updates. Key this bootstrap by
  // identity so those updates do not restart dashboard/account requests.
  }, [setSelectedTradingAccount, user?.id]);

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
  }, [isAdmin, user?.id]);

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
      className={`${mobile ? 'relative z-40 gap-1.5 px-2 py-1.5' : 'relative z-40 py-1'}`}
      style={{
        backgroundColor: mobile ? colors.background : desktopHeaderBg,
        borderColor: colors.border,
        borderBottomWidth: showHeaderContent ? (mobile ? 0 : 1) : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: mobile ? 0 : (showHeaderContent ? 0.04 : 0),
        shadowRadius: 12,
        elevation: mobile ? 0 : (showHeaderContent ? 4 : 0),
        flexDirection: mobile ? 'column' : 'row',
        alignItems: mobile ? undefined : 'center',
        flexWrap: twoRowDesktop ? 'wrap' : 'nowrap',
        columnGap: mobile ? undefined : (compactDesktop ? 6 : 10),
        rowGap: twoRowDesktop ? 2 : 0,
        paddingHorizontal: mobile ? 8 : 16,
        height: showHeaderContent ? undefined : 0,
        paddingVertical: showHeaderContent ? undefined : 0,
        overflow: 'hidden',
      }}
    >
      {showHeaderContent ? (
        <>
          {mobile ? (
        <View className="gap-2">
          {/* Row 1: Logo & Utility Icons */}
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.push('/')} style={{ cursor: 'pointer' }}>
              <NovaLogo dark={darkMode} width={narrowPhone ? 108 : 130} height={narrowPhone ? 28 : 34} />
            </Pressable>
            <View className="flex-row items-center gap-1.5">
              <Pressable {...hoverProps('mobile-theme')} onPress={toggleTheme} className={`${narrowPhone ? 'h-[32px] w-[32px]' : 'h-[36px] w-[36px]'} relative items-center justify-center rounded-full`} style={iconButtonStyle('mobile-theme', { backgroundColor: `${colors.text}08` })}>
                <View style={iconHoverStyle('mobile-theme')}>{darkMode ? <Sun size={16} color={iconColor('mobile-theme')} /> : <Moon size={16} color={iconColor('mobile-theme')} />}</View>
              </Pressable>
              {isAdmin ? (
                <Pressable {...hoverProps('mobile-admin-dashboard')} onPress={goToAdminDashboard} className={`${narrowPhone ? 'h-[32px] w-[32px]' : 'h-[36px] w-[36px]'} relative items-center justify-center rounded-full`} style={iconButtonStyle('mobile-admin-dashboard', { backgroundColor: `${colors.text}08` })}>
                  <View style={iconHoverStyle('mobile-admin-dashboard')}><LayoutDashboard color={iconColor('mobile-admin-dashboard')} size={16} /></View>
                </Pressable>
              ) : null}
              {user && !isAdmin ? (
                <Pressable {...hoverProps('mobile-wallet')} onPress={openWalletMenu} className={`${narrowPhone ? 'h-[32px] w-[32px]' : 'h-[36px] w-[36px]'} relative items-center justify-center rounded-full`} style={iconButtonStyle('mobile-wallet', { backgroundColor: `${colors.success}1A` })}>
                  <View style={iconHoverStyle('mobile-wallet')}><Wallet color={colors.success} size={16} /></View>
                </Pressable>
              ) : null}
              {user ? (
                <Pressable {...hoverProps('mobile-notifications')} onPress={() => setMenu(menu === 'notifications' ? null : 'notifications')} className={`${narrowPhone ? 'h-[32px] w-[32px]' : 'h-[36px] w-[36px]'} relative items-center justify-center rounded-full`} style={iconButtonStyle('mobile-notifications', { backgroundColor: `${colors.text}08` })}>
                  <View style={iconHoverStyle('mobile-notifications')}><Bell color={iconColor('mobile-notifications')} size={16} /></View>
                  {unreadNotificationCount ? (
                    <View className="absolute items-center justify-center rounded-full bg-danger px-1" style={{ right: -2, top: -2, height: 16, minWidth: 16, borderWidth: 1.5, borderColor: colors.panel }}>
                      <Text className="text-[9px] font-bold text-white">
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ) : null}
              {user ? (
                <Pressable {...hoverProps('mobile-profile')} onPress={() => setMenu(menu === 'profile' ? null : 'profile')} className={`${narrowPhone ? 'h-[32px] w-[32px]' : 'h-[36px] w-[36px]'} relative items-center justify-center rounded-full`} style={iconButtonStyle('mobile-profile', { backgroundColor: `${colors.primary}1A` })}>
                  <View style={iconHoverStyle('mobile-profile')}><UserRound color={colors.primary} size={16} /></View>
                </Pressable>
              ) : null}
            </View>
          </View>
          {/* Row 2: Account Select & Action Buttons */}
          <View className="flex-row items-center gap-2">
            {user ? (
              <Pressable
                onPress={() => setMenu(menu === 'account' ? null : 'account')}
                className="h-[40px] flex-1 flex-row items-center justify-between rounded-xl border px-3"
                style={{
                  backgroundColor: menu === 'account' ? (darkMode ? '#1E232A' : '#FAFAFA') : colors.panel,
                  borderColor: menu === 'account' ? colors.primary : colors.border,
                  shadowColor: colors.primary,
                  shadowOpacity: menu === 'account' ? (darkMode ? 0.3 : 0.2) : 0,
                  shadowRadius: 8,
                  elevation: menu === 'account' ? 2 : 0,
                }}
              >
                <View className="flex-row items-center">
                  <View className="mr-2 flex-row items-center justify-center rounded px-1.5 py-1" style={{ backgroundColor: `${colors.primary}1A` }}>
                    <Activity size={10} color={colors.primary} className="mr-1" />
                    <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                      {selectedAccount?.type || 'Demo'}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold" numberOfLines={1} style={{ color: colors.text }}>
                    {money(selectedAccountBalance)} <Text className="text-[9px] font-bold" style={{ color: colors.muted }}>USD</Text>
                  </Text>
                </View>
                <ChevronDown size={14} color={colors.muted} />
              </Pressable>
            ) : null}
            {/* {user && !isAdmin ? (
              <Pressable
                {...hoverProps('mobile-deposit')}
                onPress={() => openSidePanel('deposit')}
                className="h-[40px] flex-row items-center justify-center rounded-xl px-3"
                style={[
                  {
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: colors.success,
                  },
                  hoveredAction === 'mobile-deposit' ? { backgroundColor: `${colors.success}1A` } : null
                ]}
              >
                <ArrowUp color={colors.success} size={14} strokeWidth={2.5} />
                <Text className="ml-1 text-xs font-bold" style={{ color: colors.success }}>Deposit</Text>
              </Pressable>
            ) : null} */}
          </View>
        </View>
      ) : (
        <View style={{ marginBottom: mobile ? 12 : 0, marginRight: mobile ? 0 : (compactDesktop ? 4 : 12), justifyContent: 'center' }}>
          <Pressable onPress={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <NovaLogo dark={darkMode} width={compactDesktop ? 125 : 155} height={compactDesktop ? 33 : 42} />
          </Pressable>
        </View>
      )}
      {!mobile && (
        <>
          <View className={`${compactDesktop ? 'h-[48px]' : 'h-[54px]'} w-px`} style={{ backgroundColor: desktopDivider }} />
          <View
            className={`${compactDesktop ? 'h-[48px]' : 'h-[54px]'} flex-row items-center justify-center`}
            style={{ paddingHorizontal: compactDesktop ? 16 : 24 }}
          >
            <View style={{ width: compactDesktop ? 80 : 100 }} className="justify-center">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-[8px] font-bold tracking-widest uppercase" style={{ color: desktopMuted }}>Vol Rate</Text>
                <Text className="text-[8px] font-black tracking-widest uppercase" style={{ color: symbolChange < 0 ? colors.danger : colors.success }}>
                  {percent(symbolChange)}
                </Text>
              </View>
              {(() => {
                const symbolStr = currentSymbol?.symbol || 'BTC';
                const isUp = symbolChange >= 0;
                const width = compactDesktop ? 80 : 100;
                const height = 18;
                const stepX = width / 11;
                
                let points = [];
                let lastX = 0;
                let lastY = 0;
                for (let i = 0; i < 12; i++) {
                  const seed = (symbolStr.charCodeAt(i % symbolStr.length) || i) * (i + 1);
                  const rawY = 2 + (seed % 12);
                  const trendOffset = isUp ? (12 - i) * 0.4 : i * 0.4;
                  const y = Math.max(1, Math.min(17, (rawY * 0.5) + trendOffset));
                  lastX = (i * stepX).toFixed(1);
                  lastY = y.toFixed(1);
                  points.push(`${lastX},${lastY}`);
                }
                const pointsStr = points.join(' ');
                const lineColor = isUp ? colors.success : colors.danger;
                
                return (
                  <View className="overflow-hidden" style={{ height: 18, width }}>
                    <Svg width={width} height={18} viewBox={`0 0 ${width} 18`}>
                      <Defs>
                        <LinearGradient id="volSpark" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor={lineColor} stopOpacity="0.6" />
                          <Stop offset="1" stopColor={lineColor} stopOpacity="0.0" />
                        </LinearGradient>
                        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                          <Stop offset="0%" stopColor={lineColor} stopOpacity="0.7" />
                          <Stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                        </RadialGradient>
                      </Defs>
                      <Polygon points={`${pointsStr} ${width},18 0,18`} fill="url(#volSpark)" />
                      <Polyline points={pointsStr} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <Circle cx={lastX} cy={lastY} r="5" fill="url(#glow)" />
                      <Circle cx={lastX} cy={lastY} r="1.5" fill={darkMode ? '#fff' : lineColor} />
                    </Svg>
                  </View>
                );
              })()}
            </View>
          </View>
          <View className={`${compactDesktop ? 'h-[48px]' : 'h-[54px]'} w-px`} style={{ backgroundColor: desktopDivider }} />
        </>
      )}
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
          className={`${twoRowDesktop ? 'h-[42px]' : compactDesktop ? 'h-[48px]' : 'h-[54px]'} flex-row items-center px-2`}
          style={twoRowDesktop ? { flexBasis: '100%', width: '100%', order: 2 } : { flex: 1, minWidth: 0 }}
        >
          {desktopMetrics.map(([label, value], index) => (
            <View
              key={label}
              className="min-w-0 justify-center px-2"
              style={{
                width: `${100 / desktopMetrics.length}%`,
                borderLeftWidth: index === 0 ? 0 : 1,
                borderColor: desktopDivider,
              }}
            >
              <Text className={`${compactDesktop ? 'text-[9px]' : 'text-[11px]'} font-bold uppercase tracking-wider`} numberOfLines={1} style={{ color: desktopMuted }}>{label}</Text>
              <Text className={`mt-0.5 ${compactDesktop ? 'text-xs' : 'text-[14px]'} font-bold`} numberOfLines={1} style={{ color: label === 'Net Profit' && summaryNetProfit < 0 ? colors.danger : desktopText }}>
                {label === 'Net Profit' && summaryNetProfit > 0 ? `+${value}` : value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {!mobile && isAdmin ? <View style={{ flex: 1 }} /> : null}
      {!mobile && user && !isAdmin ? (
        <Pressable
          onPress={() => setMenu(menu === 'account' ? null : 'account')}
          className={`${compactDesktop ? 'h-[36px]' : 'h-[40px]'} flex-row items-center rounded-lg border`}
          style={{
            paddingHorizontal: compactDesktop ? 10 : 12,
            backgroundColor: menu === 'account' ? colors.surface : colors.panel,
            borderColor: menu === 'account' ? colors.primary : colors.border,
            shadowColor: colors.primary,
            shadowOpacity: menu === 'account' ? (darkMode ? 0.3 : 0.2) : 0,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: menu === 'account' ? 3 : 0,
            cursor: 'pointer',
          }}
        >
          <View className="mr-2 flex-row items-center justify-center rounded px-2 py-1" style={{ backgroundColor: `${colors.primary}1A` }}>
            <Activity size={12} color={colors.primary} className="mr-1.5" />
            <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
              {selectedAccount?.type || 'Demo'}
            </Text>
          </View>
          <ChevronDown
            size={14}
            color={colors.muted}
            style={{
              transform: [{ rotate: menu === 'account' ? '180deg' : '0deg' }],
            }}
          />
        </Pressable>
      ) : null}
      {isAdmin ? (
        <Pressable {...hoverProps('admin-dashboard')} onPress={goToAdminDashboard} className="hidden items-center justify-center rounded-full lg:flex" style={iconButtonStyle('admin-dashboard', { width: compactDesktop ? 40 : 44, height: compactDesktop ? 40 : 44, backgroundColor: 'transparent' })}>
          <View style={iconHoverStyle('admin-dashboard')}><LayoutDashboard size={20} color={iconColor('admin-dashboard')} /></View>
        </Pressable>
      ) : null}
      <Pressable {...hoverProps('theme')} onPress={toggleTheme} className="hidden items-center justify-center rounded-full lg:flex" style={iconButtonStyle('theme', { width: compactDesktop ? 40 : 44, height: compactDesktop ? 40 : 44, backgroundColor: 'transparent' })}>
        <View style={iconHoverStyle('theme')}>{darkMode ? <Sun size={20} color={iconColor('theme')} /> : <Moon size={20} color={iconColor('theme')} />}</View>
      </Pressable>
      {user && !isAdmin ? (
        <Pressable {...hoverProps('wallet')} onPress={openWalletMenu} className="hidden items-center justify-center rounded-full lg:flex" style={iconButtonStyle('wallet', { width: compactDesktop ? 40 : 44, height: compactDesktop ? 40 : 44, backgroundColor: 'transparent' })}>
          <View style={iconHoverStyle('wallet')}><Wallet size={20} color={iconColor('wallet')} /></View>
        </Pressable>
      ) : null}
      {user ? (
        <Pressable {...hoverProps('notifications')} onPress={() => setMenu(menu === 'notifications' ? null : 'notifications')} className="hidden items-center justify-center rounded-full lg:flex" style={iconButtonStyle('notifications', { width: compactDesktop ? 40 : 44, height: compactDesktop ? 40 : 44, backgroundColor: 'transparent' })}>
          <View style={iconHoverStyle('notifications')}><Bell size={20} color={iconColor('notifications')} /></View>
          {unreadNotificationCount ? (
            <Text className="absolute right-0 top-0 min-w-[18px] rounded-full bg-danger px-1 text-center text-[10px] font-medium text-white">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </Text>
          ) : null}
        </Pressable>
      ) : null}
      {user ? (
        <Pressable {...hoverProps('profile')} onPress={() => setMenu(menu === 'profile' ? null : 'profile')} className="hidden items-center justify-center rounded-full lg:flex" style={iconButtonStyle('profile', { width: compactDesktop ? 40 : 44, height: compactDesktop ? 40 : 44, backgroundColor: 'transparent' })}>
          <View style={iconHoverStyle('profile')}><UserRound size={20} color={iconColor('profile')} /></View>
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
