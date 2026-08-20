import { ArrowDown, ArrowUp, ChevronRight, Clock, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { money } from '../../utils/formatters';

function accountId(account) {
  return String(Number(account?.id || 0) + 4999).padStart(6, '0');
}

function FundingAction({ icon: Icon, title, onPress, tone, iconBackground }) {
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
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E8E5DE',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? '#F8F6F1' : '#FFFFFF',
      }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: iconBackground }}>
        <Icon size={20} color={tone} strokeWidth={1.9} />
      </View>
      <Text style={{ marginLeft: 14, flex: 1, fontSize: 16, fontWeight: '700', color: '#20242C' }}>
        {title}
      </Text>
      <ChevronRight size={18} color="#C9CDD2" strokeWidth={1.8} />
    </Pressable>
  );
}

export default function FundingMenu({ selectedAccount, summary, onClose, onSwitchAccount, onOpenPanel }) {
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(410)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const mobile = width < 760;
  const panelWidth = mobile ? width : 410;
  // On phones, funding is a bottom sheet rather than a full-screen page.
  // Leave a visible strip of the trading screen above it for context.
  const panelHeight = mobile ? Math.min(height - 88, 680) : height;
  const entranceDistance = mobile ? panelHeight : panelWidth;
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
        right: 0,
        top: mobile ? undefined : 0,
        bottom: 0,
        left: mobile ? 0 : undefined,
        zIndex: 50,
        width: mobile ? '100%' : panelWidth,
        height: panelHeight,
        paddingTop: 22,
        paddingBottom: mobile ? 24 : 20,
        paddingHorizontal: 15,
        backgroundColor: '#FBFAF7',
        borderLeftWidth: mobile ? 0 : 1,
        borderLeftColor: colors.border,
        borderTopLeftRadius: mobile ? 24 : 20,
        borderTopRightRadius: mobile ? 24 : 0,
        borderBottomLeftRadius: mobile ? 0 : 20,
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
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-xl font-semibold" style={{ color: '#20242C' }}>Funding</Text>
                <Pressable onPress={onClose} accessibilityLabel="Close wallet" className="h-9 w-9 items-center justify-center rounded-full">
                  <X size={20} color="#20242C" strokeWidth={1.8} />
                </Pressable>
              </View>
              <View className="mb-4 rounded-xl p-3" style={{ backgroundColor: '#F1F1ED' }}>
                <View className="flex-row items-center">
                  <Text className="text-xs font-semibold" style={{ color: '#20242C' }}>{accountTier}</Text>
                  <View className="ml-1.5 rounded px-1.5 py-0.5" style={{ backgroundColor: realAccount ? '#DDF4E7' : '#F4E8C5' }}>
                    <Text className="text-[8px] font-semibold" style={{ color: realAccount ? '#2F9D62' : '#B87F0E' }}>{realAccount ? 'Real' : 'Demo'}</Text>
                  </View>
                </View>
                <Text className="mt-2 text-xl font-semibold" style={{ color: '#20242C' }}>{money(balance)} USD</Text>
                <Text className="mt-1 text-[10px]" style={{ color: '#7B8490' }}>#{accountId(selectedAccount)}</Text>
              </View>
            </>
          ) : null}
          <View className="rounded-[20px] border p-[18px]" style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E5DE' }}>
            <Text className="mb-[18px] text-xl font-bold" style={{ color: '#20242C', fontFamily: 'Georgia, serif' }}>Funding Options</Text>
            <FundingAction icon={ArrowUp} title="Deposit" onPress={() => openPanel('deposit')} tone="#2FB675" iconBackground="#E1F5EE" />
            <FundingAction icon={ArrowDown} title="Withdraw" onPress={() => openPanel('withdraw')} tone="#DF626A" iconBackground="#FAECE7" />
            <FundingAction icon={Clock} title="Transactions History" onPress={() => openPanel('history')} tone="#737B78" iconBackground="#F1F1ED" />
          </View>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}
