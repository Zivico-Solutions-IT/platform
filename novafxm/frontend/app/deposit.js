import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import DepositForm from '../src/components/wallet/DepositForm';
import TransactionList from '../src/components/wallet/TransactionList';
import { useWallet } from '../src/hooks/useWallet';
import { useAuth } from '../src/hooks/useAuth';

export default function DepositScreen() {
  const { user } = useAuth();
  const { deposit, transactions, loading } = useWallet();
  const depositTransactions = transactions.filter((item) => item.type === 'deposit');
  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: '#F6F5F1' }}
      contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 0, paddingVertical: 0 }}
    >
      <View className="w-full overflow-hidden" style={{ maxWidth: 380, borderRadius: 0, backgroundColor: 'transparent' }}>
        <View className="flex-row items-start justify-between border-b px-5 pb-[18px] pt-[22px]" style={{ backgroundColor: '#FFFFFF', borderColor: '#ECEAE3' }}>
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-[21px] font-semibold" style={{ color: '#1B1F27' }}>Deposit</Text>
            <Text className="mt-1 text-[13px] leading-[18px]" style={{ color: '#8A8F7C' }}>Fund your trading account. Reviewed within minutes.</Text>
          </View>
          <Pressable
            accessibilityLabel="Close deposit"
            onPress={() => router.replace({ pathname: '/trading', params: { tab: 'wallet' } })}
            className="h-[30px] w-[30px] items-center justify-center rounded-full"
            style={{ backgroundColor: '#F4F2ED' }}
          >
            <X size={17} color="#7C8592" strokeWidth={2} />
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
