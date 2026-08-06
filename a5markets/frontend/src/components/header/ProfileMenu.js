import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  Award,
  CircleGauge,
  Download,
  LogOut,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UserRound,
  Volume2,
  X,
  HelpCircle,
} from 'lucide-react-native';
import { Animated, Pressable, ScrollView, Text, View, useWindowDimensions, DeviceEventEmitter } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { money } from '../../utils/formatters';
import { navigateToA5App } from '../../utils/appHost';

function initialsFor(user) {
  const name = user?.name || user?.email || 'Nova User';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NU';
}

function MenuTile({ icon: Icon, title, subtitle, badge, onPress, palette }) {
  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      className="min-h-[110px] flex-1 justify-between rounded-xl p-3"
      style={{ backgroundColor: palette.tile }}
    >
      <View className="flex-row items-center justify-between">
        <Icon size={20} color={palette.text} />
        {badge ? (
          <Text className="rounded-md px-2 py-1 text-[11px] font-medium" style={{ color: palette.danger, backgroundColor: `${palette.danger}22` }}>
            {badge}
          </Text>
        ) : null}
      </View>
      <View>
        <Text className="text-base font-medium" style={{ color: palette.text }}>{title}</Text>
        <Text className="mt-1 text-xs" style={{ color: palette.muted }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function MenuAction({ icon: Icon, title, onPress, danger = false, palette }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      style={{
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: 18,
        paddingVertical: 14,
        backgroundColor: pressed ? palette.tile : 'transparent',
      }}
    >
      <Icon size={20} color={danger ? palette.danger : palette.text} strokeWidth={1.8} />
      <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: '500', color: danger ? palette.danger : palette.text }}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function ProfileMenu({ onClose, onHoverIn, onHoverOut, onOpenPanel, selectedAccount, deposits = [], transactions = [] }) {
  const { user, logout, isAdmin } = useAuth();
  const { colors, darkMode, toggleTheme } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const slideAnim = useRef(new Animated.Value(410)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const mobile = width < 990;
  const initials = useMemo(() => initialsFor(user), [user]);
  const verified = user?.verificationStatus === 'approved';
  const panelWidth = width < 500 ? width : 410;
  const panelHeight = height;
  const displayName = user?.name || 'A5 Markets Client';
  const firstName = displayName.split(/\s+/)[0] || 'Client';
  const accountType = selectedAccount?.type || user?.accountType || 'Demo';
  const selectedAccountId = selectedAccount?.id ? String(selectedAccount.id) : '';
  const approvedStatuses = ['approved', 'completed'];
  const liveAccountDeposits = accountType !== 'Live'
    ? []
    : deposits.filter((deposit) => (
      approvedStatuses.includes(deposit.status)
      && (!selectedAccountId || !deposit.tradingAccountId || String(deposit.tradingAccountId) === selectedAccountId)
    ));
  const liveDepositTotal = liveAccountDeposits.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);
  const completedDepositTotal = transactions
    .filter((transaction) => (
      ['deposit', 'admin_add_balance'].includes(transaction.type)
      && approvedStatuses.includes(transaction.status)
    ))
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0) + Number(transaction.bonus || 0), 0);
  const tradingLevelValue = liveDepositTotal || completedDepositTotal;
  const hasLiveDeposit = accountType === 'Live' && tradingLevelValue > 0;
  const showUpgradePrompt = accountType === 'Live' && !hasLiveDeposit;
  const liveTradingLevel = user?.tradingLevel || 'Standard';
  const levelTarget = 1000000;
  const levelProgress = accountType === 'Live'
    ? `${Math.min(100, Math.max(2, (tradingLevelValue / levelTarget) * 100))}%`
    : '0%';
  const palette = {
    panel: colors.panel,
    tile: colors.surface,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
    muted: colors.muted,
    accent: colors.primary,
    progress: colors.border,
    danger: colors.danger,
  };

  useEffect(() => {
    slideAnim.setValue(panelWidth);
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
  }, [fadeAnim, slideAnim, contentAnim, panelWidth]);

  const openPanel = (panel) => {
    onClose?.();
    const routes = {
      deposit: '/deposit',
      verification: '/verification',
      referral: '/broker-rewards',
      settings: '/profile',
    };
    if (routes[panel]) navigateToA5App('portal', routes[panel], router);
    else onOpenPanel?.(panel);
  };

  const signOut = async () => {
    await logout();
    onClose?.();
    router.replace('/login');
  };

  if (!mobile) {
    const compactAction = (Icon, label, onPress, trailing = null) => (
      <Pressable
        key={label}
        onPress={(event) => {
          event.stopPropagation?.();
          onPress?.();
        }}
        className="flex-row items-center px-5 py-3"
        style={{ cursor: 'pointer' }}
      >
        <Icon size={20} color="#707780" strokeWidth={1.8} />
        <Text className="ml-3 flex-1 text-[15px]" style={{ color: '#31343a' }}>{label}</Text>
        {trailing}
      </Pressable>
    );

    return (
      <View
        onPointerEnter={onHoverIn}
        onPointerLeave={onHoverOut}
        className="overflow-hidden rounded-2xl border bg-white"
        style={{
          position: 'absolute',
          right: 8,
          top: 68,
          zIndex: 80,
          width: 360,
          borderColor: '#e4e7eb',
          shadowColor: '#000',
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
      >
        <View className="py-2">
          {compactAction(ReceiptText, 'Withdraw', () => navigateToA5App('portal', '/withdraw', router))}
          {compactAction(TrendingUp, 'Deposit', () => navigateToA5App('portal', '/deposit', router))}
          {compactAction(Award, 'My Rewards', () => navigateToA5App('portal', '/broker-rewards', router))}
          {compactAction(CircleGauge, 'Mode', toggleTheme, (
            <View className="flex-row items-center rounded-full bg-[#f2f3f5] px-2 py-1">
              <Text className="text-base">☀️</Text>
              <View className="ml-2 h-5 w-5 rounded-full" style={{ backgroundColor: darkMode ? '#1f78bd' : '#344054' }} />
            </View>
          ))}
          {compactAction(Volume2, 'Sounds', () => setSoundsEnabled((value) => !value), (
            <Volume2 size={19} color={soundsEnabled ? '#707780' : '#c0c4ca'} />
          ))}
          {compactAction(LogOut, 'Sign Out', signOut)}
        </View>
        <View className="border-t px-5 py-3" style={{ borderColor: '#eceef1' }}>
          <View className="mb-2 flex-row items-center">
            <UserRound size={18} color="#7b8189" />
            <Text className="ml-3 text-xs" numberOfLines={1} style={{ color: '#7b8189' }}>Email : {user?.email || 'client@a5markets.com'}</Text>
          </View>
          <View className="mb-2 flex-row items-center">
            <Smartphone size={18} color="#7b8189" />
            <Text className="ml-3 text-xs" style={{ color: '#7b8189' }}>App Version : v1.0.0</Text>
          </View>
          <View className="flex-row items-center">
            <Download size={18} color="#7b8189" />
            <Text className="ml-3 text-xs" style={{ color: '#7b8189' }}>Last Data Fetch: {new Date().toLocaleString()}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      onPointerEnter={onHoverIn}
      onPointerLeave={onHoverOut}
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
        paddingTop: mobile ? 28 : 24,
        paddingBottom: mobile ? 24 : 20,
        paddingHorizontal: mobile ? 20 : 20,
        backgroundColor: palette.panel,
        borderLeftWidth: mobile ? 0 : 1,
        borderLeftColor: palette.border,
        borderTopLeftRadius: mobile ? 0 : 20,
        borderBottomLeftRadius: mobile ? 0 : 20,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 28,
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: mobile ? 24 : 0 }}>
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
          <View className={`mb-5 flex-row items-center justify-between ${mobile ? '' : 'pl-[18px]'}`}>
            <Text className={`${mobile ? 'text-2xl' : 'text-2xl'} font-medium`} style={{ color: palette.text }}>My Profile</Text>
            <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center">
              <X size={mobile ? 24 : 26} color={palette.text} strokeWidth={1.8} />
            </Pressable>
          </View>

          <View className={`mb-4 flex-row items-center ${mobile ? '' : 'px-[18px]'}`}>
            <View className="h-[50px] w-[50px] items-center justify-center rounded-full" style={{ backgroundColor: palette.accent }}>
              <Text className="text-base font-medium text-medium">{initials}</Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semimedium" style={{ color: palette.text }}>
                Hey, <Text className="font-medium">{firstName.toUpperCase()}</Text>
              </Text>
              <Text className="mt-1 text-sm" style={{ color: palette.muted }}>{user?.email || 'client@a5markets.com'}</Text>
            </View>
          </View>

          {!isAdmin ? (
            <>
              <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: palette.card }}>
                {showUpgradePrompt ? (
                  <View>
                    <Text className="text-base font-medium" style={{ color: palette.text }}>Upgrade Your Trading Level</Text>
                    <Text className="mt-2 text-xs leading-5" style={{ color: palette.muted }}>
                      Make your first deposit to activate your account level and unlock exclusive trading benefits.
                    </Text>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation?.();
                        openPanel('deposit');
                      }}
                      className="mt-4 self-start rounded-lg px-4 py-2"
                      style={{ backgroundColor: palette.accent }}
                    >
                      <Text className="text-xs font-medium text-medium">Deposit Now</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View className="flex-row justify-between">
                      <View>
                        <Text className="text-xs" style={{ color: palette.muted }}>Level</Text>
                        <Text className="mt-1 text-base font-medium" style={{ color: palette.text }}>{accountType === 'Demo' ? 'Demo' : liveTradingLevel}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs" style={{ color: palette.muted }}>{accountType === 'Demo' ? 'Account Type' : 'Trading Volume'}</Text>
                        <Text className="mt-1 text-base font-medium" style={{ color: palette.text }}>
                          {accountType === 'Demo' ? 'Demo' : `$${money(tradingLevelValue)} `}
                          {accountType === 'Demo' ? null : <Text style={{ color: palette.muted }}>/ $1,000,000</Text>}
                        </Text>
                      </View>
                    </View>
                    {accountType === 'Demo' ? null : (
                      <View className="mt-4 flex-row items-center">
                        <Award size={20} color={palette.accent} strokeWidth={1.8} />
                        <View className="mx-3 h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: palette.progress }}>
                          <View className="h-full rounded-full" style={{ width: levelProgress, backgroundColor: palette.accent }} />
                        </View>
                        <Award size={20} color={palette.muted} strokeWidth={1.8} />
                      </View>
                    )}
                  </>
                )}
              </View>

              <View className="mb-4 flex-row gap-3">
                <MenuTile
                  icon={ShieldCheck}
                  title="Verification"
                  subtitle={verified ? 'Verified' : 'Unverified'}
                  badge={verified ? null : 'Unverified'}
                  onPress={() => openPanel('verification')}
                  palette={palette}
                />
                <MenuTile
                  icon={Award}
                  title="Referral Program"
                  subtitle="Invite & earn rewards"
                  onPress={() => openPanel('referral')}
                  palette={palette}
                />
              </View>
            </>
          ) : null}

          <Text className={`mb-4 ${mobile ? 'pl-0' : 'pl-[18px]'} text-xl font-medium`} style={{ color: palette.text }}>Account</Text>

          <MenuAction
            icon={Settings2}
            title="Settings"
            onPress={() => openPanel('settings')}
            palette={palette}
          />
          {user?.role === 'user' && (
            <MenuAction
              icon={HelpCircle}
              title="Support AI"
              onPress={() => {
                onClose?.();
                DeviceEventEmitter.emit('openSupportChat');
              }}
              palette={palette}
            />
          )}
          <MenuAction
            icon={LogOut}
            title="Sign Out"
            onPress={signOut}
            danger
            palette={palette}
          />
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}
