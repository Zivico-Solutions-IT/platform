import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Animated, Image, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { ChevronDown, UserRound, ArrowUp, Bell, LayoutDashboard } from 'lucide-react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Polygon, Circle, RadialGradient } from 'react-native-svg';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { money, percent, quote } from '../../utils/formatters';
import { storage } from '../../utils/storage';
import { useAppTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { apiBaseUrl } from '../../services/apiConfig';
import { dashboardService } from '../../services/dashboardService';
import {
  buildAdminNotificationItems,
  emptyAdminNotificationData,
  loadAdminNotificationData,
} from '../../utils/adminNotifications';
import DemoAccountMenu from './DemoAccountMenu';
import FundingMenu from './FundingMenu';
import HeaderSidePanel from './HeaderSidePanel';
import ProfileMenu from './ProfileMenu';
import NotificationMenu from './NotificationMenu';
import NovaLogo from '../brand/NovaLogo';

function RotatingAccountMetric({ summary, colors, darkMode }) {
  const [metricIndex, setMetricIndex] = useState(0);
  const transition = useRef(new Animated.Value(1)).current;
  const metrics = useMemo(() => [
    { label: 'Equity', value: `$${money(summary?.equity || 0)}` },
    { label: 'Unrealized P/L', value: `${Number(summary?.openProfit || 0) >= 0 ? '+' : '-'}$${money(Math.abs(Number(summary?.openProfit || 0)))}`, tone: Number(summary?.openProfit || 0) >= 0 ? colors.success : colors.danger },
    { label: 'Balance', value: `$${money(summary?.balance || 0)}` },
    { label: 'Margin', value: `$${money(summary?.margin || 0)}` },
    { label: 'Free Margin', value: `$${money(summary?.freeFunds || 0)}` },
    { label: 'Margin Level', value: `${Number(summary?.marginLevel || 0).toFixed(2)}%` },
  ], [colors.danger, colors.success, summary?.balance, summary?.equity, summary?.freeFunds, summary?.margin, summary?.marginLevel, summary?.openProfit]);

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(transition, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setMetricIndex((current) => (current + 1) % metrics.length);
        transition.setValue(0);
        Animated.timing(transition, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, 2800);
    return () => clearInterval(timer);
  }, [metrics.length, transition]);

  const metric = metrics[metricIndex] || metrics[0];
  return (
    <View className="h-[42px] min-w-[150px] overflow-hidden rounded-xl border px-3 py-1" style={{ backgroundColor: darkMode ? '#101B29' : '#FBFCFA', borderColor: darkMode ? '#20334A' : '#E1EAE3' }}>
      <Animated.View style={{ opacity: transition, transform: [{ translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
        <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>{metric.label}</Text>
        <Text className="mt-0.5 text-sm font-bold" style={{ color: metric.tone || colors.text }}>{metric.value}</Text>
      </Animated.View>
    </View>
  );
}

export default function TopAccountBar() {
  const { width } = useWindowDimensions();
  const { currentSymbol, summary, selectedTradingAccount, setSelectedTradingAccount, sidePanel, setSidePanel, transactions } = useDemoTrading();
  const params = useLocalSearchParams();
  const { user, isAdmin, refreshUser } = useAuth();
  const { darkMode, colors } = useAppTheme();
  const profileHoverCloseRef = useRef(null);
  const [menu, setMenu] = useState(null);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [adminNotificationData, setAdminNotificationData] = useState(emptyAdminNotificationData);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [hoveredAction, setHoveredAction] = useState(null);
  const mobile = width < 1024;
  const narrowPhone = width < 380;
  const compactDesktop = !mobile && width < 1450;
  const showRotatingMetric = !mobile && width >= 1120;
  const compactHeaderStats = width < 1350;
  const twoRowDesktop = false;
  const isMobileLayout = width < 760;
  const showHeaderContent = !(isMobileLayout && sidePanel);
  const iconButtonHoverBg = darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(11, 11, 11, 0.04)';
  const rawProfileImage = user?.profileImage?.url || user?.profileImage || user?.avatarUrl || user?.avatar || null;
  const profileImageUri = rawProfileImage && /^(https?:|data:)/i.test(String(rawProfileImage))
    ? rawProfileImage
    : rawProfileImage
      ? `${apiBaseUrl().replace(/\/api\/?$/, '')}/${String(rawProfileImage).replace(/^\/+/, '')}`
      : null;

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
  const selectedAccountIsLive = String(selectedAccount?.type || '').toLowerCase() === 'live';
  const accountBadgeColor = selectedAccountIsLive ? colors.success : '#D8B536';
  const accountBadgeLabel = selectedAccountIsLive ? 'Live' : 'Demo';
  const routeAccountId = params.accountId ? String(params.accountId) : '';

  const symbolPrice = Number(currentSymbol?.price || currentSymbol?.bid || 0);
  const symbolChange = Number(currentSymbol?.change || 0);
  const symbolSpread = Number(currentSymbol?.spreadPoints ?? currentSymbol?.spread ?? 0);
  const desktopHeaderBg = darkMode ? '#02070d' : colors.background;
  const desktopDivider = darkMode ? '#172536' : colors.border;
  const desktopText = colors.text;
  const desktopMuted = darkMode ? '#66758a' : colors.muted;
  const sparklinePoints = symbolChange >= 0
    ? '2,34 15,31 26,32 37,24 48,27 58,10 67,18 78,20 90,7 100,12 112,4'
    : '2,7 15,12 26,10 37,18 48,16 58,29 67,22 78,25 90,33 100,28 112,35';

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

    const selectedExists = tradingAccounts.some((account) => String(account.id) === String(selectedTradingAccount?.id));
    if (!selectedExists) setSelectedTradingAccount(tradingAccounts[0]);
  }, [routeAccountId, selectedTradingAccount?.id, setSelectedTradingAccount, tradingAccounts]);

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

  const closeSidePanel = () => {
    const closingPanel = sidePanel;
    setSidePanel(null);
    if (mobile && closingPanel === 'history') {
      router.replace({ pathname: '/trading', params: { tab: 'wallet' } });
    }
  };

  const hoverProps = (action) => ({ onHoverIn: () => setHoveredAction(action), onHoverOut: () => setHoveredAction(null) });

  const cancelProfileHoverClose = () => { if (!profileHoverCloseRef.current) return; clearTimeout(profileHoverCloseRef.current); profileHoverCloseRef.current = null; };

  const openProfileMenu = (action) => { cancelProfileHoverClose(); setHoveredAction(action); setMenu((cur) => (cur === 'profile' ? cur : 'profile')); };

  const profileHoverProps = (action) => ({ onHoverIn: () => openProfileMenu(action), onHoverOut: () => setHoveredAction(null) });
  const openWalletMenu = () => setMenu('wallet');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('novafxm:open-wallet-funding', openWalletMenu);
    return () => window.removeEventListener('novafxm:open-wallet-funding', openWalletMenu);
  }, [openWalletMenu]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const openNotifications = () => setMenu('notifications');
    const openProfile = () => setMenu('profile');
    const closeMenus = () => setMenu(null);
    window.addEventListener('novafxm:open-notifications', openNotifications);
    window.addEventListener('novafxm:open-profile', openProfile);
    window.addEventListener('novafxm:close-header-menus', closeMenus);
    return () => {
      window.removeEventListener('novafxm:open-notifications', openNotifications);
      window.removeEventListener('novafxm:open-profile', openProfile);
      window.removeEventListener('novafxm:close-header-menus', closeMenus);
    };
  }, []);
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
          {/* Brand-free compact utility header */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-bold" style={{ color: colors.text }}>Trading</Text>
              <Text className="text-[9px]" style={{ color: colors.muted }}>Market terminal</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              {isAdmin ? (
                <Pressable {...hoverProps('mobile-admin-dashboard')} onPress={goToAdminDashboard} className={`${narrowPhone ? 'h-[32px] w-[32px]' : 'h-[36px] w-[36px]'} relative items-center justify-center rounded-full`} style={iconButtonStyle('mobile-admin-dashboard', { backgroundColor: `${colors.text}08` })}>
                  <View style={iconHoverStyle('mobile-admin-dashboard')}><LayoutDashboard color={iconColor('mobile-admin-dashboard')} size={16} /></View>
                </Pressable>
              ) : null}
              {user ? (
                <Pressable {...hoverProps('mobile-notifications')} onPress={() => setMenu(menu === 'notifications' ? null : 'notifications')} className={`${narrowPhone ? 'h-[36px] w-[36px]' : 'h-[42px] w-[42px]'} relative items-center justify-center rounded-full`} style={iconButtonStyle('mobile-notifications', { backgroundColor: darkMode ? 'rgba(216,181,54,0.10)' : '#FFFDF7', borderWidth: 1, borderColor: '#D8B536' })}>
                  <View style={iconHoverStyle('mobile-notifications')}><Bell color="#B8891E" size={18} strokeWidth={1.8} /></View>
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
                <Pressable {...hoverProps('mobile-profile')} onPress={() => setMenu(menu === 'profile' ? null : 'profile')} className={`${narrowPhone ? 'h-[32px] w-[30px]' : 'h-[38px] w-[34px]'} relative items-center justify-center rounded-full`} style={iconButtonStyle('mobile-profile', { backgroundColor: 'transparent' })}>
                  <View style={iconHoverStyle('mobile-profile')}>
                    {profileImageUri ? <Image source={{ uri: profileImageUri }} resizeMode="cover" style={{ width: 27, height: 27, borderRadius: 14 }} /> : <UserRound color={darkMode ? '#A7B1BF' : '#AEB4BD'} size={19} strokeWidth={1.8} />}
                  </View>
                </Pressable>
              ) : null}
            </View>
          </View>
          {/* Row 2: Account Select & Action Buttons */}
          <View className="w-full flex-row items-center gap-2">
            {user ? (
              <Pressable
                onPress={() => setMenu(menu === 'account' ? null : 'account')}
                className="h-[40px] w-full flex-row items-center justify-between rounded-xl px-3"
                style={{
                  backgroundColor: darkMode ? '#1E232A' : '#FBFAF7',
                  borderWidth: 1,
                  borderColor: darkMode ? '#353C45' : '#E2E5E9',
                  shadowColor: '#111827',
                  shadowOpacity: menu === 'account' ? 0.14 : 0.04,
                  shadowRadius: 8,
                  elevation: menu === 'account' ? 2 : 1,
                }}
              >
                <View className="flex-row items-center">
                  <View className="mr-2 rounded-full px-2.5 py-1" style={{ backgroundColor: accountBadgeColor }}>
                    <Text className="text-[11px] font-bold" style={{ color: selectedAccountIsLive ? '#FFFFFF' : '#5F4300' }}>
                      {accountBadgeLabel}
                    </Text>
                  </View>
                  <Text className="text-sm font-bold" numberOfLines={1} style={{ color: colors.text }}>
                    ${money(selectedAccountBalance)}
                  </Text>
                </View>
                <ChevronDown size={16} color={colors.muted} style={{ transform: [{ rotate: menu === 'account' ? '180deg' : '0deg' }] }} />
              </Pressable>
            ) : null}
            
          </View>
        </View>
      ) : (
        <View className="flex-row items-center" style={{ columnGap: compactDesktop ? 8 : 12 }}>
          <Pressable onPress={() => router.push('/')} style={{ cursor: 'pointer' }} accessibilityLabel="Home">
            <NovaLogo dark={darkMode} width={compactDesktop ? 102 : 122} height={compactDesktop ? 28 : 32} />
          </Pressable>
          {user && !isAdmin ? (
            <Pressable
              onPress={() => setMenu(menu === 'account' ? null : 'account')}
              onLayout={(event) => setAccountMenuAnchor(event.nativeEvent.layout)}
              className={`${compactDesktop ? 'h-[36px]' : 'h-[40px]'} flex-row items-center justify-between rounded-xl`}
              style={{
                width: compactDesktop ? 172 : 190,
                paddingHorizontal: compactDesktop ? 10 : 12,
                backgroundColor: darkMode ? '#1E232A' : '#FFFFFF',
                borderWidth: 1,
                borderColor: darkMode ? '#353C45' : '#E2E5E9',
                shadowColor: '#111827',
                shadowOpacity: menu === 'account' ? 0.14 : 0.04,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: menu === 'account' ? 2 : 1,
                cursor: 'pointer',
              }}
            >
              <View className="mr-2 rounded-full px-2.5 py-1" style={{ backgroundColor: accountBadgeColor }}>
                <Text className="text-[11px] font-bold" style={{ color: selectedAccountIsLive ? '#FFFFFF' : '#5F4300' }}>{accountBadgeLabel}</Text>
              </View>
              <Text className="mr-2 text-sm font-bold" numberOfLines={1} style={{ color: colors.text }}>${money(selectedAccountBalance)}</Text>
              <ChevronDown size={14} color={colors.muted} style={{ transform: [{ rotate: menu === 'account' ? '180deg' : '0deg' }] }} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('novafxm:toggle-market-watch'));
            }}
            className="flex-row items-center rounded-lg border px-2 py-1"
            style={{
              maxWidth: compactDesktop ? 190 : 270,
              backgroundColor: darkMode ? '#101B29' : '#F7FAF8',
              borderColor: darkMode ? '#20334A' : '#DCE7DF',
              cursor: 'pointer',
            }}
            accessibilityLabel="Open market watch"
          >
            <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: colors.success }} />
            <Text className="text-[11px] font-bold" style={{ color: desktopText }}>{currentSymbol?.symbol || 'Markets'}</Text>
            <ChevronDown size={11} color={desktopMuted} style={{ marginLeft: 2 }} />
            <Text className="ml-1.5 text-[11px] font-bold" style={{ color: symbolChange >= 0 ? colors.success : colors.danger }}>{quote(symbolPrice, currentSymbol?.decimals)}</Text>
            {!compactDesktop ? <Text className="ml-1 text-[9px] font-semibold" style={{ color: symbolChange >= 0 ? colors.success : colors.danger }}>{percent(symbolChange)}</Text> : null}
            {!compactDesktop ? <Text className="ml-1.5 text-[8px]" style={{ color: desktopMuted }}>Spread: {symbolSpread.toFixed(1)}</Text> : null}
          </Pressable>
        </View>
      )}
      {!mobile ? (
        <View className="flex-1 items-center justify-center">
          <View className="flex-row items-center" style={{ columnGap: compactHeaderStats ? 6 : 10 }}>
            {showRotatingMetric ? <RotatingAccountMetric summary={summary} colors={colors} darkMode={darkMode} /> : null}
            <View className="flex-row items-center rounded-xl border px-2 py-1" style={{ backgroundColor: darkMode ? '#101B29' : '#FBFCFA', borderColor: darkMode ? '#20334A' : '#E1EAE3' }}>
              <View className="flex-row items-center rounded-lg px-2 py-1" style={{ backgroundColor: darkMode ? '#113D35' : '#E8F8F0' }}>
                <View className="mr-1 h-2 w-2 rounded-full" style={{ backgroundColor: colors.success }} />
                <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.success }}>Market Live</Text>
              </View>
              <View className={`${compactHeaderStats ? 'mx-2' : 'mx-3'} h-7 w-px`} style={{ backgroundColor: desktopDivider }} />
              <View>
                <Text className="text-[8px] font-bold uppercase tracking-wider" style={{ color: desktopMuted }}>Bid</Text>
                <Text className="text-[12px] font-bold" style={{ color: colors.danger }}>{quote(currentSymbol?.bid ?? symbolPrice, currentSymbol?.decimals)}</Text>
              </View>
              <View className={`${compactHeaderStats ? 'mx-2' : 'mx-3'} h-7 w-px`} style={{ backgroundColor: desktopDivider }} />
              <View>
                <Text className="text-[8px] font-bold uppercase tracking-wider" style={{ color: desktopMuted }}>Ask</Text>
                <Text className="text-[12px] font-bold" style={{ color: colors.success }}>{quote(currentSymbol?.ask ?? symbolPrice, currentSymbol?.decimals)}</Text>
              </View>
              {!compactHeaderStats ? <Svg width={62} height={26} viewBox="0 0 112 40" style={{ marginLeft: 9 }}><Polyline points={sparklinePoints} fill="none" stroke={symbolChange >= 0 ? colors.success : colors.danger} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></Svg> : null}
            </View>
          </View>
        </View>
      ) : null}
      {isAdmin ? (
        <Pressable {...hoverProps('admin-dashboard')} onPress={goToAdminDashboard} className="hidden items-center justify-center rounded-full lg:flex" style={iconButtonStyle('admin-dashboard', { width: compactDesktop ? 40 : 44, height: compactDesktop ? 40 : 44, backgroundColor: 'transparent' })}>
          <View style={iconHoverStyle('admin-dashboard')}><LayoutDashboard size={20} color={iconColor('admin-dashboard')} /></View>
        </Pressable>
      ) : null}
      {user ? (
        <Pressable
          onPress={() => {
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('novafxm:open-new-order'));
          }}
          className="hidden items-center justify-center rounded-lg px-4 lg:flex"
          style={{ height: compactDesktop ? 34 : 38, backgroundColor: colors.primary, cursor: 'pointer' }}
          accessibilityLabel="Open new order"
        >
          <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#FFFFFF' }}>New Order</Text>
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
                  summary={summary}
                  onSelectAccount={selectAccount}
                  onClose={() => setMenu(null)}
                  onOpenPanel={openSidePanel}
                  anchor={accountMenuAnchor}
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
                  onOpenWallet={openWalletMenu}
                  selectedAccount={selectedAccount}
                  deposits={dashboard?.deposits || []}
                  transactions={dashboard?.transactions || transactions || []}
                />
              </Pressable>
            ) : null}
            {menu === 'notifications' ? (
              <Pressable onPress={(event) => event.stopPropagation()} style={{ flex: 1 }}>
                <NotificationMenu onClose={() => setMenu(null)} readIds={readNotificationIds} onReadAll={readAllNotifications} />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(sidePanel)} transparent animationType="fade" onRequestClose={closeSidePanel}>
        {sidePanel ? (
          <HeaderSidePanel
            type={sidePanel}
            selectedAccount={selectedAccount}
            summary={summary}
            onClose={closeSidePanel}
            onAccountsChanged={updateAccounts}
            onSelectAccount={selectAccount}
          />
        ) : null}
      </Modal>
    </View>
  );
}
