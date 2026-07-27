import { Modal, Text, View, TouchableOpacity, Animated, Easing, Alert } from 'react-native';
import { Gift, PartyPopper, X, Cake, Star } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useAppTheme } from '../../context/ThemeContext';
import { dashboardService } from '../../services/dashboardService';
import { walletService } from '../../services/walletService';
import { storage } from '../../utils/storage';

const PARTICLE_COUNT = 15;

function FallingParticle({ color }) {
  const fallAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const leftPos = useRef(Math.random() * 100).current;
  const size = useRef(14 + Math.random() * 12).current;
  // Slow motion: significantly longer duration
  const duration = useRef(6000 + Math.random() * 4000).current;
  const delay = useRef(Math.random() * 3000).current;
  const Icon = useRef([Cake, PartyPopper, Gift, Star][Math.floor(Math.random() * 4)]).current;

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
    outputRange: [-50, 450] // Fall from top to bottom of the modal
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const opacity = fallAnim.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 0.8, 0.8, 0] // Fade in and out
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${leftPos}%`,
        top: 0,
        opacity,
        transform: [{ translateY }, { rotate }],
        zIndex: 0,
      }}
    >
      <Icon size={size} color={color} />
    </Animated.View>
  );
}

export default function BirthdayModal() {
  const { colors, isDark } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await walletService.claimBirthdayBonus();
      Alert.alert('Happy Birthday!', 'Your $200.00 birthday bonus has been successfully added to your wallet.');
      handleClose();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to claim birthday bonus.');
      handleClose();
    } finally {
      setClaiming(false);
    }
  };

  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function checkBirthday() {
      try {
        const dashboard = await dashboardService.getDashboard();
        if (dashboard?.canClaimBirthdayBonus) {
          setVisible(true);
          Animated.parallel([
            Animated.spring(scale, {
              toValue: 1,
              friction: 6,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            })
          ]).start();
        }
      } catch (e) {}
    }
    checkBirthday();
  }, [scale, opacity]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Animated.View 
          className="w-full max-w-sm rounded-2xl overflow-hidden relative"
          style={{ 
            backgroundColor: colors.surface,
            transform: [{ scale }],
            opacity,
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
          }}
        >
          {/* Slow Motion Falling Symbols */}
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <FallingParticle key={i} color={isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.25)'} />
          ))}

          {/* Header */}
          <View className="items-center justify-center pt-8 pb-6 px-6 z-10" style={{ backgroundColor: isDark ? '#1F1A0C' : '#FFFDF2' }}>
            <TouchableOpacity 
              onPress={handleClose} 
              className="absolute top-4 right-4 p-2 z-20"
            >
              <X size={24} color={colors.muted} />
            </TouchableOpacity>
            
            <View className="rounded-full p-4 mb-4" style={{ backgroundColor: '#F59E0B20' }}>
              <PartyPopper size={48} color="#F59E0B" />
            </View>
            
            <Text className="text-2xl font-black text-center mb-2 uppercase" style={{ color: '#F59E0B' }}>
              Happy Birthday!
            </Text>
            
            <Text className="text-center text-base" style={{ color: colors.text }}>
              Wishing you a fantastic day!
            </Text>
          </View>
          
          {/* Body */}
          <View className="p-6 items-center border-t z-10" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
            <Text className="text-center text-sm mb-6 leading-5" style={{ color: colors.muted }}>
              As a special gift to celebrate your special day, claim your birthday bonus today! We wish you a successful year ahead.
            </Text>
            
            <TouchableOpacity 
              onPress={handleClaim}
              disabled={claiming}
              className="flex-row items-center gap-3 rounded-xl px-5 py-3 w-full justify-center" 
              style={{ backgroundColor: '#F59E0B', opacity: claiming ? 0.72 : 1 }}
            >
              <Gift size={24} color="#FFF" />
              <Text className="text-lg font-bold" style={{ color: '#FFF' }}>
                {claiming ? 'Claiming...' : 'Claim $200.00 Bonus'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleClose}
              className="mt-4 py-3 w-full rounded-xl items-center border"
              style={{ borderColor: colors.border }}
            >
              <Text className="font-semibold text-base" style={{ color: colors.text }}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
