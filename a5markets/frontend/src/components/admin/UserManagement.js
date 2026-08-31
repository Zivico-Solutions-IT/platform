import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ChevronDown, Edit3, Eye, Plus, Trash2, X } from 'lucide-react-native';
import CustomButton from '../common/CustomButton';
import CustomInput from '../common/CustomInput';
import { useAppTheme } from '../../context/ThemeContext';
import { dateTime, money } from '../../utils/formatters';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  country: '',
  dateOfBirth: '',
  accountType: 'Demo',
  leverage: '500',
  verificationStatus: 'unverified',
  adminNotes: '',
};
const defaultLeverage = 500;
const minLeverage = 100;
const maxLeverage = 2000;

const freshEmptyForm = () => ({ ...emptyForm });

const accountTypes = ['Demo', 'Live'];
const verificationStatuses = ['unverified', 'pending', 'approved', 'rejected'];
const countries = [
  { name: 'Afghanistan', code: '+93' }, { name: 'Albania', code: '+355' }, { name: 'Algeria', code: '+213' },
  { name: 'Andorra', code: '+376' }, { name: 'Angola', code: '+244' }, { name: 'Antigua and Barbuda', code: '+1' },
  { name: 'Argentina', code: '+54' }, { name: 'Armenia', code: '+374' }, { name: 'Australia', code: '+61' },
  { name: 'Austria', code: '+43' }, { name: 'Azerbaijan', code: '+994' }, { name: 'Bahamas', code: '+1' },
  { name: 'Bahrain', code: '+973' }, { name: 'Bangladesh', code: '+880' }, { name: 'Barbados', code: '+1' },
  { name: 'Belarus', code: '+375' }, { name: 'Belgium', code: '+32' }, { name: 'Belize', code: '+501' },
  { name: 'Benin', code: '+229' }, { name: 'Bhutan', code: '+975' }, { name: 'Bolivia', code: '+591' },
  { name: 'Bosnia and Herzegovina', code: '+387' }, { name: 'Botswana', code: '+267' }, { name: 'Brazil', code: '+55' },
  { name: 'Brunei', code: '+673' }, { name: 'Bulgaria', code: '+359' }, { name: 'Burkina Faso', code: '+226' },
  { name: 'Burundi', code: '+257' }, { name: 'Cabo Verde', code: '+238' }, { name: 'Cambodia', code: '+855' },
  { name: 'Cameroon', code: '+237' }, { name: 'Canada', code: '+1' }, { name: 'Central African Republic', code: '+236' },
  { name: 'Chad', code: '+235' }, { name: 'Chile', code: '+56' }, { name: 'China', code: '+86' },
  { name: 'Colombia', code: '+57' }, { name: 'Comoros', code: '+269' }, { name: 'Congo', code: '+242' },
  { name: 'Costa Rica', code: '+506' }, { name: "Cote d'Ivoire", code: '+225' }, { name: 'Croatia', code: '+385' },
  { name: 'Cuba', code: '+53' }, { name: 'Cyprus', code: '+357' }, { name: 'Czech Republic', code: '+420' },
  { name: 'Democratic Republic of the Congo', code: '+243' }, { name: 'Denmark', code: '+45' }, { name: 'Djibouti', code: '+253' },
  { name: 'Dominica', code: '+1' }, { name: 'Dominican Republic', code: '+1' }, { name: 'Ecuador', code: '+593' },
  { name: 'Egypt', code: '+20' }, { name: 'El Salvador', code: '+503' }, { name: 'Equatorial Guinea', code: '+240' },
  { name: 'Eritrea', code: '+291' }, { name: 'Estonia', code: '+372' }, { name: 'Eswatini', code: '+268' },
  { name: 'Ethiopia', code: '+251' }, { name: 'Fiji', code: '+679' }, { name: 'Finland', code: '+358' },
  { name: 'France', code: '+33' }, { name: 'Gabon', code: '+241' }, { name: 'Gambia', code: '+220' },
  { name: 'Georgia', code: '+995' }, { name: 'Germany', code: '+49' }, { name: 'Ghana', code: '+233' },
  { name: 'Greece', code: '+30' }, { name: 'Grenada', code: '+1' }, { name: 'Guatemala', code: '+502' },
  { name: 'Guinea', code: '+224' }, { name: 'Guinea-Bissau', code: '+245' }, { name: 'Guyana', code: '+592' },
  { name: 'Haiti', code: '+509' }, { name: 'Honduras', code: '+504' }, { name: 'Hungary', code: '+36' },
  { name: 'Iceland', code: '+354' }, { name: 'India', code: '+91' }, { name: 'Indonesia', code: '+62' },
  { name: 'Iran', code: '+98' }, { name: 'Iraq', code: '+964' }, { name: 'Ireland', code: '+353' },
  { name: 'Israel', code: '+972' }, { name: 'Italy', code: '+39' }, { name: 'Jamaica', code: '+1' },
  { name: 'Japan', code: '+81' }, { name: 'Jordan', code: '+962' }, { name: 'Kazakhstan', code: '+7' },
  { name: 'Kenya', code: '+254' }, { name: 'Kiribati', code: '+686' }, { name: 'Kuwait', code: '+965' },
  { name: 'Kyrgyzstan', code: '+996' }, { name: 'Laos', code: '+856' }, { name: 'Latvia', code: '+371' },
  { name: 'Lebanon', code: '+961' }, { name: 'Lesotho', code: '+266' }, { name: 'Liberia', code: '+231' },
  { name: 'Libya', code: '+218' }, { name: 'Liechtenstein', code: '+423' }, { name: 'Lithuania', code: '+370' },
  { name: 'Luxembourg', code: '+352' }, { name: 'Madagascar', code: '+261' }, { name: 'Malawi', code: '+265' },
  { name: 'Malaysia', code: '+60' }, { name: 'Maldives', code: '+960' }, { name: 'Mali', code: '+223' },
  { name: 'Malta', code: '+356' }, { name: 'Marshall Islands', code: '+692' }, { name: 'Mauritania', code: '+222' },
  { name: 'Mauritius', code: '+230' }, { name: 'Mexico', code: '+52' }, { name: 'Micronesia', code: '+691' },
  { name: 'Moldova', code: '+373' }, { name: 'Monaco', code: '+377' }, { name: 'Mongolia', code: '+976' },
  { name: 'Montenegro', code: '+382' }, { name: 'Morocco', code: '+212' }, { name: 'Mozambique', code: '+258' },
  { name: 'Myanmar', code: '+95' }, { name: 'Namibia', code: '+264' }, { name: 'Nauru', code: '+674' },
  { name: 'Nepal', code: '+977' }, { name: 'Netherlands', code: '+31' }, { name: 'New Zealand', code: '+64' },
  { name: 'Nicaragua', code: '+505' }, { name: 'Niger', code: '+227' }, { name: 'Nigeria', code: '+234' },
  { name: 'North Korea', code: '+850' }, { name: 'North Macedonia', code: '+389' }, { name: 'Norway', code: '+47' },
  { name: 'Oman', code: '+968' }, { name: 'Pakistan', code: '+92' }, { name: 'Palau', code: '+680' },
  { name: 'Palestine', code: '+970' }, { name: 'Panama', code: '+507' }, { name: 'Papua New Guinea', code: '+675' },
  { name: 'Paraguay', code: '+595' }, { name: 'Peru', code: '+51' }, { name: 'Philippines', code: '+63' },
  { name: 'Poland', code: '+48' }, { name: 'Portugal', code: '+351' }, { name: 'Qatar', code: '+974' },
  { name: 'Romania', code: '+40' }, { name: 'Russia', code: '+7' }, { name: 'Rwanda', code: '+250' },
  { name: 'Saint Kitts and Nevis', code: '+1' }, { name: 'Saint Lucia', code: '+1' }, { name: 'Saint Vincent and the Grenadines', code: '+1' },
  { name: 'Samoa', code: '+685' }, { name: 'San Marino', code: '+378' }, { name: 'Sao Tome and Principe', code: '+239' },
  { name: 'Saudi Arabia', code: '+966' }, { name: 'Senegal', code: '+221' }, { name: 'Serbia', code: '+381' },
  { name: 'Seychelles', code: '+248' }, { name: 'Sierra Leone', code: '+232' }, { name: 'Singapore', code: '+65' },
  { name: 'Slovakia', code: '+421' }, { name: 'Slovenia', code: '+386' }, { name: 'Solomon Islands', code: '+677' },
  { name: 'Somalia', code: '+252' }, { name: 'South Africa', code: '+27' }, { name: 'South Korea', code: '+82' },
  { name: 'South Sudan', code: '+211' }, { name: 'Spain', code: '+34' }, { name: 'Sri Lanka', code: '+94' },
  { name: 'Sudan', code: '+249' }, { name: 'Suriname', code: '+597' }, { name: 'Sweden', code: '+46' },
  { name: 'Switzerland', code: '+41' }, { name: 'Syria', code: '+963' }, { name: 'Taiwan', code: '+886' },
  { name: 'Tajikistan', code: '+992' }, { name: 'Tanzania', code: '+255' }, { name: 'Thailand', code: '+66' },
  { name: 'Timor-Leste', code: '+670' }, { name: 'Togo', code: '+228' }, { name: 'Tonga', code: '+676' },
  { name: 'Trinidad and Tobago', code: '+1' }, { name: 'Tunisia', code: '+216' }, { name: 'Turkey', code: '+90' },
  { name: 'Turkmenistan', code: '+993' }, { name: 'Tuvalu', code: '+688' }, { name: 'Uganda', code: '+256' },
  { name: 'Ukraine', code: '+380' }, { name: 'United Arab Emirates', code: '+971' }, { name: 'United Kingdom', code: '+44' },
  { name: 'United States', code: '+1' }, { name: 'Uruguay', code: '+598' }, { name: 'Uzbekistan', code: '+998' },
  { name: 'Vanuatu', code: '+678' }, { name: 'Vatican City', code: '+39' }, { name: 'Venezuela', code: '+58' },
  { name: 'Vietnam', code: '+84' }, { name: 'Yemen', code: '+967' }, { name: 'Zambia', code: '+260' },
  { name: 'Zimbabwe', code: '+263' },
];

const countryByName = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  return countries.find((country) => (
    country.name.toLowerCase() === normalized
    || country.code === raw
    || `${country.name} (${country.code})`.toLowerCase() === normalized
  )) || null;
};
const countryFromPhone = (phone) => {
  const compactPhone = String(phone || '').replace(/[\s()-]/g, '');
  return [...countries]
    .sort((left, right) => right.code.length - left.code.length)
    .find((country) => compactPhone.startsWith(country.code)) || null;
};
const phoneWithoutDialCode = (phone) => String(phone || '').replace(/^\+\d{1,4}\s*/, '').trim();
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const phoneWithCountryCode = (phone, countryName) => {
  const country = countryByName(countryName);
  if (!country) return phone;
  const localNumber = phoneWithoutDialCode(phone);
  return localNumber ? `${country.code} ${localNumber}` : `${country.code} `;
};
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

function validateUserForm(form, mode) {
  const errors = {};
  const country = countryByName(form.country);
  const email = String(form.email || '').trim();
  const phone = String(form.phone || '').trim();
  const localPhoneDigits = digitsOnly(phoneWithoutDialCode(phone));

  if (email && !isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (form.password && String(form.password).length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }
  if (phone) {
    if (!country) {
      errors.phone = 'Select a country before entering the phone number.';
    } else if (!phone.startsWith(country.code)) {
      errors.phone = `Phone number must start with ${country.code}.`;
    } else if (localPhoneDigits.length < 6 || localPhoneDigits.length > 14) {
      errors.phone = 'Enter a valid phone number.';
    }
  }
  if (form.leverage) {
    const leverage = Number(String(form.leverage || '').replace('1:', ''));
    if (!Number.isInteger(leverage) || leverage < minLeverage || leverage > maxLeverage) {
      errors.leverage = `Leverage must be between 1:${minLeverage} and 1:${maxLeverage}.`;
    }
  }

  return errors;
}

function ask(message, onConfirm) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Confirm admin action', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: onConfirm }]);
}

function pillClass(active) {
  return active ? 'border-primary bg-primary' : 'border-border bg-surface';
}

function PillGroup({ label, options, value, onChange }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <View className={mobile ? "mb-3" : "mb-4"}>
      <Text className={`font-semimedium ${mobile ? 'mb-1 text-xs' : 'mb-2 text-sm'}`} style={{ color: colors.muted }}>{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <Pressable key={option} onPress={() => onChange(option)} className={`rounded-xl border ${mobile ? 'px-3 py-2' : 'px-4 py-3'} ${pillClass(active)}`} style={active ? null : { backgroundColor: colors.surface, borderColor: colors.border }}>
              <Text className={`text-xs font-medium capitalize ${active ? 'text-medium' : ''}`} style={active ? null : { color: colors.text }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CountrySelect({ value, onChange }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const [open, setOpen] = useState(false);
  const selected = countryByName(value);

  const selectCountry = (country) => {
    onChange(country.name);
    setOpen(false);
  };

  return (
    <View className={mobile ? "mb-3" : "mb-4"}>
      <Text className={`font-medium ${mobile ? 'mb-1 text-xs' : 'mb-2 text-sm'}`} style={{ color: colors.muted }}>Country</Text>
      <Pressable onPress={() => setOpen((current) => !current)} className={`${mobile ? 'h-10 px-3' : 'h-12 px-4'} flex-row items-center justify-between rounded-xl border`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <Text style={{ color: selected ? colors.text : colors.muted, fontSize: mobile ? 13 : 14 }}>{selected ? `${selected.name} (${selected.code})` : 'Select country'}</Text>
        <ChevronDown size={mobile ? 15 : 17} color={colors.muted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? (
        <ScrollView nestedScrollEnabled className="mt-2 rounded-xl border" style={{ maxHeight: 260, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
          {countries.map((country) => (
            <Pressable
              key={country.name}
              onPress={() => selectCountry(country)}
              className={`border-b px-4 py-3 ${country.name === value ? 'bg-primary/10' : ''}`}
              style={{ borderColor: colors.border }}
            >
              <Text className={country.name === value ? 'font-medium text-primary' : ''} style={country.name === value ? null : { color: colors.text }}>{country.name} ({country.code})</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function FieldError({ children }) {
  return children ? <Text className="mt-1 text-xs text-danger">{children}</Text> : null;
}

function ProfileField({ label, value }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <View className={`min-w-[140px] flex-1 rounded-xl border ${mobile ? 'mb-2 p-3' : 'mb-3 p-4'}`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <Text className="text-[10px] md:text-xs font-medium uppercase" style={{ color: colors.muted }}>{label}</Text>
      <Text className="mt-0.5 text-xs md:text-sm font-semimedium" style={{ color: colors.text }}>{value || '-'}</Text>
    </View>
  );
}

function StickyTableHeader({ children }) {
  const { darkMode, colors } = useAppTheme();

  return (
    <View
      className="flex-row border-b p-4"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        elevation: 30,
      }}
    >
      {children}
    </View>
  );
}

function userToForm(user) {
  const selectedCountry = countryByName(user?.country) || countryFromPhone(user?.phone);
  return {
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    phone: user?.phone || '',
    country: selectedCountry?.name || user?.country || '',
    dateOfBirth: user?.dateOfBirth || '',
    accountType: user?.accountType || 'Demo',
    leverage: String(user?.leverage || defaultLeverage),
    verificationStatus: user?.verificationStatus || 'unverified',
    adminNotes: user?.adminNotes || '',
  };
}

function UserFormModal({ mode, user, saving, onClose, onSubmit }) {
  const { darkMode, colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const mobile = width < 760;
  const [form, setForm] = useState(user ? userToForm(user) : freshEmptyForm());
  const [errors, setErrors] = useState({});
  const [localError, setLocalError] = useState('');
  const update = (key) => (value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: null }));
  };
  const updateCountry = (country) => {
    setForm((current) => ({ ...current, country, phone: phoneWithCountryCode(current.phone, country) }));
    setErrors((current) => ({ ...current, country: null, phone: null }));
  };
  const submit = async () => {
    const nextErrors = validateUserForm(form, mode);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLocalError('');
    try {
      await onSubmit(form);
      if (mode === 'add') {
        setForm(freshEmptyForm());
        setErrors({});
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to save user details.';
      setLocalError(msg);
    }
  };
  const title = mode === 'edit' ? 'Edit User Details' : 'Add New User';

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View
        className={mobile ? "flex-1 justify-start" : "absolute inset-0 items-center justify-start bg-medium/70 p-4 pt-6 md:pt-8"}
        style={mobile ? { backgroundColor: colors.background } : { zIndex: 5000 }}
      >
        <View
          className={mobile ? "flex-1 w-full p-4" : "max-h-[92vh] w-full max-w-[860px] rounded-2xl border p-5"}
          style={{ height: mobile ? undefined : Math.min(Math.round(height * 0.92), 760), flexDirection: 'column', overflow: 'hidden', backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}
        >
          <View className={`flex-row items-center justify-between ${mobile ? 'mb-3' : 'mb-4'}`}>
            <View className="min-w-0 flex-1 mr-2">
              <Text className={`${mobile ? 'text-lg' : 'text-2xl'} font-medium`} numberOfLines={1} style={{ color: colors.text }}>{title}</Text>
              <Text className="mt-0.5 text-xs" numberOfLines={1} style={{ color: colors.muted }}>
                {mode === 'edit' ? 'Update client profile and account settings.' : 'Create a client login with a wallet and primary trading account.'}
              </Text>
            </View>
            <Pressable onPress={onClose} className={mobile ? "rounded-full p-2" : "rounded-full p-2.5"} style={{ backgroundColor: colors.surface }}>
              <X size={mobile ? 16 : 18} color={colors.muted} />
            </Pressable>
          </View>
          {localError ? (
            <Text className="mb-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">{localError}</Text>
          ) : null}
          <ScrollView
            className="deep-green-scrollbar"
            showsVerticalScrollIndicator={true}
            style={{ flex: 1, flexShrink: 1, minHeight: 0, ...(Platform.OS === 'web' ? { overflowY: 'scroll', scrollbarGutter: 'stable' } : {}) }}
            contentContainerStyle={{ paddingBottom: mobile ? 14 : 18 }}
          >
            <View className={mobile ? 'gap-0' : 'gap-4 md:flex-row'}>
              <View className={mobile ? '' : 'flex-1'}>
                <CustomInput label="Full Name" value={form.name} onChangeText={update('name')} placeholder="Client name" autoComplete="off" importantForAutofill="no" error={errors.name} />
                <CustomInput label="Email" value={form.email} onChangeText={update('email')} placeholder="client@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="off" importantForAutofill="no" error={errors.email} />
                <CustomInput label={mode === 'edit' ? 'New Password (Optional)' : 'Password'} value={form.password} onChangeText={update('password')} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password" importantForAutofill="no" error={errors.password} />
                <CountrySelect key={form.country || 'empty-country'} value={form.country} onChange={updateCountry} />
                <FieldError>{errors.country}</FieldError>
                <CustomInput label="Phone" value={form.phone} onChangeText={update('phone')} placeholder="Phone number" autoComplete="off" importantForAutofill="no" error={errors.phone} />
              </View>
              <View className={mobile ? '' : 'flex-1'}>
                <CustomInput label="Date of Birth" value={form.dateOfBirth} onChangeText={update('dateOfBirth')} placeholder="YYYY-MM-DD" autoComplete="off" importantForAutofill="no" />
                <CustomInput label="Leverage" value={form.leverage} onChangeText={update('leverage')} placeholder="500" keyboardType="number-pad" error={errors.leverage} />
                <PillGroup label="Account Type" options={accountTypes} value={form.accountType} onChange={update('accountType')} />
                <PillGroup label="Verification" options={verificationStatuses} value={form.verificationStatus} onChange={update('verificationStatus')} />
              </View>
            </View>
            <CustomInput
              label="Admin Notes"
              value={form.adminNotes}
              onChangeText={update('adminNotes')}
              placeholder="Internal note"
              multiline
              style={mobile ? { minHeight: 60, textAlignVertical: 'top', paddingTop: 8 } : { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }}
            />
          </ScrollView>
          <View className={`flex-row justify-end border-t pt-3 ${mobile ? 'gap-2' : 'gap-3'}`} style={{ borderColor: colors.border }}>
            <CustomButton title="Cancel" variant="secondary" onPress={onClose} className={mobile ? "flex-1 h-9 px-3" : "min-w-[120px]"} />
            <CustomButton title={mobile && mode === 'edit' ? 'Save' : mode === 'edit' ? 'Save Changes' : 'Add User'} loading={saving} onPress={submit} className={mobile ? "flex-1 h-9 px-3" : "min-w-[150px]"} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProfileModal({ user, onClose, onEdit }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const wallet = user?.wallet || {};

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View
        className={mobile ? "flex-1 justify-start" : "absolute inset-0 items-center justify-start bg-medium/70 p-4 pt-6 md:pt-8"}
        style={mobile ? { backgroundColor: colors.background } : { zIndex: 5000 }}
      >
        <View
          className={mobile ? "flex-1 w-full p-4" : "max-h-[92vh] w-full max-w-[920px] rounded-2xl border p-5"}
          style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}
        >
          <View className={`flex-row items-center justify-between ${mobile ? 'mb-3' : 'mb-4'}`}>
            <View className="min-w-0 flex-1 mr-2">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                {isOnlineUser(user) && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                )}
                <Text className={`${mobile ? 'text-lg' : 'text-2xl'} font-medium`} numberOfLines={1} style={{ color: colors.text }}>{user.name}</Text>
              </View>
              <Text className="mt-0.5 text-xs" numberOfLines={1} style={{ color: colors.muted }}>{user.email}</Text>
              <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: colors.muted }}>User ID: {user.referralCode || '-'}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <CustomButton title="Edit" variant="secondary" className={mobile ? "min-w-[70px] h-9 px-3" : "min-w-[90px]"} onPress={() => onEdit(user)} />
              <Pressable onPress={onClose} className={mobile ? "rounded-full p-2" : "rounded-full p-3"} style={{ backgroundColor: colors.surface }}>
                <X size={mobile ? 16 : 18} color={colors.muted} />
              </Pressable>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={mobile ? { paddingBottom: 20 } : undefined}>
            <View className={`rounded-2xl border ${mobile ? 'mb-3 p-3' : 'mb-4 p-4'}`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Text className={`font-medium uppercase ${mobile ? 'mb-2 text-xs' : 'mb-3 text-sm'}`} style={{ color: colors.muted }}>Profile Image</Text>
              {user.profileImage ? (
                <Image source={{ uri: user.profileImage }} className={`${mobile ? 'h-[180px]' : 'h-[220px]'} w-full rounded-xl bg-medium`} resizeMode="contain" />
              ) : (
                <View className={`${mobile ? 'h-[120px]' : 'h-[180px]'} items-center justify-center rounded-xl border border-dashed`} style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                  <Text className="text-sm font-semimedium" style={{ color: colors.muted }}>No profile image uploaded.</Text>
                </View>
              )}
            </View>
            <View className={`flex-row flex-wrap ${mobile ? 'mb-3 gap-2' : 'mb-4 gap-3'}`}>
              <ProfileField label="Phone" value={user.phone} />
              <ProfileField label="Country" value={user.country} />
              <ProfileField label="Date of Birth" value={user.dateOfBirth} />
              <ProfileField label="Role" value={user.role} />
              <ProfileField label="Account Type" value={user.accountType} />
              <ProfileField label="Trading Status" value={user.tradingStatus} />
              <ProfileField label="Verification" value={user.verificationStatus} />
              <ProfileField label="Leverage" value={`1:${user.leverage || defaultLeverage}`} />
              <ProfileField label="Referral Code" value={user.referralCode} />
              <ProfileField label="Created" value={dateTime(user.createdAt)} />
            </View>
            <Text className={`font-medium ${mobile ? 'mb-2 text-base' : 'mb-3 text-lg'}`} style={{ color: colors.text }}>Wallet Summary</Text>
            <View className={`flex-row flex-wrap ${mobile ? 'mb-3 gap-2' : 'mb-4 gap-3'}`}>
              <ProfileField label="Balance" value={`$${money(wallet.balance)}`} />
              <ProfileField label="Equity" value={`$${money(wallet.equity)}`} />
              <ProfileField label="Margin" value={`$${money(wallet.margin)}`} />
              <ProfileField label="Free Funds" value={`$${money(wallet.freeFunds)}`} />
            </View>
            <Text className={`font-medium ${mobile ? 'mb-2 text-base' : 'mb-3 text-lg'}`} style={{ color: colors.text }}>Trading Accounts</Text>
            <View className={mobile ? 'mb-3 gap-1.5' : 'mb-4 gap-2'}>
              {(user.tradingAccounts || []).map((account) => (
                <View key={account.id} className={`flex-row flex-wrap items-center justify-between rounded-xl border ${mobile ? 'p-3' : 'p-4'}`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <View>
                    <Text className="font-medium" style={{ color: colors.text }}>{account.name}</Text>
                    <Text className="mt-1 text-xs md:text-sm" style={{ color: colors.muted }}>{account.type} | {account.status} | {account.isPrimary ? 'Primary' : 'Secondary'}</Text>
                  </View>
                  <Text className="font-medium text-primary">${money(account.balance)}</Text>
                </View>
              ))}
              {!user.tradingAccounts?.length ? <Text className="rounded-xl p-4" style={{ backgroundColor: colors.surface, color: colors.muted }}>No trading accounts found.</Text> : null}
            </View>
            <Text className={`font-medium ${mobile ? 'mb-2 text-base' : 'mb-3 text-lg'}`} style={{ color: colors.text }}>Admin Notes</Text>
            <Text className={`rounded-xl border ${mobile ? 'p-3 text-xs' : 'p-4'}`} style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.muted }}>{user.adminNotes || 'No admin notes.'}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Online Users', value: 'logged_in' },
  { label: 'Balance', value: 'wallet_balance' },
  { label: 'Volume', value: 'trading_volume' },
  { label: 'Deposits', value: 'highest_deposit' },
  { label: 'Withdrawals', value: 'highest_withdrawal' },
  { label: 'Profit', value: 'highest_profit' },
  { label: 'Most Active', value: 'most_active' },
  { label: 'A–Z', value: 'az' },
];

const userTableColumns = [
  { heading: 'User', style: { flex: 2, minWidth: 160 } },
  { heading: 'Agent', style: { flex: 1.2, minWidth: 120 } },
  { heading: 'Verification', style: { flex: 1.1, minWidth: 110 } },
  { heading: 'Wallet', style: { flex: 1, minWidth: 110 } },
  { heading: 'Created', style: { flex: 1.2, minWidth: 120 } },
  { heading: 'Actions', style: { width: 140 } },
];

const liveWalletBalance = (user) => {
  if (user?.accountStats?.liveBalance !== undefined && user?.accountStats?.liveBalance !== null) {
    return Number(user.accountStats.liveBalance || 0);
  }
  return (user?.tradingAccounts || [])
    .filter((account) => account.type === 'Live')
    .reduce((sum, account) => sum + Number(account.balance || 0), 0);
};

const verificationTone = (status, colors) => {
  switch (status) {
    case 'approved':
      return { backgroundColor: `${colors.success}18`, color: colors.success, label: 'verified' };
    case 'pending':
      return { backgroundColor: `${colors.primary}18`, color: colors.primary, label: 'pending' };
    case 'rejected':
      return { backgroundColor: `${colors.danger}18`, color: colors.danger, label: 'rejected' };
    case 'unverified':
    default:
      return { backgroundColor: `${colors.danger}12`, color: colors.danger, label: status || 'unverified' };
  }
};

const walletTone = (balance, colors) => {
  const value = Number(balance || 0);
  if (value <= 0) return colors.muted;
  if (value < 100) return colors.danger;
  if (value < 500) return colors.primary;
  return colors.success;
};

const loginTime = (user) => new Date(user?.lastLoginAt || 0).getTime();
const onlineUntilTime = (user) => new Date(user?.onlineUntil || 0).getTime();
const isOnlineUser = (user) => {
  const onlineUntil = onlineUntilTime(user);
  return Number.isFinite(onlineUntil) && onlineUntil > Date.now();
};
const lastLogoutLabel = (user) => {
  if (isOnlineUser(user)) return 'Online now';
  const lastLogout = new Date(user?.lastLogoutAt || 0).getTime();
  return Number.isFinite(lastLogout) && lastLogout > 0 ? `Last Online: ${dateTime(lastLogout)}` : 'Last Online: Never';
};

export default function UserManagement({ users, loading, busyId, onCreate, onUpdate, onRemove, newUserCount = 0, onViewUser, onRefresh, addUserTrigger }) {
  const { width } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const [query, setQuery] = useState('');
  const [profileUser, setProfileUser] = useState(null);
  const [formState, setFormState] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [newUserBannerDismissed, setNewUserBannerDismissed] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !sortOpen) return;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [sortOpen]);
  const [mobileActionUser, setMobileActionUser] = useState(null);
  const mobile = width < 760;
  const inputBackground = darkMode ? colors.surface : '#f6fff9';
  const tableHeight = 'calc(100vh - 260px)';

  useEffect(() => {
    if (sortBy !== 'logged_in' || !onRefresh) return undefined;
    onRefresh();
    const timer = setInterval(onRefresh, 5000);
    return () => clearInterval(timer);
  }, [onRefresh, sortBy]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = (users || []).filter((user) => {
      if (user.role !== 'user') return false;
      if (sortBy === 'logged_in' && !isOnlineUser(user)) return false;
      if (!term) return true;
      return [user.name, user.email, user.phone, user.country].some((value) => String(value || '').toLowerCase().includes(term));
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'logged_in':
          return loginTime(b) - loginTime(a);
        case 'wallet_balance': {
          const balA = liveWalletBalance(a);
          const balB = liveWalletBalance(b);
          return Number(balB) - Number(balA);
        }
        case 'trading_volume': {
          const volA = a.accountStats?.tradingVolume ?? 0;
          const volB = b.accountStats?.tradingVolume ?? 0;
          return Number(volB) - Number(volA);
        }
        case 'highest_deposit': {
          const depA = a.accountStats?.totalDeposits ?? 0;
          const depB = b.accountStats?.totalDeposits ?? 0;
          return Number(depB) - Number(depA);
        }
        case 'highest_withdrawal': {
          const withdrawalA = a.accountStats?.totalWithdrawals ?? a.wallet?.totalWithdrawals ?? 0;
          const withdrawalB = b.accountStats?.totalWithdrawals ?? b.wallet?.totalWithdrawals ?? 0;
          return Number(withdrawalB) - Number(withdrawalA);
        }
        case 'highest_profit': {
          const profA = a.accountStats?.totalProfit ?? 0;
          const profB = b.accountStats?.totalProfit ?? 0;
          return Number(profB) - Number(profA);
        }
        case 'most_active': {
          const tradesA = a.accountStats?.totalTrades ?? 0;
          const tradesB = b.accountStats?.totalTrades ?? 0;
          return Number(tradesB) - Number(tradesA);
        }
        case 'az':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
      }
    });
  }, [query, users, sortBy]);

  const closeForm = () => setFormState(null);
  const openAddForm = () => setFormState({ mode: 'add', key: Date.now() });

  useEffect(() => {
    if (addUserTrigger > 0) {
      openAddForm();
    }
  }, [addUserTrigger]);

  const submitForm = async (values) => {
    if (formState?.mode === 'edit') {
      await onUpdate(formState.user.id, values);
      closeForm();
    } else {
      await onCreate(values);
    }
  };
  const editUser = (user) => {
    onViewUser?.(user);
    setProfileUser(null);
    setFormState({ mode: 'edit', user });
  };
  const viewUser = (user) => {
    onViewUser?.(user);
    setProfileUser(user);
  };
  const mobileActionBlocked = Boolean(mobileActionUser && (loading || busyId === mobileActionUser.id));

  return (
    <View>
      {newUserCount && !newUserBannerDismissed ? (
        <View className="mb-5 flex-row items-start justify-between gap-3 rounded-xl border p-4" style={{ backgroundColor: `${colors.primary}12`, borderColor: colors.primary }}>
          <View className="min-w-0 flex-1">
            <Text className="font-medium" style={{ color: colors.primary }}>{newUserCount} new user {newUserCount === 1 ? 'account' : 'accounts'} in the last 24 hours.</Text>
            <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Review new client profiles and account settings here.</Text>
          </View>
          <Pressable
            onPress={() => setNewUserBannerDismissed(true)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss new user notification"
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `${colors.primary}14` }}
          >
            <X size={16} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}
      <View className="mb-4 flex-row items-start gap-3 md:gap-4" style={{ zIndex: sortOpen ? 20 : 1 }}>
        <View className={mobile ? '' : 'flex-1'} style={{ flex: mobile ? 1.7 : undefined, minWidth: mobile ? 0 : 280 }}>
          <CustomInput
            label="Search Users"
            value={query}
            onChangeText={setQuery}
            placeholder={mobile ? "Search..." : "Search by name, email, phone or country"}
            style={mobile ? { height: 40, borderRadius: 10 } : undefined}
          />
        </View>
        <View className={mobile ? 'mb-3' : 'w-full md:w-[320px]'} style={{ flex: mobile ? 1 : undefined, minWidth: mobile ? 0 : 240 }}>
          <Text className={`font-medium ${mobile ? 'mb-1 text-xs' : 'mb-2 text-sm'}`} style={{ color: colors.muted }}>Sort By</Text>
          <View ref={dropdownRef} style={{ position: 'relative' }}>
            <Pressable
              onPress={() => setSortOpen((current) => !current)}
              className={mobile ? "h-10 flex-row items-center justify-between border px-3" : "h-12 flex-row items-center justify-between rounded-xl border px-4"}
              style={{ backgroundColor: inputBackground, borderColor: colors.border, borderRadius: mobile ? 10 : undefined }}
            >
              <Text style={{ color: colors.text, fontSize: mobile ? 14 : 14 }}>
                {sortOptions.find((opt) => opt.value === sortBy)?.label || 'Sort By'}
              </Text>
              <ChevronDown size={mobile ? 15 : 17} color={colors.muted} style={{ transform: [{ rotate: sortOpen ? '180deg' : '0deg' }] }} />
            </Pressable>
            {sortOpen ? (
              <ScrollView
                nestedScrollEnabled
                className="absolute left-0 right-0 rounded-xl border shadow-lg"
                style={{ top: mobile ? 42 : 52, maxHeight: 320, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16, zIndex: 30 }}
              >
                {sortOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setSortBy(option.value);
                      setSortOpen(false);
                    }}
                    className={`border-b px-4 py-3 ${option.value === sortBy ? 'bg-primary/10' : ''}`}
                    style={{ borderColor: colors.border }}
                  >
                    <Text
                      className={option.value === sortBy ? 'font-medium text-primary' : ''}
                      style={option.value === sortBy ? null : { color: colors.text }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
        {!mobile ? (
          <View className="w-full md:w-auto">
            <View className="mb-2 h-5" />
            <Pressable
              onPress={openAddForm}
              className="h-12 flex-row items-center justify-center rounded-xl border px-4"
              style={{ backgroundColor: colors.primary, borderColor: colors.primary }}
            >
              <Plus size={17} color="#111827" />
              <Text className="ml-2 text-sm font-medium" style={{ color: '#111827' }}>Add User</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <View className="overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16, maxHeight: mobile ? undefined : tableHeight }}>
        {mobile ? (
          <View className="gap-3 p-3">
            {filteredUsers.map((user) => {
              const blocked = loading || busyId === user.id;
              const walletTotal = liveWalletBalance(user);
              const statusBadge = verificationTone(user.verificationStatus || 'unverified', colors);
              const walletColor = walletTone(walletTotal, colors);
              return (
                <Pressable
                  key={user.id}
                  disabled={blocked}
                  onPress={() => setMobileActionUser(user)}
                  className={`rounded-2xl border p-4 ${blocked ? 'opacity-60' : ''}`}
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-1.5">
                        {isOnlineUser(user) && (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                        )}
                        <Text numberOfLines={1} className="font-medium" style={{ color: colors.text }}>{user.name}</Text>
                      </View>
                      <Text numberOfLines={1} className="mt-1 text-xs" style={{ color: colors.muted }}>{user.email}</Text>
                      <Text numberOfLines={1} className="mt-1 text-xs" style={{ color: colors.muted }}>User ID: {user.referralCode || '-'}</Text>
                      <Text numberOfLines={1} className="mt-1 text-xs" style={{ color: isOnlineUser(user) ? colors.success : colors.muted }}>{lastLogoutLabel(user)}</Text>
                      <Text numberOfLines={1} className="mt-1 text-xs" style={{ color: colors.muted }}>{user.phone || '-'}</Text>
                    </View>
                    <Text className="rounded-full px-2 py-1 text-xs font-medium capitalize" style={statusBadge}>
                      {statusBadge.label}
                    </Text>
                  </View>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {user.assignedAgent ? (
                      <View className="flex-1 rounded-2xl border p-3" style={{ minWidth: '48%', backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                        <Text className="text-[10px] uppercase" style={{ color: colors.muted }}>Agent</Text>
                        <Text className="mt-1 font-medium" numberOfLines={1} style={{ color: colors.primary }}>{user.assignedAgent.name}</Text>
                      </View>
                    ) : null}
                    <View className="flex-1 rounded-2xl border p-3" style={{ minWidth: '48%', backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <Text className="text-[10px] uppercase" style={{ color: colors.muted }}>Wallet</Text>
                      <Text className="mt-1 font-medium" style={{ color: walletColor }}>${money(walletTotal)}</Text>
                    </View>
                    <View className="flex-1 rounded-2xl border p-3" style={{ minWidth: '48%', backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
                      <Text className="text-[10px] uppercase" style={{ color: colors.muted }}>{sortBy === 'logged_in' ? 'Last Login' : 'Created'}</Text>
                      <Text numberOfLines={1} className="mt-1 text-xs" style={{ color: colors.text }}>{dateTime(sortBy === 'logged_in' ? user.lastLoginAt : user.createdAt)}</Text>
                    </View>
                  </View>
                  {/* Mobile Action Buttons */}
                  <View className="mt-4 flex-row gap-3 pt-3 border-t items-center justify-end" style={{ borderTopColor: `${colors.border}30` }}>
                    <Pressable
                      disabled={blocked}
                      onPress={() => viewUser(user)}
                      className={`h-9 w-9 items-center justify-center rounded-2xl border ${blocked ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}
                    >
                      <Eye size={16} color={colors.text} />
                    </Pressable>
                    <Pressable
                      disabled={blocked}
                      onPress={() => editUser(user)}
                      className={`h-9 w-9 items-center justify-center rounded-2xl border ${blocked ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}
                    >
                      <Edit3 size={16} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      disabled={blocked}
                      onPress={() => ask(`Remove ${user.name}? This will delete the user account and related wallet records.`, () => onRemove(user))}
                      className={`h-9 w-9 items-center justify-center rounded-2xl border ${blocked ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}60` }}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
            {!filteredUsers.length ? <Text className="p-6 text-center" style={{ color: colors.muted }}>{sortBy === 'logged_in' ? 'No logged-in users found.' : 'No users found.'}</Text> : null}
          </View>
        ) : (
        <ScrollView nestedScrollEnabled stickyHeaderIndices={[0]} style={{ maxHeight: tableHeight }}>
          <StickyTableHeader>
            {userTableColumns.map((column) => (
              <Text key={column.heading} style={[column.style, { color: colors.muted }]} className="text-xs font-medium uppercase">{sortBy === 'logged_in' && column.heading === 'Created' ? 'Last Login' : column.heading}</Text>
            ))}
          </StickyTableHeader>
          {filteredUsers.map((user) => {
            const blocked = loading || busyId === user.id;
            const walletTotal = liveWalletBalance(user);
            const statusBadge = verificationTone(user.verificationStatus || 'unverified', colors);
            const walletColor = walletTone(walletTotal, colors);
            return (
              <View key={user.id} className="flex-row items-center border-b p-4" style={{ borderColor: colors.border }}>
                <View style={userTableColumns[0].style}>
                  <View className="flex-row items-center gap-1.5">
                    {isOnlineUser(user) && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                    )}
                    <Text numberOfLines={1} className="font-medium" style={{ color: colors.text }}>{user.name}</Text>
                  </View>
                  <Text numberOfLines={1} className="mt-1 text-xs" style={{ color: colors.muted }}>{user.email}</Text>
                  <Text numberOfLines={1} className="mt-1 text-xs" style={{ color: colors.muted }}>User ID: {user.referralCode || '-'}</Text>
                  <Text numberOfLines={1} className="mt-1 text-xs" style={{ color: isOnlineUser(user) ? colors.success : colors.muted }}>{lastLogoutLabel(user)}</Text>
                </View>
                <View style={userTableColumns[1].style}>
                  {user.assignedAgent ? (
                    <View className="self-start rounded-full px-2 py-0.5 border" style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }}>
                      <Text className="text-[11px] font-medium" style={{ color: colors.primary }} numberOfLines={1}>
                        {user.assignedAgent.name}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-[11px]" style={{ color: colors.muted }}>-</Text>
                  )}
                </View>
                <View style={userTableColumns[2].style}>
                  <Text numberOfLines={1} className="self-start rounded-full px-3 py-1 text-xs font-medium capitalize" style={statusBadge}>{statusBadge.label}</Text>
                </View>
                <Text numberOfLines={1} style={[userTableColumns[3].style, { color: walletColor }]} className="text-sm font-medium">${money(walletTotal)}</Text>
                <Text numberOfLines={2} style={[userTableColumns[4].style, { color: colors.muted }]} className="text-sm">{dateTime(sortBy === 'logged_in' ? user.lastLoginAt : user.createdAt)}</Text>
                <View style={userTableColumns[5].style} className="flex-row gap-2">
                  <Pressable disabled={blocked} onPress={() => viewUser(user)} className={`rounded-2xl border p-2 ${blocked ? 'opacity-40' : ''}`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                    <Eye size={16} color={colors.text} />
                  </Pressable>
                  <Pressable disabled={blocked} onPress={() => editUser(user)} className={`rounded-2xl border p-2 ${blocked ? 'opacity-40' : ''}`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                    <Edit3 size={16} color="#17B8B2" />
                  </Pressable>
                  <Pressable
                    disabled={blocked}
                    onPress={() => ask(`Remove ${user.name}? This will delete the user account and related wallet records.`, () => onRemove(user))}
                    className={`rounded-2xl border border-danger/60 bg-danger/10 p-2 ${blocked ? 'opacity-40' : ''}`}
                  >
                    <Trash2 size={16} color="#f24d58" />
                  </Pressable>
                </View>
              </View>
            );
          })}
          {!filteredUsers.length ? <Text className="p-8 text-center" style={{ color: colors.muted }}>{sortBy === 'logged_in' ? 'No logged-in users found.' : 'No users found.'}</Text> : null}
        </ScrollView>
        )}
      </View>
      <Modal visible={mobile && Boolean(mobileActionUser)} transparent animationType="fade" onRequestClose={() => setMobileActionUser(null)}>
        <Pressable className="flex-1 justify-end bg-black/45" onPress={() => setMobileActionUser(null)}>
          <Pressable className="rounded-t-2xl border-t p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }} onPress={(event) => event.stopPropagation?.()}>
            <View className="mb-4 flex-row items-center justify-between">
              <View className="min-w-0 flex-1 pr-3">
                <Text className="text-[10px] font-medium uppercase" style={{ color: colors.muted }}>User Actions</Text>
                <Text className="mt-1 text-lg font-medium" numberOfLines={1} style={{ color: colors.text }}>{mobileActionUser?.name || mobileActionUser?.email}</Text>
                <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: colors.muted }}>{mobileActionUser?.email || '-'}</Text>
              </View>
              <Pressable onPress={() => setMobileActionUser(null)} className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}>
                <X size={17} color={colors.muted} />
              </Pressable>
            </View>
            <View className="gap-2">
              <Pressable disabled={mobileActionBlocked} onPress={() => { const user = mobileActionUser; setMobileActionUser(null); viewUser(user); }} className={`h-12 flex-row items-center rounded-xl border px-4 ${mobileActionBlocked ? 'opacity-40' : ''}`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <Eye size={17} color={colors.text} />
                <Text className="ml-3 text-sm font-medium" style={{ color: colors.text }}>View profile</Text>
              </Pressable>
              <Pressable disabled={mobileActionBlocked} onPress={() => { const user = mobileActionUser; setMobileActionUser(null); editUser(user); }} className={`h-12 flex-row items-center rounded-xl border px-4 ${mobileActionBlocked ? 'opacity-40' : ''}`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <Edit3 size={17} color={colors.primary} />
                <Text className="ml-3 text-sm font-medium" style={{ color: colors.text }}>Edit user</Text>
              </Pressable>
              <Pressable
                disabled={mobileActionBlocked}
                onPress={() => {
                  const user = mobileActionUser;
                  setMobileActionUser(null);
                  ask(`Remove ${user.name}? This will delete the user account and related wallet records.`, () => onRemove(user));
                }}
                className={`h-12 flex-row items-center rounded-xl border border-danger/60 bg-danger/10 px-4 ${mobileActionBlocked ? 'opacity-40' : ''}`}
              >
                <Trash2 size={17} color={colors.danger} />
                <Text className="ml-3 text-sm font-medium" style={{ color: colors.danger }}>Delete user</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {profileUser ? <ProfileModal user={profileUser} onClose={() => setProfileUser(null)} onEdit={editUser} /> : null}
      {formState ? (
        <UserFormModal
          key={formState.key || formState.user?.id || 'user-form'}
          mode={formState.mode}
          user={formState.user}
          saving={loading || busyId === formState.user?.id}
          onClose={closeForm}
          onSubmit={submitForm}
        />
      ) : null}
    </View>
  );
}
