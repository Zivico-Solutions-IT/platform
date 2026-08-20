import { Link, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ClientPortalHeader from '../src/components/layout/ClientPortalHeader';
import ProfileCard from '../src/components/profile/ProfileCard';
import EditProfileForm from '../src/components/profile/EditProfileForm';
import CustomButton from '../src/components/common/CustomButton';
import { useAuth } from '../src/hooks/useAuth';
import { useDemoTrading } from '../src/hooks/useDemoTrading';
import { useAppTheme } from '../src/context/ThemeContext';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const { summary } = useDemoTrading();
  const { colors } = useAppTheme();
  const signOut = async () => {
    await logout();
    router.replace('/login');
  };
  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 sm:p-5 lg:p-8 mx-auto w-full max-w-[1180px]">
      <ClientPortalHeader
        title="Profile"
        subtitle={user?.email || 'Manage your account profile.'}
        activeKey="settings"
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
    </ScrollView>
  );
}
