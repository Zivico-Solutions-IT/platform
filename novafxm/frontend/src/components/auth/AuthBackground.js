import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

// A lightweight, brand-coloured market backdrop shared by sign-in and sign-up.
// It deliberately uses native views instead of a downloaded image, keeping the
// auth screen crisp at every viewport size and inexpensive to load.
export default function AuthBackground() {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7000, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 7000, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [drift]);

  const translate = drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: '#EEF5F0' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '42%', backgroundColor: '#E7F1EA' }} />
      <Animated.View style={{ position: 'absolute', width: 560, height: 560, left: -230, top: -230, borderRadius: 280, backgroundColor: 'rgba(0, 103, 79, 0.17)', transform: [{ translateX: translate }, { translateY: translate }] }} />
      <Animated.View style={{ position: 'absolute', width: 430, height: 430, right: -170, bottom: -150, borderRadius: 215, backgroundColor: 'rgba(212, 175, 55, 0.20)', transform: [{ translateX: translate }, { translateY: translate }] }} />
      <View style={{ position: 'absolute', width: 680, height: 1, left: -80, top: '31%', backgroundColor: 'rgba(0, 103, 79, 0.13)', transform: [{ rotate: '-8deg' }] }} />
      <View style={{ position: 'absolute', width: 560, height: 1, right: -80, bottom: '28%', backgroundColor: 'rgba(212, 175, 55, 0.22)', transform: [{ rotate: '-12deg' }] }} />
      <View style={{ position: 'absolute', left: '8%', top: '18%', flexDirection: 'row', alignItems: 'flex-end', gap: 9, opacity: 0.2 }}>
        {[42, 74, 51, 92, 62, 112, 77].map((height, index) => (
          <View key={index} style={{ width: 5, height, borderRadius: 4, backgroundColor: index % 2 ? '#00674F' : '#D4AF37' }} />
        ))}
      </View>
    </View>
  );
}
