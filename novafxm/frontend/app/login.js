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
import { isCrmHost, landingRouteFor } from '../src/utils/appHost';
import { storage } from '../src/utils/storage';

export default function LoginScreen() {
  const { login, user } = useAuth();

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
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #012b15 !important;
          caret-color: #012b15 !important;
          transition: background-color 9999s ease-out 0s;
        }
      `;
      document.head.appendChild(style);
      return () => { document.head.removeChild(style); };
    }
  }, []);

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
    backgroundColor: '#ffffff',
    borderColor: 'rgba(1, 69, 33, 0.15)',
    borderWidth: 1.5,
    color: '#012b15',
    caretColor: '#012b15',
    outlineStyle: 'none',
  };
  const labelStyle = { color: '#4e6b5a', fontSize: 11.5, fontWeight: '600', letterSpacing: 0.2 };
  const linkColor = '#026331';

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
              backgroundColor: currentStep >= step ? '#014421' : 'rgba(1, 69, 33, 0.08)',
              borderRadius: 4,
            }}
          />
        ))}
      </View>
    );
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(1, 69, 33, 0.08)',
    borderWidth: 1,
    borderRadius: 18,
    shadowColor: '#014521',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    paddingTop: 30,
    paddingHorizontal: 28,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 376,
  };

  const TopControls = () => (
    <View style={{ position: 'absolute', top: Platform.OS === 'web' ? 22 : 60, right: 24, zIndex: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderColor: 'rgba(1, 69, 33, 0.15)', borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, gap: 6 }}>
        <Text style={{ fontSize: 11.5, color: '#4e6b5a', fontWeight: '500' }}>EN</Text>
      </View>
    </View>
  );

  const PrimaryButton = ({ onPress, disabled, loading, title }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="w-full items-center py-[12.5px]"
      style={{
        borderRadius: 9,
        backgroundColor: '#d4af37',
        shadowColor: '#d4af37',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 18,
        elevation: 6,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Text style={{ color: '#231902', fontWeight: '700', fontSize: 14.5, letterSpacing: 0.1 }}>
        {loading ? 'Processing...' : title}
      </Text>
    </TouchableOpacity>
  );

  // ─── Forgot Password Views (inline, no modal) ───
  const isForgotView = view.startsWith('forgot-');

  if (isForgotView) {
    const forgotStepNum = view === 'forgot-email' ? 1 : view === 'forgot-code' ? 2 : view === 'forgot-newpass' ? 2 : 3;

    return (
      <View className="flex-1" style={{ backgroundColor: '#f0f5f2' }}>
        <TopControls />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
          <View style={cardStyle}>
            {/* Logo */}
            <View className="mb-8">
              <NovaLogo dark={false} width={110} height={32} />
            </View>

            {view === 'forgot-success' ? (
              /* ─── Success View ─── */
              <>
                <View className="items-center">
                  <View
                    className="mb-4 h-16 w-16 items-center justify-center rounded-full"
                    style={{ backgroundColor: '#f5f9f6' }}
                  >
                    <CheckCircle2 size={32} color="#026331" />
                  </View>
                  <Text className="text-center text-[22px] font-bold" style={{ color: '#012b15' }}>
                    Password Updated!
                  </Text>
                  <Text className="mt-2 text-center text-[13px]" style={{ color: '#4e6b5a' }}>
                    Your password has been reset successfully.{'\n'}You can now log in with your new password.
                  </Text>
                </View>

                <View className="mt-8">
                  <PrimaryButton onPress={resetForgotState} title="Back to Login" />
                </View>
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
                    style={{ backgroundColor: '#f5f9f6' }}
                  >
                    <Mail size={20} color="#026331" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[20px] font-bold" style={{ color: '#012b15' }}>
                      Forgot Password
                    </Text>
                    <Text className="text-[12px]" style={{ color: '#4e6b5a' }}>
                      Enter your email to receive a reset code
                    </Text>
                  </View>
                </View>

                <StepIndicator currentStep={1} />

                {/* Email Input */}
                <View className="mb-5">
                  <Text style={[labelStyle, { marginBottom: 6 }]}>Email Address</Text>
                  <TextInput
                    className="w-full rounded-[9px] px-[13px] py-[11px] text-[14px]"
                    style={inputStyle}
                    placeholder="you@example.com"
                    placeholderTextColor="#9ab5a5"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                  />
                </View>

                {forgotError ? (
                  <View className="mb-4 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                    <Text className="text-xs" style={{ color: '#EF4444' }}>{forgotError}</Text>
                  </View>
                ) : null}

                <PrimaryButton 
                  onPress={handleSendResetCode} 
                  disabled={forgotLoading} 
                  loading={forgotLoading} 
                  title="Send Reset Code" 
                />
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
                    style={{ backgroundColor: '#f5f9f6' }}
                  >
                    <ShieldCheck size={20} color="#026331" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[20px] font-bold" style={{ color: '#012b15' }}>
                      Verify Code
                    </Text>
                    <Text className="text-[12px]" style={{ color: '#4e6b5a' }}>
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
                  <Text style={[labelStyle, { marginBottom: 6 }]}>Verification Code</Text>
                  <TextInput
                    className="w-full rounded-[9px] px-[13px] py-[11px] text-center text-[20px] font-bold tracking-[8px]"
                    style={inputStyle}
                    placeholder="• • • • • •"
                    placeholderTextColor="#9ab5a5"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={forgotCode}
                    onChangeText={setForgotCode}
                  />
                </View>

                {forgotError ? (
                  <View className="mb-4 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                    <Text className="text-xs" style={{ color: '#EF4444' }}>{forgotError}</Text>
                  </View>
                ) : null}

                <PrimaryButton 
                  onPress={handleVerifyCode} 
                  disabled={forgotLoading} 
                  loading={forgotLoading} 
                  title="Verify Code" 
                />

                {/* Resend Code */}
                <TouchableOpacity
                  onPress={handleSendResetCode}
                  disabled={forgotLoading}
                  className="mt-4 items-center"
                >
                  <Text className="text-xs" style={{ color: '#4e6b5a' }}>
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
                    style={{ backgroundColor: '#f5f9f6' }}
                  >
                    <LockKeyhole size={20} color="#026331" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[20px] font-bold" style={{ color: '#012b15' }}>
                      New Password
                    </Text>
                    <Text className="text-[12px]" style={{ color: '#4e6b5a' }}>
                      Set a strong password for your account
                    </Text>
                  </View>
                </View>

                <StepIndicator currentStep={3} />

                {/* New Password */}
                <View className="mb-4">
                  <Text style={[labelStyle, { marginBottom: 6 }]}>New Password</Text>
                  <View className="flex-row items-center rounded-[9px]" style={{ backgroundColor: inputStyle.backgroundColor, borderColor: inputStyle.borderColor, borderWidth: 1.5 }}>
                    <TextInput
                      className="flex-1 px-[13px] py-[11px] text-[14px]"
                      style={{ color: '#012b15', ...(Platform.OS === 'web' && !showNewPassword ? { WebkitTextSecurity: 'disc' } : {}) }}
                      placeholder="At least 8 characters"
                      placeholderTextColor="#9ab5a5"
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
                        <Eye size={18} color="#849e8f" />
                      ) : (
                        <EyeOff size={18} color="#849e8f" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View className="mb-5">
                  <Text style={[labelStyle, { marginBottom: 6 }]}>Confirm Password</Text>
                  <View className="flex-row items-center rounded-[9px]" style={{ backgroundColor: inputStyle.backgroundColor, borderColor: inputStyle.borderColor, borderWidth: 1.5 }}>
                    <TextInput
                      className="flex-1 px-[13px] py-[11px] text-[14px]"
                      style={{ color: '#012b15', ...(Platform.OS === 'web' && !showConfirmPassword ? { WebkitTextSecurity: 'disc' } : {}) }}
                      placeholder="Confirm your password"
                      placeholderTextColor="#9ab5a5"
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
                        <Eye size={18} color="#849e8f" />
                      ) : (
                        <EyeOff size={18} color="#849e8f" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {forgotError ? (
                  <View className="mb-4 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                    <Text className="text-xs" style={{ color: '#EF4444' }}>{forgotError}</Text>
                  </View>
                ) : null}

                <PrimaryButton 
                  onPress={handleResetPassword} 
                  disabled={forgotLoading} 
                  loading={forgotLoading} 
                  title="Reset Password" 
                />
              </>
            ) : null}

          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Login View ───
  return (
    <View className="flex-1" style={{ backgroundColor: '#f0f5f2' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}>
        <View style={cardStyle}>

        {/* Logo */}
        <View className="mb-[32px]">
          <NovaLogo dark={false} width={110} height={32} />
        </View>

        <View>

          {/* Email Field */}
          <View className="mb-[12px]">
            <Text style={[labelStyle, { marginBottom: 6 }]}>Email address</Text>
            <View className="rounded-[9px]" style={{ backgroundColor: inputStyle.backgroundColor, borderColor: inputStyle.borderColor, borderWidth: 1.5 }}>
              <TextInput
                className="w-full px-[13px] py-[11px] text-[14px]"
                style={{ color: '#012b15' }}
                placeholder="you@example.com"
                placeholderTextColor="#9ab5a5"
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
          </View>

          {/* Password Field */}
          <View className="mb-[12px]">
            <Text style={[labelStyle, { marginBottom: 6 }]}>Password</Text>
            <View className="flex-row items-center rounded-[9px]" style={{ backgroundColor: inputStyle.backgroundColor, borderColor: inputStyle.borderColor, borderWidth: 1.5 }}>
              <TextInput
                className="flex-1 px-[13px] py-[11px] text-[14px]"
                style={{ color: '#012b15', ...(Platform.OS === 'web' && !showPassword ? { WebkitTextSecurity: 'disc' } : {}) }}
                placeholder="Enter your password"
                placeholderTextColor="#9ab5a5"
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
                className="px-[13px] py-[11px]"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <Eye size={19} color="#849e8f" />
                ) : (
                  <EyeOff size={19} color="#849e8f" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me & Forgot Password */}
          <View className="mb-[18px] flex-row items-center justify-between mt-[2px]">
            <TouchableOpacity
              onPress={() => setRememberMe((value) => !value)}
              className="flex-row items-center gap-2"
            >
              <View
                className="h-[15px] w-[15px] items-center justify-center rounded-[3px] border"
                style={{ borderColor: rememberMe ? linkColor : '#9ab5a5', backgroundColor: rememberMe ? linkColor : inputStyle.backgroundColor }}
              >
                {rememberMe ? (
                  <Text className="text-[10px] font-bold text-white">✓</Text>
                ) : null}
              </View>
              <Text className="text-[12.5px]" style={{ color: '#4e6b5a' }}>Remember me</Text>
            </TouchableOpacity>

            {/* Password recovery is available to client portal users only. */}
            {!isCrmHost() && (
              <TouchableOpacity onPress={() => setView('forgot-email')}>
                <Text className="text-[12.5px] font-semibold" style={{ color: linkColor, textDecorationLine: 'underline' }}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Error Message */}
          {error ? (
            <Text className="mb-[12px] text-xs text-red-600">{error}</Text>
          ) : null}

          {/* Login Button */}
          <PrimaryButton 
            onPress={submit} 
            disabled={loading} 
            loading={loading} 
            title="Login" 
          />
        </View>

        <Text className="mt-5 text-center text-[13px]" style={{ color: '#7C8074' }}>
          Don't have an account?{' '}
          {!isCrmHost() ? (
            <Link href="/register" asChild>
              <Text className="font-semibold" style={{ color: linkColor }}>Sign up</Text>
            </Link>
          ) : (
            <Text className="font-semibold" style={{ color: linkColor }}>Contact Admin</Text>
          )}
        </Text>

        </View>
      </ScrollView>
    </View>
  );
}
