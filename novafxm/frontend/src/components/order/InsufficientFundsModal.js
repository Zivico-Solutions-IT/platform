import React from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';

export default function InsufficientFundsModal({ visible, onClose }) {
  const { colors, darkMode } = useAppTheme();
  const { setSidePanel } = useDemoTrading();
  const { width } = useWindowDimensions();

  const handleDeposit = () => {
    onClose();
    setSidePanel('deposit');
  };

  const modalBg = darkMode ? '#12161c' : '#fafaf6';
  const overlayBg = darkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.5)';
  const borderCol = darkMode ? '#1f242d' : '#e6e6e2';
  const successColor = '#22c55e'; // Modern green

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center p-3" style={{ backgroundColor: overlayBg }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-[380px] rounded-2xl border overflow-hidden"
          style={{ 
            backgroundColor: modalBg, 
            borderColor: borderCol,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: darkMode ? 0.5 : 0.15,
            shadowRadius: 32,
            elevation: 24,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-5 border-b" style={{ borderColor: borderCol }}>
            <View className="flex-row items-center gap-2.5">
              <View className="h-8 w-8 rounded-full items-center justify-center" style={{ backgroundColor: `${colors.danger}15` }}>
                <AlertCircle size={18} color={colors.danger} strokeWidth={2.5} />
              </View>
              <Text className="text-[15px] font-bold" style={{ color: colors.text }}>Insufficient Funds</Text>
            </View>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: darkMode ? '#1f242d' : '#e6e6e2' }}>
              <X size={16} color={colors.text} />
            </Pressable>
          </View>

          {/* Body */}
          <View className="p-5">
            <View className="rounded-xl p-4 border mb-6" style={{ backgroundColor: darkMode ? '#1a1f26' : '#ffffff', borderColor: borderCol }}>
              <Text className="text-[13px] font-medium leading-5" style={{ color: colors.muted }}>
                You don't have enough free margin to place this trade. Please fund your account to continue trading.
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={onClose}
                className="h-11 flex-1 items-center justify-center rounded-xl border"
                style={{ borderColor: borderCol, backgroundColor: darkMode ? '#1a1f26' : '#ffffff' }}
              >
                <Text className="text-xs font-bold" style={{ color: colors.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDeposit}
                className="h-11 flex-1 items-center justify-center rounded-xl flex-row gap-2"
                style={{ backgroundColor: successColor, shadowColor: successColor, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
              >
                <Text className="text-xs font-bold text-white">Deposit Now</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
