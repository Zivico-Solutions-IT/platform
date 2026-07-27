import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import WalletCard from '../src/components/wallet/WalletCard';
import DepositForm from '../src/components/wallet/DepositForm';
import WithdrawForm from '../src/components/wallet/WithdrawForm';
import TransactionList from '../src/components/wallet/TransactionList';
import { useWallet } from '../src/hooks/useWallet';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';

export default function WalletScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const { summary, transactions, deposit, withdraw, loading } = useWallet();
  const withdrawalLocked = Boolean(user && user.verificationStatus !== 'approved');
  const withdrawalLockedMessage = 'Verification approval is required before withdrawals.';
  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="mx-auto w-full max-w-[1180px] p-3 sm:p-4 lg:p-8">
      <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
        <Text className="text-2xl font-medium" style={{ color: colors.text }}>Wallet</Text>
        <Link href="/trading" asChild><Pressable><Text className="text-primary font-medium">Back to Trading</Text></Pressable></Link>
      </View>
      <WalletCard summary={summary} transactions={transactions} user={user} />
      <View className="gap-4 lg:flex-row">
        <DepositForm onSubmit={(values) => deposit(values, Boolean(user))} loading={loading} />
        <WithdrawForm
          onSubmit={(values) => withdraw(values, Boolean(user))}
          loading={loading}
          disabled={withdrawalLocked}
          disabledMessage={withdrawalLockedMessage}
          summary={summary}
          transactions={transactions}
        />
      </View>
      <TransactionList transactions={transactions} />
    </ScrollView>
  );
}
