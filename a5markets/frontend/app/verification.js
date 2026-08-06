import { Fragment, useEffect } from 'react';
import { Link, router } from 'expo-router';
import { CheckCircle2, FileCheck2, FileText, ShieldCheck, UploadCloud } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import CustomButton from '../src/components/common/CustomButton';
import DashboardTabs from '../src/components/layout/DashboardTabs';
import PortalLayout from '../src/components/portal/PortalLayout';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';

const medium = '#0B0B0B';
const GOLD = '#17B8B2';
const GREEN = '#153F73';

function Card({ title, children, colors }) {
  return (
    <View className="rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
      <Text className="mb-4 text-lg font-medium" style={{ color: colors.text }}>{title}</Text>
      {children}
    </View>
  );
}

function VerificationStep({ title, description, status, active, complete, colors }) {
  const accent = complete ? GREEN : active ? GOLD : '#2b2b2b';
  const labelColor = active ? medium : GOLD;
  const labelBackground = active ? GOLD : complete ? 'rgba(1, 68, 33, .65)' : colors.panel;

  return (
    <View
      className="flex-1 rounded-2xl border p-4"
      style={{
        backgroundColor: complete ? 'rgba(1, 68, 33, .16)' : active ? 'rgba(212, 175, 55, .12)' : colors.surface,
        borderColor: accent,
      }}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
          {complete ? <CheckCircle2 size={22} color={GOLD} /> : active ? <UploadCloud size={22} color={medium} /> : <FileText size={22} color={GOLD} />}
        </View>
        <Text className="rounded-full px-3 py-1 text-[10px] font-medium uppercase" style={{ color: labelColor, backgroundColor: labelBackground }}>
          {status}
        </Text>
      </View>
      <Text className="text-base font-medium" style={{ color: colors.text }}>{title}</Text>
      <Text className="mt-2 text-sm leading-5" style={{ color: colors.muted }}>{description}</Text>
    </View>
  );
}

function AccountDashboardHeader({ user, colors }) {
  return (
    <View className="mb-6">
      <View className="mb-6 flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <Text className="text-3xl font-medium" style={{ color: colors.text }}>Account Dashboard</Text>
          <Text className="mt-1" style={{ color: colors.muted }}>{user?.email || 'Manage accounts, funds, and rewards'}</Text>
        </View>
        <View className="flex-row gap-3">
          <Link href="/trading" asChild><Pressable><Text style={{ color: GOLD }}>Back to Trading</Text></Pressable></Link>
          <Link href="/login" asChild><Pressable><Text className="text-danger">Sign Out</Text></Pressable></Link>
        </View>
      </View>
      <DashboardTabs activeKey="verification" />
    </View>
  );
}

export default function VerificationScreen() {
  const { user, refreshUser } = useAuth();
  const { colors } = useAppTheme();
  const verificationStatus = user?.verificationStatus || 'unverified';
  const VerificationLayout = String(user?.role || 'user').toLowerCase() === 'user' ? PortalLayout : Fragment;

  useEffect(() => {
    refreshUser?.().catch(() => {});
  }, [refreshUser]);

  if (verificationStatus === 'approved') {
    return (
      <VerificationLayout><ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8 justify-center min-h-full">
        <AccountDashboardHeader user={user} colors={colors} />
        <View className="w-full max-w-[640px] mx-auto items-center rounded-2xl border p-6 sm:p-10" style={{ backgroundColor: colors.panel, borderColor: GREEN }}>
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: GREEN }}>
            <CheckCircle2 size={42} color={GOLD} />
          </View>
          <Text className="text-center text-3xl sm:text-4xl font-medium" style={{ color: colors.text }}>Verification Successfully</Text>
          <Text className="mt-3 text-center text-sm sm:text-base" style={{ color: colors.muted }}>Your account is verified. You now have access to all enabled account features.</Text>
          <CustomButton title="Go to Dashboard" onPress={() => router.push('/dashboard')} className="mt-8 w-full sm:w-auto sm:min-w-[190px]" />
        </View>
      </ScrollView></VerificationLayout>
    );
  }

  if (verificationStatus === 'rejected') {
    return (
      <VerificationLayout><ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8 justify-center min-h-full">
        <AccountDashboardHeader user={user} colors={colors} />
        <View className="w-full max-w-[640px] mx-auto items-center rounded-2xl border border-danger/60 bg-danger/10 p-6 sm:p-10">
          <Text className="text-center text-3xl sm:text-4xl font-medium" style={{ color: colors.text }}>Try Again</Text>
          <Text className="mt-3 text-center text-sm sm:text-base" style={{ color: colors.muted }}>Your verification was not approved. Upload clear ID proof and address proof photos again.</Text>
          <CustomButton title="Upload Again" onPress={() => router.push('/verification-upload')} className="mt-8 w-full sm:w-auto sm:min-w-[190px]" />
        </View>
      </ScrollView></VerificationLayout>
    );
  }

  if (verificationStatus === 'pending') {
    return (
      <VerificationLayout><ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8 justify-center min-h-full">
        <AccountDashboardHeader user={user} colors={colors} />
        <View className="w-full max-w-[640px] mx-auto items-center rounded-2xl border p-6 sm:p-10" style={{ backgroundColor: colors.panel, borderColor: GOLD }}>
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(212, 175, 55, .14)' }}>
            <ShieldCheck size={42} color={GOLD} />
          </View>
          <Text className="text-center text-3xl sm:text-4xl font-medium" style={{ color: colors.text }}>Verification Submitted</Text>
          <Text className="mt-3 text-center text-sm sm:text-base" style={{ color: colors.muted }}>Waiting for admin review. You will see the result here once it is reviewed.</Text>
          <CustomButton title="Go to Dashboard" onPress={() => router.push('/dashboard')} className="mt-8 w-full sm:w-auto sm:min-w-[190px]" />
        </View>
      </ScrollView></VerificationLayout>
    );
  }

  return (
    <VerificationLayout><ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8">
      <AccountDashboardHeader user={user} colors={colors} />

      <View className="gap-4">
        <Card title="Verification Status" colors={colors}>
          <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
            <View>
              <Text className="text-2xl font-medium" style={{ color: colors.text }}>Unlock full account access</Text>
              <Text className="mt-1" style={{ color: colors.muted }}>Complete verification to enable all trading, funding, and account features.</Text>
            </View>
            <View className="flex-row items-center rounded-full border px-4 py-2" style={{ borderColor: GOLD, backgroundColor: 'rgba(212, 175, 55, .12)' }}>
              <ShieldCheck size={18} color={GOLD} />
              <Text className="ml-2 text-sm font-medium" style={{ color: GOLD }}>KYC Required</Text>
            </View>
          </View>

          <View className="gap-4 xl:flex-row">
            <View className="flex-[2] gap-3">
              <VerificationStep
                title="Unverified"
                description="You've registered. Upload your documents to complete verification and unlock more features."
                status="You are here"
                complete
                colors={colors}
              />
              <VerificationStep
                title="Verified"
                description="After verification, you'll gain access to enhanced features and more functionality."
                status="Up next"
                active
                colors={colors}
              />
              <VerificationStep
                title="CC-Verified"
                description="This is the final step before you gain full access to all account features."
                status="Locked"
                colors={colors}
              />
            </View>

            <View className="flex-1 rounded-2xl border p-5" style={{ backgroundColor: colors.surface, borderColor: GREEN }}>
              <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(1, 68, 33, .55)' }}>
                <FileCheck2 size={24} color={GOLD} />
              </View>
              <Text className="text-lg font-medium" style={{ color: colors.text }}>Document Requirements</Text>
              <Text className="mt-2 text-sm" style={{ color: colors.muted }}>Documents required to complete this stage.</Text>
              <View className="mt-5 gap-3">
                {['ID Proof', 'Address Proof'].map((item) => (
                  <View key={item} className="flex-row items-center rounded-xl border p-3" style={{ backgroundColor: colors.panel, borderColor: GREEN }}>
                    <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: GREEN }}>
                      <FileText size={15} color={GOLD} />
                    </View>
                    <Text className="ml-3 font-medium" style={{ color: colors.text }}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Card>

        <Card title="Available Features" colors={colors}>
          <View className="min-h-[120px] items-center justify-center rounded-2xl border border-dashed p-6" style={{ backgroundColor: colors.surface, borderColor: GREEN }}>
            <Text className="text-lg font-medium" style={{ color: colors.text }}>No Features Available</Text>
            <Text className="mt-2 text-center" style={{ color: colors.muted }}>New account tools will appear here after your verification status changes.</Text>
          </View>
        </Card>

        <CustomButton
          title={verificationStatus === 'rejected' ? 'Try Again ->' : 'Next Steps ->'}
          onPress={() => router.push('/verification-upload')}
          disabled={verificationStatus === 'approved' || verificationStatus === 'pending'}
          className="max-w-[180px]"
        />
      </View>
    </ScrollView></VerificationLayout>
  );
}
