import { Link, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ProfileCard from '../src/components/profile/ProfileCard';
import EditProfileForm from '../src/components/profile/EditProfileForm';
import CustomButton from '../src/components/common/CustomButton';
import { useAuth } from '../src/hooks/useAuth';
import { useDemoTrading } from '../src/hooks/useDemoTrading';
import { useAppTheme } from '../src/context/ThemeContext';
import PortalLayout from '../src/components/portal/PortalLayout';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const { summary } = useDemoTrading();
  const { colors } = useAppTheme();
  const signOut = async () => {
    await logout();
    router.replace('/login');
  };
  return (
    <PortalLayout><ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 sm:p-5 lg:p-8 mx-auto w-full max-w-[1180px]">
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-2xl font-medium" style={{ color: colors.text }}>Profile</Text>
        <Link href="/trading" asChild><Pressable><Text className="text-primary font-medium">Back to Trading</Text></Pressable></Link>
      </View>
      <View className="gap-4 lg:flex-row">
        <View className="lg:w-[360px]"><ProfileCard user={user} balance={summary.balance} /></View>
        <EditProfileForm user={user} onSubmit={updateProfile} />
      </View>
      {user ? <CustomButton title="Logout" variant="secondary" onPress={signOut} className="mt-5 max-w-[220px]" /> : (
        <Link href="/login" asChild><Pressable className="mt-5"><Text className="text-primary font-medium">Login to manage your account</Text></Pressable></Link>
      )}
      <Text className="mt-10 text-[11px] font-medium" style={{ color: colors.muted }}>
        <Link href="https://www.tradingview.com/">
          TradingView Lightweight Charts(TM) Copyright (c) 2025 TradingView, Inc.
        </Link>
      </Text>
    </ScrollView></PortalLayout>
  );
}
