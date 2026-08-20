import { router } from 'expo-router';
import { CheckCircle2, ShieldCheck, Wallet, XCircle } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ClientPortalHeader from '../src/components/layout/ClientPortalHeader';
import DepositForm from '../src/components/wallet/DepositForm';
import TransactionList from '../src/components/wallet/TransactionList';
import { useWallet } from '../src/hooks/useWallet';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';

export default function DepositScreen() {
  const { user, logout } = useAuth();
  const { colors } = useAppTheme();
  const { deposit, transactions, loading } = useWallet();
  const depositTransactions = transactions.filter((item) => item.type === 'deposit');
  const latestReviewedDeposit = depositTransactions.find((item) => ['approved', 'completed', 'rejected'].includes(item.status));
  const depositApproved = ['approved', 'completed'].includes(latestReviewedDeposit?.status);
  const latestBonus = Number(latestReviewedDeposit?.bonus || 0);
  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="mx-auto w-full max-w-[1180px] p-4 lg:p-8">
      <ClientPortalHeader
        title="Deposit"
        subtitle="Fund your trading account with a reviewed deposit request."
        activeKey="deposit"
        userRole={user?.role}
        rightContent={(
          <>
            <Pressable onPress={() => router.push('/trading')} className="h-10 items-center justify-center px-2">
              <Text className="font-medium" style={{ color: colors.primary }}>Back to Trading</Text>
            </Pressable>
            <Pressable onPress={signOut} className="h-10 items-center justify-center px-2">
              <Text className="font-medium" style={{ color: colors.danger }}>Sign Out</Text>
            </Pressable>
          </>
        )}
      />

      <View className="mb-5 flex-row flex-wrap items-center justify-between gap-4 rounded-3xl border p-6 shadow-sm" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
        <View className="flex-row items-center">
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl bg-success/10">
            <ShieldCheck size={24} color="#0C9F91" />
          </View>
          <View className="flex-1">
            <Text className="font-medium" style={{ color: colors.text }}>Secure funding workflow</Text>
            <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Upload receipt proof and track every request in deposit history.</Text>
          </View>
        </View>
        <View className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
          <View className="flex-row items-center">
            <Wallet size={18} color="#17B8B2" />
            <Text className="ml-2 text-[11px] font-bold uppercase tracking-wider text-primary">Minimum deposit $100</Text>
          </View>
        </View>
      </View>

      {latestReviewedDeposit ? (
        <View className={`mb-5 flex-row items-center rounded-3xl border p-5 shadow-sm ${depositApproved ? 'border-success/40 bg-success/10' : 'border-danger/40 bg-danger/10'}`}>
          <View className={`mr-4 h-12 w-12 items-center justify-center rounded-full ${depositApproved ? 'bg-success/15' : 'bg-danger/15'}`}>
            {depositApproved ? <CheckCircle2 size={24} color="#0C9F91" /> : <XCircle size={24} color="#f24d58" />}
          </View>
          <View className="flex-1">
            <Text className={`font-medium text-base ${depositApproved ? 'text-success' : 'text-danger'}`}>
              {depositApproved ? 'Deposit Approved' : 'Deposit Rejected'}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: colors.muted }}>
              {depositApproved
                ? `Your deposit of ${Number(latestReviewedDeposit.amount || 0).toFixed(2)} USD has been approved and added to your wallet.${latestBonus > 0 ? ` Bonus ${latestBonus.toFixed(2)} USD has also been added.` : ''}`
                : `Your deposit of ${Number(latestReviewedDeposit.amount || 0).toFixed(2)} USD was rejected. Please check your receipt/reference and submit again.`}
            </Text>
          </View>
        </View>
      ) : null}

      <DepositForm
        onSubmit={(values) => deposit(values, Boolean(user))}
        loading={loading}
      />
      <TransactionList transactions={depositTransactions} title="Deposit History" />
    </ScrollView>
  );
}
