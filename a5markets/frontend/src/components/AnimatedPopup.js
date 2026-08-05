import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, View, useWindowDimensions } from 'react-native';

export default function AnimatedPopup({ visible, onClose, children, containerStyle, className = '', maxWidth = 420 }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true })
      ]).start();
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)', padding: width < 760 ? 16 : 40 }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full flex-row justify-center" style={{ maxHeight: height * 0.9 }}>
          <Animated.View style={[{ transform: [{ scale }], opacity, width: '100%', maxWidth, maxHeight: height * 0.9, flexShrink: 1 }, containerStyle]} className={className}>
            {children}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
