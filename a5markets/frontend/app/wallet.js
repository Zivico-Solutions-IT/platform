import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ClientPortalHeader from '../src/components/layout/ClientPortalHeader';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';
import WithdrawalMethods from '../src/components/wallet/WithdrawalMethods';

export default function WalletScreen() {
  const { user, logout } = useAuth();
  const { colors } = useAppTheme();
  const signOut = async () => {
    await logout();
    router.replace('/login');
  };
  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="mx-auto w-full max-w-[1180px] p-3 sm:p-4 lg:p-8">
      <ClientPortalHeader
        title="Wallet"
        subtitle={user?.email || 'Manage your withdrawal methods.'}
        activeKey="withdraw"
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
      <WithdrawalMethods user={user} />
    </ScrollView>
  );
}
