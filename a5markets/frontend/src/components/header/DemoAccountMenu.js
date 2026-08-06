import { Check, Copy, Repeat2, WalletCards, X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { money } from '../../utils/formatters';
import { router } from 'expo-router';
import { navigateToA5App } from '../../utils/appHost';

function accountId(account) {
  return String(Number(account?.id || 0) + 4999).padStart(6, '0');
}

function accountLabel(account) {
  return account?.name || `${account?.type || 'Demo'} account`;
}

export default function DemoAccountMenu({ accounts = [], selectedAccount, onSelectAccount, onClose, onOpenPanel }) {
  const { user } = useAuth();
  const { colors } = useAppTheme();
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
  const isActiveLive = activeAccount?.type === 'Live';
  const activeBrandColor = isActiveLive ? '#0C9F91' : colors.primary;
  const activeBgColor = isActiveLive ? '#0C9F9110' : `${colors.primary}10`;
  const activeBorderColor = isActiveLive ? '#0C9F9125' : `${colors.primary}25`;

  const openPanel = (panel) => {
    onClose?.();
    if (panel === 'account') navigateToA5App('portal', '/dashboard?section=accounts', router);
    else onOpenPanel?.(panel);
  };

  return (
    <View
      className="absolute z-50 overflow-hidden rounded-lg border p-3 shadow-2xl"
      style={{
        width: isMobile ? 310 : 350,
        maxWidth: '92%',
        top: isMobile ? 96 : 74,
        left: isMobile ? 12 : 'auto',
        right: isMobile ? 'auto' : 190,
        backgroundColor: colors.panel,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
        transform: [{ translateY: 4 }],
      }}
    >
      <View className="mb-2.5 flex-row items-start justify-between">
        <View>
          <Text className="text-base font-bold" style={{ color: colors.text }}>Account</Text>
          <Text className="mt-0.5 text-[10px]" style={{ color: colors.muted }}>Switch accounts and manage trading access</Text>
        </View>
        <Pressable onPress={onClose} className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}>
          <X size={15} color={colors.text} />
        </Pressable>
      </View>

      {isMobile ? (
        <View>
          {/* Active Card - Compact Mobile */}
          <View className="mb-2 rounded-xl border p-2" style={{ borderColor: activeBorderColor, backgroundColor: activeBgColor }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: activeBrandColor }}>
                  <WalletCards size={16} color="#0B0B0B" />
                </View>
                <View className="ml-2.5">
                  <Text className="font-semibold text-xs" style={{ color: colors.text }}>{activeAccount?.type || 'Demo'} Account</Text>
                  <Text className="mt-0.5 text-[10px]" style={{ color: colors.muted }}>{accountLabel(activeAccount)}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-[9px]" style={{ color: colors.muted }}>Balance</Text>
                <Text className="text-sm font-bold" style={{ color: colors.text }}>
                  {money(activeAccount?.balance || 0)} {activeAccount?.currency || 'USD'}
                </Text>
              </View>
            </View>
            <View className="mt-2 flex-row items-center justify-between rounded-lg px-2 py-1" style={{ backgroundColor: colors.surface }}>
              <Text className="text-[10px] font-semibold" style={{ color: colors.muted }}>Account ID</Text>
              <View className="flex-row items-center">
                <Text className="mr-1.5 text-[10px] font-semibold" style={{ color: colors.text }}>#{accountId(activeAccount)}</Text>
                <Copy size={11} color={colors.muted} />
              </View>
            </View>
          </View>

          {/* Switch List - Compact Mobile */}
          <View className="mb-2">
            <Text className="mb-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: colors.muted }}>Switch account</Text>
            {tradingAccounts.map((account) => {
              const selected = String(account.id) === String(activeAccount?.id);
              const isLive = account.type === 'Live';
              const brandColor = isLive ? '#0C9F91' : colors.primary;
              const selectedBgColor = isLive ? '#0C9F9118' : `${colors.primary}18`;
              const selectedBorderColor = isLive ? '#0C9F91' : colors.primary;
              const unselectedIconBg = isLive ? '#0C9F9112' : `${colors.primary}12`;

              const statusTone = account.status === 'pending' ? colors.primary : colors.success;
              const showStatus = account.status && account.status !== 'active';

              return (
                <Pressable
                  key={account.id}
                  onPress={() => {
                    onSelectAccount?.(account);
                    notify?.({
                      type: 'success',
                      title: 'Account Switched',
                      message: `Successfully switched to ${account.type === 'Live' ? 'Live' : 'Demo'} Account (${accountLabel(account)}).`,
                      duration: 3000,
                    });
                  }}
                  className="mb-1.5 flex-row items-center rounded-lg border p-2"
                  style={{
                    backgroundColor: selected ? selectedBgColor : colors.surface,
                    borderColor: selected ? selectedBorderColor : colors.border,
                  }}
                >
                  <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: selected ? brandColor : unselectedIconBg }}>
                    {selected ? <Check size={14} color="#0B0B0B" /> : <Repeat2 size={13} color={brandColor} />}
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-[11px]" style={{ color: colors.text }}>{account.type || 'Demo'} - {accountLabel(account)}</Text>
                    <Text className="mt-0.5 text-[9px]" style={{ color: colors.muted }}>#{accountId(account)} | {money(account.balance || 0)} {account.currency || 'USD'}</Text>
                  </View>
                  {showStatus ? (
                    <Text className="text-[9px] font-semibold capitalize" style={{ color: statusTone }}>{account.status}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => openPanel('account')} className="mb-1 rounded-lg px-4 py-2" style={{ backgroundColor: colors.primary }}>
            <Text className="text-center font-semibold text-xs" style={{ color: '#0B0B0B' }}>Manage Accounts</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
          {/* Active Card - Desktop */}
          <View className="mb-3 rounded-2xl border p-3" style={{ borderColor: activeBorderColor, backgroundColor: activeBgColor }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: activeBrandColor }}>
                  <WalletCards size={20} color="#0B0B0B" />
                </View>
                <View className="ml-3">
                  <Text className="font-semibold text-sm" style={{ color: colors.text }}>{activeAccount?.type || 'Demo'} Account</Text>
                  <Text className="mt-0.5 text-xs" style={{ color: colors.muted }}>{accountLabel(activeAccount)}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-xs" style={{ color: colors.muted }}>Balance</Text>
                <Text className="text-base font-bold" style={{ color: colors.text }}>
                  {money(activeAccount?.balance || 0)} {activeAccount?.currency || 'USD'}
                </Text>
              </View>
            </View>
            <View className="mt-3 flex-row items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: colors.surface }}>
              <Text className="text-[11px] font-semibold" style={{ color: colors.muted }}>Account ID</Text>
              <View className="flex-row items-center">
                <Text className="mr-2 text-xs font-semibold" style={{ color: colors.text }}>#{accountId(activeAccount)}</Text>
                <Copy size={13} color={colors.muted} />
              </View>
            </View>
          </View>

          {/* Switch List - Desktop */}
          <View className="mb-3">
            <Text className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.muted }}>Switch account</Text>
            {tradingAccounts.map((account) => {
              const selected = String(account.id) === String(activeAccount?.id);
              const isLive = account.type === 'Live';
              const brandColor = isLive ? '#0C9F91' : colors.primary;
              const selectedBgColor = isLive ? '#0C9F9118' : `${colors.primary}18`;
              const selectedBorderColor = isLive ? '#0C9F91' : colors.primary;
              const unselectedIconBg = isLive ? '#0C9F9112' : `${colors.primary}12`;

              const statusTone = account.status === 'pending' ? colors.primary : colors.success;
              const showStatus = account.status && account.status !== 'active';

              return (
                <Pressable
                  key={account.id}
                  onPress={() => {
                    onSelectAccount?.(account);
                    notify?.({
                      type: 'success',
                      title: 'Account Switched',
                      message: `Successfully switched to ${account.type === 'Live' ? 'Live' : 'Demo'} Account (${accountLabel(account)}).`,
                      duration: 3000,
                    });
                  }}
                  className="mb-2 flex-row items-center rounded-xl border p-2.5"
                  style={{
                    backgroundColor: selected ? selectedBgColor : colors.surface,
                    borderColor: selected ? selectedBorderColor : colors.border,
                  }}
                >
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: selected ? brandColor : unselectedIconBg }}>
                    {selected ? <Check size={16} color="#0B0B0B" /> : <Repeat2 size={15} color={brandColor} />}
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-[11px]" numberOfLines={1} style={{ color: colors.text }}>{account.type || 'Demo'} - {accountLabel(account)}</Text>
                    <Text className="mt-0.5 text-[10px]" numberOfLines={1} style={{ color: colors.muted }}>#{accountId(account)} | {money(account.balance || 0)} {account.currency || 'USD'}</Text>
                  </View>
                  {showStatus ? (
                    <Text className="text-[10px] font-semibold capitalize" style={{ color: statusTone }}>{account.status}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => openPanel('account')} className="mb-2 rounded-lg px-4 py-2.5" style={{ backgroundColor: colors.primary }}>
            <Text className="text-center font-semibold text-sm" style={{ color: '#0B0B0B' }}>Manage Accounts</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
