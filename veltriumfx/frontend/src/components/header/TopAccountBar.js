import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ChevronDown, Sun, Moon, UserRound, Bell, LayoutDashboard, Activity } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { money } from '../../utils/formatters';
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

const visibleMetricCount = 4;

export default function TopAccountBar() {
  const { width } = useWindowDimensions();
  const { summary, selectedTradingAccount, setSelectedTradingAccount, sidePanel, setSidePanel, transactions } = useDemoTrading();
  const params = useLocalSearchParams();
  const { user, isAdmin } = useAuth();
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
    id: `user-${user?.id || 'demo'}`,
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
  const accountTone = selectedAccount?.type === 'Live' ? colors.success : colors.primary;
  const desktopHeaderBg = darkMode ? '#06110f' : '#F4FBF8';
  const desktopHeaderSurface = darkMode ? '#0A1714' : '#FFFFFF';
  const desktopMetricSurface = darkMode ? '#071310' : '#ECF8F4';
  const desktopDivider = darkMode ? 'rgba(167, 214, 200, 0.14)' : '#C8DED7';
  const desktopText = colors.text;
  const desktopMuted = darkMode ? '#809891' : '#607973';

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
    let active = true;
    if (!user) {
      setAccounts([]);
      setSelectedTradingAccount(null);
      return undefined;
    }
    dashboardService.getDashboard()
      .then((result) => {
        if (!active) return;
        setDashboard(result);
        setAccounts(result.accounts || []);
      })
      .catch(() => {});
    const timer = setInterval(() => {
      dashboardService.getDashboard()
        .then((result) => {
          if (active) {
            setDashboard(result);
            setAccounts(result.accounts || []);
          }
        })
        .catch(() => {});
    }, 60000);
    return () => {
      active = false;
      clearInterval(timer);
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
    if (menu === 'profile' && (action === 'profile' || action === 'mobile-profile')) return true;
    if (menu === 'notifications' && (action === 'notifications' || action === 'mobile-notifications')) return true;
    return false;
  };

  const iconButtonStyle = (action, baseStyle) => {
    const active = isMenuActionActive(action);
    const hovered = hoveredAction === action;
    return [
      baseStyle,
      {
        cursor: 'pointer',
        borderWidth: 1,
        borderColor: 'transparent',
      },
      hovered || active
        ? {
            backgroundColor: active ? `${colors.primary}18` : iconButtonHoverBg,
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
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: mobile ? 0 : (showHeaderContent ? (darkMode ? 0.22 : 0.08) : 0),
        shadowRadius: 18,
        elevation: mobile ? 0 : (showHeaderContent ? 4 : 0),
        flexDirection: mobile ? 'column' : 'row',
        alignItems: mobile ? undefined : 'center',
        flexWrap: twoRowDesktop ? 'wrap' : 'nowrap',
        columnGap: mobile ? undefined : (compactDesktop ? 6 : 10),
        rowGap: twoRowDesktop ? 2 : 0,
        paddingHorizontal: mobile ? 8 : 18,
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
            <Pressable onPress={() => router.push('/')} style={{ cursor: 'pointer' }}>
              <NovaLogo dark={darkMode} width={narrowPhone ? 108 : 132} height={narrowPhone ? 28 : 35} />
            </Pressable>
            {user && !isAdmin ? (
              <Pressable
                onPress={() => setMenu(menu === 'account' ? null : 'account')}
                className="h-[32px] flex-row items-center justify-between rounded-xl border px-1.5"
                style={{
                  width: narrowPhone ? 92 : 112,
                  backgroundColor: menu === 'account' ? `${accountTone}18` : colors.panel,
                  borderColor: menu === 'account' ? accountTone : colors.border,
                  shadowColor: accountTone,
                  shadowOpacity: menu === 'account' ? (darkMode ? 0.24 : 0.14) : 0,
                  shadowRadius: 8,
                  elevation: menu === 'account' ? 2 : 0,
                }}
              >
                <View className="min-w-0 flex-1 flex-row items-center">
                  <View className="mr-1.5 flex-row items-center justify-center rounded-md px-1.5 py-1" style={{ backgroundColor: `${accountTone}18` }}>
                    <Activity size={10} color={accountTone} />
                    <Text className="ml-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: accountTone }}>
                      {selectedAccount?.type || 'Demo'}
                    </Text>
                  </View>
                  {!narrowPhone ? (
                    <Text className="min-w-0 flex-1 text-[10px] font-bold" numberOfLines={1} style={{ color: colors.text }}>
                      {money(selectedAccountBalance)}
                    </Text>
                  ) : null}
                </View>
                <ChevronDown size={12} color={colors.muted} />
              </Pressable>
            ) : null}
            <View className="flex-row items-center gap-1.5">
              <Pressable {...hoverProps('mobile-theme')} onPress={toggleTheme} className={`${narrowPhone ? 'h-[32px] w-[32px]' : 'h-[36px] w-[36px]'} relative items-center justify-center rounded-full`} style={iconButtonStyle('mobile-theme', { backgroundColor: `${colors.text}08` })}>
                <View style={iconHoverStyle('mobile-theme')}>{darkMode ? <Sun size={16} color={iconColor('mobile-theme')} /> : <Moon size={16} color={iconColor('mobile-theme')} />}</View>
              </Pressable>
              {isAdmin ? (
                <Pressable {...hoverProps('mobile-admin-dashboard')} onPress={goToAdminDashboard} className={`${narrowPhone ? 'h-[32px] w-[32px]' : 'h-[36px] w-[36px]'} relative items-center justify-center rounded-full`} style={iconButtonStyle('mobile-admin-dashboard', { backgroundColor: `${colors.text}08` })}>
                  <View style={iconHoverStyle('mobile-admin-dashboard')}><LayoutDashboard color={iconColor('mobile-admin-dashboard')} size={16} /></View>
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
        </View>
      ) : (
        <View style={{ marginBottom: mobile ? 12 : 0, marginRight: mobile ? 0 : (compactDesktop ? 4 : 10), justifyContent: 'center' }}>
          <Pressable
            onPress={() => router.push('/')}
            style={{
              cursor: 'pointer',
              borderRadius: 16,
              paddingHorizontal: compactDesktop ? 12 : 16,
              paddingVertical: compactDesktop ? 3 : 4,
              backgroundColor: desktopHeaderSurface,
              borderWidth: 1,
              borderColor: desktopDivider,
            }}
          >
            <NovaLogo dark={darkMode} width={compactDesktop ? 150 : 180} height={compactDesktop ? 38 : 44} />
          </Pressable>
        </View>
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
          className={`${twoRowDesktop ? 'h-[38px]' : compactDesktop ? 'h-[40px]' : 'h-[42px]'} flex-row items-center px-1.5`}
          style={[
            {
              borderRadius: 14,
              backgroundColor: desktopMetricSurface,
              borderWidth: 1,
              borderColor: desktopDivider,
            },
            twoRowDesktop ? { flexBasis: '100%', width: '100%', order: 2 } : { flex: 1, minWidth: 0 }
          ]}
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
              <Text className={`${compactDesktop ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase tracking-wider`} numberOfLines={1} style={{ color: desktopMuted }}>{label}</Text>
              <Text className={`${compactDesktop ? 'text-[11px]' : 'text-[13px]'} font-bold`} numberOfLines={1} style={{ color: label === 'Net Profit' && summaryNetProfit < 0 ? colors.danger : desktopText }}>
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
          className={`${compactDesktop ? 'h-[38px]' : 'h-[42px]'} flex-row items-center rounded-xl border`}
          style={{
            paddingHorizontal: compactDesktop ? 12 : 14,
            backgroundColor: menu === 'account' ? `${accountTone}18` : desktopHeaderSurface,
            borderColor: menu === 'account' ? accountTone : desktopDivider,
            borderWidth: 1.5,
            shadowColor: accountTone,
            shadowOpacity: menu === 'account' ? (darkMode ? 0.28 : 0.16) : (darkMode ? 0 : 0.08),
            shadowRadius: menu === 'account' ? 14 : 8,
            shadowOffset: { width: 0, height: 6 },
            elevation: menu === 'account' ? 4 : 1,
            cursor: 'pointer',
          }}
        >
          <View className="mr-2 flex-row items-center justify-center rounded-lg px-2 py-1" style={{ backgroundColor: `${accountTone}1A` }}>
            <Activity size={12} color={accountTone} className="mr-1.5" />
            <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accountTone }}>
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
                />
              </Pressable>
            ) : null}
            {menu === 'profile' ? (
              <Pressable onPress={(event) => event.stopPropagation()}>
                <ProfileMenu
                  onClose={() => setMenu(null)}
                  onHoverIn={cancelProfileHoverClose}
                  onOpenPanel={openSidePanel}
                  selectedAccount={selectedAccount}
                  summary={summary}
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

