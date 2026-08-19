import { useEffect, useRef, useState } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import NovaLogo from '../src/components/brand/NovaLogo';
import { useAuth } from '../src/hooks/useAuth';
import { authService } from '../src/services/authService';

export default function VerifyEmailScreen() {
  const { email = '' } = useLocalSearchParams();
  const { verifyEmail } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(`We sent a 6-digit code to ${email}.`);
  const submitting = useRef(false);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const submit = async (value = code) => {
    const normalizedCode = String(value).replace(/\D/g, '').slice(0, 6);
    if (normalizedCode.length !== 6 || submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await verifyEmail({ email: String(email), code: normalizedCode });
      router.replace('/trading');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to verify this code.');
      setLoading(false);
      submitting.current = false;
    }
  };

  const updateCode = (value) => {
    const normalizedCode = value.replace(/\D/g, '').slice(0, 6);
    setCode(normalizedCode);
    if (normalizedCode.length === 6) submit(normalizedCode);
  };

  const resend = async () => {
    setResending(true);
    setError('');
    try {
      const result = await authService.resendEmailVerification({ email: String(email) });
      setMessage(result.message || 'A new verification code has been sent.');
      setCode('');
      setResendSeconds(30);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to resend the code.');
    } finally { setResending(false); }
  };

  return (
    <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: '#f0f5f2' }}>
      <View className="w-full max-w-[460px] rounded-[20px] bg-white px-8 py-9" style={{ borderColor: 'rgba(1,69,33,0.08)', borderWidth: 1, shadowColor: '#014521', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
        <NovaLogo dark={false} width={120} height={35} />
        <Text className="mt-8 text-2xl font-semibold" style={{ color: '#012b15' }}>Verify your email</Text>
        <Text className="mt-2 text-sm leading-6" style={{ color: '#4e6b5a' }}>{message}</Text>
        <TextInput
          value={code}
          onChangeText={updateCode}
          autoFocus
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          placeholder="000000"
          placeholderTextColor="#9ab5a5"
          className="mt-7 rounded-xl border px-4 py-4 text-center text-2xl font-bold tracking-[8px]"
          style={{ color: '#012b15', borderColor: 'rgba(1,69,33,0.18)', letterSpacing: 8 }}
        />
        {error ? <Text className="mt-3 text-sm" style={{ color: '#dc2626' }}>{error}</Text> : null}
        <Pressable onPress={() => submit()} disabled={loading || code.length !== 6} className="mt-5 flex-row items-center justify-center rounded-xl py-4" style={{ backgroundColor: '#d4af37', opacity: loading || code.length !== 6 ? 0.6 : 1 }}>
          {loading ? <ActivityIndicator color="#231902" /> : <Text className="font-bold" style={{ color: '#231902' }}>Verify and continue</Text>}
        </Pressable>
        <View className="mt-5 items-center">
          <Text className="text-sm font-semibold" style={{ color: '#1559C6' }}>Didn't receive email?</Text>
          {resendSeconds > 0 ? (
            <Text className="mt-2 text-sm" style={{ color: '#91A3BD' }}>Resend code in: {resendSeconds}s</Text>
          ) : (
            <Pressable onPress={resend} disabled={resending} className="mt-2 py-1">
              <Text className="text-sm font-semibold" style={{ color: '#1559C6' }}>{resending ? 'Sending code…' : 'Resend code'}</Text>
            </Pressable>
          )}
        </View>
        <Link href="/register" asChild><Pressable className="mt-2 items-center py-2"><Text className="text-sm" style={{ color: '#4e6b5a' }}>Use a different email</Text></Pressable></Link>
      </View>
    </View>
  );
}
