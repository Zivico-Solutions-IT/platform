import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  Award,
  ArrowDown,
  ArrowUp,
  Clock,
  Gift,
  ArrowLeft,
  LogOut,
  Settings2,
  ShieldCheck,
  X,
  HelpCircle,
} from 'lucide-react-native';
import { Animated, Image, Pressable, ScrollView, Text, View, useWindowDimensions, DeviceEventEmitter } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { money } from '../../utils/formatters';
import { authService } from '../../services/authService';
import api from '../../services/api';

function initialsFor(user) {
  const name = user?.name || user?.email || 'Nova User';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NU';
}

function MenuTile({ icon: Icon, title, subtitle, badge, onPress, palette, compact = false }) {
  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      className={`${compact ? 'min-h-[82px] p-2.5' : 'min-h-[110px] p-3'} flex-1 justify-between rounded-xl`}
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

function MenuAction({ icon: Icon, title, onPress, danger = false, palette, compact = false }) {
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
        marginBottom: compact ? 6 : 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: compact ? 14 : 18,
        paddingVertical: compact ? 10 : 14,
        backgroundColor: pressed ? palette.tile : 'transparent',
      }}
    >
      <Icon size={20} color={danger ? palette.danger : palette.text} strokeWidth={1.8} />
      <Text style={{ marginLeft: 10, fontSize: compact ? 14 : 16, fontWeight: '500', color: danger ? palette.danger : palette.text }}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function ProfileMenu({ onClose, onHoverIn, onHoverOut, onOpenPanel, selectedAccount, deposits = [], transactions = [] }) {
  const { user: sessionUser, logout, isAdmin } = useAuth();
  const [user, setProfileUser] = useState(sessionUser);
  const [bonusPosts, setBonusPosts] = useState([]);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [showBonusPosts, setShowBonusPosts] = useState(false);
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(410)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const mobile = width < 990;
  const initials = useMemo(() => initialsFor(user), [user]);
  const verified = user?.verificationStatus === 'approved';
  const panelWidth = width < 500 ? width : 410;
  const panelHeight = height;
  const displayName = user?.name || 'Nova FXM Client';
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

  const loadBonusPosts = async () => {
    setBonusLoading(true);
    try {
      const response = await api.get('/bonus-posts');
      setBonusPosts(response.data?.posts || []);
    } catch (_) {
      setBonusPosts([]);
    } finally {
      setBonusLoading(false);
    }
  };

  // The profile menu must use the latest verification status, not only the
  // session snapshot created during login.
  useEffect(() => {
    let active = true;
    const loadProfile = () => authService.me()
      .then((result) => {
        if (active && result?.user) setProfileUser(result.user);
      })
      .catch(() => {});
    setProfileUser(sessionUser);
    loadProfile();
    const timer = setInterval(loadProfile, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [sessionUser?.id]);

  useEffect(() => {
    loadBonusPosts();
  }, [sessionUser?.id]);

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
    onOpenPanel?.(panel);
  };

  const signOut = async () => {
    await logout();
    onClose?.();
    router.replace('/login');
  };

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
        paddingTop: mobile ? 12 : 24,
        paddingBottom: mobile ? 12 : 20,
        paddingHorizontal: mobile ? 14 : 20,
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: mobile ? 4 : 0 }}>
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
          <View className={`${mobile ? 'mb-2' : 'mb-5'} flex-row items-center justify-between ${mobile ? '' : 'pl-[18px]'}`}>
            <Text className={`${mobile ? 'text-xl' : 'text-2xl'} font-medium`} style={{ color: palette.text }}>
              {showBonusPosts ? 'Bonus Offers' : 'My Profile'}
            </Text>
            <View className="flex-row items-center">
              {!showBonusPosts ? (
                <Pressable
                  onPress={() => {
                    setShowBonusPosts(true);
                    loadBonusPosts();
                  }}
                  className="mr-2 h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${palette.danger}16` }}
                  accessibilityLabel="View bonus offers"
                >
                  <Gift size={mobile ? 21 : 22} color={palette.danger} strokeWidth={2} />
                  {bonusPosts.length > 0 ? <View className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.danger }} /> : null}
                </Pressable>
              ) : (
                <Pressable onPress={() => setShowBonusPosts(false)} className="mr-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette.tile }} accessibilityLabel="Back to profile">
                  <ArrowLeft size={mobile ? 21 : 22} color={palette.text} strokeWidth={2} />
                </Pressable>
              )}
              <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center">
                <X size={mobile ? 24 : 26} color={palette.text} strokeWidth={1.8} />
              </Pressable>
            </View>
          </View>

          {showBonusPosts ? (
            <View className={mobile ? '' : 'px-[18px]'}>
              <Text className="mb-4 text-sm" style={{ color: palette.muted }}>Latest offers from VeltriumFX</Text>
              {bonusLoading ? <Text className="py-8 text-center text-sm" style={{ color: palette.muted }}>Loading bonus offers…</Text> : null}
              {!bonusLoading && bonusPosts.length === 0 ? (
                <View className="rounded-xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.tile }}>
                  <Gift size={26} color={palette.danger} strokeWidth={1.8} />
                  <Text className="mt-3 text-base font-medium" style={{ color: palette.text }}>No bonus offers yet</Text>
                  <Text className="mt-1 text-sm" style={{ color: palette.muted }}>New offers will appear here.</Text>
                </View>
              ) : null}
              {bonusPosts.map((post) => (
                <View key={post.id} className="mb-4 overflow-hidden rounded-xl border" style={{ borderColor: palette.border, backgroundColor: palette.tile }}>
                  <Image source={{ uri: post.image }} resizeMode="cover" style={{ width: '100%', height: mobile ? 185 : 205, backgroundColor: palette.card }} />
                  <Text className="p-3 text-base font-medium" style={{ color: palette.text }}>{post.title}</Text>
                </View>
              ))}
            </View>
          ) : (
            <>
          <View className={`${mobile ? 'mb-2' : 'mb-4'} flex-row items-center ${mobile ? '' : 'px-[18px]'}`}>
            <View className={`${mobile ? 'h-[42px] w-[42px]' : 'h-[50px] w-[50px]'} items-center justify-center rounded-full`} style={{ backgroundColor: palette.accent }}>
              <Text className="text-base font-medium text-medium">{initials}</Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semimedium" style={{ color: palette.text }}>
                Hey, <Text className="font-medium">{firstName.toUpperCase()}</Text>
              </Text>
              <Text className="mt-1 text-sm" style={{ color: palette.muted }}>{user?.email || 'client@veltriumfx.com'}</Text>
            </View>
          </View>

          {!isAdmin ? (
            <>
              <View className={`${mobile ? 'mb-2 p-3' : 'mb-4 p-4'} rounded-xl`} style={{ backgroundColor: palette.card }}>
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

              <View className={`${mobile ? 'mb-2 gap-2' : 'mb-4 gap-3'} flex-row`}>
                <MenuTile
                  icon={ShieldCheck}
                  title="Verification"
                  subtitle={verified ? 'Verified' : 'Unverified'}
                  badge={verified ? null : 'Unverified'}
                  onPress={() => openPanel('verification')}
                  palette={palette}
                  compact={mobile}
                />
                <MenuTile
                  icon={Award}
                  title="Referral Program"
                  subtitle="Invite & earn rewards"
                  onPress={() => openPanel('referral')}
                  palette={palette}
                  compact={mobile}
                />
              </View>

              <Text className={`${mobile ? 'mb-2 mt-1 text-base' : 'mb-4 mt-1 text-xl'} ${mobile ? 'pl-0' : 'pl-[18px]'} font-medium`} style={{ color: palette.text }}>
                Funding Options
              </Text>

              <MenuAction
                icon={ArrowUp}
                title="Deposit"
                onPress={() => openPanel('deposit')}
                palette={palette}
                compact={mobile}
              />
              <MenuAction
                icon={ArrowDown}
                title="Withdraw"
                onPress={() => openPanel('withdraw')}
                palette={palette}
                compact={mobile}
              />
              <MenuAction
                icon={Clock}
                title="Transaction History"
                onPress={() => openPanel('history')}
                palette={palette}
                compact={mobile}
              />
            </>
          ) : null}

          <Text className={`${mobile ? 'mb-2 text-base' : 'mb-4 text-xl'} ${mobile ? 'pl-0' : 'pl-[18px]'} font-medium`} style={{ color: palette.text }}>Account</Text>

          <MenuAction
            icon={Settings2}
            title="Settings"
            onPress={() => openPanel('settings')}
            palette={palette}
            compact={mobile}
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
              compact={mobile}
            />
          )}
          <MenuAction
            icon={LogOut}
            title="Sign Out"
            onPress={signOut}
            danger
            palette={palette}
            compact={mobile}
          />
            </>
          )}
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}
