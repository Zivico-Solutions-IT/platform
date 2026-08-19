import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import RequireAuth from '../src/components/auth/RequireAuth';
import WithdrawForm from '../src/components/wallet/WithdrawForm';
import { useAppTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/hooks/useAuth';
import { useDemoTrading } from '../src/hooks/useDemoTrading';
import { useWallet } from '../src/hooks/useWallet';

function WithdrawScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { selectedTradingAccount } = useDemoTrading();
  const { summary, transactions, withdraw, loading } = useWallet();
  const locked = user?.verificationStatus !== 'approved';

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-semibold" style={{ color: colors.text }}>Withdraw</Text>
            <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Request funds from your live account.</Text>
          </View>
          <Pressable
            accessibilityLabel="Close withdrawal"
            onPress={() => router.replace({ pathname: '/trading', params: { tab: 'wallet' } })}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <X size={24} color={colors.text} strokeWidth={1.8} />
          </Pressable>
        </View>
        <WithdrawForm
          onSubmit={(values) => withdraw(values, true)}
          loading={loading}
          disabled={locked}
          disabledMessage={locked ? 'Verification approval is required before withdrawals.' : ''}
          summary={summary}
          transactions={transactions}
          selectedAccount={selectedTradingAccount}
          onMissingDetailsPress={() => router.push({ pathname: '/settings', params: { section: 'payments', returnTo: 'withdraw' } })}
        />
      </ScrollView>
    </View>
  );
}

export default function WithdrawPage() {
  return <RequireAuth><WithdrawScreen /></RequireAuth>;
}
