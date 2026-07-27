import { Text, View } from 'react-native';
import { money } from '../../utils/formatters';
import { useAppTheme } from '../../context/ThemeContext';

function DetailCard({ label, value, highlight = false, warning = false, compact = false, colors }) {
  return (
    <View
      className={`${compact ? `${highlight ? 'w-full' : 'min-w-[145px] flex-1'} rounded-md px-3 py-2` : 'rounded-md px-3 py-2.5'} border`}
      style={{
        backgroundColor: highlight ? colors.surface : colors.panel,
        borderColor: highlight ? colors.primary : colors.border,
      }}
    >
      <Text className="text-[9px] font-medium uppercase" style={{ color: colors.muted }}>{label}</Text>
      <Text className={`${highlight ? 'text-base' : 'text-[11px]'} mt-0.5 font-medium`} style={{ color: warning ? colors.primary : colors.text }}>
        {money(value)} <Text className="text-[9px]" style={{ color: colors.muted }}>USD</Text>
      </Text>
    </View>
  );
}

export default function AccountSummary({ summary, compact = false }) {
  const { colors } = useAppTheme();
  const entries = [
    ['Available Balance', summary.balance, true],
    ['Equity', summary.equity],
    ['Free Funds', summary.freeFunds],
    ['Client Deposits', summary.totalDeposits],
    ['Pending Deposits', summary.pendingDeposits, false, true],
  ];

  if (compact) {
    return (
      <View className="w-full flex-row flex-wrap gap-2">
        {entries.map(([label, value, highlight, warning]) => (
          <DetailCard key={label} label={label} value={value} highlight={highlight} warning={warning} compact colors={colors} />
        ))}
      </View>
    );
  }

  return (
    <View className="w-full gap-2">
      {entries.map(([label, value, highlight, warning]) => (
        <DetailCard key={label} label={label} value={value} highlight={highlight} warning={warning} colors={colors} />
      ))}
    </View>
  );
}
