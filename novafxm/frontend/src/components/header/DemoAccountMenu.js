import { Check, Circle, Monitor, Repeat2 } from 'lucide-react-native';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
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

export default function DemoAccountMenu({ accounts = [], selectedAccount, onSelectAccount, onClose, onOpenPanel, anchor }) {
  const { user } = useAuth();
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
  
  const tradingAccounts = accounts.length ? accounts : [fallbackAccount];
  const activeAccount = selectedAccount || tradingAccounts[0];
  
  const isMobile = width < 992;

  const openAccountManager = () => {
    onClose?.();
    onOpenPanel?.('account');
  };

  return (
    <View
      className="absolute z-50 rounded-[20px] border p-2.5 shadow-2xl"
      style={{
        width: isMobile ? undefined : 382,
        maxWidth: isMobile ? undefined : 382,
        top: isMobile ? 96 : 60,
        left: isMobile ? 4 : (anchor ? Math.max(12, anchor.x - 26) : 'auto'),
        right: isMobile ? 4 : (anchor ? 'auto' : 190),
        backgroundColor: '#FFFFFF',
        borderColor: '#E7E9ED',
        shadowColor: '#000',
        shadowOpacity: 0.13,
        shadowRadius: 22,
        elevation: 12,
        transform: [{ translateY: 2 }],
      }}
    >
      {tradingAccounts.map((account) => {
        const selected = String(account.id) === String(activeAccount?.id);
        const live = account.type === 'Live';
        const accent = live ? '#BF8B20' : '#37A866';

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
              backgroundColor: selected ? '#F4FCF7' : '#FFFFFF',
              borderColor: selected ? '#BFE5CC' : '#E3E5E8',
            }}
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: live ? '#FCF5E5' : '#EAF8EF' }}>
              {live ? <Repeat2 size={18} color={accent} /> : <Monitor size={18} color={accent} />}
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold" numberOfLines={1} style={{ color: '#1B2532' }}>{accountLabel(account)}</Text>
              <Text className="mt-0.5 text-xs font-medium" numberOfLines={1} style={{ color: '#66707D' }}>
                {accountReference(account)} · {account.type || 'Demo'}
              </Text>
            </View>
            <View className="ml-2 items-end">
              <Text className="text-base font-bold" style={{ color: selected ? '#1B2532' : '#9AA2AC' }}>{money(account.balance || 0)}</Text>
              <Text className="text-xs" style={{ color: '#737D89' }}>{account.currency || 'USD'}</Text>
            </View>
            <View className="ml-3">
              {selected ? (
                <View className="h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: '#37A866' }}>
                  <Check size={13} color="#FFFFFF" strokeWidth={3} />
                </View>
              ) : <Circle size={20} color="#D7DCE1" strokeWidth={1.2} />}
            </View>
          </Pressable>
        );
      })}
      <Pressable
        onPress={openAccountManager}
        className="mt-0.5 items-center rounded-xl py-3"
        style={{ backgroundColor: '#E0B231' }}
      >
        <Text className="text-sm font-bold" style={{ color: '#1B1B1B' }}>Manage Accounts</Text>
      </Pressable>
    </View>
  );
}
