import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  DeviceEventEmitter,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  Copy,
  Plus,
  Repeat2,
  Settings2,
  ShieldCheck,
  Wallet,
  WalletCards,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { money } from '../../utils/formatters';

function accountId(account) {
  const id = Number(account?.id);
  return Number.isInteger(id) && id > 0 ? String(id + 2099).padStart(6, '0') : null;
}

function accountReference(account) {
  const id = accountId(account);
  return id ? `#${id}` : 'Loading…';
}

function accountLabel(account) {
  return account?.name || `${account?.type || 'Demo'} account`;
}

function MenuTile({ icon: Icon, title, subtitle, badge, onPress, palette, compact = false }) {
  return (
    <Pressable
      onPress={(event) => {
        event?.stopPropagation?.();
        onPress();
      }}
      className={`${compact ? 'min-h-[72px] p-2.5' : 'min-h-[88px] p-3'} flex-1 justify-between rounded-xl border transition-all`}
      style={{ backgroundColor: palette.tile, borderColor: palette.border }}
    >
      <View className="flex-row items-center justify-between">
        <Icon size={18} color={palette.accent} />
        {badge ? (
          <Text
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
            style={{ color: palette.accent, backgroundColor: `${palette.accent}20` }}
          >
            {badge}
          </Text>
        ) : null}
      </View>
      <View className="mt-2">
        <Text className="text-sm font-bold" style={{ color: palette.text }}>
          {title}
        </Text>
        <Text className="mt-0.5 text-[11px]" style={{ color: palette.muted }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

function MenuAction({ icon: Icon, title, subtitle, onPress, palette, compact = false }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={(event) => {
        event?.stopPropagation?.();
        onPress();
      }}
      style={{
        marginBottom: compact ? 6 : 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: compact ? 12 : 16,
        paddingVertical: compact ? 10 : 12,
        backgroundColor: pressed ? palette.tile : 'transparent',
      }}
    >
      <View className="flex-row items-center">
        <Icon size={18} color={palette.text} strokeWidth={1.8} />
        <View className="ml-3">
          <Text style={{ fontSize: compact ? 13 : 14, fontWeight: '600', color: palette.text }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 10, color: palette.muted, marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function DemoAccountMenu({
  accounts = [],
  selectedAccount,
  onSelectAccount,
  onClose,
  onOpenPanel,
  topOffset = 0,
}) {
  const { user } = useAuth();
  const { colors, darkMode } = useAppTheme();
  const { notify } = useToast();
  const { width, height } = useWindowDimensions();

  const slideAnim = useRef(new Animated.Value(410)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  const mobile = width < 990;
  const panelWidth = width < 500 ? width : 410;
  const panelHeight = Math.max(0, height - topOffset);

  const fallbackAccount = useMemo(
    () => ({
      id: `user-${user?.id || 27075}`,
      type: user?.accountType || 'Demo',
      name: user?.accountType === 'Live' ? 'Live account 1' : 'Demo account 1',
      status: user?.tradingStatus === 'frozen' ? 'frozen' : 'active',
      balance: user?.wallet?.balance || 0,
      currency: 'USD',
    }),
    [user?.accountType, user?.id, user?.tradingStatus, user?.wallet?.balance]
  );

  const tradingAccounts = accounts.length ? accounts : [fallbackAccount];
  const activeAccount = selectedAccount || tradingAccounts[0];
  const isActiveLive = activeAccount?.type === 'Live';

  const liveAccounts = tradingAccounts.filter((a) => a.type === 'Live');
  const demoAccounts = tradingAccounts.filter((a) => a.type !== 'Live');

  const palette = {
    panel: colors.panel,
    tile: colors.surface,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
    muted: colors.muted,
    accent: colors.primary,
    success: colors.success || '#10B981',
    danger: colors.danger || '#EF4444',
  };

  useEffect(() => {
    slideAnim.setValue(mobile ? panelWidth : -panelWidth);
    fadeAnim.setValue(0);
    contentAnim.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, contentAnim, mobile, panelWidth]);

  const openPanel = (panel) => {
    onClose?.();
    onOpenPanel?.(panel);
  };

  const copyAccountId = (account) => {
    const ref = accountReference(account);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ref.replace('#', ''));
    }
    notify?.({
      type: 'info',
      title: 'Copied',
      message: `Account reference ${ref} copied to clipboard.`,
      duration: 2000,
    });
  };

  return (
    <Animated.View
      className="overflow-hidden shadow-2xl"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: mobile ? 0 : undefined,
        left: mobile ? 0 : undefined,
        zIndex: 50,
        width: mobile ? '100%' : panelWidth,
        height: panelHeight,
        paddingTop: mobile ? 12 : 24,
        paddingBottom: mobile ? 12 : 20,
        paddingHorizontal: mobile ? 14 : 20,
        backgroundColor: palette.panel,
        borderLeftWidth: mobile ? 0 : 1,
        borderLeftColor: palette.border,
        borderRadius: mobile ? 0 : 20,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 28,
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, 0],
                }),
              },
            ],
          }}
        >
          {/* Header */}
          <View className={`${mobile ? 'mb-3' : 'mb-5'} flex-row items-center justify-between`}>
            <View>
              <Text className={`${mobile ? 'text-xl' : 'text-2xl'} font-bold`} style={{ color: palette.text }}>
                Trading Accounts
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: palette.muted }}>
                Switch accounts & manage trading access
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full border"
              style={{ backgroundColor: palette.tile, borderColor: palette.border }}
            >
              <X size={18} color={palette.text} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Active Account Highlight Card */}
          <View
            className="mb-4 rounded-2xl border p-4 shadow-sm"
            style={{
              backgroundColor: darkMode ? '#0c1813' : palette.card,
              borderColor: isActiveLive ? palette.success : palette.accent,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: isActiveLive ? `${palette.success}20` : `${palette.accent}20`,
                  }}
                >
                  <WalletCards size={20} color={isActiveLive ? palette.success : palette.accent} />
                </View>
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold" style={{ color: palette.text }}>
                      {accountLabel(activeAccount)}
                    </Text>
                    <View
                      className="px-1.5 py-0.5 rounded-md"
                      style={{
                        backgroundColor: isActiveLive ? `${palette.success}25` : `${palette.accent}25`,
                      }}
                    >
                      <Text
                        className="text-[9px] font-bold uppercase"
                        style={{ color: isActiveLive ? palette.success : palette.accent }}
                      >
                        {activeAccount?.type || 'Demo'}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => copyAccountId(activeAccount)}
                    className="flex-row items-center gap-1 mt-1"
                  >
                    <Text className="text-xs font-semibold" style={{ color: palette.muted }}>
                      ID: {accountReference(activeAccount)}
                    </Text>
                    <Copy size={11} color={palette.muted} />
                  </Pressable>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: palette.muted }}>
                  Balance
                </Text>
                <Text className="text-base font-bold mt-0.5" style={{ color: palette.text }}>
                  ${money(activeAccount?.balance || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Action Tiles */}
          <View className={`${mobile ? 'mb-3 gap-2' : 'mb-4 gap-3'} flex-row`}>
            <MenuTile
              icon={ArrowUp}
              title="Deposit"
              subtitle="Add trading funds"
              onPress={() => openPanel('deposit')}
              palette={palette}
              compact={mobile}
            />
            <MenuTile
              icon={ArrowDown}
              title="Withdraw"
              subtitle="Payout to wallet"
              onPress={() => openPanel('withdraw')}
              palette={palette}
              compact={mobile}
            />
          </View>

          {/* Live Accounts Section */}
          {liveAccounts.length > 0 ? (
            <View className="mb-3">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: palette.muted }}>
                Live Accounts ({liveAccounts.length})
              </Text>
              {liveAccounts.map((account) => {
                const selected = String(account.id) === String(activeAccount?.id);
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => {
                      onSelectAccount?.(account);
                      notify?.({
                        type: 'success',
                        title: 'Account Switched',
                        message: `Switched to Live Account (${accountLabel(account)}).`,
                        duration: 2500,
                      });
                      onClose?.();
                    }}
                    className="mb-2 flex-row items-center justify-between rounded-xl border p-3 transition-all"
                    style={{
                      backgroundColor: selected ? `${palette.success}15` : palette.tile,
                      borderColor: selected ? palette.success : palette.border,
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-8 w-8 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: selected ? palette.success : `${palette.success}18`,
                        }}
                      >
                        {selected ? (
                          <Check size={16} color="#FFFFFF" />
                        ) : (
                          <Repeat2 size={15} color={palette.success} />
                        )}
                      </View>
                      <View>
                        <Text className="text-xs font-bold" style={{ color: palette.text }}>
                          {accountLabel(account)}
                        </Text>
                        <Text className="text-[10px] mt-0.5" style={{ color: palette.muted }}>
                          {accountReference(account)} · {account.currency || 'USD'}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs font-bold" style={{ color: palette.text }}>
                        ${money(account.balance || 0)}
                      </Text>
                      <Text className="text-[9.5px] font-bold text-success" style={{ color: palette.success }}>
                        Live
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Demo Accounts Section */}
          <View className="mb-4">
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: palette.muted }}>
              Demo Accounts ({demoAccounts.length})
            </Text>
            {demoAccounts.map((account) => {
              const selected = String(account.id) === String(activeAccount?.id);
              return (
                <Pressable
                  key={account.id}
                  onPress={() => {
                    onSelectAccount?.(account);
                    notify?.({
                      type: 'success',
                      title: 'Account Switched',
                      message: `Switched to Demo Account (${accountLabel(account)}).`,
                      duration: 2500,
                    });
                    onClose?.();
                  }}
                  className="mb-2 flex-row items-center justify-between rounded-xl border p-3 transition-all"
                  style={{
                    backgroundColor: selected ? `${palette.accent}15` : palette.tile,
                    borderColor: selected ? palette.accent : palette.border,
                  }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="h-8 w-8 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: selected ? palette.accent : `${palette.accent}18`,
                      }}
                    >
                      {selected ? (
                        <Check size={16} color="#FFFFFF" />
                      ) : (
                        <Repeat2 size={15} color={palette.accent} />
                      )}
                    </View>
                    <View>
                      <Text className="text-xs font-bold" style={{ color: palette.text }}>
                        {accountLabel(account)}
                      </Text>
                      <Text className="text-[10px] mt-0.5" style={{ color: palette.muted }}>
                        {accountReference(account)} · {account.currency || 'USD'}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs font-bold" style={{ color: palette.text }}>
                      ${money(account.balance || 0)}
                    </Text>
                    <Text className="text-[9.5px] font-bold" style={{ color: palette.accent }}>
                      Demo
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Manage Accounts & Additional Actions */}
          <Text className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: palette.muted }}>
            Management
          </Text>

          <MenuAction
            icon={Settings2}
            title="Manage Accounts"
            subtitle="Create, configure, or deposit to accounts"
            onPress={() => openPanel('account')}
            palette={palette}
            compact={mobile}
          />

          <MenuAction
            icon={Clock}
            title="Trading History"
            subtitle="View past executions and closed positions"
            onPress={() => openPanel('history')}
            palette={palette}
            compact={mobile}
          />
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}
