import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AlertTriangle, CheckCircle2, CreditCard, ShieldCheck, Wallet, X } from 'lucide-react-native';
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

function NotificationItem({ Icon, title, body, time, tone, colors, read, onPress }) {
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

export default function NotificationMenu({ onClose, readIds = [], onReadAll }) {
  const { colors } = useAppTheme();
  const { user, isAdmin } = useAuth();
  const { transactions, setSidePanel } = useDemoTrading();
  const [dashboard, setDashboard] = useState(null);
  const [adminData, setAdminData] = useState(emptyAdminNotificationData);
  const { width } = useWindowDimensions();
  const isMobile = width < 992;

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

  return (
    <View
      className="absolute z-50 overflow-hidden rounded-xl border shadow-2xl"
      style={{
        width: isMobile ? 310 : 360,
        maxWidth: '92%',
        top: isMobile ? 54 : 74,
        right: 12,
        backgroundColor: colors.panel,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
      }}
    >
      <View className="flex-row items-center justify-between border-b px-4 py-3" style={{ borderColor: colors.border }}>
        <View>
          <Text className="text-sm font-medium" style={{ color: colors.text }}>{isAdmin ? 'Admin Notifications' : 'Notifications'}</Text>
          <Text className="text-[10px] font-semimedium uppercase" style={{ color: colors.muted }}>{isAdmin ? 'Requests waiting for action' : `${unreadCount} unread`}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => onReadAll?.(notifications.map((item) => item.id))} className="rounded-md px-3 py-2" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xs font-medium" style={{ color: colors.primary }}>Read all</Text>
          </Pressable>
          <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: colors.surface }}>
            <X size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <ScrollView style={{ maxHeight: 430 }} showsVerticalScrollIndicator={false}>
        {notifications.length ? notifications.map((item, index) => (
          <NotificationItem
            key={`${item.id}-${index}`}
            colors={colors}
            read={readIds.includes(item.id)}
            {...item}
            onPress={() => {
              onReadAll?.([item.id]);
              item.onPress?.();
            }}
          />
        )) : (
          <Text className="p-5 text-sm" style={{ color: colors.muted }}>{isAdmin ? 'No new admin notifications.' : 'No account notifications yet.'}</Text>
        )}
      </ScrollView>
    </View>
  );
}
