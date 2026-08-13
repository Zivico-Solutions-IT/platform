import { useEffect, useState } from 'react';
import { Link, router } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Eye, EyeOff, ArrowLeft, Mail, ShieldCheck, LockKeyhole, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../src/hooks/useAuth';
import { authService } from '../src/services/authService';
import NovaLogo from '../src/components/brand/NovaLogo';
import { useAppTheme } from '../src/context/ThemeContext';
import { isCrmHost, landingRouteFor } from '../src/utils/appHost';
import { storage } from '../src/utils/storage';

export default function LoginScreen() {
  const { login, user } = useAuth();
  const { darkMode, colors } = useAppTheme();

  // View: 'login' | 'forgot-email' | 'forgot-code' | 'forgot-newpass' | 'forgot-success'
  const [view, setView] = useState('login');

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  useEffect(() => {
    if (!user) return;
    router.replace(landingRouteFor(user));
  }, [user]);

  useEffect(() => {
    let active = true;
    Promise.all([storage.get('rememberedEmail', ''), storage.get('rememberMe', false)])
      .then(([email, remembered]) => {
        if (!active || !remembered || !email) return;
        setForm((current) => ({ ...current, email: String(email) }));
        setRememberMe(true);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        input::-ms-reveal,
        input::-ms-clear {
          display: none !important;
          visibility: hidden !important;
        }
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none !important;
          visibility: hidden !important;
        }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-contacts-auto-fill-button {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px ${colors.surface} inset !important;
          -webkit-text-fill-color: ${colors.text} !important;
          caret-color: ${colors.text} !important;
          transition: background-color 9999s ease-out 0s;
        }
      `;
      document.head.appendChild(style);
      return () => { document.head.removeChild(style); };
    }
  }, [colors.surface, colors.text]);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await login(form);
      if (rememberMe) {
        await Promise.all([
          storage.set('rememberedEmail', form.email.trim().toLowerCase()),
          storage.set('rememberMe', true),
        ]);
      } else {
        await Promise.all([storage.remove('rememberedEmail'), storage.remove('rememberMe')]);
      }
      router.replace(landingRouteFor(user));
    } catch (requestError) {
      const requestUrl = `${requestError.config?.baseURL || ''}${requestError.config?.url || ''}`;
      const fallbackMessage = __DEV__ && requestUrl
        ? `Login failed: ${requestError.message} (${requestUrl})`
        : 'Login failed. Make sure the backend is running.';
      setError(
        requestError.response?.data?.message ||
          fallbackMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async () => {
    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) {
      setForgotError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      await authService.forgotPassword({ email: trimmedEmail });
      setView('forgot-code');
    } catch (err) {
      setForgotError(
        err.response?.data?.message || 'Failed to send reset code. Please try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = forgotCode.trim();
    if (!code) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (code.length < 6) {
      setForgotError('The verification code must be 6 digits.');
      return;
    }
    setForgotError('');
    setView('forgot-newpass');
  };

  const handleResetPassword = async () => {
    const code = forgotCode.trim();
    const password = newPassword;
    const confirm = confirmPassword;

    if (!password) {
      setForgotError('Please enter a new password.');
      return;
    }
    if (password.length < 8) {
      setForgotError('New password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    try {
      await authService.resetPassword({ resetToken: code, password });
      setView('forgot-success');
    } catch (err) {
      setForgotError(
        err.response?.data?.message || 'Password reset failed. Please check the code and try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotState = () => {
    setView('login');
    setForgotEmail('');
    setForgotCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setForgotError('');
    setForgotLoading(false);
  };

  const inputStyle = {
    backgroundColor: darkMode ? colors.surface : '#ffffff',
    borderColor: colors.border,
    color: colors.text,
    caretColor: colors.text,
    outlineStyle: 'none',
  };
  const labelStyle = { color: colors.muted };
  const linkColor = darkMode ? colors.primary : '#014421';

  // Step indicator dots for forgot password flow
  const StepIndicator = ({ currentStep }) => {
    const steps = [1, 2, 3];
    return (
      <View className="flex-row items-center justify-center gap-2 mb-6">
        {steps.map((step) => (
          <View
            key={step}
            className="rounded-full"
            style={{
              width: currentStep === step ? 24 : 8,
              height: 8,
              backgroundColor: currentStep >= step ? '#014421' : (darkMode ? colors.border : '#E5E7EB'),
              borderRadius: 4,
            }}
          />
        ))}
      </View>
    );
  };

  // ─── Forgot Password Views (inline, no modal) ───
  const isForgotView = view.startsWith('forgot-');

  if (isForgotView) {
    const forgotStepNum = view === 'forgot-email' ? 1 : view === 'forgot-code' ? 2 : view === 'forgot-newpass' ? 2 : 3;

    return (
      <ScrollView className="flex-1" style={{ backgroundColor: colors.background }}>
        <View className="min-h-full items-center justify-center px-5 py-10">
          <View
            className="relative w-full max-w-md rounded-[24px] px-7 py-10"
            style={{
              backgroundColor: colors.panel,
              borderColor: colors.border,
              borderWidth: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: darkMode ? 0.4 : 0.08,
              shadowRadius: 32,
              elevation: 24,
            }}
          >
            {/* Logo Badge */}
            <View className="absolute -top-7 left-0 right-0 z-10 items-center">
              <View className="rounded-2xl px-4 py-2" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
                <NovaLogo dark={darkMode} width={130} height={38} />
              </View>
            </View>

            {view === 'forgot-success' ? (
              /* ─── Success View ─── */
              <>
                <View className="mt-6 items-center">
                  <View
                    className="mb-4 h-16 w-16 items-center justify-center rounded-full"
                    style={{ backgroundColor: darkMode ? '#064E3B' : '#D1FAE5' }}
                  >
                    <CheckCircle2 size={32} color={darkMode ? '#34D399' : '#059669'} />
                  </View>
                  <Text className="text-center text-[22px] font-bold" style={{ color: colors.text }}>
                    Password Updated!
                  </Text>
                  <Text className="mt-2 text-center text-[13px]" style={labelStyle}>
                    Your password has been reset successfully.{'\n'}You can now log in with your new password.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={resetForgotState}
                  className="mt-8 w-full items-center rounded-xl bg-[#014421] py-3"
                >
                  <Text className="text-[14px] font-semibold text-white">Back to Login</Text>
                </TouchableOpacity>
              </>
            ) : view === 'forgot-email' ? (
              /* ─── Step 1: Enter Email ─── */
              <>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={resetForgotState}
                  className="mt-4 mb-2 flex-row items-center gap-1.5"
                >
                  <ArrowLeft size={16} color={linkColor} />
                  <Text className="text-sm font-medium" style={{ color: linkColor }}>Back to Login</Text>
                </TouchableOpacity>

                {/* Header */}
                <View className="mb-1 flex-row items-center gap-3">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: darkMode ? '#064E3B' : '#D1FAE5' }}
                  >
                    <Mail size={20} color={darkMode ? '#34D399' : '#059669'} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[20px] font-bold" style={{ color: colors.text }}>
                      Forgot Password
                    </Text>
                    <Text className="text-[12px]" style={labelStyle}>
                      Enter your email to receive a reset code
                    </Text>
                  </View>
                </View>

                <StepIndicator currentStep={1} />

                {/* Email Input */}
                <View className="mb-5">
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={labelStyle}>Email Address</Text>
                  <TextInput
                    className="w-full rounded-xl border px-4 py-3 text-[14px]"
                    style={inputStyle}
                    placeholder="example@gmail.com"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                  />
                </View>

                {forgotError ? (
                  <View className="mb-4 rounded-lg px-3 py-2" style={{ backgroundColor: darkMode ? '#451A1A' : '#FEF2F2' }}>
                    <Text className="text-xs" style={{ color: '#EF4444' }}>{forgotError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleSendResetCode}
                  disabled={forgotLoading}
                  className="w-full items-center rounded-xl bg-[#014421] py-3"
                  style={{ opacity: forgotLoading ? 0.7 : 1 }}
                >
                  <Text className="text-[14px] font-semibold text-white">
                    {forgotLoading ? 'Sending Code...' : 'Send Reset Code'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : view === 'forgot-code' ? (
              /* ─── Step 2: Enter Verification Code ─── */
              <>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => { setView('forgot-email'); setForgotError(''); }}
                  className="mt-4 mb-2 flex-row items-center gap-1.5"
                >
                  <ArrowLeft size={16} color={linkColor} />
                  <Text className="text-sm font-medium" style={{ color: linkColor }}>Change Email</Text>
                </TouchableOpacity>

                {/* Header */}
                <View className="mb-1 flex-row items-center gap-3">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: darkMode ? '#1E3A5F' : '#DBEAFE' }}
                  >
                    <ShieldCheck size={20} color={darkMode ? '#60A5FA' : '#2563EB'} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[20px] font-bold" style={{ color: colors.text }}>
                      Verify Code
                    </Text>
                    <Text className="text-[12px]" style={labelStyle}>
                      Enter the 6-digit code sent to
                    </Text>
                    <Text className="text-[12px] font-semibold" style={{ color: linkColor }}>
                      {forgotEmail}
                    </Text>
                  </View>
                </View>

                <StepIndicator currentStep={2} />

                {/* Code Input */}
                <View className="mb-5">
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={labelStyle}>Verification Code</Text>
                  <TextInput
                    className="w-full rounded-xl border px-4 py-3 text-center text-[20px] font-bold tracking-[8px]"
                    style={inputStyle}
                    placeholder="• • • • • •"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={forgotCode}
                    onChangeText={setForgotCode}
                  />
                </View>

                {forgotError ? (
                  <View className="mb-4 rounded-lg px-3 py-2" style={{ backgroundColor: darkMode ? '#451A1A' : '#FEF2F2' }}>
                    <Text className="text-xs" style={{ color: '#EF4444' }}>{forgotError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleVerifyCode}
                  disabled={forgotLoading}
                  className="w-full items-center rounded-xl bg-[#014421] py-3"
                  style={{ opacity: forgotLoading ? 0.7 : 1 }}
                >
                  <Text className="text-[14px] font-semibold text-white">
                    Verify Code
                  </Text>
                </TouchableOpacity>

                {/* Resend Code */}
                <TouchableOpacity
                  onPress={handleSendResetCode}
                  disabled={forgotLoading}
                  className="mt-4 items-center"
                >
                  <Text className="text-xs" style={labelStyle}>
                    Didn&apos;t receive the code?{' '}
                    <Text className="font-semibold" style={{ color: linkColor }}>Resend</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : view === 'forgot-newpass' ? (
              /* ─── Step 3: Set New Password ─── */
              <>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => { setView('forgot-code'); setForgotError(''); }}
                  className="mt-4 mb-2 flex-row items-center gap-1.5"
                >
                  <ArrowLeft size={16} color={linkColor} />
                  <Text className="text-sm font-medium" style={{ color: linkColor }}>Back</Text>
                </TouchableOpacity>

                {/* Header */}
                <View className="mb-1 flex-row items-center gap-3">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: darkMode ? '#3B1F64' : '#EDE9FE' }}
                  >
                    <LockKeyhole size={20} color={darkMode ? '#A78BFA' : '#7C3AED'} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[20px] font-bold" style={{ color: colors.text }}>
                      New Password
                    </Text>
                    <Text className="text-[12px]" style={labelStyle}>
                      Set a strong password for your account
                    </Text>
                  </View>
                </View>

                <StepIndicator currentStep={3} />

                {/* New Password */}
                <View className="mb-4">
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={labelStyle}>New Password</Text>
                  <View className="flex-row items-center rounded-xl border" style={{ backgroundColor: inputStyle.backgroundColor, borderColor: inputStyle.borderColor }}>
                    <TextInput
                      className="flex-1 px-4 py-3 text-[14px]"
                      style={{ color: colors.text, ...(Platform.OS === 'web' && !showNewPassword ? { WebkitTextSecurity: 'disc' } : {}) }}
                      placeholder="At least 8 characters"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={Platform.OS !== 'web' && !showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword((v) => !v)}
                      className="px-3 py-2"
                    >
                      {showNewPassword ? (
                        <Eye size={18} color={colors.muted} />
                      ) : (
                        <EyeOff size={18} color={colors.muted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View className="mb-5">
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={labelStyle}>Confirm Password</Text>
                  <View className="flex-row items-center rounded-xl border" style={{ backgroundColor: inputStyle.backgroundColor, borderColor: inputStyle.borderColor }}>
                    <TextInput
                      className="flex-1 px-4 py-3 text-[14px]"
                      style={{ color: colors.text, ...(Platform.OS === 'web' && !showConfirmPassword ? { WebkitTextSecurity: 'disc' } : {}) }}
                      placeholder="Confirm your password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={Platform.OS !== 'web' && !showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((v) => !v)}
                      className="px-3 py-2"
                    >
                      {showConfirmPassword ? (
                        <Eye size={18} color={colors.muted} />
                      ) : (
                        <EyeOff size={18} color={colors.muted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {forgotError ? (
                  <View className="mb-4 rounded-lg px-3 py-2" style={{ backgroundColor: darkMode ? '#451A1A' : '#FEF2F2' }}>
                    <Text className="text-xs" style={{ color: '#EF4444' }}>{forgotError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                  className="w-full items-center rounded-xl bg-[#014421] py-3"
                  style={{ opacity: forgotLoading ? 0.7 : 1 }}
                >
                  <Text className="text-[14px] font-semibold text-white">
                    {forgotLoading ? 'Resetting Password...' : 'Reset Password'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

          </View>
        </View>
      </ScrollView>
    );
  }

  // ─── Login View ───
  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="min-h-full items-center justify-center px-5 py-10">
        <View 
          className="relative w-full max-w-md rounded-[24px] px-7 py-10" 
          style={{ 
            backgroundColor: colors.panel, 
            borderColor: colors.border, 
            borderWidth: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: darkMode ? 0.4 : 0.08,
            shadowRadius: 32,
            elevation: 24,
          }}
        >

        {/* Logo Badge */}
        <View className="absolute -top-7 left-0 right-0 z-10 items-center">
          <View className="rounded-2xl px-4 py-2" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
            <NovaLogo dark={darkMode} width={130} height={38} />
          </View>
        </View>

        {/* Header */}
        <View className="mt-6 mb-2">
          <Text className="text-center text-[26px] font-bold" style={{ color: colors.text }}>
            Welcome Back
          </Text>
          <Text className="mt-2 text-center text-[13px] font-medium" style={labelStyle}>
            Login to continue to your account
          </Text>
        </View>

        <View className="mt-7">

          {/* Email Field */}
          <View className="mb-4">
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={labelStyle}>Email</Text>
            <TextInput
              className="w-full rounded-xl border px-4 py-3 text-[14px]"
              style={inputStyle}
              placeholder="example@gmail.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              importantForAutofill="yes"
              value={form.email}
              onChangeText={(email) => setForm((value) => ({ ...value, email }))}
            />
          </View>

          {/* Password Field */}
          <View className="mb-5">
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={labelStyle}>Password</Text>
            <View className="flex-row items-center rounded-xl border" style={{ backgroundColor: inputStyle.backgroundColor, borderColor: inputStyle.borderColor }}>
              <TextInput
                className="flex-1 px-4 py-3 text-[14px]"
                style={{ color: colors.text, ...(Platform.OS === 'web' && !showPassword ? { WebkitTextSecurity: 'disc' } : {}) }}
                placeholder="****"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                importantForAutofill="yes"
                value={form.password}
                onChangeText={(password) => setForm((value) => ({ ...value, password }))}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((value) => !value)}
                className="px-3 py-2"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <Eye size={18} color={colors.muted} />
                ) : (
                  <EyeOff size={18} color={colors.muted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me & Forgot Password */}
          <View className="mb-5 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => setRememberMe((value) => !value)}
              className="flex-row items-center gap-2"
            >
              <View
                className="h-4 w-4 items-center justify-center rounded border"
                style={{ borderColor: rememberMe ? linkColor : colors.border, backgroundColor: rememberMe ? linkColor : inputStyle.backgroundColor }}
              >
                {rememberMe ? (
                  <Text className="text-[10px] font-bold text-white">✓</Text>
                ) : null}
              </View>
              <Text className="text-sm" style={labelStyle}>Remember me</Text>
            </TouchableOpacity>

            {/* Password recovery is available to client portal users only. */}
            {!isCrmHost() && (
              <TouchableOpacity onPress={() => setView('forgot-email')}>
                <Text className="text-sm font-medium" style={{ color: linkColor }}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Error Message */}
          {error ? (
            <Text className="mb-4 text-xs text-red-600">{error}</Text>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity
            onPress={submit}
            disabled={loading}
            className="w-full items-center rounded-lg bg-[#014421] py-2.5 shadow-md"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            <Text className="text-sm font-semibold text-white">
              {loading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Client registration belongs to the trading portal, not the staff CRM. */}
        {!isCrmHost() && (
          <Link href="/register" asChild>
            <Pressable className="mt-6">
              <Text className="text-center text-sm" style={labelStyle}>
                Don&apos;t have an account?{' '}
                <Text className="font-semibold" style={{ color: linkColor }}>Sign up</Text>
              </Text>
            </Pressable>
          </Link>
        )}

      </View>
      </View>

    </ScrollView>
  );
}
