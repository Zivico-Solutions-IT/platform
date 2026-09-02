import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useRouter, usePathname } from 'expo-router';
import { Alert, Animated, Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AlertTriangle, ArrowLeft, Bell, Camera, ChevronDown, Plus, ChevronUp, CreditCard, Eye, EyeOff, LogOut, Moon, RefreshCw, Search, Settings, ShieldCheck, Sun, TrendingUp, TrendingDown, UserRound, Wallet, X, Users, Coins, ArrowUpRight, ArrowDownRight, Copy, UsersRound } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import Svg, { Path, Circle, Line, Text as SvgText, G, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { io } from 'socket.io-client';
import api from '../src/services/api';
import { socketBaseUrl } from '../src/services/apiConfig';
import { marketService } from '../src/services/marketService';
import CustomButton from '../src/components/common/CustomButton';
import CustomInput from '../src/components/common/CustomInput';
import DateTimePickerInput from '../src/components/common/DateTimePickerInput';
import AdminSidebar from '../src/components/admin/AdminSidebar';
import AdminUsersTable from '../src/components/admin/AdminUsersTable';
import UserManagement from '../src/components/admin/UserManagement';
import AgentManagement from '../src/components/admin/AgentManagement';
import UpdateBalanceModal from '../src/components/admin/UpdateBalanceModal';
import AssignUsers from '../src/components/admin/AssignUsers';
import SymbolSettings from '../src/components/admin/SymbolSettings';
import UserWalletDetails from '../src/components/admin/UserWalletDetails';
import UserTransactionsModal from '../src/components/admin/UserTransactionsModal';
import UserSettingsModal from '../src/components/admin/UserSettingsModal';
import VerificationApprovales from '../src/components/admin/verificationApprovales';
import ReferralRewards from '../src/components/admin/ReferralRewards';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';
import { dateTime, money, quote } from '../src/utils/formatters';
import { calculateRequiredMargin } from '../src/utils/calculations';
import { kycImageDataUrl } from '../src/utils/kycImage';
import AnimatedPopup from '../src/components/AnimatedPopup';

const empty = { users: [], birthdays: [], deposits: [], withdrawals: [], bankAccounts: [], depositMethodAddresses: [], trades: [], referralRewards: [], stats: {} };
const ADD_TRADE_GROUPS = [
  { id: 'POPULAR', label: 'Popular' },
  { id: 'CRYPTO CFD', label: 'Crypto' },
  { id: 'FOREX', label: 'Forex' },
  { id: 'INDICES', label: 'Indices' },
  { id: 'METALS', label: 'Metals' },
  { id: 'ENERGIES', label: 'Energies' },
];
const ADD_TRADE_POPULAR = new Set(['EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/CHF', 'EUR/JPY', 'XAU/USD', 'XAG/USD', 'WTI/USD']);
// The overview period selector calculates each leaderboard from these records.
// Request the largest safe page so changing to an earlier month/year does not
// accidentally use only the most recent activity.
const listParams = { limit: 250 };
const depositMethodOptions = ['TRC20', 'BEP20', 'ERC20', 'Bank Transfer'];
const depositCurrencyOptions = ['USD'];
const tradingLevelOptions = ['Standard', 'Silver', 'Gold', 'Platinum'];
const depositAmountText = (item) => `${item?.currency === 'INR' ? '₹' : '$'}${money(item?.amount)} ${item?.currency || 'USD'}`;
const depositEditValues = (item = {}) => ({
  amount: item.amount ? String(item.amount) : '',
  bonus: item.bonus ? String(item.bonus) : '',
  currency: item.currency || 'USD',
  paymentMethod: item.paymentMethod || '',
  referenceNumber: item.referenceNumber || '',
  depositAddressLabel: item.depositAddressLabel || '',
  depositAddress: item.depositAddress || '',
  note: item.note || '',
});
const withdrawalEditValues = (item = {}) => ({
  amount: item.amount ? String(item.amount) : '',
  withdrawalMethod: item.withdrawalMethod === 'Crypto' ? 'Crypto' : 'Bank',
  bankName: item.bankName || '',
  accountNumber: item.accountNumber || '',
  accountHolderName: item.accountHolderName || '',
});
const viewedNewUsersStorageKey = 'veltriumfx-admin-viewed-new-users';
const adminNotificationBaselineKey = 'veltriumfx-admin-notifications-after';

const payoutTypeFor = (item) => (
  String(`${item?.bankName || ''} ${item?.branchName || ''}`).toLowerCase().includes('trc20') ? 'TRC20' : 'Bank'
);
const dateMs = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const metricDateKey = (value, monthOnly = false) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return monthOnly ? `${year}-${month}` : `${year}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};
const isOnlineUser = (user) => dateMs(user?.onlineUntil) > Date.now();
const NEW_ACCOUNT_LOGIN_WINDOW_MS = 2 * 60 * 1000;
const loginNotificationAt = (user) => user?.createdAt;
const loginNotificationKey = (user) => `${user?.id || 'user'}-${new Date(loginNotificationAt(user) || 0).getTime()}`;
const isRecentUser = (user) => {
  const createdAt = dateMs(user?.createdAt);
  const firstLoginAt = dateMs(user?.lastLoginAt);
  return createdAt
    && firstLoginAt
    && firstLoginAt >= createdAt
    && firstLoginAt - createdAt <= NEW_ACCOUNT_LOGIN_WINDOW_MS
    && Date.now() - createdAt < 24 * 60 * 60 * 1000;
};
const fundingGroupKeyFor = (item, type) => item?.User?.id || item?.userId || item?.User?.email || `${type}-${item?.id}`;
const totalLiveAccountBalance = (users = []) => users.reduce((userSum, user) => (
  userSum + (user.tradingAccounts || []).reduce((accountSum, account) => (
    account.type === 'Live' ? accountSum + Number(account.balance || 0) : accountSum
  ), 0)
), 0);
const liveAccountDepositTotal = (user) => (
  (user?.tradingAccounts || []).reduce((sum, account) => {
    if (String(account?.type || '').toLowerCase() !== 'live') return sum;
    return sum + Number(account.accountStats?.totalDeposits ?? account.totalDeposits ?? account.depositTotal ?? 0);
  }, 0)
);
const preferredAddTradeAccount = (accounts = []) => (
  accounts.find((account) => String(account?.type || '').toLowerCase() === 'live')
  || accounts.find((account) => account?.isPrimary)
  || accounts[0]
  || {}
);
const marginLevelFor = (user) => {
  const wallet = user?.wallet || {};
  const margin = Number(wallet.margin || 0);
  if (!Number.isFinite(margin) || margin <= 0) return null;
  const provided = Number(wallet.marginLevel);
  if (Number.isFinite(provided) && provided > 0) return provided;
  const equity = Number(wallet.equity || 0);
  if (!Number.isFinite(equity)) return null;
  return Number(((equity / margin) * 100).toFixed(2));
};
const groupBy = (items, keyFor) => {
  const groups = [];
  const indexByKey = new Map();
  items.forEach((item) => {
    const key = keyFor(item) || 'Other';
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({ key, items: [] });
    }
    groups[indexByKey.get(key)].items.push(item);
  });
  return groups;
};
const matchesSearch = (query, values = []) => {
  const search = String(query || '').trim().toLowerCase();
  if (!search) return true;
  return values.some((value) => String(value ?? '').toLowerCase().includes(search));
};
function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Bonus cards only need a compact preview. Store optimized artwork so the
// client profile does not download the original multi-megabyte upload.
function compressBonusImage(file) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return readFileDataUrl(file);
  return new Promise((resolve, reject) => {
    const source = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    source.onload = () => {
      try {
        const limit = 720;
        const scale = Math.min(1, limit / Math.max(source.width, source.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.width * scale));
        canvas.height = Math.max(1, Math.round(source.height * scale));
        canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/webp', 0.72));
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    source.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Unable to load image')); };
    source.src = objectUrl;
  });
}

const payoutFieldsFor = (item) => {
  const payoutType = payoutTypeFor(item);
  if (payoutType === 'TRC20') {
    return [
      ['Wallet Holder', item.accountHolderName],
      ['Network', item.bankName || 'USDT TRC20'],
      ['Token Standard', item.branchName || 'TRC20'],
      ['Wallet Address', item.accountNumber],
    ];
  }
  return [
    ['Account Holder', item.accountHolderName],
    ['Bank Name', item.bankName],
    ['Branch', item.branchName || '-'],
    ['Account Number', item.accountNumber],
  ];
};

function ask(message, onConfirm) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Confirm admin action', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: onConfirm }]);
}

function StatCard({ title, value, accent, style }) {
  const { width } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const mobile = width < 760;
  const valueColor = accent === 'text-danger' ? colors.danger : accent === 'text-success' ? colors.success : accent === 'text-primary' ? colors.primary : colors.text;

  return (
    <View className={`${mobile ? 'mb-0 rounded-xl' : 'mb-3 rounded-2xl'} overflow-hidden`} style={{ flex: 1, minWidth: mobile ? '47%' : 220, marginRight: mobile ? 0 : 16, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: darkMode ? 1 : 0, shadowColor: '#000', shadowOffset: { width: 0, height: mobile ? 6 : 12 }, shadowOpacity: darkMode ? 0.2 : 0.06, shadowRadius: mobile ? 12 : 24, elevation: mobile ? 4 : 8, ...style }}>
      <View className={mobile ? 'p-3' : 'p-6'}>
        <Text className={`${mobile ? 'text-[9px]' : 'text-[11px]'} font-bold uppercase tracking-wider`} numberOfLines={2} style={{ color: colors.muted }}>{title}</Text>
        <Text className={`${mobile ? 'text-lg mt-1.5' : 'text-[28px] mt-3'} font-bold tracking-tight`} numberOfLines={1} adjustsFontSizeToFit style={{ color: valueColor }}>{value}</Text>
      </View>
    </View>
  );
}

function EmptyRow({ children }) {
  const { darkMode, colors } = useAppTheme();

  return <Text className="rounded-xl p-5" style={{ backgroundColor: colors.surface, color: colors.muted }}>{children}</Text>;
}

function SectionHeading({ title, subtitle, rightComponent }) {
  const { darkMode, colors } = useAppTheme();

  return (
    <View className="mb-4 w-full md:w-auto">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-medium" style={{ color: colors.text }}>{title}</Text>
        {rightComponent}
      </View>
      {subtitle ? <Text className="mt-1 text-sm" style={{ color: colors.muted }}>{subtitle}</Text> : null}
    </View>
  );
}

function DepositCurrencySelect({ value, onChange, className = '' }) {
  const { darkMode, colors } = useAppTheme();
  const inputBackground = darkMode ? colors.surface : '#f6fff9';

  return (
    <View className={`mb-4 ${className}`}>
      <Text className="mb-2 text-sm font-medium" style={{ color: colors.muted }}>Currency</Text>
      <View className="h-12 justify-center rounded-xl border px-1" style={{ backgroundColor: inputBackground, borderColor: colors.border }}>
        <Picker
          selectedValue={depositCurrencyOptions.includes(value) ? value : 'USD'}
          onValueChange={(currency) => onChange(currency)}
          dropdownIconColor={colors.text}
          style={{ color: colors.text, backgroundColor: 'transparent', height: 48, width: '100%', outline: 'none', border: 'none' }}
        >
          {depositCurrencyOptions.map((currency) => (
            <Picker.Item key={currency} label={currency} value={currency} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

function TimeframeDropdown({ value, onChange, options, colors }) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.key === value) || options[0];

  return (
    <View style={{ zIndex: 50, position: 'relative' }}>
      <Pressable
        onPress={() => setOpen(!open)}
        className="h-10 flex-row items-center justify-between rounded-xl border px-3"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          minWidth: 140,
        }}
      >
        <Text className="text-xs font-semibold" style={{ color: colors.text }}>
          {selectedOption?.label}
        </Text>
        <ChevronDown size={14} color={colors.muted} style={{ marginLeft: 8 }} />
      </Pressable>

      {open ? (
        <>
          <Pressable
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
            onPress={() => setOpen(false)}
          />
          <View
            className="absolute right-0 top-11 rounded-xl border p-1"
            style={{
              backgroundColor: colors.panel,
              borderColor: colors.border,
              minWidth: 140,
              zIndex: 50,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            <ScrollView className="deep-green-scrollbar" style={{ maxHeight: 240 }} showsVerticalScrollIndicator={true}>
              {options.map((opt) => {
                const active = opt.key === value;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      onChange(opt.key);
                      setOpen(false);
                    }}
                    className="rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: active ? colors.primary : 'transparent',
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: active ? '#111827' : colors.text }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  );
}

function AdminNotificationRow({ Icon, title, body, time, tone, colors, onPress }) {
  return (
    <Pressable onPress={onPress} className="flex-row border-b px-4 py-3" style={{ borderColor: colors.border }}>
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tone}22` }}>
        <Icon size={17} color={tone} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium" numberOfLines={1} style={{ color: colors.text }}>{title}</Text>
        <Text className="mt-1 text-xs" numberOfLines={2} style={{ color: colors.muted }}>{body}</Text>
        <Text className="mt-2 text-[10px] font-medium uppercase" numberOfLines={1} style={{ color: colors.muted }}>{time}</Text>
      </View>
    </Pressable>
  );
}

function AdminNotificationMenu({ notifications, colors, darkMode, onClose, onReadAll }) {
  return (
    <View className="w-[400px] max-w-[92vw] overflow-hidden rounded-2xl border shadow-2xl" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
      <View className="flex-row items-center justify-between border-b px-4 py-3" style={{ borderColor: colors.border }}>
        <View>
          <Text className="text-base font-medium" style={{ color: colors.text }}>Admin Notifications</Text>
          <Text className="text-xs" style={{ color: colors.muted }}>Requests waiting for action</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable disabled={!notifications.length} onPress={onReadAll} className="rounded-2xl px-3 py-2" style={{ backgroundColor: colors.surface, opacity: notifications.length ? 1 : 0.45 }}>
            <Text className="text-xs font-medium" style={{ color: colors.primary }}>Read all</Text>
          </Pressable>
          <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.surface }}>
            <X size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>
      {notifications.length ? notifications.map((item) => (
        <AdminNotificationRow key={item.id} colors={colors} {...item} />
      )) : (
        <Text className="p-5 text-sm" style={{ color: colors.muted }}>No new admin notifications.</Text>
      )}
    </View>
  );
}

function AdminPasswordInput({ label, value, onChangeText, placeholder, visible, onToggle, colors }) {
  const maskOnWeb = Platform.OS === 'web' && !visible;
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium" style={{ color: colors.muted }}>{label}</Text>
      <View className="relative">
        <CustomInput className="mb-0" value={value} onChangeText={onChangeText} placeholder={placeholder}
          secureTextEntry={Platform.OS !== 'web' && !visible} autoCapitalize="none" autoCorrect={false}
          autoComplete="new-password" textContentType="none"
          style={{ paddingRight: 48, ...(maskOnWeb ? { WebkitTextSecurity: 'disc' } : {}) }} />
        <Pressable onPress={onToggle} accessibilityLabel={visible ? 'Hide password' : 'Show password'} className="absolute right-0 top-0 h-12 w-12 items-center justify-center">
          {visible ? <Eye size={18} color={colors.muted} /> : <EyeOff size={18} color={colors.muted} />}
        </Pressable>
      </View>
    </View>
  );
}

function AdminProfileModal({ visible, user, busyAction, error, onClose, onSaveProfile, onChangePassword }) {
  const { darkMode, colors } = useAppTheme();
  const profileImageInputRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', profileImage: null, currentPassword: '', password: '', confirmPassword: '' });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState({ current: false, next: false, confirm: false });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      profileImage: user?.profileImage || null,
      currentPassword: '',
      password: '',
      confirmPassword: '',
    });
    setEditing(null);
    setPasswordOpen(false);
    setPasswordVisible({ current: false, next: false, confirm: false });
    setLocalError('');
  }, [user, visible]);

  const cancelEdit = () => {
    setForm((current) => ({ ...current, name: user?.name || '', email: user?.email || '' }));
    setEditing(null);
    setLocalError('');
  };

  const submitProfileField = (field) => {
    setLocalError('');
    onSaveProfile({ [field]: form[field] }, () => setEditing(null));
  };

  const openProfileImagePicker = () => {
    setLocalError('');
    if (Platform.OS !== 'web') return;
    profileImageInputRef.current?.click();
  };

  const selectProfileImage = async (file) => {
    if (!file) return;
    setLocalError('');
    if (!file.type?.startsWith('image/')) {
      setLocalError('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError('Profile photo must be 5MB or smaller.');
      return;
    }
    try {
      const profileImage = await readFileDataUrl(file);
      setForm((current) => ({ ...current, profileImage }));
      onSaveProfile({ profileImage });
    } catch {
      setLocalError('Profile photo could not be loaded.');
    }
  };

  const removeProfileImage = () => {
    setLocalError('');
    setForm((current) => ({ ...current, profileImage: null }));
    onSaveProfile({ profileImage: null });
  };

  const submitPassword = () => {
    setLocalError('');
    if (form.password !== form.confirmPassword) {
      setLocalError('Password confirmation does not match.');
      return;
    }
    onChangePassword({ currentPassword: form.currentPassword, password: form.password }, () => {
      setPasswordOpen(false);
      setForm((current) => ({ ...current, currentPassword: '', password: '', confirmPassword: '' }));
    });
  };

  const roleLabel = user?.role === 'master' ? 'Master' : user?.role === 'agent' ? 'Agent' : user?.role === 'manager' ? 'Manager' : 'Admin';
  const roleColor = user?.role === 'manager' ? colors.success : colors.primary;

  const FieldRow = ({ fieldKey, label, inputProps = {}, isBusy }) => (
    <View style={{ marginBottom: 8, borderRadius: 14, borderWidth: 1.5, borderColor: editing === fieldKey ? roleColor : colors.border, backgroundColor: colors.surface }}>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted, marginBottom: 5 }}>{label}</Text>
            {editing === fieldKey ? (
              <CustomInput
                className="mb-0 mt-1"
                value={form[fieldKey]}
                onChangeText={(val) => setForm((current) => ({ ...current, [fieldKey]: val }))}
                {...inputProps}
              />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{form[fieldKey] || '-'}</Text>
            )}
          </View>
          {editing === fieldKey ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={cancelEdit} style={{ height: 38, justifyContent: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, backgroundColor: colors.panel, borderColor: colors.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Cancel</Text>
              </Pressable>
              <Pressable disabled={isBusy} onPress={() => submitProfileField(fieldKey)} style={{ height: 38, justifyContent: 'center', borderRadius: 10, paddingHorizontal: 16, backgroundColor: roleColor, opacity: isBusy ? 0.6 : 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0B0B0B' }}>{isBusy ? '...' : 'Save'}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditing(fieldKey)} style={{ height: 38, justifyContent: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 18, backgroundColor: colors.panel, borderColor: colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Edit</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <AnimatedPopup visible={visible} onClose={onClose} maxWidth={560} className="rounded-[24px]" containerStyle={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: darkMode ? 0.4 : 0.15, shadowRadius: 24, elevation: 16 }}>

      {/* ── Header ── */}
      <View style={{ padding: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            {/* Avatar */}
            <Pressable onPress={openProfileImagePicker} disabled={busyAction === 'profile-profileImage'} style={{ position: 'relative' }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 3, borderColor: roleColor }}>
                {form.profileImage ? (
                  <Image source={{ uri: form.profileImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <UserRound size={26} color={colors.muted} />
                  </View>
                )}
              </View>
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: roleColor, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.panel }}>
                <Camera size={12} color="#0B0B0B" />
              </View>
            </Pressable>
            {Platform.OS === 'web' ? (
              <input ref={profileImageInputRef} accept="image/*" style={{ display: 'none' }} type="file"
                onChange={(event) => { selectProfileImage(event.target.files?.[0] || null); event.target.value = ''; }} />
            ) : null}
            {/* Title */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 }}>
                {user?.role === 'master' ? 'Master Profile Settings' : user?.role === 'agent' ? 'Agent Profile Settings' : user?.role === 'manager' ? 'Manager Profile Settings' : 'Admin Profile Settings'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, backgroundColor: `${roleColor}18`, borderColor: `${roleColor}40` }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', color: roleColor }}>{roleLabel}</Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.muted }}>· {user?.name || '-'}</Text>
              </View>
            </View>
          </View>
          <Pressable onPress={onClose} style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <X size={16} color={colors.text} />
          </Pressable>
        </View>

        {/* ── Info Cards Row ── */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Email', value: user?.email },
            { label: 'Joined', value: user?.createdAt ? dateTime(user.createdAt) : '-' },
            { label: 'Last Login', value: user?.lastLoginAt ? dateTime(user.lastLoginAt) : '-' },
          ].map(({ label, value }) => (
            <View key={label} style={{ flex: 1, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 8 }}>
              <Text style={{ fontSize: 8, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginBottom: 3 }}>{label}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>{value || '-'}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
        <View style={{ padding: 16, paddingTop: 14 }}>
          {/* ── Referral link ── */}
          {user?.referralCode && (
            <View style={{ marginBottom: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginBottom: 8 }}>Referral Link</Text>
              <View style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: roleColor }} selectable={true} numberOfLines={1}>
                  {typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/register?ref=${user.referralCode}` : `https://test.novafxm.com/register?ref=${user.referralCode}`}
                </Text>
              </View>
            </View>
          )}

          {/* ── Name ── */}
          <FieldRow fieldKey="name" label="Full Name" inputProps={{ placeholder: 'Your full name' }} isBusy={busyAction === 'profile-name'} />

          {/* ── Email ── */}
          <FieldRow fieldKey="email" label="Email Address" inputProps={{ placeholder: 'your@email.com', autoCapitalize: 'none', keyboardType: 'email-address' }} isBusy={busyAction === 'profile-email'} />

          {/* ── Password ── */}
          <View style={{ marginBottom: 8, borderRadius: 14, borderWidth: 1.5, borderColor: passwordOpen ? roleColor : colors.border, backgroundColor: colors.surface }}>
            <View style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted, marginBottom: 5 }}>Password</Text>
                  <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, letterSpacing: 3 }}>••••••••</Text>
                </View>
                <Pressable onPress={() => setPasswordOpen((current) => !current)} style={{ height: 38, justifyContent: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 18, backgroundColor: colors.panel, borderColor: colors.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{passwordOpen ? 'Cancel' : 'Change'}</Text>
                </Pressable>
              </View>
              {passwordOpen ? (
                <View style={{ marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <AdminPasswordInput label="Current Password" value={form.currentPassword}
                    onChangeText={(currentPassword) => setForm((current) => ({ ...current, currentPassword }))}
                    placeholder="Verify current password" visible={passwordVisible.current} onToggle={() => setPasswordVisible((current) => ({ ...current, current: !current.current }))} colors={colors} />
                  <AdminPasswordInput label="New Password" value={form.password}
                    onChangeText={(password) => setForm((current) => ({ ...current, password }))}
                    placeholder="Minimum 8 characters" visible={passwordVisible.next} onToggle={() => setPasswordVisible((current) => ({ ...current, next: !current.next }))} colors={colors} />
                  <AdminPasswordInput label="Confirm New Password" value={form.confirmPassword}
                    onChangeText={(confirmPassword) => setForm((current) => ({ ...current, confirmPassword }))}
                    placeholder="Repeat new password" visible={passwordVisible.confirm} onToggle={() => setPasswordVisible((current) => ({ ...current, confirm: !current.confirm }))} colors={colors} />
                  <Pressable disabled={busyAction === 'profile-password'} onPress={submitPassword}
                    style={{ height: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: roleColor, opacity: busyAction === 'profile-password' ? 0.6 : 1, marginTop: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0B0B0B' }}>{busyAction === 'profile-password' ? 'Changing...' : 'Change Password'}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Error ── */}
          {localError || error ? (
            <View style={{ marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: `${colors.danger}40`, backgroundColor: `${colors.danger}12`, padding: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.danger }}>{localError || error}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </AnimatedPopup>
  );
}

function DetailTile({ label, value, colors, desktopMinWidth = 120 }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  return (
    <View className="flex-1 rounded-xl border p-2 overflow-hidden" style={{ minWidth: mobile ? '46%' : desktopMinWidth, maxWidth: mobile ? '48%' : undefined, backgroundColor: colors.surface, borderColor: colors.border }}>
      <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.muted }} numberOfLines={1}>{label}</Text>
      <Text className="text-[11px] font-semibold" style={{ color: colors.text, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>{value || '-'}</Text>
    </View>
  );
}

function HistoryRow({ columns, colors }) {
  return (
    <View className="flex-row border-b px-3 py-2" style={{ borderColor: colors.border }}>
      {columns.map(([key, value, width = 120, tone]) => (
        <Text key={key} className="text-xs" numberOfLines={1} style={{ width, color: tone || colors.text }}>{value}</Text>
      ))}
    </View>
  );
}

function UserOverviewModal({ overview, onClose }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const loading = overview?.loading;
  const user = overview?.user || overview?.data?.user;
  const data = overview?.data || {};
  const wallet = data.wallet;
  const trades = data.trades || [];
  const deposits = data.deposits || [];
  const withdrawals = data.withdrawals || [];

  if (!overview) return null;

  return (
    <View className={mobile ? "absolute inset-0 z-50 items-center justify-start bg-medium/70 p-4 pt-16" : "absolute inset-0 z-50 items-center justify-center bg-medium/70 p-4"}>
      <View className="max-h-[92vh] w-full max-w-[1100px] rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-medium" style={{ color: colors.text }}>User Full Details</Text>
            <Text className="mt-1 text-sm" style={{ color: colors.muted }}>{user?.name || user?.email || 'User'} | {user?.email || '-'}</Text>
          </View>
          <Pressable
            onPress={onClose}
            className={mobile ? "h-9 w-9 items-center justify-center rounded-2xl" : ""}
            style={mobile ? { backgroundColor: colors.surface } : undefined}
          >
            {mobile ? (
              <X size={18} color={colors.text} />
            ) : (
              <Text style={{ color: colors.muted }}>Close</Text>
            )}
          </Pressable>
        </View>
        {loading ? (
          <Text className="rounded-xl p-5" style={{ backgroundColor: colors.surface, color: colors.muted }}>Loading user details...</Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="mb-4 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Text className="mb-3 text-sm font-medium uppercase" style={{ color: colors.muted }}>Profile Details</Text>
              <View className="flex-row flex-wrap gap-2 md:gap-3">
                <DetailTile label="Name" value={user?.name} colors={colors} />
                <DetailTile label="Email" value={user?.email} colors={colors} />
                <DetailTile label="Phone" value={user?.phone} colors={colors} />
                <DetailTile label="Country" value={user?.country} colors={colors} />
                <DetailTile label="Date of Birth" value={user?.dateOfBirth} colors={colors} />
                <DetailTile label="Account Type" value={user?.accountType} colors={colors} />
                <DetailTile label="Leverage" value={`1:${user?.leverage || 500}`} colors={colors} />
                <DetailTile label="Trading Status" value={user?.tradingStatus} colors={colors} />
                <DetailTile label="Verification" value={user?.verificationStatus} colors={colors} />
                <DetailTile label="Joined" value={dateTime(user?.createdAt)} colors={colors} />
                <DetailTile label="Last Login" value={user?.lastLoginAt ? dateTime(user.lastLoginAt) : '-'} colors={colors} />
                <DetailTile label="Referrer" value={user?.referrer?.name || user?.referrer?.email || '-'} colors={colors} />
              </View>
            </View>

            <View className="mb-4 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Text className="mb-3 text-sm font-medium uppercase" style={{ color: colors.muted }}>Wallet Summary</Text>
              <View className="flex-row flex-wrap gap-2 md:gap-3">
                <DetailTile label="Balance" value={`$${money(wallet?.balance)}`} colors={colors} />
                <DetailTile label="Equity" value={`$${money(wallet?.equity)}`} colors={colors} />
                <DetailTile label="Margin" value={`$${money(wallet?.margin)}`} colors={colors} />
                <DetailTile label="Free Funds" value={`$${money(wallet?.freeFunds)}`} colors={colors} />
                <DetailTile label="Open Profit" value={`$${money(wallet?.openProfit)}`} colors={colors} />
              </View>
            </View>

            <View className="mb-4 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Text className="mb-3 text-sm font-medium uppercase" style={{ color: colors.muted }}>Trading History</Text>
              {mobile ? (
                <View>
                  {trades.map((trade) => {
                    const profit = Number(trade.profit || 0);
                    const isProfit = profit >= 0;
                    const sideColor = trade.side === 'BUY' ? colors.success : colors.danger;
                    const profitColor = isProfit ? colors.success : colors.danger;
                    return (
                      <View key={trade.id} className="mb-3 rounded-xl border p-4 relative overflow-hidden" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                        {/* Accent indicator on left */}
                        <View className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: sideColor }} />
                        <View className="pl-1.5">
                          {/* Header: Symbol, Side, Profit */}
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-base font-semibold" style={{ color: colors.text }}>
                                {trade.symbol}
                              </Text>
                              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: sideColor + '15' }}>
                                <Text className="text-[10px] font-bold uppercase" style={{ color: sideColor }}>
                                  {trade.side}
                                </Text>
                              </View>
                              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.border + '30' }}>
                                <Text className="text-[10px] font-semibold capitalize" style={{ color: colors.muted }}>
                                  {trade.status}
                                </Text>
                              </View>
                            </View>
                            <Text className="text-base font-bold" style={{ color: profitColor }}>
                              {isProfit ? '+' : ''}${money(trade.profit)}
                            </Text>
                          </View>

                          {/* Thin separator */}
                          <View className="my-2.5 h-[1px]" style={{ backgroundColor: colors.border + '40' }} />

                          {/* Grid detail row 1 */}
                          <View className="flex-row justify-between mb-2">
                            <View>
                              <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.muted }}>Lots</Text>
                              <Text className="text-xs font-semibold mt-0.5" style={{ color: colors.text }}>{trade.lots}</Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.muted }}>Date</Text>
                              <Text className="text-[10px] font-medium mt-0.5" style={{ color: colors.muted }}>{dateTime(trade.createdAt)}</Text>
                            </View>
                          </View>

                          {/* Grid detail row 2 */}
                          <View className="flex-row justify-between">
                            <View>
                              <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.muted }}>Open Price</Text>
                              <Text className="text-xs font-medium mt-0.5" style={{ color: colors.text }}>{trade.openPrice}</Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: colors.muted }}>Close Price</Text>
                              <Text className="text-xs font-medium mt-0.5" style={{ color: colors.text }}>{trade.closePrice || '-'}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                  {!trades.length ? <Text className="text-sm" style={{ color: colors.muted }}>No trading history.</Text> : null}
                </View>
              ) : (
                <ScrollView horizontal>
                  <View style={{ minWidth: 760 }}>
                    <HistoryRow colors={colors} columns={[
                      ['symbol', 'Symbol', 110],
                      ['side', 'Side', 80],
                      ['lots', 'Lots', 80],
                      ['status', 'Status', 90],
                      ['open', 'Open Price', 120],
                      ['close', 'Close Price', 120],
                      ['profit', 'Profit', 100],
                      ['date', 'Created', 160],
                    ]} />
                    {trades.map((trade) => (
                      <HistoryRow key={trade.id} colors={colors} columns={[
                        ['symbol', trade.symbol, 110],
                        ['side', trade.side, 80, trade.side === 'BUY' ? colors.success : colors.danger],
                        ['lots', trade.lots, 80],
                        ['status', trade.status, 90],
                        ['open', trade.openPrice, 120],
                        ['close', trade.closePrice || '-', 120],
                        ['profit', `$${money(trade.profit)}`, 100, Number(trade.profit) < 0 ? colors.danger : colors.success],
                        ['date', dateTime(trade.createdAt), 160],
                      ]} />
                    ))}
                    {!trades.length ? <Text className="p-4 text-sm" style={{ color: colors.muted }}>No trading history.</Text> : null}
                  </View>
                </ScrollView>
              )}
            </View>

            <View className="gap-4 lg:flex-row">
              <View className="lg:flex-1 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <Text className="mb-3 text-sm font-medium uppercase" style={{ color: colors.muted }}>Deposit History</Text>
                {deposits.map((deposit) => {
                  const status = deposit.status?.toLowerCase();
                  const isApproved = ['approved', 'completed', 'success'].includes(status);
                  const isRejected = ['rejected', 'failed', 'cancelled'].includes(status);
                  const statusColor = isApproved ? colors.success : isRejected ? colors.danger : colors.primary;
                  return (
                    <View key={deposit.id} className="mb-3 rounded-xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                          {/* Icon Circle */}
                          <View className="h-10 w-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.success + '15' }}>
                            <ArrowDownRight size={20} color={colors.success} />
                          </View>
                          <View>
                            <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                              {deposit.paymentMethod || 'Method'}
                            </Text>
                            <Text className="text-[10px] mt-0.5" style={{ color: colors.muted }}>
                              {dateTime(deposit.createdAt)}
                            </Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-sm font-bold" style={{ color: colors.success }}>
                            +${money(deposit.amount)}
                          </Text>
                          <View className="px-2 py-0.5 rounded-full mt-1.5" style={{ backgroundColor: statusColor + '15' }}>
                            <Text className="text-[9px] font-bold capitalize" style={{ color: statusColor }}>
                              {deposit.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
                {!deposits.length ? <Text className="text-sm" style={{ color: colors.muted }}>No deposit history.</Text> : null}
              </View>
              <View className="lg:flex-1 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <Text className="mb-3 text-sm font-medium uppercase" style={{ color: colors.muted }}>Withdrawal History</Text>
                {withdrawals.map((withdrawal) => {
                  const status = withdrawal.status?.toLowerCase();
                  const isApproved = ['approved', 'completed', 'success'].includes(status);
                  const isRejected = ['rejected', 'failed', 'cancelled'].includes(status);
                  const statusColor = isApproved ? colors.success : isRejected ? colors.danger : colors.primary;
                  return (
                    <View key={withdrawal.id} className="mb-3 rounded-xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3 flex-1 min-w-0">
                          {/* Icon Circle */}
                          <View className="h-10 w-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.danger + '15' }}>
                            <ArrowUpRight size={20} color={colors.danger} />
                          </View>
                          <View className="flex-1 min-w-0">
                            <Text className="text-sm font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                              {withdrawal.withdrawalMethod || 'Method'} {withdrawal.bankName ? `(${withdrawal.bankName})` : ''}
                            </Text>
                            <Text className="text-[10px] mt-0.5" style={{ color: colors.muted }}>
                              {dateTime(withdrawal.createdAt)}
                            </Text>
                          </View>
                        </View>
                        <View className="items-end ml-2">
                          <Text className="text-sm font-bold" style={{ color: colors.danger }}>
                            -${money(withdrawal.amount)}
                          </Text>
                          <View className="px-2 py-0.5 rounded-full mt-1.5" style={{ backgroundColor: statusColor + '15' }}>
                            <Text className="text-[9px] font-bold capitalize" style={{ color: statusColor }}>
                              {withdrawal.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
                {!withdrawals.length ? <Text className="text-sm" style={{ color: colors.muted }}>No withdrawal history.</Text> : null}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function MiniLineChart({ data, color, height = 150 }) {
  const { darkMode, colors } = useAppTheme();
  if (!data || !data.length) return null;
  const values = data.map(d => d.value);
  const max = Math.max(...values, 10);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const paddingX = 40;
  const paddingY = 24;
  const chartWidth = 500;
  const chartHeight = height;
  const drawableWidth = chartWidth - paddingX * 2;
  const drawableHeight = chartHeight - paddingY * 2;
  
  const points = data.map((d, index) => {
    const x = paddingX + (index * drawableWidth) / (data.length - 1);
    const y = chartHeight - paddingY - ((d.value - min) / range) * drawableHeight;
    return { x, y, label: d.label, value: d.value };
  });

  // Generate smooth cubic bezier curve
  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  const areaD = points.length ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z` : '';

  // Generate a unique ID for the gradient definition
  const gradientId = `gradient-${color.replace('#', '')}`;

  return (
    <View style={{ height, width: '100%', overflow: 'hidden' }}>
      <Svg height="100%" width="100%" viewBox={`0 0 500 ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        <Line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke={colors.border} strokeWidth={1} />
        
        {/* Fill Area */}
        {areaD ? <Path d={areaD} fill={`url(#${gradientId})`} /> : null}
        
        {/* Line Path */}
        {pathD ? <Path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
        
        {/* Labels & Nodes */}
        {points.map((p, i) => (
          <G key={i}>
            {/* Value Label */}
            <SvgText
              x={p.x}
              y={p.y - 10}
              fontSize="8"
              fontWeight="700"
              fill={colors.text}
              textAnchor="middle"
            >
              {typeof p.value === 'number' && p.value >= 1000 ? `$${(p.value / 1000).toFixed(1)}k` : p.value}
            </SvgText>
            
            {/* Interactive Dot */}
            <Circle cx={p.x} cy={p.y} r={3.5} fill={color} stroke={colors.panel} strokeWidth={1.5} />
            
            {/* Date Label */}
            <SvgText
              x={p.x}
              y={chartHeight - 6}
              fontSize="9"
              fontWeight="500"
              fill={colors.muted}
              textAnchor="middle"
            >
              {p.label}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
}

function DualLineChart({ data, key1, key2, color1, color2, label1, label2, height = 150 }) {
  const { darkMode, colors } = useAppTheme();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  if (!data || !data.length) return null;
  const values1 = data.map(d => d[key1] || 0);
  const values2 = data.map(d => d[key2] || 0);
  const max = Math.max(...values1, ...values2, 10);
  const min = Math.min(...values1, ...values2, 0);
  const range = max - min || 1;
  const paddingX = 40;
  const paddingY = 24;
  const chartWidth = 500;
  const chartHeight = height;
  const drawableWidth = chartWidth - paddingX * 2;
  const drawableHeight = chartHeight - paddingY * 2;

  const points1 = data.map((d, index) => {
    const x = paddingX + (index * drawableWidth) / (data.length - 1);
    const y = chartHeight - paddingY - (((d[key1] || 0) - min) / range) * drawableHeight;
    return { x, y, value: d[key1] || 0 };
  });

  const points2 = data.map((d, index) => {
    const x = paddingX + (index * drawableWidth) / (data.length - 1);
    const y = chartHeight - paddingY - (((d[key2] || 0) - min) / range) * drawableHeight;
    return { x, y, value: d[key2] || 0 };
  });

  // Smooth bezier curve for Line 1
  let pathD1 = '';
  if (points1.length > 0) {
    pathD1 = `M ${points1[0].x} ${points1[0].y}`;
    for (let i = 0; i < points1.length - 1; i++) {
      const p0 = points1[i];
      const p1 = points1[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      pathD1 += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points1[i + 1].x} ${points1[i + 1].y}`;
    }
  }

  // Smooth bezier curve for Line 2
  let pathD2 = '';
  if (points2.length > 0) {
    pathD2 = `M ${points2[0].x} ${points2[0].y}`;
    for (let i = 0; i < points2.length - 1; i++) {
      const p0 = points2[i];
      const p1 = points2[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      pathD2 += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points2[i + 1].x} ${points2[i + 1].y}`;
    }
  }

  const areaD1 = points1.length ? `${pathD1} L ${points1[points1.length - 1].x} ${chartHeight - paddingY} L ${points1[0].x} ${chartHeight - paddingY} Z` : '';
  const areaD2 = points2.length ? `${pathD2} L ${points2[points2.length - 1].x} ${chartHeight - paddingY} L ${points2[0].x} ${chartHeight - paddingY} Z` : '';

  // Density control
  const isDense = data.length > 10;
  const labelInterval = data.length === 30 ? 5 : Math.max(1, Math.round(data.length / 5));

  const gradId1 = `grad1-${color1.replace('#', '')}`;
  const gradId2 = `grad2-${color2.replace('#', '')}`;
  const hovered = hoveredIndex == null ? null : { ...data[hoveredIndex], point1: points1[hoveredIndex], point2: points2[hoveredIndex] };

  return (
    <View style={{ height, width: '100%', overflow: 'visible' }}>
      {/* Legend */}
      <View className="flex-row items-center justify-end gap-3 mb-2 px-10">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color1 }} />
          <Text className="text-[10px] font-bold" style={{ color: colors.text }}>{label1}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color2 }} />
          <Text className="text-[10px] font-bold" style={{ color: colors.text }}>{label2}</Text>
        </View>
      </View>

      <Svg height="100%" width="100%" viewBox={`0 0 500 ${height}`} style={{ overflow: 'visible' }}>
        <Defs>
          <LinearGradient id={gradId1} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color1} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={color1} stopOpacity={0.0} />
          </LinearGradient>
          <LinearGradient id={gradId2} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color2} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={color2} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        <Line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke={colors.border} strokeWidth={1} />

        {/* Area Fills */}
        {areaD1 ? <Path d={areaD1} fill={`url(#${gradId1})`} /> : null}
        {areaD2 ? <Path d={areaD2} fill={`url(#${gradId2})`} /> : null}

        {/* Lines */}
        {pathD1 ? <Path d={pathD1} fill="none" stroke={color1} strokeWidth={isDense ? 1.5 : 2.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {pathD2 ? <Path d={pathD2} fill="none" stroke={color2} strokeWidth={isDense ? 1.5 : 2.5} strokeLinecap="round" strokeLinejoin="round" /> : null}

        {/* Nodes & Labels */}
        {data.map((d, i) => {
          const showLabel = i % labelInterval === 0 || i === data.length - 1;
          return (
            <G key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} onPressIn={() => setHoveredIndex(i)}>
              {/* Circle markers */}
              {!isDense ? (
                <>
                  <Circle cx={points1[i].x} cy={points1[i].y} r={hoveredIndex === i ? 5.5 : 3.5} fill={color1} stroke={colors.panel} strokeWidth={1.5} />
                  <Circle cx={points2[i].x} cy={points2[i].y} r={hoveredIndex === i ? 5.5 : 3.5} fill={color2} stroke={colors.panel} strokeWidth={1.5} />
                </>
              ) : null}
              
              {/* Value labels */}
              {!isDense ? (
                <>
                  <G transform={`translate(${points1[i].x - 8}, ${points1[i].y - 8})`}>
                    <SvgText
                      x={0}
                      y={0}
                      rotation={-90}
                      transform={[{ rotate: '-90deg' }]}
                      style={{ transform: 'rotate(-90deg)' }}
                      fontSize="8"
                      fontWeight="700"
                      fill={color1}
                      textAnchor="start"
                      alignmentBaseline="middle"
                    >
                      {points1[i].value >= 1000 ? `$${(points1[i].value / 1000).toFixed(0)}k` : points1[i].value ? `$${points1[i].value}` : ''}
                    </SvgText>
                  </G>

                  <G transform={`translate(${points2[i].x + 8}, ${points2[i].y - 8})`}>
                    <SvgText
                      x={0}
                      y={0}
                      rotation={-90}
                      transform={[{ rotate: '-90deg' }]}
                      style={{ transform: 'rotate(-90deg)' }}
                      fontSize="8"
                      fontWeight="700"
                      fill={color2}
                      textAnchor="start"
                      alignmentBaseline="middle"
                    >
                      {points2[i].value >= 1000 ? `$${(points2[i].value / 1000).toFixed(0)}k` : points2[i].value ? `$${points2[i].value}` : ''}
                    </SvgText>
                  </G>
                </>
              ) : null}

              {showLabel ? (
                <SvgText x={points1[i].x} y={chartHeight - 6} fontSize="9" fontWeight="500" fill={colors.muted} textAnchor="middle">{d.label}</SvgText>
              ) : null}
            </G>
          );
        })}
        {hovered ? (<G pointerEvents="none"><Line x1={hovered.point1.x} y1={paddingY} x2={hovered.point1.x} y2={chartHeight - paddingY} stroke={colors.muted} strokeWidth={1} strokeDasharray="3 3" opacity={0.65} /><Circle cx={hovered.point1.x} cy={hovered.point1.y} r={5.5} fill={color1} stroke={colors.panel} strokeWidth={2} /><Circle cx={hovered.point2.x} cy={hovered.point2.y} r={5.5} fill={color2} stroke={colors.panel} strokeWidth={2} /><Rect x={Math.min(chartWidth - 150, Math.max(6, hovered.point1.x - 70))} y={6} width={140} height={42} rx={7} fill={colors.panel} stroke={colors.border} strokeWidth={1} /><SvgText x={Math.min(chartWidth - 80, Math.max(76, hovered.point1.x))} y={18} fontSize="9" fontWeight="700" fill={colors.text} textAnchor="middle">{hovered.label}</SvgText><SvgText x={Math.min(chartWidth - 80, Math.max(76, hovered.point1.x))} y={30} fontSize="9" fontWeight="700" fill={color1} textAnchor="middle">{label1}: {hovered.point1.value}</SvgText><SvgText x={Math.min(chartWidth - 80, Math.max(76, hovered.point1.x))} y={41} fontSize="9" fontWeight="700" fill={color2} textAnchor="middle">{label2}: {hovered.point2.value}</SvgText></G>) : null}
      </Svg>
    </View>
  );
}

function MiniBarChart({ data, color, height = 150 }) {
  const { darkMode, colors } = useAppTheme();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  if (!data || !data.length) return null;
  const values = data.map(d => d.value);
  const max = Math.max(...values, 10);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const paddingX = 40;
  const paddingY = 24;
  const chartWidth = 500;
  const chartHeight = height;
  const drawableWidth = chartWidth - paddingX * 2;
  const drawableHeight = chartHeight - paddingY * 2;

  const barWidth = Math.max(12, (drawableWidth / data.length) * 0.4);

  const points = data.map((d, index) => {
    const x = paddingX + (index * drawableWidth) / (data.length - 1 || 1);
    const barHeight = ((d.value - min) / range) * drawableHeight;
    const y = chartHeight - paddingY - barHeight;
    return { x: x - barWidth / 2, y, w: barWidth, h: barHeight, label: d.label, value: d.value };
  });

  const gradientId = `bar-gradient-${color.replace('#', '')}`;

  const labelInterval = data.length === 30 ? 5 : Math.max(1, Math.round(data.length / 5));
  const hovered = hoveredIndex == null ? null : points[hoveredIndex];

  return (
    <View style={{ height, width: '100%', overflow: 'visible' }}>
      {/* Legend Placeholder to match other charts height alignment */}
      <View className="flex-row items-center justify-end gap-3 mb-2 px-10" style={{ opacity: 0 }}>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" />
          <Text className="text-[10px] font-bold">Spacer</Text>
        </View>
      </View>
      <Svg height="100%" width="100%" viewBox={`0 0 500 ${height}`} style={{ overflow: 'visible' }}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.85} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.2} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        <Line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke={colors.border} strokeWidth={1} />

        {/* Bars */}
        {points.map((p, i) => (
          <G key={i}>
            <Rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={Math.max(2, p.h)}
              rx={Math.min(4, p.w / 2)}
              ry={Math.min(4, p.w / 2)}
              fill={hoveredIndex === i ? color : `url(#${gradientId})`}
              onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} onPressIn={() => setHoveredIndex(i)}
            />
            
            {/* Value Label */}
            <G transform={`translate(${p.x + p.w / 2}, ${p.y - 6})`}>
              <SvgText
                x={0}
                y={0}
                rotation={-90}
                transform={[{ rotate: '-90deg' }]}
                style={{ transform: 'rotate(-90deg)' }}
                fontSize="8"
                fontWeight="700"
                fill={color}
                textAnchor="start"
                alignmentBaseline="middle"
              >
                {p.value ? (p.value >= 1000 ? `$${(p.value / 1000).toFixed(1)}k` : p.value) : ''}
              </SvgText>
            </G>

            {/* Date Label */}
            {(i % labelInterval === 0 || i === data.length - 1) ? (
              <SvgText
                x={p.x + p.w / 2}
                y={chartHeight - 6}
                fontSize="9"
                fontWeight="500"
                fill={colors.muted}
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            ) : null}
          </G>
        ))}
        {hovered ? (<G pointerEvents="none"><Line x1={hovered.x + hovered.w / 2} y1={paddingY} x2={hovered.x + hovered.w / 2} y2={chartHeight - paddingY} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.55} /><Rect x={Math.min(chartWidth - 130, Math.max(6, hovered.x + hovered.w / 2 - 60))} y={6} width={120} height={30} rx={7} fill={colors.panel} stroke={color} strokeWidth={1} /><SvgText x={Math.min(chartWidth - 70, Math.max(66, hovered.x + hovered.w / 2))} y={18} fontSize="9" fontWeight="700" fill={colors.text} textAnchor="middle">{hovered.label}</SvgText><SvgText x={Math.min(chartWidth - 70, Math.max(66, hovered.x + hovered.w / 2))} y={29} fontSize="9" fontWeight="700" fill={color} textAnchor="middle">{hovered.value}</SvgText></G>) : null}
      </Svg>
    </View>
  );
}

function GroupedBarChart({ data, key1, key2, color1, color2, label1, label2, height = 150 }) {
  const { darkMode, colors } = useAppTheme();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  if (!data || !data.length) return null;
  const values1 = data.map(d => d[key1] || 0);
  const values2 = data.map(d => d[key2] || 0);
  const max = Math.max(...values1, ...values2, 10);
  const min = Math.min(...values1, ...values2, 0);
  const range = max - min || 1;
  const paddingX = 40;
  const paddingY = 24;
  const chartWidth = 500;
  const chartHeight = height;
  const drawableWidth = chartWidth - paddingX * 2;
  const drawableHeight = chartHeight - paddingY * 2;

  // Width of each group of bars
  const groupWidth = (drawableWidth / data.length) * 0.65;
  // Width of each individual bar inside the group
  const barWidth = Math.max(6, groupWidth * 0.42);
  const gap = groupWidth * 0.08;

  const points = data.map((d, index) => {
    const groupX = paddingX + (index * drawableWidth) / (data.length - 1 || 1);
    
    // Bar 1 height and Y coordinate
    const h1 = (((d[key1] || 0) - min) / range) * drawableHeight;
    const y1 = chartHeight - paddingY - h1;

    // Bar 2 height and Y coordinate
    const h2 = (((d[key2] || 0) - min) / range) * drawableHeight;
    const y2 = chartHeight - paddingY - h2;

    // Left position of each bar
    const x1 = groupX - groupWidth / 2;
    const x2 = x1 + barWidth + gap;

    return { 
      x1, y1, h1, value1: d[key1] || 0,
      x2, y2, h2, value2: d[key2] || 0,
      label: d.label,
      groupX 
    };
  });

  const isDense = data.length > 10;
  const labelInterval = data.length === 30 ? 5 : Math.max(1, Math.round(data.length / 5));

  const gradId1 = `gbar1-${color1.replace('#', '')}`;
  const gradId2 = `gbar2-${color2.replace('#', '')}`;
  const hovered = hoveredIndex == null ? null : points[hoveredIndex];

  return (
    <View style={{ height, width: '100%', overflow: 'visible' }}>
      {/* Legend */}
      <View className="flex-row items-center justify-end gap-3 mb-2 px-10">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color1 }} />
          <Text className="text-[10px] font-bold" style={{ color: colors.text }}>{label1}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color2 }} />
          <Text className="text-[10px] font-bold" style={{ color: colors.text }}>{label2}</Text>
        </View>
      </View>

      <Svg height="100%" width="100%" viewBox={`0 0 500 ${height}`} style={{ overflow: 'visible' }}>
        <Defs>
          <LinearGradient id={gradId1} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color1} stopOpacity={0.85} />
            <Stop offset="100%" stopColor={color1} stopOpacity={0.2} />
          </LinearGradient>
          <LinearGradient id={gradId2} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color2} stopOpacity={0.85} />
            <Stop offset="100%" stopColor={color2} stopOpacity={0.2} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        <Line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke={colors.border} strokeWidth={1} />

        {/* Grouped Bars */}
        {points.map((p, i) => {
          const showLabel = i % labelInterval === 0 || i === data.length - 1;
          return (
            <G key={i}>
              {/* Bar 1 */}
              <Rect
                x={p.x1}
                y={p.y1}
                width={barWidth}
                height={Math.max(2, p.h1)}
                rx={Math.min(3, barWidth / 2)}
                ry={Math.min(3, barWidth / 2)}
                fill={hoveredIndex === i ? color1 : `url(#${gradId1})`}
                onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} onPressIn={() => setHoveredIndex(i)}
              />

              {/* Bar 2 */}
              <Rect
                x={p.x2}
                y={p.y2}
                width={barWidth}
                height={Math.max(2, p.h2)}
                rx={Math.min(3, barWidth / 2)}
                ry={Math.min(3, barWidth / 2)}
                fill={hoveredIndex === i ? color2 : `url(#${gradId2})`}
                onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} onPressIn={() => setHoveredIndex(i)}
              />

              {/* Value labels */}
              {!isDense ? (
                <>
                  {p.value1 > 0 ? (
                    <G transform={`translate(${p.x1 + barWidth / 2}, ${p.y1 - 6})`}>
                      <SvgText
                        x={0}
                        y={0}
                        rotation={-90}
                        transform={[{ rotate: '-90deg' }]}
                        style={{ transform: 'rotate(-90deg)' }}
                        fontSize="7"
                        fontWeight="700"
                        fill={color1}
                        textAnchor="start"
                        alignmentBaseline="middle"
                      >
                        {p.value1 >= 1000 ? `$${(p.value1 / 1000).toFixed(0)}k` : `$${p.value1}`}
                      </SvgText>
                    </G>
                  ) : null}

                  {p.value2 > 0 ? (
                    <G transform={`translate(${p.x2 + barWidth / 2}, ${p.y2 - 6})`}>
                      <SvgText
                        x={0}
                        y={0}
                        rotation={-90}
                        transform={[{ rotate: '-90deg' }]}
                        style={{ transform: 'rotate(-90deg)' }}
                        fontSize="7"
                        fontWeight="700"
                        fill={color2}
                        textAnchor="start"
                        alignmentBaseline="middle"
                      >
                        {p.value2 >= 1000 ? `$${(p.value2 / 1000).toFixed(0)}k` : `$${p.value2}`}
                      </SvgText>
                    </G>
                  ) : null}
                </>
              ) : null}

              {showLabel ? (
                <SvgText 
                  x={p.groupX} 
                  y={chartHeight - 6} 
                  fontSize="9" 
                  fontWeight="500" 
                  fill={colors.muted} 
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}
        {hovered ? (<G pointerEvents="none"><Line x1={hovered.groupX} y1={paddingY} x2={hovered.groupX} y2={chartHeight - paddingY} stroke={colors.muted} strokeWidth={1} strokeDasharray="3 3" opacity={0.65} /><Rect x={Math.min(chartWidth - 150, Math.max(6, hovered.groupX - 70))} y={6} width={140} height={42} rx={7} fill={colors.panel} stroke={colors.border} strokeWidth={1} /><SvgText x={Math.min(chartWidth - 80, Math.max(76, hovered.groupX))} y={18} fontSize="9" fontWeight="700" fill={colors.text} textAnchor="middle">{hovered.label}</SvgText><SvgText x={Math.min(chartWidth - 80, Math.max(76, hovered.groupX))} y={30} fontSize="9" fontWeight="700" fill={color1} textAnchor="middle">{label1}: {hovered.value1}</SvgText><SvgText x={Math.min(chartWidth - 80, Math.max(76, hovered.groupX))} y={41} fontSize="9" fontWeight="700" fill={color2} textAnchor="middle">{label2}: {hovered.value2}</SvgText></G>) : null}
      </Svg>
    </View>
  );
}

function MetricCard({ title, value, subValue, icon: Icon, color, trend }) {
  const { darkMode, colors } = useAppTheme();
  return (
    <View
      className="flex-1 rounded-2xl p-6"
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
        borderWidth: darkMode ? 1 : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: darkMode ? 0.2 : 0.06,
        shadowRadius: 24,
        elevation: 8,
        minWidth: 240,
        marginBottom: 16,
        marginRight: 16,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
          {title}
        </Text>
        <View className="rounded-xl p-3" style={{ backgroundColor: `${color}15` }}>
          <Icon size={22} color={color} />
        </View>
      </View>
      <Text className="mt-4 text-[28px] font-bold tracking-tight" style={{ color: colors.text }}>
        {value}
      </Text>
      {subValue ? (
        <View className="mt-2.5 flex-row items-center gap-1.5">
          {trend === 'up' ? (
            <ArrowUpRight size={16} color={colors.success} strokeWidth={2.5} />
          ) : trend === 'down' ? (
            <ArrowDownRight size={16} color={colors.danger} strokeWidth={2.5} />
          ) : null}
          <Text className="text-[13px] font-bold" style={{ color: trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.muted }}>
            {subValue}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MarginCategoryCard({ id, label, count, background, color, colors, darkMode, mobile }) {
  const cardBackground = darkMode ? colors.panel : background;
  const cardBorderColor = darkMode ? colors.border : `${color}40`;

  return (
    <View
      style={{
        flex: 1,
        minWidth: mobile ? 0 : 210,
        backgroundColor: cardBackground,
        borderColor: cardBorderColor,
        borderWidth: darkMode ? 1 : 0,
        borderRadius: 16,
        padding: mobile ? 8 : 16,
        shadowColor: color,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: darkMode ? 0.2 : 0.12,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
      <Text className={`${mobile ? 'text-[20px]' : 'text-[26px]'} font-bold`} style={{ color: color }}>{count}</Text>
      <Text className={`mt-1 ${mobile ? 'text-[9px]' : 'text-[11px]'} font-bold uppercase tracking-wider`} numberOfLines={1} adjustsFontSizeToFit style={{ color: color }}>{label}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const { width } = useWindowDimensions();
  const { user: adminUser, isAdmin, logout, updateProfile, refreshUser } = useAuth();
  const { darkMode, colors, toggleTheme } = useAppTheme();
  const router = useRouter();

  const pathname = usePathname();

  // Role-based console routing guard
  useEffect(() => {
    if (!adminUser?.role) return;
    if (pathname === '/admin') {
      if (adminUser.role === 'agent') { router.replace('/agent'); return; }
      if (adminUser.role === 'manager') { router.replace('/manager'); return; }
    }
    if (pathname === '/agent' && adminUser.role !== 'agent') {
      if (adminUser.role === 'admin' || adminUser.role === 'master') router.replace('/admin');
      else if (adminUser.role === 'manager') router.replace('/manager');
      else router.replace('/trading');
      return;
    }
    if (pathname === '/manager' && adminUser.role !== 'manager') {
      if (adminUser.role === 'admin' || adminUser.role === 'master') router.replace('/admin');
      else if (adminUser.role === 'agent') router.replace('/agent');
      else router.replace('/trading');
      return;
    }
  }, [adminUser?.role, pathname]);

  const [section, setSection] = useState('overview');
  const [addUserTrigger, setAddUserTrigger] = useState(0);
  const [overviewTab, setOverviewTab] = useState('users'); // 'users', 'deposits', 'withdrawals'
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('7d'); // '7d', '30d', '90d'
  const [metricsTimeframe, setMetricsTimeframe] = useState(() => {
    const d = new Date();
    return `month-${d.getFullYear()}-${d.getMonth()}`;
  }); // dynamic month key, 'thisYear', or 'allTime'
  const [depositSubpage, setDepositSubpage] = useState('addresses');
  const [withdrawalSubpage, setWithdrawalSubpage] = useState('withdrawals');
  const [data, setData] = useState(empty);
  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedDepositUsers, setExpandedDepositUsers] = useState({});
  const [expandedWithdrawalUsers, setExpandedWithdrawalUsers] = useState({});
  const [expandedDepositAddressGroups, setExpandedDepositAddressGroups] = useState({ 'TRC20': true });
  const [expandedWithdrawalDetailGroups, setExpandedWithdrawalDetailGroups] = useState({});
  const [selectedImpersonateClient, setSelectedImpersonateClient] = useState(null);
  const [impersonateSearchQuery, setImpersonateSearchQuery] = useState('');
  const [walletSearchQuery, setWalletSearchQuery] = useState('');
  const [depositSearchQuery, setDepositSearchQuery] = useState('');
  const [withdrawalSearchQuery, setWithdrawalSearchQuery] = useState('');
  const [withdrawalDetailsSearchQuery, setWithdrawalDetailsSearchQuery] = useState('');
  const [userLevelsSearchQuery, setUserLevelsSearchQuery] = useState('');
  const [selectedMobileLevelUserId, setSelectedMobileLevelUserId] = useState(null);
  const [lowMarginSearchQuery, setLowMarginSearchQuery] = useState('');
  const [marginAlertFilter, setMarginAlertFilter] = useState('below');
  const [tradesSearchQuery, setTradesSearchQuery] = useState('');
  const [addTradeForm, setAddTradeForm] = useState({
    symbol: 'XAU/USD',
    side: 'BUY',
    lots: '0.1',
    type: 'past',
    status: 'closed',
    openDate: '',
    closeDate: '',
    openPrice: '',
    closePrice: '',
    stopLoss: '',
    takeProfit: '',
    profit: '',
    tradingAccountId: '',
  });
  const [addTradeLoading, setAddTradeLoading] = useState(false);
  const [addTradeError, setAddTradeError] = useState('');
  const [addTradeSuccess, setAddTradeSuccess] = useState('');
  const [openUserProfileLoading, setOpenUserProfileLoading] = useState(false);

  const [marketPrices, setMarketPrices] = useState([]);
  const [tradeSymbolGroup, setTradeSymbolGroup] = useState('POPULAR');
  const availableTradeInstruments = useMemo(() => {
    const instruments = marketPrices
      .map((item) => ({ symbol: String(item?.symbol || '').trim(), group: String(item?.group || '').trim() }))
      .filter((item) => item.symbol);
    if (instruments.length) return [...new Map(instruments.map((item) => [item.symbol, item])).values()];
    return [
      { symbol: 'XAU/USD', group: 'METALS' }, { symbol: 'XAG/USD', group: 'METALS' },
      { symbol: 'BTC/USD', group: 'CRYPTO CFD' }, { symbol: 'ETH/USD', group: 'CRYPTO CFD' },
      { symbol: 'EUR/USD', group: 'FOREX' }, { symbol: 'GBP/USD', group: 'FOREX' },
      { symbol: 'USD/JPY', group: 'FOREX' }, { symbol: 'AUD/USD', group: 'FOREX' },
      { symbol: 'WTI/USD', group: 'ENERGIES' }, { symbol: 'SPX/USD', group: 'INDICES' },
    ];
  }, [marketPrices]);
  const availableTradeGroups = useMemo(() => ADD_TRADE_GROUPS.filter((group) => (
    group.id === 'POPULAR'
      ? availableTradeInstruments.some((item) => ADD_TRADE_POPULAR.has(item.symbol))
      : availableTradeInstruments.some((item) => item.group === group.id)
  )), [availableTradeInstruments]);
  const visibleTradeSymbols = useMemo(() => availableTradeInstruments
    .filter((item) => tradeSymbolGroup === 'POPULAR' ? ADD_TRADE_POPULAR.has(item.symbol) : item.group === tradeSymbolGroup)
    .map((item) => item.symbol), [availableTradeInstruments, tradeSymbolGroup]);
  const [chartCandles, setChartCandles] = useState([]);
  const [chartTimeframe, setChartTimeframe] = useState('1D');
  const [chartLoading, setChartLoading] = useState(false);
  const [activeSelectionMode, setActiveSelectionMode] = useState('open');
  const mainScrollRef = useRef(null);
  const scrollTargetsRef = useRef({});
  const adminChartFrameRef = useRef(null);
  const adminChartWebViewRef = useRef(null);

  const registerScrollTarget = useCallback((key, event) => {
    scrollTargetsRef.current[key] = event.nativeEvent.layout.y;
  }, []);

  const scrollToAdminTarget = useCallback((key, delay = 300) => {
    const run = (attempt = 0) => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const element = document.getElementById(key);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      const y = scrollTargetsRef.current[key];
      if (!Number.isFinite(y)) {
        if (attempt < 6) setTimeout(() => run(attempt + 1), 120);
        return;
      }
      mainScrollRef.current?.scrollTo?.({ y: Math.max(y - 16, 0), animated: true });
    };
    setTimeout(() => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
      else run();
    }, delay);
  }, []);

  useEffect(() => {
    if (addTradeForm.type === 'live' && ['open', 'close'].includes(activeSelectionMode)) {
      setActiveSelectionMode('tp');
    }
  }, [activeSelectionMode, addTradeForm.type]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const symbols = await marketService.getPrices();
        setMarketPrices(symbols);
      } catch (err) {
        console.error('Error fetching market prices in admin:', err.message);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedImpersonateClient || !addTradeForm.symbol) return;
    const loadChartCandles = async () => {
      setChartLoading(true);
      try {
        const response = await api.get(`/market/candles/${encodeURIComponent(addTradeForm.symbol)}`, {
          params: { timeframe: chartTimeframe, limit: 300 }
        });
        if (response.data && response.data.candles) {
          const sorted = [...response.data.candles].sort((a, b) => a.time - b.time);
          setChartCandles(sorted);
        }
      } catch (err) {
        console.error('Error fetching candles for admin chart:', err.message);
      } finally {
        setChartLoading(false);
      }
    };
    loadChartCandles();
  }, [addTradeForm.symbol, chartTimeframe, selectedImpersonateClient]);

  const handleAdminChartMessage = useCallback((event) => {
    let payload = event?.nativeEvent?.data ?? event?.data;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { return; }
    }
    
    if (payload?.type === 'chart-click') {
      if (activeSelectionMode === 'open' && addTradeForm.type !== 'past') return;

      const { time, price } = payload;
      const date = new Date(time * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;

      setAddTradeForm(prev => {
        const nextForm = { ...prev };
        if (activeSelectionMode === 'open') {
          nextForm.openDate = formattedDate;
          nextForm.openPrice = String(price.toFixed(4));
        } else if (activeSelectionMode === 'close') {
          nextForm.closeDate = formattedDate;
          nextForm.closePrice = String(price.toFixed(4));
        } else if (activeSelectionMode === 'tp') {
          nextForm.takeProfit = String(price.toFixed(4));
        } else if (activeSelectionMode === 'sl') {
          nextForm.stopLoss = String(price.toFixed(4));
        }

        if (nextForm.status === 'closed' && nextForm.openPrice && nextForm.closePrice) {
          const openVal = Number(nextForm.openPrice);
          const closeVal = Number(nextForm.closePrice);
          const p = (closeVal - openVal) * (nextForm.side === 'BUY' ? 1 : -1) * Number(nextForm.lots) * getContractSize(nextForm.symbol);
          nextForm.profit = String(Number(p.toFixed(2)));
        }

        return nextForm;
      });
    }
  }, [activeSelectionMode, addTradeForm.symbol, addTradeForm.lots, addTradeForm.side, addTradeForm.type]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.addEventListener('message', handleAdminChartMessage);
      return () => window.removeEventListener('message', handleAdminChartMessage);
    }
  }, [handleAdminChartMessage]);

  const adminChartHtml = (candles, symbol, timeframe, colors, livePrice) => {
    const chartColors = {
      background: colors.surface,
      text: colors.text,
      border: colors.border,
      up: '#12cf7a',
      down: colors.danger,
      grid: colors.border,
      accent: colors.primary,
      muted: colors.muted,
    };
    const decimals = symbol.includes('JPY') ? 3 : symbol.includes('XAU') || symbol.includes('XAG') || symbol.includes('OIL') || symbol.includes('WTI') || symbol.includes('SPX') ? 2 : 5;
    const live = Number(livePrice?.price || livePrice?.bid || 0);
    const liveBid = Number(livePrice?.bid || live || 0);
    const liveAsk = Number(livePrice?.ask || live || 0);

    return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
    <style>
      * { box-sizing: border-box; }
      html, body, #wrap { height: 100%; width: 100%; margin: 0; padding: 0; background: ${chartColors.background}; overflow: hidden; }
      body { font-family: Inter, Arial, sans-serif; }
      #wrap { position: relative; }
      #chart { position: absolute; inset: 0; }
      #readout {
        position: absolute; left: 12px; top: 10px; z-index: 5; display: flex; gap: 12px; align-items: center;
        max-width: calc(100% - 24px); overflow: hidden; white-space: nowrap; color: ${chartColors.text};
        font: 12px Arial, sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,.5); pointer-events: none;
      }
      #readout .symbol { color: ${chartColors.accent}; font-weight: 800; }
      #readout .up { color: ${chartColors.up}; font-weight: 700; }
      #readout .down { color: ${chartColors.down}; font-weight: 700; }
      #live {
        position: absolute; right: 12px; top: 10px; z-index: 6; display: flex; gap: 8px;
        border: 1px solid ${chartColors.border}; border-radius: 8px; background: rgba(0,0,0,.28); padding: 7px 9px;
        color: ${chartColors.text}; font: 11px Arial, sans-serif; pointer-events: none;
      }
      #live b { font-size: 12px; }
      #hint {
        position: absolute; left: 12px; bottom: 10px; z-index: 6; color: ${chartColors.muted};
        background: rgba(0,0,0,.26); border: 1px solid ${chartColors.border}; border-radius: 8px; padding: 6px 9px;
        font: 11px Arial, sans-serif; pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div id="wrap">
      <div id="chart"></div>
      <div id="readout"></div>
      <div id="live">
        <span>Bid <b class="down">${liveBid ? liveBid.toFixed(decimals) : '-'}</b></span>
        <span>Ask <b class="up">${liveAsk ? liveAsk.toFixed(decimals) : '-'}</b></span>
      </div>
      <div id="hint">Click the chart to set the active trade level</div>
    </div>
    <script src="https://unpkg.com/lightweight-charts@5/dist/lightweight-charts.standalone.production.js"></script>
    <script>
      const data = ${JSON.stringify(candles || [])};
      const livePrice = ${JSON.stringify(live || null)};
      const decimals = ${decimals};
      const fmt = (value) => Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : '-';
      const localTime = (time) => {
        const date = new Date(Number(time) * 1000);
        return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
      };
      const chart = LightweightCharts.createChart(document.getElementById('chart'), {
        autoSize: true,
        layout: {
          background: { type: 'solid', color: '${chartColors.background}' },
          textColor: '${chartColors.text}',
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: '${chartColors.grid}33' },
          horzLines: { color: '${chartColors.grid}33' },
        },
        rightPriceScale: { borderColor: '${chartColors.border}' },
        localization: {
          timeFormatter: (time) => {
            const date = new Date(Number(time) * 1000);
            return date.toLocaleString();
          },
        },
        timeScale: {
          borderColor: '${chartColors.border}',
          timeVisible: true,
          secondsVisible: true,
          tickMarkFormatter: localTime,
        },
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
          vertLine: { color: '${chartColors.accent}' },
          horzLine: { color: '${chartColors.accent}' },
        }
      });

      const series = chart.addSeries(LightweightCharts.CandlestickSeries, {
        upColor: '${chartColors.up}',
        downColor: '${chartColors.down}',
        borderDownColor: '${chartColors.down}',
        borderUpColor: '${chartColors.up}',
        wickDownColor: '${chartColors.down}',
        wickUpColor: '${chartColors.up}',
        priceFormat: { type: 'price', precision: decimals, minMove: Math.pow(10, -decimals) },
      });

      series.setData(data);
      const byTime = new Map(data.map((item) => [Number(item.time), item]));
      let lastBar = data[data.length - 1];
      const readout = document.getElementById('readout');
      const setReadout = (bar) => {
        if (!bar) return;
        const tone = Number(bar.close) >= Number(bar.open) ? 'up' : 'down';
        readout.innerHTML =
          '<span class="symbol">${symbol}</span>' +
          '<span>O ' + fmt(bar.open) + '</span>' +
          '<span>H ' + fmt(bar.high) + '</span>' +
          '<span>L ' + fmt(bar.low) + '</span>' +
          '<span class="' + tone + '">C ' + fmt(bar.close) + '</span>';
      };
      setReadout(lastBar);

      if (livePrice) {
        series.createPriceLine({
          price: Number(livePrice),
          color: '${chartColors.accent}',
          lineWidth: 1,
          lineStyle: LightweightCharts.LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'LIVE',
        });
      }

      const markerLines = {};
      const markerConfig = {
        open: { color: '${chartColors.accent}', title: 'OPEN', style: LightweightCharts.LineStyle.Solid },
        close: { color: '${chartColors.up}', title: 'CLOSE', style: LightweightCharts.LineStyle.Solid },
        tp: { color: '${chartColors.up}', title: 'TP', style: LightweightCharts.LineStyle.Dashed },
        sl: { color: '${chartColors.down}', title: 'SL', style: LightweightCharts.LineStyle.Dashed },
      };
      const clearMarkerLines = () => {
        Object.keys(markerLines).forEach((key) => {
          if (markerLines[key] && series.removePriceLine) {
            series.removePriceLine(markerLines[key]);
          }
          delete markerLines[key];
        });
      };
      const applyMarkerLines = (markers = {}) => {
        clearMarkerLines();
        Object.keys(markerConfig).forEach((key) => {
          const price = Number(markers?.[key]?.price);
          if (!Number.isFinite(price) || price <= 0) return;
          const config = markerConfig[key];
          markerLines[key] = series.createPriceLine({
            price,
            color: config.color,
            lineWidth: 2,
            lineStyle: config.style,
            axisLabelVisible: true,
            title: config.title,
          });
        });
      };
      const receiveHostMessage = (event) => {
        let payload = event?.data;
        if (typeof payload === 'string') {
          try { payload = JSON.parse(payload); } catch { return; }
        }
        if (payload?.type === 'admin-chart-markers') {
          applyMarkerLines(payload.markers);
        }
      };
      window.addEventListener('message', receiveHostMessage);
      document.addEventListener('message', receiveHostMessage);

      chart.timeScale().fitContent();

      function postToHost(payload) {
        const message = JSON.stringify(payload);
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(message);
          return;
        }
        window.parent?.postMessage(message, '*');
      }

      chart.subscribeCrosshairMove((param) => {
        const bar = param?.time != null ? byTime.get(Number(param.time)) : null;
        setReadout(bar || lastBar);
      });

      chart.subscribeClick((param) => {
        if (!param.point) return;
        const time = chart.timeScale().coordinateToTime(param.point.x);
        const price = series.coordinateToPrice(param.point.y);
        const resolvedTime = Number(time || lastBar?.time || Math.floor(Date.now() / 1000));
        if (Number.isFinite(Number(price)) && Number.isFinite(resolvedTime)) {
          const candle = byTime.get(resolvedTime);
          postToHost({
            type: 'chart-click',
            time: resolvedTime,
            price: Number(price),
            candle
          });
        }
      });
    </script>
  </body>
  </html>
    `;
  };

  const livePriceInfo = useMemo(() => {
    const ticker = addTradeForm.symbol;
    if (!ticker || !marketPrices.length) return null;
    return marketPrices.find((item) => item.symbol === ticker || item.tradingViewSymbol === ticker);
  }, [addTradeForm.symbol, marketPrices]);

  const chartLivePriceRef = useRef({ key: '', value: null });
  const stableChartLivePrice = useMemo(() => {
    const key = `${addTradeForm.symbol}-${chartTimeframe}`;
    if (chartLivePriceRef.current.key !== key || (!chartLivePriceRef.current.value && livePriceInfo)) {
      chartLivePriceRef.current = { key, value: livePriceInfo };
    }
    return chartLivePriceRef.current.value;
  }, [addTradeForm.symbol, chartTimeframe, livePriceInfo]);

  useEffect(() => {
    if (addTradeForm.type !== 'live') return;

    const liveOpenPrice = Number(addTradeForm.side === 'BUY' ? livePriceInfo?.ask : livePriceInfo?.bid)
      || Number(livePriceInfo?.price || 0);
    if (!Number.isFinite(liveOpenPrice) || liveOpenPrice <= 0) return;

    const decimals = livePriceInfo?.decimals ?? (
      addTradeForm.symbol.includes('JPY') ? 3
        : addTradeForm.symbol.includes('XAU') || addTradeForm.symbol.includes('XAG') || addTradeForm.symbol.includes('OIL') || addTradeForm.symbol.includes('WTI') || addTradeForm.symbol.includes('SPX') ? 2
          : 5
    );
    const nextOpenPrice = liveOpenPrice.toFixed(decimals);

    setAddTradeForm((prev) => (
      prev.type === 'live' && prev.openPrice !== nextOpenPrice
        ? { ...prev, openPrice: nextOpenPrice }
        : prev
    ));
  }, [addTradeForm.side, addTradeForm.symbol, addTradeForm.type, livePriceInfo]);

  const fetchHistoricalPrice = async (field, symbol, dateStr) => {
    if (!symbol || !dateStr) return;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      const response = await api.get('/admin/historical-price', {
        params: { symbol, date: d.toISOString() }
      });
      if (response.data && response.data.price !== null) {
        setAddTradeForm(prev => {
          const nextForm = { ...prev, [field]: String(response.data.price) };
          if (nextForm.status === 'closed' && nextForm.openPrice && nextForm.closePrice) {
            const contractSize = (sym) => {
              const normalized = String(sym).toUpperCase();
              if (normalized.includes('BTC') || normalized.includes('ETH') || normalized === 'US500') return 1;
              if (normalized.includes('XAU') || normalized.includes('OIL')) return 100;
              return 100000;
            };
            const openVal = Number(nextForm.openPrice);
            const closeVal = Number(nextForm.closePrice);
            const p = (closeVal - openVal) * (nextForm.side === 'BUY' ? 1 : -1) * Number(nextForm.lots) * contractSize(symbol);
            nextForm.profit = String(Number(p.toFixed(2)));
          }
          return nextForm;
        });
      }
    } catch (e) {
      console.error('Error fetching historical price:', e.message);
    }
  };

  const openSelectedUserProfile = async () => {
    if (!selectedImpersonateClient?.id) return;
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setAddTradeError('Opening a client profile is available from the web admin portal.');
      return;
    }

    setOpenUserProfileLoading(true);
    setAddTradeError('');
    try {
      const response = await api.post(`/admin/users/${selectedImpersonateClient.id}/impersonate`);
      const { token, user } = response.data || {};
      if (!token || !user) throw new Error('A client session could not be created.');

      const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const configuredOrigin = String(process.env.EXPO_PUBLIC_PLATFORM_URL || 'https://platform.veltriumfx.com')
        .replace(/\/(login|register|trading)\/?$/, '')
        .replace(/\/$/, '');
      const clientOrigin = localHost ? window.location.origin : configuredOrigin;
      const sessionUrl = `${clientOrigin}/trading`;
      window.name = JSON.stringify({
        type: 'fxm-session-handoff',
        targetOrigin: new URL(sessionUrl).origin,
        token,
        user,
      });
      window.location.assign(sessionUrl);
    } catch (error) {
      setAddTradeError(error.response?.data?.message || error.message || 'Unable to open the client profile.');
      setOpenUserProfileLoading(false);
    }
  };

  const getContractSize = (symbol) => {
    const normalized = String(symbol || '').toUpperCase();
    if (normalized.includes('BTC') || normalized.includes('ETH') || normalized === 'US500') return 1;
    if (normalized.includes('XAU') || normalized.includes('OIL')) return 100;
    return 100000;
  };

  const currentPreviewProfit = useMemo(() => {
    const { openPrice, closePrice, lots, side, symbol } = addTradeForm;
    const openVal = Number(openPrice);
    const closeVal = Number(closePrice);
    const lotsVal = Number(lots);
    if (isNaN(openVal) || isNaN(closeVal) || isNaN(lotsVal) || lotsVal <= 0) return 0;
    const sideFactor = side === 'BUY' ? 1 : -1;
    return (closeVal - openVal) * sideFactor * lotsVal * getContractSize(symbol);
  }, [addTradeForm.openPrice, addTradeForm.closePrice, addTradeForm.lots, addTradeForm.side, addTradeForm.symbol]);

  const chartSelectedOpen = useMemo(() => {
    const time = Math.floor(new Date(addTradeForm.openDate).getTime() / 1000);
    const price = Number(addTradeForm.openPrice);
    return Number.isFinite(price) && price > 0
      ? { time: Number.isFinite(time) ? time : null, price }
      : null;
  }, [addTradeForm.openDate, addTradeForm.openPrice]);

  const chartSelectedClose = useMemo(() => {
    const time = Math.floor(new Date(addTradeForm.closeDate).getTime() / 1000);
    const price = Number(addTradeForm.closePrice);
    return addTradeForm.status === 'closed' && Number.isFinite(price) && price > 0
      ? { time: Number.isFinite(time) ? time : null, price }
      : null;
  }, [addTradeForm.closeDate, addTradeForm.closePrice, addTradeForm.status]);

  const chartSelectedTakeProfit = useMemo(() => {
    const price = Number(addTradeForm.takeProfit);
    return Number.isFinite(price) && price > 0 ? { price } : null;
  }, [addTradeForm.takeProfit]);

  const chartSelectedStopLoss = useMemo(() => {
    const price = Number(addTradeForm.stopLoss);
    return Number.isFinite(price) && price > 0 ? { price } : null;
  }, [addTradeForm.stopLoss]);

  const adminChartMarkers = useMemo(() => ({
    open: chartSelectedOpen,
    close: chartSelectedClose,
    tp: chartSelectedTakeProfit,
    sl: chartSelectedStopLoss,
  }), [chartSelectedOpen, chartSelectedClose, chartSelectedTakeProfit, chartSelectedStopLoss]);

  const adminChartSource = useMemo(
    () => adminChartHtml(chartCandles, addTradeForm.symbol, chartTimeframe, colors, stableChartLivePrice),
    [chartCandles, addTradeForm.symbol, chartTimeframe, colors, stableChartLivePrice]
  );

  const postAdminChartMarkers = useCallback(() => {
    const payload = JSON.stringify({ type: 'admin-chart-markers', markers: adminChartMarkers });
    if (Platform.OS === 'web') {
      adminChartFrameRef.current?.contentWindow?.postMessage(payload, '*');
      return;
    }
    adminChartWebViewRef.current?.injectJavaScript?.(`window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(payload)} })); true;`);
  }, [adminChartMarkers]);

  useEffect(() => {
    postAdminChartMarkers();
  }, [postAdminChartMarkers, adminChartSource]);

  const selectedAddTradeAccount = useMemo(() => {
    const accounts = selectedImpersonateClient?.tradingAccounts || [];
    return accounts.find((account) => String(account.id) === String(addTradeForm.tradingAccountId)) || null;
  }, [addTradeForm.tradingAccountId, selectedImpersonateClient?.tradingAccounts]);

  const addTradeSnapshot = useMemo(() => {
    const lots = Number(addTradeForm.lots || 0);
    const leverage = Number(selectedAddTradeAccount?.leverage || selectedImpersonateClient?.leverage || 500);
    const accountBalance = Number(selectedAddTradeAccount?.balance || 0);
    const marketOpenPrice = Number(addTradeForm.side === 'BUY' ? livePriceInfo?.ask : livePriceInfo?.bid) || Number(livePriceInfo?.price || 0);
    const openPrice = Number(addTradeForm.openPrice || 0) || marketOpenPrice;
    const bid = Number(livePriceInfo?.bid || livePriceInfo?.price || 0);
    const ask = Number(livePriceInfo?.ask || livePriceInfo?.price || 0);
    const spread = Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0 ? Math.abs(ask - bid) : 0;
    const closesImmediately = addTradeForm.type === 'past' && addTradeForm.status === 'closed';
    const requiredMargin = closesImmediately ? 0 : calculateRequiredMargin(addTradeForm.symbol, lots, openPrice, leverage);
    const sideFactor = addTradeForm.side === 'BUY' ? 1 : -1;
    const contractSize = getContractSize(addTradeForm.symbol);
    const profitAtPrice = (price) => (
      Number.isFinite(price) && price > 0 && openPrice > 0 && lots > 0
        ? (price - openPrice) * sideFactor * lots * contractSize
        : null
    );
    const takeProfitPrice = Number(addTradeForm.takeProfit);
    const stopLossPrice = Number(addTradeForm.stopLoss);
    const takeProfitEstimate = profitAtPrice(takeProfitPrice);
    const stopLossEstimate = profitAtPrice(stopLossPrice);
    const profit = addTradeForm.profit !== '' && Number.isFinite(Number(addTradeForm.profit))
      ? Number(addTradeForm.profit)
      : currentPreviewProfit;
    const balanceAfterClose = closesImmediately ? accountBalance + profit : accountBalance;
    const freeAfterMargin = accountBalance - requiredMargin;
    const afterTrade = closesImmediately ? balanceAfterClose : freeAfterMargin;

    return {
      accountBalance,
      afterTrade,
      balanceAfterClose,
      balanceAfterStopLoss: stopLossEstimate == null ? null : accountBalance + stopLossEstimate,
      balanceAfterTakeProfit: takeProfitEstimate == null ? null : accountBalance + takeProfitEstimate,
      closesImmediately,
      freeAfterMargin,
      leverage,
      lots,
      openPrice,
      requiredMargin,
      spread,
      stopLossEstimate,
      takeProfitEstimate,
    };
  }, [
    addTradeForm.lots,
    addTradeForm.openPrice,
    addTradeForm.profit,
    addTradeForm.side,
    addTradeForm.status,
    addTradeForm.stopLoss,
    addTradeForm.symbol,
    addTradeForm.takeProfit,
    addTradeForm.type,
    currentPreviewProfit,
    livePriceInfo,
    selectedAddTradeAccount?.balance,
    selectedAddTradeAccount?.leverage,
    selectedImpersonateClient?.leverage,
  ]);

  const handleAddTradeSubmit = async () => {
    setAddTradeLoading(true);
    setAddTradeError('');
    setAddTradeSuccess('');
    try {
      const payload = {
        userId: selectedImpersonateClient.id,
        tradingAccountId: addTradeForm.tradingAccountId,
        symbol: addTradeForm.symbol,
        side: addTradeForm.side,
        lots: Number(addTradeForm.lots),
        status: addTradeForm.type === 'live' ? 'open' : addTradeForm.status,
        stopLoss: addTradeForm.stopLoss ? Number(addTradeForm.stopLoss) : null,
        takeProfit: addTradeForm.takeProfit ? Number(addTradeForm.takeProfit) : null,
      };

      if (addTradeForm.type === 'past') {
        payload.createdAt = addTradeForm.openDate;
        payload.openPrice = addTradeForm.openPrice;
        if (addTradeForm.status === 'closed') {
          payload.closedAt = addTradeForm.closeDate;
          payload.closePrice = addTradeForm.closePrice;
          payload.profit = addTradeForm.profit ? Number(addTradeForm.profit) : undefined;
        }
      } else {
        payload.openPrice = addTradeForm.openPrice ? Number(addTradeForm.openPrice) : undefined;
      }

      const response = await api.post('/admin/trades/add-custom', payload);
      setAddTradeSuccess('Trade successfully added!');
      load({ silent: true });
      setTimeout(() => {
        setSelectedImpersonateClient(null);
        setAddTradeSuccess('');
      }, 1500);
    } catch (err) {
      setAddTradeError(err.response?.data?.message || 'Failed to place trade.');
    } finally {
      setAddTradeLoading(false);
    }
  };
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [referralEditModal, setReferralEditModal] = useState(null); // { reward, amount }
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [balanceModal, setBalanceModal] = useState(null);
  const [settingsUser, setSettingsUser] = useState(null);
  const [walletModal, setWalletModal] = useState(null);
  const [transactionsModal, setTransactionsModal] = useState(null);
  const [userManagementSubpage, setUserManagementSubpage] = useState('assignUsers');
  const [userOverviewModal, setUserOverviewModal] = useState(null);
  const [birthdayBonusUser, setBirthdayBonusUser] = useState(null);
  const [birthdayBonusAmount, setBirthdayBonusAmount] = useState('200');
  const [bonusPosts, setBonusPosts] = useState([]);
  const [bonusPostsLoading, setBonusPostsLoading] = useState(false);
  const [bonusPostTitle, setBonusPostTitle] = useState('');
  const [bonusPostImage, setBonusPostImage] = useState('');
  const bonusPostInputRef = useRef(null);
  const [verificationUser, setVerificationUser] = useState(null);
  const [verificationDocumentTab, setVerificationDocumentTab] = useState('all');
  const [verificationImageZoom, setVerificationImageZoom] = useState(null);
  const [verificationUploadFiles, setVerificationUploadFiles] = useState({ id: null, address: null });
  const [verificationUploadBusy, setVerificationUploadBusy] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null);
  const [depositDetails, setDepositDetails] = useState(null);
  const [fundingReview, setFundingReview] = useState(null);
  const [depositEditForm, setDepositEditForm] = useState(depositEditValues());
  const [withdrawalEditId, setWithdrawalEditId] = useState(null);
  const [withdrawalEditForm, setWithdrawalEditForm] = useState(withdrawalEditValues());
  const [depositAddressForm, setDepositAddressForm] = useState({ id: null, paymentMethod: 'TRC20', label: '', address: '', qrData: '', isActive: true });
  const [depositAddressEditForm, setDepositAddressEditForm] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [todayRegistrationsOpen, setTodayRegistrationsOpen] = useState(false);
  const [registrationDateFilter, setRegistrationDateFilter] = useState('');
  const [adminProfileOpen, setAdminProfileOpen] = useState(false);
  const [adminProfileError, setAdminProfileError] = useState('');
  const [companyStatus, setCompanyStatus] = useState('active');
  const [companyStatusLoading, setCompanyStatusLoading] = useState(false);
  const mobile = width < 760;
  const [walletSortBy, setWalletSortBy] = useState('newest');
  const [walletSortOpen, setWalletSortOpen] = useState(false);
  const [depositSortBy, setDepositSortBy] = useState('newest');
  const [depositSortOpen, setDepositSortOpen] = useState(false);
  const [withdrawalSortBy, setWithdrawalSortBy] = useState('newest');
  const [withdrawalSortOpen, setWithdrawalSortOpen] = useState(false);

  const walletSortRef = useRef(null);
  const depositSortRef = useRef(null);
  const withdrawalSortRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !walletSortOpen) return;
    const handleOutsideClick = (e) => {
      if (walletSortRef.current && !walletSortRef.current.contains(e.target)) {
        setWalletSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [walletSortOpen]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !depositSortOpen) return;
    const handleOutsideClick = (e) => {
      if (depositSortRef.current && !depositSortRef.current.contains(e.target)) {
        setDepositSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [depositSortOpen]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !withdrawalSortOpen) return;
    const handleOutsideClick = (e) => {
      if (withdrawalSortRef.current && !withdrawalSortRef.current.contains(e.target)) {
        setWithdrawalSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [withdrawalSortOpen]);
  const [viewedNewUserIds, setViewedNewUserIds] = useState(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(viewedNewUsersStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [adminNotificationBaselineMs, setAdminNotificationBaselineMs] = useState(() => {
    const now = Date.now();
    if (Platform.OS !== 'web' || typeof window === 'undefined') return now;
    try {
      const stored = window.localStorage.getItem(adminNotificationBaselineKey);
      if (stored) return Number(stored) || now;
      window.localStorage.setItem(adminNotificationBaselineKey, String(now));
    } catch {}
    return now;
  });

  // Tracks users injected via real-time socket so they survive periodic API reloads
  const socketInjectedUsersRef = useRef([]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) return;
    if (!silent) setLoading(true);
    try {
      const [users, birthdays, deposits, withdrawals, bankAccounts, depositMethodAddresses, trades, referralRewards] = await Promise.all([
        api.get('/admin/users', { params: { limit: 150 } }),
        api.get('/admin/birthdays'),
        api.get('/admin/deposits', { params: listParams }),
        api.get('/admin/withdrawals', { params: listParams }),
        api.get('/admin/bank-accounts', { params: listParams }),
        api.get('/admin/deposit-method-addresses'),
        api.get('/admin/trades', { params: listParams }),
        api.get('/admin/referral-rewards'),
      ]);

      const apiUsers = users.data.users || [];
      const apiUserIds = new Set(apiUsers.map((u) => u.id));

      // Keep any socket-injected users that the API didn't return yet
      // and clear ones that the API already returned (they are now in the official list)
      const stillMissing = socketInjectedUsersRef.current.filter((u) => !apiUserIds.has(u.id));
      socketInjectedUsersRef.current = stillMissing;

      // Merge: socket-injected (newest, at top) + API users
      const mergedUsers = [
        ...stillMissing,
        ...apiUsers,
      ];

      setData({
        users: mergedUsers,
        birthdays: birthdays.data.users || [],
        stats: users.data.stats || {},
        deposits: deposits.data.deposits,
        withdrawals: withdrawals.data.withdrawals,
        bankAccounts: bankAccounts.data.accounts,
        depositMethodAddresses: depositMethodAddresses.data.addresses || [],
        trades: trades.data.trades,
        referralRewards: referralRewards.data.rewards || [],
      });
      if (adminUser?.role !== 'master') setCompanyStatus('active');
      setError('');
    } catch (requestError) {
      const requestMessage = requestError.response?.data?.message || 'Unable to load administrator dashboard.';
      if (requestError.response?.status === 403 && /company (?:is inactive|console is frozen)/i.test(requestMessage)) {
        setCompanyStatus('suspended');
      } else {
        setError(requestMessage);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [adminUser?.role, isAdmin]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      load({ silent: true });
    }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (adminUser?.role !== 'master') return;
    api.get('/master/company-status')
      .then(({ data: responseData }) => setCompanyStatus(responseData?.company?.status || 'active'))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load company status.'));
  }, [adminUser?.role]);

  const updateCompanyFreeze = useCallback((nextStatus) => {
    const freezing = nextStatus === 'suspended';
    const prompt = freezing
      ? 'Managers and agents will only see the Overview lock screen until the company is unfrozen.'
      : 'Managers and agents will regain access according to their permissions.';
    const applyStatus = async () => {
      setCompanyStatusLoading(true);
      try {
        const { data: responseData } = await api.put('/master/company-status', { status: nextStatus });
        setCompanyStatus(responseData?.company?.status || nextStatus);
        setMessage(freezing ? 'Company access has been frozen.' : 'Company access has been restored.');
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to update company status.');
      } finally {
        setCompanyStatusLoading(false);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`${freezing ? 'Freeze company?' : 'Unfreeze company?'}\n\n${prompt}`)) applyStatus();
      return;
    }
    Alert.alert(
      freezing ? 'Freeze company?' : 'Unfreeze company?',
      prompt,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: freezing ? 'Freeze Company' : 'Unfreeze Company',
          style: freezing ? 'destructive' : 'default',
          onPress: applyStatus,
        },
      ],
    );
  }, []);

  // ── Real-time: inject new users as soon as they register ──────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const socket = io(socketBaseUrl(), { transports: ['websocket'], timeout: 4000, reconnection: true });

    socket.on('admin:notification', (payload) => {
      if (payload?.type === 'new_user' && payload?.user) {
        const newUser = payload.user;
        // Track this user in the ref so load() can preserve them across reloads
        if (!socketInjectedUsersRef.current.some((u) => u.id === newUser.id)) {
          socketInjectedUsersRef.current = [newUser, ...socketInjectedUsersRef.current];
        }
        setData((prev) => {
          // Don't duplicate if already in the list (e.g. after a silent reload)
          const alreadyExists = prev.users.some((u) => u.id === newUser.id);
          if (alreadyExists) return prev;
          return { ...prev, users: [newUser, ...prev.users] };
        });
      }
    });

    return () => socket.disconnect();
  }, [isAdmin]);

  useEffect(() => {
    setMessage('');
    setError('');
  }, [section, userManagementSubpage, depositSubpage, withdrawalSubpage]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const hasPermission = (permId) => {
    if (adminUser?.role === 'master') return true;

    if (adminUser?.role === 'agent') {
      if (!Array.isArray(adminUser?.permissions) || adminUser.permissions.length === 0) return false;
      if (adminUser.permissions.includes(permId)) return true;
      if (['depositAddresses', 'depositsList'].includes(permId)) return adminUser.permissions.includes('deposits');
      if (['withdrawalsList', 'withdrawalDetails'].includes(permId)) return adminUser.permissions.includes('withdrawals');
      return false;
    }

    if (adminUser?.role === 'admin' || adminUser?.role === 'manager') {
      const companyPerms = Array.isArray(adminUser?.companyPermissions) ? adminUser.companyPermissions : adminUser?.permissions;
      if (Array.isArray(companyPerms)) {
        if (companyPerms.length === 0) return false;
        if (companyPerms.includes(permId)) return true;
        if (['depositAddresses', 'depositsList'].includes(permId)) return companyPerms.includes('deposits');
        if (['withdrawalsList', 'withdrawalDetails'].includes(permId)) return companyPerms.includes('withdrawals');
        return false;
      }
      return true;
    }

    return false;
  };

  const allowedSectionIds = ['overview', 'marginAlerts', 'users', 'userManagement', 'verifications', 'deposits', 'referrals', 'withdrawals', 'userLevels', 'trades', 'addTrading', 'bonusPosts', 'symbols', 'agents'];
  const canViewSection = (sectionId) => {
    if (companyStatus === 'suspended' && adminUser?.role !== 'master') return sectionId === 'overview';
    return hasPermission(sectionId);
  };

  const loadBonusPosts = useCallback(async () => {
    setBonusPostsLoading(true);
    try {
      const response = await api.get('/admin/bonus-posts');
      setBonusPosts(response.data?.posts || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load bonus posts.');
    } finally {
      setBonusPostsLoading(false);
    }
  }, []);

  const selectBonusPostImage = async (file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      setError('Please choose a PNG, JPG, or WEBP image.');
      return;
    }
    try {
      setBonusPostImage(await compressBonusImage(file));
    } catch (_) {
      setError('Unable to read the selected image.');
    }
  };

  const createBonusPost = async () => {
    if (!bonusPostTitle.trim() || !bonusPostImage) {
      setError('Enter a title and select an image first.');
      return;
    }
    setBusyId('bonus-post-create');
    try {
      await api.post('/admin/bonus-posts', { title: bonusPostTitle.trim(), image: bonusPostImage });
      setBonusPostTitle('');
      setBonusPostImage('');
      setMessage('Bonus post published.');
      await loadBonusPosts();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to publish bonus post.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteBonusPost = async (post) => {
    setBusyId(`bonus-post-${post.id}`);
    try {
      await api.delete(`/admin/bonus-posts/${post.id}`);
      setMessage('Bonus post removed.');
      await loadBonusPosts();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to remove bonus post.');
    } finally {
      setBusyId(null);
    }
  };

  const renderBonusPosts = () => (
    <View className="rounded-2xl border p-4 md:p-6" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
      <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
        <View>
          <Text className="text-xl font-semibold" style={{ color: colors.text }}>Bonus Posts</Text>
          <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Publish up to two image offers for clients to view from their profile. Square artwork is recommended (1080 × 1080); the full image is shown without cropping.</Text>
        </View>
        <Text className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}>{bonusPosts.length}/2 active</Text>
      </View>
      {Platform.OS === 'web' ? <input ref={bonusPostInputRef} accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} type="file" onChange={(event) => { selectBonusPostImage(event.target.files?.[0]); event.target.value = ''; }} /> : null}
      <View className="mb-6 rounded-xl border p-4" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
        <Text className="mb-3 text-base font-semibold" style={{ color: colors.text }}>Create bonus post</Text>
        <CustomInput label="Offer title" value={bonusPostTitle} onChangeText={setBonusPostTitle} placeholder="Example: 20% first deposit bonus" />
        <View className="mt-3 flex-row flex-wrap items-center gap-3">
          <Pressable disabled={bonusPosts.length >= 2 || Platform.OS !== 'web'} onPress={() => bonusPostInputRef.current?.click()} className="rounded-lg border px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.panel, opacity: bonusPosts.length >= 2 ? 0.55 : 1 }}>
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>{bonusPostImage ? 'Change image' : 'Choose image'}</Text>
          </Pressable>
          {bonusPostImage ? <Image source={{ uri: bonusPostImage }} resizeMode="cover" style={{ width: 76, height: 50, borderRadius: 8 }} /> : <Text className="text-xs" style={{ color: colors.muted }}>PNG, JPG or WEBP</Text>}
          <Pressable disabled={bonusPosts.length >= 2 || busyId === 'bonus-post-create'} onPress={createBonusPost} className="rounded-lg px-4 py-3" style={{ backgroundColor: colors.primary, opacity: bonusPosts.length >= 2 ? 0.55 : 1 }}>
            <Text className="text-sm font-semibold" style={{ color: '#111827' }}>{busyId === 'bonus-post-create' ? 'Publishing…' : 'Publish post'}</Text>
          </Pressable>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-4">
        {bonusPosts.map((post) => <View key={post.id} className="w-full overflow-hidden rounded-xl border md:w-[48%]" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
          <Image source={{ uri: post.image }} resizeMode="cover" style={{ width: '100%', height: 180, backgroundColor: colors.card }} />
          <View className="flex-row items-center justify-between gap-2 p-3"><Text className="flex-1 text-sm font-semibold" style={{ color: colors.text }}>{post.title}</Text><Pressable onPress={() => deleteBonusPost(post)} className="rounded-lg px-3 py-2" style={{ backgroundColor: `${colors.danger}18` }}><Text className="text-xs font-semibold" style={{ color: colors.danger }}>{busyId === `bonus-post-${post.id}` ? 'Removing…' : 'Remove'}</Text></Pressable></View>
        </View>)}
        {!bonusPostsLoading && bonusPosts.length === 0 ? <Text className="py-6 text-sm" style={{ color: colors.muted }}>No posts published yet.</Text> : null}
        {bonusPostsLoading ? <Text className="py-6 text-sm" style={{ color: colors.muted }}>Loading bonus posts…</Text> : null}
      </View>
    </View>
  );

  useEffect(() => {
    if (section === 'bonusPosts' && canViewSection('bonusPosts')) loadBonusPosts();
  }, [section, adminUser?.id]);

  useEffect(() => {
    if (companyStatus === 'suspended' && adminUser?.role !== 'master') setSection('overview');
  }, [adminUser?.role, companyStatus]);

  useEffect(() => {
    if (!adminUser || adminUser.role === 'master') return;
    if (canViewSection(section)) return;
    const firstAllowed = allowedSectionIds.find((sectionId) => canViewSection(sectionId));
    setSection(firstAllowed || 'accessDenied');
  }, [adminUser, section]);

  const handleSectionChange = (newSection) => {
    setSection(newSection);
    if (newSection === 'userManagement') {
      if (!hasPermission('assignUsers') && hasPermission('userManagementUsers')) {
        setUserManagementSubpage('users');
      } else if (hasPermission('assignUsers')) {
        setUserManagementSubpage('assignUsers');
      }
    } else if (newSection === 'deposits') {
      if (!hasPermission('depositsList') && hasPermission('depositAddresses')) {
        setDepositSubpage('addresses');
      } else if (hasPermission('depositsList')) {
        setDepositSubpage('deposits');
      }
    } else if (newSection === 'withdrawals') {
      if (!hasPermission('withdrawalsList') && hasPermission('withdrawalDetails')) {
        setWithdrawalSubpage('details');
      } else if (hasPermission('withdrawalsList')) {
        setWithdrawalSubpage('withdrawals');
      }
    }
  };

  useEffect(() => {
    if (adminUser) {
      if (section === 'userManagement') {
        if (!hasPermission('assignUsers') && hasPermission('userManagementUsers')) {
          setUserManagementSubpage('users');
        }
      } else if (section === 'deposits') {
        if (!hasPermission('depositsList') && hasPermission('depositAddresses')) {
          setDepositSubpage('addresses');
        }
      } else if (section === 'withdrawals') {
        if (!hasPermission('withdrawalsList') && hasPermission('withdrawalDetails')) {
          setWithdrawalSubpage('details');
        }
      }
    }
  }, [adminUser, section]);

  const refreshAdminData = useCallback(() => load({ silent: true }), [load]);

  const pendingCount = useMemo(() => (
    [...data.deposits, ...data.withdrawals].filter((item) => item.status === 'pending').length
  ), [data.deposits, data.withdrawals]);
  const depositPendingCount = useMemo(() => (
    data.deposits.filter((item) => item.status === 'pending').length
  ), [data.deposits]);
  const withdrawalPendingCount = useMemo(() => (
    data.withdrawals.filter((item) => item.status === 'pending').length
  ), [data.withdrawals]);
  const bankPendingCount = useMemo(() => (
    data.bankAccounts.filter((item) => ['pending', 'delete_pending'].includes(item.status)).length
  ), [data.bankAccounts]);
  const verificationPendingCount = useMemo(() => (
    data.users.filter((user) => user.role === 'user' && user.verificationStatus === 'pending').length
  ), [data.users]);
  const referralPendingCount = useMemo(() => (
    (data.referralRewards || []).filter((item) => item.status === 'pending').length
  ), [data.referralRewards]);

  const metricsTimeframeOptions = useMemo(() => {
    const options = [
      { key: 'allTime', label: 'All Time' },
      { key: 'thisYear', label: `This Year (${new Date().getFullYear()})` },
    ];
    // Generate the last 12 months dynamically
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const key = `month-${d.getFullYear()}-${d.getMonth()}`;
      options.push({ key, label });
    }
    return options;
  }, []);

  const filteredDepositsAndWithdrawals = useMemo(() => {
    const now = new Date();
    const filterFn = (item) => {
      const date = new Date(item.createdAt);
      if (metricsTimeframe === 'thisYear') {
        const startOfThisYear = new Date(now.getFullYear(), 0, 1);
        return date >= startOfThisYear;
      }
      if (String(metricsTimeframe).startsWith('month-')) {
        const parts = String(metricsTimeframe).split('-');
        const year = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10); // 0-indexed month
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return date >= startOfMonth && date <= endOfMonth;
      }
      return true; // 'allTime'
    };

    const deposits = (data.deposits || []).filter((d) => (d.status === 'approved' || d.status === 'completed') && filterFn(d));
    const withdrawals = (data.withdrawals || []).filter((w) => (w.status === 'approved' || w.status === 'completed') && filterFn(w));

    const totalDeposits = deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);

    return {
      totalDeposits,
      totalWithdrawals,
      netCashFlow: totalDeposits - totalWithdrawals,
    };
  }, [data.deposits, data.withdrawals, metricsTimeframe]);

  const totalApprovedDeposits = filteredDepositsAndWithdrawals.totalDeposits;
  const totalApprovedWithdrawals = filteredDepositsAndWithdrawals.totalWithdrawals;
  const netCashFlow = filteredDepositsAndWithdrawals.netCashFlow;

  const totalClosedProfit = useMemo(() => (
    data.trades.filter((t) => t.status === 'closed').reduce((sum, t) => sum + Number(t.profit || 0), 0)
  ), [data.trades]);

  const chartTimeframeData = useMemo(() => {
    const counts = {};
    const depositAmounts = {};
    const withdrawalAmounts = {};
    const profitAmounts = {};
    const lossAmounts = {};
    const dates = [];

    const now = new Date();
    let isYearScale = false;

    if (metricsTimeframe === 'thisYear') {
      isYearScale = true;
      for (let m = 0; m < 12; m++) {
        const d = new Date(now.getFullYear(), m, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts[key] = 0;
        depositAmounts[key] = 0;
        withdrawalAmounts[key] = 0;
        profitAmounts[key] = 0;
        lossAmounts[key] = 0;
        dates.push({ label, key });
      }
    } else if (metricsTimeframe === 'allTime') {
      isYearScale = true;
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts[key] = 0;
        depositAmounts[key] = 0;
        withdrawalAmounts[key] = 0;
        profitAmounts[key] = 0;
        lossAmounts[key] = 0;
        dates.push({ label, key });
      }
    } else if (String(metricsTimeframe).startsWith('month-')) {
      const parts = String(metricsTimeframe).split('-');
      const year = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10);
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const key = metricDateKey(d);
        counts[key] = 0;
        depositAmounts[key] = 0;
        withdrawalAmounts[key] = 0;
        profitAmounts[key] = 0;
        lossAmounts[key] = 0;
        dates.push({ label, key });
      }
    }

    // Registrations include all clients; deposits and trade performance below
    // remain restricted to Live accounts.
    data.users.filter((u) => u.role === 'user').forEach((u) => {
      if (u.createdAt) {
        const key = metricDateKey(u.createdAt, isYearScale);
        if (counts[key] !== undefined) counts[key]++;
      }
    });

    // Populate Deposits vs Withdrawals (Live accounts only)
    const liveUsers = data.users.filter((u) => u.role === 'user' && (u.tradingAccounts || []).some((account) => account.type === 'Live'));
    const liveUserIds = new Set(liveUsers.map((u) => String(u.id)));
    const liveAccountIds = new Set(liveUsers.flatMap((u) => (u.tradingAccounts || []).filter((account) => account.type === 'Live').map((account) => String(account.id))));
    const belongsToLiveTrading = (item) => item.tradingAccountId ? liveAccountIds.has(String(item.tradingAccountId)) : liveUserIds.has(String(item.userId));
    (data.deposits || []).filter((d) => (d.status === 'approved' || d.status === 'completed') && belongsToLiveTrading(d)).forEach((d) => {
      if (d.createdAt) {
        const key = metricDateKey(d.createdAt, isYearScale);
        if (depositAmounts[key] !== undefined) depositAmounts[key] += Number(d.amount || 0);
      }
    });
    (data.withdrawals || []).filter((w) => (w.status === 'approved' || w.status === 'completed') && belongsToLiveTrading(w)).forEach((w) => {
      if (w.createdAt) {
        const key = metricDateKey(w.createdAt, isYearScale);
        if (withdrawalAmounts[key] !== undefined) withdrawalAmounts[key] += Number(w.amount || 0);
      }
    });

    // Populate Traders Profit vs Loss (Live accounts only)
    (data.trades || []).filter((t) => t.status === 'closed' && belongsToLiveTrading(t)).forEach((t) => {
      const closedAt = t.closedAt || t.updatedAt || t.createdAt;
      if (closedAt) {
        const key = metricDateKey(closedAt, isYearScale);
        const val = Number(t.profit || 0);
        if (val >= 0) {
          if (profitAmounts[key] !== undefined) profitAmounts[key] += val;
        } else {
          if (lossAmounts[key] !== undefined) lossAmounts[key] += Math.abs(val);
        }
      }
    });

    const dailyNewUsers = dates.map(d => ({ label: d.label, value: counts[d.key] }));
    const dailyDeposits = dates.map(d => ({ label: d.label, value: depositAmounts[d.key] }));
    const dailyWithdrawals = dates.map(d => ({ label: d.label, value: withdrawalAmounts[d.key] }));
    const dailyProfits = dates.map(d => ({ label: d.label, value: profitAmounts[d.key] }));
    const dailyLosses = dates.map(d => ({ label: d.label, value: lossAmounts[d.key] }));

    const dailyCashflow = dailyDeposits.map((dep, index) => ({
      label: dep.label,
      deposit: dep.value,
      withdrawal: dailyWithdrawals[index]?.value || 0,
    }));

    const dailyProfitLoss = dailyProfits.map((p, index) => ({
      label: p.label,
      profit: Math.round(p.value),
      loss: Math.round(dailyLosses[index]?.value || 0),
    }));

    return {
      dailyNewUsers,
      dailyDeposits,
      dailyWithdrawals,
      dailyCashflow,
      dailyProfitLoss,
    };
  }, [data.users, data.deposits, data.withdrawals, data.trades, metricsTimeframe]);

  const dailyNewUsers = chartTimeframeData.dailyNewUsers;
  const dailyDeposits = chartTimeframeData.dailyDeposits;
  const dailyWithdrawals = chartTimeframeData.dailyWithdrawals;
  const dailyCashflow = chartTimeframeData.dailyCashflow;
  const dailyProfitLoss = chartTimeframeData.dailyProfitLoss;

  const todayRegistrations = useMemo(() => {
    const selectedDate = registrationDateFilter.trim();
    return data.users
      .filter((user) => {
        if (user.role !== 'user') return false;
        if (!selectedDate) return true;
        const registeredAt = new Date(user.createdAt || 0);
        const localDate = `${registeredAt.getFullYear()}-${String(registeredAt.getMonth() + 1).padStart(2, '0')}-${String(registeredAt.getDate()).padStart(2, '0')}`;
        return !Number.isNaN(registeredAt.getTime()) && localDate === selectedDate;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [data.users, registrationDateFilter]);

  const topEarners = useMemo(() => {
    const now = new Date();
    const filterFn = (item) => {
      const date = new Date(item.closedAt || item.updatedAt || item.createdAt);
      if (metricsTimeframe === 'thisYear') {
        const startOfThisYear = new Date(now.getFullYear(), 0, 1);
        return date >= startOfThisYear;
      }
      if (String(metricsTimeframe).startsWith('month-')) {
        const parts = String(metricsTimeframe).split('-');
        const year = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10);
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return date >= startOfMonth && date <= endOfMonth;
      }
      return true;
    };

    return [...data.users]
      .filter((u) => u.role === 'user' && (u.tradingAccounts || []).some((account) => account.type === 'Live'))
      .map((u) => {
        const profit = data.trades
          .filter(t => t.userId === u.id && t.status === 'closed' && filterFn(t))
          .reduce((sum, t) => sum + Number(t.profit || 0), 0);
        return { user: u, value: profit };
      })
      .sort((a, b) => b.value - a.value)
  }, [data.users, data.trades, metricsTimeframe]);

  const topDepositors = useMemo(() => {
    const now = new Date();
    const filterFn = (item) => {
      const date = new Date(item.createdAt);
      if (metricsTimeframe === 'thisYear') {
        const startOfThisYear = new Date(now.getFullYear(), 0, 1);
        return date >= startOfThisYear;
      }
      if (String(metricsTimeframe).startsWith('month-')) {
        const parts = String(metricsTimeframe).split('-');
        const year = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10);
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return date >= startOfMonth && date <= endOfMonth;
      }
      return true;
    };

    return [...data.users]
      .filter((u) => u.role === 'user' && (u.tradingAccounts || []).some((account) => account.type === 'Live'))
      .map((u) => {
        const total = data.deposits
          .filter(d => d.userId === u.id && (d.status === 'approved' || d.status === 'completed') && filterFn(d))
          .reduce((sum, d) => sum + Number(d.amount || 0), 0);
        return { user: u, value: total };
      })
      .sort((a, b) => b.value - a.value)
  }, [data.users, data.deposits, metricsTimeframe]);

  const topWithdrawers = useMemo(() => {
    const now = new Date();
    const filterFn = (item) => {
      const date = new Date(item.createdAt);
      if (metricsTimeframe === 'thisYear') {
        const startOfThisYear = new Date(now.getFullYear(), 0, 1);
        return date >= startOfThisYear;
      }
      if (String(metricsTimeframe).startsWith('month-')) {
        const parts = String(metricsTimeframe).split('-');
        const year = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10);
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return date >= startOfMonth && date <= endOfMonth;
      }
      return true;
    };

    return [...data.users]
      .filter((u) => u.role === 'user' && (u.tradingAccounts || []).some((account) => account.type === 'Live'))
      .map((u) => {
        const total = data.withdrawals
          .filter(w => w.userId === u.id && (w.status === 'approved' || w.status === 'completed') && filterFn(w))
          .reduce((sum, w) => sum + Number(w.amount || 0), 0);
        return { user: u, value: total };
      })
      .sort((a, b) => b.value - a.value)
  }, [data.users, data.withdrawals, metricsTimeframe]);
  const filteredWalletUsers = useMemo(() => (
    data.users.filter((user) => user.role === 'user' && matchesSearch(walletSearchQuery, [
      user.name,
      user.email,
      user.phone,
      user.country,
      user.accountType,
      user.tradingStatus,
      user.tradingLevel,
      user.verificationStatus,
      user.wallet?.balance,
      user.wallet?.equity,
      user.wallet?.margin,
      ...(user.tradingAccounts || []).flatMap((account) => [account.name, account.type, account.status, account.balance]),
    ]))
  ), [data.users, walletSearchQuery]);
  const sortedWalletUsers = useMemo(() => {
    const list = [...filteredWalletUsers];
    if (walletSortBy === 'newest') return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    if (walletSortBy === 'oldest') return list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    if (walletSortBy === 'name-asc') return list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    if (walletSortBy === 'name-desc') return list.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));
    if (walletSortBy === 'balance-desc') return list.sort((a, b) => Number(b.wallet?.balance || 0) - Number(a.wallet?.balance || 0));
    if (walletSortBy === 'balance-asc') return list.sort((a, b) => Number(a.wallet?.balance || 0) - Number(b.wallet?.balance || 0));
    return list;
  }, [filteredWalletUsers, walletSortBy]);
  const filteredFunding = useMemo(() => {
    const valuesFor = (item) => [
      item.User?.name,
      item.User?.email,
      item.amount,
      item.currency,
      item.status,
      item.paymentMethod,
      item.referenceNumber,
      item.depositAddressLabel,
      item.depositAddress,
      item.withdrawalMethod,
      item.bankName,
      item.accountNumber,
      item.accountHolderName,
      item.createdAt,
    ];
    return {
      deposits: data.deposits.filter((item) => matchesSearch(depositSearchQuery, valuesFor(item))),
      withdrawals: data.withdrawals.filter((item) => matchesSearch(withdrawalSearchQuery, valuesFor(item))),
    };
  }, [data.deposits, data.withdrawals, depositSearchQuery, withdrawalSearchQuery]);
  const depositRequestGroups = useMemo(() => {
    const groups = [];
    const groupByUser = new Map();
    filteredFunding.deposits.forEach((item) => {
      const userId = item.User?.id || item.userId || item.User?.email || `deposit-${item.id}`;
      if (!groupByUser.has(userId)) {
        groupByUser.set(userId, {
          key: userId,
          user: item.User,
          userName: item.User?.name || item.User?.email || 'User',
          userEmail: item.User?.email || '',
          items: [],
          pendingCount: 0,
          totalAmount: 0,
          totalBonus: 0,
        });
        groups.push(groupByUser.get(userId));
      }
      const group = groupByUser.get(userId);
      group.items.push(item);
      if (String(item.status || '').toLowerCase() === 'approved') {
        group.totalAmount += Number(item.amount || 0);
        group.totalBonus += Number(item.bonus || 0);
      }
      if (item.status === 'pending') group.pendingCount += 1;
    });

    if (depositSortBy === 'name-asc') {
      return groups.sort((a, b) => String(a.userName).localeCompare(String(b.userName)));
    }
    if (depositSortBy === 'name-desc') {
      return groups.sort((a, b) => String(b.userName).localeCompare(String(a.userName)));
    }
    if (depositSortBy === 'deposits-desc') {
      return groups.sort((a, b) => b.items.length - a.items.length);
    }
    if (depositSortBy === 'amount-desc') {
      return groups.sort((a, b) => b.totalAmount - a.totalAmount);
    }
    if (depositSortBy === 'pending-first') {
      return groups.sort((a, b) => b.pendingCount - a.pendingCount);
    }
    // 'newest' (default)
    return groups.sort((a, b) => {
      const aMax = Math.max(...a.items.map(item => Date.parse(item.createdAt) || 0));
      const bMax = Math.max(...b.items.map(item => Date.parse(item.createdAt) || 0));
      return bMax - aMax;
    });
  }, [filteredFunding.deposits, depositSortBy]);
  const withdrawalRequestGroups = useMemo(() => {
    const groups = [];
    const groupByUser = new Map();
    filteredFunding.withdrawals.forEach((item) => {
      const userId = item.User?.id || item.userId || item.User?.email || `withdrawal-${item.id}`;
      if (!groupByUser.has(userId)) {
        groupByUser.set(userId, {
          key: userId,
          user: item.User,
          userName: item.User?.name || item.User?.email || 'User',
          userEmail: item.User?.email || '',
          items: [],
          pendingCount: 0,
          totalAmount: 0,
        });
        groups.push(groupByUser.get(userId));
      }
      const group = groupByUser.get(userId);
      group.items.push(item);
      if (String(item.status || '').toLowerCase() === 'approved') {
        group.totalAmount += Number(item.amount || 0);
      }
      if (item.status === 'pending') group.pendingCount += 1;
    });

    if (withdrawalSortBy === 'name-asc') {
      return groups.sort((a, b) => String(a.userName).localeCompare(String(b.userName)));
    }
    if (withdrawalSortBy === 'name-desc') {
      return groups.sort((a, b) => String(b.userName).localeCompare(String(a.userName)));
    }
    if (withdrawalSortBy === 'deposits-desc') {
      return groups.sort((a, b) => b.items.length - a.items.length);
    }
    if (withdrawalSortBy === 'amount-desc') {
      return groups.sort((a, b) => b.totalAmount - a.totalAmount);
    }
    if (withdrawalSortBy === 'pending-first') {
      return groups.sort((a, b) => b.pendingCount - a.pendingCount);
    }
    // 'newest' (default)
    return groups.sort((a, b) => {
      const aMax = Math.max(...a.items.map(item => Date.parse(item.createdAt) || 0));
      const bMax = Math.max(...b.items.map(item => Date.parse(item.createdAt) || 0));
      return bMax - aMax;
    });
  }, [filteredFunding.withdrawals, withdrawalSortBy]);
  const filteredBankAccounts = useMemo(() => (
    data.bankAccounts.filter((item) => matchesSearch(withdrawalDetailsSearchQuery, [
      item.User?.name,
      item.User?.email,
      item.status,
      payoutTypeFor(item),
      item.accountHolderName,
      item.bankName,
      item.branchName,
      item.accountNumber,
      item.createdAt,
    ]))
  ), [data.bankAccounts, withdrawalDetailsSearchQuery]);
  const filteredUserLevelClients = useMemo(() => (
    data.users.filter((user) => user.role === 'user' && matchesSearch(userLevelsSearchQuery, [
      user.name,
      user.email,
      user.phone,
      user.country,
      user.accountType,
      user.tradingLevel,
      liveAccountDepositTotal(user),
      user.accountStats?.liveBalance,
    ]))
  ), [data.users, userLevelsSearchQuery]);
  const lowMarginUsers = useMemo(() => (
    data.users
      .filter((user) => {
        const marginLevel = marginLevelFor(user);
        return user.role === 'user' && user.accountType === 'Live' && marginLevel !== null && marginLevel < 50;
      })
      .sort((first, second) => marginLevelFor(first) - marginLevelFor(second))
  ), [data.users]);
  const marginLevelUsers = useMemo(() => (
    data.users
      .filter((user) => user.role === 'user')
      .map((user) => {
        const marginLevel = marginLevelFor(user);
        const usedMargin = Number(user.wallet?.margin || 0);
        const category = marginLevel === null
          ? 'idle'
          : marginLevel < 50
            ? 'below'
            : marginLevel < 100
              ? 'mid'
              : marginLevel < 200
                ? 'healthy'
                : 'above';
        return { user, marginLevel, usedMargin, category };
      })
      .sort((first, second) => {
        if (first.marginLevel === null && second.marginLevel === null) return 0;
        if (first.marginLevel === null) return 1;
        if (second.marginLevel === null) return -1;
        return first.marginLevel - second.marginLevel;
      })
  ), [data.users]);
  const filteredLowMarginUsers = useMemo(() => (
    marginLevelUsers.filter(({ user, category, marginLevel }) => {
      const filterMatch = marginAlertFilter === 'all'
        || (marginAlertFilter === 'active' && category !== 'idle')
        || (marginAlertFilter === 'below' && category === 'below')
        || (marginAlertFilter === 'mid' && category === 'mid')
        || (marginAlertFilter === 'healthy' && category === 'healthy')
        || (marginAlertFilter === 'above' && category === 'above')
        || (marginAlertFilter === 'idle' && category === 'idle');
      return filterMatch && matchesSearch(lowMarginSearchQuery, [
        user.name,
        user.email,
        user.phone,
        user.country,
        user.accountType,
        user.tradingStatus,
        user.wallet?.balance,
        user.wallet?.equity,
        user.wallet?.margin,
        marginLevel,
      ]);
    })
  ), [lowMarginSearchQuery, marginAlertFilter, marginLevelUsers]);
  const filteredTrades = useMemo(() => (
    data.trades.filter((trade) => matchesSearch(tradesSearchQuery, [
      trade.User?.name,
      trade.User?.email,
      trade.symbol,
      trade.side,
      trade.lots,
      trade.status,
      trade.openPrice,
      trade.closePrice,
      trade.profit,
      trade.createdAt,
    ]))
  ), [data.trades, tradesSearchQuery]);
  const depositAddressGroups = useMemo(() => (
    groupBy(data.depositMethodAddresses, (item) => item.paymentMethod)
  ), [data.depositMethodAddresses]);
  const withdrawalDetailGroups = useMemo(() => (
    groupBy(filteredBankAccounts, payoutTypeFor)
  ), [filteredBankAccounts]);
  const newUserCount = useMemo(() => (
    data.users.filter((user) => (
      user.role === 'user'
      && isRecentUser(user)
      && dateMs(loginNotificationAt(user)) > adminNotificationBaselineMs
      && !viewedNewUserIds.includes(loginNotificationKey(user))
    )).length
  ), [adminNotificationBaselineMs, data.users, viewedNewUserIds]);

  const liveAccountTotal = useMemo(() => totalLiveAccountBalance(data.users), [data.users]);

  const isNewAdminNotification = useCallback((...values) => (
    values.some((value) => dateMs(value) > adminNotificationBaselineMs)
  ), [adminNotificationBaselineMs]);
  const adminNotifications = useMemo(() => {
    const items = [];
    data.users
      .filter((user) => (
        user.role === 'user'
        && isRecentUser(user)
        && isNewAdminNotification(loginNotificationAt(user))
        && !viewedNewUserIds.includes(loginNotificationKey(user))
      ))
      .slice(0, 6)
      .forEach((user) => {
        items.push({
          id: `user-${user.id}`,
          Icon: UserRound,
          title: 'New User Account',
          body: `${user.name || user.email || 'User'} created a new account.`,
          at: loginNotificationAt(user),
          time: dateTime(loginNotificationAt(user)),
          tone: colors.primary,
          onPress: () => {
            markNewUserViewed(user);
            setNotificationsOpen(false);
            setSection('userManagement');
          },
        });
      });
    data.users
      .filter((user) => (
        user.role === 'user'
        && user.verificationStatus === 'pending'
        && isNewAdminNotification(user.updatedAt, user.createdAt)
      ))
      .slice(0, 6)
      .forEach((user) => {
        items.push({
          id: `verification-${user.id}`,
          Icon: ShieldCheck,
          title: 'Verification Request',
          body: `${user.name || user.email || 'User'} uploaded verification documents.`,
          at: user.updatedAt || user.createdAt,
          time: dateTime(user.updatedAt || user.createdAt),
          tone: colors.primary,
          onPress: () => {
            setNotificationsOpen(false);
            setSection('verifications');
            openVerification(user);
          },
        });
      });
    data.deposits
      .filter((item) => item.status === 'pending' && isNewAdminNotification(item.createdAt, item.updatedAt))
      .slice(0, 6)
      .forEach((item) => {
        items.push({
          id: `deposit-${item.id}`,
          Icon: Wallet,
          title: 'New Deposit Request',
          body: `${item.User?.name || item.User?.email || 'User'} requested ${money(item.amount)} USD deposit approval.`,
          at: item.createdAt,
          time: dateTime(item.createdAt),
          tone: colors.success,
          onPress: () => {
            setNotificationsOpen(false);
            setSection('deposits');
            setDepositSubpage('deposits');
            setExpandedDepositUsers((current) => ({ ...current, [fundingGroupKeyFor(item, 'deposit')]: true }));
            openFundingReview('deposits', item);
            scrollToAdminTarget(`funding-review-deposits-${item.id}`, 520);
          },
        });
      });
    data.withdrawals
      .filter((item) => item.status === 'pending' && isNewAdminNotification(item.createdAt, item.updatedAt))
      .slice(0, 6)
      .forEach((item) => {
        items.push({
          id: `withdrawal-${item.id}`,
          Icon: AlertTriangle,
          title: 'New Withdrawal Request',
          body: `${item.User?.name || item.User?.email || 'User'} requested ${money(item.amount)} USD withdrawal approval.`,
          at: item.createdAt,
          time: dateTime(item.createdAt),
          tone: colors.danger,
          onPress: () => {
            setNotificationsOpen(false);
            setSection('withdrawals');
            setWithdrawalSubpage('withdrawals');
            setExpandedWithdrawalUsers((current) => ({ ...current, [fundingGroupKeyFor(item, 'withdrawal')]: true }));
            openFundingReview('withdrawals', item);
            scrollToAdminTarget(`funding-review-withdrawals-${item.id}`, 520);
          },
        });
      });
    data.bankAccounts
      .filter((item) => ['pending', 'delete_pending'].includes(item.status) && isNewAdminNotification(item.updatedAt, item.createdAt))
      .slice(0, 6)
      .forEach((item) => {
        items.push({
          id: `bank-${item.id}`,
          Icon: CreditCard,
          title: item.status === 'delete_pending' ? 'Withdrawal Detail Delete Request' : 'Account Details Pending',
          body: `${item.User?.name || item.User?.email || 'User'} submitted ${payoutTypeFor(item)} withdrawal details.`,
          at: item.createdAt,
          time: dateTime(item.createdAt),
          tone: colors.primary,
          onPress: () => {
            setNotificationsOpen(false);
            setSection('withdrawals');
            setWithdrawalSubpage('details');
            setExpandedWithdrawalDetailGroups((current) => ({ ...current, [payoutTypeFor(item)]: true }));
            scrollToAdminTarget(`bank-item-${item.id}`, 420);
          },
        });
      });
    (data.referralRewards || [])
      .filter((item) => item.status === 'pending' && isNewAdminNotification(item.createdAt, item.updatedAt))
      .slice(0, 6)
      .forEach((item) => {
        items.push({
          id: `referral-${item.id}`,
          Icon: UsersRound,
          title: 'Pending Referral Reward',
          body: `${item.referrer?.name || item.referrer?.email || 'User'} referred ${item.referee?.name || item.referee?.email || 'User'} who deposited. Reward: $${money(item.amount)} USD.`,
          at: item.createdAt,
          time: dateTime(item.createdAt),
          tone: colors.primary,
          onPress: () => {
            setNotificationsOpen(false);
            setSection('referrals');
          },
        });
      });
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    (data.birthdays || [])
      .forEach((user) => {
        items.push({
          id: `bd-${user.id}-${today.getFullYear()}`,
          Icon: Bell,
          title: 'User Birthday',
          body: `Today is ${user.name || user.email || 'User'}'s birthday! A $200 bonus is pending.`,
          at: new Date().toISOString(),
          time: 'Today',
          tone: colors.success,
          onPress: () => {
            setBirthdayBonusUser(user);
            setBirthdayBonusAmount('200');
            setNotificationsOpen(false);
          },
        });
      });

    return items
      .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
      .slice(0, 18);
  }, [colors.danger, colors.primary, colors.success, data.bankAccounts, data.birthdays, data.deposits, data.users, data.withdrawals, data.referralRewards, isNewAdminNotification, viewedNewUserIds]);
  const adminNotificationCount = adminNotifications.length;

  const markNewUserViewed = (user) => {
    if (!user?.id || !isRecentUser(user)) return;
    setViewedNewUserIds((current) => {
      const key = loginNotificationKey(user);
      if (current.includes(key)) return current;
      const next = [...current, key];
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(viewedNewUsersStorageKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const markAllAdminNotificationsRead = () => {
    const now = Date.now();
    setAdminNotificationBaselineMs(now);
    setViewedNewUserIds((current) => {
      const loginKeys = data.users
        .filter((user) => user.role === 'user' && isRecentUser(user))
        .map(loginNotificationKey);
      const next = Array.from(new Set([...current, ...loginKeys]));
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(adminNotificationBaselineKey, String(now));
          window.localStorage.setItem(viewedNewUsersStorageKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
    setNotificationsOpen(false);
  };

  const action = async (id, request, success, closeModal) => {
    setBusyId(id);
    setMessage('');
    setError('');
    try {
      await request();
      await load();
      setMessage(success);
      if (closeModal) closeModal();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The admin action could not be completed.');
    } finally {
      setBusyId(null);
    }
  };

  const openWallet = async (user, account) => {
    setWalletModal({ user, account, loading: true, wallet: null });
    try {
      const result = await api.get(`/admin/users/${user.id}/wallet`, {
        params: account?.id ? { tradingAccountId: account.id } : undefined,
      });
      setWalletModal({ user: result.data.user, account: result.data.account || account, loading: false, wallet: result.data.wallet });
    } catch (requestError) {
      setWalletModal(null);
      setError(requestError.response?.data?.message || 'Unable to load wallet.');
    }
  };

  const openTransactions = async (user, account) => {
    setTransactionsModal({ user, account, loading: true, transactions: [] });
    try {
      const result = await api.get(`/admin/users/${user.id}/transactions`, {
        params: account?.id ? { tradingAccountId: account.id } : undefined,
      });
      setTransactionsModal({ user: result.data.user, account: result.data.account || account, loading: false, transactions: result.data.transactions });
    } catch (requestError) {
      setTransactionsModal(null);
      setError(requestError.response?.data?.message || 'Unable to load transaction history.');
    }
  };

  const openUserOverview = async (user) => {
    if (!user?.id) return;
    setUserOverviewModal({ user, loading: true, data: null });
    try {
      const result = await api.get(`/admin/users/${user.id}/overview`);
      setUserOverviewModal({ user: result.data.user, loading: false, data: result.data });
    } catch (requestError) {
      setUserOverviewModal(null);
      setError(requestError.response?.data?.message || 'Unable to load user details.');
    }
  };

  const openVerification = async (user) => {
    if (!user?.id) return;
    setVerificationDocumentTab('all');
    setVerificationImageZoom(null);
    setVerificationUploadFiles({ id: null, address: null });
    setVerificationUser({ ...user, loading: true });
    try {
      const result = await api.get(`/admin/users/${user.id}/verification`, { timeout: 45000 });
      setVerificationUser({ ...result.data.user, loading: false });
    } catch (requestError) {
      setVerificationUser(null);
      setError(requestError.response?.data?.message || 'Unable to load verification documents.');
    }
  };

  const uploadVerificationDocuments = async () => {
    if (!verificationUser?.id || !verificationUploadFiles.id || !verificationUploadFiles.address) { setError('Select both ID proof and address proof images.'); return; }
    setVerificationUploadBusy(true);
    try {
      const [idProofImage, addressProofImage] = await Promise.all([kycImageDataUrl(verificationUploadFiles.id), kycImageDataUrl(verificationUploadFiles.address)]);
      const result = await api.put(`/admin/users/${verificationUser.id}/verification/documents`, { idProofImage, addressProofImage });
      setVerificationUser({ ...result.data.user, loading: false }); setVerificationUploadFiles({ id: null, address: null }); await load({ silent: true }); setMessage(result.data.message || 'Verification documents submitted for review.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to upload verification documents.'); } finally { setVerificationUploadBusy(false); }
  };

  const openDepositDetails = async (item) => {
    if (!item?.id) return;
    setDepositDetails({ ...item, loading: true });
    try {
      const result = await api.get(`/admin/deposits/${item.id}`);
      const deposit = { ...result.data.deposit, loading: false };
      setDepositDetails(deposit);
      setDepositEditForm(depositEditValues(deposit));
    } catch (requestError) {
      setDepositDetails(null);
      setError(requestError.response?.data?.message || 'Unable to load deposit details.');
    }
  };

  const openFundingReview = async (type, item) => {
    if (!item?.id) return;
    const reviewKey = `${type}-${item.id}`;
    const currentKey = fundingReview ? `${fundingReview.type}-${fundingReview.item?.id}` : '';
    if (currentKey === reviewKey) {
      closeFundingReview();
      return;
    }
    setError('');
    if (type === 'deposits') {
      cancelWithdrawalEdit();
      setFundingReview({ type, item: { ...item, loading: true } });
      try {
        const result = await api.get(`/admin/deposits/${item.id}`);
        const deposit = { ...result.data.deposit, loading: false };
        setFundingReview({ type, item: deposit });
        setDepositEditForm(depositEditValues(deposit));
      } catch (requestError) {
        setFundingReview(null);
        setError(requestError.response?.data?.message || 'Unable to load deposit details.');
      }
      return;
    }
    setDepositEditForm(depositEditValues());
    setFundingReview({ type, item });
    setWithdrawalEditId(item.id);
    setWithdrawalEditForm(withdrawalEditValues(item));
  };

  const closeFundingReview = () => {
    if (fundingReview?.type === 'withdrawals') cancelWithdrawalEdit();
    setFundingReview(null);
    setDepositEditForm(depositEditValues());
  };

  const saveDepositDetails = async () => {
    if (!depositDetails?.id) return;
    const amount = Number(depositEditForm.amount);
    const bonus = Number(depositEditForm.bonus || 0);
    if (!(amount > 0)) {
      setError('Deposit amount must be greater than zero.');
      return;
    }
    if (bonus < 0) {
      setError('Bonus cannot be negative.');
      return;
    }
    if (!depositEditForm.paymentMethod.trim()) {
      setError('Payment method is required.');
      return;
    }
    setBusyId(depositDetails.id);
    setMessage('');
    setError('');
    try {
      const result = await api.put(`/admin/deposits/${depositDetails.id}`, {
        ...depositEditForm,
        amount,
        bonus,
      });
      const deposit = { ...result.data.deposit, loading: false };
      setDepositDetails(deposit);
      setDepositEditForm(depositEditValues(deposit));
      await load({ silent: true });
      setMessage('Deposit request updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update deposit request.');
    } finally {
      setBusyId(null);
    }
  };

  const saveDepositReviewDetails = async () => {
    const item = fundingReview?.type === 'deposits' ? fundingReview.item : null;
    if (!item?.id) return;
    const amount = Number(depositEditForm.amount);
    const bonus = Number(depositEditForm.bonus || 0);
    if (!(amount > 0)) {
      setError('Deposit amount must be greater than zero.');
      return;
    }
    if (bonus < 0) {
      setError('Bonus cannot be negative.');
      return;
    }
    if (!depositEditForm.paymentMethod.trim()) {
      setError('Payment method is required.');
      return;
    }
    setBusyId(item.id);
    setMessage('');
    setError('');
    try {
      const result = await api.put(`/admin/deposits/${item.id}`, {
        ...depositEditForm,
        amount,
        bonus,
      });
      const deposit = { ...result.data.deposit, loading: false };
      setFundingReview({ type: 'deposits', item: deposit });
      setDepositEditForm(depositEditValues(deposit));
      await load({ silent: true });
      setMessage('Deposit request updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update deposit request.');
    } finally {
      setBusyId(null);
    }
  };

  const editWithdrawal = (item) => {
    setWithdrawalEditId(item.id);
    setWithdrawalEditForm(withdrawalEditValues(item));
    setError('');
  };

  const cancelWithdrawalEdit = () => {
    setWithdrawalEditId(null);
    setWithdrawalEditForm(withdrawalEditValues());
  };

  const saveWithdrawalDetails = async (item) => {
    const amount = Number(withdrawalEditForm.amount);
    if (!(amount > 0)) {
      setError('Withdrawal amount must be greater than zero.');
      return;
    }
    if (!withdrawalEditForm.bankName.trim() || !withdrawalEditForm.accountNumber.trim() || !withdrawalEditForm.accountHolderName.trim()) {
      setError('Account holder, bank name and account number are required.');
      return;
    }
    setBusyId(item.id);
    setMessage('');
    setError('');
    try {
      await api.put(`/admin/withdrawals/${item.id}`, {
        ...withdrawalEditForm,
        amount,
      });
      cancelWithdrawalEdit();
      await load({ silent: true });
      setMessage('Withdrawal request updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update withdrawal request.');
    } finally {
      setBusyId(null);
    }
  };

  const saveWithdrawalReviewDetails = async (item) => {
    const amount = Number(withdrawalEditForm.amount);
    if (!(amount > 0)) {
      setError('Withdrawal amount must be greater than zero.');
      return;
    }
    if (!withdrawalEditForm.bankName.trim() || !withdrawalEditForm.accountNumber.trim() || !withdrawalEditForm.accountHolderName.trim()) {
      setError('Account holder, bank name and account number are required.');
      return;
    }
    setBusyId(item.id);
    setMessage('');
    setError('');
    try {
      await api.put(`/admin/withdrawals/${item.id}`, {
        ...withdrawalEditForm,
        amount,
      });
      const updated = { ...item, ...withdrawalEditForm, amount };
      setFundingReview({ type: 'withdrawals', item: updated });
      setWithdrawalEditForm(withdrawalEditValues(updated));
      await load({ silent: true });
      setMessage('Withdrawal request updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update withdrawal request.');
    } finally {
      setBusyId(null);
    }
  };

  const updateBalance = ({ operation, amount, bonus, note }) => {
    const endpoint = operation === 'add_balance' ? 'add-balance' : 'deduct-balance';
    return action(
      balanceModal.user.id,
      () => api.put(`/admin/users/${balanceModal.user.id}/${endpoint}`, {
        amount,
        bonus,
        note,
        tradingAccountId: balanceModal.account?.id,
      }),
      operation === 'add_balance' ? 'Balance added successfully.' : 'Balance deducted successfully.',
      () => setBalanceModal(null),
    );
  };

  const resetDemo = (user) => action(user.id, () => api.put(`/admin/users/${user.id}/reset-demo`), 'Demo account balance reset to $5,000.', () => setSettingsUser(null));

  const resetTradingAccount = (user, account) => {
    if (account?.type === 'Live') {
      return action(
        user.id,
        () => api.put(`/admin/users/${user.id}/trading-accounts/${account.id}/reset-live`),
        'Live account balance reset to $0.',
      );
    }
    return resetDemo(user);
  };

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  const saveAdminProfile = async (values, onSuccess) => {
    const field = Object.prototype.hasOwnProperty.call(values, 'profileImage')
      ? 'profileImage'
      : Object.prototype.hasOwnProperty.call(values, 'email') ? 'email' : 'name';
    const label = field === 'profileImage' ? 'profile photo' : field;
    const isStaff = ['agent', 'manager', 'master'].includes(adminUser?.role);
    const endpoint = isStaff ? '/users/profile' : '/admin/profile';
    const displayRole = adminUser?.role === 'master' ? 'Master' : adminUser?.role === 'agent' ? 'Agent' : adminUser?.role === 'manager' ? 'Manager' : 'Admin';
    setBusyId(`profile-${field}`);
    setMessage('');
    setError('');
    setAdminProfileError('');
    try {
      if (adminUser?.role === 'master') await updateProfile(values);
      else {
        await api.put(endpoint, values);
        await refreshUser();
      }
      setMessage(`${displayRole} ${label} saved.`);
      if (onSuccess) onSuccess();
    } catch (requestError) {
      setAdminProfileError(requestError.response?.data?.message || `${displayRole} profile could not be updated.`);
    } finally {
      setBusyId(null);
    }
  };

  const changeAdminPassword = async (values, onSuccess) => {
    const isStaff = ['agent', 'manager', 'master'].includes(adminUser?.role);
    const endpoint = isStaff ? '/users/password' : '/admin/profile/password';
    const displayRole = adminUser?.role === 'master' ? 'Master' : adminUser?.role === 'agent' ? 'Agent' : adminUser?.role === 'manager' ? 'Manager' : 'Admin';
    const payload = isStaff
      ? { currentPassword: values.currentPassword, newPassword: values.password, confirmPassword: values.password }
      : values;
    setBusyId('profile-password');
    setMessage('');
    setError('');
    setAdminProfileError('');
    try {
      await api.put(endpoint, payload);
      setMessage(`${displayRole} password changed.`);
      if (onSuccess) onSuccess();
    } catch (requestError) {
      setAdminProfileError(requestError.response?.data?.message || `${displayRole} password could not be changed.`);
    } finally {
      setBusyId(null);
    }
  };

  const saveSettings = ({ leverage, adminNotes }) => action(
    settingsUser.id,
    () => Promise.all([
      api.put(`/admin/users/${settingsUser.id}/leverage`, { leverage }),
      api.put(`/admin/users/${settingsUser.id}/notes`, { adminNotes }),
    ]),
    'User account settings saved.',
    () => setSettingsUser(null),
  );

  const saveUserLeverage = (user, leverage) => action(
    user.id,
    () => api.put(`/admin/users/${user.id}/leverage`, { leverage }),
    'User leverage updated.',
  );

  const saveTradingAccountLeverage = (user, account, leverage) => action(
    user.id,
    () => api.put(`/admin/users/${user.id}/trading-accounts/${account.id}/leverage`, { leverage }),
    'Trading account leverage updated.',
  );

  const saveUserTradingLevel = (user, tradingLevel) => action(
    user.id,
    () => api.put(`/admin/users/${user.id}/trading-level`, { tradingLevel }),
    'User trading level updated.',
  );

  const saveUserTradingStatus = (user, tradingStatus) => action(
    user.id,
    () => api.put(`/admin/users/${user.id}/trading-status`, { tradingStatus }),
    tradingStatus === 'frozen' ? 'User account frozen.' : 'User account unfrozen.',
  );

  const saveTradingAccountStatus = (user, account, status) => action(
    user.id,
    () => api.put(`/admin/users/${user.id}/trading-accounts/${account.id}/status`, { status }),
    status === 'disabled' ? 'Trading account frozen.' : 'Trading account unfrozen.',
  );

  const deleteTradingAccount = (user, account) => action(
    user.id,
    () => api.delete(`/admin/users/${user.id}/trading-accounts/${account.id}`),
    `${account.name || account.type || 'Trading'} account deleted.`,
  );

  const createManagedUser = async (values) => {
    setBusyId('create-user');
    setMessage('');
    setError('');
    try {
      await api.post('/admin/users', values);
      await load();
      setMessage('User account created.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create user account.');
      throw requestError;
    } finally {
      setBusyId(null);
    }
  };

  const updateManagedUser = async (id, values) => {
    setBusyId(id);
    setMessage('');
    setError('');
    try {
      await api.put(`/admin/users/${id}`, values);
      await load();
      setMessage('User details updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update user details.');
      throw requestError;
    } finally {
      setBusyId(null);
    }
  };

  const removeManagedUser = async (user) => {
    setBusyId(user.id);
    setMessage('');
    setError('');
    try {
      await api.delete(`/admin/users/${user.id}`);
      await load();
      setMessage('User account removed.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove user account.');
    } finally {
      setBusyId(null);
    }
  };

  const reviewFunding = (type, item, decision, closeAfter) => {
    const depositPayload = type === 'deposits'
      ? {
          ...depositEditForm,
          amount: Number(depositEditForm.amount || item.amount),
          bonus: Number(depositEditForm.bonus || 0),
        }
      : null;
    if (type === 'deposits' && decision === 'approve') {
      if (!(depositPayload.amount > 0)) {
        setError('Deposit amount must be greater than zero.');
        return;
      }
      if (depositPayload.bonus < 0) {
        setError('Bonus cannot be negative.');
        return;
      }
      if (!String(depositPayload.paymentMethod || '').trim()) {
        setError('Payment method is required.');
        return;
      }
    }
    ask(
      `${decision === 'approve' ? 'Approve' : 'Reject'} this ${type === 'deposits' ? 'deposit' : 'withdrawal'} for ${type === 'deposits' ? depositAmountText({ ...item, ...depositPayload }) : `$${money(item.amount)}`}?`,
      () => action(
        item.id,
        () => api.put(`/admin/${type}/${item.id}/${decision}`, depositPayload || undefined),
        `${type === 'deposits' ? 'Deposit' : 'Withdrawal'} ${decision}d.`,
        closeAfter || (type === 'deposits' ? closeDepositDetails : undefined),
      ),
    );
  };

  const getBankFieldVal = (addressStr, fieldLabel) => {
    if (!addressStr) return '';
    const lines = addressStr.split('\n').map((l) => l.trim()).filter(Boolean);
    const found = lines.find((line) => {
      let k = line;
      if (line.includes(':-')) k = line.split(':-')[0];
      else if (line.includes(' - ')) k = line.split(' - ')[0];
      else if (line.includes('-')) k = line.split('-')[0];
      else if (line.includes(':')) k = line.split(':')[0];
      return k.trim().toUpperCase() === fieldLabel.toUpperCase();
    });
    if (found) {
      if (found.includes(':-')) return found.split(':-').slice(1).join(':-').trim();
      if (found.includes(' - ')) return found.split(' - ').slice(1).join(' - ').trim();
      if (found.includes('-')) return found.split('-').slice(1).join('-').trim();
      if (found.includes(':')) return found.split(':').slice(1).join(':').trim();
    }
    return '';
  };

  const setBankFieldVal = (currentForm, setFormState, fieldLabel, newVal) => {
    const labels = ['BANK NAME', 'NAME', 'ACCOUNT NUMBER', 'IFSC CODE', 'BRANCH', 'UPI'];
    const currentValues = {};
    labels.forEach((lbl) => {
      currentValues[lbl] = getBankFieldVal(currentForm.address, lbl);
    });
    currentValues[fieldLabel] = newVal;

    const newLines = [];
    labels.forEach((lbl) => {
      if (currentValues[lbl]?.trim()) {
        newLines.push(`${lbl} - ${currentValues[lbl].trim()}`);
      }
    });

    setFormState((prev) => ({ ...prev, address: newLines.join('\n') }));
  };

  const resetDepositAddressForm = () => setDepositAddressForm({ id: null, paymentMethod: 'TRC20', label: '', address: '', qrData: '', isActive: true });

  const saveDepositMethodAddress = async () => {
    if (!depositAddressForm.paymentMethod || !depositAddressForm.address.trim()) {
      setError('Payment method and address are required.');
      return;
    }
    setBusyId('deposit-method-address');
    setMessage('');
    setError('');
    try {
      const payload = {
        paymentMethod: depositAddressForm.paymentMethod,
        label: depositAddressForm.label,
        address: depositAddressForm.address,
        qrData: depositAddressForm.qrData,
        isActive: depositAddressForm.isActive,
      };
      await api.post('/admin/deposit-method-addresses', payload);
      resetDepositAddressForm();
      await load({ silent: true });
      setMessage('Deposit method address saved.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save deposit method address.');
    } finally {
      setBusyId(null);
    }
  };

  const saveDepositMethodAddressEdit = async () => {
    if (!depositAddressEditForm || !depositAddressEditForm.address.trim()) {
      setError('Address is required.');
      return;
    }
    setBusyId('deposit-method-address-edit');
    setMessage('');
    setError('');
    try {
      const payload = {
        paymentMethod: depositAddressEditForm.paymentMethod,
        label: depositAddressEditForm.label,
        address: depositAddressEditForm.address,
        qrData: depositAddressEditForm.qrData,
        isActive: depositAddressEditForm.isActive,
      };
      await api.put(`/admin/deposit-method-addresses/${depositAddressEditForm.id}`, payload);
      setDepositAddressEditForm(null);
      await load({ silent: true });
      setMessage('Deposit method address updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update deposit method address.');
    } finally {
      setBusyId(null);
    }
  };

  const editDepositMethodAddress = (item) => {
    setDepositAddressEditForm({
      id: item.id,
      paymentMethod: item.paymentMethod || 'TRC20',
      label: item.label || '',
      address: item.address || '',
      qrData: item.qrData || '',
      isActive: item.isActive !== false,
    });
    if (item.paymentMethod) {
      setDepositAddressForm((current) => ({ ...current, paymentMethod: item.paymentMethod }));
      setExpandedDepositAddressGroups({ [item.paymentMethod]: true });
    }
  };

  const cancelDepositAddressEdit = () => setDepositAddressEditForm(null);

  const deleteDepositMethodAddress = (item) => ask(
    `Delete this ${item.paymentMethod} deposit address?`,
    async () => {
      setBusyId(`delete-deposit-address-${item.id}`);
      setMessage('');
      setError('');
      try {
        await api.delete(`/admin/deposit-method-addresses/${item.id}`);
        if (depositAddressEditForm && depositAddressEditForm.id === item.id) {
          setDepositAddressEditForm(null);
        }
        await load({ silent: true });
        setMessage('Deposit method address deleted.');
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to delete deposit method address.');
      } finally {
        setBusyId(null);
      }
    },
  );

  const reviewVerification = (user, decision) => ask(
    `${decision === 'approve' ? 'Approve' : 'Reject'} this verification?`,
    () => action(
      user.id,
      () => api.put(`/admin/users/${user.id}/verification/${decision}`),
      decision === 'approve' ? 'Verification approved.' : 'Verification rejected.',
      () => setVerificationUser(null),
    ),
  );
  const reviewBankAccount = (item, decision) => ask(
    `${decision === 'approve' ? 'Approve' : 'Reject'} ${item.status === 'delete_pending' ? 'this delete request' : `${payoutTypeFor(item)} withdrawal details`} for ${item.User?.name || item.User?.email || 'this user'}?`,
    () => action(
      item.id,
      () => api.put(`/admin/bank-accounts/${item.id}/${decision}`),
      item.status === 'delete_pending'
        ? `${payoutTypeFor(item)} delete request ${decision === 'approve' ? 'approved' : 'rejected'}.`
        : `${payoutTypeFor(item)} withdrawal details ${decision}d.`,
    ),
  );
  const reviewReferralReward = (reward, decision) => {
    if (decision === 'approve') {
      // Open edit modal — admin can adjust amount before approving
      setReferralEditModal({ reward, amount: String(reward.amount || '') });
    } else {
      ask(
        `Reject referral reward of $${money(reward.amount)} USD for ${reward.referrer?.name || reward.referrer?.email || 'this user'}?`,
        () => action(
          reward.id,
          () => api.put(`/admin/referral-rewards/${reward.id}/reject`),
          'Referral reward rejected.',
        ),
      );
    }
  };
  const confirmReferralApprove = () => {
    if (!referralEditModal) return;
    const { reward, amount } = referralEditModal;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    setReferralEditModal(null);
    action(
      reward.id,
      () => api.put(`/admin/referral-rewards/${reward.id}/approve`, { amount: parsed }),
      'Referral reward approved.',
    );
  };
  const openDepositReceipt = (item) => {
    if (!item.receiptImage) return;
    setReceiptModal(item);
  };
  const closeDepositDetails = () => {
    setDepositDetails(null);
    setDepositEditForm(depositEditValues());
  };
  const downloadDepositReceipt = (item) => {
    if (!item.receiptImage || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const link = document.createElement('a');
    link.href = item.receiptImage;
    link.download = `deposit-receipt-${item.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const downloadVerificationImages = (user) => {
  const images = [
    user?.idProofImage,
    user?.addressProofImage,
  ].filter(Boolean);

  images.forEach((url, index) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `verification-${user.id}-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
};

  if (!isAdmin) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: colors.background }}>
        <Text className="mb-3 text-2xl font-medium" style={{ color: colors.text }}>Administrator Access</Text>
        <Text className="mb-6 text-center" style={{ color: colors.muted }}>Please login with an administrator account.</Text>
        <Link href="/login" asChild><Pressable className="rounded-xl bg-primary px-8 py-4"><Text className="font-medium text-medium">Login</Text></Pressable></Link>
      </View>
    );
  }

  const renderSearchBar = (value, onChangeText, placeholder, noMargin = false) => (
    <View className={noMargin ? "relative flex-1" : `relative ${mobile ? 'mb-2.5 w-full' : 'mb-4'}`}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={mobile ? 'Search...' : placeholder}
        placeholderTextColor={colors.muted}
        className={`${mobile ? 'h-9 rounded-2xl pl-8 pr-8 text-xs' : 'h-12 rounded-xl pl-11 pr-11 text-sm'} border`}
        style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16, color: colors.text }}
      />
      <View className={`absolute items-center justify-center ${mobile ? 'left-2.5 h-9 w-5' : 'left-4 h-12 w-6'}`}>
        <Search size={mobile ? 13 : 18} color={colors.muted} />
      </View>
      {value ? (
        <Pressable onPress={() => onChangeText('')} className={`absolute right-2.5 items-center justify-center rounded-2xl ${mobile ? 'top-1.5 h-6 w-6' : 'top-2.5 h-7 w-7'}`} style={{ backgroundColor: colors.surface }}>
          <X size={mobile ? 11 : 15} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );

  const walletSortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Name (A-Z)', value: 'name-asc' },
    { label: 'Name (Z-A)', value: 'name-desc' },
    { label: 'Balance (High-Low)', value: 'balance-desc' },
    { label: 'Balance (Low-High)', value: 'balance-asc' },
  ];

  const renderWalletSortDropdown = () => (
    <View ref={walletSortRef} style={{ position: 'relative' }}>
      <Pressable
        onPress={() => setWalletSortOpen((current) => !current)}
        className="h-9 flex-row items-center justify-between rounded-2xl border px-2.5"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <Text style={{ color: colors.text, fontSize: 11 }} numberOfLines={1}>
          {walletSortOptions.find((opt) => opt.value === walletSortBy)?.label || 'Sort By'}
        </Text>
        <ChevronDown size={14} color={colors.muted} style={{ transform: [{ rotate: walletSortOpen ? '180deg' : '0deg' }] }} />
      </Pressable>
      {walletSortOpen ? (
        <ScrollView
          nestedScrollEnabled
          className="absolute left-0 right-0 rounded-2xl border shadow-lg"
          style={{ top: 38, maxHeight: 200, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16, zIndex: 1000 }}
        >
          {walletSortOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                setWalletSortOpen(false);
                setWalletSortBy(option.value);
              }}
              className="px-3 py-2 border-b last:border-b-0"
              style={{ borderBottomColor: colors.border }}
            >
              <Text style={{ color: colors.text, fontSize: 11 }}>{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  const depositSortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Name (A-Z)', value: 'name-asc' },
    { label: 'Name (Z-A)', value: 'name-desc' },
    { label: 'Most Deposits', value: 'deposits-desc' },
    { label: 'Total Amount', value: 'amount-desc' },
    { label: 'Pending First', value: 'pending-first' },
  ];

  const withdrawalSortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Name (A-Z)', value: 'name-asc' },
    { label: 'Name (Z-A)', value: 'name-desc' },
    { label: 'Most Requests', value: 'deposits-desc' },
    { label: 'Total Amount', value: 'amount-desc' },
    { label: 'Pending First', value: 'pending-first' },
  ];

  const renderFundingSortDropdown = (type) => {
    const isDeposit = type === 'deposits';
    const sortBy = isDeposit ? depositSortBy : withdrawalSortBy;
    const setSortBy = isDeposit ? setDepositSortBy : setWithdrawalSortBy;
    const sortOpen = isDeposit ? depositSortOpen : withdrawalSortOpen;
    const setSortOpen = isDeposit ? setDepositSortOpen : setWithdrawalSortOpen;
    const options = isDeposit ? depositSortOptions : withdrawalSortOptions;
    const ref = isDeposit ? depositSortRef : withdrawalSortRef;

    return (
      <View ref={ref} style={{ position: 'relative' }}>
        <Pressable
          onPress={() => setSortOpen((current) => !current)}
          className="h-9 flex-row items-center justify-between rounded-2xl border px-2.5"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Text style={{ color: colors.text, fontSize: 11 }} numberOfLines={1}>
            {options.find((opt) => opt.value === sortBy)?.label || 'Sort By'}
          </Text>
          <ChevronDown size={14} color={colors.muted} style={{ transform: [{ rotate: sortOpen ? '180deg' : '0deg' }] }} />
        </Pressable>
        {sortOpen ? (
          <ScrollView
            nestedScrollEnabled
            className="absolute left-0 right-0 rounded-2xl border shadow-lg"
            style={{ top: 38, maxHeight: 200, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16, zIndex: 1000 }}
          >
            {options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setSortOpen(false);
                  setSortBy(option.value);
                }}
                className="px-3 py-2 border-b last:border-b-0"
                style={{ borderBottomColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontSize: 11 }}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
    );
  };

  const renderCards = () => (
    <View className={`flex-row flex-wrap ${mobile ? 'gap-2 mb-2.5' : 'gap-3 mb-4'}`}>
      <StatCard title="Frozen Accounts" value={String(data.stats.frozenAccounts || 0)} accent="text-danger" />
      <StatCard title="Total Wallet Funds" value={`$${money(liveAccountTotal)}`} />
      <StatCard title="Active Traders" value={String(data.stats.activeTraders || 0)} accent="text-success" />
      <StatCard title="Total Open Positions" value={String(data.stats.totalOpenPositions || 0)} accent="text-primary" />
    </View>
  );

  const renderFundingReviewModal = () => {
    if (!fundingReview) return null;
    const { type, item } = fundingReview;
    const reviewItem = item;
    const isDeposit = type === 'deposits';
    const isAdminBalance = Boolean(reviewItem.isAdminBalance);
    const adminDetails = isAdminBalance
      ? [
          ['Type', isDeposit ? 'Admin Deposit' : 'Admin Withdrawal'],
          ['Amount', `$${money(reviewItem.amount)} USD`],
          ...(isDeposit ? [['Bonus', `$${money(reviewItem.bonus)} USD`]] : []),
          ['Status', reviewItem.status || '-'],
          ['Reference', reviewItem.referenceNumber || reviewItem.accountNumber || reviewItem.id || '-'],
          ['Note', reviewItem.note || '-'],
          ['Created', dateTime(reviewItem.createdAt)],
        ]
      : [];

    return (
      <View className={mobile ? "absolute inset-0 z-50 items-center justify-start bg-medium/70 p-4 pt-16" : "absolute inset-0 z-50 items-center justify-center bg-medium/70 p-4"}>
        <View className={mobile ? "max-h-[82vh] w-full max-w-[900px] rounded-2xl border p-5" : "max-h-[92vh] w-full max-w-[900px] rounded-2xl border p-5"} style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
          {mobile && <View className="h-2" />}
          {mobile ? (
            <View className="mb-4 mt-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold" style={{ color: colors.text }}>
                  {isAdminBalance ? (isDeposit ? 'Admin Deposit' : 'Admin Withdrawal') : (isDeposit ? 'Deposit Review' : 'Withdrawal Review')}
                </Text>
                <Pressable
                  onPress={closeFundingReview}
                  className="h-8 w-8 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: colors.surface }}
                >
                  <X size={16} color={colors.text} />
                </Pressable>
              </View>
              <View className="mt-2">
                <Text className="text-xs font-medium" style={{ color: colors.muted }} numberOfLines={1}>
                  {reviewItem.User?.name || reviewItem.User?.email || 'User'}
                </Text>
                <Text className="text-[10px]">
                  {dateTime(reviewItem.createdAt)}
                </Text>
              </View>
            </View>
          ) : (
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                  {isAdminBalance ? (isDeposit ? 'Admin Deposit Details' : 'Admin Withdrawal Details') : (isDeposit ? 'Deposit Review' : 'Withdrawal Review')}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: colors.muted }}>
                  {reviewItem.User?.name || reviewItem.User?.email || 'User'} | {dateTime(reviewItem.createdAt)}
                </Text>
              </View>
              <Pressable onPress={closeFundingReview} className="rounded-2xl border px-4 py-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <Text className="text-xs font-medium" style={{ color: colors.text }}>Close</Text>
              </Pressable>
            </View>
          )}

          <ScrollView>
            {reviewItem.loading ? (
              <Text className="rounded-2xl p-4" style={{ backgroundColor: colors.surface, color: colors.muted }}>Loading details...</Text>
            ) : isAdminBalance ? (
              <View className={mobile ? "flex-row flex-wrap justify-between" : "flex-row flex-wrap gap-3"}>
                {adminDetails.map(([label, value]) => (
                  <View
                    key={label}
                    className={mobile ? "mb-2 rounded-2xl border p-2.5" : "min-w-[180px] flex-1 rounded-2xl border p-3"}
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      width: mobile ? '48.5%' : undefined
                    }}
                  >
                    <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>{label}</Text>
                    <Text selectable className={mobile ? "mt-0.5 text-xs font-bold" : "mt-1 text-xs"} style={{ color: colors.text }}>{value}</Text>
                  </View>
                ))}
              </View>
            ) : isDeposit ? (
              <View className="gap-3">
                <View className="gap-3 md:flex-row">
                  <CustomInput className="flex-1" label="Amount" value={depositEditForm.amount} onChangeText={(amount) => setDepositEditForm((current) => ({ ...current, amount }))} keyboardType="decimal-pad" />
                  <CustomInput className="flex-1" label="Bonus" value={depositEditForm.bonus} onChangeText={(bonus) => setDepositEditForm((current) => ({ ...current, bonus }))} keyboardType="decimal-pad" />
                  <DepositCurrencySelect className="md:w-[120px]" value={depositEditForm.currency} onChange={(currency) => setDepositEditForm((current) => ({ ...current, currency }))} />
                </View>
                <View className="gap-3 md:flex-row">
                  <CustomInput className="flex-1" label="Payment Method" value={depositEditForm.paymentMethod} onChangeText={(paymentMethod) => setDepositEditForm((current) => ({ ...current, paymentMethod }))} />
                  <CustomInput className="flex-1" label="Reference Number" value={depositEditForm.referenceNumber} onChangeText={(referenceNumber) => setDepositEditForm((current) => ({ ...current, referenceNumber }))} />
                </View>
                {reviewItem.receiptImage ? (
                  <View className="flex-row flex-wrap justify-end gap-2 mt-2">
                    <Pressable onPress={() => openDepositReceipt(reviewItem)} className="min-h-[38px] justify-center rounded-2xl border px-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                      <Text className="text-xs font-medium" style={{ color: colors.text }}>View Receipt</Text>
                    </Pressable>
                    <Pressable onPress={() => downloadDepositReceipt(reviewItem)} className="min-h-[38px] justify-center rounded-2xl border px-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                      <Text className="text-xs font-medium" style={{ color: colors.text }}>Download Receipt</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              <View className="gap-3">
                <View className={mobile ? "flex-row flex-wrap justify-between" : "flex-row flex-wrap gap-3"}>
                  {[
                    ['Amount', `$${money(reviewItem.amount)}`],
                    ['Method', withdrawalEditForm.withdrawalMethod || '-'],
                    ['Account Holder', withdrawalEditForm.accountHolderName || '-'],
                    [withdrawalEditForm.withdrawalMethod === 'Crypto' ? 'Network / Wallet Type' : 'Bank Name', withdrawalEditForm.bankName || '-'],
                    [withdrawalEditForm.withdrawalMethod === 'Crypto' ? 'Wallet Address' : 'Account Number', withdrawalEditForm.accountNumber || '-'],
                  ].map(([label, value]) => (
                    <View
                      key={label}
                      className={mobile ? "mb-2 rounded-2xl border p-2.5" : "min-w-[180px] flex-1 rounded-2xl border p-3"}
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        width: mobile ? '48.5%' : undefined
                      }}
                    >
                      <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>{label}</Text>
                      <Text selectable className={mobile ? "mt-0.5 text-xs font-bold" : "mt-1 text-xs"} style={{ color: colors.text }}>{value}</Text>
                    </View>
                  ))}
                </View>
                <View className="rounded-xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <Text className="mb-3 text-sm font-medium uppercase" style={{ color: colors.muted }}>Change Amount</Text>
                  <CustomInput className="flex-1" label="Amount" value={withdrawalEditForm.amount} onChangeText={(amount) => setWithdrawalEditForm((current) => ({ ...current, amount }))} keyboardType="decimal-pad" />
                  <View className="flex-row justify-end mt-2.5">
                    <Pressable disabled={busyId === reviewItem.id} onPress={() => saveWithdrawalReviewDetails(reviewItem)} className={`min-h-[38px] justify-center rounded-2xl px-4 ${busyId === reviewItem.id ? 'opacity-50' : ''}`} style={{ backgroundColor: colors.primary }}>
                      <Text className="text-xs font-medium text-medium">Save Changes</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            <View className="mt-5 flex-row justify-end gap-2">
              {isDeposit && !isAdminBalance ? (
                <Pressable disabled={busyId === reviewItem.id} onPress={saveDepositReviewDetails} className={`min-h-[42px] justify-center rounded-2xl px-5 ${busyId === reviewItem.id ? 'opacity-50' : ''}`} style={{ backgroundColor: colors.primary }}>
                  <Text className="text-xs font-medium text-medium">Save Changes</Text>
                </Pressable>
              ) : null}
              {String(reviewItem.status || '').toLowerCase() === 'pending' && !isAdminBalance ? (
                <>
                  <Pressable disabled={busyId === reviewItem.id} onPress={() => reviewFunding(type, reviewItem, 'approve', closeFundingReview)} className={`min-h-[42px] justify-center rounded-2xl border px-5 ${busyId === reviewItem.id ? 'opacity-50' : ''}`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                    <Text className="text-xs font-medium" style={{ color: colors.text }}>Approve</Text>
                  </Pressable>
                  <Pressable disabled={busyId === reviewItem.id} onPress={() => reviewFunding(type, reviewItem, 'reject', closeFundingReview)} className={`min-h-[42px] justify-center rounded-2xl border border-danger/70 bg-danger/10 px-5 ${busyId === reviewItem.id ? 'opacity-50' : ''}`}>
                    <Text className="text-xs font-medium text-danger">Reject</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderFundingRequest = (type, item) => {
    const isDeposit = type === 'deposits';
    const statusColor = String(item.status || '').toLowerCase() === 'approved' ? colors.success : String(item.status || '').toLowerCase() === 'pending' ? colors.primary : colors.danger;

    return (
      <View
        key={item.id}
        className={`mb-3 border p-4 ${mobile ? 'flex-col rounded-xl gap-3' : 'flex-row flex-wrap items-center justify-between rounded-xl'}`}
        style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}
      >
        {/* Info Column */}
        <View className={mobile ? 'w-full' : 'mr-4 flex-1'}>
          <View className={mobile ? "flex-row items-center justify-between flex-wrap gap-2 pb-2 border-b" : "pb-0.5"} style={mobile ? { borderBottomColor: `${colors.border}20` } : null}>
            <Text className="font-semibold text-sm" style={{ color: colors.text }}>
              {item.User?.name || item.User?.email || 'User'}
            </Text>
            {mobile && (
              <Text className="text-[10px] uppercase font-bold rounded px-2 py-0.5" style={{ backgroundColor: `${statusColor}18`, color: statusColor }}>
                {item.status}
              </Text>
            )}
          </View>

          {mobile ? (
            <View className="mt-2.5 gap-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs" style={{ color: colors.muted }}>Amount</Text>
                <Text className="text-xs font-bold" style={{ color: colors.text }}>
                  {isDeposit ? depositAmountText(item) : `$${money(item.amount)}`}
                </Text>
              </View>

              {item.isAdminBalance ? (
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs" style={{ color: colors.muted }}>Type</Text>
                  <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                    {isDeposit ? 'Admin Deposit' : 'Admin Withdrawal'}
                  </Text>
                </View>
              ) : (
                <>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs" style={{ color: colors.muted }}>Method</Text>
                    <Text className="text-xs font-medium" style={{ color: colors.text }}>
                      {isDeposit ? (item.paymentMethod || 'Crypto') : (item.withdrawalMethod || 'Bank')}
                    </Text>
                  </View>
                  {!isDeposit && (
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs" style={{ color: colors.muted }}>Destination</Text>
                      <Text className="text-xs font-medium" style={{ color: colors.text }} numberOfLines={1}>
                        {item.bankName || '-'}
                      </Text>
                    </View>
                  )}
                </>
              )}

              <View className="flex-row justify-between items-center">
                <Text className="text-xs" style={{ color: colors.muted }}>Date</Text>
                <Text className="text-xs" style={{ color: colors.text }}>
                  {dateTime(item.createdAt)}
                </Text>
              </View>

              {item.note ? (
                <View className="mt-2 rounded-2xl bg-medium/10 p-2.5 border" style={{ borderColor: `${colors.border}20` }}>
                  <Text className="text-[10px] uppercase font-bold" style={{ color: colors.muted }}>Note</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.text }}>{item.note}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View>
              <Text className="mt-1 text-xs font-semibold" style={{ color: colors.text }}>
                {isDeposit ? depositAmountText(item) : `$${money(item.amount)} | ${item.withdrawalMethod || 'Bank'} | ${item.bankName || '-'}`}
              </Text>
              <Text className="mt-1 text-[11px]" style={{ color: colors.muted }}>
                {dateTime(item.createdAt)}
              </Text>
              {item.isAdminBalance ? (
                <Text className="mt-1 text-[11px] font-medium" style={{ color: colors.primary }}>
                  {isDeposit ? 'Admin Deposit' : 'Admin Withdrawal'}{item.note ? ` | ${item.note}` : ''}
                </Text>
              ) : item.note ? (
                <Text className="mt-1 text-[11px]" style={{ color: colors.muted }}>
                  Note: <Text style={{ color: colors.text }}>{item.note}</Text>
                </Text>
              ) : null}
            </View>
          )}

          {type === 'withdrawals' && withdrawalEditId === item.id && !(fundingReview?.type === type && fundingReview.item?.id === item.id) ? (
            <View className="mt-4 rounded-xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
              <View className="flex-row gap-3">
                <CustomInput
                  className="flex-1"
                  label="Amount"
                  value={withdrawalEditForm.amount}
                  onChangeText={(amount) => setWithdrawalEditForm((current) => ({ ...current, amount }))}
                  keyboardType="decimal-pad"
                />
                <View className="mb-4 w-[150px]">
                  <Text className="mb-2 text-sm font-medium" style={{ color: colors.muted }}>Method</Text>
                  <View className="flex-row rounded-xl border p-1" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                    {['Bank', 'Crypto'].map((method) => {
                      const active = withdrawalEditForm.withdrawalMethod === method;
                      return (
                        <Pressable
                          key={method}
                          onPress={() => setWithdrawalEditForm((current) => ({ ...current, withdrawalMethod: method }))}
                          className="flex-1 rounded-2xl px-2 py-2"
                          style={{ backgroundColor: active ? colors.primary : 'transparent' }}
                        >
                          <Text className="text-center text-xs font-medium" style={{ color: active ? colors.primary : colors.text }}>{method}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
              <View className="gap-3 md:flex-row">
                <CustomInput
                  className="flex-1"
                  label="Account Holder"
                  value={withdrawalEditForm.accountHolderName}
                  onChangeText={(accountHolderName) => setWithdrawalEditForm((current) => ({ ...current, accountHolderName }))}
                />
                <CustomInput
                  className="flex-1"
                  label={withdrawalEditForm.withdrawalMethod === 'Crypto' ? 'Network / Wallet Type' : 'Bank Name'}
                  value={withdrawalEditForm.bankName}
                  onChangeText={(bankName) => setWithdrawalEditForm((current) => ({ ...current, bankName }))}
                />
              </View>
              <CustomInput
                label={withdrawalEditForm.withdrawalMethod === 'Crypto' ? 'Wallet Address' : 'Account Number'}
                value={withdrawalEditForm.accountNumber}
                onChangeText={(accountNumber) => setWithdrawalEditForm((current) => ({ ...current, accountNumber }))}
              />
              <View className="flex-row justify-end gap-2">
                <Pressable onPress={cancelWithdrawalEdit} className="min-h-[38px] justify-center rounded-2xl border px-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <Text className="text-xs font-medium" style={{ color: colors.text }}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={busyId === item.id}
                  onPress={() => saveWithdrawalDetails(item)}
                  className={`min-h-[38px] justify-center rounded-2xl px-4 ${busyId === item.id ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="text-xs font-medium text-medium">Save Changes</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* Status and Actions Wrapper */}
        <View className={mobile ? "w-full" : "flex-row items-center gap-4"}>
          {!mobile && (
            <View className="rounded px-2.5 py-0.5" style={{ backgroundColor: `${statusColor}18` }}>
              <Text className="text-[10px] font-bold uppercase" style={{ color: statusColor }}>
                {item.status}
              </Text>
            </View>
          )}

          <View
            className={mobile ? 'flex-row justify-end items-center gap-2 pt-2 border-t w-full' : 'flex-row items-center gap-2'}
            style={mobile ? { borderTopColor: `${colors.border}30` } : null}
          >
            <Pressable
              onPress={() => openUserOverview(item.User)}
              className="min-h-[34px] justify-center rounded-2xl border px-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Text className="text-xs font-medium" style={{ color: colors.text }}>User Details</Text>
            </Pressable>
            {item.isAdminBalance ? (
              <Pressable
                onPress={() => setFundingReview({ type, item })}
                className="min-h-[34px] justify-center rounded-2xl border border-primary/50 bg-primary/10 px-4"
              >
                <Text className="text-xs font-medium text-primary">View</Text>
              </Pressable>
            ) : type === 'deposits' || type === 'withdrawals' ? (
              <Pressable
                onPress={() => (type === 'deposits' ? openDepositDetails(item) : openFundingReview(type, item))}
                className="min-h-[34px] justify-center rounded-2xl border border-primary/50 bg-primary/10 px-4"
              >
                <Text className="text-xs font-medium text-primary">{item.status === 'pending' ? 'View & Approve' : 'View'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const renderFundingGroup = (type, group) => {
    const expanded = type === 'deposits' ? !!expandedDepositUsers[group.key] : !!expandedWithdrawalUsers[group.key];
    const ToggleIcon = expanded ? ChevronUp : ChevronDown;
    const itemLabel = type === 'deposits' ? 'deposits' : 'withdrawals';
    const toggleGroup = () => {
      if (type === 'deposits') {
        setExpandedDepositUsers((current) => ({ ...current, [group.key]: !current[group.key] }));
      } else {
        setExpandedWithdrawalUsers((current) => ({ ...current, [group.key]: !current[group.key] }));
      }
    };

    return (
      <View
        key={group.key}
        nativeID={`funding-${type}-${group.key}`}
        onLayout={(event) => registerScrollTarget(`funding-${type}-${group.key}`, event)}
        className="mb-3 overflow-hidden rounded-xl border"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <Pressable
          onPress={toggleGroup}
          className="p-4"
        >
          {mobile ? (
            <View>
              {/* Top Row: User Avatar, Info & Toggle Arrow on Top-Right */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-3 flex-1 min-w-0">
                  <View className="h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.panel }}>
                    <UserRound size={18} color={colors.text} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-semimedium text-sm" numberOfLines={1} style={{ color: colors.text }}>{group.userName}</Text>
                    {group.userEmail ? <Text className="text-[11px]" numberOfLines={1} style={{ color: colors.muted }}>{group.userEmail}</Text> : null}
                  </View>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-2xl border ml-2" style={{ borderColor: colors.border, backgroundColor: colors.panel }}>
                  <ToggleIcon size={18} color={colors.text} />
                </View>
              </View>

              {/* Bottom Row: Info Badges */}
              <View className="flex-row flex-wrap items-center gap-2 pt-2.5 border-t" style={{ borderTopColor: `${colors.border}40` }}>
                <Text className="rounded-full px-3 py-1 text-[10px] font-semibold" style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}>
                  {group.items.length} {itemLabel}
                </Text>
                {group.pendingCount ? (
                  <Text className="rounded-full px-3 py-1 text-[10px] font-semibold" style={{ backgroundColor: `${colors.danger}18`, color: colors.danger }}>
                    {group.pendingCount} pending
                  </Text>
                ) : null}
                <Text className="rounded-full px-3 py-1 text-[10px] font-semibold" style={{ backgroundColor: colors.panel, color: colors.text }}>
                  ${money(group.totalAmount)}
                </Text>
                {type === 'deposits' ? (
                  <Text className="rounded-full px-3 py-1 text-[10px] font-semibold" style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}>
                    Bonus ${money(group.totalBonus)}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <View className="min-w-[220px] flex-1 flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.panel }}>
                  <UserRound size={18} color={colors.text} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-semimedium" numberOfLines={1} style={{ color: colors.text }}>{group.userName}</Text>
                  {group.userEmail ? <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: colors.muted }}>{group.userEmail}</Text> : null}
                </View>
              </View>
              <View className="flex-row flex-wrap items-center gap-2">
                <Text className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}>{group.items.length} {itemLabel}</Text>
                {group.pendingCount ? <Text className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${colors.danger}18`, color: colors.danger }}>{group.pendingCount} pending</Text> : null}
                <Text className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: colors.panel, color: colors.text }}>${money(group.totalAmount)}</Text>
                {type === 'deposits' ? (
                  <Text className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}>Bonus ${money(group.totalBonus)}</Text>
                ) : null}
                <View className="h-8 w-8 items-center justify-center rounded-2xl border" style={{ borderColor: colors.border, backgroundColor: colors.panel }}>
                  <ToggleIcon size={18} color={colors.text} />
                </View>
              </View>
            </View>
          )}
        </Pressable>
        {expanded ? (
          <View className="px-3 pb-1">
            {group.items.map((item) => renderFundingRequest(type, item))}
          </View>
        ) : null}
      </View>
    );
  };

  const renderDepositMethodAddresses = () => (
    <View>
      <View className="mb-7 rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
        <View className="gap-4">
          <View>
            <Text className="mb-2 text-sm font-medium" style={{ color: colors.muted }}>Payment Method</Text>
            <View className="max-w-[760px] flex-row flex-wrap gap-2">
              {depositMethodOptions.map((method) => {
                const active = depositAddressForm.paymentMethod === method;
                return (
                  <Pressable
                    key={method}
                    onPress={() => {
                      setDepositAddressForm((current) => ({ ...current, paymentMethod: method }));
                      setDepositAddressEditForm(null);
                      setExpandedDepositAddressGroups({ [method]: true });
                    }}
                    className="rounded-full border px-3 py-2"
                    style={{ backgroundColor: active ? `${colors.primary}1a` : colors.surface, borderColor: active ? colors.primary : colors.border }}
                  >
                    <Text className="text-xs font-medium" style={{ color: active ? colors.primary : colors.text }}>{method}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View>
            <CustomInput label="Label" value={depositAddressForm.label} onChangeText={(label) => setDepositAddressForm((current) => ({ ...current, label }))} placeholder="Main USDT wallet, UPI account, Bank A..." />
            {depositAddressForm.paymentMethod === 'Bank Transfer' ? (
              <View className="mb-3 rounded-xl border p-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                  Bank Details Fields Generator
                </Text>
                <View className="gap-2">
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <CustomInput label="Bank Name" value={getBankFieldVal(depositAddressForm.address, 'BANK NAME')} onChangeText={(val) => setBankFieldVal(depositAddressForm, setDepositAddressForm, 'BANK NAME', val)} placeholder="e.g. Sampath Bank" />
                    </View>
                    <View className="flex-1">
                      <CustomInput label="Account Holder Name" value={getBankFieldVal(depositAddressForm.address, 'NAME')} onChangeText={(val) => setBankFieldVal(depositAddressForm, setDepositAddressForm, 'NAME', val)} placeholder="e.g. K.K.D. Rusiru" />
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <CustomInput label="Account Number" value={getBankFieldVal(depositAddressForm.address, 'ACCOUNT NUMBER')} onChangeText={(val) => setBankFieldVal(depositAddressForm, setDepositAddressForm, 'ACCOUNT NUMBER', val)} placeholder="e.g. 111171727127" />
                    </View>
                    <View className="flex-1">
                      <CustomInput label="IFSC Code" value={getBankFieldVal(depositAddressForm.address, 'IFSC CODE')} onChangeText={(val) => setBankFieldVal(depositAddressForm, setDepositAddressForm, 'IFSC CODE', val)} placeholder="e.g. SAMP000123" />
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <CustomInput label="Branch" value={getBankFieldVal(depositAddressForm.address, 'BRANCH')} onChangeText={(val) => setBankFieldVal(depositAddressForm, setDepositAddressForm, 'BRANCH', val)} placeholder="e.g. Galle" />
                    </View>
                    <View className="flex-1">
                      <CustomInput label="UPI" value={getBankFieldVal(depositAddressForm.address, 'UPI')} onChangeText={(val) => setBankFieldVal(depositAddressForm, setDepositAddressForm, 'UPI', val)} placeholder="e.g. rusiru@ybl" />
                    </View>
                  </View>
                </View>
              </View>
            ) : null}
            <CustomInput label="Address / Payment Detail" value={depositAddressForm.address} onChangeText={(address) => setDepositAddressForm((current) => ({ ...current, address }))} placeholder="Wallet address, UPI ID, bank details..." multiline style={{ minHeight: 82, textAlignVertical: 'top', paddingTop: 12 }} />
            <CustomInput label="QR Data (Optional)" value={depositAddressForm.qrData} onChangeText={(qrData) => setDepositAddressForm((current) => ({ ...current, qrData }))} placeholder="Leave empty to encode address" />
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <Pressable
                onPress={() => setDepositAddressForm((current) => ({ ...current, isActive: !current.isActive }))}
                className="flex-row items-center rounded-full border px-3 py-2"
                style={{ backgroundColor: depositAddressForm.isActive ? `${colors.success}18` : colors.surface, borderColor: depositAddressForm.isActive ? colors.success : colors.border }}
              >
                <Text className="text-xs font-medium" style={{ color: depositAddressForm.isActive ? colors.success : colors.muted }}>{depositAddressForm.isActive ? 'Active' : 'Inactive'}</Text>
              </Pressable>
              <View className="flex-row gap-2">
                <CustomButton title="Add Address" className="min-w-[150px]" onPress={saveDepositMethodAddress} loading={busyId === 'deposit-method-address'} />
              </View>
            </View>
          </View>
        </View>
        <View className="mt-5 gap-3">
          {depositAddressGroups.map((group) => {
            const expanded = !!expandedDepositAddressGroups[group.key];
            const activeCount = group.items.filter((item) => item.isActive !== false).length;
            const ToggleIcon = expanded ? ChevronUp : ChevronDown;
            return (
              <View key={group.key} className="rounded-xl border p-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <Pressable
                  onPress={() => {
                    const isCurrentlyExpanded = !!expandedDepositAddressGroups[group.key];
                    if (isCurrentlyExpanded) {
                      setExpandedDepositAddressGroups({});
                    } else {
                      setExpandedDepositAddressGroups({ [group.key]: true });
                      setDepositAddressForm((current) => ({ ...current, paymentMethod: group.key }));
                      setDepositAddressEditForm(null);
                    }
                  }}
                  className="flex-row items-center justify-between gap-3"
                >
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="font-medium" style={{ color: colors.text }}>{group.key}</Text>
                      <Text className="rounded-full px-2 py-1 text-[10px] font-medium" style={{ backgroundColor: `${colors.primary}18`, color: colors.primary }}>{group.items.length} addresses</Text>
                      <Text className="rounded-full px-2 py-1 text-[10px] font-medium" style={{ backgroundColor: `${colors.success}18`, color: colors.success }}>{activeCount} active</Text>
                    </View>
                    <Text className="mt-1 text-xs" style={{ color: colors.muted }}>
                      {expanded ? 'Click arrow to hide addresses' : 'Click arrow to show all addresses'}
                    </Text>
                  </View>
                  <View className="h-9 w-9 items-center justify-center rounded-2xl border" style={{ borderColor: colors.border, backgroundColor: colors.panel }}>
                    <ToggleIcon size={18} color={colors.text} />
                  </View>
                </Pressable>
                {expanded ? (
                  <View className="mt-3 gap-3">
                    {group.items.map((item) => (
                      <View key={item.id} className="rounded-2xl border p-3" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                        {depositAddressEditForm && depositAddressEditForm.id === item.id ? (
                          <View className="gap-3">
                            <Text className="text-xs font-semibold" style={{ color: colors.primary }}>Editing {group.key} Address</Text>
                            <CustomInput label="Label" value={depositAddressEditForm.label} onChangeText={(label) => setDepositAddressEditForm((current) => ({ ...current, label }))} placeholder="Main USDT wallet, UPI account, Bank A..." />
                            {depositAddressEditForm.paymentMethod === 'Bank Transfer' ? (
                              <View className="mb-3 rounded-xl border p-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                                <Text className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                                  Bank Details Fields Generator
                                </Text>
                                <View className="gap-2">
                                  <View className="flex-row gap-2">
                                    <View className="flex-1">
                                      <CustomInput label="Bank Name" value={getBankFieldVal(depositAddressEditForm.address, 'BANK NAME')} onChangeText={(val) => setBankFieldVal(depositAddressEditForm, setDepositAddressEditForm, 'BANK NAME', val)} placeholder="e.g. Sampath Bank" />
                                    </View>
                                    <View className="flex-1">
                                      <CustomInput label="Account Holder Name" value={getBankFieldVal(depositAddressEditForm.address, 'NAME')} onChangeText={(val) => setBankFieldVal(depositAddressEditForm, setDepositAddressEditForm, 'NAME', val)} placeholder="e.g. K.K.D. Rusiru" />
                                    </View>
                                  </View>
                                  <View className="flex-row gap-2">
                                    <View className="flex-1">
                                      <CustomInput label="Account Number" value={getBankFieldVal(depositAddressEditForm.address, 'ACCOUNT NUMBER')} onChangeText={(val) => setBankFieldVal(depositAddressEditForm, setDepositAddressEditForm, 'ACCOUNT NUMBER', val)} placeholder="e.g. 111171727127" />
                                    </View>
                                    <View className="flex-1">
                                      <CustomInput label="IFSC Code" value={getBankFieldVal(depositAddressEditForm.address, 'IFSC CODE')} onChangeText={(val) => setBankFieldVal(depositAddressEditForm, setDepositAddressEditForm, 'IFSC CODE', val)} placeholder="e.g. SAMP000123" />
                                    </View>
                                  </View>
                                  <View className="flex-row gap-2">
                                    <View className="flex-1">
                                      <CustomInput label="Branch" value={getBankFieldVal(depositAddressEditForm.address, 'BRANCH')} onChangeText={(val) => setBankFieldVal(depositAddressEditForm, setDepositAddressEditForm, 'BRANCH', val)} placeholder="e.g. Galle" />
                                    </View>
                                    <View className="flex-1">
                                      <CustomInput label="UPI" value={getBankFieldVal(depositAddressEditForm.address, 'UPI')} onChangeText={(val) => setBankFieldVal(depositAddressEditForm, setDepositAddressEditForm, 'UPI', val)} placeholder="e.g. rusiru@ybl" />
                                    </View>
                                  </View>
                                </View>
                              </View>
                            ) : null}
                            <CustomInput label="Address / Payment Detail" value={depositAddressEditForm.address} onChangeText={(address) => setDepositAddressEditForm((current) => ({ ...current, address }))} placeholder="Wallet address, UPI ID, bank details..." multiline style={{ minHeight: 82, textAlignVertical: 'top', paddingTop: 12 }} />
                            <CustomInput label="QR Data (Optional)" value={depositAddressEditForm.qrData} onChangeText={(qrData) => setDepositAddressEditForm((current) => ({ ...current, qrData }))} placeholder="Leave empty to encode address" />
                            <View className="flex-row flex-wrap items-center justify-between gap-3 mt-2">
                              <Pressable
                                onPress={() => setDepositAddressEditForm((current) => ({ ...current, isActive: !current.isActive }))}
                                className="flex-row items-center rounded-full border px-3 py-2"
                                style={{ backgroundColor: depositAddressEditForm.isActive ? `${colors.success}18` : colors.surface, borderColor: depositAddressEditForm.isActive ? colors.success : colors.border }}
                              >
                                <Text className="text-xs font-medium" style={{ color: depositAddressEditForm.isActive ? colors.success : colors.muted }}>{depositAddressEditForm.isActive ? 'Active' : 'Inactive'}</Text>
                              </Pressable>
                              <View className="flex-row gap-2">
                                <CustomButton title="Cancel" variant="secondary" className="min-w-[100px]" onPress={cancelDepositAddressEdit} />
                                <CustomButton title="Update Address" className="min-w-[150px]" onPress={saveDepositMethodAddressEdit} loading={busyId === 'deposit-method-address-edit'} />
                              </View>
                            </View>
                          </View>
                        ) : (
                          <View className="flex-row flex-wrap items-start justify-between gap-3">
                            <View className="flex-1">
                              <View className="flex-row flex-wrap items-center gap-2">
                                <Text className="rounded-full px-2 py-1 text-[10px] font-medium" style={{ backgroundColor: item.isActive ? `${colors.success}18` : `${colors.danger}18`, color: item.isActive ? colors.success : colors.danger }}>{item.isActive ? 'Active' : 'Inactive'}</Text>
                                {item.label ? <Text className="text-xs" style={{ color: colors.muted }}>{item.label}</Text> : null}
                              </View>
                              <Text selectable className="mt-2 text-sm" style={{ color: colors.text }}>{item.address}</Text>
                              {item.qrData ? <Text selectable className="mt-1 text-xs" style={{ color: colors.muted }}>QR: {item.qrData}</Text> : null}
                            </View>
                            <View className="flex-row">
                              <Pressable onPress={() => editDepositMethodAddress(item)} className="mr-2 rounded-2xl border px-4 py-2" style={{ borderColor: colors.border }}>
                                <Text className="text-xs font-medium" style={{ color: colors.text }}>Edit</Text>
                              </Pressable>
                              <Pressable disabled={busyId === `delete-deposit-address-${item.id}`} onPress={() => deleteDepositMethodAddress(item)} className="rounded-2xl border border-danger/70 bg-danger/10 px-4 py-2">
                                <Text className="text-xs font-medium text-danger">Delete</Text>
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
          {!data.depositMethodAddresses.length ? <EmptyRow>No deposit method addresses configured.</EmptyRow> : null}
        </View>
      </View>
    </View>
  );

  const renderFundingRequests = (type) => {
    const isDeposit = type === 'deposits';
    const searchQuery = isDeposit ? depositSearchQuery : withdrawalSearchQuery;
    const setSearchQuery = isDeposit ? setDepositSearchQuery : setWithdrawalSearchQuery;
    const placeholder = isDeposit
      ? 'Search deposits by user, amount, method, reference or status'
      : 'Search withdrawals by user, amount, bank, method or status';
    const sortOpen = isDeposit ? depositSortOpen : withdrawalSortOpen;

    return (
      <View className="mb-7" style={{ zIndex: sortOpen ? 500 : 1 }}>
        {mobile ? (
          <View className="mb-2.5 flex-row items-center gap-2" style={{ zIndex: 100 }}>
            <View style={{ flex: 1.7 }}>
              {renderSearchBar(searchQuery, setSearchQuery, 'Search...', true)}
            </View>
            <View style={{ flex: 1 }}>
              {renderFundingSortDropdown(type)}
            </View>
          </View>
        ) : (
          <View className="flex-row items-center gap-3 mb-4" style={{ zIndex: 100 }}>
            <View style={{ flex: 2 }}>
              {renderSearchBar(searchQuery, setSearchQuery, placeholder, true)}
            </View>
            <View style={{ width: 180 }}>
              {renderFundingSortDropdown(type)}
            </View>
          </View>
        )}
        <View className="rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16, zIndex: 1 }}>
          {(type === 'deposits' ? depositRequestGroups : withdrawalRequestGroups).map((group) => renderFundingGroup(type, group))}
          {!filteredFunding[type].length ? <EmptyRow>No {type} requests found.</EmptyRow> : null}
        </View>
      </View>
    );
  };

  const renderDeposits = () => (
    <View>
      {depositSubpage === 'addresses' && hasPermission('depositAddresses') ? (
        renderDepositMethodAddresses()
      ) : hasPermission('depositsList') ? (
        renderFundingRequests('deposits')
      ) : hasPermission('depositAddresses') ? (
        renderDepositMethodAddresses()
      ) : (
        <View className="p-8 items-center justify-center rounded-2xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><Text style={{ color: colors.muted }}>Access Denied</Text></View>
      )}
    </View>
  );

  const renderWithdrawals = () => (
    <View>
      {withdrawalSubpage === 'withdrawals' && hasPermission('withdrawalsList') ? (
        renderFundingRequests('withdrawals')
      ) : hasPermission('withdrawalDetails') ? (
        renderBankAccounts()
      ) : hasPermission('withdrawalsList') ? (
        renderFundingRequests('withdrawals')
      ) : (
        <View className="p-8 items-center justify-center rounded-2xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><Text style={{ color: colors.muted }}>Access Denied</Text></View>
      )}
    </View>
  );

  const renderBankAccounts = () => (
    <View>
      {renderSearchBar(withdrawalDetailsSearchQuery, setWithdrawalDetailsSearchQuery, 'Search withdrawal details by user, bank, wallet, status or type')}
      <View className="rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
        <View className="gap-3">
          {withdrawalDetailGroups.map((group) => {
          const expanded = !!expandedWithdrawalDetailGroups[group.key];
          const pendingGroupCount = group.items.filter((item) => ['pending', 'delete_pending'].includes(item.status)).length;
          const ToggleIcon = expanded ? ChevronUp : ChevronDown;
          return (
            <View
              key={group.key}
              nativeID={`bank-${group.key}`}
              onLayout={(event) => registerScrollTarget(`bank-${group.key}`, event)}
              className="rounded-xl border p-3"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Pressable
                onPress={() => setExpandedWithdrawalDetailGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}
                className="flex-row items-center justify-between gap-3"
              >
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="font-medium" style={{ color: colors.text }}>{group.key} Withdrawal Details</Text>
                    <Text className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{group.items.length} saved</Text>
                    {pendingGroupCount ? <Text className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${colors.danger}18`, color: colors.danger }}>{pendingGroupCount} pending</Text> : null}
                  </View>
                  <Text className="mt-1 text-xs" style={{ color: colors.muted }}>
                    {expanded ? 'Click arrow to hide details' : 'Click arrow to show all details'}
                  </Text>
                </View>
                <View className="h-9 w-9 items-center justify-center rounded-2xl border" style={{ borderColor: colors.border, backgroundColor: colors.panel }}>
                  <ToggleIcon size={18} color={colors.text} />
                </View>
              </Pressable>
              {expanded ? (
                <View className="mt-3 gap-3">
                  {group.items.map((item) => (
                    <View
                      key={item.id}
                      nativeID={`bank-item-${item.id}`}
                      onLayout={(event) => registerScrollTarget(`bank-item-${item.id}`, event)}
                      className="rounded-2xl border p-4"
                      style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}
                    >
                      <View className="flex-row flex-wrap items-start justify-between gap-3">
                        <View className="flex-1">
                          <View className="flex-row flex-wrap items-center gap-2">
                            <Text className="font-semimedium" style={{ color: colors.text }}>{item.User?.name || item.User?.email || 'User'}</Text>
                            <Text className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{payoutTypeFor(item)}</Text>
                          </View>
                          <Text className="mt-1 text-sm" style={{ color: colors.muted }}>{item.User?.email || '-'} | {item.status} | {dateTime(item.createdAt)}</Text>
                          {item.status === 'delete_pending' ? (
                            <Text className="mt-2 rounded-2xl border border-danger/40 bg-danger/10 p-3 text-sm font-medium text-danger">User requested deletion for this {payoutTypeFor(item)} withdrawal detail.</Text>
                          ) : null}
                          <View className="mt-4 flex-row flex-wrap gap-3">
                            {payoutFieldsFor(item).map(([label, value]) => (
                              <View key={label} className="min-w-[180px] flex-1 rounded-xl border p-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                                <Text className="text-xs font-medium uppercase" style={{ color: colors.muted }}>{label}</Text>
                                <Text className="mt-1 text-sm font-semimedium" style={{ color: colors.text }}>{value || '-'}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                        {['pending', 'delete_pending'].includes(item.status) ? (
                          <View className="flex-row flex-wrap">
                            <Pressable
                              onPress={() => openUserOverview(item.User)}
                              className="mr-2 min-h-[38px] justify-center rounded-2xl border px-4"
                              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                            >
                              <Text className="text-xs font-medium" style={{ color: colors.text }}>User Details</Text>
                            </Pressable>
                            <Pressable
                              disabled={busyId === item.id}
                              onPress={() => reviewBankAccount(item, 'approve')}
                              className={`mr-2 min-h-[38px] justify-center rounded-2xl border px-4 ${busyId === item.id ? 'opacity-50' : ''}`}
                              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                            >
                              <Text className="text-xs font-medium" style={{ color: colors.text }}>{item.status === 'delete_pending' ? 'Approve Delete' : 'Approve'}</Text>
                            </Pressable>
                            <Pressable
                              disabled={busyId === item.id}
                              onPress={() => reviewBankAccount(item, 'reject')}
                              className={`min-h-[38px] justify-center rounded-2xl border border-danger/70 bg-danger/10 px-4 ${busyId === item.id ? 'opacity-50' : ''}`}
                            >
                              <Text className="text-xs font-medium text-danger">{item.status === 'delete_pending' ? 'Reject Delete' : 'Reject'}</Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
          })}
        </View>
        {!filteredBankAccounts.length ? <EmptyRow>No bank or TRC20 withdrawal details submitted.</EmptyRow> : null}
      </View>
    </View>
  );

  const renderMarginAlerts = () => {
    const criticalCount = lowMarginUsers.filter((user) => Number(marginLevelFor(user)) < 25).length;
    const averageMarginLevel = lowMarginUsers.length
      ? lowMarginUsers.reduce((sum, user) => sum + Number(marginLevelFor(user) || 0), 0) / lowMarginUsers.length
      : 0;
    const categoryCounts = marginLevelUsers.reduce((counts, item) => ({ ...counts, [item.category]: (counts[item.category] || 0) + 1 }), {});
    const filters = [
      ['all', 'All Margin Levels'],
      ['active', 'Active Margin Levels'],
      ['below', 'Below Margin Call level only'],
      ['idle', 'Idle Accounts (No Positions)'],
    ];
    const categoryCards = [
      ['below', 'Below 50%', categoryCounts.below || 0, '#F8D6D6', colors.danger],
      ['mid', '50-100%', categoryCounts.mid || 0, '#FFF8BF', colors.primary],
      ['healthy', '100-200%', categoryCounts.healthy || 0, '#D6E8FF', '#2F80ED'],
      ['above', 'Above 200%', categoryCounts.above || 0, '#D8F8E1', colors.success],
    ];

    const renderRefreshButton = () => (
      <Pressable
        onPress={() => load({ silent: true })}
        className="w-[42px] items-center justify-center rounded-2xl border"
        style={{
          height: mobile ? 46 : 38,
          backgroundColor: colors.panel,
          borderColor: colors.border,
        }}
      >
        <RefreshCw size={16} color={colors.text} />
      </Pressable>
    );

    return (
      <View>
        <View className="mb-4 flex-row flex-wrap gap-2">
          <StatCard title="Below 50% Margin Level" value={String(lowMarginUsers.length)} accent="text-danger" style={{ width: mobile ? '31.5%' : undefined, minWidth: mobile ? '31.5%' : 220, flex: mobile ? 0 : 1, marginRight: mobile ? 0 : 0 }} />
          <StatCard title="Critical Below 25%" value={String(criticalCount)} accent="text-danger" style={{ width: mobile ? '31.5%' : undefined, minWidth: mobile ? '31.5%' : 220, flex: mobile ? 0 : 1, marginRight: mobile ? 0 : 0 }} />
          <StatCard title="Average Alert Level" value={`${money(averageMarginLevel)}%`} accent="text-primary" style={{ width: mobile ? '31.5%' : undefined, minWidth: mobile ? '31.5%' : 220, flex: mobile ? 0 : 1, marginRight: mobile ? 0 : 0 }} />
        </View>
        <View className="mb-4">
          <SectionHeading
            title="Margin levels of Accounts"
            subtitle="Stop-out uses total account margin level at 70%; alert badge counts clients below 50%."
          />
          <View className="flex-row flex-wrap gap-2 w-full" style={{ width: '100%' }}>
            {filters.map(([id, label]) => {
              const active = marginAlertFilter === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setMarginAlertFilter(id)}
                  className="justify-center items-center rounded-2xl border px-3 md:px-5"
                  style={{
                    width: mobile ? '48%' : undefined,
                    minWidth: mobile ? '48%' : undefined,
                    flex: mobile ? 0 : 1,
                    height: mobile ? 46 : 42,
                    backgroundColor: colors.panel,
                    borderColor: active ? colors.primary : colors.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: darkMode ? 0.2 : 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text className={`text-center text-[11px] uppercase tracking-wider ${mobile ? 'font-normal' : 'font-bold'}`} style={{ color: active ? colors.primary : colors.text }}>{label}</Text>
                </Pressable>
              );
            })}
            {!mobile ? renderRefreshButton() : null}
          </View>
        </View>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {categoryCards.map(([id, label, count, background, color]) => (
            <MarginCategoryCard
              key={id}
              id={id}
              label={label}
              count={count}
              background={background}
              color={color}
              colors={colors}
              darkMode={darkMode}
              mobile={mobile}
            />
          ))}
        </View>
        {renderSearchBar(lowMarginSearchQuery, setLowMarginSearchQuery, 'Search margin alerts by user, email, phone, country or balance')}
        <View className="rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
          <View className="gap-3">
            {filteredLowMarginUsers.map(({ user, marginLevel, category }) => {
              const wallet = user.wallet || {};
              const level = marginLevel || 0;
              const critical = marginLevel !== null && level < 25;
              const openTrades = wallet.openTradesCount || 0;
              const theme = (() => {
                if (category === 'below') return { text: colors.danger, bg: '#F8D6D6', border: colors.danger };
                if (category === 'mid') return { text: colors.primary, bg: '#FFF8BF', border: colors.primary };
                if (category === 'healthy') return { text: '#2F80ED', bg: '#D6E8FF', border: '#2F80ED' };
                if (category === 'above') return { text: colors.success, bg: '#D8F8E1', border: colors.success };
                return { text: colors.primary, bg: `${colors.primary}18`, border: colors.border };
              })();
              return (
                <View key={user.id} className="rounded-xl border p-4" style={{ backgroundColor: colors.surface, borderColor: theme.border }}>
                  <View className="flex-row flex-wrap items-start justify-between gap-3">
                    <View className="min-w-[220px] flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="font-semimedium" style={{ color: colors.text }}>{user.name || user.email || 'Client'}</Text>
                        <Text className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: theme.bg, color: theme.text }}>
                          {category === 'idle' ? 'No Position' : `${money(level)}%`}
                        </Text>
                        {critical ? <Text className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${colors.danger}18`, color: colors.danger }}>Critical</Text> : null}
                      </View>
                      <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{user.email || '-'} | {user.phone || 'No phone'} | {user.country || '-'}</Text>
                      <Text className="mt-2 text-xs" style={{ color: colors.muted }}>
                        Live | {user.tradingStatus || 'active'} | Open trades: {openTrades}
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2" style={{ width: mobile ? '100%' : 'auto', marginTop: mobile ? 8 : 0 }}>
                      {[
                        ['Balance', `$${money(wallet.balance)}`],
                        ['Equity', `$${money(wallet.equity)}`],
                        ['Used Margin', `$${money(wallet.margin)}`],
                        ['Free Funds', `$${money(wallet.freeFunds)}`],
                      ].map(([label, value]) => (
                        <View
                          key={label}
                          className="rounded-2xl border px-3 py-2"
                          style={{
                            backgroundColor: colors.panel,
                            borderColor: colors.border,
                            flex: mobile ? 1 : undefined,
                            minWidth: mobile ? '47%' : 120,
                          }}
                        >
                          <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>{label}</Text>
                          <Text className="mt-1 text-sm font-medium" style={{ color: label === 'Free Funds' && Number(wallet.freeFunds) < 0 ? colors.danger : colors.text }}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View className="mt-4 flex-row flex-wrap justify-end gap-2">
                    <Pressable onPress={() => openUserOverview(user)} className="min-h-[38px] justify-center rounded-2xl border px-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <Text className="text-xs font-medium" style={{ color: colors.text }}>User Details</Text>
                    </Pressable>
                    <Pressable onPress={() => openWallet(user)} className="min-h-[38px] justify-center rounded-2xl border px-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <Text className="text-xs font-medium" style={{ color: colors.text }}>Wallet</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
            {!filteredLowMarginUsers.length ? <EmptyRow>No clients found for this margin level filter.</EmptyRow> : null}
          </View>
        </View>
      </View>
    );
  };

  const renderUserLevels = () => {
    const clients = filteredUserLevelClients;
    const selectedLevelUser = mobile ? clients.find((user) => user.id === selectedMobileLevelUserId) : null;
    const selectedCurrentLevel = selectedLevelUser?.tradingLevel || 'Standard';
    const selectedLevelBusy = selectedLevelUser ? busyId === selectedLevelUser.id : false;
    return (
      <View>
        {renderSearchBar(userLevelsSearchQuery, setUserLevelsSearchQuery, 'Search user levels by name, email, country or level')}
        <View className="rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
          <View className="mb-4">
            <Text className="text-xl font-medium" style={{ color: colors.text }}>User Levels</Text>
            <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Edit the live trading level shown after a client makes their first deposit.</Text>
          </View>
          <View className="gap-3">
            {clients.map((user) => {
            const currentLevel = user.tradingLevel || 'Standard';
            const busy = busyId === user.id;
            const selected = selectedMobileLevelUserId === user.id;
            const totalDeposits = liveAccountDepositTotal(user);
            const liveBalance = user.accountStats?.liveBalance ?? 0;
            const CardShell = mobile ? Pressable : View;
            return (
              <CardShell
                key={user.id}
                disabled={mobile ? busy : undefined}
                onPress={mobile ? () => setSelectedMobileLevelUserId((current) => (current === user.id ? null : user.id)) : undefined}
                className={`rounded-2xl border p-4 ${mobile && busy ? 'opacity-60' : ''}`}
                style={{ backgroundColor: colors.surface, borderColor: mobile && selected ? colors.primary : colors.border }}
              >
                <View className="flex-row flex-wrap items-center justify-between gap-3">
                  <View className="min-w-[220px] flex-1">
                    <Text className="font-semimedium" style={{ color: colors.text }}>{user.name || user.email || 'Client'}</Text>
                    <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{user.email || '-'} | {user.accountType || 'Demo'} | Current: {currentLevel}</Text>
                  </View>
                  <View className="min-w-[260px] flex-row flex-wrap gap-2">
                    <View className="min-w-[124px] rounded-2xl border px-3 py-2" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>Total Deposits</Text>
                      <Text className="mt-1 text-sm font-medium" style={{ color: colors.text }}>${money(totalDeposits)}</Text>
                    </View>
                    <View className="min-w-[124px] rounded-2xl border px-3 py-2" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>Live Balance</Text>
                      <Text className="mt-1 text-sm font-medium" style={{ color: colors.text }}>${money(liveBalance)}</Text>
                    </View>
                  </View>
                  {mobile ? (
                    <Text className="text-[11px] font-medium uppercase" style={{ color: colors.primary }}>
                      Tap to change level
                    </Text>
                  ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {tradingLevelOptions.map((level) => {
                      const active = currentLevel === level;
                      return (
                        <Pressable
                          key={level}
                          disabled={busy || active}
                          onPress={() => ask(
                            `Change ${user.name || user.email || 'this client'}'s trading level from ${currentLevel} to ${level}?`,
                            () => saveUserTradingLevel(user, level),
                          )}
                          className={`rounded-2xl border px-4 py-2 ${busy ? 'opacity-50' : ''}`}
                          style={{ backgroundColor: colors.panel, borderColor: active ? colors.primary : colors.border }}
                        >
                          <Text className="text-xs font-medium" style={{ color: active ? colors.primary : colors.text }}>{level}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  )}
                </View>
              </CardShell>
            );
            })}
            {!clients.length ? <EmptyRow>No clients found.</EmptyRow> : null}
          </View>
        </View>
        <Modal visible={mobile && Boolean(selectedLevelUser)} transparent animationType="fade" onRequestClose={() => setSelectedMobileLevelUserId(null)}>
          <Pressable className="flex-1 justify-end bg-black/45" onPress={() => setSelectedMobileLevelUserId(null)}>
            <Pressable className="rounded-t-2xl border-t p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }} onPress={(event) => event.stopPropagation?.()}>
              <View className="mb-4 flex-row items-center justify-between">
                <View className="min-w-0 flex-1 pr-3">
                  <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>Trading Level</Text>
                  <Text className="mt-1 text-lg font-medium" numberOfLines={1} style={{ color: colors.text }}>{selectedLevelUser?.name || selectedLevelUser?.email || 'Client'}</Text>
                  <Text className="mt-1 text-xs" style={{ color: colors.muted }}>Current level: {selectedCurrentLevel}</Text>
                </View>
                <Pressable onPress={() => setSelectedMobileLevelUserId(null)} className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}>
                  <X size={17} color={colors.muted} />
                </Pressable>
              </View>
              <View className="gap-2">
                {tradingLevelOptions.map((level) => {
                  const active = selectedCurrentLevel === level;
                  return (
                    <Pressable
                      key={level}
                      disabled={selectedLevelBusy || active}
                      onPress={() => ask(
                        `Change ${selectedLevelUser?.name || selectedLevelUser?.email || 'this client'}'s trading level from ${selectedCurrentLevel} to ${level}?`,
                        () => {
                          saveUserTradingLevel(selectedLevelUser, level);
                          setSelectedMobileLevelUserId(null);
                        },
                      )}
                      className={`h-12 flex-row items-center justify-between rounded-xl border px-4 ${selectedLevelBusy ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }}
                    >
                      <Text className="text-sm font-medium" style={{ color: active ? colors.primary : colors.text }}>{level}</Text>
                      {active ? <Text className="text-xs font-medium" style={{ color: '#0B0B0B' }}>Current</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  };




  const toggleUserExpand = (userId) => {
    setExpandedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const renderAddTrading = () => {
    const clients = data.users.filter((user) => user.role === 'user');
    const filteredClients = clients.filter((user) => {
      const q = impersonateSearchQuery.toLowerCase();
      return (user.name || '').toLowerCase().includes(q) || (user.email || '').toLowerCase().includes(q);
    });

    if (selectedImpersonateClient) {
      const userAccounts = selectedImpersonateClient.tradingAccounts || [];
      return (
        <View className="w-full self-center rounded-2xl border p-5 md:p-6" style={{ maxWidth: 1180, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setSelectedImpersonateClient(null)}
                className="h-10 w-10 items-center justify-center rounded-xl border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <ArrowLeft size={18} color={colors.text} />
              </Pressable>
              <View>
                <Text className="text-xl font-semibold" style={{ color: colors.text }}>Add Trade on Behalf</Text>
                <View className="mt-1 flex-row items-center gap-1.5">
                  {isOnlineUser(selectedImpersonateClient) ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                  ) : null}
                  <Text className="text-xs" style={{ color: colors.muted }}>
                    Client: {selectedImpersonateClient.name || 'Client'} ({selectedImpersonateClient.email})
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {addTradeError ? (
            <View className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3">
              <Text className="text-sm text-danger">{addTradeError}</Text>
            </View>
          ) : null}

          {addTradeSuccess ? (
            <View className="mb-4 rounded-xl border border-success/30 bg-success/20 p-3">
              <Text className="text-sm text-success">{addTradeSuccess}</Text>
            </View>
          ) : null}

          {livePriceInfo ? (
            mobile ? (
              <View className="mb-4 rounded-xl border p-4 gap-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <View className="flex-row justify-between items-center pb-2 border-b" style={{ borderBottomColor: `${colors.border}30` }}>
                  <View>
                    <Text className="text-sm font-bold" style={{ color: colors.text }}>{livePriceInfo.symbol}</Text>
                    <Text className="text-[11px]" style={{ color: colors.muted }}>{livePriceInfo.name || 'Live Market Price'}</Text>
                  </View>
                  {livePriceInfo.change !== undefined ? (
                    <View className="rounded bg-medium/10 px-2 py-0.5">
                      <Text className={`text-[10px] font-bold ${Number(livePriceInfo.change) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {Number(livePriceInfo.change) >= 0 ? '+' : ''}{Number(livePriceInfo.change).toFixed(2)}%
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View className="flex-row justify-around">
                  <View className="items-center">
                    <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>Bid</Text>
                    <Text className="text-base font-bold text-danger mt-0.5">{quote(livePriceInfo.bid || livePriceInfo.price, livePriceInfo.decimals ?? 2)}</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>Ask</Text>
                    <Text className="text-base font-bold text-success mt-0.5">{quote(livePriceInfo.ask || livePriceInfo.price, livePriceInfo.decimals ?? 2)}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="mb-4 rounded-xl border p-4 flex-row items-center justify-between" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <View>
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>{livePriceInfo.symbol}</Text>
                  <Text className="text-xs" style={{ color: colors.muted }}>{livePriceInfo.name || 'Live Market Price'} | Live Bid / Ask</Text>
                </View>
                <View className="flex-row items-center gap-5">
                  <View className="items-end">
                    <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>Bid</Text>
                    <Text className="text-base font-bold text-danger">{quote(livePriceInfo.bid || livePriceInfo.price, livePriceInfo.decimals ?? 2)}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>Ask</Text>
                    <Text className="text-base font-bold text-success">{quote(livePriceInfo.ask || livePriceInfo.price, livePriceInfo.decimals ?? 2)}</Text>
                  </View>
                  {livePriceInfo.change !== undefined ? (
                    <View className="items-end">
                      <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>Change</Text>
                      <Text className={`text-xs font-semibold ${Number(livePriceInfo.change) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {Number(livePriceInfo.change) >= 0 ? '+' : ''}{Number(livePriceInfo.change).toFixed(2)}%
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )
          ) : null}

          <View className="gap-5">
            <View>
              <View className="mb-2 flex-row flex-wrap items-center justify-between gap-2">
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>1. Choose account</Text>
                <Pressable
                  disabled={openUserProfileLoading}
                  onPress={openSelectedUserProfile}
                  className={`rounded-lg border px-3 py-2 ${openUserProfileLoading ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
                    {openUserProfileLoading ? 'Opening...' : 'Go to User Profile'}
                  </Text>
                </Pressable>
              </View>
              {userAccounts.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {userAccounts.map((acc) => {
                    const isSelected = String(addTradeForm.tradingAccountId) === String(acc.id);
                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => setAddTradeForm((prev) => ({ ...prev, tradingAccountId: acc.id }))}
                        className={`rounded-2xl border px-4 py-2.5 ${mobile ? 'w-full' : ''}`}
                        style={{
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }}
                      >
                        <Text style={{ color: isSelected ? '#0B0B0B' : colors.text }} className="text-xs font-semibold">
                          {acc.name} ({acc.type} - ${money(acc.balance)})
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text className="text-xs text-danger">User has no trading accounts.</Text>
              )}
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold" style={{ color: colors.text }}>2. Trade timing</Text>
              <View className="flex-row gap-2">
                {[
                  { id: 'live', label: mobile ? 'Open now' : 'Open trade now' },
                  { id: 'past', label: mobile ? 'Past trade' : 'Add past trade' },
                ].map((t) => {
                  const isSelected = addTradeForm.type === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => {
                        const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
                        if (t.id === 'live' && ['open', 'close'].includes(activeSelectionMode)) setActiveSelectionMode('tp');
                        setAddTradeForm((prev) => ({
                          ...prev,
                          type: t.id,
                          status: t.id === 'live' ? 'open' : 'closed',
                          openDate: t.id === 'past' && !prev.openDate ? nowStr : prev.openDate,
                          closeDate: t.id === 'past' && !prev.closeDate ? nowStr : prev.closeDate,
                        }));
                      }}
                      className={`rounded-xl border px-3 justify-center ${mobile ? 'flex-1 py-2' : 'py-2'}`}
                      style={{
                        minWidth: mobile ? undefined : 126,
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ color: isSelected ? '#0B0B0B' : colors.text }} className="text-center text-xs font-semibold">{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {addTradeForm.type === 'past' ? (
              <View>
                <Text className="mb-2 text-sm font-semibold" style={{ color: colors.text }}>Is this past trade still open?</Text>
                <View className="flex-row gap-2">
                  {[
                    { id: 'open', label: mobile ? 'Still open' : 'Yes, it is still open' },
                    { id: 'closed', label: mobile ? 'Closed' : 'No, it is already closed' },
                  ].map((s) => {
                    const isSelected = addTradeForm.status === s.id;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          if (s.id !== 'closed' && activeSelectionMode === 'close') setActiveSelectionMode('open');
                          setAddTradeForm((prev) => ({ ...prev, status: s.id }));
                        }}
                      className={`rounded-xl border px-3 justify-center ${mobile ? 'flex-1 py-2' : 'py-2'}`}
                      style={{
                        minWidth: mobile ? undefined : 154,
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }}
                      >
                        <Text style={{ color: isSelected ? '#0B0B0B' : colors.text }} className="text-center text-xs font-semibold">{s.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View>
              <Text className="mb-2 text-sm font-semibold" style={{ color: colors.text }}>3. Select market</Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {availableTradeGroups.map((group) => {
                  const active = tradeSymbolGroup === group.id;
                  return (
                    <Pressable key={group.id} onPress={() => setTradeSymbolGroup(group.id)} className="rounded-xl border px-3 py-2" style={{ backgroundColor: active ? colors.primary : colors.panel, borderColor: active ? colors.primary : colors.border }}>
                      <Text className="text-xs font-bold" style={{ color: active ? '#FFFFFF' : colors.muted }}>{group.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View className="flex-row flex-wrap gap-2">
                {visibleTradeSymbols.map((sym) => {
                  const isSelected = addTradeForm.symbol === sym;
                  return (
                    <Pressable
                      key={sym}
                      onPress={() => {
                        setAddTradeForm((prev) => ({ ...prev, symbol: sym }));
                        if (addTradeForm.type === 'past') {
                          fetchHistoricalPrice('openPrice', sym, addTradeForm.openDate);
                          if (addTradeForm.status === 'closed') {
                            fetchHistoricalPrice('closePrice', sym, addTradeForm.closeDate);
                          }
                        }
                      }}
                      className="rounded-2xl border px-3 py-2"
                      style={{
                        minWidth: mobile ? '31.5%' : 96,
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ color: isSelected ? '#0B0B0B' : colors.text }} className="text-center text-xs font-semibold">{sym}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="mb-1.5">
              <View className={mobile ? 'gap-2 mb-2' : 'mb-1.5 flex-row items-center justify-between'}>
                <View>
                  <Text className="text-xs font-semibold" style={{ color: colors.text }}>Chart selector</Text>
                  <Text className="text-xs" style={{ color: colors.muted }}>
                    Active Selection: <Text className="font-semibold" style={{ color: activeSelectionMode === 'sl' ? colors.danger : activeSelectionMode === 'tp' || activeSelectionMode === 'close' ? colors.success : colors.primary }}>
                      {activeSelectionMode === 'open' ? 'SETTING OPEN PRICE' : activeSelectionMode === 'close' ? 'SETTING CLOSE PRICE' : activeSelectionMode === 'tp' ? 'SETTING TAKE PROFIT' : 'SETTING STOP LOSS'}
                    </Text>
                  </Text>
                </View>
                <View className="flex-row flex-wrap justify-end gap-2">
                  {addTradeForm.type === 'past' ? (
                    <Pressable
                      onPress={() => {
                        setActiveSelectionMode('open');
                        setTimeout(postAdminChartMarkers, 0);
                      }}
                      className="rounded px-2 py-1 border"
                      style={{
                        backgroundColor: activeSelectionMode === 'open' ? colors.primary : colors.surface,
                        borderColor: activeSelectionMode === 'open' ? colors.primary : colors.border
                      }}
                    >
                      <Text style={{ color: activeSelectionMode === 'open' ? '#0B0B0B' : colors.text }} className="text-xs font-semibold">Set Open</Text>
                    </Pressable>
                  ) : null}
                  {addTradeForm.type === 'past' && addTradeForm.status === 'closed' ? (
                    <Pressable
                      onPress={() => {
                        setActiveSelectionMode('close');
                        setTimeout(postAdminChartMarkers, 0);
                      }}
                      className="rounded px-2 py-1 border"
                      style={{
                        backgroundColor: activeSelectionMode === 'close' ? colors.primary : colors.surface,
                        borderColor: activeSelectionMode === 'close' ? colors.primary : colors.border
                      }}
                    >
                      <Text style={{ color: activeSelectionMode === 'close' ? '#0B0B0B' : colors.text }} className="text-xs font-semibold">Set Close</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      setActiveSelectionMode('tp');
                      setTimeout(postAdminChartMarkers, 0);
                    }}
                    className="rounded px-2 py-1 border"
                    style={{
                      backgroundColor: activeSelectionMode === 'tp' ? colors.success : colors.surface,
                      borderColor: activeSelectionMode === 'tp' ? colors.success : colors.border
                    }}
                  >
                    <Text style={{ color: activeSelectionMode === 'tp' ? '#0B0B0B' : colors.text }} className="text-xs font-semibold">Set TP</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setActiveSelectionMode('sl');
                      setTimeout(postAdminChartMarkers, 0);
                    }}
                    className="rounded px-2 py-1 border"
                    style={{
                      backgroundColor: activeSelectionMode === 'sl' ? colors.danger : colors.surface,
                      borderColor: activeSelectionMode === 'sl' ? colors.danger : colors.border
                    }}
                  >
                    <Text style={{ color: activeSelectionMode === 'sl' ? '#FFFFFF' : colors.text }} className="text-xs font-semibold">Set SL</Text>
                  </Pressable>
                </View>
              </View>

              <View className="mb-1.5 flex-row gap-1.5">
                {['1m', '15m', '30m', '1H', '4H', '1D'].map((tf) => (
                  <Pressable
                    key={tf}
                    onPress={() => setChartTimeframe(tf)}
                    className="rounded px-2 py-1 border"
                    style={{
                      backgroundColor: chartTimeframe === tf ? colors.primary : colors.surface,
                      borderColor: chartTimeframe === tf ? colors.primary : colors.border
                    }}
                  >
                    <Text style={{ color: chartTimeframe === tf ? '#0B0B0B' : colors.text }} className="text-xs font-semibold">{tf}</Text>
                  </Pressable>
                ))}
              </View>

              <View className="h-72 overflow-hidden rounded-2xl border" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                {chartLoading ? (
                  <View className="flex-1 items-center justify-center">
                    <Text style={{ color: colors.muted }} className="text-sm">Loading chart data...</Text>
                  </View>
                ) : chartCandles.length > 0 ? (
                  Platform.OS === 'web' ? (
                    <iframe
                      ref={adminChartFrameRef}
                      key={`${addTradeForm.symbol}-${chartTimeframe}`}
                      title="Admin trade selector chart"
                      srcDoc={adminChartSource}
                      onLoad={postAdminChartMarkers}
                      style={{ width: '100%', height: '100%', border: 0 }}
                    />
                  ) : (
                    <WebView
                      ref={adminChartWebViewRef}
                      key={`${addTradeForm.symbol}-${chartTimeframe}`}
                      originWhitelist={['*']}
                      domStorageEnabled
                      javaScriptEnabled
                      onMessage={handleAdminChartMessage}
                      onLoadEnd={postAdminChartMarkers}
                      source={{ html: adminChartSource }}
                      style={{ flex: 1, backgroundColor: colors.surface }}
                    />
                  )
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text style={{ color: colors.muted }} className="text-sm">No candle data available for {addTradeForm.symbol}</Text>
                  </View>
                )}
              </View>
            </View>
            <View className="gap-3 rounded-xl border p-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <View className={`flex-wrap gap-3 ${mobile ? 'flex-col' : 'flex-row'}`}>
                <View className={mobile ? 'w-full' : 'w-[300px]'}>
                  <Text className="mb-2 text-xs font-medium uppercase" style={{ color: colors.muted }}>Side</Text>
                  <View className="flex-row gap-2">
                    {[
                      { id: 'BUY', label: 'BUY / LONG' },
                      { id: 'SELL', label: 'SELL / SHORT' },
                    ].map((s) => {
                      const isSelected = addTradeForm.side === s.id;
                      const activeColor = s.id === 'BUY' ? colors.success : colors.danger;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setAddTradeForm((prev) => ({ ...prev, side: s.id }))}
                          className="h-11 flex-1 items-center justify-center rounded-2xl border px-4"
                          style={{
                            backgroundColor: isSelected ? activeColor : colors.panel,
                            borderColor: isSelected ? activeColor : colors.border,
                          }}
                        >
                          <Text style={{ color: isSelected ? '#0B0B0B' : colors.text }} className="text-xs font-semibold">{s.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <View className={mobile ? 'w-full' : 'w-[180px]'}>
                  <Text className="mb-2 text-xs font-medium uppercase" style={{ color: colors.muted }}>Lots</Text>
                  <CustomInput
                    value={addTradeForm.lots}
                    onChangeText={(lots) => setAddTradeForm((prev) => ({ ...prev, lots }))}
                    placeholder="e.g. 0.1"
                  />
                </View>
              </View>
 
              <View className={`flex-wrap gap-3 ${mobile ? 'flex-col' : 'flex-row'}`}>
                <View className={mobile ? 'w-full' : 'min-w-[220px] flex-1'}>
                  <Text className="mb-2 text-xs font-medium uppercase" style={{ color: colors.muted }}>
                    {addTradeForm.type === 'live' ? 'Open Price (Auto Live)' : 'Open Price'}
                  </Text>
                  <CustomInput
                    value={addTradeForm.openPrice}
                    editable={addTradeForm.type === 'past'}
                    onFocus={() => {
                      if (addTradeForm.type === 'past') setActiveSelectionMode('open');
                    }}
                    onChangeText={(openPrice) => {
                      if (addTradeForm.type === 'past') setAddTradeForm((prev) => ({ ...prev, openPrice }));
                    }}
                    placeholder={addTradeForm.type === 'live' ? 'Auto live price' : 'Chart / price'}
                  />
                </View>
 
                {addTradeForm.type === 'past' ? (
                  <View className={mobile ? 'w-full' : 'min-w-[220px] flex-1'}>
                    <Text className="mb-2 text-xs font-medium uppercase" style={{ color: colors.muted }}>Open Date & Time</Text>
                    <DateTimePickerInput
                      value={addTradeForm.openDate}
                      onFocus={() => setActiveSelectionMode('open')}
                      onChangeText={(openDate) => {
                        setAddTradeForm((prev) => ({ ...prev, openDate }));
                        fetchHistoricalPrice('openPrice', addTradeForm.symbol, openDate);
                      }}
                      placeholder="Select opening date and time"
                    />
                  </View>
                ) : null}
              </View>
 
              <View className={`flex-wrap gap-3 ${mobile ? 'flex-col' : 'flex-row'}`}>
                <View className={mobile ? 'w-full' : 'min-w-[220px] flex-1'}>
                  <Text className="mb-2 text-xs font-medium uppercase" style={{ color: colors.muted }}>Stop Loss</Text>
                  <CustomInput
                    value={addTradeForm.stopLoss}
                    onFocus={() => setActiveSelectionMode('sl')}
                    onChangeText={(stopLoss) => setAddTradeForm((prev) => ({ ...prev, stopLoss }))}
                    placeholder="Chart / price"
                  />
                </View>
                <View className={mobile ? 'w-full' : 'min-w-[220px] flex-1'}>
                  <Text className="mb-2 text-xs font-medium uppercase" style={{ color: colors.muted }}>Take Profit</Text>
                  <CustomInput
                    value={addTradeForm.takeProfit}
                    onFocus={() => setActiveSelectionMode('tp')}
                    onChangeText={(takeProfit) => setAddTradeForm((prev) => ({ ...prev, takeProfit }))}
                    placeholder="Chart / price"
                  />
                </View>
              </View>

              <View className="rounded-2xl border p-3" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-medium uppercase" style={{ color: colors.muted }}>Trade Snapshot</Text>
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.success }} />
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {[
                    ['Account', selectedAddTradeAccount ? `${selectedAddTradeAccount.name} (${selectedAddTradeAccount.type})` : 'Select account'],
                    ['Balance', `${money(addTradeSnapshot.accountBalance)} USD`],
                    ['Lev', `1:${addTradeSnapshot.leverage}`],
                    ['Spread', addTradeSnapshot.spread ? quote(addTradeSnapshot.spread, livePriceInfo?.decimals ?? 2) : '-'],
                    ['Vol', `${money(addTradeSnapshot.lots)} lots`],
                    ['Open', addTradeSnapshot.openPrice ? quote(addTradeSnapshot.openPrice, livePriceInfo?.decimals ?? 2) : '-'],
                    ['SL', addTradeForm.stopLoss ? quote(addTradeForm.stopLoss, livePriceInfo?.decimals ?? 2) : '-'],
                    ['TP', addTradeForm.takeProfit ? quote(addTradeForm.takeProfit, livePriceInfo?.decimals ?? 2) : '-'],
                    ['Margin', `${money(addTradeSnapshot.requiredMargin)} USD`],
                    [
                      addTradeSnapshot.closesImmediately ? 'After close' : 'Free after margin',
                      `${money(addTradeSnapshot.closesImmediately ? addTradeSnapshot.balanceAfterClose : addTradeSnapshot.freeAfterMargin)} USD`,
                      addTradeSnapshot.closesImmediately ? null : 'muted'
                    ],
                    ...(addTradeSnapshot.takeProfitEstimate == null ? [] : [
                      ['TP P/L', `${addTradeSnapshot.takeProfitEstimate >= 0 ? '+' : ''}${money(addTradeSnapshot.takeProfitEstimate)} USD`, addTradeSnapshot.takeProfitEstimate >= 0 ? 'success' : 'danger'],
                      ['If TP hit', `${money(addTradeSnapshot.balanceAfterTakeProfit)} USD`, addTradeSnapshot.takeProfitEstimate >= 0 ? 'success' : 'danger'],
                    ]),
                    ...(addTradeSnapshot.stopLossEstimate == null ? [] : [
                      ['SL P/L', `${addTradeSnapshot.stopLossEstimate >= 0 ? '+' : ''}${money(addTradeSnapshot.stopLossEstimate)} USD`, addTradeSnapshot.stopLossEstimate >= 0 ? 'success' : 'danger'],
                      ['If SL hit', `${money(addTradeSnapshot.balanceAfterStopLoss)} USD`, addTradeSnapshot.stopLossEstimate >= 0 ? 'success' : 'danger'],
                    ]),
                  ].map(([label, value, tone]) => {
                    const danger = tone === 'danger' || (!tone && ['After close'].includes(label) && Number(String(value).replace(/[^0-9.-]/g, '')) < 0);
                    const success = tone === 'success';
                    return (
                      <View key={label} className="min-w-[120px] flex-1 rounded-xl border px-3 py-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                        <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>{label}</Text>
                        <Text className="mt-1 text-xs font-semibold" numberOfLines={1} style={{ color: danger ? colors.danger : success ? colors.success : colors.text }}>{value}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {addTradeForm.type === 'past' && addTradeForm.status === 'closed' ? (
                <View className="flex-row flex-wrap gap-3">
                  <View className="min-w-[220px] flex-1">
                    <Text className="mb-2 text-xs font-medium uppercase" style={{ color: colors.muted }}>Close Price</Text>
                    <CustomInput
                      value={addTradeForm.closePrice}
                      onFocus={() => setActiveSelectionMode('close')}
                      onChangeText={(closePrice) => setAddTradeForm((prev) => ({ ...prev, closePrice }))}
                      placeholder="Leave blank to auto-fetch or enter price"
                    />
                  </View>
                  <View className="min-w-[220px] flex-1">
                    <Text className="mb-2 text-xs font-medium uppercase" style={{ color: colors.muted }}>Close Date & Time</Text>
                    <DateTimePickerInput
                      value={addTradeForm.closeDate}
                      onFocus={() => setActiveSelectionMode('close')}
                      onChangeText={(closeDate) => {
                        setAddTradeForm((prev) => ({ ...prev, closeDate }));
                        fetchHistoricalPrice('closePrice', addTradeForm.symbol, closeDate);
                      }}
                      placeholder="Select closing date and time"
                    />
                  </View>
                </View>
              ) : null}

              {addTradeForm.type === 'past' && addTradeForm.status === 'closed' ? (
                <View>
                  <Text className="mb-2 text-xs font-medium uppercase" style={{ color: colors.muted }}>Profit / Loss (Override)</Text>
                  <CustomInput
                    value={addTradeForm.profit}
                    onChangeText={(profit) => setAddTradeForm((prev) => ({ ...prev, profit }))}
                    placeholder="Leave blank to auto-calculate or enter override"
                  />
                </View>
              ) : null}
            </View>

            {addTradeForm.type === 'past' && addTradeForm.status === 'closed' ? (
              <View className="rounded-xl border p-4 font-semibold" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <Text className="text-xs font-medium uppercase" style={{ color: colors.muted }}>Profit / Loss Calculator Preview</Text>
                <Text className={`mt-2 text-lg font-semibold ${currentPreviewProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                  Calculated: {currentPreviewProfit >= 0 ? '+' : ''}${money(currentPreviewProfit)}
                </Text>
                <Text className="mt-1 text-[11px]" style={{ color: colors.muted }}>
                  Formula: (Close Price - Open Price) * Side * Lots * Contract Size ({getContractSize(addTradeForm.symbol)})
                </Text>
              </View>
            ) : null}

            <View className={`mt-4 flex-row gap-3 ${mobile ? 'justify-center' : ''}`}>
              <Pressable
                disabled={addTradeLoading || !addTradeForm.tradingAccountId}
                onPress={handleAddTradeSubmit}
                className={`min-h-[38px] items-center justify-center rounded-xl px-4 ${mobile ? 'w-[120px]' : 'w-[260px]'} ${addTradeLoading || !addTradeForm.tradingAccountId ? 'opacity-50' : ''}`}
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="font-semibold text-xs md:text-sm" style={{ color: '#0B0B0B' }}>
                  {addTradeLoading ? 'Placing...' : 'Execute & Add'}
                </Text>
              </Pressable>
              <Pressable
                disabled={addTradeLoading}
                onPress={() => setSelectedImpersonateClient(null)}
                className={`min-h-[38px] items-center justify-center rounded-xl border px-4 ${mobile ? 'w-[120px]' : 'w-[160px]'}`}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="font-semibold text-xs md:text-sm" style={{ color: colors.text }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View className="rounded-2xl border p-6" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
        <View className="mb-6">
          <Text className="text-xl font-medium" style={{ color: colors.text }}>Select a Client</Text>
          <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Choose a client to place a live trade or inject historical trades directly on their behalf.</Text>
        </View>

        <View className="relative mb-5">
          <CustomInput
            value={impersonateSearchQuery}
            onChangeText={setImpersonateSearchQuery}
            placeholder="Search by name or email..."
            style={{ paddingLeft: 44 }}
          />
          <View className="absolute left-4 top-3.5">
            <Search size={18} color={colors.muted} />
          </View>
        </View>

        <View className="overflow-hidden rounded-xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <View className="flex-row border-b p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
            <Text className="text-xs font-semibold uppercase flex-1" style={{ color: colors.muted }}>Name</Text>
            <Text className="text-xs font-semibold uppercase flex-1 hidden md:flex" style={{ color: colors.muted }}>Email</Text>
            <Text className="text-xs font-semibold uppercase w-36 text-center" style={{ color: colors.muted }}>Action</Text>
          </View>

          {filteredClients.map((user) => {
            const userAccounts = user.tradingAccounts || [];
            const defaultAccount = preferredAddTradeAccount(userAccounts);
            return (
              <View key={user.id} className="flex-row items-center border-b p-4" style={{ borderColor: colors.border }}>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    {isOnlineUser(user) ? (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                    ) : null}
                    <Text className="min-w-0 flex-1 text-sm font-semibold" numberOfLines={1} style={{ color: colors.text }}>{user.name || 'Client'}</Text>
                  </View>
                  <Text className="text-xs md:hidden" style={{ color: colors.muted }}>{user.email}</Text>
                </View>
                <Text className="text-sm flex-1 hidden md:flex" style={{ color: colors.muted }}>{user.email}</Text>
                <View className="w-36 items-center">
                  <Pressable
                    onPress={() => {
                      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
                      setSelectedImpersonateClient(user);
                      setAddTradeForm({
                        symbol: 'XAU/USD',
                        side: 'BUY',
                        lots: '0.1',
                        type: 'past',
                        status: 'closed',
                        openDate: nowStr,
                        closeDate: nowStr,
                        openPrice: '',
                        closePrice: '',
                        stopLoss: '',
                        takeProfit: '',
                        profit: '',
                        tradingAccountId: defaultAccount.id || '',
                      });
                      setAddTradeError('');
                      setAddTradeSuccess('');
                    }}
                    className="rounded-2xl px-4 py-2 border"
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: colors.primary }}>Trade</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

          {filteredClients.length === 0 ? (
            <View className="p-8 items-center justify-center">
              <Text style={{ color: colors.muted }}>No clients found.</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderTrades = () => {
    const grouped = [];
    const groups = {};

    (filteredTrades || []).forEach((trade) => {
      const uId = trade.userId || trade.User?.id || 'unknown';
      const uName = trade.User?.name || 'Unknown User';
      const uEmail = trade.User?.email || '';

      if (!groups[uId]) {
        groups[uId] = {
          userId: uId,
          userName: uName,
          userEmail: uEmail,
          trades: [],
          runningCount: 0,
        };
        grouped.push(groups[uId]);
      }

      groups[uId].trades.push(trade);
      if (trade.status === 'open') {
        groups[uId].runningCount += 1;
      }
    });

    return (
      <View className="gap-4">
        {renderSearchBar(tradesSearchQuery, setTradesSearchQuery, 'Search trades by user, email, symbol, side or status')}
        {grouped.map((group) => {
          const isExpanded = !!expandedUsers[group.userId];
          return (
            <View key={group.userId} className="overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Pressable
                onPress={() => toggleUserExpand(group.userId)}
                className={mobile ? 'p-4' : 'flex-row items-center justify-between p-4'}
                style={{ backgroundColor: colors.panel }}
              >
                {mobile ? (
                  <View>
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1 flex-row items-center gap-3">
                        <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.border }}>
                          <UserRound size={21} color={colors.text} />
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text className="text-base font-semibold" numberOfLines={1} style={{ color: colors.text }}>{group.userName}</Text>
                          {group.userEmail ? (
                            <Text className="mt-1 text-xs" numberOfLines={2} style={{ color: colors.muted }}>{group.userEmail}</Text>
                          ) : null}
                        </View>
                      </View>
                      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}>
                        {isExpanded ? (
                          <ChevronUp size={19} color={colors.muted} />
                        ) : (
                          <ChevronDown size={19} color={colors.muted} />
                        )}
                      </View>
                    </View>
                    <View className="mt-4 flex-row gap-2">
                      <View className="min-w-0 flex-1 rounded-2xl border px-3 py-2" style={{ backgroundColor: group.runningCount > 0 ? `${colors.success}18` : colors.surface, borderColor: group.runningCount > 0 ? `${colors.success}44` : colors.border }}>
                        <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>Running</Text>
                        <Text className="mt-1 text-sm font-semibold" numberOfLines={1} style={{ color: group.runningCount > 0 ? colors.success : colors.muted }}>
                          {group.runningCount} Trade{group.runningCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View className="min-w-0 flex-1 rounded-2xl border px-3 py-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                        <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>Total</Text>
                        <Text className="mt-1 text-sm font-semibold" numberOfLines={1} style={{ color: colors.text }}>
                          {group.trades.length} Trade{group.trades.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <>
                    <View className="flex-1 flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.border }}>
                        <UserRound size={20} color={colors.text} />
                      </View>
                      <View>
                        <Text className="text-base font-semibold" style={{ color: colors.text }}>{group.userName}</Text>
                        {group.userEmail ? (
                          <Text className="text-xs" style={{ color: colors.muted }}>{group.userEmail}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View className="flex-row items-center gap-4">
                      <View className={`rounded-full px-3 py-1 ${group.runningCount > 0 ? 'bg-success/20' : 'bg-muted/10'}`}>
                        <Text className={`text-xs font-semibold ${group.runningCount > 0 ? 'text-success' : 'text-muted'}`}>
                          {group.runningCount} Running Trade{group.runningCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View className="rounded-full bg-border/40 px-3 py-1">
                        <Text className="text-xs font-medium" style={{ color: colors.muted }}>
                          {group.trades.length} Total Trade{group.trades.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={20} color={colors.muted} />
                      ) : (
                        <ChevronDown size={20} color={colors.muted} />
                      )}
                    </View>
                  </>
                )}
              </Pressable>

              {isExpanded && (
                mobile ? (
                  <View className="px-4 py-2.5 gap-2.5" style={{ backgroundColor: colors.surface }}>
                    {group.trades.map((trade) => {
                      const sideColor = trade.side === 'BUY' ? colors.success : colors.danger;
                      const statusColor = trade.status === 'open' ? colors.success : trade.status === 'pending' ? colors.primary : colors.muted;
                      const profitColor = Number(trade.profit) < 0 ? colors.danger : colors.success;

                      return (
                        <View
                          key={trade.id}
                          className="rounded-xl border p-3.5 gap-2"
                          style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}
                        >
                          {/* Row 1: Symbol & Side */}
                          <View className="flex-row justify-between items-center">
                            <Text className="text-sm font-bold" style={{ color: colors.text }}>{trade.symbol}</Text>
                            <Text className="text-xs font-bold uppercase rounded px-2 py-0.5" style={{ backgroundColor: `${sideColor}18`, color: sideColor }}>
                              {trade.side}
                            </Text>
                          </View>

                          {/* Row 2: Lots & Status */}
                          <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center gap-1">
                              <Text className="text-xs" style={{ color: colors.muted }}>Lots:</Text>
                              <Text className="text-xs font-semibold" style={{ color: colors.text }}>{trade.lots}</Text>
                            </View>
                            <View className="rounded px-2 py-0.5" style={{ backgroundColor: `${statusColor}18` }}>
                              <Text className="text-[10px] font-bold uppercase" style={{ color: statusColor }}>{trade.status}</Text>
                            </View>
                          </View>

                          {/* Row 3: Profit & Date */}
                          <View className="flex-row justify-between items-center pt-2 border-t" style={{ borderTopColor: `${colors.border}40` }}>
                            <View>
                              <Text className="text-[9px] uppercase font-bold" style={{ color: colors.muted }}>Profit/Loss</Text>
                              <Text className="text-xs font-bold mt-0.5" style={{ color: profitColor }}>
                                ${money(trade.profit)}
                              </Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-[9px] uppercase font-bold" style={{ color: colors.muted }}>Date</Text>
                              <Text className="text-xs font-semibold mt-0.5" style={{ color: colors.text }}>
                                {dateTime(trade.createdAt)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <ScrollView horizontal contentContainerStyle={{ minWidth: '100%' }}>
                    <View style={{ minWidth: 700, flexGrow: 1 }}>
                      <View className="flex-row border-b px-6 py-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                        {['Symbol', 'Side', 'Lots', 'Status', 'Profit / Loss', 'Created'].map((heading) => (
                          <Text key={heading} className="text-xs font-semibold uppercase" style={{ width: heading === 'Created' ? 150 : 110, flexGrow: 1, color: colors.muted }}>{heading}</Text>
                        ))}
                      </View>
                      {group.trades.map((trade) => (
                        <View key={trade.id} className="flex-row border-b px-6 py-4 items-center" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                          <Text className="text-sm font-medium" style={{ width: 110, flexGrow: 1, color: colors.text }}>{trade.symbol}</Text>
                          <Text className={`text-sm font-semibold ${trade.side === 'BUY' ? 'text-success' : 'text-danger'}`} style={{ width: 110, flexGrow: 1 }}>{trade.side}</Text>
                          <Text className="text-sm" style={{ width: 110, flexGrow: 1, color: colors.text }}>{trade.lots}</Text>
                          <View style={{ width: 110, flexGrow: 1 }}>
                            <View className={`self-start rounded px-2 py-0.5 ${trade.status === 'open' ? 'bg-success/20' : trade.status === 'pending' ? 'bg-warning/20' : 'bg-muted/10'}`}>
                              <Text className={`text-xs font-medium uppercase ${trade.status === 'open' ? 'text-success' : trade.status === 'pending' ? 'text-warning' : 'text-muted'}`}>
                                {trade.status}
                              </Text>
                            </View>
                          </View>
                          <Text className={`text-sm font-semibold ${Number(trade.profit) < 0 ? 'text-danger' : 'text-success'}`} style={{ width: 110, flexGrow: 1 }}>${money(trade.profit)}</Text>
                          <Text className="text-sm" style={{ width: 150, flexGrow: 1, color: colors.muted }}>{dateTime(trade.createdAt)}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )
              )}
            </View>
          );
        })}
        {!grouped.length ? (
          <View className="p-8 items-center justify-center rounded-2xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Text style={{ color: colors.muted }}>No trades found.</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View className={mobile ? 'flex-1' : 'flex-1 flex-row'} style={{ backgroundColor: colors.background }}>
      <AdminSidebar
        section={section}
        onChange={handleSectionChange}
        userManagementSubpage={userManagementSubpage}
        onUserManagementSubpageChange={setUserManagementSubpage}
        depositSubpage={depositSubpage}
        onDepositSubpageChange={setDepositSubpage}
        withdrawalSubpage={withdrawalSubpage}
        onWithdrawalSubpageChange={setWithdrawalSubpage}
        pendingCount={{ deposits: depositPendingCount, withdrawals: withdrawalPendingCount, referrals: referralPendingCount }}
        bankPendingCount={bankPendingCount}
        newUserCount={newUserCount}
        verificationPendingCount={verificationPendingCount}
        lowMarginCount={lowMarginUsers.length}
        adminUser={adminUser}
        onSignOut={signOut}
        onRefresh={load}
        refreshing={loading}
        onOpenSettings={() => {
          setAdminProfileError('');
          setAdminProfileOpen(true);
        }}
        onToggleTheme={toggleTheme}
        adminNotificationCount={adminNotificationCount}
        onToggleNotifications={() => setNotificationsOpen((current) => !current)}
        onReturnToMaster={() => router.replace('/master')}
        companyFrozen={companyStatus === 'suspended'}
      />
      <Modal visible={notificationsOpen} transparent animationType="fade" onRequestClose={() => setNotificationsOpen(false)}>
        <Pressable className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.12)' }} onPress={() => setNotificationsOpen(false)}>
          <View className="absolute right-4 top-16">
            <Pressable onPress={(event) => event.stopPropagation?.()}>
              <AdminNotificationMenu
                notifications={adminNotifications}
                colors={colors}
                darkMode={darkMode}
                onClose={() => setNotificationsOpen(false)}
                onReadAll={markAllAdminNotificationsRead}
              />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <ScrollView
        ref={mainScrollRef}
        className="flex-1"
        contentContainerClassName="px-2.5 py-3 md:p-8"
        style={{
          backgroundColor: colors.background,
          ...(mobile && (balanceModal || settingsUser || walletModal || transactionsModal || depositDetails || fundingReview || userOverviewModal || verificationUser || receiptModal)
            ? { display: 'none' }
            : {}),
        }}
      >
        {true && (
        <View className={mobile ? 'mb-5 gap-3' : 'mb-5 flex-row flex-wrap items-start justify-between gap-3'}>
          {section !== 'agents' && !(mobile && section === 'userManagement' && userManagementSubpage === 'assignUsers') ? (
            <View className={mobile ? 'w-full flex-row items-center justify-between' : 'min-w-0 flex-1'}>

              <Text className={`${mobile ? 'text-2xl' : 'text-3xl'} font-medium`} adjustsFontSizeToFit style={{ color: colors.text, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {section === 'overview' ? 'Overview'
                  : section === 'marginAlerts' ? 'Margin Alerts'
                  : section === 'users' ? 'User Wallet Management'
                  : section === 'userManagement' ? (userManagementSubpage === 'assignUsers' ? 'Assign Users to Agents' : 'User Management')
                  : section === 'verifications' ? 'Verifications'
                  : section === 'deposits' ? (depositSubpage === 'addresses' ? 'Deposit Method Addresses' : 'Deposits')
                  : section === 'referrals' ? 'Referral Rewards'
                  : section === 'withdrawals' ? 'Withdrawals'
                  : section === 'userLevels' ? 'User Levels'
                  : section === 'trades' ? 'Trade Monitor'
                  : section === 'bonusPosts' ? 'Bonus Posts'
                  : section === 'symbols' ? 'Symbol Settings'
                  : section === 'agents' ? 'Staff Management'
                  : 'Add Trading'}
              </Text>
              {mobile && section === 'userManagement' ? (
                <Pressable
                  onPress={() => setAddUserTrigger((prev) => prev + 1)}
                  className="h-8 flex-row items-center justify-center rounded-2xl border px-2.5"
                  style={{ backgroundColor: colors.primary, borderColor: colors.primary }}
                >
                  <Plus size={14} color="#111827" />
                  <Text className="ml-1 text-xs font-semibold" style={{ color: '#111827' }}>Add User</Text>
                </Pressable>
              ) : null}
              {!mobile ? (
                <Text className="mt-2" style={{ color: colors.muted }}>
                  {section === 'symbols' ? 'Configure trading symbols visible to users.' 
                    : section === 'referrals' ? 'Approve and manage client referral commission rewards.' 
                    : section === 'agents' ? 'Create and manage staff members (Agents & Managers) with specific permissions.'
                    : 'Manage client balances, trading access and financial operations.'}
                </Text>
              ) : null}
            </View>
          ) : null}
          {!mobile ? (
            <ScrollView
              horizontal={mobile}
              showsHorizontalScrollIndicator={false}
              className={mobile ? 'w-full' : ''}
              style={{ overflow: 'visible' }}
              contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 8, flexWrap: 'nowrap', justifyContent: 'flex-end', overflow: 'visible', paddingTop: 7, paddingRight: 7 }}
            >
              <View className="relative h-12 w-12 overflow-visible" style={{ zIndex: 20, elevation: 20 }}>
                <Pressable onPress={() => setNotificationsOpen((current) => !current)} className="h-12 w-12 items-center justify-center rounded-xl border p-0" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                  <Bell size={20} color={colors.text} />
                </Pressable>
                {adminNotificationCount ? (
                  <View
                    pointerEvents="none"
                    className="absolute items-center justify-center"
                    style={{
                      top: -7,
                      right: -5,
                      minWidth: 18,
                      height: 18,
                      backgroundColor: colors.danger,
                      borderRadius: 999,
                      paddingHorizontal: 4,
                      zIndex: 30,
                      elevation: 30,
                    }}
                  >
                    <Text
                      style={{
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: '700',
                        lineHeight: 18,
                        textAlign: 'center',
                      }}
                    >
                      {adminNotificationCount > 9 ? '9+' : adminNotificationCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Pressable onPress={toggleTheme} className="h-12 w-12 items-center justify-center rounded-xl border p-0" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                {darkMode ? <Sun size={20} color={colors.text} /> : <Moon size={20} color={colors.text} />}
              </Pressable>
              <Pressable
                onPress={() => {
                  setAdminProfileError('');
                  setAdminProfileOpen(true);
                }}
                accessibilityLabel="Admin profile settings"
                className="h-12 w-12 items-center justify-center rounded-xl border p-0"
                style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}
              >
                <Settings size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={load} className="h-12 w-12 items-center justify-center rounded-xl border p-0" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                <RefreshCw size={20} color={loading ? '#27a8e9' : colors.muted} />
              </Pressable>
              <Pressable onPress={signOut} accessibilityLabel="Sign out" className="h-12 w-12 items-center justify-center rounded-xl border p-0" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                <LogOut size={20} color={colors.danger} />
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
        )}
        {message ? <Text className="mb-5 rounded-xl border border-success/40 bg-success/10 p-4 text-success">{message}</Text> : null}
        {error ? <Text className="mb-5 rounded-xl border border-danger/40 bg-danger/10 p-4 text-danger">{error}</Text> : null}
        {section === 'overview' && canViewSection('overview') ? (
          <View>
            {companyStatus === 'suspended' && adminUser?.role !== 'master' ? (
              <View className="min-h-[460px] items-center justify-center rounded-3xl border p-8" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                <ShieldCheck size={46} color={colors.danger} />
                <Text className="mt-4 text-center text-2xl font-bold" style={{ color: colors.text }}>Company Access Frozen</Text>
                <Text className="mt-2 max-w-xl text-center text-sm" style={{ color: colors.muted }}>This company console is temporarily locked. Contact Support to unlock access.</Text>
                <Pressable onPress={signOut} className="mt-6 rounded-xl px-6 py-3" style={{ backgroundColor: colors.danger }}>
                  <Text className="font-semibold text-white">Sign Out</Text>
                </Pressable>
              </View>
            ) : (
            <>
            {/* Timeframe Selector for Financial Metrics */}
            <View className="mb-4 flex-row justify-between items-center flex-wrap gap-3" style={{ zIndex: 50 }}>
              <View className="flex-row flex-wrap items-center gap-3">
                <Text className="text-sm font-semibold" style={{ color: colors.muted }}>Financial Metrics Summary</Text>
                {adminUser?.role === 'master' ? (
                  <Pressable
                    disabled={companyStatusLoading}
                    onPress={() => updateCompanyFreeze(companyStatus === 'suspended' ? 'active' : 'suspended')}
                    className="rounded-xl border px-4 py-2"
                    style={{ backgroundColor: companyStatus === 'suspended' ? `${colors.success}18` : `${colors.danger}12`, borderColor: companyStatus === 'suspended' ? colors.success : colors.danger, opacity: companyStatusLoading ? 0.65 : 1 }}
                  >
                    <Text className="text-xs font-bold" style={{ color: companyStatus === 'suspended' ? colors.success : colors.danger }}>
                      {companyStatusLoading ? 'Updating...' : companyStatus === 'suspended' ? 'Unfreeze Company' : 'Freeze Company'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-semibold" style={{ color: colors.muted }}>Filter Period:</Text>
                <TimeframeDropdown
                  value={metricsTimeframe}
                  onChange={setMetricsTimeframe}
                  options={metricsTimeframeOptions}
                  colors={colors}
                />
              </View>
            </View>

            {/* Financial Metrics Cards */}
            <View className="flex-row flex-wrap gap-2 mb-6">
              <MetricCard
                title="Total Deposits"
                value={`$${money(totalApprovedDeposits)}`}
                subValue="Funding intake active"
                icon={Coins}
                color={colors.primary}
                trend="up"
              />
              <MetricCard
                title="Total Withdrawals"
                value={`$${money(totalApprovedWithdrawals)}`}
                subValue="Cash outs settled"
                icon={Wallet}
                color={colors.danger}
                trend="down"
              />
              <MetricCard
                title="Net Cash Flow"
                value={`$${money(netCashFlow)}`}
                subValue="Liquidity balance"
                icon={TrendingUp}
                color={netCashFlow >= 0 ? colors.success : colors.danger}
                trend={netCashFlow >= 0 ? 'up' : 'down'}
              />
            </View>



            {/* Analytics Grid */}
            <View className="flex-col lg:flex-row flex-wrap gap-4">
              {/* Card 1: User Registrations */}
              <View className="w-full lg:flex-1 lg:min-w-[280px] rounded-2xl p-6" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: darkMode ? 1 : 0, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: darkMode ? 0.2 : 0.06, shadowRadius: 24, elevation: 8 }}>
                <View className="mb-4 flex-row items-start justify-between" style={{ height: 60 }}>
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-bold" style={{ color: colors.text }}>Daily Registrations</Text>
                    <Text className="text-xs" style={{ color: colors.muted }}>New users joined over selected timeframe</Text>
                  </View>
                  <Pressable
                    onPress={() => setTodayRegistrationsOpen(true)}
                    className="h-10 w-10 items-center justify-center rounded-xl border"
                    style={{ backgroundColor: `${colors.primary}16`, borderColor: `${colors.primary}40` }}
                    accessibilityRole="button"
                    accessibilityLabel="View today's registrations"
                  >
                    <ArrowUpRight size={19} color={colors.primary} strokeWidth={2.4} />
                  </Pressable>
                </View>
                <MiniBarChart
                  data={dailyNewUsers}
                  color={colors.primary}
                  height={150}
                />
              </View>

              {/* Card 2: Cash Flow (Deposits vs Withdrawals) */}
              <View className="w-full lg:flex-1 lg:min-w-[280px] rounded-2xl p-6" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: darkMode ? 1 : 0, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: darkMode ? 0.2 : 0.06, shadowRadius: 24, elevation: 8 }}>
                <View className="mb-4" style={{ height: 60, justifyContent: 'flex-start' }}>
                  <Text className="text-base font-bold" style={{ color: colors.text }}>Deposits vs Withdrawals</Text>
                  <Text className="text-xs" style={{ color: colors.muted }}>Daily comparison of cash inflow and outflows</Text>
                </View>
                <GroupedBarChart
                  data={dailyCashflow}
                  key1="deposit"
                  key2="withdrawal"
                  color1={colors.success}
                  color2={colors.danger}
                  label1="Deposits"
                  label2="Withdrawals"
                  height={150}
                />
              </View>

              {/* Card 3: Trader Performance (Profit vs Loss) */}
              <View className="w-full lg:flex-1 lg:min-w-[280px] rounded-2xl p-6" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: darkMode ? 1 : 0, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: darkMode ? 0.2 : 0.06, shadowRadius: 24, elevation: 8 }}>
                <View className="mb-4" style={{ height: 60, justifyContent: 'flex-start' }}>
                  <Text className="text-base font-bold" style={{ color: colors.text }}>Traders Profit vs Loss</Text>
                  <Text className="text-xs" style={{ color: colors.muted }}>Daily client winning vs losing trades</Text>
                </View>
                <DualLineChart
                  data={dailyProfitLoss}
                  key1="profit"
                  key2="loss"
                  color1={colors.success}
                  color2={colors.danger}
                  label1="Client Profits"
                  label2="Client Losses"
                  height={150}
                />
              </View>
            </View>

            {/* Leaderboards Grid */}
            <View className="flex-col lg:flex-row flex-wrap gap-4 mt-6">
              {/* Leaderboard: Top Earners */}
              <View className="w-full lg:flex-1 lg:min-w-[280px] rounded-2xl p-6" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: darkMode ? 1 : 0, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: darkMode ? 0.2 : 0.06, shadowRadius: 24, elevation: 8 }}>
                <Text className="text-base font-bold mb-4" style={{ color: colors.text }}>Top Earners</Text>
                <View className="gap-3.5">
                  {topEarners.slice(0, 10).map((item, idx) => (
                    <View key={item.user.id} className="flex-row items-center justify-between border-b pb-2" style={{ borderColor: colors.border }}>
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-6 w-6 rounded-full items-center justify-center bg-success/10">
                          <Text className="text-xs font-bold text-success">{idx + 1}</Text>
                        </View>
                        <View>
                          <Text className="text-xs font-bold" style={{ color: colors.text }}>{item.user.name}</Text>
                          <Text className="text-[10px]" style={{ color: colors.muted }}>{item.user.email}</Text>
                        </View>
                      </View>
                      <Text className="text-xs font-bold text-success">+${money(item.value)}</Text>
                    </View>
                  ))}
                  {!topEarners.length ? <Text className="text-xs" style={{ color: colors.muted }}>No earnings recorded.</Text> : null}
                </View>
              </View>

              {/* Leaderboard: Top Depositors */}
              <View className="w-full lg:flex-1 lg:min-w-[280px] rounded-2xl p-6" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: darkMode ? 1 : 0, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: darkMode ? 0.2 : 0.06, shadowRadius: 24, elevation: 8 }}>
                <Text className="text-base font-bold mb-4" style={{ color: colors.text }}>Top Depositors</Text>
                <View className="gap-3.5">
                  {topDepositors.slice(0, 10).map((item, idx) => (
                    <View key={item.user.id} className="flex-row items-center justify-between border-b pb-2" style={{ borderColor: colors.border }}>
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-6 w-6 rounded-full items-center justify-center bg-primary/10">
                          <Text className="text-xs font-bold text-primary">{idx + 1}</Text>
                        </View>
                        <View>
                          <Text className="text-xs font-bold" style={{ color: colors.text }}>{item.user.name}</Text>
                          <Text className="text-[10px]" style={{ color: colors.muted }}>{item.user.email}</Text>
                        </View>
                      </View>
                      <Text className="text-xs font-bold" style={{ color: colors.text }}>${money(item.value)}</Text>
                    </View>
                  ))}
                  {!topDepositors.length ? <Text className="text-xs" style={{ color: colors.muted }}>No deposits recorded.</Text> : null}
                </View>
              </View>

              {/* Leaderboard: Top Withdrawers */}
              <View className="w-full lg:flex-1 lg:min-w-[280px] rounded-2xl p-6" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: darkMode ? 1 : 0, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: darkMode ? 0.2 : 0.06, shadowRadius: 24, elevation: 8 }}>
                <Text className="text-base font-bold mb-4" style={{ color: colors.text }}>Top Withdrawals</Text>
                <View className="gap-3.5">
                  {topWithdrawers.slice(0, 10).map((item, idx) => (
                    <View key={item.user.id} className="flex-row items-center justify-between border-b pb-2" style={{ borderColor: colors.border }}>
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-6 w-6 rounded-full items-center justify-center bg-danger/10">
                          <Text className="text-xs font-bold text-danger">{idx + 1}</Text>
                        </View>
                        <View>
                          <Text className="text-xs font-bold" style={{ color: colors.text }}>{item.user.name}</Text>
                          <Text className="text-[10px]" style={{ color: colors.muted }}>{item.user.email}</Text>
                        </View>
                      </View>
                      <Text className="text-xs font-bold text-danger">-${money(item.value)}</Text>
                    </View>
                  ))}
                  {!topWithdrawers.length ? <Text className="text-xs" style={{ color: colors.muted }}>No withdrawals recorded.</Text> : null}
                </View>
              </View>
            </View>
            </>
            )}
          </View>
        ) : null}
        {section === 'users' && canViewSection('users') ? (
          <View style={{ zIndex: walletSortOpen ? 500 : 1 }}>
            {renderCards()}
            {mobile ? (
              <View className="mb-2.5 flex-row items-center gap-2" style={{ zIndex: 100 }}>
                <View style={{ flex: 1.7 }}>
                  {renderSearchBar(walletSearchQuery, setWalletSearchQuery, 'Search...', true)}
                </View>
                <View style={{ flex: 1 }}>
                  {renderWalletSortDropdown()}
                </View>
              </View>
            ) : (
              renderSearchBar(walletSearchQuery, setWalletSearchQuery, 'Search user wallets by name, email, phone, account, status or balance')
            )}
            <AdminUsersTable
              users={sortedWalletUsers}
              busyId={busyId}
              onBalance={(user, operation, account) => setBalanceModal({ user, operation, account })}
              onReset={resetTradingAccount}
              onWallet={openWallet}
              onTransactions={openTransactions}
              onSettings={setSettingsUser}
              onLeverage={saveUserLeverage}
              onTradingAccountLeverage={saveTradingAccountLeverage}
              onTradingStatus={saveUserTradingStatus}
              onTradingAccountStatus={saveTradingAccountStatus}
              onDeleteTradingAccount={deleteTradingAccount}
              canDeleteTradingAccounts={adminUser?.role === 'master'}
            />
          </View>
        ) : null}
        {section === 'userManagement' && canViewSection('userManagement') ? (
          userManagementSubpage === 'assignUsers' && hasPermission('assignUsers') ? (
            <AssignUsers
              users={data.users}
              loading={loading}
              onRefresh={load}
            />
          ) : hasPermission('userManagementUsers') ? (
            <UserManagement
              users={data.users}
              loading={loading}
              busyId={busyId}
              onCreate={createManagedUser}
              onUpdate={updateManagedUser}
              onRemove={removeManagedUser}
              newUserCount={newUserCount}
              onViewUser={markNewUserViewed}
              onRefresh={refreshAdminData}
              addUserTrigger={addUserTrigger}
            />
          ) : hasPermission('assignUsers') ? (
            <AssignUsers
              users={data.users}
              loading={loading}
              onRefresh={load}
            />
          ) : (
            <View className="p-8 items-center justify-center rounded-2xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><Text style={{ color: colors.muted }}>Access Denied</Text></View>
          )
        ) : null}
        {section === 'agents' && canViewSection('agents') ? (
          <AgentManagement />
        ) : null}
        {section === 'verifications' && canViewSection('verifications') ? (
          <VerificationApprovales
            users={data.users}
            busyId={busyId}
            onOpenVerification={openVerification}
            onReviewVerification={reviewVerification}
          />
        ) : null}
        {section === 'deposits' && canViewSection('deposits') ? renderDeposits() : null}
        {section === 'referrals' && canViewSection('referrals') ? (
          <ReferralRewards
            rewards={data.referralRewards}
            busyId={busyId}
            onReviewReward={reviewReferralReward}
          />
        ) : null}
        {section === 'withdrawals' && canViewSection('withdrawals') ? renderWithdrawals() : null}
        {section === 'marginAlerts' && canViewSection('marginAlerts') ? renderMarginAlerts() : null}
        {section === 'userLevels' && canViewSection('userLevels') ? renderUserLevels() : null}
        {section === 'trades' && canViewSection('trades') ? renderTrades() : null}
        {section === 'addTrading' && canViewSection('addTrading') ? renderAddTrading() : null}
        {section === 'bonusPosts' && canViewSection('bonusPosts') ? renderBonusPosts() : null}
        {section === 'symbols' && canViewSection('symbols') ? <SymbolSettings /> : null}
        {section === 'accessDenied' ? <View className="rounded-2xl border p-8" style={{ backgroundColor: colors.panel, borderColor: colors.border }}><Text className="text-lg font-semibold" style={{ color: colors.text }}>No dashboard permissions assigned</Text><Text className="mt-2 text-sm" style={{ color: colors.muted }}>Ask your Master administrator to enable one or more company permissions and assign them to your administrator account.</Text></View> : null}
      </ScrollView>
      <UpdateBalanceModal user={balanceModal?.user} account={balanceModal?.account} initialOperation={balanceModal?.operation} loading={busyId === balanceModal?.user?.id} onClose={() => setBalanceModal(null)} onConfirm={updateBalance} />
      <UserSettingsModal user={settingsUser} loading={busyId === settingsUser?.id} onClose={() => setSettingsUser(null)} onSave={saveSettings} onReset={() => resetDemo(settingsUser)} />
      <AdminProfileModal
        visible={adminProfileOpen}
        user={adminUser}
        busyAction={busyId}
        error={adminProfileError}
        onClose={() => setAdminProfileOpen(false)}
        onSaveProfile={saveAdminProfile}
        onChangePassword={changeAdminPassword}
      />
      <UserWalletDetails
        user={walletModal?.user}
        account={walletModal?.account}
        wallet={walletModal?.wallet}
        loading={walletModal?.loading}
        onClose={() => setWalletModal(null)}
      />
      <UserTransactionsModal user={transactionsModal?.user} account={transactionsModal?.account} transactions={transactionsModal?.transactions || []} loading={transactionsModal?.loading} onClose={() => setTransactionsModal(null)} />
      {depositDetails ? (
        <View className={mobile ? "absolute inset-0 z-50 items-center justify-start bg-medium/70 p-4 pt-16" : "absolute inset-0 z-50 items-center justify-center bg-medium/70 p-4"}>
          <View className={mobile ? "max-h-[82vh] w-full max-w-[900px] rounded-2xl border p-5" : "max-h-[92vh] w-full max-w-[900px] rounded-2xl border p-5"} style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
            {mobile && <View className="h-2" />}
            {mobile ? (
              <View className="mb-4 mt-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-bold" style={{ color: colors.text }}>Deposit Details</Text>
                  <Pressable
                    onPress={closeDepositDetails}
                    className="h-8 w-8 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <X size={16} color={colors.text} />
                  </Pressable>
                </View>
                <View className="mt-3 flex-row items-center justify-between gap-3">
                  <View className="flex-1 min-w-0 pr-2">
                    <Text className="text-xs font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                      {depositDetails.User?.name || depositDetails.User?.email || 'User'}
                    </Text>
                    <Text className="text-[9px] mt-0.5" style={{ color: colors.muted }}>
                      {dateTime(depositDetails.createdAt)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => openUserOverview(depositDetails.User)}
                    className="rounded-2xl border px-3 py-1.5"
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  >
                    <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.text }}>User Details</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="mb-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-medium" style={{ color: colors.text }}>Deposit Details</Text>
                  <Text className="mt-1 text-sm" style={{ color: colors.muted }}>{depositDetails.User?.name || depositDetails.User?.email || 'User'} | {dateTime(depositDetails.createdAt)}</Text>
                </View>
                <View className="flex-row items-center">
                  <Pressable onPress={() => openUserOverview(depositDetails.User)} className="mr-3 rounded-2xl border px-4 py-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                    <Text className="text-xs font-medium" style={{ color: colors.text }}>User Details</Text>
                  </Pressable>
                  <Pressable
                    onPress={closeDepositDetails}
                  >
                    <Text style={{ color: colors.muted }}>Close</Text>
                  </Pressable>
                </View>
              </View>
            )}
            <ScrollView>
              <View className="gap-4 lg:flex-row">
              <View className="lg:flex-1 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <Text className="mb-4 text-sm font-medium uppercase" style={{ color: colors.muted }}>Request Info</Text>
                {depositDetails.status === 'pending' ? (
                  <>
                    <View className={mobile ? "mb-2 rounded-2xl border p-2.5" : "mb-3 rounded-xl border p-3"} style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Client</Text>
                      <Text className={mobile ? "mt-0.5 text-xs font-bold" : "mt-1 text-sm font-semibold"} style={{ color: colors.text }}>
                        {depositDetails.User?.name || depositDetails.User?.email || '-'}
                      </Text>
                      <Text className={mobile ? "text-[10px] mt-0.5" : "text-xs mt-0.5"} style={{ color: colors.muted }}>
                        {depositDetails.User?.email || '-'}
                      </Text>
                    </View>
                    <View className="flex-row gap-3">
                      <CustomInput
                        className="flex-1"
                        label="Amount"
                        value={depositEditForm.amount}
                        onChangeText={(amount) => setDepositEditForm((current) => ({ ...current, amount }))}
                        keyboardType="decimal-pad"
                      />
                      <DepositCurrencySelect className="w-[110px]" value={depositEditForm.currency} onChange={(currency) => setDepositEditForm((current) => ({ ...current, currency }))} />
                    </View>
                    <CustomInput
                      label="Bonus"
                      value={depositEditForm.bonus}
                      onChangeText={(bonus) => setDepositEditForm((current) => ({ ...current, bonus }))}
                      keyboardType="decimal-pad"
                    />
                    <CustomInput
                      label="Payment Method"
                      value={depositEditForm.paymentMethod}
                      onChangeText={(paymentMethod) => setDepositEditForm((current) => ({ ...current, paymentMethod }))}
                    />
                    <CustomInput
                      label="Reference Number"
                      value={depositEditForm.referenceNumber}
                      onChangeText={(referenceNumber) => setDepositEditForm((current) => ({ ...current, referenceNumber }))}
                    />
                    <CustomInput
                      label="Assigned Address Label"
                      value={depositEditForm.depositAddressLabel}
                      onChangeText={(depositAddressLabel) => setDepositEditForm((current) => ({ ...current, depositAddressLabel }))}
                    />
                    <CustomInput
                      label="Assigned Address"
                      value={depositEditForm.depositAddress}
                      onChangeText={(depositAddress) => setDepositEditForm((current) => ({ ...current, depositAddress }))}
                      multiline
                      style={{ minHeight: 74, textAlignVertical: 'top', paddingTop: 12 }}
                    />
                    <CustomInput
                      label="Note"
                      value={depositEditForm.note}
                      onChangeText={(note) => setDepositEditForm((current) => ({ ...current, note }))}
                      multiline
                      style={{ minHeight: 74, textAlignVertical: 'top', paddingTop: 12 }}
                    />
                    <View className="mb-3 rounded-xl border p-3" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <Text className="text-xs font-medium uppercase" style={{ color: colors.muted }}>Status</Text>
                      <Text className="mt-1 text-sm font-semimedium" style={{ color: colors.text }}>{depositDetails.status || '-'}</Text>
                      <Text className="mt-1 text-xs" style={{ color: colors.muted }}>Submitted {dateTime(depositDetails.createdAt)}</Text>
                    </View>
                  </>
                ) : (
                  <View className={mobile ? "flex-row flex-wrap justify-between" : ""}>
                    {[
                      ['Client', (
                        <View>
                          <Text className={mobile ? "text-xs font-bold" : "text-sm font-semibold"} style={{ color: colors.text }} numberOfLines={1}>
                            {depositDetails.User?.name || depositDetails.User?.email || '-'}
                          </Text>
                          <Text className={mobile ? "text-[9px] mt-0.5" : "text-xs mt-0.5"} style={{ color: colors.muted }} numberOfLines={1}>
                            {depositDetails.User?.email || '-'}
                          </Text>
                        </View>
                      )],
                      ['Amount', depositAmountText(depositDetails)],
                      ['Bonus', `$${money(depositDetails.bonus)} USD`],
                      ['Payment Method', depositDetails.paymentMethod || '-'],
                      ['Reference Number', depositDetails.referenceNumber || '-'],
                      ['Assigned Address Label', depositDetails.depositAddressLabel || '-'],
                      ['Assigned Address', depositDetails.depositAddress || '-'],
                      ['Status', depositDetails.status || '-'],
                      ['Submitted', dateTime(depositDetails.createdAt)],
                      ['Note', depositDetails.note || '-'],
                    ].map(([label, value]) => (
                      <View
                        key={label}
                        className={mobile ? "mb-2 rounded-2xl border p-2.5" : "mb-3 rounded-xl border p-3"}
                        style={{
                          backgroundColor: colors.panel,
                          borderColor: colors.border,
                          width: mobile ? '48.5%' : 'auto'
                        }}
                      >
                        <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>{label}</Text>
                        {typeof value === 'string' || typeof value === 'number' ? (
                          <Text className={mobile ? "mt-0.5 text-xs font-bold" : "mt-1 text-sm font-semibold"} style={{ color: colors.text }}>{value}</Text>
                        ) : (
                          value
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
                <View className="lg:flex-1 rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <Text className="mb-4 text-sm font-medium uppercase" style={{ color: colors.muted }}>Receipt</Text>
                  {depositDetails.loading ? (
                    <Text className="rounded-xl p-6" style={{ backgroundColor: colors.panel, color: colors.muted }}>Loading receipt...</Text>
                  ) : depositDetails.receiptImage ? (
                    <>
                      <Pressable onPress={() => openDepositReceipt(depositDetails)}>
                        <Image source={{ uri: depositDetails.receiptImage }} className={mobile ? "h-[200px] w-full rounded-xl bg-medium" : "h-[360px] w-full rounded-xl bg-medium"} resizeMode="contain" />
                      </Pressable>
                      <View className="mt-4 flex-row flex-wrap justify-end gap-2">
                        <CustomButton title="Download Receipt" variant="success" className="min-w-[170px]" onPress={() => downloadDepositReceipt(depositDetails)} />
                      </View>
                    </>
                  ) : (
                    <Text className="rounded-xl p-6" style={{ backgroundColor: colors.panel, color: colors.muted }}>No receipt uploaded.</Text>
                  )}
                  {depositDetails.status === 'pending' ? (
                    <View className="mt-4 rounded-xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <Text className="mb-3 text-sm font-medium uppercase" style={{ color: colors.muted }}>Update Deposit Amount</Text>
                      <View className="gap-3 md:flex-row">
                        <CustomInput
                          className="flex-1"
                          label="Amount"
                          value={depositEditForm.amount}
                          onChangeText={(amount) => setDepositEditForm((current) => ({ ...current, amount }))}
                          keyboardType="decimal-pad"
                        />
                        <DepositCurrencySelect className="md:w-[120px]" value={depositEditForm.currency} onChange={(currency) => setDepositEditForm((current) => ({ ...current, currency }))} />
                      </View>
                      <CustomInput
                        label="Bonus"
                        value={depositEditForm.bonus}
                        onChangeText={(bonus) => setDepositEditForm((current) => ({ ...current, bonus }))}
                        keyboardType="decimal-pad"
                      />
                      <View className="flex-row justify-end">
                        <Pressable
                          disabled={busyId === depositDetails.id}
                          onPress={saveDepositDetails}
                          className={`min-h-[42px] justify-center rounded-2xl px-5 ${busyId === depositDetails.id ? 'opacity-50' : ''}`}
                          style={{ backgroundColor: colors.primary }}
                        >
                          <Text className="text-xs font-medium text-medium">Save Changes</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
              {depositDetails.status === 'pending' ? (
                <View className="mt-5 flex-row justify-end">
                  <Pressable
                    disabled={busyId === depositDetails.id}
                    onPress={() => reviewFunding('deposits', depositDetails, 'approve')}
                    className={`mr-2 min-h-[42px] justify-center rounded-2xl border px-5 ${busyId === depositDetails.id ? 'opacity-50' : ''}`}
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  >
                    <Text className="text-xs font-medium" style={{ color: colors.text }}>Approve</Text>
                  </Pressable>
                  <Pressable
                    disabled={busyId === depositDetails.id}
                    onPress={() => reviewFunding('deposits', depositDetails, 'reject')}
                    className={`min-h-[42px] justify-center rounded-2xl border border-danger/70 bg-danger/10 px-5 ${busyId === depositDetails.id ? 'opacity-50' : ''}`}
                  >
                    <Text className="text-xs font-medium text-danger">Reject</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      ) : null}
      {renderFundingReviewModal()}
      {referralEditModal ? (
        <Pressable
          onPress={() => setReferralEditModal(null)}
          className="absolute inset-0 z-50 items-center justify-center bg-black/70 p-4"
          style={{ zIndex: 60 }}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460 }}>
            <View
              className="rounded-2xl border p-6"
              style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24 }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-lg font-bold" style={{ color: colors.text }}>Edit & Approve Reward</Text>
                <Pressable onPress={() => setReferralEditModal(null)} className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: colors.surface }}>
                  <Text style={{ color: colors.muted, fontSize: 18, lineHeight: 20 }}>×</Text>
                </Pressable>
              </View>

              {/* Referrer */}
              <View className="rounded-xl p-3 mb-3" style={{ backgroundColor: colors.surface }}>
                <Text className="text-[10px] font-semibold uppercase mb-1" style={{ color: colors.muted }}>Referrer (receives bonus)</Text>
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>{referralEditModal.reward.referrer?.name || '-'}</Text>
                <Text className="text-xs" style={{ color: colors.muted }}>{referralEditModal.reward.referrer?.email || '-'}</Text>
                <Text className="text-[10px] font-bold mt-0.5" style={{ color: colors.primary }}>{referralEditModal.reward.referrer?.referralCode || '-'}</Text>
              </View>

              {/* Referee */}
              <View className="rounded-xl p-3 mb-3" style={{ backgroundColor: colors.surface }}>
                <Text className="text-[10px] font-semibold uppercase mb-1" style={{ color: colors.muted }}>Referee (new client)</Text>
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>{referralEditModal.reward.referee?.name || '-'}</Text>
                <Text className="text-xs" style={{ color: colors.muted }}>{referralEditModal.reward.referee?.email || '-'}</Text>
              </View>

              {/* Deposit info */}
              <View className="flex-row justify-between rounded-xl p-3 mb-4" style={{ backgroundColor: colors.surface }}>
                <Text className="text-xs" style={{ color: colors.muted }}>Referee Deposit:</Text>
                <Text className="text-xs font-semibold" style={{ color: colors.text }}>${money(referralEditModal.reward.deposit?.amount)} USD</Text>
              </View>

              {/* Reward amount edit */}
              <Text className="text-xs font-semibold mb-1" style={{ color: colors.muted }}>Reward Amount (USD)</Text>
              <TextInput
                value={referralEditModal.amount}
                onChangeText={(v) => setReferralEditModal((prev) => ({ ...prev, amount: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                className="h-11 rounded-xl border px-4 text-sm mb-5"
                style={{ backgroundColor: colors.surface, borderColor: colors.primary, color: colors.text, fontWeight: '600' }}
              />

              {/* Buttons */}
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setReferralEditModal(null)}
                  className="flex-1 h-11 items-center justify-center rounded-xl border"
                  style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                >
                  <Text className="text-sm font-semibold" style={{ color: colors.muted }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={confirmReferralApprove}
                  className="flex-1 h-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.primary, opacity: (!referralEditModal.amount || parseFloat(referralEditModal.amount) <= 0) ? 0.4 : 1 }}
                >
                  <Text className="text-sm font-bold" style={{ color: '#0B0B0B' }}>Approve</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      ) : null}
      {receiptModal ? (

        <Pressable
          onPress={() => setReceiptModal(null)}
          className="absolute inset-0 z-50 items-center justify-center bg-black/95 p-4"
          style={{ zIndex: 60 }}
        >
          <Image
            source={{ uri: receiptModal.receiptImage }}
            className="h-[90vh] w-full max-w-[90vw]"
            resizeMode="contain"
          />
          <Pressable
            onPress={() => setReceiptModal(null)}
            className="absolute right-6 top-6 rounded-2xl border px-4 py-2"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <Text className="text-xs font-medium text-white">Close</Text>
          </Pressable>
        </Pressable>
      ) : null}
      {verificationUser ? (
        <View className={mobile ? "absolute inset-0 z-50 items-center justify-start bg-medium/70 p-4 pt-16" : "absolute inset-0 z-50 items-center justify-center bg-medium/70 p-4"}>
          <View className={mobile ? "max-h-[82vh] w-full max-w-[1180px] rounded-2xl border p-5" : "max-h-[92vh] w-full max-w-[1180px] rounded-2xl border p-5"} style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
            {mobile && <View className="h-2" />}
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className={mobile ? "text-xl font-bold" : "text-2xl font-bold"} style={{ color: colors.text }}>Verification Documents</Text>
              </View>
              <Pressable
                onPress={() => { setVerificationImageZoom(null); setVerificationUser(null); }}
                className="h-8 w-8 items-center justify-center rounded-2xl"
                style={{ backgroundColor: colors.surface }}
              >
                <X size={16} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView>
              {verificationUser.loading ? (
                <Text className="rounded-2xl p-6" style={{ backgroundColor: colors.panel, color: colors.muted }}>Loading verification documents...</Text>
              ) : (
                <View>
                  {(() => {
                    const documents = [
                      ['id', 'ID Proof', verificationUser.idProofImage],
                      ['address', 'Address Proof', verificationUser.addressProofImage],
                    ];
                    if (verificationDocumentTab === 'all') {
                      return (
                        <View className="gap-3 lg:flex-row">
                          {documents.map(([id, title, source]) => (
                            <Pressable
                              key={id}
                              onPress={() => source && setVerificationImageZoom({ title, source })}
                              className={mobile ? "mb-3 rounded-xl border p-2.5" : "flex-1 rounded-xl border p-2"}
                              style={{ backgroundColor: colors.surface, borderColor: colors.border, opacity: source ? 1 : 0.6 }}
                            >
                              <Text className="mb-2 text-xs font-medium uppercase" style={{ color: colors.muted }}>{title}</Text>
                              {source ? (
                                <Image source={{ uri: source }} className={mobile ? "h-[200px] w-full rounded-2xl bg-medium" : "h-[42vh] w-full rounded-2xl bg-medium"} resizeMode="contain" />
                              ) : (
                                <Text className="rounded-2xl p-6" style={{ backgroundColor: colors.panel, color: colors.muted }}>No image uploaded.</Text>
                              )}
                            </Pressable>
                          ))}
                        </View>
                      );
                    }
                    const activeSource = verificationDocumentTab === 'id' ? verificationUser.idProofImage : verificationUser.addressProofImage;
                    return (
                      <View className="rounded-xl border p-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                        {activeSource ? (
                          <Pressable onPress={() => setVerificationImageZoom({ title: verificationDocumentTab === 'id' ? 'ID Proof' : 'Address Proof', source: activeSource })}>
                            <Image source={{ uri: activeSource }} className={mobile ? "h-[240px] w-full rounded-2xl bg-medium" : "h-[46vh] w-full rounded-2xl bg-medium"} resizeMode="contain" />
                          </Pressable>
                        ) : (
                          <Text className="rounded-2xl p-6" style={{ backgroundColor: colors.panel, color: colors.muted }}>No image uploaded.</Text>
                        )}
                      </View>
                    );
                  })()}
                </View>
              )}
              {!verificationUser.loading && (!verificationUser.idProofImage || !verificationUser.addressProofImage) ? (
                <View className="mt-4 rounded-xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <Text className="font-medium" style={{ color: colors.text }}>Add verification documents</Text>
                  <Text className="mt-1 text-xs" style={{ color: colors.muted }}>Upload both documents, then approve the submitted verification.</Text>
                  {Platform.OS === 'web' ? <View className="mt-3 gap-2"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setVerificationUploadFiles((current) => ({ ...current, id: event.target.files?.[0] || null }))} /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setVerificationUploadFiles((current) => ({ ...current, address: event.target.files?.[0] || null }))} /><CustomButton title={verificationUploadBusy ? 'Uploading...' : 'Upload documents'} variant="primary" disabled={verificationUploadBusy} onPress={uploadVerificationDocuments} /></View> : <Text className="mt-3 text-xs" style={{ color: colors.muted }}>Use the web admin portal to upload documents.</Text>}
                </View>
              ) : null}
              <View className="mt-4 flex-row flex-wrap justify-end gap-3 pb-2">
                <CustomButton
                  title="Approve"
                  variant="success"
                  className={mobile ? "flex-1 min-w-[90px]" : "min-w-[130px]"}
                  disabled={busyId === verificationUser.id || verificationUser.verificationStatus === 'approved' || !verificationUser.idProofImage || !verificationUser.addressProofImage}
                  onPress={() => reviewVerification(verificationUser, 'approve')}
                />
                <CustomButton
                  title="Reject"
                  variant="danger"
                  className={mobile ? "flex-1 min-w-[90px]" : "min-w-[130px]"}
                  disabled={busyId === verificationUser.id || verificationUser.verificationStatus === 'rejected' || !verificationUser.idProofImage || !verificationUser.addressProofImage}
                  onPress={() => reviewVerification(verificationUser, 'reject')}
                />
                <CustomButton
                  title="Download"
                  variant="secondary"
                  className={mobile ? "flex-1 min-w-[90px]" : "min-w-[130px]"}
                  onPress={() => downloadVerificationImages(verificationUser)}
                />
              </View>
            </ScrollView>
          </View>
          {verificationImageZoom ? (
            <Pressable
              onPress={() => setVerificationImageZoom(null)}
              className="absolute inset-0 items-center justify-center bg-black/95 p-4"
              style={{ zIndex: 60 }}
            >
              <Image
                source={{ uri: verificationImageZoom.source }}
                className="h-[90vh] w-full max-w-[90vw]"
                resizeMode="contain"
              />
              <Pressable
                onPress={() => setVerificationImageZoom(null)}
                className="absolute right-6 top-6 rounded-2xl border px-4 py-2"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Text className="text-xs font-medium text-white">Close</Text>
              </Pressable>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Modal visible={todayRegistrationsOpen} transparent animationType="fade" onRequestClose={() => setTodayRegistrationsOpen(false)}>
        <View className="flex-1" style={{ paddingLeft: mobile ? 0 : 360 }}>
          <Pressable className="absolute inset-0" style={{ backgroundColor: 'rgba(7, 21, 38, 0.24)' }} onPress={() => setTodayRegistrationsOpen(false)} />
          <View className="flex-1 items-center justify-center p-4" pointerEvents="box-none">
            <Pressable
              onPress={(event) => event.stopPropagation?.()}
              className="w-full max-w-lg rounded-3xl border p-5"
              style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: darkMode ? 0.35 : 0.16, shadowRadius: 28, elevation: 16 }}
            >
              <View className="mb-5 flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Registrations</Text>
                    <View className="rounded-full px-2 py-1" style={{ backgroundColor: `${colors.primary}18` }}>
                      <Text className="text-xs font-bold" style={{ color: colors.primary }}>{todayRegistrations.length}</Text>
                    </View>
                  </View>
                  <Text className="mt-1 text-sm" style={{ color: colors.muted }}>All clients, newest registration first</Text>
                </View>
                <Pressable onPress={() => setTodayRegistrationsOpen(false)} className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }} accessibilityLabel="Close registrations list">
                  <X size={20} color={colors.text} />
                </Pressable>
              </View>
              <View className="mb-4 flex-row items-center gap-2">
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={registrationDateFilter}
                    onChange={(event) => setRegistrationDateFilter(event.target.value)}
                    aria-label="Filter registrations by date"
                    style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, color: colors.text, padding: '0 12px', outline: 'none', colorScheme: darkMode ? 'dark' : 'light' }}
                  />
                ) : (
                  <TextInput value={registrationDateFilter} onChangeText={setRegistrationDateFilter} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} className="h-11 flex-1 rounded-xl border px-3 text-sm" style={{ color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }} />
                )}
                <Pressable onPress={() => setRegistrationDateFilter('')} className="h-11 items-center justify-center rounded-xl border px-3" style={{ borderColor: colors.border, backgroundColor: registrationDateFilter ? `${colors.primary}15` : colors.surface }}>
                  <Text className="text-xs font-semibold" style={{ color: registrationDateFilter ? colors.primary : colors.muted }}>{registrationDateFilter ? 'All dates' : 'Latest first'}</Text>
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator contentContainerStyle={{ gap: 10, paddingBottom: 4 }} style={{ maxHeight: 480 }}>
                {todayRegistrations.length ? todayRegistrations.map((user, index) => {
                  const name = user.name || 'New client';
                  const registeredAt = new Date(user.createdAt || 0);
                  const dateKey = Number.isNaN(registeredAt.getTime()) ? 'unknown' : `${registeredAt.getFullYear()}-${registeredAt.getMonth()}-${registeredAt.getDate()}`;
                  const previous = todayRegistrations[index - 1];
                  const previousDate = previous ? new Date(previous.createdAt || 0) : null;
                  const previousKey = previousDate && !Number.isNaN(previousDate.getTime()) ? `${previousDate.getFullYear()}-${previousDate.getMonth()}-${previousDate.getDate()}` : 'unknown';
                  const today = new Date();
                  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
                  const heading = dateKey === `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
                    ? 'Today'
                    : dateKey === `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`
                      ? 'Yesterday'
                      : Number.isNaN(registeredAt.getTime()) ? 'Unknown date' : registeredAt.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
                  return (
                    <View key={user.id}>
                      {dateKey !== previousKey ? <Text className="mb-1 mt-2 text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>{heading}</Text> : null}
                      <View className="flex-row items-center rounded-2xl border p-3" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}>
                        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${colors.primary}18` }}>
                          <Text className="text-sm font-bold" style={{ color: colors.primary }}>{name.slice(0, 2).toUpperCase()}</Text>
                        </View>
                        <View className="flex-1 pr-2">
                          <Text className="text-sm font-bold" numberOfLines={1} style={{ color: colors.text }}>{name}</Text>
                          <Text className="mt-0.5 text-xs" numberOfLines={1} style={{ color: colors.muted }}>{user.email || 'No email address'}</Text>
                        </View>
                        <Text className="text-xs font-medium" style={{ color: colors.muted }}>
                          {Number.isNaN(registeredAt.getTime()) ? '—' : registeredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  );
                }) : (
                  <View className="items-center rounded-2xl border border-dashed px-5 py-10" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                    <Users size={28} color={colors.muted} />
                    <Text className="mt-3 text-sm font-semibold" style={{ color: colors.text }}>No registrations found</Text>
                    <Text className="mt-1 text-center text-xs" style={{ color: colors.muted }}>Try another date, or clear the filter to view all clients.</Text>
                  </View>
                )}
              </ScrollView>
            </Pressable>
          </View>
        </View>
      </Modal>
      <UserOverviewModal overview={userOverviewModal} onClose={() => setUserOverviewModal(null)} />

      <Modal visible={Boolean(birthdayBonusUser)} transparent animationType="fade" onRequestClose={() => setBirthdayBonusUser(null)}>
        <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="w-full max-w-sm rounded-3xl p-6 border" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
            <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>Birthday Bonus</Text>
            <Text className="text-sm mb-4" style={{ color: colors.muted }}>
              Specify the birthday bonus amount to award to {birthdayBonusUser?.name || birthdayBonusUser?.email}:
            </Text>
            <CustomInput
              label="Bonus Amount (USD)"
              value={birthdayBonusAmount}
              onChangeText={setBirthdayBonusAmount}
              keyboardType="decimal-pad"
              placeholder="200.00"
            />
            <View className="flex-row justify-end gap-3 mt-6">
              <Pressable
                onPress={() => setBirthdayBonusUser(null)}
                className="px-5 py-2.5 rounded-full justify-center"
              >
                <Text className="font-bold" style={{ color: colors.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  try {
                    const user = birthdayBonusUser;
                    const amountVal = Number(birthdayBonusAmount);
                    if (isNaN(amountVal) || amountVal <= 0) {
                      alert('Please enter a valid positive amount.');
                      return;
                    }
                    const account = preferredAddTradeAccount(user?.tradingAccounts || []);
                    await api.put(`/admin/users/${user.id}/add-balance`, {
                      amount: amountVal,
                      note: 'Birthday Bonus',
                      referenceType: 'birthday_bonus',
                      description: new Date().getFullYear().toString(),
                      tradingAccountId: account?.id,
                    });
                    alert(`$${amountVal.toFixed(2)} Birthday Bonus awarded to ${user.name || user.email}.`);
                    setBirthdayBonusUser(null);
                    setSection('users');
                    if (typeof load === 'function') load({ silent: true });
                  } catch (e) {
                    alert(e.response?.data?.message || e.message || 'Failed to award bonus.');
                  }
                }}
                className="px-5 py-2.5 rounded-full justify-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="font-bold text-white">Award Bonus</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
