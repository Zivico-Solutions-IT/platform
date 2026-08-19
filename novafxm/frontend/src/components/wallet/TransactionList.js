import { Text, View, useWindowDimensions } from 'react-native';
import { Clock3 } from 'lucide-react-native';
import { dateTime, money, transactionTypeLabel } from '../../utils/formatters';
import { useAppTheme } from '../../context/ThemeContext';

export default function TransactionList({ transactions, title = 'Transaction History', compact = false }) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const mobile = width < 640;

  const filteredTransactions = transactions.filter((item) => {
    const type = String(item.type).toLowerCase();
    return type.includes('deposit') || type.includes('withdraw');
  });

  if (compact && !filteredTransactions.length) {
    return (
      <View className="mb-[18px] items-center rounded-2xl border px-4 py-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#ECEAE3' }}>
        <Clock3 size={22} color="#C9CDD4" strokeWidth={1.8} />
        <Text className="mt-2 text-[13px] font-semibold" style={{ color: '#1B1F27' }}>{title}</Text>
        <Text className="mt-0.5 text-[12px]" style={{ color: '#9CA4AF' }}>No deposits or withdrawals yet</Text>
      </View>
    );
  }

  return (
    <View className={`${compact ? 'mb-[18px] p-4' : mobile ? 'p-4 mt-3' : 'p-5 mt-5'} rounded-2xl border shadow-sm`} style={{ backgroundColor: compact ? '#FFFFFF' : colors.panel, borderColor: compact ? '#ECEAE3' : colors.border }}>
      <Text className="mb-4 text-lg font-medium" style={{ color: colors.text }}>{title}</Text>
      {filteredTransactions.length ? (
        <View>
          <View className="flex-row items-center border-b pb-3 mb-2" style={{ borderColor: colors.border }}>
            <Text className="flex-[2] text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Transaction</Text>
            <Text className="flex-[1.2] text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Amount</Text>
            <Text className="flex-[1.2] text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Status</Text>
          </View>
          {filteredTransactions.map((item, index) => {
            const bonus = Number(item.bonus || 0);
            return (
              <View key={item.id} className={`flex-row items-center py-3 ${index !== filteredTransactions.length - 1 ? 'border-b' : ''}`} style={{ borderColor: colors.border }}>
                <View className="flex-[2] pr-2">
                  <Text className="text-[12px] font-bold uppercase tracking-wider" style={{ color: colors.text }}>{transactionTypeLabel(item.type, item.note)}</Text>
                  <Text className="text-[11px] mt-1" style={{ color: colors.muted }}>{dateTime(item.createdAt)}</Text>
                  {bonus > 0 ? <Text className="mt-1 text-[11px]" style={{ color: colors.primary }}>Bonus {money(bonus)} USD</Text> : null}
                </View>
                <View className="flex-[1.2] items-end justify-center">
                  <Text className="font-medium text-right text-[13px]" style={{ color: colors.text }}>{money(item.amount)} USD</Text>
                </View>
                <View className="flex-[1.2] items-end justify-center pl-2">
                  <View
                    className="items-center justify-center rounded-md px-2 py-1"
                    style={{
                      backgroundColor: ['approved', 'completed'].includes(item.status) ? `${colors.success}18` : item.status === 'rejected' ? `${colors.danger}18` : `${colors.primary}18`,
                      minWidth: mobile ? 60 : 75
                    }}
                  >
                    <Text
                      className="text-[10px] font-bold uppercase tracking-wider text-center"
                      style={{ color: ['approved', 'completed'].includes(item.status) ? colors.success : item.status === 'rejected' ? colors.danger : colors.primary }}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : <Text style={{ color: colors.muted }}>No deposits or withdrawals found.</Text>}
    </View>
  );
}
