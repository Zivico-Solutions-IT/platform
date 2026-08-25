import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ShieldCheck, ShieldAlert, Shield, Wallet, DollarSign } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { money, quote } from '../../utils/formatters';

export default function AccountHealthGauge() {
  const { summary } = useDemoTrading();
  const { darkMode, colors } = useAppTheme();

  const balance = Number(summary?.balance || 0);
  const equity = Number(summary?.equity || balance);
  const margin = Number(summary?.margin || 0);
  const freeFunds = Math.max(0, equity - margin);
  const marginLevel = Number(summary?.marginLevel || 0);

  // Status classification
  const health = useMemo(() => {
    if (margin === 0 || marginLevel > 500 || marginLevel === 0) {
      return {
        label: 'Safe',
        color: colors.success || '#10B981',
        bg: `${colors.success || '#10B981'}15`,
        percentage: 95,
        Icon: ShieldCheck,
      };
    }
    if (marginLevel >= 200) {
      return {
        label: 'Moderate',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.15)',
        percentage: 60,
        Icon: Shield,
      };
    }
    return {
      label: 'Critical',
      color: colors.danger || '#EF4444',
      bg: `${colors.danger || '#EF4444'}15`,
      percentage: 25,
      Icon: ShieldAlert,
    };
  }, [margin, marginLevel, colors]);

  const StatusIcon = health.Icon;

  return (
    <View
      className="p-3.5 rounded-xl border"
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-1.5">
          <StatusIcon size={14} color={health.color} />
          <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.text }}>
            Account Health & Margin
          </Text>
        </View>
        <View
          className="flex-row items-center px-2 py-0.5 rounded-full"
          style={{ backgroundColor: health.bg }}
        >
          <Text className="text-[10px] font-bold" style={{ color: health.color }}>
            {health.label} Status
          </Text>
        </View>
      </View>

      {/* Margin Level Gauge Bar */}
      <View className="mb-3">
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-xs font-semibold" style={{ color: colors.muted }}>
            Margin Level
          </Text>
          <Text className="text-xs font-bold" style={{ color: health.color }}>
            {margin === 0 ? 'Infinite (0 Margin)' : `${marginLevel.toFixed(1)}%`}
          </Text>
        </View>

        {/* Progress Bar */}
        <View
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: `${colors.border}60` }}
        >
          <View
            style={{
              width: `${Math.min(100, Math.max(8, health.percentage))}%`,
              height: '100%',
              backgroundColor: health.color,
              borderRadius: 99,
            }}
          />
        </View>
      </View>

      {/* Breakdown Grid */}
      <View className="flex-row items-center gap-2 pt-2 border-t" style={{ borderColor: colors.border }}>
        <View
          className="flex-1 p-2 rounded-lg"
          style={{ backgroundColor: darkMode ? '#0a1410' : colors.surface }}
        >
          <Text className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
            Used Margin
          </Text>
          <Text className="text-xs font-bold mt-0.5" style={{ color: colors.text }}>
            {money(margin)} USD
          </Text>
        </View>

        <View
          className="flex-1 p-2 rounded-lg"
          style={{ backgroundColor: darkMode ? '#0a1410' : colors.surface }}
        >
          <Text className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
            Free Margin
          </Text>
          <Text className="text-xs font-bold mt-0.5" style={{ color: colors.success || '#10B981' }}>
            {money(freeFunds)} USD
          </Text>
        </View>

        <View
          className="flex-1 p-2 rounded-lg"
          style={{ backgroundColor: darkMode ? '#0a1410' : colors.surface }}
        >
          <Text className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
            Equity
          </Text>
          <Text className="text-xs font-bold mt-0.5" style={{ color: colors.text }}>
            {money(equity)} USD
          </Text>
        </View>
      </View>
    </View>
  );
}
