import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { money } from '../../utils/formatters';

function Metric({ label, value, color = 'text-white', compact = false }) {
  const { darkMode, colors } = useAppTheme();
  const valueColor = color === 'text-danger' ? colors.danger : color === 'text-success' ? colors.success : colors.text;

  if (compact) {
    return (
      <View
        style={{ backgroundColor: colors.surface, borderColor: colors.border, width: '48.5%', marginBottom: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 }}
      >
        <Text style={{ color: colors.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: valueColor, fontSize: 13, fontWeight: '600', marginTop: 2 }}>{value}</Text>
      </View>
    );
  }

  return (
    <View className="mb-3 w-full rounded-xl border p-4 sm:w-[48%]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <Text className="text-xs uppercase" style={{ color: colors.muted }}>{label}</Text>
      <Text className="mt-2 text-xl font-medium" style={{ color: valueColor }}>{value}</Text>
    </View>
  );
}

export default function UserWalletDetails({ user, account, wallet, loading, onClose }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  if (!user) return null;

  const metrics = [
    { label: 'Balance',            value: `$${money(wallet?.balance)}` },
    { label: 'Equity',             value: `$${money(wallet?.equity)}` },
    { label: 'Margin',             value: `$${money(wallet?.margin)}` },
    { label: 'Free Funds',         value: `$${money(wallet?.freeFunds)}` },
    { label: 'Open P/L',          value: `$${money(wallet?.openProfit)}`,  color: Number(wallet?.openProfit) < 0 ? 'text-danger' : 'text-success' },
    { label: 'Total Deposits',     value: `$${money(wallet?.totalDeposits)}` },
    { label: 'Total Withdrawals',  value: `$${money(wallet?.totalWithdrawals)}` },
    { label: 'Total Trades',       value: String(wallet?.totalTrades || 0) },
    { label: 'Leverage',           value: `1:${wallet?.leverage || 500}` },
    { label: 'Trading Status',     value: wallet?.tradingStatus === 'frozen' ? 'Frozen' : 'Active', color: wallet?.tradingStatus === 'frozen' ? 'text-danger' : 'text-success' },
  ];

  return (
    <View
      className={`absolute inset-0 z-50 items-center bg-medium/70 px-4 ${mobile ? 'justify-start pt-16' : 'justify-center'}`}
    >
      <View
        className={`w-full max-w-3xl border ${mobile ? 'rounded-xl p-3' : 'rounded-2xl p-6'}`}
        style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}
      >
        {/* Header */}
        <View className={`flex-row justify-between ${mobile ? 'mb-2' : 'mb-5'}`}>
          <View>
            <Text className={`${mobile ? 'text-base' : 'text-xl'} font-medium`} style={{ color: colors.text }}>Wallet Details</Text>
            <Text className="mt-0.5 text-xs" style={{ color: colors.muted }}>{user.name} | {user.email}</Text>
            {account || wallet?.accountName ? (
              <Text className="mt-0.5 text-xs" style={{ color: colors.muted }}>
                {wallet?.accountName || account?.name || 'Trading account'}{wallet?.accountType || account?.type ? ` | ${wallet?.accountType || account?.type}` : ''}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} className="p-1">
            <Text className="text-xl" style={{ color: colors.muted }}>×</Text>
          </Pressable>
        </View>

        {/* Metrics */}
        {loading ? (
          <Text className="py-10 text-center" style={{ color: colors.muted }}>Loading wallet...</Text>
        ) : mobile ? (
          /* Mobile: compact 2-column grid, no scroll */
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {metrics.map((m) => (
              <Metric key={m.label} label={m.label} value={m.value} color={m.color} compact />
            ))}
          </View>
        ) : (
          /* Desktop: original scrollable layout */
          <ScrollView>
            <View className="flex-row flex-wrap justify-between">
              {metrics.map((m) => (
                <Metric key={m.label} label={m.label} value={m.value} color={m.color} />
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
