import { Fragment, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { CheckCircle2, FileText, ShieldCheck, UploadCloud } from 'lucide-react-native';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import CustomButton from '../src/components/common/CustomButton';
import PortalLayout from '../src/components/portal/PortalLayout';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';

const GOLD = '#2c79bb';
const GREEN = '#20c66b';
const INK = '#151515';
const SOFT_GOLD = '#dbeefa';
const SOFT_GREEN = '#def6e7';

function KycStep({ title, description, status, current, colors }) {
  const darkMode = colors.mode === 'dark';
  return (
    <View
      className="rounded-xl border p-6"
      style={{ backgroundColor: current ? (darkMode ? '#123b5c' : '#f4f9fd') : colors.panel, borderColor: current ? GOLD : colors.border }}
    >
      <View className="mb-5 flex-row items-start justify-between gap-3">
        <View className="h-[60px] w-[60px] items-center justify-center rounded-xl" style={{ backgroundColor: current ? (darkMode ? '#174d70' : SOFT_GOLD) : (darkMode ? colors.surface : '#f4f5f3') }}>
          {current ? <CheckCircle2 size={28} color={GOLD} /> : <UploadCloud size={28} color={darkMode ? colors.text : INK} />}
        </View>
        <Text
          className="rounded-full px-3 py-1 text-[10px] font-medium uppercase"
          style={{ backgroundColor: current ? GOLD : (darkMode ? colors.surface : '#f4f4f2'), color: current ? '#ffffff' : colors.muted }}
        >
          {status}
        </Text>
      </View>
      <Text className="text-xl font-medium" style={{ color: colors.text }}>{title}</Text>
      <Text className="mt-3 text-base leading-6" style={{ color: colors.muted }}>{description}</Text>
    </View>
  );
}

function fileName(file) {
  return file?.name || file?.uri?.split('/').pop() || '';
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function DocumentLink({ title, file, inputRef, onSelect, colors }) {
  const openPicker = () => {
    if (Platform.OS === 'web') inputRef.current?.click();
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={openPicker}
      className="flex-row items-center rounded-xl border p-5"
      style={{ borderColor: file ? GOLD : GREEN, backgroundColor: colors.panel }}
    >
      {Platform.OS === 'web' ? <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(event) => onSelect(event.target.files?.[0] || null)} /> : null}
      <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: SOFT_GREEN }}>
        {file ? <CheckCircle2 size={22} color={GOLD} /> : <FileText size={22} color={GREEN} />}
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-lg font-medium" style={{ color: colors.text }}>{title}</Text>
        <Text className="mt-1 text-xs" style={{ color: file ? GOLD : colors.muted }}>{file ? fileName(file) : 'Click to upload image'}</Text>
      </View>
    </Pressable>
  );
}

function StatusScreen({ title, description, icon, buttonTitle, colors }) {
  return (
    <View className="w-full max-w-[640px] mx-auto items-center rounded-2xl border p-6 sm:p-10" style={{ backgroundColor: colors.panel, borderColor: GOLD }}>
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: SOFT_GOLD }}>
        {icon}
      </View>
      <Text className="text-center text-3xl sm:text-4xl font-medium" style={{ color: colors.text }}>{title}</Text>
      <Text className="mt-3 text-center text-sm sm:text-base" style={{ color: colors.muted }}>{description}</Text>
      <CustomButton title={buttonTitle} onPress={() => router.push('/dashboard')} className="mt-8 w-full sm:w-auto sm:min-w-[190px]" />
    </View>
  );
}

export default function VerificationScreen() {
  const { user, refreshUser, submitVerification } = useAuth();
  const { colors, darkMode } = useAppTheme();
  const idProofInputRef = useRef(null);
  const addressProofInputRef = useRef(null);
  const [idProof, setIdProof] = useState(null);
  const [addressProof, setAddressProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const verificationStatus = user?.verificationStatus || 'unverified';
  const VerificationLayout = String(user?.role || 'user').toLowerCase() === 'user' ? PortalLayout : Fragment;

  useEffect(() => {
    refreshUser?.().catch(() => {});
  }, [refreshUser]);

  const submitDocuments = async () => {
    if (!idProof || !addressProof || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitVerification({
        idProofImage: await readFileDataUrl(idProof),
        addressProofImage: await readFileDataUrl(addressProof),
      });
      await refreshUser?.();
    } catch {
      setSubmitError('Could not submit documents. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (verificationStatus === 'approved' || verificationStatus === 'pending' || verificationStatus === 'rejected') {
    const rejected = verificationStatus === 'rejected';
    const pending = verificationStatus === 'pending';
    return (
      <VerificationLayout>
        <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8 justify-center min-h-full">
          <StatusScreen
            colors={colors}
            icon={rejected ? <FileText size={42} color={GOLD} /> : pending ? <ShieldCheck size={42} color={GOLD} /> : <CheckCircle2 size={42} color={GREEN} />}
            title={rejected ? 'Try Again' : pending ? 'Verification Submitted' : 'Verification Successful'}
            description={rejected ? 'Your verification was not approved. Upload clear ID proof and address proof photos again.' : pending ? 'Your documents are waiting for admin review. You will see the result here once reviewed.' : 'Your account is verified and all enabled account features are available.'}
            buttonTitle="Go to Dashboard"
          />
          {rejected ? <CustomButton title="Upload Again" onPress={() => router.push('/verification-upload')} className="mt-4 w-full max-w-[640px] mx-auto" /> : null}
        </ScrollView>
      </VerificationLayout>
    );
  }

  return (
    <VerificationLayout>
      <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8">
        <View className="mb-6 flex-row items-start">
          <View className="h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: SOFT_GOLD }}>
            <ShieldCheck size={26} color={GOLD} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-3xl font-medium" style={{ color: colors.text }}>Verification</Text>
            <Text className="mt-1 text-base" style={{ color: colors.muted }}>Step-wise KYC status and documents</Text>
          </View>
        </View>

        <View className="rounded-2xl border p-4 sm:p-6" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
          <View className="mb-7 flex-row flex-wrap items-start justify-between gap-4">
            <View>
              <Text className="text-2xl font-medium" style={{ color: colors.text }}>Unlock full account access</Text>
              <Text className="mt-1 text-base" style={{ color: colors.muted }}>Upload your documents to enable withdrawals and full account features.</Text>
            </View>
            <View className="rounded-full border px-5 py-3" style={{ borderColor: GOLD }}>
              <Text className="font-medium" style={{ color: GOLD }}>KYC Required</Text>
            </View>
          </View>

          <View className="gap-6 xl:flex-row">
            <View className="flex-[1.25] gap-4">
              <KycStep title="Unverified" description="Upload your ID proof and address proof." status="You are here" current colors={colors} />
              <KycStep title="Admin Review" description="Admin will review your documents and unlock full account access." status="Up next" colors={colors} />
            </View>

            <View className="flex-1 rounded-xl border p-6" style={{ backgroundColor: darkMode ? colors.surface : colors.panel, borderColor: colors.border }}>
              <View className="mb-6 h-[72px] w-[72px] items-center justify-center rounded-xl" style={{ backgroundColor: SOFT_GREEN }}>
                <FileText size={30} color={GOLD} />
              </View>
              <Text className="text-2xl font-medium" style={{ color: colors.text }}>Document Requirements</Text>
              <Text className="mt-2 text-base" style={{ color: colors.muted }}>Both files are required before submission.</Text>
              <View className="mt-7 gap-4">
                <DocumentLink title="ID Proof" file={idProof} inputRef={idProofInputRef} onSelect={setIdProof} colors={colors} />
                <DocumentLink title="Address Proof" file={addressProof} inputRef={addressProofInputRef} onSelect={setAddressProof} colors={colors} />
              </View>
              <Pressable disabled={!idProof || !addressProof || submitting} onPress={submitDocuments} className="mt-6 h-14 items-center justify-center rounded-xl" style={{ backgroundColor: GOLD, opacity: idProof && addressProof && !submitting ? 1 : 0.45 }}>
                <Text className="text-base font-medium" style={{ color: '#fff' }}>{submitting ? 'Submitting...' : 'Submit Verification'}</Text>
              </Pressable>
              {submitError ? <Text className="mt-3 text-sm" style={{ color: colors.danger }}>{submitError}</Text> : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </VerificationLayout>
  );
}
