import { Link, router } from 'expo-router';
import { CheckCircle2, FileText, UploadCloud, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import DashboardTabs from '../src/components/layout/DashboardTabs';
import NovaLogo from '../src/components/brand/NovaLogo';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';
import { kycImageDataUrl } from '../src/utils/kycImage';

const medium = '#0B0B0B';
const GOLD = '#D4AF37';
const GREEN = '#014421';

function fileName(file) {
  return file?.name || file?.uri?.split('/').pop() || '';
}

function UploadBox({ title, file, onSelect, onClear, colors }) {
  const inputRef = useRef(null);
  const ready = Boolean(file);

  const openPicker = () => {
    if (Platform.OS === 'web') inputRef.current?.click();
  };

  return (
    <View className="rounded-2xl border" style={{ backgroundColor: colors.panel, borderColor: ready ? GOLD : GREEN }}>
      <View className="border-b px-5 py-4" style={{ borderColor: GREEN }}>
        <Text className="font-medium" style={{ color: colors.text }}>{title}</Text>
      </View>
      <Pressable
        onPress={openPicker}
        className="m-5 min-h-[180px] items-center justify-center rounded-2xl border border-dashed p-6"
        style={{ backgroundColor: colors.surface, borderColor: ready ? GOLD : colors.border }}
      >
        {Platform.OS === 'web' ? (
          <input
            ref={inputRef}
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            style={{ display: 'none' }}
            type="file"
            onChange={(event) => onSelect(event.target.files?.[0] || null)}
          />
        ) : null}
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: ready ? 'rgba(212, 175, 55, .16)' : 'rgba(1, 68, 33, .55)' }}>
          {ready ? <CheckCircle2 size={34} color={GOLD} /> : <UploadCloud size={34} color={GOLD} />}
        </View>
        <Text className="text-center text-lg font-medium" style={{ color: colors.text }}>{ready ? fileName(file) : 'Drop your file to upload or browse'}</Text>
        <Text className="mt-2 text-center text-sm" style={{ color: colors.muted }}>Upload a clear photo. JPG or PNG works best.</Text>
        {ready ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onClear();
            }}
            className="mt-5 flex-row items-center rounded-full border px-4 py-2"
            style={{ borderColor: GOLD }}
          >
            <X size={15} color={GOLD} />
            <Text className="ml-2 font-medium" style={{ color: GOLD }}>Remove</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

export default function VerificationUploadScreen() {
  const { submitVerification } = useAuth();
  const { colors } = useAppTheme();
  const [idProof, setIdProof] = useState(null);
  const [addressProof, setAddressProof] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const complete = Boolean(idProof && addressProof);

  const submit = async () => {
    if (!complete || busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await submitVerification({
        idProofImage: await kycImageDataUrl(idProof),
        addressProofImage: await kycImageDataUrl(addressProof),
      });
      setSuccess('Submit Successfully');
      setTimeout(() => router.replace('/verification'), 1200);
    } catch (requestError) {
      setError(requestError?.message || 'Submit Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8">
      <View className="mb-6 flex-row flex-wrap items-center justify-between gap-3">
        <View className="flex-row items-center">
          <NovaLogo dark width={150} height={38} />
          <View className="ml-5">
            <Text className="text-3xl font-medium" style={{ color: colors.text }}>Upload Documents</Text>
            <Text className="mt-1" style={{ color: colors.muted }}>Both required photos must be uploaded before completion.</Text>
          </View>
        </View>
        <Link href="/verification" asChild><Pressable><Text style={{ color: GOLD }}>Back to Verification</Text></Pressable></Link>
      </View>

      <DashboardTabs activeKey="verification" />

      <View className="gap-4">
        <UploadBox title="ID Proof" file={idProof} onSelect={setIdProof} onClear={() => setIdProof(null)} colors={colors} />
        <UploadBox title="Address Proof" file={addressProof} onSelect={setAddressProof} onClear={() => setAddressProof(null)} colors={colors} />
      </View>
      {success ? <Text className="mt-4 rounded-xl border border-success/40 bg-success/10 p-4 text-success">{success}</Text> : null}
      {error ? <Text className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-4 text-danger">{error}</Text> : null}

      <View className="mt-6 flex-col sm:flex-row justify-end gap-3 sm:gap-4">
        <Pressable
          onPress={() => router.push('/verification')}
          className="h-12 w-full sm:w-auto sm:min-w-[180px] items-center justify-center rounded-xl border px-6"
          style={{ borderColor: GREEN, backgroundColor: colors.panel }}
        >
          <Text className="font-medium" style={{ color: colors.text }}>Cancel</Text>
        </Pressable>
        <Pressable
          disabled={!complete || busy}
          onPress={submit}
          className="h-12 w-full sm:w-auto sm:min-w-[220px] items-center justify-center rounded-xl px-6"
          style={{ backgroundColor: complete && !busy ? GOLD : '#242424', opacity: complete && !busy ? 1 : 0.55 }}
        >
          <View className="flex-row items-center justify-center">
            <FileText size={16} color={complete && !busy ? medium : '#8a8a8a'} />
            <Text className="ml-2 font-medium" style={{ color: complete && !busy ? medium : '#8a8a8a' }}>{busy ? 'Submitting...' : 'Complete'}</Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}
