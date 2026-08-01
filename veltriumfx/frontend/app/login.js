import { useEffect, useState } from 'react';
import { Link, router } from 'expo-router';
import {
  Linking,
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
import Svg, { Path } from 'react-native-svg';
import { useAppTheme } from '../src/context/ThemeContext';
import { landingRouteFor } from '../src/utils/appHost';

const GoogleIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </Svg>
);

const FacebookIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="white">
    <Path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </Svg>
);

const XIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="white">
    <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </Svg>
);

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
        input[type="password"]::-webkit-contacts-auto-fill-button,
        input[type="password"]::-webkit-textfield-decoration-container {
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
                      style={{ color: colors.text }}
                      placeholder="At least 8 characters"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showNewPassword}
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
                      style={{ color: colors.text }}
                      placeholder="Confirm your password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showConfirmPassword}
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
    <ScrollView className="flex-1" style={{ backgroundColor: darkMode ? '#071B18' : '#EEF8F5' }}>
      <View className="relative min-h-full items-center justify-center overflow-hidden px-5 py-10">
        <View pointerEvents="none" className="absolute -right-24 -top-24 h-72 w-72 rounded-full" style={{ backgroundColor: darkMode ? 'rgba(21, 148, 125, 0.16)' : 'rgba(18, 139, 116, 0.11)' }} />
        <View pointerEvents="none" className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full" style={{ backgroundColor: darkMode ? 'rgba(44, 112, 94, 0.15)' : 'rgba(83, 170, 147, 0.12)' }} />
        <View 
          className="relative w-full max-w-md rounded-[30px] px-7 py-10" 
          style={{ 
            backgroundColor: darkMode ? '#0B2521' : 'rgba(255,255,255,0.96)', 
            borderColor: darkMode ? 'rgba(73, 181, 154, 0.34)' : 'rgba(15, 125, 103, 0.28)', 
            borderWidth: 1,
            shadowColor: darkMode ? '#000' : '#0B6B59',
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: darkMode ? 0.42 : 0.15,
            shadowRadius: 36,
            elevation: 24,
          }}
        >
        <View pointerEvents="none" className="absolute left-0 right-0 top-0 h-1.5" style={{ backgroundColor: '#128B74' }} />

        {/* Logo Badge */}
        <View className="absolute -top-7 left-0 right-0 z-10 items-center">
          <View className="rounded-[18px] px-5 py-2.5" style={{ backgroundColor: darkMode ? '#102F29' : '#FFFFFF', borderColor: darkMode ? '#2D6D5F' : '#B9DBD2', borderWidth: 1, shadowColor: '#075C4C', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
            <NovaLogo dark={darkMode} width={130} height={38} />
          </View>
        </View>

        {/* Header */}
        <View className="mt-6 mb-2 items-center">
          <View className="mb-3 rounded-full px-3 py-1.5" style={{ backgroundColor: darkMode ? 'rgba(30, 164, 137, 0.16)' : '#E1F3EE' }}>
            <Text className="text-[9px] font-bold uppercase tracking-[2px]" style={{ color: darkMode ? '#71D8C2' : '#08735F' }}>VeltriumFX Secure Portal</Text>
          </View>
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
                style={{ color: colors.text }}
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

            {/* Forgot Password Button */}
            <TouchableOpacity onPress={() => setView('forgot-email')}>
              <Text className="text-sm font-medium" style={{ color: linkColor }}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error ? (
            <Text className="mb-4 text-xs text-red-600">{error}</Text>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity
            onPress={submit}
            disabled={loading}
            className="w-full items-center rounded-xl py-3 shadow-md"
            style={{ opacity: loading ? 0.7 : 1, backgroundColor: '#087F6A', shadowColor: '#087F6A', shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
          >
            <Text className="text-sm font-semibold text-white">
              {loading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View className="my-6 flex-row items-center gap-3">
          <View className="h-px flex-1" style={{ backgroundColor: colors.border }} />
          <Text className="text-xs font-medium" style={labelStyle}>or</Text>
          <View className="h-px flex-1" style={{ backgroundColor: colors.border }} />
        </View>

        {/* Social Login Buttons */}
        <View className="flex-row justify-center gap-5">
          <TouchableOpacity
            onPress={() => Linking.openURL('https://google.com')}
            className="rounded-full border shadow-md items-center justify-center"
            style={{ height: 42, width: 42, backgroundColor: '#ffffff', borderColor: colors.border }}
          >
            <GoogleIcon />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://facebook.com')}
            className="rounded-full bg-[#1877F2] shadow-md items-center justify-center"
            style={{ height: 42, width: 42 }}
          >
            <FacebookIcon />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL('https://x.com')}
            className="rounded-full shadow-md items-center justify-center"
            style={{ height: 42, width: 42, backgroundColor: '#0B0B0B', borderColor: colors.border, borderWidth: 1 }}
          >
            <XIcon />
          </TouchableOpacity>
        </View>

        {/* Footer Links */}
        <Link href="/register" asChild>
          <Pressable className="mt-6">
            <Text className="text-center text-sm" style={labelStyle}>
              Don&apos;t have an account?{' '}
              <Text className="font-semibold" style={{ color: linkColor }}>Sign up</Text>
            </Text>
          </Pressable>
        </Link>

      </View>
      </View>

    </ScrollView>
  );
}
