import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart2, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { quote, money, percent } from '../../utils/formatters';

export default function MarketOverviewWidget() {
  const { currentSymbol } = useDemoTrading();
  const { darkMode, colors } = useAppTheme();

  const changeNum = Number(currentSymbol?.change || 0);
  const currentPrice = Number(currentSymbol?.price || currentSymbol?.ask || 100);
  const decimals = currentSymbol?.decimals ?? 2;

  // Compute realistic 24h stats based on price & change
  const stats = useMemo(() => {
    const rangeSpread = Math.max(currentPrice * 0.012, 0.002);
    const high = Number(currentSymbol?.high24h) || (currentPrice + Math.abs(currentPrice * (changeNum >= 0 ? 0.008 : 0.003)));
    const low = Number(currentSymbol?.low24h) || (currentPrice - Math.abs(currentPrice * (changeNum <= 0 ? 0.008 : 0.003)));
    
    // Sentiment ratio calculated from price action + 24h change
    const baseBullish = 50 + (changeNum * 3.5);
    const bullishPercent = Math.max(18, Math.min(88, Math.round(baseBullish)));
    const bearishPercent = 100 - bullishPercent;

    const fixedSpread = Number(currentSymbol?.spreadPoints ?? currentSymbol?.spread ?? 0.8);

    return {
      high: quote(high, decimals),
      low: quote(low, decimals),
      spread: Number.isFinite(fixedSpread) ? fixedSpread.toFixed(1) : '0.8',
      bullishPercent,
      bearishPercent,
      isBullishDominant: bullishPercent >= 50,
    };
  }, [currentSymbol, changeNum, currentPrice, decimals]);

  const successColor = colors.success || '#10B981';
  const dangerColor = colors.danger || '#EF4444';

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
          <Activity size={14} color={colors.primary} />
          <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.text }}>
            Market Sentiment & Overview
          </Text>
        </View>
        <View
          className="flex-row items-center px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: stats.isBullishDominant ? `${successColor}18` : `${dangerColor}18`,
          }}
        >
          <Text
            className="text-[10px] font-bold"
            style={{ color: stats.isBullishDominant ? successColor : dangerColor }}
          >
            {stats.isBullishDominant ? 'Strong Buyers' : 'Strong Sellers'}
          </Text>
        </View>
      </View>

      {/* Bullish vs Bearish Bar */}
      <View className="mb-3">
        <View className="flex-row items-center justify-between mb-1.5">
          <View className="flex-row items-center gap-1">
            <ArrowUpRight size={13} color={successColor} />
            <Text className="text-xs font-bold" style={{ color: successColor }}>
              Bullish {stats.bullishPercent}%
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-bold" style={{ color: dangerColor }}>
              {stats.bearishPercent}% Bearish
            </Text>
            <ArrowDownRight size={13} color={dangerColor} />
          </View>
        </View>

        {/* Dual Color Progress Bar */}
        <View
          className="flex-row h-2.5 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: `${colors.border}60` }}
        >
          <View
            style={{
              width: `${stats.bullishPercent}%`,
              backgroundColor: successColor,
              borderTopLeftRadius: 99,
              borderBottomLeftRadius: 99,
            }}
          />
          <View
            style={{
              width: `${stats.bearishPercent}%`,
              backgroundColor: dangerColor,
              borderTopRightRadius: 99,
              borderBottomRightRadius: 99,
            }}
          />
        </View>
      </View>

      {/* 24h Metrics Grid */}
      <View className="flex-row items-center gap-2 pt-2 border-t" style={{ borderColor: colors.border }}>
        <View
          className="flex-1 p-2 rounded-lg"
          style={{ backgroundColor: darkMode ? '#0a1410' : colors.surface }}
        >
          <Text className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
            24h High
          </Text>
          <Text className="text-xs font-bold mt-0.5" style={{ color: successColor }}>
            {stats.high}
          </Text>
        </View>

        <View
          className="flex-1 p-2 rounded-lg"
          style={{ backgroundColor: darkMode ? '#0a1410' : colors.surface }}
        >
          <Text className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
            24h Low
          </Text>
          <Text className="text-xs font-bold mt-0.5" style={{ color: dangerColor }}>
            {stats.low}
          </Text>
        </View>

        <View
          className="flex-1 p-2 rounded-lg"
          style={{ backgroundColor: darkMode ? '#0a1410' : colors.surface }}
        >
          <Text className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
            Spread
          </Text>
          <Text className="text-xs font-bold mt-0.5" style={{ color: colors.text }}>
            {stats.spread} pips
          </Text>
        </View>
      </View>
    </View>
  );
}
