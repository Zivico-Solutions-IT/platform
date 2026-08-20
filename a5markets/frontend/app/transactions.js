import { router } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';
import ClientPortalHeader from '../src/components/layout/ClientPortalHeader';
import TransactionList from '../src/components/wallet/TransactionList';
import { useWallet } from '../src/hooks/useWallet';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';

export default function TransactionsScreen() {
  const { transactions } = useWallet();
  const { user, logout } = useAuth();
  const { colors } = useAppTheme();
  const signOut = async () => {
    await logout();
    router.replace('/login');
  };
  return (
      <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="mx-auto w-full max-w-[1180px] p-4 lg:p-8">
        <ClientPortalHeader
          title="Transaction History"
          subtitle={user?.email || 'Review deposits, withdrawals, and wallet activity.'}
          activeKey="overview"
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
        <TransactionList transactions={transactions} title="All Transactions" />
      </ScrollView>
  );
}
