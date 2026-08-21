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
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 0, paddingVertical: 0 }} showsVerticalScrollIndicator={false}>
        <View className="w-full overflow-hidden" style={{ maxWidth: 380, borderRadius: 0, backgroundColor: 'transparent' }}>
        <View className="flex-row items-start justify-between border-b px-5 pb-[18px] pt-[22px]" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
          <View>
            <Text className="text-[21px] font-semibold" style={{ color: colors.text }}>Withdraw</Text>
            <Text className="mt-1 text-[12px] leading-[17px]" style={{ color: colors.muted }}>Request funds from your live account.</Text>
          </View>
          <Pressable
            accessibilityLabel="Close withdrawal"
            onPress={() => router.replace({ pathname: '/trading', params: { tab: 'wallet' } })}
            className="h-[30px] w-[30px] items-center justify-center rounded-full"
            style={{ backgroundColor: colors.surface }}
          >
            <X size={17} color={colors.muted} strokeWidth={2} />
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
          onVerificationRequired={() => router.push({ pathname: '/trading', params: { panel: 'verification' } })}
          onMissingDetailsPress={(payoutType) => router.push({
            pathname: '/trading',
            params: { panel: 'settings', section: 'payments', returnTo: 'withdraw', payoutType },
          })}
        />
        </View>
      </ScrollView>
    </View>
  );
}

export default function WithdrawPage() {
  return <RequireAuth><WithdrawScreen /></RequireAuth>;
}
