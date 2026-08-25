import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Animated, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AlertTriangle, Bell, CheckCircle2, CreditCard, ShieldCheck, Wallet, X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import api from '../../services/api';
import { dashboardService } from '../../services/dashboardService';
import { dateTime, money } from '../../utils/formatters';
import {
  buildAdminNotificationItems,
  emptyAdminNotificationData,
  loadAdminNotificationData,
} from '../../utils/adminNotifications';

const notificationTimestamp = (...values) => {
  for (const value of values) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

function NotificationItem({ Icon, title, body, time, tone, colors, read, onPress, compact = false, mobileTheme }) {
  if (compact) {
    return (
      <Pressable onPress={onPress} className="flex-row border-b px-4 py-3" style={{ borderColor: colors.border, opacity: read ? 0.68 : 1 }}>
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: `${tone}22` }}>
          <Icon size={17} color={tone} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-medium" numberOfLines={1} style={{ color: colors.text }}>{title}</Text>
          <Text className="mt-0.5 text-[11px]" numberOfLines={2} style={{ color: colors.muted }}>{body}</Text>
          <Text className="mt-1 text-[9px] font-semimedium uppercase" numberOfLines={1} style={{ color: colors.muted }}>{time}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-row rounded-2xl border p-[14px]"
      style={{ backgroundColor: read ? mobileTheme.surface : mobileTheme.unreadSurface, borderColor: mobileTheme.border, opacity: read ? 0.78 : 1 }}
    >
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: `${tone}18` }}>
        <Icon size={17} color={tone} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-bold" numberOfLines={1} style={{ color: mobileTheme.text }}>{title}</Text>
        <Text className="mt-0.5 text-xs leading-[17px]" numberOfLines={2} style={{ color: mobileTheme.muted }}>{body}</Text>
        <Text className="mt-1.5 text-[10px]" numberOfLines={1} style={{ color: mobileTheme.subtle }}>{time}</Text>
      </View>
      {!read ? <View className="ml-2 mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: '#D9AC38' }} /> : null}
    </Pressable>
  );
}

export default function NotificationMenu({ onClose, readIds = [], onReadAll }) {
  const { colors, darkMode } = useAppTheme();
  const { user, isAdmin } = useAuth();
  const { transactions, setSidePanel } = useDemoTrading();
  const [dashboard, setDashboard] = useState(null);
  const [adminData, setAdminData] = useState(emptyAdminNotificationData);
  const { width, height } = useWindowDimensions();
  // On web this panel is rendered inside a modal portal. Use the browser
  // viewport so it remains docked to the right edge instead of inheriting a
  // narrow parent measurement.
  const viewportWidth = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : width;
  const isMobile = viewportWidth < 760;
  const panelWidth = isMobile ? viewportWidth : 410;
  const panelHeight = height;
  const slideAnim = useRef(new Animated.Value(410)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    const load = () => {
      if (!user) {
        setDashboard(null);
        setAdminData(emptyAdminNotificationData);
        return;
      }
      if (isAdmin) {
        loadAdminNotificationData(api)
          .then((result) => {
            if (active) setAdminData(result);
          })
          .catch(() => {});
        return;
      }
      dashboardService.getDashboard()
        .then((result) => {
          if (active) setDashboard(result);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAdmin, user]);

  const notifications = useMemo(() => {
    if (isAdmin) {
      const iconMap = {
        verification: ShieldCheck,
        deposit: Wallet,
        withdrawal: AlertTriangle,
        bank: CreditCard,
      };
      return buildAdminNotificationItems(adminData, {
        colors,
        dateTime,
        money,
        onNavigate: () => {
          onClose?.();
          router.push('/admin');
        },
      }).map((item) => ({ ...item, Icon: iconMap[item.icon] || AlertTriangle }));
    }

    const dashboardUser = dashboard?.user || user;
    const reviewedTransactions = dashboard?.transactions?.length ? dashboard.transactions : transactions;
    const bankAccounts = dashboard?.bankAccounts || [];
    const items = [];

    if (['approved', 'rejected'].includes(dashboardUser?.verificationStatus)) {
      const approved = dashboardUser.verificationStatus === 'approved';
      const notificationAt = dashboardUser.verificationReviewedAt || dashboardUser.updatedAt || dashboardUser.createdAt;
      items.push({
        id: `verification-${dashboardUser.verificationStatus}-${dashboardUser.verificationReviewedAt || dashboardUser.updatedAt || ''}`,
        Icon: approved ? CheckCircle2 : AlertTriangle,
        title: `Verification ${approved ? 'Approved' : 'Rejected'}`,
        body: approved ? 'Your account verification has been approved.' : 'Your verification was rejected. Please upload documents again.',
        sortAt: notificationTimestamp(notificationAt),
        time: notificationAt ? dateTime(notificationAt) : 'Account update',
        tone: approved ? colors.success : colors.danger,
        onPress: () => {
          setSidePanel('verification');
          onClose?.();
        },
      });
    }

    reviewedTransactions
      .filter((item) => ['deposit', 'withdrawal'].includes(item.type) && ['approved', 'completed', 'rejected'].includes(item.status))
      .slice(0, 8)
      .forEach((item) => {
        const approved = ['approved', 'completed'].includes(item.status);
        const label = item.type === 'deposit' ? 'Deposit' : 'Withdrawal';
        const bonus = item.type === 'deposit' ? Number(item.bonus || 0) : 0;
        const notificationAt = item.reviewedAt || item.updatedAt || item.createdAt;
        items.push({
          id: `${item.type}-${item.id}-${item.status}`,
          Icon: approved ? CheckCircle2 : AlertTriangle,
          title: `${label} ${approved ? 'Approved' : 'Rejected'}`,
          body: `${label} request for ${money(item.amount)} USD was ${approved ? 'approved' : 'rejected'}.${approved && bonus > 0 ? ` Bonus ${money(bonus)} USD added.` : ''}`,
          sortAt: notificationTimestamp(notificationAt),
          time: notificationAt ? dateTime(notificationAt) : 'Wallet update',
          tone: approved ? colors.success : colors.danger,
          onPress: () => {
            setSidePanel('history');
            onClose?.();
          },
        });
      });

    bankAccounts
      .filter((item) => ['approved', 'rejected'].includes(item.status))
      .slice(0, 4)
      .forEach((item) => {
        const approved = item.status === 'approved';
        const payoutType = String(`${item.bankName || ''} ${item.branchName || ''}`).toLowerCase().includes('trc20') ? 'TRC20' : 'Bank';
        const notificationAt = item.reviewedAt || item.updatedAt || item.createdAt;
        items.push({
          id: `bank-${item.id}-${item.status}`,
          Icon: CreditCard,
          title: `${payoutType} Details ${approved ? 'Approved' : 'Rejected'}`,
          body: approved ? `${payoutType} withdrawal details are approved.` : `${payoutType} withdrawal details were rejected. Please resubmit.`,
          sortAt: notificationTimestamp(notificationAt),
          time: notificationAt ? dateTime(notificationAt) : 'Account details',
          tone: approved ? colors.success : colors.danger,
          onPress: () => {
            setSidePanel('settings:payments');
            onClose?.();
          },
        });
      });

    return items
      .filter((item) => item.id)
      .sort((a, b) => b.sortAt - a.sortAt);
  }, [adminData, colors, dashboard, isAdmin, onClose, setSidePanel, transactions, user]);
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;
  const mobileTheme = darkMode
    ? { background: '#111827', header: '#161D27', surface: '#1B2430', unreadSurface: '#20281F', border: '#2C3746', text: '#F4F7FB', muted: '#A7B1BF', subtle: '#768295', close: '#222C38' }
    : { background: '#F6F5F1', header: '#FFFFFF', surface: '#FFFFFF', unreadSurface: '#FBF9F4', border: '#ECEAE3', text: '#1B1F27', muted: '#8A8F7C', subtle: '#B3B8AE', close: '#F4F2ED' };
  const panelBackground = darkMode ? colors.panel : '#FBFAF6';

  useEffect(() => {
    slideAnim.setValue(panelWidth);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, panelWidth, slideAnim]);

  return (
    <Animated.View
      className="z-50 overflow-hidden shadow-2xl"
      style={{
        // Keep this drawer on the same explicit right-side anchor as ProfileMenu.
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: isMobile ? 0 : undefined,
        left: isMobile ? 0 : undefined,
        width: isMobile ? '100%' : panelWidth,
        height: panelHeight,
        paddingTop: isMobile ? 0 : 20,
        paddingBottom: isMobile ? 0 : 20,
        paddingHorizontal: isMobile ? 0 : 20,
        backgroundColor: panelBackground,
        borderLeftWidth: isMobile ? 0 : 1,
        borderLeftColor: mobileTheme.border,
        borderTopLeftRadius: isMobile ? 0 : 20,
        borderBottomLeftRadius: isMobile ? 0 : 20,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 28,
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <View className="w-full flex-1 overflow-hidden" style={{ backgroundColor: panelBackground }}>
        <View className="flex-row items-start justify-between border-b px-5 pb-[18px] pt-[22px]" style={{ backgroundColor: panelBackground, borderColor: mobileTheme.border }}>
          <View className="flex-row flex-1 pr-3">
            <View className="mr-3 h-[38px] w-[38px] items-center justify-center rounded-[11px]" style={{ backgroundColor: '#FBF3E2' }}>
              <Bell size={18} color="#B8891E" strokeWidth={2} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[21px] font-semibold" style={{ color: mobileTheme.text }}>{isAdmin ? 'Admin Notifications' : 'Notifications'}</Text>
              <Text className="mt-1 text-[13px]" style={{ color: mobileTheme.muted }}>{isAdmin ? 'Requests waiting for action' : `${unreadCount} unread`}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} className="h-[30px] w-[30px] items-center justify-center rounded-full" style={{ backgroundColor: mobileTheme.close }}>
            <X size={15} color={mobileTheme.muted} strokeWidth={2.2} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: isMobile ? 20 : 18, paddingTop: 14, paddingBottom: 22 }} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View className="mb-[10px] flex-row justify-end">
            <Pressable onPress={() => onReadAll?.(notifications.map((item) => item.id))}>
              <Text className="text-[13px] font-bold" style={{ color: '#B8891E' }}>Mark all as read</Text>
            </Pressable>
          </View>
          <View className="gap-2">
            {notifications.length ? notifications.map((item, index) => (
              <NotificationItem
                key={`${item.id}-${index}`}
                colors={colors}
                mobileTheme={mobileTheme}
                read={readIds.includes(item.id)}
                {...item}
                onPress={() => {
                  onReadAll?.([item.id]);
                  item.onPress?.();
                }}
              />
            )) : (
              <View className="items-center py-8">
                <Bell size={22} color="#C9CDD4" />
                <Text className="mt-3 text-[13px] font-semibold" style={{ color: mobileTheme.text }}>{isAdmin ? 'No new admin notifications' : 'No account notifications yet'}</Text>
              </View>
            )}
          </View>
          <Text className="pb-1 pt-4 text-center text-xs" style={{ color: mobileTheme.muted }}>You&apos;re all caught up</Text>
        </ScrollView>
      </View>
    </Animated.View>
  );
}
