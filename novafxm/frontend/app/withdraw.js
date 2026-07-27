import { ScrollView, Text } from 'react-native';
import WithdrawForm from '../src/components/wallet/WithdrawForm';
import { useWallet } from '../src/hooks/useWallet';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';

export default function WithdrawScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const { summary, transactions, withdraw, loading } = useWallet();
  const fundingLocked = Boolean(user && user.verificationStatus !== 'approved');
  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="mx-auto w-full max-w-[650px] p-3 sm:p-6">
      <Text className="mb-5 text-2xl font-medium" style={{ color: colors.text }}>New Withdrawal</Text>
      <WithdrawForm
        onSubmit={(values) => withdraw(values, Boolean(user))}
        loading={loading}
        disabled={fundingLocked}
        disabledMessage="Verification approval is required before withdrawals."
        summary={summary}
        transactions={transactions}
      />
    </ScrollView>
  );
}
