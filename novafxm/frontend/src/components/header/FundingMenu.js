import { ArrowDown, ArrowUp, ChevronRight, Clock, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useAppTheme } from '../../context/ThemeContext';
import { money } from '../../utils/formatters';

function accountId(account) {
  return String(Number(account?.id || 0) + 4999).padStart(6, '0');
}

function FundingAction({ icon: Icon, title, onPress, tone, iconBackground, compact = false, darkMode = false }) {
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
        marginBottom: compact ? 0 : 10,
        flexDirection: compact ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: compact ? 'center' : undefined,
        borderRadius: compact ? 16 : 16,
        borderWidth: 1,
        borderColor: darkMode ? '#2B333D' : '#E8E5DE',
        paddingHorizontal: compact ? 8 : 16,
        paddingVertical: compact ? 16 : 14,
        backgroundColor: pressed ? (darkMode ? '#202831' : '#F8F6F1') : (darkMode ? '#151B22' : '#FFFFFF'),
      }}
    >
      <View className={`${compact ? 'h-9 w-9 rounded-[11px]' : 'h-10 w-10 rounded-xl'} items-center justify-center`} style={{ backgroundColor: iconBackground }}>
        <Icon size={compact ? 17 : 20} color={tone} strokeWidth={1.9} />
      </View>
      <Text style={{ marginLeft: compact ? 0 : 14, marginTop: compact ? 9 : 0, flex: compact ? 0 : 1, fontSize: compact ? 11.5 : 16, fontWeight: compact ? '600' : '700', color: darkMode ? '#F4F6F8' : '#20242C' }}>
        {title}
      </Text>
      {!compact ? <ChevronRight size={18} color="#C9CDD2" strokeWidth={1.8} /> : null}
    </Pressable>
  );
}

export default function FundingMenu({ selectedAccount, summary, onClose, onSwitchAccount, onOpenPanel }) {
  const { colors, darkMode } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(410)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const mobile = width < 760;
  const panelWidth = mobile ? width : Math.min(410, Math.max(0, width - 56));
  // On phones, funding is a bottom sheet rather than a full-screen page.
  // Leave a visible strip of the trading screen above it for context.
  const panelHeight = mobile ? Math.min(height - 88, 680) : height;
  const entranceDistance = mobile ? panelHeight : -panelWidth;
  const balance = Number.isFinite(Number(selectedAccount?.balance))
    ? Number(selectedAccount.balance)
    : Number(summary?.balance || 0);
  const accountTier = selectedAccount?.tier || 'Standard';
  const accountType = selectedAccount?.type || 'Demo';
  const realAccount = accountType.toLowerCase() === 'live';

  const openPanel = (panel) => {
    onClose?.();
    onOpenPanel?.(panel);
  };

  useEffect(() => {
    slideAnim.setValue(entranceDistance);
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
  }, [fadeAnim, slideAnim, contentAnim, entranceDistance]);

  return (
    <Animated.View
      className="overflow-hidden shadow-2xl"
      style={{
        position: 'absolute',
        right: mobile ? 0 : undefined,
        top: mobile ? undefined : 0,
        bottom: 0,
        left: mobile ? 0 : 56,
        zIndex: 50,
        width: mobile ? '100%' : panelWidth,
        height: panelHeight,
        paddingTop: 22,
        paddingBottom: mobile ? 24 : 20,
        paddingHorizontal: 15,
        backgroundColor: darkMode ? colors.panel : '#FBFAF7',
        borderRightWidth: mobile ? 0 : 1,
        borderRightColor: colors.border,
        borderTopLeftRadius: mobile ? 24 : 0,
        borderTopRightRadius: mobile ? 24 : 20,
        borderBottomRightRadius: mobile ? 0 : 20,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 28,
        opacity: fadeAnim,
        transform: [mobile ? { translateY: slideAnim } : { translateX: slideAnim }],
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
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
          {!mobile ? (
            <>
              <View className="mb-4 flex-row items-center justify-between px-1">
                <Text className="text-[19px] font-bold" style={{ color: darkMode ? colors.text : '#1B1F27' }}>Funding</Text>
                <Pressable onPress={onClose} accessibilityLabel="Close wallet" className="h-[30px] w-[30px] items-center justify-center rounded-[10px]" style={{ backgroundColor: darkMode ? colors.surface : '#F0EEE7' }}>
                  <X size={15} color={darkMode ? colors.muted : '#7C8074'} strokeWidth={2.2} />
                </Pressable>
              </View>
              <View className="relative mb-5 overflow-hidden rounded-[22px] border px-5 pb-[22px] pt-5" style={{ backgroundColor: darkMode ? colors.surface : '#FFFDF9', borderColor: darkMode ? colors.border : '#ECE6D6' }}>
                <Svg width="100%" height="64" viewBox="0 0 340 64" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.62 }}>
                  <Defs><LinearGradient id="fundingBalanceFill" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#2FA85B" stopOpacity="0.28" /><Stop offset="1" stopColor="#2FA85B" stopOpacity="0" /></LinearGradient></Defs>
                  <Path d="M0,44 L28,40 L56,46 L84,26 L112,34 L140,18 L168,24 L196,10 L224,18 L252,6 L280,14 L308,3 L340,12 L340,64 L0,64 Z" fill="url(#fundingBalanceFill)" />
                  <Path d="M0,44 L28,40 L56,46 L84,26 L112,34 L140,18 L168,24 L196,10 L224,18 L252,6 L280,14 L308,3 L340,12" fill="none" stroke="#2FA85B" strokeWidth="2" />
                </Svg>
                <View className="relative mb-[14px] flex-row items-center">
                  <Text className="text-[13.5px] font-bold" style={{ color: darkMode ? colors.text : '#1B1F27' }}>{accountTier}</Text>
                  <View className="ml-2 rounded-full border px-2 py-0.5" style={{ backgroundColor: realAccount ? '#EAF6EC' : '#FBF3E2', borderColor: realAccount ? '#BEE8CC' : '#E9CB84' }}><Text className="text-[10.5px] font-bold" style={{ color: realAccount ? '#2FA85B' : '#B8891E' }}>{realAccount ? 'Real' : 'Demo'}</Text></View>
                </View>
                <Text className="relative text-[9.5px] uppercase" style={{ letterSpacing: 0.6, color: '#A79F87' }}>Total Balance</Text>
                <Text className="relative mt-1 text-[30px] font-bold" style={{ color: darkMode ? colors.text : '#1B1F27' }}>${money(balance)}</Text>
                <Text className="relative mt-0.5 text-[11.5px]" style={{ color: '#A79F87' }}>#{accountId(selectedAccount)}</Text>
              </View>
              <Text className="mb-[10px] text-[10.5px] uppercase" style={{ letterSpacing: 0.6, color: '#A79F87' }}>Funding Options</Text>
              <View className="flex-row gap-2">
                <View className="flex-1"><FundingAction darkMode={darkMode} compact icon={ArrowUp} title="Deposit" onPress={() => openPanel('deposit')} tone="#2FA85B" iconBackground={darkMode ? '#173326' : '#EAF6EC'} /></View>
                <View className="flex-1"><FundingAction darkMode={darkMode} compact icon={ArrowDown} title="Withdraw" onPress={() => openPanel('withdraw')} tone="#C94F4F" iconBackground={darkMode ? '#3A2428' : '#FCEEEE'} /></View>
                <View className="flex-1"><FundingAction darkMode={darkMode} compact icon={Clock} title="History" onPress={() => openPanel('history')} tone="#B8891E" iconBackground={darkMode ? '#382F1A' : '#FBF3E2'} /></View>
              </View>
            </>
          ) : (
            <View className="rounded-[20px] border p-[18px]" style={{ backgroundColor: darkMode ? colors.surface : '#FFFFFF', borderColor: darkMode ? colors.border : '#E8E5DE' }}>
              <Text className="mb-[18px] text-xl font-bold" style={{ color: darkMode ? colors.text : '#20242C', fontFamily: 'Georgia, serif' }}>Funding Options</Text>
              <FundingAction darkMode={darkMode} icon={ArrowUp} title="Deposit" onPress={() => openPanel('deposit')} tone="#2FB675" iconBackground={darkMode ? '#173326' : '#E1F5EE'} />
              <FundingAction darkMode={darkMode} icon={ArrowDown} title="Withdraw" onPress={() => openPanel('withdraw')} tone="#DF626A" iconBackground={darkMode ? '#3A2428' : '#FAECE7'} />
              <FundingAction darkMode={darkMode} icon={Clock} title="Transactions History" onPress={() => openPanel('history')} tone={darkMode ? '#A1A8B5' : '#737B78'} iconBackground={darkMode ? '#252B32' : '#F1F1ED'} />
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}
