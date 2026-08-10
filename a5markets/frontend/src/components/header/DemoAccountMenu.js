import { Check, Circle, Copy } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { money } from '../../utils/formatters';
import { router } from 'expo-router';
import { navigateToA5App } from '../../utils/appHost';

function accountId(account) {
  const id = Number(account?.id);
  return Number.isInteger(id) && id > 0
    ? String(id + 4999).padStart(6, '0')
    : 'Loading…';
}

function accountLabel(account) {
  return account?.name || `${account?.type || 'Demo'} account 1`;
}

export default function DemoAccountMenu({ accounts = [], selectedAccount, onSelectAccount, onClose, onOpenPanel }) {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const { notify } = useToast();
  const fallbackAccount = {
    id: `user-${user?.id || 27075}`,
    type: user?.accountType || 'Demo',
    name: user?.accountType === 'Live' ? 'Live account 1' : 'Demo account 1',
    balance: user?.wallet?.balance || 0,
    currency: 'USD',
  };
  const tradingAccounts = accounts.length ? accounts : [fallbackAccount];
  const activeAccount = selectedAccount || tradingAccounts[0];

  const openAccounts = () => {
    onClose?.();
    if (onOpenPanel) onOpenPanel('account');
    else navigateToA5App('portal', '/dashboard?section=accounts', router);
  };

  return (
    <View
      className="absolute z-50 overflow-hidden rounded-2xl border shadow-xl"
      style={{
        width: 208,
        top: 62,
        right: 190,
        backgroundColor: colors.panel,
        borderColor: colors.border,
        shadowColor: '#172536',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 7 },
        elevation: 12,
      }}
    >
      {tradingAccounts.map((account) => {
        const selected = String(account.id) === String(activeAccount?.id);
        const live = String(account.type || '').toLowerCase() === 'live';
        const statusColor = live ? '#ef4f5d' : '#3fd07f';
        const heading = live ? 'Standard' : 'Demo';

        return (
          <Pressable
            key={account.id}
            onPress={() => {
              onSelectAccount?.(account);
              notify?.({ type: 'success', title: 'Account switched', message: `${heading} account selected.`, duration: 2200 });
            }}
            className="border-b px-4 py-3"
            style={{ borderColor: colors.border, backgroundColor: selected ? `${colors.primary}10` : colors.panel }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium" style={{ color: colors.text }}>{heading}</Text>
              <View className="flex-row items-center">
                <View className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor }} />
                <Text className="text-xs" style={{ color: statusColor }}>{live ? 'Live' : 'Demo'}</Text>
              </View>
            </View>
            <View className="mt-1 flex-row items-center">
              {selected ? <Check size={20} color="#3fd07f" /> : <Circle size={20} color={colors.border} />}
              <View className="ml-3 flex-1">
                <Text className="text-xs" numberOfLines={1} style={{ color: colors.muted }}>{accountLabel(account)}</Text>
                <View className="mt-1 flex-row items-center">
                  <Text className="text-xs" style={{ color: colors.muted }}>Account ID : {accountId(account)}</Text>
                  <Copy className="ml-2" size={12} color={colors.border} />
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
      <Pressable onPress={openAccounts} className="items-center px-4 py-4" style={{ backgroundColor: colors.panel }}>
        <Text className="text-center text-xs font-medium" style={{ color: colors.text }}>+ OPEN NEW TRADING{`\n`}ACCOUNT</Text>
      </Pressable>
    </View>
  );
}
