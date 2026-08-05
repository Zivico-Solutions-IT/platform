import { Text, View, useWindowDimensions } from 'react-native';
import { BadgeCheck, Clock3, Landmark, Wallet } from 'lucide-react-native';
import { money } from '../../utils/formatters';
import { useAppTheme } from '../../context/ThemeContext';

const approvedStatuses = ['approved', 'completed'];

function Metric({ label, value, tone = 'default', mobile, colors }) {
  const color = tone === 'success' ? colors.success : tone === 'warning' ? colors.primary : colors.text;

  return (
    <View
      className={`${mobile ? 'p-3 rounded-xl' : 'p-5 rounded-2xl'} flex-1 border shadow-sm`}
      style={{ minWidth: mobile ? 110 : 155, backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }} numberOfLines={1}>
        {label}
      </Text>
      <Text className={`${mobile ? 'mt-1 text-sm' : 'mt-2 text-lg'} font-medium`} style={{ color }} numberOfLines={1} adjustsFontSizeToFit>
        {money(value)} <Text className="text-[10px]">USD</Text>
      </Text>
    </View>
  );
}

export default function WalletCard({ summary, transactions = [], user }) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const mobile = width < 640;
  const totals = transactions.reduce(
    (values, item) => {
      const amount = Number(item.amount || 0);
      if (item.type === 'deposit') {
        values.submittedDeposits += amount;
        if (approvedStatuses.includes(item.status)) values.approvedDeposits += amount;
        if (item.status === 'pending') values.pendingDeposits += amount;
      }
      if (item.type === 'withdrawal') {
        if (approvedStatuses.includes(item.status)) values.approvedWithdrawals += amount;
        if (item.status === 'pending') values.pendingWithdrawals += amount;
      }
      return values;
    },
    { submittedDeposits: 0, approvedDeposits: 0, pendingDeposits: 0, approvedWithdrawals: 0, pendingWithdrawals: 0 },
  );
  const accountId = String(Number(user?.id || 1) + 4999).padStart(6, '0');
  const bonus = Number(summary.bonus || 0);

  return (
    <View className="mb-5 gap-3">
      <View className={`${mobile ? 'p-4' : 'p-5'} rounded-2xl border shadow-lg`} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
        <View className="mb-5 flex-row flex-wrap items-start justify-between gap-3 border-b pb-4" style={{ borderColor: colors.border }}>
          <View>
            <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Account Funds Summary</Text>
            <Text className="mt-1 text-lg font-medium" style={{ color: colors.text }}>{user?.accountType || 'Demo'} Account #{accountId}</Text>
          </View>
          <View className="flex-row items-center rounded-full border px-3 py-2" style={{ backgroundColor: `${colors.success}1a`, borderColor: `${colors.success}40` }}>
            <BadgeCheck size={15} color={colors.success} />
            <Text className="ml-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.success }}>Verified</Text>
          </View>
        </View>

        <View className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <View className="min-w-0">
            <View className="flex-row items-center">
              <Wallet size={18} color="#D4AF37" />
              <Text className="ml-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Available Account Balance</Text>
            </View>
            <Text className={`${mobile ? 'text-3xl' : 'text-4xl'} mt-2 font-medium`} style={{ color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>{money(summary.balance)} <Text className="text-base" style={{ color: colors.muted }}>USD</Text></Text>
          </View>

          <View className="gap-2 lg:min-w-[320px]">
            <View className="flex-row items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View className="min-w-0 flex-1 flex-row items-center">
                <Landmark size={16} color={colors.success} />
                <Text className="ml-2 text-sm font-semimedium" style={{ color: colors.muted }} numberOfLines={1}>Approved client deposits</Text>
              </View>
              <Text className="font-medium" style={{ color: colors.success }} numberOfLines={1}>{money(totals.approvedDeposits)} USD</Text>
            </View>
            <View className="flex-row items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View className="min-w-0 flex-1 flex-row items-center">
                <Clock3 size={16} color={colors.primary} />
                <Text className="ml-2 text-sm font-semimedium" style={{ color: colors.muted }} numberOfLines={1}>Pending deposits</Text>
              </View>
              <Text className="font-medium" style={{ color: colors.primary }} numberOfLines={1}>{money(totals.pendingDeposits)} USD</Text>
            </View>
            <View className="flex-row items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View className="min-w-0 flex-1 flex-row items-center">
                <Wallet size={16} color={colors.primary} />
                <Text className="ml-2 text-sm font-semimedium" style={{ color: colors.muted }}>Bonus</Text>
              </View>
              <Text className="font-medium" style={{ color: colors.primary }} numberOfLines={1}>{money(bonus)} USD</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <Metric label="Equity" value={summary.equity} mobile={mobile} colors={colors} />
        <Metric label="Free Funds" value={summary.freeFunds} mobile={mobile} colors={colors} />
        <Metric label="Used Margin" value={summary.margin} mobile={mobile} colors={colors} />
        <Metric label="Bonus" value={bonus} tone="warning" mobile={mobile} colors={colors} />
        <Metric label="Submitted Deposits" value={totals.submittedDeposits} tone="success" mobile={mobile} colors={colors} />
        <Metric label="Approved Withdrawals" value={totals.approvedWithdrawals} mobile={mobile} colors={colors} />
        <Metric label="Pending Withdrawals" value={totals.pendingWithdrawals} tone="warning" mobile={mobile} colors={colors} />
      </View>
    </View>
  );
}
