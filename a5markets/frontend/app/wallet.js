import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';
import PortalLayout from '../src/components/portal/PortalLayout';
import WithdrawalMethods from '../src/components/wallet/WithdrawalMethods';

export default function WalletScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  return (
    <PortalLayout><ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="mx-auto w-full max-w-[1180px] p-3 sm:p-4 lg:p-8">
      <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
        <Text className="text-2xl font-medium" style={{ color: colors.text }}>Wallet</Text>
        <Link href="/trading" asChild><Pressable><Text className="text-primary font-medium">Back to Trading</Text></Pressable></Link>
      </View>
      <WithdrawalMethods user={user} />
    </ScrollView></PortalLayout>
  );
}
