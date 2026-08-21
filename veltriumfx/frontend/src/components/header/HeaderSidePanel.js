import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  Camera,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  History,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  Plus,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  UploadCloud,
  UserRound,
  Wallet,
  X,
} from 'lucide-react-native';
import { Animated, Image, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import CustomButton from '../common/CustomButton';
import DepositForm from '../wallet/DepositForm';
import WithdrawForm from '../wallet/WithdrawForm';
import TransactionList from '../wallet/TransactionList';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { useWallet } from '../../hooks/useWallet';
import { dashboardService } from '../../services/dashboardService';
import { authService } from '../../services/authService';
import { money } from '../../utils/formatters';

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const panelTypeFrom = (type) => String(type || '').split(':')[0] || type;
const settingsSectionFrom = (type) => {
  const section = String(type || '').split(':')[1] || 'profile';
  return ['profile', 'security', 'payments', 'session'].includes(section) ? section : 'profile';
};

const normalizeBankAccount = (account) => ({
  id: account.id,
  bankAccountHolder: account.bankAccountHolder || account.accountHolderName || '',
  bankName: account.bankName || '',
  bankBranch: account.bankBranch || account.branchName || '',
  bankAccountNumber: account.bankAccountNumber || account.accountNumber || '',
  status: account.status || 'pending',
  payoutType: String(`${account.bankName || ''} ${account.branchName || account.bankBranch || ''}`).toLowerCase().includes('bep20') ? 'BEP20' : String(`${account.bankName || ''} ${account.branchName || account.bankBranch || ''}`).toLowerCase().includes('trc20') ? 'TRC20' : 'Bank',
});

const withdrawalDetailByType = (accounts, payoutType) => accounts.find((account) => account.payoutType === payoutType) || null;
const limitWithdrawalDetails = (accounts) => ['Bank', 'TRC20', 'BEP20']
  .map((payoutType) => withdrawalDetailByType(accounts, payoutType))
  .filter(Boolean);

const bankStatusText = (status) => {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'delete_pending') return 'Delete Pending';
  return 'Pending';
};
const canEditWithdrawalDetail = (account) => ['approved', 'rejected'].includes(account?.status);

function PanelHeader({ title, subtitle, icon: Icon, onClose, colors, onIconPress }) {
  const IconContainer = onIconPress ? Pressable : View;
  return (
    <View className="flex-row items-start justify-between border-b" style={{ borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 16 }}>
      <View className="flex-row items-center">
        <IconContainer onPress={onIconPress} className="h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: `${colors.primary}22` }}>
          <Icon size={22} color={colors.primary} />
        </IconContainer>
        <View className="ml-3">
          <Text className="text-2xl font-medium" style={{ color: colors.text }}>{title}</Text>
          {subtitle ? <Text className="mt-1 text-sm" style={{ color: colors.muted }}>{subtitle}</Text> : null}
        </View>
      </View>
      <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-md" style={{ backgroundColor: colors.surface }}>
        <X size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

function InfoCard({ label, value, colors }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  return (
    <View
      className={`${mobile ? 'min-w-[110px] p-2.5 rounded-lg' : 'min-w-[145px] p-4 rounded-lg'} flex-1 border`}
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <Text className={`${mobile ? 'text-[10px]' : 'text-xs'} font-medium uppercase`} style={{ color: colors.muted }} numberOfLines={1}>
        {label}
      </Text>
      <Text className={`${mobile ? 'mt-1 text-sm' : 'mt-2 text-lg'} font-medium`} style={{ color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function ReferralPanel({ dashboard, colors }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const referral = dashboard?.referral || {};
  const referrals = referral.referrals || [];
  const [copied, setCopied] = useState(false);
  const copyReferral = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && referral.url) {
      await navigator.clipboard.writeText(referral.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <View className={`${mobile ? 'gap-3 p-4' : 'gap-4 p-6'}`}>
      <View className={`${mobile ? 'p-4' : 'p-5'} rounded-lg border`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <Text className="text-xs font-medium uppercase" style={{ color: colors.primary }}>Referral Code</Text>
        <Text className={`${mobile ? 'text-2xl mt-1.5' : 'text-3xl mt-2'} font-medium`} style={{ color: colors.text }}>{referral.code || '-'}</Text>
        <TextInput
          editable={false}
          value={referral.url || ''}
          className="mt-4 rounded-md border p-3"
          style={{ backgroundColor: colors.panel, borderColor: colors.border, color: colors.text }}
        />
        <CustomButton title={copied ? 'Copied' : 'Copy Referral Link'} onPress={copyReferral} className="mt-4" />
      </View>
      <View className={`flex-row flex-wrap ${mobile ? 'gap-2.5' : 'gap-3'}`}>
        <InfoCard label="Referrals" value={String(referral.referralCount || referrals.length || 0)} colors={colors} />
        <InfoCard label="Commission" value={`${money(referral.commission || 0)} USD`} colors={colors} />
      </View>
      <View className={`${mobile ? 'p-3' : 'p-4'} rounded-lg border`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <Text className={`${mobile ? 'mb-2.5 text-base' : 'mb-3 text-lg'} font-medium`} style={{ color: colors.text }}>My Referrals</Text>
        {referrals.length ? referrals.map((item) => (
          <View key={item.id} className="mb-2 rounded-md border p-3" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
            <Text className="font-medium" style={{ color: colors.text }}>{item.name || 'Client'}</Text>
            <Text className="text-xs" style={{ color: colors.muted }}>{item.email || '-'}</Text>
          </View>
        )) : <Text style={{ color: colors.muted }}>No referrals yet.</Text>}
      </View>
    </View>
  );
}

function accountId(account) {
  return String(Number(account?.id || 0) + 2099).padStart(6, '0');
}

function AccountPanel({ dashboard, selectedAccount, summary, colors, onAccountsChanged, onSelectAccount }) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const [busyType, setBusyType] = useState('');
  const [message, setMessage] = useState('');
  const [confirmType, setConfirmType] = useState('');
  const accounts = dashboard?.accounts || [];
  const activeAccount = selectedAccount || accounts[0] || {
    id: user?.id,
    type: user?.accountType || 'Demo',
    name: user?.accountType === 'Live' ? 'Live account 1' : 'Demo account 1',
    balance: summary?.balance || user?.wallet?.balance || 0,
    currency: 'USD',
    status: user?.tradingStatus || 'active',
  };
  const demoCount = accounts.filter((account) => account.type === 'Demo').length;
  const liveCount = accounts.filter((account) => account.type === 'Live').length;
  const mobile = width < 640;
  const leverageText = (account) => {
    const value = account?.leverage || dashboard?.user?.leverage || user?.leverage || 500;
    return String(value).startsWith('1:') ? String(value) : `1:${value}`;
  };

  const createAccount = async (type) => {
    setBusyType(type);
    setMessage('');
    try {
      const result = await dashboardService.createAccount(type, true);
      const nextDashboard = await dashboardService.getDashboard();
      onAccountsChanged?.(nextDashboard.accounts || [], result.account);
      setMessage(`${result.account?.name || type} created successfully.`);
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || `${type} account could not be created.`);
    } finally {
      setBusyType('');
      setConfirmType('');
    }
  };

  return (
    <View className={`${mobile ? 'gap-4 p-4' : 'gap-5 p-6'}`}>
      <View className="gap-4 lg:flex-row">
        <View className={`${mobile ? 'p-4' : 'p-5'} lg:flex-1 rounded-lg border`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <Text className="text-xs font-medium uppercase" style={{ color: colors.muted }}>Selected Account</Text>
          <View className="mt-4 flex-row flex-wrap items-center justify-between gap-4">
            <View className="min-w-0 flex-1 flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: colors.primary }}>
                <Wallet size={25} color="#0B0B0B" />
              </View>
              <View className="ml-4 min-w-0 flex-1">
                <Text className={`${mobile ? 'text-lg' : 'text-xl'} font-medium`} numberOfLines={1} style={{ color: colors.text }}>{activeAccount.type || 'Demo'} Account</Text>
                <Text className="mt-1 text-sm" style={{ color: colors.muted }}>{activeAccount.name || 'Trading account'}</Text>
              </View>
            </View>
            <View className={mobile ? 'w-full items-start' : 'items-end'}>
              <Text className="text-xs" style={{ color: colors.muted }}>Balance</Text>
              <Text className={`${mobile ? 'text-xl' : 'text-2xl'} font-medium`} numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.text }}>{money(activeAccount.balance || 0)} {activeAccount.currency || 'USD'}</Text>
            </View>
          </View>
          <View className="mt-5 flex-row flex-wrap gap-3">
            <InfoCard label="Account ID" value={`#${accountId(activeAccount)}`} colors={colors} />
            <InfoCard label="Status" value={activeAccount.status || 'active'} colors={colors} />
            <InfoCard label="Leverage" value={leverageText(activeAccount)} colors={colors} />
          </View>
        </View>

        <View className={`${mobile ? 'p-4' : 'p-5'} lg:flex-1 rounded-lg border`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <Text className="text-xs font-medium uppercase" style={{ color: colors.muted }}>Create Trading Account</Text>
          <Text className="mt-2 text-sm" style={{ color: colors.muted }}>Create extra demo/live accounts from inside the account section.</Text>
          <View className={`${mobile ? 'flex-col' : 'flex-row'} mt-5 gap-3`}>
            <Pressable
              onPress={() => setConfirmType('Demo')}
              disabled={busyType === 'Demo' || demoCount >= 2}
              className="flex-1 flex-row items-center justify-center rounded-lg px-4 py-4"
              style={{ backgroundColor: demoCount >= 2 ? colors.panel : colors.primary, opacity: busyType === 'Demo' ? 0.7 : 1 }}
            >
              <Plus size={17} color={demoCount >= 2 ? colors.muted : '#0B0B0B'} />
              <Text className="ml-2 font-medium" style={{ color: demoCount >= 2 ? colors.muted : '#0B0B0B' }}>{busyType === 'Demo' ? 'Creating...' : 'New Demo'}</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmType('Live')}
              disabled={busyType === 'Live' || liveCount >= 5}
              className="flex-1 flex-row items-center justify-center rounded-lg border px-4 py-4"
              style={{ borderColor: colors.border, backgroundColor: colors.panel, opacity: busyType === 'Live' ? 0.7 : 1 }}
            >
              <Plus size={17} color={colors.primary} />
              <Text className="ml-2 font-medium" style={{ color: liveCount >= 5 ? colors.muted : colors.text }}>{busyType === 'Live' ? 'Creating...' : 'New Live'}</Text>
            </Pressable>
          </View>
          {confirmType ? (
            <View className="mt-5 rounded-lg border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.primary }}>
              <Text className="text-lg font-medium" style={{ color: colors.text }}>Create {confirmType} account?</Text>
              <Text className="mt-1 text-sm" style={{ color: colors.muted }}>
                This will add a new {confirmType.toLowerCase()} trading account to your profile.
              </Text>
              <View className="mt-4 flex-row gap-3">
                <Pressable onPress={() => setConfirmType('')} className="flex-1 rounded-lg border px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                  <Text className="text-center font-medium" style={{ color: colors.text }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => createAccount(confirmType)} disabled={Boolean(busyType)} className="flex-1 rounded-lg px-4 py-3" style={{ backgroundColor: colors.primary, opacity: busyType ? 0.7 : 1 }}>
                  <Text className="text-center font-medium text-medium">{busyType ? 'Creating...' : 'Confirm'}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View className={`${mobile ? 'p-4' : 'p-5'} rounded-lg border`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <Text className="text-xl font-medium" style={{ color: colors.text }}>All Trading Accounts</Text>
        <View className="mt-4 gap-3">
          {accounts.length ? accounts.map((account) => {
            const selected = String(account.id) === String(activeAccount.id);
            return (
              <Pressable
                key={account.id}
                onPress={() => onSelectAccount?.(account)}
                className="flex-row flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                style={{
                  backgroundColor: selected ? `${colors.primary}12` : colors.panel,
                  borderColor: selected ? colors.primary : colors.border,
                  cursor: 'pointer',
                }}
              >
                <View>
                  <Text className="font-medium" style={{ color: colors.text }}>{account.type} - {account.name}</Text>
                  <Text className="mt-1 text-xs" style={{ color: colors.muted }}>#{accountId(account)} | {account.status || 'active'} | {leverageText(account)}</Text>
                </View>
                <Text className="font-medium" style={{ color: colors.text }}>{money(account.balance || 0)} {account.currency || 'USD'}</Text>
              </Pressable>
            );
          }) : <Text style={{ color: colors.muted }}>No trading accounts found.</Text>}
        </View>
      </View>

      {message ? <Text className="rounded-lg border p-3 text-sm" style={{ borderColor: colors.border, color: colors.text }}>{message}</Text> : null}
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, editable = true, secureTextEntry = false, colors, compactMobile = false, noFlex = false }) {
  const [visible, setVisible] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 992;
  const compact = isMobile && compactMobile;

  return (
    <View className={compact || noFlex ? 'w-full' : 'flex-1'} style={{ marginBottom: compact ? 14 : isMobile ? 24 : 16 }}>
      <Text className="text-sm font-medium" style={{ color: colors.text, ...(compact ? { lineHeight: 17 } : {}) }}>{label}</Text>
      <View
        className="flex-row items-center rounded-lg border"
        style={{
          backgroundColor: colors.panel,
          borderColor: colors.border,
          marginTop: compact ? 6 : isMobile ? 12 : 8,
          ...(compact ? { minHeight: 42 } : {}),
          opacity: editable ? 1 : 0.7,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry && !visible}
          autoCapitalize={secureTextEntry ? 'none' : undefined}
          autoCorrect={secureTextEntry ? false : undefined}
          className="flex-1 px-4 py-3"
          style={{ color: colors.text, ...(compact ? { paddingVertical: 9 } : {}) }}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setVisible((current) => !current)} className="px-3 py-3" accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
            {visible ? <Eye size={18} color={colors.muted} /> : <EyeOff size={18} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function SettingsTab({ active, title, subtitle, icon: Icon, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center border-l-4 p-4"
      style={{
        backgroundColor: active ? `${colors.primary}18` : 'transparent',
        borderLeftColor: active ? colors.primary : 'transparent',
      }}
    >
      <View className="h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: active ? `${colors.primary}22` : colors.surface }}>
        <Icon size={20} color={active ? colors.primary : colors.muted} />
      </View>
      <View className="ml-3 min-w-0 flex-1">
        <Text className="font-medium" style={{ color: active ? colors.primary : colors.text }}>{title}</Text>
        <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: colors.muted }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function SettingsPanel({ colors, darkMode, toggleTheme, user, updateProfile, initialSection = 'profile', returnToWithdrawPayoutType, onReturnToWithdraw, showMenu, setShowMenu }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 992;
  const isMobileLayout = width < 760;
  const { logout, isAdmin } = useAuth();
  const profileImageInputRef = useRef(null);
  const returnedToWithdrawRef = useRef(false);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    country: user?.country || 'Sri Lanka',
    dateOfBirth: user?.dateOfBirth || '',
    profileImage: user?.profileImage || null,
  });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bank, setBank] = useState({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
  const [trc20, setTrc20] = useState({ walletHolderName: '', walletAddress: '' });
  const [bep20, setBep20] = useState({ walletHolderName: '', walletAddress: '' });
  const [editingBankAccountId, setEditingBankAccountId] = useState(null);
  const [editingPayoutType, setEditingPayoutType] = useState('Bank');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [resetForm, setResetForm] = useState({ resetToken: '', password: '' });
  const loadBankAccounts = async () => {
    const result = await authService.listBankAccounts();
    const accounts = limitWithdrawalDetails((result.accounts || []).map(normalizeBankAccount));
    setBankAccounts(accounts);
  };

  useEffect(() => {
    if (isAdmin) return;
    loadBankAccounts().catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    setProfile({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      country: user?.country || 'Sri Lanka',
      dateOfBirth: user?.dateOfBirth || '',
      profileImage: user?.profileImage || null,
    });
  }, [user]);

  useEffect(() => {
    const allowedSections = isAdmin ? ['profile', 'security', 'session'] : ['profile', 'security', 'payments', 'session'];
    setActiveSection(allowedSections.includes(initialSection) ? initialSection : 'profile');
  }, [initialSection, isAdmin]);

  useEffect(() => {
    if (isAdmin || activeSection !== 'payments') return undefined;
    const timer = setInterval(() => loadBankAccounts().catch(() => {}), 60000);
    return () => clearInterval(timer);
  }, [activeSection, isAdmin]);

  useEffect(() => {
    returnedToWithdrawRef.current = false;
  }, [returnToWithdrawPayoutType]);

  useEffect(() => {
    if (isAdmin || !returnToWithdrawPayoutType || activeSection !== 'payments' || returnedToWithdrawRef.current) return;
    const approvedDetail = withdrawalDetailByType(bankAccounts, returnToWithdrawPayoutType);
    if (approvedDetail?.status !== 'approved') return;
    returnedToWithdrawRef.current = true;
    onReturnToWithdraw?.();
  }, [activeSection, bankAccounts, isAdmin, onReturnToWithdraw, returnToWithdrawPayoutType]);

  const openProfileImagePicker = () => {
    if (Platform.OS === 'web') {
      profileImageInputRef.current?.click();
    }
  };

  const selectProfileImage = async (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    setMessage('');
    if (!file.type?.startsWith('image/')) {
      setMessage('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Profile photo must be 5MB or smaller.');
      return;
    }
    try {
      const profileImage = await readFileDataUrl(file);
      setProfile((current) => ({ ...current, profileImage }));
    } catch {
      setMessage('Profile photo could not be loaded.');
    }
  };

  const removeProfileImage = () => {
    setProfile((current) => ({ ...current, profileImage: null }));
  };

  const saveProfile = async () => {
    setBusy(true);
    setMessage('');
    try {
      await updateProfile({
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        country: profile.country.trim(),
        dateOfBirth: profile.dateOfBirth.trim(),
        profileImage: profile.profileImage,
      });
      setMessage('Profile updated successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Profile update failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveBank = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (!bank.bankAccountHolder.trim() || !bank.bankName.trim() || !bank.bankAccountNumber.trim()) {
        setMessage('Account holder, bank name and account number are required.');
        return;
      }
      const existing = editingPayoutType === 'Bank' && editingBankAccountId
        ? bankAccounts.find((item) => String(item.id) === String(editingBankAccountId))
        : withdrawalDetailByType(bankAccounts, 'Bank');
      if (existing?.id && !canEditWithdrawalDetail(existing)) {
        setMessage(`${existing.payoutType || 'Withdrawal'} details are waiting for admin approval. You can edit after approval.`);
        return;
      }
      const payload = {
        bankAccountHolder: bank.bankAccountHolder.trim(),
        bankName: bank.bankName.trim(),
        bankBranch: bank.bankBranch.trim(),
        bankAccountNumber: bank.bankAccountNumber.trim(),
      };
      if (existing?.id) await authService.updateBankAccount(existing.id, payload);
      else await authService.createBankAccount(payload);
      await loadBankAccounts();
      setBank({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
      setEditingBankAccountId(null);
      setEditingPayoutType('Bank');
      setMessage('Bank details submitted for admin approval.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Bank details save failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveTrc20 = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (!trc20.walletHolderName.trim() || !trc20.walletAddress.trim()) {
        setMessage('TRC20 wallet holder name and wallet address are required.');
        return;
      }
      const existing = editingPayoutType === 'TRC20' && editingBankAccountId
        ? bankAccounts.find((item) => String(item.id) === String(editingBankAccountId))
        : withdrawalDetailByType(bankAccounts, 'TRC20');
      if (existing?.id && !canEditWithdrawalDetail(existing)) {
        setMessage(`${existing.payoutType || 'TRC20'} details are waiting for admin approval. You can edit after approval.`);
        return;
      }
      const payload = {
        bankAccountHolder: trc20.walletHolderName.trim(),
        bankName: 'USDT TRC20',
        bankBranch: 'TRC20',
        bankAccountNumber: trc20.walletAddress.trim(),
      };
      if (existing?.id) await authService.updateBankAccount(existing.id, payload);
      else await authService.createBankAccount(payload);
      await loadBankAccounts();
      setTrc20({ walletHolderName: '', walletAddress: '' });
      setEditingBankAccountId(null);
      setEditingPayoutType('Bank');
      setMessage('TRC20 details submitted for admin approval.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'TRC20 details save failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveBep20 = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (!bep20.walletHolderName.trim() || !bep20.walletAddress.trim()) {
        setMessage('BEP20 wallet holder name and wallet address are required.');
        return;
      }
      const existing = editingPayoutType === 'BEP20' && editingBankAccountId
        ? bankAccounts.find((item) => String(item.id) === String(editingBankAccountId))
        : withdrawalDetailByType(bankAccounts, 'BEP20');
      if (existing?.id && !canEditWithdrawalDetail(existing)) {
        setMessage(`${existing.payoutType || 'BEP20'} details are waiting for admin approval. You can edit after approval.`);
        return;
      }
      const payload = {
        bankAccountHolder: bep20.walletHolderName.trim(),
        bankName: 'USDT BEP20',
        bankBranch: 'BEP20',
        bankAccountNumber: bep20.walletAddress.trim(),
      };
      if (existing?.id) await authService.updateBankAccount(existing.id, payload);
      else await authService.createBankAccount(payload);
      await loadBankAccounts();
      setBep20({ walletHolderName: '', walletAddress: '' });
      setEditingBankAccountId(null);
      setEditingPayoutType('Bank');
      setMessage('BEP20 details submitted for admin approval.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'BEP20 details save failed.');
    } finally {
      setBusy(false);
    }
  };

  const editBankAccount = (account) => {
    if (!canEditWithdrawalDetail(account)) {
      setMessage(`${account.payoutType} details are waiting for admin approval. You can edit after approval.`);
      return;
    }
    if (account.payoutType === 'TRC20') {
      setTrc20({
        walletHolderName: account.bankAccountHolder || '',
        walletAddress: account.bankAccountNumber || '',
      });
      setBank({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
      setBep20({ walletHolderName: '', walletAddress: '' });
      setEditingPayoutType('TRC20');
    } else if (account.payoutType === 'BEP20') {
      setBep20({
        walletHolderName: account.bankAccountHolder || '',
        walletAddress: account.bankAccountNumber || '',
      });
      setBank({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
      setTrc20({ walletHolderName: '', walletAddress: '' });
      setEditingPayoutType('BEP20');
    } else {
      setBank({
        bankAccountHolder: account.bankAccountHolder || '',
        bankName: account.bankName || '',
        bankBranch: account.bankBranch || '',
        bankAccountNumber: account.bankAccountNumber || '',
      });
      setTrc20({ walletHolderName: '', walletAddress: '' });
      setBep20({ walletHolderName: '', walletAddress: '' });
      setEditingPayoutType('Bank');
    }
    setEditingBankAccountId(account.id);
    setMessage(`Edit the details, then save ${account.payoutType} details.`);
  };

  const deleteBankAccount = async (account) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await authService.deleteBankAccount(account.id);
      setBankAccounts((current) => current.map((item) => (
        String(item.id) === String(account.id) ? { ...item, status: 'delete_pending' } : item
      )));
      if (String(editingBankAccountId) === String(account.id)) {
        setEditingBankAccountId(null);
        setEditingPayoutType('Bank');
        setBank({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
        setTrc20({ walletHolderName: '', walletAddress: '' });
        setBep20({ walletHolderName: '', walletAddress: '' });
      }
      setMessage(result.message || `${account.payoutType} details delete request submitted for admin approval.`);
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Withdrawal details delete failed.');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setBusy(true);
    setMessage('');
    try {
      await authService.changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password updated successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Password update failed.');
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    setBusy(true);
    setMessage('');
    try {
      await authService.forgotPassword({ email: profile.email || user?.email });
      setMessage('Password reset code sent to your email.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Reset code request failed.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setBusy(true);
    setMessage('');
    try {
      await authService.resetPassword(resetForm);
      setResetForm({ resetToken: '', password: '' });
      setMessage('Password reset successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Password reset failed.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  const tabs = [
    ['profile', 'Profile', 'Edit your profile details', UserRound],
    ['security', 'Security', 'Password and account access', LockKeyhole],
    ...(!isAdmin ? [['payments', 'Payments', 'Withdrawal methods', CreditCard]] : []),
    ['session', 'Session', 'Sign out and sessions', LogOut],
  ];

  const ContentWrapper = isMobile ? View : ScrollView;
  const contentWrapperProps = isMobile
    ? { className: 'p-4', style: { flex: 1 } }
    : { className: 'flex-1', contentContainerStyle: { padding: 24 } };
  const savedBankDetail = withdrawalDetailByType(bankAccounts, 'Bank');
  const savedTrc20Detail = withdrawalDetailByType(bankAccounts, 'TRC20');
  const savedBep20Detail = withdrawalDetailByType(bankAccounts, 'BEP20');
  const bankRejected = savedBankDetail?.status === 'rejected';
  const trc20Rejected = savedTrc20Detail?.status === 'rejected';
  const bep20Rejected = savedBep20Detail?.status === 'rejected';
  const showBankForm = !savedBankDetail || bankRejected || (editingPayoutType === 'Bank' && Boolean(editingBankAccountId));
  const showTrc20Form = !savedTrc20Detail || trc20Rejected || (editingPayoutType === 'TRC20' && Boolean(editingBankAccountId));
  const showBep20Form = !savedBep20Detail || bep20Rejected || (editingPayoutType === 'BEP20' && Boolean(editingBankAccountId));
  return (
    <View className="min-h-[620px] flex-row">
      {(!isMobile || showMenu) && (
        <View
          className="border-r"
          style={{
            width: isMobile ? 64 : 300,
            padding: isMobile ? 8 : 16,
            borderColor: colors.border,
            backgroundColor: colors.background,
            alignItems: isMobile ? 'center' : 'stretch',
          }}
        >
          {tabs.map(([key, title, subtitle, Icon]) => {
            const active = activeSection === key;
            if (isMobile) {
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    setActiveSection(key);
                  }}
                  className="mb-4 h-11 w-11 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? `${colors.primary}18` : colors.surface,
                  }}
                >
                  <Icon size={18} color={active ? colors.primary : colors.muted} />
                </Pressable>
              );
            }
            return (
              <SettingsTab
                key={key}
                active={active}
                title={title}
                subtitle={subtitle}
                icon={Icon}
                onPress={() => setActiveSection(key)}
                colors={colors}
              />
            );
          })}
        </View>
      )}

      <ContentWrapper {...contentWrapperProps}>
        {activeSection === 'profile' ? (
          <View className={`${isMobileLayout ? 'rounded-lg border p-3' : 'rounded-lg border p-5'}`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <View className={isMobileLayout ? "mb-3 flex-row items-center justify-between" : "mb-4 flex-row items-center justify-between"}>
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl font-medium" style={{ color: colors.text }}>Profile</Text>
                  {isMobileLayout ? (
                    <View className="rounded-lg px-2 py-0.5" style={{ backgroundColor: user?.verificationStatus === 'approved' ? `${colors.success}22` : `${colors.primary}22` }}>
                      <Text className="text-[10px] font-semibold" style={{ color: user?.verificationStatus === 'approved' ? colors.success : colors.primary }}>
                        {user?.verificationStatus === 'approved' ? 'Verified' : 'Not Verified'}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="mt-1 text-xs" style={{ color: colors.muted }}>Edit your profile details</Text>
              </View>
              {!isMobileLayout ? (
                <CustomButton title={busy ? 'Saving...' : 'Save Profile'} onPress={saveProfile} disabled={busy} className="min-w-[150px]" />
              ) : null}
            </View>
            <View className={isMobileLayout ? "gap-3" : "gap-4 lg:flex-row"}>
              <View className={`w-full items-center rounded-lg border lg:w-[250px] ${isMobileLayout ? 'p-3' : 'p-5'}`} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                <View className={isMobileLayout ? "h-20 w-20 overflow-hidden rounded-full border" : "h-28 w-28 overflow-hidden rounded-full border"} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  {profile.profileImage ? (
                    <Image source={{ uri: profile.profileImage }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Text className={isMobileLayout ? "text-2xl font-medium" : "text-3xl font-medium"} style={{ color: colors.primary }}>{String(profile.name || profile.email || 'NU').slice(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                {Platform.OS === 'web' ? (
                  <input ref={profileImageInputRef} accept="image/*" style={{ display: 'none' }} type="file" onChange={selectProfileImage} />
                ) : null}
                <Pressable onPress={openProfileImagePicker} className={isMobileLayout ? "-mt-7 ml-14 h-7 w-7 items-center justify-center rounded-full" : "-mt-8 ml-20 h-9 w-9 items-center justify-center rounded-full"} style={{ backgroundColor: colors.primary }}>
                  <Camera size={isMobileLayout ? 12 : 16} color="#0B0B0B" />
                </Pressable>
                <View className="mt-3 flex-row flex-wrap justify-center gap-1.5">
                  <Pressable onPress={openProfileImagePicker} className="rounded-lg border px-2.5 py-1.5" style={{ borderColor: colors.primary }}>
                    <Text className="font-medium" style={{ fontSize: isMobileLayout ? 11 : 12, color: colors.primary }}>{profile.profileImage ? 'Change Photo' : 'Add Photo'}</Text>
                  </Pressable>
                  {profile.profileImage ? (
                    <Pressable onPress={removeProfileImage} className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: `${colors.danger}18` }}>
                      <Text className="font-medium" style={{ fontSize: isMobileLayout ? 11 : 12, color: colors.danger }}>Remove Photo</Text>
                    </Pressable>
                  ) : null}
                </View>
                {!isMobileLayout ? (
                  <>
                    <Text className="mt-3 text-lg font-medium" style={{ color: colors.text }}>{profile.name || 'VeltriumFX Client'}</Text>
                    <Text className="mt-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium" style={{ backgroundColor: user?.verificationStatus === 'approved' ? `${colors.success}22` : `${colors.primary}22`, color: user?.verificationStatus === 'approved' ? colors.success : colors.primary }}>
                      {user?.verificationStatus === 'approved' ? 'Verified' : 'Not Verified'}
                    </Text>
                  </>
                ) : null}
              </View>
              <View className="flex-1">
                <View className={isMobileLayout ? "gap-2" : "gap-4 lg:flex-row"}>
                  <Field label="Full Name" value={profile.name} onChangeText={(name) => setProfile((current) => ({ ...current, name }))} placeholder="Your full name" colors={colors} compactMobile />
                  <Field label="Email Address" value={profile.email} editable={false} placeholder="email@example.com" colors={colors} compactMobile />
                </View>
                <View className={isMobileLayout ? "gap-2" : "gap-4 lg:flex-row"}>
                  <Field label="Country" value={profile.country} onChangeText={(country) => setProfile((current) => ({ ...current, country }))} placeholder="Sri Lanka" colors={colors} compactMobile />
                  <Field label="Phone Number" value={profile.phone} onChangeText={(phone) => setProfile((current) => ({ ...current, phone }))} placeholder="+94 77 123 4567" colors={colors} compactMobile />
                </View>
                <Field label="Date of Birth" value={profile.dateOfBirth} onChangeText={(dateOfBirth) => setProfile((current) => ({ ...current, dateOfBirth }))} placeholder="DD / MM / YYYY" colors={colors} compactMobile />
                {isMobileLayout ? (
                  <CustomButton title={busy ? 'Saving...' : 'Save Profile'} onPress={saveProfile} disabled={busy} className="mt-3 self-center px-6" compact={isMobileLayout} />
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {activeSection === 'security' ? (
          <View className={isMobileLayout ? "gap-3" : "gap-4"}>
            <View className={isMobileLayout ? "rounded-lg border p-3" : "rounded-lg border p-5"} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Text className={isMobileLayout ? "text-xl font-medium" : "text-2xl font-medium"} style={{ color: colors.text }}>Security</Text>
              <Text className="mt-1 text-xs" style={{ color: colors.muted }}>Change your password and recover account access.</Text>
              <View className={isMobileLayout ? "mt-3 gap-2" : "mt-5 gap-4 lg:flex-row"}>
                <Field label="Current Password" value={passwordForm.currentPassword} onChangeText={(currentPassword) => setPasswordForm((current) => ({ ...current, currentPassword }))} placeholder="Current password" secureTextEntry colors={colors} compactMobile />
                <Field label="New Password" value={passwordForm.newPassword} onChangeText={(newPassword) => setPasswordForm((current) => ({ ...current, newPassword }))} placeholder="Minimum 8 characters" secureTextEntry colors={colors} compactMobile />
                <Field label="Confirm Password" value={passwordForm.confirmPassword} onChangeText={(confirmPassword) => setPasswordForm((current) => ({ ...current, confirmPassword }))} placeholder="Confirm new password" secureTextEntry colors={colors} compactMobile />
              </View>
              <CustomButton title={busy ? 'Saving...' : 'Change Password'} onPress={changePassword} disabled={busy} className={isMobileLayout ? "mt-1 self-center px-6" : "mt-2 max-w-[220px]"} compact={isMobileLayout} />
            </View>
            <View className={isMobileLayout ? "rounded-lg border p-3" : "rounded-lg border p-5"} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Text className="text-lg font-medium" style={{ color: colors.text }}>Password Reset</Text>
              <Text className="mt-1 text-xs" style={{ color: colors.muted }}>Send a reset code to your email, then set a new password.</Text>
              <View className={isMobileLayout ? "mt-3 flex-row justify-center" : "mt-3 flex-row flex-wrap gap-2"}>
                <CustomButton title={busy ? 'Sending...' : 'Send Reset Code'} onPress={requestPasswordReset} disabled={busy} className={isMobileLayout ? "self-center px-6" : "min-w-[190px]"} compact={isMobileLayout} />
              </View>
              <View className={isMobileLayout ? "mt-3 gap-2" : "mt-4 gap-4 lg:flex-row"}>
                <Field label="Reset Code" value={resetForm.resetToken} onChangeText={(resetToken) => setResetForm((current) => ({ ...current, resetToken }))} placeholder="Code from email" colors={colors} compactMobile />
                <Field label="New Password" value={resetForm.password} onChangeText={(password) => setResetForm((current) => ({ ...current, password }))} placeholder="Minimum 8 characters" secureTextEntry colors={colors} compactMobile />
              </View>
              <CustomButton title={busy ? 'Updating...' : 'Reset Password'} onPress={resetPassword} disabled={busy} className={isMobileLayout ? "mt-1 self-center px-6" : "max-w-[190px]"} compact={isMobileLayout} />
            </View>
          </View>
        ) : null}

        {!isAdmin && activeSection === 'payments' ? (
          <View className={`${isMobile ? 'p-3' : 'p-5'} rounded-lg border`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Text className="text-2xl font-medium" style={{ color: colors.text }}>Payments</Text>
            <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Save bank, USDT TRC20, and USDT BEP20 withdrawal details.</Text>
            <View className={`${isMobile ? 'mt-3 gap-3' : 'mt-5 gap-4'} lg:flex-row flex-wrap`}>
              {showBankForm ? (
                <View className={`${isMobile ? 'w-full p-3' : 'flex-1 min-w-[300px] p-4'} rounded-lg border`} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                  <Text className={`${isMobile ? 'mb-2' : 'mb-3'} text-lg font-medium`} style={{ color: colors.text }}>{bankRejected ? 'Add Bank Account Again' : savedBankDetail ? 'Edit Bank Account' : 'Bank Account'}</Text>
                  {bankRejected ? (
                    <Text className="mb-3 rounded-lg border p-3 text-sm" style={{ backgroundColor: `${colors.danger}12`, borderColor: colors.danger, color: colors.danger }}>
                      Bank details were rejected. Add the correct details again.
                    </Text>
                  ) : null}
                  <Field label="Account Holder" value={bank.bankAccountHolder} onChangeText={(bankAccountHolder) => setBank((current) => ({ ...current, bankAccountHolder }))} placeholder="Name on bank account" colors={colors} compactMobile noFlex />
                  <Field label="Bank Name" value={bank.bankName} onChangeText={(bankName) => setBank((current) => ({ ...current, bankName }))} placeholder="Bank name" colors={colors} compactMobile noFlex />
                  <Field label="Branch" value={bank.bankBranch} onChangeText={(bankBranch) => setBank((current) => ({ ...current, bankBranch }))} placeholder="Branch name" colors={colors} compactMobile noFlex />
                  <Field label="Account Number" value={bank.bankAccountNumber} onChangeText={(bankAccountNumber) => setBank((current) => ({ ...current, bankAccountNumber }))} placeholder="Account number" colors={colors} compactMobile noFlex />
                  <View className="w-full mt-auto" style={{ paddingTop: isMobile ? 12 : 24 }}>
                    <CustomButton title={busy ? 'Saving...' : bankRejected ? 'Resubmit Bank Details' : savedBankDetail ? 'Update Bank Details' : 'Save Bank Details'} onPress={saveBank} disabled={busy} className={isMobileLayout ? "self-center px-6" : "w-full"} compact={isMobileLayout} />
                  </View>
                </View>
              ) : null}
              {showTrc20Form ? (
                <View className={`${isMobile ? 'w-full p-3' : 'flex-1 min-w-[300px] p-4'} rounded-lg border`} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                  <Text className={`${isMobile ? 'mb-2' : 'mb-3'} text-lg font-medium`} style={{ color: colors.text }}>{trc20Rejected ? 'Add USDT TRC20 Again' : savedTrc20Detail ? 'Edit USDT TRC20' : 'USDT TRC20'}</Text>
                  {trc20Rejected ? (
                    <Text className="mb-3 rounded-lg border p-3 text-sm" style={{ backgroundColor: `${colors.danger}12`, borderColor: colors.danger, color: colors.danger }}>
                      TRC20 details were rejected. Add the correct details again.
                    </Text>
                  ) : null}
                  <Field label="Wallet Holder" value={trc20.walletHolderName} onChangeText={(walletHolderName) => setTrc20((current) => ({ ...current, walletHolderName }))} placeholder="Wallet holder name" colors={colors} compactMobile noFlex />
                  <Field label="Wallet Address" value={trc20.walletAddress} onChangeText={(walletAddress) => setTrc20((current) => ({ ...current, walletAddress }))} placeholder="TRC20 wallet address" colors={colors} compactMobile noFlex />
                  <View className="w-full mt-auto" style={{ paddingTop: isMobile ? 12 : 24 }}>
                    <CustomButton title={busy ? 'Saving...' : trc20Rejected ? 'Resubmit TRC20 Details' : savedTrc20Detail ? 'Update TRC20 Details' : 'Save TRC20 Details'} onPress={saveTrc20} disabled={busy} className={isMobileLayout ? "self-center px-6" : "w-full"} compact={isMobileLayout} />
                  </View>
                </View>
              ) : null}
              {showBep20Form ? (
                <View className={`${isMobile ? 'w-full p-3' : 'flex-1 min-w-[300px] p-4'} rounded-lg border`} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                  <Text className={`${isMobile ? 'mb-2' : 'mb-3'} text-lg font-medium`} style={{ color: colors.text }}>{bep20Rejected ? 'Add USDT BEP20 Again' : savedBep20Detail ? 'Edit USDT BEP20' : 'USDT BEP20'}</Text>
                  {bep20Rejected ? (
                    <Text className="mb-3 rounded-lg border p-3 text-sm" style={{ backgroundColor: `${colors.danger}12`, borderColor: colors.danger, color: colors.danger }}>
                      BEP20 details were rejected. Add the correct details again.
                    </Text>
                  ) : null}
                  <Field label="Wallet Holder" value={bep20.walletHolderName} onChangeText={(walletHolderName) => setBep20((current) => ({ ...current, walletHolderName }))} placeholder="Wallet holder name" colors={colors} compactMobile noFlex />
                  <Field label="Wallet Address" value={bep20.walletAddress} onChangeText={(walletAddress) => setBep20((current) => ({ ...current, walletAddress }))} placeholder="BEP20 wallet address" colors={colors} compactMobile noFlex />
                  <View className="w-full mt-auto" style={{ paddingTop: isMobile ? 12 : 24 }}>
                    <CustomButton title={busy ? 'Saving...' : bep20Rejected ? 'Resubmit BEP20 Details' : savedBep20Detail ? 'Update BEP20 Details' : 'Save BEP20 Details'} onPress={saveBep20} disabled={busy} className={isMobileLayout ? "self-center px-6" : "w-full"} compact={isMobileLayout} />
                  </View>
                </View>
              ) : null}
              {!showBankForm && !showTrc20Form && !showBep20Form ? (
                <View className="flex-1 rounded-lg border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                  <Text className="font-medium" style={{ color: colors.text }}>Withdrawal detail limit reached.</Text>
                  <Text className="mt-2 text-sm" style={{ color: colors.muted }}>You can save one bank account, one USDT TRC20 wallet, and one USDT BEP20 wallet. Use Edit below to change them.</Text>
                </View>
              ) : null}
            </View>
            <View className={`${isMobile ? 'mt-3 p-3' : 'mt-5 p-4'} rounded-lg border`} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
              <Text className="mb-3 text-lg font-medium" style={{ color: colors.text }}>Saved Withdrawal Details</Text>
              {bankAccounts.length ? bankAccounts.map((account) => (
                <View key={account.id} className="mb-3 rounded-md border p-3" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                  <View className="flex-row flex-wrap items-center justify-between gap-3">
                    <View>
                      <Text className="font-medium" style={{ color: colors.text }}>{account.payoutType} Details</Text>
                      <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{['TRC20', 'BEP20'].includes(account.payoutType) ? account.bankAccountNumber : `${account.bankName} | ${account.bankAccountNumber}`}</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: account.status === 'approved' ? `${colors.success}22` : account.status === 'rejected' ? `${colors.danger}22` : `${colors.primary}22`, color: account.status === 'approved' ? colors.success : account.status === 'rejected' ? colors.danger : colors.primary }}>{bankStatusText(account.status)}</Text>
                      <Pressable disabled={busy || !canEditWithdrawalDetail(account)} onPress={() => editBankAccount(account)} className="h-9 w-9 items-center justify-center rounded-md border" style={{ borderColor: colors.primary, opacity: busy || !canEditWithdrawalDetail(account) ? 0.45 : 1 }}>
                        <Edit3 size={15} color={colors.primary} />
                      </Pressable>
                      <Pressable disabled={busy || account.status === 'delete_pending'} onPress={() => deleteBankAccount(account)} className="h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: `${colors.danger}18`, opacity: busy || account.status === 'delete_pending' ? 0.45 : 1 }}>
                        <Trash2 size={15} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                  <View className="mt-3 gap-2">
                    <Text className="text-xs" style={{ color: colors.muted }}>{['TRC20', 'BEP20'].includes(account.payoutType) ? 'Wallet holder' : 'Account holder'}: {account.bankAccountHolder || '-'}</Text>
                    <Text className="text-xs" style={{ color: colors.muted }}>{['TRC20', 'BEP20'].includes(account.payoutType) ? 'Network' : 'Branch'}: {['TRC20', 'BEP20'].includes(account.payoutType) ? `USDT ${account.payoutType}` : account.bankBranch || '-'}</Text>
                  </View>
                </View>
              )) : <Text style={{ color: colors.muted }}>No payment methods saved yet.</Text>}
            </View>
          </View>
        ) : null}

        {activeSection === 'session' ? (
          <View className="rounded-lg border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Text className="text-2xl font-medium" style={{ color: colors.text }}>Session</Text>
            <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Manage your theme and account session.</Text>
            <Pressable onPress={toggleTheme} className="mt-5 flex-row items-center justify-between rounded-lg border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
              <View className="flex-row items-center">
                {darkMode ? <Moon size={20} color={colors.primary} /> : <Sun size={20} color={colors.primary} />}
                <View className="ml-3">
                  <Text className="font-medium" style={{ color: colors.text }}>Mode</Text>
                  <Text className="text-xs" style={{ color: colors.muted }}>{darkMode ? 'Dark mode enabled' : 'Light mode enabled'}</Text>
                </View>
              </View>
              <Text className="font-medium" style={{ color: colors.primary }}>Change</Text>
            </Pressable>
            <View className="mt-4 rounded-lg border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
              <Text className="font-medium" style={{ color: colors.text }}>{profile.email || user?.email || 'Signed in user'}</Text>
              <Text className="mt-1 text-xs" style={{ color: colors.muted }}>End this account session safely.</Text>
              <CustomButton title="Sign Out" variant="secondary" onPress={signOut} className="mt-4 max-w-[160px]" compact={isMobileLayout} />
            </View>
          </View>
        ) : null}

        {message ? <Text className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: colors.border, color: colors.text }}>{message}</Text> : null}
      </ContentWrapper>
    </View>
  );
}

function VerificationStepCard({ title, description, badge, active, complete, locked, icon: Icon, colors }) {
  const borderColor = complete ? colors.success : active ? colors.primary : locked ? colors.muted : colors.border;
  const backgroundColor = complete ? `${colors.success}14` : active ? `${colors.primary}12` : colors.panel;

  return (
    <View className="mb-3 rounded-lg border p-5" style={{ backgroundColor, borderColor }}>
      <View className="flex-row items-start justify-between">
        <View className="h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: complete ? `${colors.success}22` : active ? `${colors.primary}22` : colors.surface }}>
          <Icon size={22} color={complete ? colors.success : active ? colors.primary : colors.text} />
        </View>
        <Text className="rounded-full px-3 py-1 text-[10px] font-medium uppercase" style={{ backgroundColor: active ? colors.primary : colors.surface, color: active ? '#0B0B0B' : colors.muted }}>
          {badge}
        </Text>
      </View>
      <Text className="mt-4 text-lg font-medium" style={{ color: colors.text }}>{title}</Text>
      <Text className="mt-2 text-sm" style={{ color: colors.muted }}>{description}</Text>
    </View>
  );
}

function VerificationPanel({ user, colors, submitVerification, refreshUser }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const approved = user?.verificationStatus === 'approved';
  const pending = user?.verificationStatus === 'pending';
  const rejected = user?.verificationStatus === 'rejected';
  const idInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const [files, setFiles] = useState({ idProof: null, addressProof: null });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const selectFile = (key) => (event) => {
    setFiles((current) => ({ ...current, [key]: event.target.files?.[0] || null }));
    setMessage('');
  };

  const upload = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (!files.idProof || !files.addressProof) throw new Error('Please select both ID proof and address proof.');
      const [idProofImage, addressProofImage] = await Promise.all([
        readFileDataUrl(files.idProof),
        readFileDataUrl(files.addressProof),
      ]);
      await submitVerification({ idProofImage, addressProofImage });
      await refreshUser?.();
      setFiles({ idProof: null, addressProof: null });
      setMessage('Verification documents submitted. Waiting for admin review.');
    } catch (error) {
      setMessage(error.message || 'Verification upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="p-6">
      <View className="rounded-lg border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <View className="mb-6 flex-row flex-wrap items-center justify-between gap-3">
          <View className="flex-1 min-w-[240px]">
            <Text className="text-sm font-medium" style={{ color: colors.text }}>Verification Status</Text>
            <Text className="text-2xl font-medium" style={{ color: colors.text }}>Unlock full account access</Text>
            <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Upload your documents to enable withdrawals and full account features.</Text>
          </View>
          <Text className="rounded-full border px-4 py-2 text-sm font-medium" style={{ borderColor: approved ? colors.success : colors.primary, color: approved ? colors.success : colors.primary }}>
            {approved ? 'KYC Approved' : pending ? 'Under Review' : rejected ? 'Try Again' : 'KYC Required'}
          </Text>
        </View>
        {approved ? (
          <View className="rounded-lg border p-5" style={{ backgroundColor: `${colors.success}14`, borderColor: colors.success }}>
            <Text className="text-lg font-medium" style={{ color: colors.success }}>Your verification is approved.</Text>
            <Text className="mt-2 text-sm" style={{ color: colors.muted }}>Full account funding, withdrawals, and trading features are unlocked.</Text>
          </View>
        ) : null}
        {pending ? (
          <View className="rounded-lg border p-5" style={{ backgroundColor: `${colors.primary}12`, borderColor: colors.primary }}>
            <Text className="text-lg font-medium" style={{ color: colors.primary }}>Verification submitted.</Text>
            <Text className="mt-2 text-sm" style={{ color: colors.muted }}>Your documents are waiting for admin review. We will show the result here after approval or rejection.</Text>
          </View>
        ) : null}
        {approved || pending ? null : (
        <View className="gap-5 lg:flex-row">
          <View className={mobile ? "" : "flex-[1.4]"}>
            <VerificationStepCard
              title={rejected ? 'Rejected' : 'Unverified'}
              description={rejected ? 'Your verification was rejected. Upload clear documents again.' : 'Upload your ID proof and address proof.'}
              badge="You are here"
              active
              complete={false}
              icon={CheckCircle2}
              colors={colors}
            />
            <VerificationStepCard
              title="Admin Review"
              description="Admin will review your documents and unlock full account access."
              badge="Up next"
              active={false}
              complete={false}
              icon={UploadCloud}
              colors={colors}
            />
          </View>

          <View className={mobile ? "rounded-lg border p-5" : "flex-1 rounded-lg border p-5"} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
            <View className="h-14 w-14 items-center justify-center rounded-lg" style={{ backgroundColor: `${colors.success}20` }}>
              <FileText size={25} color={colors.primary} />
            </View>
            <Text className="mt-5 text-xl font-medium" style={{ color: colors.text }}>Document Requirements</Text>
            <Text className="mt-2 text-sm" style={{ color: colors.muted }}>Both files are required before submission.</Text>
            {rejected ? (
              <View className="mt-4 rounded-lg border p-3" style={{ backgroundColor: `${colors.danger}12`, borderColor: colors.danger }}>
                <Text className="font-medium" style={{ color: colors.danger }}>Verification rejected.</Text>
                <Text className="mt-1 text-xs" style={{ color: colors.muted }}>Please upload clear ID proof and address proof again.</Text>
              </View>
            ) : null}
            {Platform.OS === 'web' ? (
              <>
                <input ref={idInputRef} accept="image/*" style={{ display: 'none' }} type="file" onChange={selectFile('idProof')} />
                <input ref={addressInputRef} accept="image/*" style={{ display: 'none' }} type="file" onChange={selectFile('addressProof')} />
              </>
            ) : null}
            <Pressable onPress={() => idInputRef.current?.click()} className="mt-6 flex-row items-center rounded-lg border p-4" style={{ borderColor: colors.success, backgroundColor: colors.surface, minHeight: 82 }}>
              <View className="h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${colors.success}18` }}>
                <FileText size={18} color={colors.success} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-medium" style={{ color: colors.text }}>ID Proof</Text>
                {files.idProof?.name ? <Text className="text-xs" style={{ color: colors.muted }}>{files.idProof.name}</Text> : null}
              </View>
            </Pressable>
            <Pressable onPress={() => addressInputRef.current?.click()} className="mt-3 flex-row items-center rounded-lg border p-4" style={{ borderColor: colors.success, backgroundColor: colors.surface, minHeight: 82 }}>
              <View className="h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${colors.success}18` }}>
                <FileText size={18} color={colors.success} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-medium" style={{ color: colors.text }}>Address Proof</Text>
                {files.addressProof?.name ? <Text className="text-xs" style={{ color: colors.muted }}>{files.addressProof.name}</Text> : null}
              </View>
            </Pressable>
            <CustomButton title={busy ? 'Submitting...' : 'Submit Verification'} onPress={upload} disabled={busy || approved || user?.verificationStatus === 'pending'} className="mt-5" />
            {message ? <Text className="mt-3 text-sm" style={{ color: colors.text }}>{message}</Text> : null}
          </View>
        </View>
        )}
      </View>
    </View>
  );
}

export default function HeaderSidePanel({ type, selectedAccount, summary, onClose, onAccountsChanged, onSelectAccount }) {
  const { user, updateProfile, submitVerification, refreshUser } = useAuth();
  const { colors, darkMode, toggleTheme } = useAppTheme();
  const { deposit, withdraw, loading: walletLoading } = useWallet();
  const { width, height } = useWindowDimensions();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activePanelType, setActivePanelType] = useState(panelTypeFrom(type));
  const [settingsInitialSection, setSettingsInitialSection] = useState(settingsSectionFrom(type));
  const [settingsReturnPayoutType, setSettingsReturnPayoutType] = useState(null);
  const [depositAccountId, setDepositAccountId] = useState('');
  const [withdrawAccountId, setWithdrawAccountId] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(true);
  const slideAnim = useRef(new Animated.Value(-34)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const isMobileLayout = width < 760;
  const isMobile = width < 992;
  const panelWidth = isMobileLayout ? width : Math.min(1180, Math.max(300, width * 0.96));
  const panelHeight = isMobileLayout ? height : Math.min(height * 0.9, height - 32);

  useEffect(() => {
    let active = true;
    if (!user || !activePanelType) return undefined;
    setLoading(true);
    dashboardService.getDashboard()
      .then((result) => {
        if (active) setDashboard(result);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [activePanelType, user]);

  useEffect(() => {
    const nextPanelType = panelTypeFrom(type);
    setActivePanelType(nextPanelType);
    if (nextPanelType === 'settings') {
      setSettingsInitialSection(settingsSectionFrom(type));
      setSettingsReturnPayoutType(null);
    } else {
      setSettingsInitialSection('profile');
      setSettingsReturnPayoutType(null);
    }
    setShowSettingsMenu(true);
  }, [type]);

  useEffect(() => {
    slideAnim.setValue(-34);
    fadeAnim.setValue(0);
    contentAnim.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, contentAnim]);

  const wallet = dashboard?.wallet || {};
  const transactions = dashboard?.transactions || [];
  const accounts = dashboard?.accounts || [];
  const liveAccounts = useMemo(() => {
    const live = accounts.filter((account) => account.type === 'Live');
    if (selectedAccount?.type !== 'Live') return live;
    return live.some((account) => String(account.id) === String(selectedAccount.id))
      ? live
      : [selectedAccount, ...live];
  }, [accounts, selectedAccount]);
  const selectedDepositAccount = useMemo(() => (
    liveAccounts.find((account) => String(account.id) === String(depositAccountId))
    || (selectedAccount?.type === 'Live'
      ? liveAccounts.find((account) => String(account.id) === String(selectedAccount.id))
      : null)
    || liveAccounts[0]
    || null
  ), [depositAccountId, liveAccounts, selectedAccount]);
  const selectedWithdrawAccount = useMemo(() => (
    liveAccounts.find((account) => String(account.id) === String(withdrawAccountId))
    || (selectedAccount?.type === 'Live'
      ? liveAccounts.find((account) => String(account.id) === String(selectedAccount.id))
      : null)
    || liveAccounts[0]
    || null
  ), [liveAccounts, selectedAccount, withdrawAccountId]);
  const panelAccount = activePanelType === 'withdraw'
    ? selectedWithdrawAccount
    : activePanelType === 'deposit'
      ? selectedDepositAccount
      : selectedAccount;
  const balance = Number.isFinite(Number(panelAccount?.balance))
    ? Number(panelAccount.balance)
    : Number(wallet.balance || summary?.balance || 0);
  const fundingLocked = Boolean(user && user.verificationStatus !== 'approved');
  const fundingLockedMessage = 'Verification approval is required before withdrawals.';
  const titleMap = {
    account: ['Account Details', 'Trading accounts and account creation', BadgeCheck],
    deposit: ['Deposit', 'Submit a funding request', Wallet],
    withdraw: ['Withdraw', 'Request funds from your account', Wallet],
    history: ['Transaction History', 'Deposits, withdrawals and account activity', History],
    settings: ['My Settings', ['admin', 'agent'].includes(user?.role) ? 'Profile, security and sessions' : 'Profile, security, notifications and payments', isMobile ? Menu : Moon],
    verification: ['Verification', 'Step-wise KYC status and documents', ShieldCheck],
    referral: ['Referral Programme', 'Invite clients and earn rewards', Award],
  };
  const [title, subtitle, Icon] = titleMap[activePanelType] || titleMap.history;

  useEffect(() => {
    if (!['deposit', 'withdraw'].includes(activePanelType)) return;
    if (!liveAccounts.length) {
      setDepositAccountId('');
      setWithdrawAccountId('');
      return;
    }
    if (activePanelType === 'deposit') {
      setDepositAccountId((current) => {
        if (liveAccounts.some((account) => String(account.id) === String(current))) return current;
        const selectedLive = selectedAccount?.type === 'Live'
          ? liveAccounts.find((account) => String(account.id) === String(selectedAccount.id))
          : null;
        return String((selectedLive || liveAccounts[0]).id);
      });
    }
    setWithdrawAccountId((current) => {
      if (liveAccounts.some((account) => String(account.id) === String(current))) return current;
      const selectedLive = selectedAccount?.type === 'Live'
        ? liveAccounts.find((account) => String(account.id) === String(selectedAccount.id))
        : null;
      return String((selectedLive || liveAccounts[0]).id);
    });
  }, [activePanelType, liveAccounts, selectedAccount]);

  const summaryCards = useMemo(() => {
    if (activePanelType === 'deposit' || activePanelType === 'withdraw') {
      const selectedLiveAccount = activePanelType === 'deposit' ? selectedDepositAccount : selectedWithdrawAccount;
      const setLiveAccountId = activePanelType === 'deposit' ? setDepositAccountId : setWithdrawAccountId;
      const unavailableAction = activePanelType === 'deposit' ? 'deposits' : 'withdrawals';

      if (!liveAccounts.length) {
        return (
          <View className={`${isMobileLayout ? 'gap-2.5 p-4 pb-0' : 'gap-3 p-6 pb-0'}`}>
            <View className={`flex-row flex-wrap ${isMobileLayout ? 'gap-2.5' : 'gap-3'}`}>
              <InfoCard label="Selected Account" value="No live account" colors={colors} />
              <InfoCard label="Balance" value="0.00 USD" colors={colors} />
            </View>
            <Text className="rounded-lg border p-3 text-sm" style={{ backgroundColor: `${colors.danger}12`, borderColor: colors.danger, color: colors.danger }}>
              No live account is available for {unavailableAction}.
            </Text>
          </View>
        );
      }

      if (liveAccounts.length === 1) {
        return (
          <View className={`${isMobileLayout ? 'gap-2.5 p-4 pb-0' : 'gap-3 p-6 pb-0'}`}>
            <View className={`flex-row flex-wrap ${isMobileLayout ? 'gap-2.5' : 'gap-3'}`}>
              <InfoCard label="Selected Account" value={selectedLiveAccount?.name || 'Live account 1'} colors={colors} />
              <InfoCard label="Balance" value={`${money(balance)} USD`} colors={colors} />
            </View>
          </View>
        );
      }

      return (
        <View className={`${isMobileLayout ? 'gap-2.5 p-4 pb-0' : 'gap-3 p-6 pb-0'}`}>
          <View className={`${isMobileLayout ? 'gap-1.5 p-2.5' : 'gap-2 p-3'} rounded-lg border`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Text className="text-xs font-medium uppercase mb-2" style={{ color: colors.muted }}>Select Live Account</Text>
            <View className={`flex-row flex-wrap ${isMobileLayout ? 'gap-1.5' : 'gap-2'}`}>
              {liveAccounts.map((account) => {
                const active = String(account.id) === String(selectedLiveAccount?.id);
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => setLiveAccountId(String(account.id))}
                    className={`${isMobileLayout ? 'min-w-[140px] px-2.5 py-2' : 'min-w-[210px] px-3 py-2.5'} flex-1 rounded-lg border`}
                    style={{
                      backgroundColor: active ? `${colors.primary}18` : colors.panel,
                      borderColor: active ? colors.primary : colors.border,
                    }}
                  >
                    <Text className="font-medium" style={{ color: colors.text }}>{account.name || 'Live account'}</Text>
                    <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{money(account.balance || 0)} {account.currency || 'USD'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      );
    }
    return (
      <View className={`${isMobileLayout ? 'flex-row flex-wrap gap-2.5 p-4 pb-0' : 'flex-row flex-wrap gap-3 p-6 pb-0'}`}>
        <InfoCard label="Selected Account" value={selectedAccount?.name || 'Demo account 1'} colors={colors} />
        <InfoCard label="Balance" value={`${money(balance)} USD`} colors={colors} />
      </View>
    );
  }, [activePanelType, balance, colors, liveAccounts, selectedAccount?.name, selectedDepositAccount, selectedWithdrawAccount, isMobileLayout]);
  const updateAccounts = useCallback((accounts, preferredAccount) => {
    setDashboard((current) => ({ ...(current || {}), accounts: accounts || [] }));
    onAccountsChanged?.(accounts, preferredAccount);
  }, [onAccountsChanged]);

  useEffect(() => {
    if (!user || activePanelType !== 'account') return undefined;
    const timer = setInterval(() => {
      dashboardService.getDashboard()
        .then((result) => {
          setDashboard(result);
          updateAccounts(result.accounts || []);
        })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, [activePanelType, updateAccounts, user]);

  return (
    <View
      className={isMobileLayout ? "" : "items-center justify-center p-5"}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 90,
        backgroundColor: isMobileLayout ? colors.background : 'rgba(0,0,0,0.5)',
        ...(Platform.OS === 'web' && !isMobileLayout ? { backdropFilter: 'blur(4px)' } : {}),
        alignItems: isMobileLayout ? 'stretch' : 'center',
        justifyContent: isMobileLayout ? 'stretch' : 'center',
      }}
    >
      {!isMobileLayout && <Pressable style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} onPress={onClose} />}
      <Animated.View
        className="overflow-hidden shadow-2xl"
        style={{
          width: isMobileLayout ? '100%' : panelWidth,
          height: isMobileLayout ? '100%' : undefined,
          minHeight: isMobileLayout ? '100%' : Math.min(580, panelHeight),
          maxHeight: isMobileLayout ? '100%' : panelHeight,
          backgroundColor: colors.background,
          borderColor: isMobileLayout ? 'transparent' : colors.border,
          borderWidth: isMobileLayout ? 0 : 1,
          borderRadius: isMobileLayout ? 0 : 8,
          shadowColor: colors.primary,
          shadowOpacity: isMobileLayout ? 0 : 0.14,
          shadowRadius: 30,
          opacity: fadeAnim,
          transform: isMobileLayout ? [] : [{ translateX: slideAnim }],
        }}
      >
        <PanelHeader
          title={title}
          subtitle={subtitle}
          icon={Icon || BadgeCheck}
          onClose={onClose}
          colors={colors}
          onIconPress={activePanelType === 'settings' && isMobile ? () => setShowSettingsMenu((prev) => !prev) : undefined}
        />
        <ScrollView showsVerticalScrollIndicator>
          <Animated.View
            style={{
              flex: 1,
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [15, 0],
                  }),
                },
              ],
            }}
          >
            {['deposit', 'withdraw', 'history'].includes(activePanelType) ? summaryCards : null}
            {activePanelType === 'account' ? (
              <AccountPanel
                dashboard={dashboard}
                selectedAccount={selectedAccount}
                summary={summary}
                colors={colors}
                onAccountsChanged={updateAccounts}
                onSelectAccount={onSelectAccount}
              />
            ) : null}
            {activePanelType === 'deposit' ? (
              <View className={isMobileLayout ? "p-4 pt-2" : "p-6"}>
                <DepositForm
                  onSubmit={(values) => deposit({ ...values, tradingAccountId: selectedDepositAccount?.id }, Boolean(user))}
                  loading={walletLoading}
                  disabled={!selectedDepositAccount}
                  disabledMessage="Create or activate a Live account before deposits."
                />
              </View>
            ) : null}
            {activePanelType === 'withdraw' ? (
              <View className={isMobileLayout ? "p-4 pt-2" : "p-6"}>
                <WithdrawForm
                  onSubmit={(values) => withdraw(values, Boolean(user))}
                  loading={walletLoading}
                  disabled={fundingLocked || !selectedWithdrawAccount}
                  disabledMessage={!selectedWithdrawAccount ? 'Create or activate a Live account before withdrawals.' : fundingLockedMessage}
                  summary={{ balance }}
                  transactions={transactions}
                  selectedAccount={selectedWithdrawAccount}
                  onMissingDetailsPress={(payoutType) => {
                    setSettingsInitialSection(['admin', 'agent'].includes(user?.role) ? 'profile' : 'payments');
                    setSettingsReturnPayoutType(['admin', 'agent'].includes(user?.role) ? null : payoutType);
                    setActivePanelType('settings');
                  }}
                />
              </View>
            ) : null}
            {activePanelType === 'history' ? (
              <View className={isMobileLayout ? "p-4 pt-2" : "p-6"}>
                <TransactionList transactions={transactions} title={loading ? 'Loading History...' : 'Transaction History'} />
              </View>
            ) : null}
            {activePanelType === 'settings' ? (
              <SettingsPanel
                colors={colors}
                darkMode={darkMode}
                toggleTheme={toggleTheme}
                user={user}
                updateProfile={updateProfile}
                initialSection={settingsInitialSection}
                returnToWithdrawPayoutType={settingsReturnPayoutType}
                onReturnToWithdraw={() => {
                  setSettingsReturnPayoutType(null);
                  setActivePanelType('withdraw');
                }}
                showMenu={showSettingsMenu}
                setShowMenu={setShowSettingsMenu}
              />
            ) : null}
            {activePanelType === 'verification' ? <VerificationPanel user={user} colors={colors} submitVerification={submitVerification} refreshUser={refreshUser} /> : null}
            {activePanelType === 'referral' ? <ReferralPanel dashboard={dashboard} colors={colors} /> : null}
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
