import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

const VELTRIUM_LOGO = require('../../../assets/veltriumfx-logo-dark.png');
export const LOADING_SPINNER_MIN_MS = 1700;

export default function LoadingSpinner() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoShimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 52,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(logoShimmer, {
          toValue: 1,
          duration: 1150,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(420),
        Animated.timing(logoShimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [logoOpacity, logoScale, logoShimmer]);

  return (
    <View className="flex-1 items-center justify-center bg-[#060d0a]">
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <View className="overflow-hidden" style={{ width: 286, height: 85 }}>
          <Image source={VELTRIUM_LOGO} resizeMode="contain" style={{ width: 286, height: 85 }} />
          <Animated.View
            className="absolute"
            style={{
              top: -10,
              left: 0,
              width: 46,
              height: 110,
              backgroundColor: 'rgba(0, 103, 79, 0.35)',
              opacity: logoOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }),
              transform: [
                { translateX: logoShimmer.interpolate({ inputRange: [0, 1], outputRange: [-72, 318] }) },
                { rotate: '14deg' },
              ],
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}
