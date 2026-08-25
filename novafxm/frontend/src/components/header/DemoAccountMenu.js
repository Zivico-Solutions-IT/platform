import { Check, Circle, Copy, Monitor, Repeat2 } from 'lucide-react-native';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { money } from '../../utils/formatters';

function accountId(account) {
  const id = Number(account?.id);
  return Number.isInteger(id) && id > 0
    ? String(id + 4999).padStart(6, '0')
    : null;
}

function accountReference(account) {
  const id = accountId(account);
  return id ? `#${id}` : 'Loading…';
}

function accountLabel(account) {
  return account?.name || `${account?.type || 'Demo'} account`;
}

export default function DemoAccountMenu({ accounts = [], selectedAccount, summary = {}, onSelectAccount, onClose, onOpenPanel, anchor }) {
  const { user } = useAuth();
  const { darkMode, colors } = useAppTheme();
  const { notify } = useToast();
  const { width } = useWindowDimensions();
  
  const fallbackAccount = {
    id: `user-${user?.id || 27075}`,
    type: user?.accountType || 'Demo',
    name: user?.accountType === 'Live' ? 'Live account 1' : 'Demo account 1',
    status: user?.tradingStatus === 'frozen' ? 'frozen' : 'active',
    balance: user?.wallet?.balance || 0,
    currency: 'USD',
  };
  
  const tradingAccounts = [...(accounts.length ? accounts : [fallbackAccount])].sort((left, right) => {
    const rank = (account) => String(account?.type || '').toLowerCase() === 'live' ? 1 : 0;
    return rank(left) - rank(right);
  });
  const activeAccount = selectedAccount || tradingAccounts[0];
  const menuBackground = darkMode ? '#1E232A' : colors.panel;
  const cardBackground = darkMode ? '#242B33' : colors.surface;
  const defaultBorder = darkMode ? '#353C45' : colors.border;
  const activeBalance = Number(activeAccount?.balance || summary.balance || 0);
  const activeEquity = Number(summary.equity ?? activeBalance);
  const activeMargin = Number(summary.margin || 0);
  const activeProfit = Number(summary.openProfit || 0);
  const activeFreeMargin = activeEquity - activeMargin;
  const activeMarginLevel = Number(summary.marginLevel || 0);
  const activeLive = String(activeAccount?.type || '').toLowerCase() === 'live';
  
  const isMobile = width < 992;

  const openAccountManager = () => {
    onClose?.();
    onOpenPanel?.('account');
  };

  return (
    <View
      className="absolute z-50 rounded-[20px] border p-2.5 shadow-2xl"
      style={{
        width: isMobile ? Math.max(0, width - 24) : 420,
        maxWidth: isMobile ? Math.max(0, width - 24) : 420,
        top: isMobile ? 96 : 60,
        left: isMobile ? 12 : (anchor ? Math.max(12, anchor.x - 26) : 'auto'),
        right: isMobile ? undefined : (anchor ? 'auto' : 190),
        backgroundColor: menuBackground,
        borderColor: defaultBorder,
        shadowColor: '#000',
        shadowOpacity: 0.13,
        shadowRadius: 22,
        elevation: 12,
        transform: [{ translateY: 2 }],
      }}
    >
      <View className="mb-3 rounded-2xl border p-4" style={{ backgroundColor: cardBackground, borderColor: defaultBorder }}>
        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: activeLive ? `${colors.success}18` : `${colors.primary}20` }}>
                <Text className="text-[11px] font-bold" style={{ color: activeLive ? colors.success : colors.primary }}>{activeLive ? 'Live' : 'Demo'}</Text>
              </View>
              <Text className="text-xs font-medium" numberOfLines={1} style={{ color: colors.muted }}>{accountLabel(activeAccount)}</Text>
            </View>
            <Text className="mt-2 text-lg font-bold" style={{ color: colors.text }}>{money(activeEquity)} {activeAccount?.currency || 'USD'}</Text>
            <View className="mt-1 flex-row items-center">
              <Text className="text-xs" style={{ color: colors.muted }}>{accountReference(activeAccount)}</Text>
              <Copy size={13} color={colors.muted} style={{ marginLeft: 6 }} />
            </View>
          </View>
          <Text className="text-sm font-bold" style={{ color: activeProfit >= 0 ? colors.success : colors.danger }}>{activeProfit >= 0 ? '+' : ''}{money(activeProfit)}</Text>
        </View>
        <View className="my-3 h-px" style={{ backgroundColor: defaultBorder }} />
        {[
          ['Equity', activeEquity],
          ['Unrealized P/L', activeProfit],
          ['Balance', activeBalance],
          ['Margin', activeMargin],
          ['Free Margin', activeFreeMargin],
          ['Margin Level', activeMarginLevel ? `${money(activeMarginLevel)}%` : '—'],
        ].map(([label, value]) => (
          <View key={label} className="mb-1 flex-row items-center justify-between">
            <Text className="text-[13px]" style={{ color: colors.muted }}>{label}</Text>
            <Text className="text-[13px] font-bold" style={{ color: label === 'Unrealized P/L' && activeProfit < 0 ? colors.danger : colors.text }}>
              {typeof value === 'string' ? value : money(value)}
            </Text>
          </View>
        ))}
      </View>
      <Text className="mb-2 px-1 text-xs font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Switch Account</Text>
      {tradingAccounts.map((account) => {
        const selected = String(account.id) === String(activeAccount?.id);
        const live = account.type === 'Live';
        const accent = live ? colors.success : colors.primary;

        return (
          <Pressable
            key={account.id}
            onPress={() => {
              onSelectAccount?.(account);
              notify?.({
                type: 'success',
                title: 'Account switched',
                message: `Switched to ${accountLabel(account)}.`,
                duration: 3000,
              });
            }}
            className="mb-2 flex-row items-center rounded-xl border px-3 py-2.5"
            style={{
              backgroundColor: selected ? (darkMode ? '#1C3024' : `${colors.success}12`) : cardBackground,
              borderColor: selected ? (darkMode ? '#3C8055' : `${colors.success}55`) : defaultBorder,
            }}
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: live ? `${colors.success}16` : `${colors.primary}16` }}>
              {live ? <Repeat2 size={18} color={accent} /> : <Monitor size={18} color={accent} />}
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold" numberOfLines={1} style={{ color: colors.text }}>{accountLabel(account)}</Text>
              <Text className="mt-0.5 text-xs font-medium" numberOfLines={1} style={{ color: colors.muted }}>
                {accountReference(account)} · {account.type || 'Demo'}
              </Text>
            </View>
            <View className="ml-2 items-end">
              <Text className="text-base font-bold" style={{ color: selected ? colors.text : (darkMode ? '#8F99A5' : '#9AA2AC') }}>{money(account.balance || 0)}</Text>
              <Text className="text-xs" style={{ color: colors.muted }}>{account.currency || 'USD'}</Text>
            </View>
            <View className="ml-3">
              {selected ? (
                <View className="h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: '#37A866' }}>
                  <Check size={13} color="#FFFFFF" strokeWidth={3} />
                </View>
              ) : <Circle size={20} color={darkMode ? '#667085' : colors.border} strokeWidth={1.2} />}
            </View>
          </Pressable>
        );
      })}
      <Pressable
        onPress={openAccountManager}
        className="mt-0.5 items-center rounded-xl py-3"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-sm font-bold" style={{ color: '#1B1B1B' }}>Manage Accounts</Text>
      </Pressable>
    </View>
  );
}
