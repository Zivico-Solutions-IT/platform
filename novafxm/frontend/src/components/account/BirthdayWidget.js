import { Animated, Easing, Text, View } from 'react-native';
import { Gift, Cake, PartyPopper } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useAppTheme } from '../../context/ThemeContext';
import { dashboardService } from '../../services/dashboardService';

const PARTICLE_COUNT = 15;

function FallingParticle({ color }) {
  const fallAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const leftPos = useRef(Math.random() * 100).current;
  const size = useRef(12 + Math.random() * 10).current;
  const duration = useRef(2000 + Math.random() * 3000).current;
  const delay = useRef(Math.random() * 2000).current;
  const Icon = useRef([Cake, PartyPopper, Gift][Math.floor(Math.random() * 3)]).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fallAnim, {
          toValue: 1,
          duration: duration,
          delay: delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(fallAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [fallAnim, rotateAnim, duration, delay]);

  const translateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 150] // Fall from top to bottom
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const opacity = fallAnim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.8, 0.8, 0] // Fade in and out
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${leftPos}%`,
        top: 0,
        opacity,
        transform: [{ translateY }, { rotate }]
      }}
    >
      <Icon size={size} color={color} />
    </Animated.View>
  );
}

export default function BirthdayWidget() {
  const { colors, isDark } = useAppTheme();
  const [isBirthday, setIsBirthday] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const highlightColor = '#F59E0B'; // Amber
  const particleColor = isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.3)';

  useEffect(() => {
    dashboardService.getDashboard().then(dashboard => {
      if (dashboard?.isBirthdayToday) {
        setIsBirthday(true);
        setCanClaim(dashboard?.canClaimBirthdayBonus);
      }
    }).catch(() => {});
  }, []);

  if (!isBirthday) return null;

  return (
    <View
      className="mb-4 overflow-hidden rounded-xl border flex-row items-center p-4 relative"
      style={{
        backgroundColor: colors.surface,
        borderColor: highlightColor,
        shadowColor: highlightColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
      }}
    >
      {/* Falling Symbols Animation Background */}
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <FallingParticle key={i} color={particleColor} />
      ))}

      <View 
        className="rounded-full p-3 mr-4 z-10" 
        style={{ backgroundColor: `${highlightColor}1A` }}
      >
        <Gift size={24} color={highlightColor} />
      </View>
      
      <View className="flex-1 z-10">
        <Text className="text-base font-bold mb-1" style={{ color: colors.text }}>
          Special Birthday Reward
        </Text>
        
        <Text className="text-xs mb-2 leading-4" style={{ color: colors.muted }}>
          {canClaim 
            ? 'A $200.00 trading bonus is pending approval. Wishing you a successful year ahead!' 
            : 'A $200.00 trading bonus has been credited to your wallet. Wishing you a successful year ahead!'
          }
        </Text>
        
        <Text className="text-sm font-bold" style={{ color: highlightColor }}>
          {canClaim ? 'Pending' : '$200.00 Added to Wallet'}
        </Text>
      </View>
    </View>
  );
}
