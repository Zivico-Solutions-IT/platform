import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  LogOut,
  Save,
  Shield,
  UserRound,
} from 'lucide-react-native';
import CustomButton from '../src/components/common/CustomButton';
import DashboardTabs from '../src/components/layout/DashboardTabs';
import { useAuth } from '../src/hooks/useAuth';
import { authService } from '../src/services/authService';
import { useAppTheme } from '../src/context/ThemeContext';

const countries = [
  { name: 'Afghanistan', code: '+93' },
  { name: 'Albania', code: '+355' },
  { name: 'Algeria', code: '+213' },
  { name: 'Andorra', code: '+376' },
  { name: 'Angola', code: '+244' },
  { name: 'Antigua and Barbuda', code: '+1' },
  { name: 'Argentina', code: '+54' },
  { name: 'Armenia', code: '+374' },
  { name: 'Australia', code: '+61' },
  { name: 'Austria', code: '+43' },
  { name: 'Azerbaijan', code: '+994' },
  { name: 'Bahamas', code: '+1' },
  { name: 'Bahrain', code: '+973' },
  { name: 'Bangladesh', code: '+880' },
  { name: 'Barbados', code: '+1' },
  { name: 'Belarus', code: '+375' },
  { name: 'Belgium', code: '+32' },
  { name: 'Belize', code: '+501' },
  { name: 'Benin', code: '+229' },
  { name: 'Bhutan', code: '+975' },
  { name: 'Bolivia', code: '+591' },
  { name: 'Bosnia and Herzegovina', code: '+387' },
  { name: 'Botswana', code: '+267' },
  { name: 'Brazil', code: '+55' },
  { name: 'Brunei', code: '+673' },
  { name: 'Bulgaria', code: '+359' },
  { name: 'Burkina Faso', code: '+226' },
  { name: 'Burundi', code: '+257' },
  { name: 'Cabo Verde', code: '+238' },
  { name: 'Cambodia', code: '+855' },
  { name: 'Cameroon', code: '+237' },
  { name: 'Canada', code: '+1' },
  { name: 'Central African Republic', code: '+236' },
  { name: 'Chad', code: '+235' },
  { name: 'Chile', code: '+56' },
  { name: 'China', code: '+86' },
  { name: 'Colombia', code: '+57' },
  { name: 'Comoros', code: '+269' },
  { name: 'Congo', code: '+242' },
  { name: 'Costa Rica', code: '+506' },
  { name: "Cote d'Ivoire", code: '+225' },
  { name: 'Croatia', code: '+385' },
  { name: 'Cuba', code: '+53' },
  { name: 'Cyprus', code: '+357' },
  { name: 'Czech Republic', code: '+420' },
  { name: 'Democratic Republic of the Congo', code: '+243' },
  { name: 'Denmark', code: '+45' },
  { name: 'Djibouti', code: '+253' },
  { name: 'Dominica', code: '+1' },
  { name: 'Dominican Republic', code: '+1' },
  { name: 'Ecuador', code: '+593' },
  { name: 'Egypt', code: '+20' },
  { name: 'El Salvador', code: '+503' },
  { name: 'Equatorial Guinea', code: '+240' },
  { name: 'Eritrea', code: '+291' },
  { name: 'Estonia', code: '+372' },
  { name: 'Eswatini', code: '+268' },
  { name: 'Ethiopia', code: '+251' },
  { name: 'Fiji', code: '+679' },
  { name: 'Finland', code: '+358' },
  { name: 'France', code: '+33' },
  { name: 'Gabon', code: '+241' },
  { name: 'Gambia', code: '+220' },
  { name: 'Georgia', code: '+995' },
  { name: 'Germany', code: '+49' },
  { name: 'Ghana', code: '+233' },
  { name: 'Greece', code: '+30' },
  { name: 'Grenada', code: '+1' },
  { name: 'Guatemala', code: '+502' },
  { name: 'Guinea', code: '+224' },
  { name: 'Guinea-Bissau', code: '+245' },
  { name: 'Guyana', code: '+592' },
  { name: 'Haiti', code: '+509' },
  { name: 'Honduras', code: '+504' },
  { name: 'Hungary', code: '+36' },
  { name: 'Iceland', code: '+354' },
  { name: 'India', code: '+91' },
  { name: 'Indonesia', code: '+62' },
  { name: 'Iran', code: '+98' },
  { name: 'Iraq', code: '+964' },
  { name: 'Ireland', code: '+353' },
  { name: 'Israel', code: '+972' },
  { name: 'Italy', code: '+39' },
  { name: 'Jamaica', code: '+1' },
  { name: 'Japan', code: '+81' },
  { name: 'Jordan', code: '+962' },
  { name: 'Kazakhstan', code: '+7' },
  { name: 'Kenya', code: '+254' },
  { name: 'Kiribati', code: '+686' },
  { name: 'Kuwait', code: '+965' },
  { name: 'Kyrgyzstan', code: '+996' },
  { name: 'Laos', code: '+856' },
  { name: 'Latvia', code: '+371' },
  { name: 'Lebanon', code: '+961' },
  { name: 'Lesotho', code: '+266' },
  { name: 'Liberia', code: '+231' },
  { name: 'Libya', code: '+218' },
  { name: 'Liechtenstein', code: '+423' },
  { name: 'Lithuania', code: '+370' },
  { name: 'Luxembourg', code: '+352' },
  { name: 'Madagascar', code: '+261' },
  { name: 'Malawi', code: '+265' },
  { name: 'Malaysia', code: '+60' },
  { name: 'Maldives', code: '+960' },
  { name: 'Mali', code: '+223' },
  { name: 'Malta', code: '+356' },
  { name: 'Marshall Islands', code: '+692' },
  { name: 'Mauritania', code: '+222' },
  { name: 'Mauritius', code: '+230' },
  { name: 'Mexico', code: '+52' },
  { name: 'Micronesia', code: '+691' },
  { name: 'Moldova', code: '+373' },
  { name: 'Monaco', code: '+377' },
  { name: 'Mongolia', code: '+976' },
  { name: 'Montenegro', code: '+382' },
  { name: 'Morocco', code: '+212' },
  { name: 'Mozambique', code: '+258' },
  { name: 'Myanmar', code: '+95' },
  { name: 'Namibia', code: '+264' },
  { name: 'Nauru', code: '+674' },
  { name: 'Nepal', code: '+977' },
  { name: 'Netherlands', code: '+31' },
  { name: 'New Zealand', code: '+64' },
  { name: 'Nicaragua', code: '+505' },
  { name: 'Niger', code: '+227' },
  { name: 'Nigeria', code: '+234' },
  { name: 'North Korea', code: '+850' },
  { name: 'North Macedonia', code: '+389' },
  { name: 'Norway', code: '+47' },
  { name: 'Oman', code: '+968' },
  { name: 'Pakistan', code: '+92' },
  { name: 'Palau', code: '+680' },
  { name: 'Palestine', code: '+970' },
  { name: 'Panama', code: '+507' },
  { name: 'Papua New Guinea', code: '+675' },
  { name: 'Paraguay', code: '+595' },
  { name: 'Peru', code: '+51' },
  { name: 'Philippines', code: '+63' },
  { name: 'Poland', code: '+48' },
  { name: 'Portugal', code: '+351' },
  { name: 'Qatar', code: '+974' },
  { name: 'Romania', code: '+40' },
  { name: 'Russia', code: '+7' },
  { name: 'Rwanda', code: '+250' },
  { name: 'Saint Kitts and Nevis', code: '+1' },
  { name: 'Saint Lucia', code: '+1' },
  { name: 'Saint Vincent and the Grenadines', code: '+1' },
  { name: 'Samoa', code: '+685' },
  { name: 'San Marino', code: '+378' },
  { name: 'Sao Tome and Principe', code: '+239' },
  { name: 'Saudi Arabia', code: '+966' },
  { name: 'Senegal', code: '+221' },
  { name: 'Serbia', code: '+381' },
  { name: 'Seychelles', code: '+248' },
  { name: 'Sierra Leone', code: '+232' },
  { name: 'Singapore', code: '+65' },
  { name: 'Slovakia', code: '+421' },
  { name: 'Slovenia', code: '+386' },
  { name: 'Solomon Islands', code: '+677' },
  { name: 'Somalia', code: '+252' },
  { name: 'South Africa', code: '+27' },
  { name: 'South Korea', code: '+82' },
  { name: 'South Sudan', code: '+211' },
  { name: 'Spain', code: '+34' },
  { name: 'Sri Lanka', code: '+94' },
  { name: 'Sudan', code: '+249' },
  { name: 'Suriname', code: '+597' },
  { name: 'Sweden', code: '+46' },
  { name: 'Switzerland', code: '+41' },
  { name: 'Syria', code: '+963' },
  { name: 'Taiwan', code: '+886' },
  { name: 'Tajikistan', code: '+992' },
  { name: 'Tanzania', code: '+255' },
  { name: 'Thailand', code: '+66' },
  { name: 'Timor-Leste', code: '+670' },
  { name: 'Togo', code: '+228' },
  { name: 'Tonga', code: '+676' },
  { name: 'Trinidad and Tobago', code: '+1' },
  { name: 'Tunisia', code: '+216' },
  { name: 'Turkey', code: '+90' },
  { name: 'Turkmenistan', code: '+993' },
  { name: 'Tuvalu', code: '+688' },
  { name: 'Uganda', code: '+256' },
  { name: 'Ukraine', code: '+380' },
  { name: 'United Arab Emirates', code: '+971' },
  { name: 'United Kingdom', code: '+44' },
  { name: 'United States', code: '+1' },
  { name: 'Uruguay', code: '+598' },
  { name: 'Uzbekistan', code: '+998' },
  { name: 'Vanuatu', code: '+678' },
  { name: 'Vatican City', code: '+39' },
  { name: 'Venezuela', code: '+58' },
  { name: 'Vietnam', code: '+84' },
  { name: 'Yemen', code: '+967' },
  { name: 'Zambia', code: '+260' },
  { name: 'Zimbabwe', code: '+263' },
];

const countryByName = (name) => countries.find((country) => country.name === name) || countries[0];

const phoneWithoutDialCode = (phone) => String(phone || '').replace(/^\+\d{1,4}\s*/, '').trim();

const withCountryCode = (phone, countryName) => {
  const dialCode = countryByName(countryName).code;
  const localNumber = phoneWithoutDialCode(phone);
  return localNumber ? `${dialCode} ${localNumber}` : `${dialCode} `;
};

const isValidDateOfBirth = (value) => {
  const match = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/.exec(String(value || '').trim());
  if (!match) return false;
  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && date < new Date();
};

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const settingsSections = [
  { key: 'profile', icon: UserRound, title: 'Profile', subtitle: 'Edit your profile details' },
  { key: 'security', icon: Shield, title: 'Security', subtitle: 'Password and 2FA' },
  { key: 'payments', icon: CreditCard, title: 'Payments', subtitle: 'Payment methods' },
  { key: 'session', icon: LogOut, title: 'Session', subtitle: 'Sign out and sessions' },
];

function SettingsMenuItem({ icon: Icon, title, subtitle, active, onPress }) {
  const { colors } = useAppTheme();

  return (
    <Pressable onPress={onPress} className={`flex-row items-center rounded-xl p-4 ${active ? 'border-l-4 border-primary' : ''}`} style={{ backgroundColor: active ? `${colors.primary}1a` : 'transparent' }}>
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: active ? `${colors.primary}33` : colors.surface }}>
        <Icon size={19} color={active ? '#D4AF37' : '#9CA3AF'} />
      </View>
      <View>
        <Text className="font-medium" style={{ color: active ? colors.primary : colors.text }}>{title}</Text>
        <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function SettingsInput({ label, value, onChangeText, placeholder, editable = true, error, keyboardType }) {
  const { colors } = useAppTheme();

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium" style={{ color: colors.text }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        className={`rounded-xl border px-4 py-3 ${editable ? '' : 'opacity-70'}`}
        style={{ backgroundColor: colors.panel, borderColor: colors.border, color: colors.text }}
      />
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}

function CountrySelect({ value, onChange, editable, error }) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const selectedCountry = countryByName(value);

  const selectCountry = (countryName) => {
    onChange(countryName);
    setOpen(false);
  };

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium" style={{ color: colors.text }}>Country</Text>
      <Pressable
        disabled={!editable}
        onPress={() => setOpen((current) => !current)}
        className={`rounded-xl border px-4 py-3 ${editable ? '' : 'opacity-70'}`}
        style={{ backgroundColor: colors.panel, borderColor: colors.border }}
      >
        <Text style={{ color: colors.text }}>{selectedCountry.name} ({selectedCountry.code})</Text>
      </Pressable>
      {open && editable ? (
        <ScrollView nestedScrollEnabled className="mt-2 rounded-xl border" style={{ maxHeight: 320, backgroundColor: colors.panel, borderColor: colors.border }}>
          {countries.map((country) => (
            <Pressable
              key={country.name}
              onPress={() => selectCountry(country.name)}
              className="border-b px-4 py-3"
              style={{ backgroundColor: country.name === value ? `${colors.primary}1a` : 'transparent', borderColor: colors.border }}
            >
              <Text className={country.name === value ? 'font-medium' : ''} style={{ color: country.name === value ? colors.primary : colors.text }}>{country.name} ({country.code})</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}

function PasswordInput({ label, placeholder, value, onChangeText }) {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium" style={{ color: colors.text }}>{label}</Text>
      <View className="flex-row items-center rounded-xl border px-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
        <TextInput
          secureTextEntry={!visible}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 py-3"
          style={{ color: colors.text }}
        />
        <Pressable onPress={() => setVisible((current) => !current)} className="py-3 pl-3" accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
          {visible ? <Eye size={18} color={colors.muted} /> : <EyeOff size={18} color={colors.muted} />}
        </Pressable>
      </View>
    </View>
  );
}

function Requirement({ children }) {
  const { colors } = useAppTheme();

  return (
    <View className="mb-4 flex-row items-center">
      <CheckCircle2 size={16} color="#22c55e" />
      <Text className="ml-3 text-sm" style={{ color: colors.muted }}>{children}</Text>
    </View>
  );
}

function AccountInfoTile({ label, value, badge, tone = 'success' }) {
  const { colors } = useAppTheme();
  const toneStyle = tone === 'danger'
    ? { backgroundColor: '#f24d5826', color: '#f24d58' }
    : tone === 'warning'
      ? { backgroundColor: '#D4AF3726', color: '#D4AF37' }
      : { backgroundColor: '#12cf7a26', color: '#12cf7a' };

  return (
    <View className="min-w-[160px] flex-1">
      <Text className="mb-2 text-sm" style={{ color: colors.muted }}>{label}</Text>
      {badge ? (
        <View className="self-start rounded-lg px-3 py-2" style={{ backgroundColor: toneStyle.backgroundColor }}>
          <Text className="font-medium" style={{ color: toneStyle.color }}>{value}</Text>
        </View>
      ) : (
        <Text className="text-base font-medium" style={{ color: colors.text }}>{value}</Text>
      )}
    </View>
  );
}

function SettingsPanel({ icon: Icon, title, subtitle, children }) {
  const { colors } = useAppTheme();

  return (
    <View className="rounded-2xl border p-5 lg:p-7" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="mb-6 flex-row items-center">
        <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
          <Icon size={20} color="#D4AF37" />
        </View>
        <View className="flex-1">
          <Text className="text-2xl font-medium" style={{ color: colors.text }}>{title}</Text>
          {subtitle ? <Text className="mt-1" style={{ color: colors.muted }}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const normalizeBankAccount = (account) => ({
  id: account.id,
  bankAccountHolder: account.bankAccountHolder || account.accountHolderName || '',
  bankName: account.bankName || '',
  bankBranch: account.bankBranch || account.branchName || '',
  bankAccountNumber: account.bankAccountNumber || account.accountNumber || '',
  status: account.status || 'pending',
  payoutType: String(account.bankName || account.branchName || '').toLowerCase().includes('bep20') ? 'BEP20' : String(account.bankName || account.branchName || '').toLowerCase().includes('trc20') ? 'TRC20' : 'Bank',
});

const withdrawalDetailByType = (accounts, payoutType) => accounts.find((account) => account.payoutType === payoutType) || null;
const limitWithdrawalDetails = (accounts) => ['Bank', 'TRC20', 'BEP20']
  .map((payoutType) => withdrawalDetailByType(accounts, payoutType))
  .filter(Boolean);
const canEditWithdrawalDetail = (account) => ['approved', 'rejected'].includes(account?.status);

export default function SettingsScreen() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isMobile = width < 992;
  const { user, logout, updateProfile } = useAuth();
  const { colors } = useAppTheme();
  const profileImageInputRef = useRef(null);
  const returnedToWithdrawRef = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [bankForm, setBankForm] = useState({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
  const [trc20Form, setTrc20Form] = useState({ walletHolderName: '', walletAddress: '' });
  const [bep20Form, setBep20Form] = useState({ walletHolderName: '', walletAddress: '' });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [editingBankAccountId, setEditingBankAccountId] = useState(null);
  const [editingPayoutType, setEditingPayoutType] = useState('Bank');
  const [bankMessage, setBankMessage] = useState('');
  const [bankBusy, setBankBusy] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: 'Sri Lanka',
    dateOfBirth: '',
    profileImage: null,
  });
  const returnToWithdrawPayoutType = String(params.returnTo || '') === 'withdraw'
    ? (String(params.payoutType || '') === 'TRC20' ? 'TRC20' : 'Bank')
    : null;

  const loadBankAccounts = useCallback(async ({ silent = false } = {}) => {
    if (!user) {
      setBankAccounts([]);
      return;
    }
    try {
      const result = await authService.listBankAccounts();
      setBankAccounts(limitWithdrawalDetails((result.accounts || []).map(normalizeBankAccount)));
      if (!silent) setBankMessage('');
    } catch {
      if (!silent) setBankMessage('Bank account details could not be loaded.');
    }
  }, [user]);

  useEffect(() => {
    if (params.section && settingsSections.some((section) => section.key === String(params.section))) {
      setActiveSection(String(params.section));
    }
  }, [params.section]);

  useEffect(() => {
    const country = user?.country || 'Sri Lanka';
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: withCountryCode(user?.phone, country),
      country,
      dateOfBirth: user?.dateOfBirth || '',
      profileImage: user?.profileImage || null,
    });
    setForgotEmail(user?.email || '');
    setForgotMessage('');
    setForgotToken('');
    setForgotPassword('');
    setForgotConfirmPassword('');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordMessage('');
    setBankForm({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
    setTrc20Form({ walletHolderName: '', walletAddress: '' });
    setBep20Form({ walletHolderName: '', walletAddress: '' });
    setEditingBankAccountId(null);
    setEditingPayoutType('Bank');
    setBankMessage('');
    setProfileErrors({});
    setEditingProfile(false);
  }, [user]);

  useEffect(() => {
    loadBankAccounts();
  }, [loadBankAccounts]);

  useEffect(() => {
    setMessage('');
    setError('');
  }, [activeSection]);

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

  useEffect(() => {
    if (!user || activeSection !== 'payments') return undefined;
    const timer = setInterval(() => loadBankAccounts({ silent: true }), 60000);
    return () => clearInterval(timer);
  }, [activeSection, loadBankAccounts, user]);

  useEffect(() => {
    returnedToWithdrawRef.current = false;
  }, [returnToWithdrawPayoutType]);

  useEffect(() => {
    if (!returnToWithdrawPayoutType || activeSection !== 'payments' || returnedToWithdrawRef.current) return;
    const approvedDetail = withdrawalDetailByType(bankAccounts, returnToWithdrawPayoutType);
    if (approvedDetail?.status !== 'approved') return;
    returnedToWithdrawRef.current = true;
    router.replace('/withdraw');
  }, [activeSection, bankAccounts, returnToWithdrawPayoutType]);

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  const validateProfile = () => {
    const selectedCountry = countryByName(profileForm.country);
    const nextErrors = {};
    const normalizedPhone = String(profileForm.phone || '').trim();

    if (!profileForm.name.trim()) nextErrors.name = 'Full name is required.';
    if (profileForm.name.trim().length < 2) nextErrors.name = 'Full name must be at least 2 characters.';
    if (!profileForm.email.trim()) nextErrors.email = 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!profileForm.country) nextErrors.country = 'Please select a country.';
    if (!normalizedPhone.startsWith(selectedCountry.code)) nextErrors.phone = `Phone number must start with ${selectedCountry.code}.`;
    if (phoneWithoutDialCode(normalizedPhone).replace(/\D/g, '').length < 7) nextErrors.phone = 'Enter a valid phone number.';
    if (!profileForm.dateOfBirth.trim()) nextErrors.dateOfBirth = 'Date of birth is required.';
    if (profileForm.dateOfBirth.trim() && !isValidDateOfBirth(profileForm.dateOfBirth)) nextErrors.dateOfBirth = 'Use a valid DD / MM / YYYY date.';

    setProfileErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveSettings = async () => {
    setMessage('');
    setError('');
    if (!validateProfile()) return;
    try {
      await updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        country: profileForm.country,
        dateOfBirth: profileForm.dateOfBirth.trim(),
        profileImage: profileForm.profileImage,
      });
      setMessage('Profile changes saved successfully.');
      setEditingProfile(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Profile changes could not be saved.');
    }
  };

  const cancelProfileEdit = () => {
    const country = user?.country || 'Sri Lanka';
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: withCountryCode(user?.phone, country),
      country,
      dateOfBirth: user?.dateOfBirth || '',
      profileImage: user?.profileImage || null,
    });
    setProfileErrors({});
    setMessage('');
    setError('');
    setEditingProfile(false);
  };

  const updateCountry = (country) => {
    setProfileForm((current) => ({ ...current, country, phone: withCountryCode(current.phone, country) }));
  };

  const openProfileImagePicker = () => {
    setEditingProfile(true);
    if (Platform.OS !== 'web') return;
    profileImageInputRef.current?.click();
  };

  const selectProfileImage = async (file) => {
    if (!file) return;
    setMessage('');
    setError('');
    if (!file.type?.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be 5MB or smaller.');
      return;
    }
    try {
      const profileImage = await readFileDataUrl(file);
      setProfileForm((current) => ({ ...current, profileImage }));
      setEditingProfile(true);
    } catch {
      setError('Profile photo could not be loaded.');
    }
  };

  const removeProfileImage = () => {
    setProfileForm((current) => ({ ...current, profileImage: null }));
    setEditingProfile(true);
  };

  const submitForgotPassword = async () => {
    const email = forgotEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setForgotMessage('Enter a valid email address.');
      return;
    }
    setForgotBusy(true);
    setForgotMessage('');
    try {
      const result = await authService.forgotPassword({ email });
      setForgotToken('');
      setForgotPassword('');
      setForgotConfirmPassword('');
      setForgotMessage(result.message || 'Password reset code sent to your email.');
    } catch (requestError) {
      setForgotMessage(requestError.response?.data?.message || 'Password reset request failed.');
    } finally {
      setForgotBusy(false);
    }
  };

  const submitChangePassword = async () => {
    setPasswordMessage('');
    if (!passwordForm.currentPassword) {
      setPasswordMessage('Current password is required.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage('New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('New password and confirmation do not match.');
      return;
    }
    setPasswordBusy(true);
    try {
      const result = await authService.changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage(result.message || 'Password updated successfully.');
    } catch (requestError) {
      setPasswordMessage(requestError.response?.data?.message || 'Password update failed.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const submitResetPassword = async () => {
    if (!forgotToken.trim()) {
      setForgotMessage('Reset code is required.');
      return;
    }
    if (forgotPassword.length < 8) {
      setForgotMessage('New password must be at least 8 characters.');
      return;
    }
    if (forgotPassword !== forgotConfirmPassword) {
      setForgotMessage('New password and confirmation do not match.');
      return;
    }
    setForgotBusy(true);
    setForgotMessage('');
    try {
      const result = await authService.resetPassword({ resetToken: forgotToken.trim(), password: forgotPassword });
      setForgotToken('');
      setForgotPassword('');
      setForgotConfirmPassword('');
      setForgotMessage(result.message || 'Password updated successfully.');
    } catch (requestError) {
      setForgotMessage(requestError.response?.data?.message || 'Password reset failed.');
    } finally {
      setForgotBusy(false);
    }
  };

  const saveBankDetails = async () => {
    setBankMessage('');
    if (!bankForm.bankAccountHolder.trim() || !bankForm.bankName.trim() || !bankForm.bankAccountNumber.trim()) {
      setBankMessage('Account holder, bank name and account number are required.');
      return;
    }
    setBankBusy(true);
    try {
      const nextBankDetails = {
        bankAccountHolder: bankForm.bankAccountHolder.trim(),
        bankName: bankForm.bankName.trim(),
        bankBranch: bankForm.bankBranch.trim(),
        bankAccountNumber: bankForm.bankAccountNumber.trim(),
      };
      const targetBankAccountId = editingPayoutType === 'Bank' && editingBankAccountId
        ? editingBankAccountId
        : withdrawalDetailByType(bankAccounts, 'Bank')?.id;
      const existingBankDetail = targetBankAccountId
        ? bankAccounts.find((account) => String(account.id) === String(targetBankAccountId))
        : null;
      if (existingBankDetail && !canEditWithdrawalDetail(existingBankDetail)) {
        setBankMessage('Bank details are waiting for admin approval. You can edit after approval.');
        return;
      }
      const result = targetBankAccountId
        ? await authService.updateBankAccount(targetBankAccountId, nextBankDetails)
        : await authService.createBankAccount(nextBankDetails);
      const savedAccount = normalizeBankAccount(result.account || { ...nextBankDetails, id: targetBankAccountId });
      setBankAccounts((current) => limitWithdrawalDetails(
        targetBankAccountId
          ? current.map((account) => (String(account.id) === String(targetBankAccountId) ? savedAccount : account))
          : [savedAccount, ...current]
      ));
      setBankForm({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
      setEditingBankAccountId(null);
      setEditingPayoutType('Bank');
      setBankMessage(result.message || (targetBankAccountId ? 'Bank account details updated and submitted for admin approval.' : 'Bank account details saved successfully.'));
    } catch (requestError) {
      setBankMessage(requestError.response?.data?.message || 'Bank account details could not be saved.');
    } finally {
      setBankBusy(false);
    }
  };

  const saveTrc20Details = async () => {
    setBankMessage('');
    if (!trc20Form.walletHolderName.trim() || !trc20Form.walletAddress.trim()) {
      setBankMessage('TRC20 wallet holder name and wallet address are required.');
      return;
    }
    setBankBusy(true);
    try {
      const nextTrc20Details = {
        bankAccountHolder: trc20Form.walletHolderName.trim(),
        bankName: 'USDT TRC20',
        bankBranch: 'TRC20',
        bankAccountNumber: trc20Form.walletAddress.trim(),
      };
      const targetTrc20AccountId = editingPayoutType === 'TRC20' && editingBankAccountId
        ? editingBankAccountId
        : withdrawalDetailByType(bankAccounts, 'TRC20')?.id;
      const existingTrc20Detail = targetTrc20AccountId
        ? bankAccounts.find((account) => String(account.id) === String(targetTrc20AccountId))
        : null;
      if (existingTrc20Detail && !canEditWithdrawalDetail(existingTrc20Detail)) {
        setBankMessage('TRC20 details are waiting for admin approval. You can edit after approval.');
        return;
      }
      const result = targetTrc20AccountId
        ? await authService.updateBankAccount(targetTrc20AccountId, nextTrc20Details)
        : await authService.createBankAccount(nextTrc20Details);
      const savedAccount = normalizeBankAccount(result.account || { ...nextTrc20Details, id: targetTrc20AccountId });
      setBankAccounts((current) => limitWithdrawalDetails(
        targetTrc20AccountId
          ? current.map((account) => (String(account.id) === String(targetTrc20AccountId) ? savedAccount : account))
          : [savedAccount, ...current]
      ));
      setTrc20Form({ walletHolderName: '', walletAddress: '' });
      setEditingBankAccountId(null);
      setEditingPayoutType('Bank');
      setBankMessage(targetTrc20AccountId ? 'TRC20 details updated and submitted for admin approval.' : 'TRC20 details submitted for admin approval.');
    } catch (requestError) {
      setBankMessage(requestError.response?.data?.message || 'TRC20 details could not be saved.');
    } finally {
      setBankBusy(false);
    }
  };

  const saveBep20Details = async () => {
    setBankMessage('');
    if (!bep20Form.walletHolderName.trim() || !bep20Form.walletAddress.trim()) {
      setBankMessage('BEP20 wallet holder name and wallet address are required.');
      return;
    }
    setBankBusy(true);
    try {
      const nextBep20Details = {
        bankAccountHolder: bep20Form.walletHolderName.trim(),
        bankName: 'USDT BEP20',
        bankBranch: 'BEP20',
        bankAccountNumber: bep20Form.walletAddress.trim(),
      };
      const targetBep20AccountId = editingPayoutType === 'BEP20' && editingBankAccountId
        ? editingBankAccountId
        : withdrawalDetailByType(bankAccounts, 'BEP20')?.id;
      const existingBep20Detail = targetBep20AccountId
        ? bankAccounts.find((account) => String(account.id) === String(targetBep20AccountId))
        : null;
      if (existingBep20Detail && !canEditWithdrawalDetail(existingBep20Detail)) {
        setBankMessage('BEP20 details are waiting for admin approval. You can edit after approval.');
        return;
      }
      const result = targetBep20AccountId
        ? await authService.updateBankAccount(targetBep20AccountId, nextBep20Details)
        : await authService.createBankAccount(nextBep20Details);
      const savedAccount = normalizeBankAccount(result.account || { ...nextBep20Details, id: targetBep20AccountId });
      setBankAccounts((current) => limitWithdrawalDetails(
        targetBep20AccountId
          ? current.map((account) => (String(account.id) === String(targetBep20AccountId) ? savedAccount : account))
          : [savedAccount, ...current]
      ));
      setBep20Form({ walletHolderName: '', walletAddress: '' });
      setEditingBankAccountId(null);
      setEditingPayoutType('Bank');
      setBankMessage(targetBep20AccountId ? 'BEP20 details updated and submitted for admin approval.' : 'BEP20 details submitted for admin approval.');
    } catch (requestError) {
      setBankMessage(requestError.response?.data?.message || 'BEP20 details could not be saved.');
    } finally {
      setBankBusy(false);
    }
  };

  const editBankDetails = (account) => {
    if (!canEditWithdrawalDetail(account)) {
      setBankMessage(`${account.payoutType} details are waiting for admin approval. You can edit after approval.`);
      return;
    }
    if (account.payoutType === 'TRC20') {
      setTrc20Form({
        walletHolderName: account.bankAccountHolder || '',
        walletAddress: account.bankAccountNumber || '',
      });
      setBep20Form({ walletHolderName: '', walletAddress: '' });
      setBankForm({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
      setEditingPayoutType('TRC20');
    } else if (account.payoutType === 'BEP20') {
      setBep20Form({
        walletHolderName: account.bankAccountHolder || '',
        walletAddress: account.bankAccountNumber || '',
      });
      setTrc20Form({ walletHolderName: '', walletAddress: '' });
      setBankForm({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
      setEditingPayoutType('BEP20');
    } else {
      setBankForm({
        bankAccountHolder: account.bankAccountHolder || '',
        bankName: account.bankName || '',
        bankBranch: account.bankBranch || '',
        bankAccountNumber: account.bankAccountNumber || '',
      });
      setTrc20Form({ walletHolderName: '', walletAddress: '' });
      setBep20Form({ walletHolderName: '', walletAddress: '' });
      setEditingPayoutType('Bank');
    }
    setEditingBankAccountId(account.id);
    setBankMessage(`Edit the details above, then click Save ${account.payoutType} Details.`);
  };

  const deleteBankDetails = async (accountId) => {
    setBankBusy(true);
    setBankMessage('');
    try {
      const result = await authService.deleteBankAccount(accountId);
      setBankAccounts((current) => current.map((account) => (
        String(account.id) === String(accountId) ? { ...account, status: 'delete_pending' } : account
      )));
      if (String(editingBankAccountId) === String(accountId)) {
        setEditingBankAccountId(null);
        setEditingPayoutType('Bank');
        setBankForm({ bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' });
        setTrc20Form({ walletHolderName: '', walletAddress: '' });
        setBep20Form({ walletHolderName: '', walletAddress: '' });
      }
      setBankMessage(result.message || 'Withdrawal details delete request submitted for admin approval.');
    } catch (requestError) {
      setBankMessage(requestError.response?.data?.message || 'Bank account details could not be deleted.');
    } finally {
      setBankBusy(false);
    }
  };

  const initials = (profileForm.name || profileForm.email || 'N')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const activeSettings = settingsSections.find((section) => section.key === activeSection) || settingsSections[0];
  const savedBankDetail = withdrawalDetailByType(bankAccounts, 'Bank');
  const savedTrc20Detail = withdrawalDetailByType(bankAccounts, 'TRC20');
  const savedBep20Detail = withdrawalDetailByType(bankAccounts, 'BEP20');
  const bankRejected = savedBankDetail?.status === 'rejected';
  const trc20Rejected = savedTrc20Detail?.status === 'rejected';
  const bep20Rejected = savedBep20Detail?.status === 'rejected';
  const showBankForm = !savedBankDetail || bankRejected || (editingPayoutType === 'Bank' && Boolean(editingBankAccountId));
  const showTrc20Form = !savedTrc20Detail || trc20Rejected || (editingPayoutType === 'TRC20' && Boolean(editingBankAccountId));
  const showBep20Form = !savedBep20Detail || bep20Rejected || (editingPayoutType === 'BEP20' && Boolean(editingBankAccountId));
  const mobileLayout = width < 640;

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="mx-auto w-full max-w-[1180px] p-3 sm:p-4 lg:p-8">
      <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-medium`} style={{ color: colors.text }}>Settings</Text>
          <Text className="mt-1" style={{ color: colors.muted }}>Manage your account preferences and security</Text>
        </View>
        <Pressable onPress={() => router.push('/dashboard')} className="rounded-xl border px-4 py-3" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
          <Text className="font-medium text-primary">Back to Dashboard</Text>
        </Pressable>
      </View>

      <DashboardTabs activeKey="settings" />

      <View
        className="overflow-hidden rounded-2xl border"
        style={{
          flexDirection: mobileLayout ? 'column' : 'row',
          backgroundColor: colors.panel,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            width: mobileLayout ? '100%' : (isMobile ? 64 : 320),
            padding: mobileLayout ? 12 : (isMobile ? 8 : 20),
            borderRightWidth: mobileLayout ? 0 : 1,
            borderBottomWidth: mobileLayout ? 1 : 0,
            borderColor: colors.border,
            alignItems: mobileLayout ? 'stretch' : (isMobile ? 'center' : 'stretch'),
          }}
        >
          <View
            style={{
              flexDirection: mobileLayout ? 'row' : 'column',
              justifyContent: mobileLayout ? 'space-around' : 'flex-start',
              gap: mobileLayout ? 8 : (isMobile ? 16 : 8),
              marginTop: mobileLayout ? 0 : (isMobile ? 0 : 28),
            }}
          >
            {settingsSections.map((section) => {
              const active = activeSection === section.key;
              const Icon = section.icon;
              if (mobileLayout || isMobile) {
                return (
                  <Pressable
                    key={section.key}
                    onPress={() => setActiveSection(section.key)}
                    className="h-11 w-11 items-center justify-center rounded-xl border"
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
                <SettingsMenuItem
                  key={section.key}
                  icon={section.icon}
                  title={section.title}
                  subtitle={section.subtitle}
                  active={active}
                  onPress={() => setActiveSection(section.key)}
                />
              );
            })}
          </View>
        </View>

        <View className={`${mobileLayout ? 'p-4' : (isMobile ? 'p-5' : 'p-8')} flex-1`}>
          <View className="mb-6 flex-row flex-wrap items-center justify-between gap-4">
            <View className="min-w-0 flex-1">
              <Text className={`${isMobile ? 'text-xl' : 'text-3xl'} font-medium`} style={{ color: colors.text }}>{activeSettings.title}</Text>
              <Text className="mt-2" style={{ color: colors.muted }}>{activeSettings.subtitle}</Text>
            </View>
            {activeSection === 'profile' ? (
              <View className="flex-row flex-wrap gap-3">
                {editingProfile ? (
                  <>
                    <Pressable onPress={cancelProfileEdit} className="rounded-xl border px-6 py-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                      <Text className="font-medium" style={{ color: colors.text }}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={saveSettings} className="flex-row items-center rounded-xl bg-primary px-6 py-4">
                      <Save size={17} color="#05130d" />
                      <Text className="ml-2 font-medium text-medium">Save Changes</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable onPress={() => setEditingProfile(true)} className="rounded-xl bg-primary px-6 py-4">
                    <Text className="font-medium text-medium">Edit</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>

          {message ? <Text className="mb-5 rounded-xl border border-success/40 bg-success/10 p-4 text-success">{message}</Text> : null}
          {error ? <Text className="mb-5 rounded-xl border border-danger/40 bg-danger/10 p-4 text-danger">{error}</Text> : null}

          {activeSection === 'profile' ? (
            <View className={`${isMobile ? 'p-4' : 'p-5 lg:p-7'} rounded-2xl border`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Text className={`${isMobile ? 'text-xl' : 'text-2xl'} mb-6 font-medium`} style={{ color: colors.text }}>Profile Information</Text>
            <View className="gap-8 lg:flex-row">
              <View className="items-center lg:w-[300px]">
                <View className="h-40 w-40 overflow-hidden rounded-full border" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                  {profileForm.profileImage ? (
                    <Image source={{ uri: profileForm.profileImage }} className="h-full w-full" resizeMode="cover" />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Text className="text-5xl font-medium text-primary">{initials || 'N'}</Text>
                    </View>
                  )}
                </View>
                {Platform.OS === 'web' ? (
                  <input
                    ref={profileImageInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    type="file"
                    onChange={(event) => {
                      selectProfileImage(event.target.files?.[0] || null);
                      event.target.value = '';
                    }}
                  />
                ) : null}
                <Pressable
                  onPress={openProfileImagePicker}
                  className="-mt-9 ml-28 h-12 w-12 items-center justify-center rounded-full bg-primary"
                >
                  <Camera size={19} color="#05130d" />
                </Pressable>
                {editingProfile ? (
                  <View className="mt-4 flex-row flex-wrap justify-center gap-3">
                    <Pressable onPress={openProfileImagePicker} className="rounded-lg border border-primary px-4 py-2">
                      <Text className="text-xs font-medium text-primary">{profileForm.profileImage ? 'Change Photo' : 'Add Photo'}</Text>
                    </Pressable>
                    {profileForm.profileImage ? (
                      <Pressable onPress={removeProfileImage} className="rounded-lg bg-danger/10 px-4 py-2">
                        <Text className="text-xs font-medium text-danger">Remove Photo</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                <Text className="mt-6 text-xl font-medium" style={{ color: colors.text }}>{profileForm.name || 'NovaFXM User'}</Text>
                <View className="mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: user?.verificationStatus === 'approved' ? '#12cf7a26' : '#D4AF3726' }}>
                  <Text className="font-medium" style={{ color: user?.verificationStatus === 'approved' ? '#12cf7a' : '#D4AF37' }}>
                    {user?.verificationStatus === 'approved' ? 'Verified' : 'Not Verified'}
                  </Text>
                </View>
                <View className="mt-4 flex-row items-center">
                  <CalendarDays size={15} color="#8fa0bb" />
                  <Text className="ml-2" style={{ color: colors.muted }}>Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'NovaFXM'}</Text>
                </View>
              </View>

              <View className="flex-1">
                <SettingsInput label="Full Name" value={profileForm.name} editable={editingProfile} error={profileErrors.name} onChangeText={(name) => setProfileForm((current) => ({ ...current, name }))} placeholder="Your full name" />
                <SettingsInput label="Email Address" value={profileForm.email} editable={editingProfile} error={profileErrors.email} keyboardType="email-address" onChangeText={(email) => setProfileForm((current) => ({ ...current, email }))} placeholder="email@example.com" />
                <CountrySelect value={profileForm.country} editable={editingProfile} error={profileErrors.country} onChange={updateCountry} />
                <SettingsInput label="Phone Number" value={profileForm.phone} editable={editingProfile} error={profileErrors.phone} keyboardType="phone-pad" onChangeText={(phone) => setProfileForm((current) => ({ ...current, phone }))} placeholder="+94 77 123 4567" />
                <SettingsInput label="Date of Birth" value={profileForm.dateOfBirth} editable={editingProfile} error={profileErrors.dateOfBirth} onChangeText={(dateOfBirth) => setProfileForm((current) => ({ ...current, dateOfBirth }))} placeholder="DD / MM / YYYY" />
              </View>
            </View>
            </View>
          ) : null}

          {activeSection === 'security' ? (
            <View className="rounded-2xl border p-5 lg:p-7" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <View className="mb-6 flex-row items-center">
              <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                <LockKeyhole size={20} color="#D4AF37" />
              </View>
              <View>
                <Text className="text-2xl font-medium" style={{ color: colors.text }}>Change Password</Text>
                <Text className="mt-1" style={{ color: colors.muted }}>Ensure your account is using a long, random password to stay secure.</Text>
              </View>
            </View>
            <View className="gap-5 lg:flex-row">
              <View className="flex-1">
                <PasswordInput
                  label="Current Password"
                  value={passwordForm.currentPassword}
                  onChangeText={(currentPassword) => {
                    setPasswordForm((current) => ({ ...current, currentPassword }));
                    setPasswordMessage('');
                  }}
                  placeholder="Enter your current password"
                />
                <PasswordInput
                  label="New Password"
                  value={passwordForm.newPassword}
                  onChangeText={(newPassword) => {
                    setPasswordForm((current) => ({ ...current, newPassword }));
                    setPasswordMessage('');
                  }}
                  placeholder="Enter your new password"
                />
                <PasswordInput
                  label="Confirm New Password"
                  value={passwordForm.confirmPassword}
                  onChangeText={(confirmPassword) => {
                    setPasswordForm((current) => ({ ...current, confirmPassword }));
                    setPasswordMessage('');
                  }}
                  placeholder="Confirm your new password"
                />
                <Pressable disabled={passwordBusy} onPress={submitChangePassword} className={`mt-2 flex-row self-start rounded-xl bg-primary px-6 py-4 ${passwordBusy ? 'opacity-60' : ''}`}>
                  <LockKeyhole size={16} color="#05130d" />
                  <Text className="ml-2 font-medium text-medium">{passwordBusy ? 'Updating...' : 'Update Password'}</Text>
                </Pressable>
                {passwordMessage ? <Text className="mt-3 text-sm" style={{ color: colors.muted }}>{passwordMessage}</Text> : null}
              </View>
              <View className="rounded-2xl border p-5 lg:w-[300px]" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                <Text className="mb-5 font-medium text-success">Password Requirements</Text>
                <Requirement>Minimum 8 characters</Requirement>
                <Requirement>At least 1 uppercase letter</Requirement>
                <Requirement>At least 1 lowercase letter</Requirement>
                <Requirement>At least 1 number</Requirement>
                <Requirement>At least 1 special character</Requirement>
              </View>
            </View>
            <View className="mt-5 rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
              <View className="mb-4 flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <Shield size={18} color="#D4AF37" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-medium" style={{ color: colors.text }}>Forgot Password</Text>
                  <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Send a reset code to your registered email address.</Text>
                </View>
              </View>
              <View className="lg:flex-row lg:items-end lg:gap-3">
                <SettingsInput
                  className="flex-1"
                  label="Account Email"
                  value={forgotEmail}
                  keyboardType="email-address"
                  onChangeText={(value) => {
                    setForgotEmail(value);
                    setForgotMessage('');
                  }}
                  placeholder="email@example.com"
                />
                <Pressable disabled={forgotBusy} onPress={submitForgotPassword} className={`mb-4 min-h-[46px] items-center justify-center rounded-xl border border-primary/60 bg-primary/10 px-5 ${forgotBusy ? 'opacity-60' : ''}`}>
                  <Text className="font-medium text-primary">{forgotBusy ? 'Sending...' : 'Send Code'}</Text>
                </Pressable>
              </View>
              <View className="rounded-xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <SettingsInput
                  label="Reset Code"
                  value={forgotToken}
                  onChangeText={(value) => {
                    setForgotToken(value);
                    setForgotMessage('');
                  }}
                  placeholder="Enter email reset code"
                />
                <PasswordInput label="New Password" value={forgotPassword} onChangeText={setForgotPassword} placeholder="Enter new password" />
                <PasswordInput label="Confirm New Password" value={forgotConfirmPassword} onChangeText={setForgotConfirmPassword} placeholder="Confirm new password" />
                <Pressable disabled={forgotBusy} onPress={submitResetPassword} className={`mt-1 flex-row self-start rounded-xl bg-primary px-5 py-3 ${forgotBusy ? 'opacity-60' : ''}`}>
                  <LockKeyhole size={16} color="#05130d" />
                  <Text className="ml-2 font-medium text-medium">Reset Password</Text>
                </Pressable>
              </View>
              {forgotMessage ? <Text className="text-sm" style={{ color: colors.muted }}>{forgotMessage}</Text> : null}
            </View>
            </View>
          ) : null}

          {activeSection === 'payments' ? (
            <SettingsPanel icon={CreditCard} title="Withdrawal Details" subtitle="Save bank, USDT TRC20, and USDT BEP20 withdrawal details.">
              {showBankForm ? (
                <View className="rounded-xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                  <Text className="mb-4 text-base font-medium" style={{ color: colors.text }}>{bankRejected ? 'Add Bank Account Details Again' : savedBankDetail ? 'Edit Bank Account Details' : 'Bank Account Details'}</Text>
                  {bankRejected ? (
                    <Text className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
                      Bank account details were rejected. Add the correct details again and submit for admin approval.
                    </Text>
                  ) : null}
                  <View className="lg:flex-row lg:gap-4">
                    <SettingsInput
                      className="flex-1"
                      label="Account Holder Name"
                      value={bankForm.bankAccountHolder}
                      onChangeText={(bankAccountHolder) => {
                        setBankForm((current) => ({ ...current, bankAccountHolder }));
                        setBankMessage('');
                      }}
                      placeholder="Name on bank account"
                    />
                    <SettingsInput
                      className="flex-1"
                      label="Bank Name"
                      value={bankForm.bankName}
                      onChangeText={(bankName) => {
                        setBankForm((current) => ({ ...current, bankName }));
                        setBankMessage('');
                      }}
                      placeholder="Bank name"
                    />
                  </View>
                  <View className="lg:flex-row lg:gap-4">
                    <SettingsInput
                      className="flex-1"
                      label="Branch"
                      value={bankForm.bankBranch}
                      onChangeText={(bankBranch) => {
                        setBankForm((current) => ({ ...current, bankBranch }));
                        setBankMessage('');
                      }}
                      placeholder="Branch name"
                    />
                    <SettingsInput
                      className="flex-1"
                      label="Account Number"
                      value={bankForm.bankAccountNumber}
                      keyboardType="number-pad"
                      onChangeText={(bankAccountNumber) => {
                        setBankForm((current) => ({ ...current, bankAccountNumber }));
                        setBankMessage('');
                      }}
                      placeholder="Bank account number"
                    />
                  </View>
                  <Pressable disabled={bankBusy} onPress={saveBankDetails} className={`mt-2 flex-row self-start rounded-xl bg-primary px-6 py-4 ${bankBusy ? 'opacity-60' : ''}`}>
                    <Save size={16} color="#05130d" />
                    <Text className="ml-2 font-medium text-medium">{bankBusy ? 'Saving...' : bankRejected ? 'Resubmit Bank Details' : savedBankDetail ? 'Update Bank Details' : 'Save Bank Details'}</Text>
                  </Pressable>
                </View>
              ) : null}
              {showTrc20Form ? (
                <View className={`${showBankForm ? 'mt-4' : ''} rounded-xl border p-4`} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                  <Text className="mb-4 text-base font-medium" style={{ color: colors.text }}>{trc20Rejected ? 'Add USDT TRC20 Details Again' : savedTrc20Detail ? 'Edit USDT TRC20 Details' : 'USDT TRC20 Details'}</Text>
                  {trc20Rejected ? (
                    <Text className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
                      TRC20 details were rejected. Add the correct details again and submit for admin approval.
                    </Text>
                  ) : null}
                  <View className="lg:flex-row lg:gap-4">
                    <SettingsInput
                      className="flex-1"
                      label="Wallet Holder Name"
                      value={trc20Form.walletHolderName}
                      onChangeText={(walletHolderName) => {
                        setTrc20Form((current) => ({ ...current, walletHolderName }));
                        setBankMessage('');
                      }}
                      placeholder="Name for this wallet"
                    />
                    <SettingsInput
                      className="flex-1"
                      label="TRC20 Wallet Address"
                      value={trc20Form.walletAddress}
                      onChangeText={(walletAddress) => {
                        setTrc20Form((current) => ({ ...current, walletAddress }));
                        setBankMessage('');
                      }}
                      placeholder="TRC20 wallet address"
                    />
                  </View>
                  <Pressable disabled={bankBusy} onPress={saveTrc20Details} className={`mt-2 flex-row self-start rounded-xl bg-primary px-6 py-4 ${bankBusy ? 'opacity-60' : ''}`}>
                    <Save size={16} color="#05130d" />
                    <Text className="ml-2 font-medium text-medium">{bankBusy ? 'Saving...' : trc20Rejected ? 'Resubmit TRC20 Details' : savedTrc20Detail ? 'Update TRC20 Details' : 'Save TRC20 Details'}</Text>
                  </Pressable>
                </View>
              ) : null}
              {showBep20Form ? (
                <View className={`${showBankForm || showTrc20Form ? 'mt-4' : ''} rounded-xl border p-4`} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                  <Text className="mb-4 text-base font-medium" style={{ color: colors.text }}>{bep20Rejected ? 'Add USDT BEP20 Details Again' : savedBep20Detail ? 'Edit USDT BEP20 Details' : 'USDT BEP20 Details'}</Text>
                  {bep20Rejected ? (
                    <Text className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
                      BEP20 details were rejected. Add the correct details again and submit for admin approval.
                    </Text>
                  ) : null}
                  <View className="lg:flex-row lg:gap-4">
                    <SettingsInput
                      className="flex-1"
                      label="Wallet Holder Name"
                      value={bep20Form.walletHolderName}
                      onChangeText={(walletHolderName) => {
                        setBep20Form((current) => ({ ...current, walletHolderName }));
                        setBankMessage('');
                      }}
                      placeholder="Name for this wallet"
                    />
                    <SettingsInput
                      className="flex-1"
                      label="BEP20 Wallet Address"
                      value={bep20Form.walletAddress}
                      onChangeText={(walletAddress) => {
                        setBep20Form((current) => ({ ...current, walletAddress }));
                        setBankMessage('');
                      }}
                      placeholder="BEP20 wallet address"
                    />
                  </View>
                  <Pressable disabled={bankBusy} onPress={saveBep20Details} className={`mt-2 flex-row self-start rounded-xl bg-primary px-6 py-4 ${bankBusy ? 'opacity-60' : ''}`}>
                    <Save size={16} color="#05130d" />
                    <Text className="ml-2 font-medium text-medium">{bankBusy ? 'Saving...' : bep20Rejected ? 'Resubmit BEP20 Details' : savedBep20Detail ? 'Update BEP20 Details' : 'Save BEP20 Details'}</Text>
                  </Pressable>
                </View>
              ) : null}
              {!showBankForm && !showTrc20Form && !showBep20Form ? (
                <View className="rounded-xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                  <Text className="font-medium" style={{ color: colors.text }}>Withdrawal detail limit reached.</Text>
                  <Text className="mt-2 text-sm" style={{ color: colors.muted }}>You can keep one Bank Account Details record, one USDT TRC20 Details record, and one USDT BEP20 Details record. Use Edit below to change saved details.</Text>
                </View>
              ) : null}
              {bankMessage ? <Text className="mt-3 text-sm" style={{ color: colors.muted }}>{bankMessage}</Text> : null}
              {bankAccounts.length ? (
                <View className="mt-4 gap-3">
                  <Text className="text-base font-medium" style={{ color: colors.text }}>Saved Withdrawal Details</Text>
                  {bankAccounts.map((account) => (
                    <View key={account.id || account.bankAccountNumber} className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                      <View className="mb-4 flex-row flex-wrap items-center justify-between gap-3">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text className="font-medium" style={{ color: colors.text }}>{account.payoutType} Details</Text>
                          <Text className={`rounded-full px-3 py-1 text-xs font-medium ${account.status === 'approved' ? 'bg-success/10 text-success' : account.status === 'rejected' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                            {account.status === 'approved' ? 'Approved' : account.status === 'rejected' ? 'Rejected' : account.status === 'delete_pending' ? 'Delete Pending' : 'Pending'}
                          </Text>
                        </View>
                        <View className="flex-row gap-2">
                          <Pressable disabled={bankBusy || !canEditWithdrawalDetail(account)} onPress={() => editBankDetails(account)} className={`rounded-lg border border-primary px-4 py-2 ${!canEditWithdrawalDetail(account) ? 'opacity-50' : ''}`}>
                            <Text className="text-xs font-medium text-primary">Edit</Text>
                          </Pressable>
                          <Pressable disabled={bankBusy || account.status === 'delete_pending'} onPress={() => deleteBankDetails(account.id)} className={`rounded-lg bg-danger/10 px-4 py-2 ${bankBusy || account.status === 'delete_pending' ? 'opacity-60' : ''}`}>
                            <Text className="text-xs font-medium text-danger">Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                      <View className="gap-3">
                        <View>
                          <Text className="text-xs uppercase" style={{ color: colors.muted }}>{account.payoutType === 'TRC20' ? 'Wallet Holder' : 'Account Holder'}</Text>
                          <Text className="mt-1 font-medium" style={{ color: colors.text }}>{account.bankAccountHolder || '-'}</Text>
                        </View>
                        <View>
                          <Text className="text-xs uppercase" style={{ color: colors.muted }}>{account.payoutType === 'TRC20' ? 'Network' : 'Bank Name'}</Text>
                          <Text className="mt-1 font-medium" style={{ color: colors.text }}>{account.bankName || '-'}</Text>
                        </View>
                        <View>
                          <Text className="text-xs uppercase" style={{ color: colors.muted }}>{account.payoutType === 'TRC20' ? 'Token Standard' : 'Branch'}</Text>
                          <Text className="mt-1 font-medium" style={{ color: colors.text }}>{account.bankBranch || '-'}</Text>
                        </View>
                        <View>
                          <Text className="text-xs uppercase" style={{ color: colors.muted }}>{account.payoutType === 'TRC20' ? 'Wallet Address' : 'Account Number'}</Text>
                          <Text className="mt-1 font-medium" style={{ color: colors.text }}>{account.bankAccountNumber || '-'}</Text>
                        </View>
                      </View>
                      {account.status !== 'approved' ? (
                        <View className={`mt-4 rounded-xl border p-4 ${account.status === 'rejected' ? 'border-danger/40 bg-danger/10' : 'border-primary/40'}`} style={{ backgroundColor: account.status === 'rejected' ? undefined : colors.panel }}>
                          <Text className={`font-medium ${account.status === 'rejected' ? 'text-danger' : 'text-primary'}`}>
                            {account.status === 'rejected'
                              ? 'Withdrawal details rejected'
                              : account.status === 'delete_pending'
                                ? 'Withdrawal detail delete request pending admin approval'
                                : 'Withdrawal details pending admin approval'}
                          </Text>
                          <Text className="mt-2 text-sm" style={{ color: colors.muted }}>
                            {account.status === 'rejected'
                              ? 'Please edit and resubmit your withdrawal details.'
                              : account.status === 'delete_pending'
                                ? 'This detail will be removed after admin approval.'
                                : 'These details can be edited and used for withdrawals after admin approval.'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <View className="mt-4 rounded-xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                  <Text className="font-medium" style={{ color: colors.text }}>Saved Withdrawal Details</Text>
                  <Text className="mt-2 text-sm" style={{ color: colors.muted }}>No bank, TRC20, or BEP20 withdrawal details saved yet.</Text>
                </View>
              )}
            </SettingsPanel>
          ) : null}

          {activeSection === 'session' ? (
            <SettingsPanel icon={LogOut} title="Session" subtitle="Manage your current login session.">
              <View className="rounded-xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                <Text className="font-medium" style={{ color: colors.text }}>Current Session</Text>
                <Text className="mt-2 text-sm" style={{ color: colors.muted }}>Signed in as {user?.email || 'NovaFXM user'}.</Text>
              </View>
              <CustomButton title="Logout" variant="danger" onPress={signOut} className="mt-5 max-w-[220px]" />
            </SettingsPanel>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
