import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import DepositForm from '../src/components/wallet/DepositForm';
import TransactionList from '../src/components/wallet/TransactionList';
import { useWallet } from '../src/hooks/useWallet';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';

export default function DepositScreen() {
  const { user } = useAuth();
  const { darkMode, colors } = useAppTheme();
  const { deposit, transactions, loading } = useWallet();
  const depositTransactions = transactions.filter((item) => item.type === 'deposit');
  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 0, paddingVertical: 0 }}
    >
      <View className="w-full overflow-hidden" style={{ maxWidth: 380, borderRadius: 0, backgroundColor: 'transparent' }}>
        <View className="flex-row items-start justify-between border-b px-5 pb-[18px] pt-[22px]" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-[21px] font-semibold" style={{ color: colors.text }}>Deposit</Text>
            <Text className="mt-1 text-[13px] leading-[18px]" style={{ color: colors.muted }}>Fund your trading account. Reviewed within minutes.</Text>
          </View>
          <Pressable
            accessibilityLabel="Close deposit"
            onPress={() => router.replace({ pathname: '/trading', params: { tab: 'wallet' } })}
            className="h-[30px] w-[30px] items-center justify-center rounded-full"
            style={{ backgroundColor: colors.surface }}
          >
            <X size={17} color={colors.muted} strokeWidth={2} />
          </Pressable>
        </View>
        <View className="px-5 pb-5 pt-[18px]">
          <DepositForm onSubmit={(values) => deposit(values, Boolean(user))} loading={loading} />
          <TransactionList transactions={depositTransactions} title="Deposit history" compact />
        </View>
      </View>
    </ScrollView>
  );
}
