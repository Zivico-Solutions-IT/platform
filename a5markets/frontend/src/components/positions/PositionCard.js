import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Eye, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { money, quote } from '../../utils/formatters';

const compactDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}-${month}-${year} ${time}`;
};

function RiskCell({ value, colors, onPress, disabled }) {
  const hasValue = Number(value) > 0;
  if (disabled) {
    return (
      <Text className="text-xs font-medium" numberOfLines={1} style={{ color: hasValue ? colors.text : colors.muted }}>
        {hasValue ? quote(value, 2) : '-'}
      </Text>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center rounded border px-1.5 h-6"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        alignSelf: 'flex-start',
      }}
    >
      <Plus size={10} color={colors.text} style={{ marginRight: 2 }} />
      <Text className="text-xs font-medium" numberOfLines={1} style={{ color: hasValue ? colors.text : colors.muted }}>
        {hasValue ? quote(value, 2) : '-'}
      </Text>
    </Pressable>
  );
}

export default function PositionCard({ position, onClose, onView, closed = false, pending = false, index = 0, columnWidths, tableWidth = 1206 }) {
  const { darkMode, colors } = useAppTheme();
  const { notify } = useToast();

  const widths = columnWidths || [76, 76, 120, 115, 165, 74, 65, 105, 120, 70, 105, 115];
  const profit = Number(position.profit || 0);
  const profitColor = profit >= 0 ? colors.success : colors.danger;
  const side = String(position.side || '').toUpperCase();
  const sideColor = side === 'BUY' ? colors.success : colors.danger;
  const sidePillBg = side === 'BUY' ? 'rgba(18,207,122,0.18)' : 'rgba(242,77,88,0.18)';
  const rowBackground = index % 2 === 0 ? 'transparent' : darkMode ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.025)';
  const openPrice = Number(position.openPrice || position.entryPrice || 0);
  const currentPrice = Number(position.currentPrice || position.closePrice || openPrice);
  const lots = Number(position.lots || 0);
  const actionDisabled = closed;

  return (
    <View className="flex-row items-center border-t px-2 py-2" style={{ width: tableWidth, minHeight: 46, backgroundColor: rowBackground, borderColor: colors.border }}>
      <View className="flex-row items-center" style={{ width: widths[0] }}>
        {!closed ? (
          <Pressable onPress={() => onClose(position)} className="mr-1 h-7 w-7 items-center justify-center rounded border" style={{ backgroundColor: colors.danger + '0d', borderColor: colors.danger + '40' }}>
            <X size={14} color={colors.danger} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => onView(position)} className="h-7 w-7 items-center justify-center rounded border" style={{ backgroundColor: colors.primary + '0d', borderColor: colors.primary + '40' }}>
          <Eye size={14} color={colors.primary} />
        </Pressable>
      </View>
      <Text className="text-xs font-medium" numberOfLines={1} style={{ width: widths[1], color: colors.text }}>{position.id}</Text>
      <Text className="text-xs font-medium" numberOfLines={1} style={{ width: widths[2], color: colors.text }}>{position.symbol}</Text>
      <Text className="text-xs font-medium" numberOfLines={1} style={{ width: widths[3], color: profitColor }}>{profit >= 0 ? '+' : ''}{money(profit)}</Text>
      <Text className="text-xs font-medium" numberOfLines={1} style={{ width: widths[4], color: colors.text }}>{compactDateTime(position.openedAt || position.createdAt)}</Text>
      <View style={{ width: widths[5] }}>
        <Text className="self-start rounded-sm px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: sidePillBg, color: sideColor }}>{side || '-'}</Text>
      </View>
      <Text className="text-xs font-medium" numberOfLines={1} style={{ width: widths[6], color: colors.text }}>{lots.toFixed(2)}</Text>
      <Text className="text-xs font-medium" numberOfLines={1} style={{ width: widths[7], color: colors.text }}>{quote(openPrice, 2)}</Text>
      <Text className="text-xs font-medium" numberOfLines={1} style={{ width: widths[8], color: colors.text }}>{pending ? String(position.orderType || '-').toUpperCase() : quote(currentPrice, 2)}</Text>
      <Text className="text-xs font-medium" numberOfLines={1} style={{ width: widths[9], color: colors.text }}>{money(position.swap || 0)}</Text>
      <View style={{ width: widths[10] }}>
        <RiskCell
          value={position.stopLoss}
          colors={colors}
          onPress={() => onView(position, 'stopLoss')}
          disabled={actionDisabled}
        />
      </View>
      <View style={{ width: widths[11] }}>
        <RiskCell
          value={position.takeProfit}
          colors={colors}
          onPress={() => onView(position, 'takeProfit')}
          disabled={actionDisabled}
        />
      </View>
    </View>
  );
}
