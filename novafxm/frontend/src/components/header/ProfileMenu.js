import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  Award,
  Gift,
  ArrowLeft,
  LogOut,
  Settings2,
  ShieldCheck,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { Animated, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
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

function MenuTile({ icon: Icon, title, subtitle, badge, onPress, palette }) {
  const verificationTile = title === 'Verification';
  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      className="min-h-[110px] flex-1 justify-between rounded-2xl border p-[15px]"
      style={{ backgroundColor: palette.tile, borderColor: palette.border }}
    >
      <View className="flex-row items-center justify-between">
        <View className="h-8 w-8 items-center justify-center rounded-[9px]" style={{ backgroundColor: verificationTile ? `${palette.danger}16` : `${palette.accent}16` }}>
          <Icon size={16} color={verificationTile ? palette.danger : palette.accent} strokeWidth={2} />
        </View>
        {badge ? (
          <Text className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ color: palette.danger, backgroundColor: `${palette.danger}16` }}>
            {badge}
          </Text>
        ) : null}
      </View>
      <View>
        <Text className="text-[14px] font-bold" style={{ color: palette.text }}>{title}</Text>
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
        borderRadius: 14,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: 14,
        paddingVertical: 11,
        backgroundColor: danger ? `${palette.danger}12` : pressed ? palette.card : palette.tile,
      }}
    >
      <View className="h-8 w-8 items-center justify-center rounded-[9px]" style={{ backgroundColor: danger ? palette.tile : palette.iconBackground }}>
        <Icon size={16} color={danger ? palette.danger : palette.icon} strokeWidth={2} />
      </View>
      <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, fontWeight: danger ? '700' : '600', color: danger ? palette.danger : palette.text }}>
        {title}
      </Text>
      {!danger ? <ChevronRight size={16} color={palette.chevron} strokeWidth={2} /> : null}
    </Pressable>
  );
}

export default function ProfileMenu({ onClose, onHoverIn, onHoverOut, onOpenPanel, selectedAccount, deposits = [], transactions = [] }) {
  const { user: sessionUser, logout, isAdmin } = useAuth();
  const [user, setProfileUser] = useState(sessionUser);
  const [bonusPosts, setBonusPosts] = useState([]);
  const [bonusCount, setBonusCount] = useState(0);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [showBonusPosts, setShowBonusPosts] = useState(false);
  const { colors, darkMode } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(410)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const mobile = width < 990;
  const initials = useMemo(() => initialsFor(user), [user]);
  const verified = user?.verificationStatus === 'approved';
  const panelWidth = width < 500 ? width : 410;
  const panelHeight = height;
  const bonusPreviewHeight = mobile ? 170 : 195;
  const displayName = user?.name || 'Nova FXM Client';
  const firstName = displayName.split(/\s+/)[0] || 'Client';
  const accountType = selectedAccount?.type || user?.accountType || 'Demo';
  const liveTradingLevel = user?.tradingLevel || 'Standard';
  const profileAccountId = String(Number(selectedAccount?.id || 0) + 4999).padStart(6, '0');
  const palette = {
    panel: darkMode ? colors.panel : '#FBFAF6',
    tile: darkMode ? colors.surface : '#FFFFFF',
    card: darkMode ? colors.surface : '#FFFFFF',
    border: darkMode ? colors.border : '#ECEAE3',
    text: colors.text,
    muted: colors.muted,
    accent: colors.primary,
    progress: colors.border,
    danger: colors.danger,
    iconBackground: darkMode ? colors.panel : '#F4F2ED',
    icon: darkMode ? colors.text : '#5C635A',
    chevron: darkMode ? colors.muted : '#C9CDD4',
  };

  const loadBonusPosts = async () => {
    setBonusLoading(true);
    try {
      const response = await api.get('/bonus-posts');
      const posts = response.data?.posts || [];
      setBonusPosts(posts);
      setBonusCount(posts.length);
    } catch (_) {
      setBonusPosts([]);
    } finally {
      setBonusLoading(false);
    }
  };

  const loadBonusCount = async () => {
    try {
      const response = await api.get('/bonus-posts/count');
      setBonusCount(Number(response.data?.count || 0));
    } catch (_) {
      setBonusCount(0);
    }
  };

  // Always render this menu from a fresh profile response. This avoids a
  // stale session object showing "Unverified" after an admin has approved it.
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
    loadBonusCount();
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
        paddingTop: mobile ? 0 : 20,
        paddingBottom: mobile ? 0 : 20,
        paddingHorizontal: mobile ? 0 : 20,
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
          <View
            className={`mb-[10px] flex-row items-center justify-between ${mobile ? 'px-5 pt-5' : 'pl-[18px]'}`}
            style={mobile ? { backgroundColor: palette.panel } : undefined}
          >
            <Text className={`${mobile ? 'text-[19px]' : 'text-2xl'} font-bold`} style={{ color: palette.text }}>{showBonusPosts ? 'Bonus Offers' : 'My Profile'}</Text>
            <View className="flex-row items-center">
              {!showBonusPosts ? (
                <Pressable onPress={() => { setShowBonusPosts(true); loadBonusPosts(); }} className="mr-2 h-8 w-8 items-center justify-center rounded-[10px]" style={{ backgroundColor: darkMode ? `${palette.accent}22` : '#FBF3E2' }} accessibilityLabel="View bonus offers">
                  <Gift size={16} color={palette.accent} strokeWidth={2} />
                  {bonusCount > 0 ? (
                    <View className="absolute right-0 top-0 h-[18px] min-w-[18px] items-center justify-center rounded-full px-1" style={{ backgroundColor: palette.danger, borderWidth: 2, borderColor: palette.panel }}>
                      <Text className="text-[10px] font-bold text-white">{bonusCount > 9 ? '9+' : bonusCount}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ) : (
                <Pressable onPress={() => setShowBonusPosts(false)} className="mr-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette.tile }} accessibilityLabel="Back to profile">
                  <ArrowLeft size={mobile ? 21 : 22} color={palette.text} strokeWidth={2} />
                </Pressable>
              )}
              <Pressable onPress={onClose} className="h-[30px] w-[30px] items-center justify-center rounded-[10px]" style={{ backgroundColor: palette.iconBackground }}>
                <X size={18} color={palette.icon} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>

          {showBonusPosts ? (
            <View className={mobile ? 'px-4' : 'px-[18px]'}>
              <Text className="mb-4 text-sm" style={{ color: palette.muted }}>Latest offers from NovaFXM</Text>
              {bonusLoading ? <Text className="py-8 text-center text-sm" style={{ color: palette.muted }}>Loading bonus offers…</Text> : null}
              {!bonusLoading && bonusPosts.length === 0 ? (
                <View className="rounded-xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.tile }}>
                  <Gift size={26} color={palette.danger} strokeWidth={1.8} />
                  <Text className="mt-3 text-base font-medium" style={{ color: palette.text }}>No bonus offers yet</Text>
                  <Text className="mt-1 text-sm" style={{ color: palette.muted }}>New offers will appear here.</Text>
                </View>
              ) : null}
              {bonusPosts.map((post) => (
                <View key={post.id} className="mb-5 overflow-hidden rounded-xl border" style={{ alignSelf: 'center', width: mobile ? '100%' : (bonusPosts.length === 1 ? '94%' : '84%'), borderColor: palette.border, backgroundColor: palette.tile }}>
                  <Image source={{ uri: post.image }} resizeMode="contain" style={{ width: '100%', height: bonusPosts.length === 1 ? (mobile ? 270 : 310) : bonusPreviewHeight, backgroundColor: palette.card }} />
                  <Text className="p-3 text-base font-medium" style={{ color: palette.text }}>{post.title}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className={mobile ? 'px-5 pt-3' : undefined}>

          <View className={`relative mb-4 overflow-hidden rounded-[28px] border px-5 pb-7 pt-6 ${mobile ? '' : 'mx-[18px]'}`} style={{ backgroundColor: darkMode ? palette.card : '#FFFDF9', borderColor: darkMode ? palette.border : '#ECE6D6' }}>
            <Svg width="166" height="166" viewBox="0 0 166 166" style={{ position: 'absolute', right: -52, top: -52, opacity: darkMode ? 0.55 : 0.7 }}>
              <Circle cx="83" cy="83" r="82" fill="none" stroke={darkMode ? palette.accent : '#E9CB84'} strokeWidth="1" />
              <Circle cx="83" cy="83" r="60" fill="none" stroke={darkMode ? palette.accent : '#E9CB84'} strokeWidth="1" />
            </Svg>
            <View className="relative flex-row items-center justify-between">
              <Text className="text-[10px] font-bold uppercase" style={{ letterSpacing: 1, color: darkMode ? palette.muted : '#A79F87' }}>Welcome Back</Text>
              <View className="rounded-full border px-3 py-1" style={{ backgroundColor: darkMode ? `${palette.accent}22` : '#FFF9ED', borderColor: darkMode ? palette.accent : '#E9CB84' }}>
                <Text className="text-[10px] font-bold" style={{ color: darkMode ? palette.accent : '#B8891E' }}>{accountType}</Text>
              </View>
            </View>
            <View className="relative mt-6 flex-row items-center">
              <View className="h-[70px] w-[70px] items-center justify-center rounded-full border-[3px]" style={{ backgroundColor: darkMode ? palette.accent : '#E7B84C', borderColor: '#FFFFFF', shadowColor: '#B8891E', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }}>
                <Text className="text-[20px] font-bold" style={{ color: '#241A02' }}>{initials}</Text>
                <View className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-[3px]" style={{ backgroundColor: '#36B86D', borderColor: '#FFFFFF' }} />
              </View>
              <View className="ml-[14px] flex-1">
                <Text className="text-[21px] font-bold" style={{ color: palette.text, fontFamily: 'Georgia, serif' }}>{displayName}</Text>
                <Text className="mt-0.5 text-xs" style={{ color: darkMode ? palette.muted : '#8C93A0' }}>{user?.email || 'client@novafxm.com'}</Text>
              </View>
            </View>
            <View className="relative mt-6 flex-row overflow-hidden rounded-[18px]" style={{ backgroundColor: darkMode ? palette.panel : '#FBFAF6' }}>
              <View className="flex-1 px-3 py-4">
                <Text className="text-[9.5px] uppercase" style={{ minHeight: 24, letterSpacing: 0.5, color: darkMode ? palette.muted : '#A79F87' }}>Level</Text>
                <Text className="mt-1 text-[15px] font-bold" style={{ color: palette.text }}>{accountType === 'Demo' ? 'Demo' : liveTradingLevel}</Text>
              </View>
              <View className="flex-1 border-l px-3 py-4" style={{ borderColor: darkMode ? palette.border : '#ECE6D6' }}>
                <Text className="text-[9.5px] uppercase" style={{ minHeight: 24, letterSpacing: 0.5, color: darkMode ? palette.muted : '#A79F87' }}>Account Type</Text>
                <Text className="mt-1 text-[15px] font-bold" style={{ color: palette.text }}>{accountType}</Text>
              </View>
              <View className="flex-1 border-l px-3 py-4" style={{ borderColor: darkMode ? palette.border : '#ECE6D6' }}>
                <Text className="text-[9.5px] uppercase" style={{ minHeight: 24, letterSpacing: 0.5, color: darkMode ? palette.muted : '#A79F87' }}>Account ID</Text>
                <Text className="mt-1 text-[15px] font-bold" style={{ color: palette.text }}>#{profileAccountId}</Text>
              </View>
            </View>
          </View>

          {!isAdmin ? (
            <View className="mb-[22px] flex-row gap-[10px]">
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
          ) : null}

          <Text className={`mb-3 ${mobile ? 'pl-0' : 'pl-[18px]'} text-base font-bold`} style={{ color: palette.text }}>Account</Text>

          <MenuAction
            icon={Settings2}
            title="Settings"
            onPress={() => openPanel('settings')}
            palette={palette}
          />
          <MenuAction
            icon={LogOut}
            title="Sign Out"
            onPress={signOut}
            danger
            palette={palette}
          />
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}
