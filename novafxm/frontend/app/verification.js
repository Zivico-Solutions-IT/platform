import { useEffect } from 'react';
import { Link, router } from 'expo-router';
import { CheckCircle2, FileCheck2, FileText, ShieldCheck, UploadCloud, X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import CustomButton from '../src/components/common/CustomButton';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';

const medium = '#241A02';
const GOLD = '#B8891E';
const GREEN = '#2FA85B';

function Card({ title, children, colors }) {
  return (
    <View className="rounded-[18px] border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#ECEAE3' }}>
      <Text className="mb-4 text-[15px] font-bold" style={{ color: '#1B1F27' }}>{title}</Text>
      {children}
    </View>
  );
}

function VerificationStep({ title, description, status, active, complete, colors }) {
  const accent = complete ? GREEN : active ? GOLD : '#D6DAE0';
  const labelColor = active ? medium : '#8A8F7C';
  const labelBackground = active ? '#D9AC38' : '#F4F2ED';

  return (
    <View
      className="flex-1 rounded-[18px] border p-4"
      style={{
        backgroundColor: complete ? '#FBF3E2' : '#FFFFFF',
        borderColor: accent,
      }}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <View className="h-10 w-10 items-center justify-center rounded-[11px]" style={{ backgroundColor: complete ? '#F0DEA8' : '#F4F2ED' }}>
          {complete ? <CheckCircle2 size={20} color={GOLD} /> : active ? <UploadCloud size={20} color="#9CA4AF" /> : <FileText size={20} color="#9CA4AF" />}
        </View>
        <Text className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase" style={{ color: labelColor, backgroundColor: labelBackground }}>
          {status}
        </Text>
      </View>
      <Text className="text-[15px] font-bold" style={{ color: '#1B1F27' }}>{title}</Text>
      <Text className="mt-1 text-[12px] leading-[17px]" style={{ color: '#8A8F7C' }}>{description}</Text>
    </View>
  );
}

function AccountDashboardHeader({ user, colors }) {
  return (
    <View className="border-b px-5 pb-[18px] pt-[22px]" style={{ backgroundColor: '#FFFFFF', borderColor: '#ECEAE3' }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-start gap-3">
          <View className="h-[38px] w-[38px] items-center justify-center rounded-[11px]" style={{ backgroundColor: '#FBF3E2' }}>
            <ShieldCheck size={18} color={GOLD} />
          </View>
          <View>
            <Text className="text-[21px] font-semibold" style={{ color: '#1B1F27' }}>Verification</Text>
            <Text className="mt-1 text-[12px]" style={{ color: '#8A8F7C' }}>Step-wise KYC status and documents</Text>
          </View>
        </View>
        <Link href="/trading" asChild>
          <Pressable className="h-[30px] w-[30px] items-center justify-center rounded-full" style={{ backgroundColor: '#F4F2ED' }}>
            <X size={14} color="#7C8592" />
          </Pressable>
        </Link>
      </View>
      <View className="mt-2 flex-row justify-end gap-3">
        <Link href="/login" asChild><Pressable><Text className="text-[10px]" style={{ color: '#9CA4AF' }}>Sign Out</Text></Pressable></Link>
      </View>
    </View>
  );
}

export default function VerificationScreen() {
  const { user, refreshUser } = useAuth();
  const { colors } = useAppTheme();
  const verificationStatus = user?.verificationStatus || 'unverified';

  useEffect(() => {
    refreshUser?.().catch(() => {});
  }, [refreshUser]);

  if (verificationStatus === 'approved') {
    return (
      <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8 justify-center min-h-full">
        <AccountDashboardHeader user={user} colors={colors} />
        <View className="w-full max-w-[640px] mx-auto items-center rounded-2xl border p-6 sm:p-10" style={{ backgroundColor: colors.panel, borderColor: GREEN }}>
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: GREEN }}>
            <CheckCircle2 size={42} color={GOLD} />
          </View>
          <Text className="text-center text-3xl sm:text-4xl font-medium" style={{ color: colors.text }}>Verification Successfully</Text>
          <Text className="mt-3 text-center text-sm sm:text-base" style={{ color: colors.muted }}>Your account is verified. You now have access to all enabled account features.</Text>
          <CustomButton title="Go to Dashboard" onPress={() => router.push('/dashboard')} className="mt-8 w-full sm:w-auto sm:min-w-[190px]" />
        </View>
      </ScrollView>
    );
  }

  if (verificationStatus === 'rejected') {
    return (
      <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8 justify-center min-h-full">
        <AccountDashboardHeader user={user} colors={colors} />
        <View className="w-full max-w-[640px] mx-auto items-center rounded-2xl border border-danger/60 bg-danger/10 p-6 sm:p-10">
          <Text className="text-center text-3xl sm:text-4xl font-medium" style={{ color: colors.text }}>Try Again</Text>
          <Text className="mt-3 text-center text-sm sm:text-base" style={{ color: colors.muted }}>Your verification was not approved. Upload clear ID proof and address proof photos again.</Text>
          <CustomButton title="Upload Again" onPress={() => router.push('/verification-upload')} className="mt-8 w-full sm:w-auto sm:min-w-[190px]" />
        </View>
      </ScrollView>
    );
  }

  if (verificationStatus === 'pending') {
    return (
      <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8 justify-center min-h-full">
        <AccountDashboardHeader user={user} colors={colors} />
        <View className="w-full max-w-[640px] mx-auto items-center rounded-2xl border p-6 sm:p-10" style={{ backgroundColor: colors.panel, borderColor: GOLD }}>
          <View className="mb-6 h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(212, 175, 55, .14)' }}>
            <ShieldCheck size={42} color={GOLD} />
          </View>
          <Text className="text-center text-3xl sm:text-4xl font-medium" style={{ color: colors.text }}>Verification Submitted</Text>
          <Text className="mt-3 text-center text-sm sm:text-base" style={{ color: colors.muted }}>Waiting for admin review. You will see the result here once it is reviewed.</Text>
          <CustomButton title="Go to Dashboard" onPress={() => router.push('/dashboard')} className="mt-8 w-full sm:w-auto sm:min-w-[190px]" />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: '#1A1C20' }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 12, paddingVertical: 24 }}>
      <View className="w-full overflow-hidden" style={{ maxWidth: 380, borderRadius: 0, backgroundColor: '#F6F5F1' }}>
      <AccountDashboardHeader user={user} colors={colors} />

      <View className="gap-4 px-5 pb-5 pt-[18px]">
        <Card title="Verification Status" colors={colors}>
          <View className="mb-4">
            <Text className="text-[19px] font-bold" style={{ color: '#1B1F27' }}>Unlock full account access</Text>
            <Text className="mt-1 text-[12px] leading-[17px]" style={{ color: '#8A8F7C' }}>Upload your documents to enable withdrawals and full account features.</Text>
            <View className="mt-3 self-start rounded-full border px-3.5 py-1.5" style={{ borderColor: '#E9CB84', backgroundColor: '#FFFFFF' }}>
              <Text className="text-[11px] font-semibold" style={{ color: GOLD }}>KYC Required</Text>
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

            <View className="flex-1 rounded-[18px] border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#ECEAE3' }}>
              <View className="mb-3 h-10 w-10 items-center justify-center rounded-[11px]" style={{ backgroundColor: '#EAF6EC' }}>
                <FileCheck2 size={20} color={GREEN} />
              </View>
              <Text className="text-[15px] font-bold" style={{ color: '#1B1F27' }}>Document Requirements</Text>
              <Text className="mt-1 text-[12px] leading-[17px]" style={{ color: '#8A8F7C' }}>Both files are required before submission.</Text>
              <View className="mt-4 gap-2.5">
                {['ID Proof', 'Address Proof'].map((item) => (
                  <View key={item} className="items-center rounded-[16px] border border-dashed p-4" style={{ backgroundColor: '#F9FBF9', borderColor: '#B7DFC0' }}>
                    <View className="h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: '#EAF6EC' }}>
                      <UploadCloud size={18} color={GREEN} />
                    </View>
                    <Text className="mt-2 text-[13px] font-semibold" style={{ color: '#1B1F27' }}>{item}</Text>
                    <Text className="mt-1 text-center text-[11px]" style={{ color: '#9CA4AF' }}>Click to upload · JPG or PNG, up to 5MB</Text>
                  </View>
                ))}
              </View>
              <CustomButton title="Submit Verification" onPress={() => router.push('/verification-upload')} className="mt-4" compact style={{ backgroundColor: '#E7B84C' }} />
            </View>
          </View>
        </Card>

      </View>
      </View>
    </ScrollView>
  );
}
