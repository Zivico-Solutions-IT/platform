import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { 
  Platform, 
  Pressable, 
  ScrollView, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList,
  KeyboardAvoidingView,
  Animated,
  ActivityIndicator,
  Image
} from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import NovaLogo from '../src/components/brand/NovaLogo';
import { Eye, EyeOff, ChevronDown, Search, X, CheckCircle2 } from 'lucide-react-native';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default function RegisterScreen() {
  const { register } = useAuth();
  const params = useLocalSearchParams();
  
  // Entrance Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    accountType: 'Demo',
    referralCode: '',
    referralInviteCode: String(params.invite || params.ref || ''),
    country: '',
    agree: false
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive Focus State
  const [focusedInput, setFocusedInput] = useState('');

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  // Theme Constants
  const linkColor = '#026331';
  const labelStyle = { color: '#4e6b5a', fontSize: 11.5, fontWeight: '600', letterSpacing: 0.2 };

  // Trigger entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const styleId = 'register-input-theme-overrides';
    const style = document.getElementById(styleId) || document.createElement('style');
    style.id = styleId;
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
      input::placeholder {
        color: #9ab5a5 !important;
        opacity: 1 !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
    return () => { if (style.parentNode) document.head.removeChild(style); };
  }, []);

  const countries = [
    { code: 'AF', name: 'Afghanistan', dialCode: '+93' }, { code: 'AL', name: 'Albania', dialCode: '+355' },
    { code: 'DZ', name: 'Algeria', dialCode: '+213' }, { code: 'AS', name: 'American Samoa', dialCode: '+1684' },
    { code: 'AD', name: 'Andorra', dialCode: '+376' }, { code: 'AO', name: 'Angola', dialCode: '+244' },
    { code: 'AI', name: 'Anguilla', dialCode: '+1264' }, { code: 'AG', name: 'Antigua and Barbuda', dialCode: '+1268' },
    { code: 'AR', name: 'Argentina', dialCode: '+54' }, { code: 'AM', name: 'Armenia', dialCode: '+374' },
    { code: 'AW', name: 'Aruba', dialCode: '+297' }, { code: 'AU', name: 'Australia', dialCode: '+61' },
    { code: 'AT', name: 'Austria', dialCode: '+43' }, { code: 'AZ', name: 'Azerbaijan', dialCode: '+994' },
    { code: 'BS', name: 'Bahamas', dialCode: '+1242' }, { code: 'BH', name: 'Bahrain', dialCode: '+973' },
    { code: 'BD', name: 'Bangladesh', dialCode: '+880' }, { code: 'BB', name: 'Barbados', dialCode: '+1246' },
    { code: 'BY', name: 'Belarus', dialCode: '+375' }, { code: 'BE', name: 'Belgium', dialCode: '+32' },
    { code: 'BZ', name: 'Belize', dialCode: '+501' }, { code: 'BJ', name: 'Benin', dialCode: '+229' },
    { code: 'BM', name: 'Bermuda', dialCode: '+1441' }, { code: 'BT', name: 'Bhutan', dialCode: '+975' },
    { code: 'BO', name: 'Bolivia', dialCode: '+591' }, { code: 'BA', name: 'Bosnia and Herzegovina', dialCode: '+387' },
    { code: 'BW', name: 'Botswana', dialCode: '+267' }, { code: 'BR', name: 'Brazil', dialCode: '+55' },
    { code: 'IO', name: 'British Indian Ocean Territory', dialCode: '+246' }, { code: 'VG', name: 'British Virgin Islands', dialCode: '+1284' },
    { code: 'BN', name: 'Brunei', dialCode: '+673' }, { code: 'BG', name: 'Bulgaria', dialCode: '+359' },
    { code: 'BF', name: 'Burkina Faso', dialCode: '+226' }, { code: 'BI', name: 'Burundi', dialCode: '+257' },
    { code: 'KH', name: 'Cambodia', dialCode: '+855' }, { code: 'CM', name: 'Cameroon', dialCode: '+237' },
    { code: 'CA', name: 'Canada', dialCode: '+1' }, { code: 'CV', name: 'Cape Verde', dialCode: '+238' },
    { code: 'KY', name: 'Cayman Islands', dialCode: '+1345' }, { code: 'CF', name: 'Central African Republic', dialCode: '+236' },
    { code: 'TD', name: 'Chad', dialCode: '+235' }, { code: 'CL', name: 'Chile', dialCode: '+56' },
    { code: 'CN', name: 'China', dialCode: '+86' }, { code: 'CX', name: 'Christmas Island', dialCode: '+61' },
    { code: 'CC', name: 'Cocos Islands', dialCode: '+61' }, { code: 'CO', name: 'Colombia', dialCode: '+57' },
    { code: 'KM', name: 'Comoros', dialCode: '+269' }, { code: 'CK', name: 'Cook Islands', dialCode: '+682' },
    { code: 'CR', name: 'Costa Rica', dialCode: '+506' }, { code: 'HR', name: 'Croatia', dialCode: '+385' },
    { code: 'CU', name: 'Cuba', dialCode: '+53' }, { code: 'CW', name: 'Curacao', dialCode: '+599' },
    { code: 'CY', name: 'Cyprus', dialCode: '+357' }, { code: 'CZ', name: 'Czech Republic', dialCode: '+420' },
    { code: 'CD', name: 'Democratic Republic of the Congo', dialCode: '+243' }, { code: 'DK', name: 'Denmark', dialCode: '+45' },
    { code: 'DJ', name: 'Djibouti', dialCode: '+253' }, { code: 'DM', name: 'Dominica', dialCode: '+1767' },
    { code: 'DO', name: 'Dominican Republic', dialCode: '+1849' }, { code: 'EC', name: 'Ecuador', dialCode: '+593' },
    { code: 'EG', name: 'Egypt', dialCode: '+20' }, { code: 'SV', name: 'El Salvador', dialCode: '+503' },
    { code: 'GQ', name: 'Equatorial Guinea', dialCode: '+240' }, { code: 'ER', name: 'Eritrea', dialCode: '+291' },
    { code: 'EE', name: 'Estonia', dialCode: '+372' }, { code: 'ET', name: 'Ethiopia', dialCode: '+251' },
    { code: 'FK', name: 'Falkland Islands', dialCode: '+500' }, { code: 'FO', name: 'Faroe Islands', dialCode: '+298' },
    { code: 'FJ', name: 'Fiji', dialCode: '+679' }, { code: 'FI', name: 'Finland', dialCode: '+358' },
    { code: 'FR', name: 'France', dialCode: '+33' }, { code: 'PF', name: 'French Polynesia', dialCode: '+689' },
    { code: 'GA', name: 'Gabon', dialCode: '+241' }, { code: 'GM', name: 'Gambia', dialCode: '+220' },
    { code: 'GE', name: 'Georgia', dialCode: '+995' }, { code: 'DE', name: 'Germany', dialCode: '+49' },
    { code: 'GH', name: 'Ghana', dialCode: '+233' }, { code: 'GI', name: 'Gibraltar', dialCode: '+350' },
    { code: 'GR', name: 'Greece', dialCode: '+30' }, { code: 'GL', name: 'Greenland', dialCode: '+299' },
    { code: 'GD', name: 'Grenada', dialCode: '+1473' }, { code: 'GU', name: 'Guam', dialCode: '+1671' },
    { code: 'GT', name: 'Guatemala', dialCode: '+502' }, { code: 'GG', name: 'Guernsey', dialCode: '+44' },
    { code: 'GN', name: 'Guinea', dialCode: '+224' }, { code: 'GW', name: 'Guinea-Bissau', dialCode: '+245' },
    { code: 'GY', name: 'Guyana', dialCode: '+592' }, { code: 'HT', name: 'Haiti', dialCode: '+509' },
    { code: 'HN', name: 'Honduras', dialCode: '+504' }, { code: 'HK', name: 'Hong Kong', dialCode: '+852' },
    { code: 'HU', name: 'Hungary', dialCode: '+36' }, { code: 'IS', name: 'Iceland', dialCode: '+354' },
    { code: 'IN', name: 'India', dialCode: '+91' }, { code: 'ID', name: 'Indonesia', dialCode: '+62' },
    { code: 'IR', name: 'Iran', dialCode: '+98' }, { code: 'IQ', name: 'Iraq', dialCode: '+964' },
    { code: 'IE', name: 'Ireland', dialCode: '+353' }, { code: 'IM', name: 'Isle of Man', dialCode: '+44' },
    { code: 'IL', name: 'Israel', dialCode: '+972' }, { code: 'IT', name: 'Italy', dialCode: '+39' },
    { code: 'CI', name: 'Ivory Coast', dialCode: '+225' }, { code: 'JM', name: 'Jamaica', dialCode: '+1876' },
    { code: 'JP', name: 'Japan', dialCode: '+81' }, { code: 'JE', name: 'Jersey', dialCode: '+44' },
    { code: 'JO', name: 'Jordan', dialCode: '+962' }, { code: 'KZ', name: 'Kazakhstan', dialCode: '+7' },
    { code: 'KE', name: 'Kenya', dialCode: '+254' }, { code: 'KI', name: 'Kiribati', dialCode: '+686' },
    { code: 'XK', name: 'Kosovo', dialCode: '+383' }, { code: 'KW', name: 'Kuwait', dialCode: '+965' },
    { code: 'KG', name: 'Kyrgyzstan', dialCode: '+996' }, { code: 'LA', name: 'Laos', dialCode: '+856' },
    { code: 'LV', name: 'Latvia', dialCode: '+371' }, { code: 'LB', name: 'Lebanon', dialCode: '+961' },
    { code: 'LS', name: 'Lesotho', dialCode: '+266' }, { code: 'LR', name: 'Liberia', dialCode: '+231' },
    { code: 'LY', name: 'Libya', dialCode: '+218' }, { code: 'LI', name: 'Liechtenstein', dialCode: '+423' },
    { code: 'LT', name: 'Lithuania', dialCode: '+370' }, { code: 'LU', name: 'Luxembourg', dialCode: '+352' },
    { code: 'MO', name: 'Macau', dialCode: '+853' }, { code: 'MK', name: 'Macedonia', dialCode: '+389' },
    { code: 'MG', name: 'Madagascar', dialCode: '+261' }, { code: 'MW', name: 'Malawi', dialCode: '+265' },
    { code: 'MY', name: 'Malaysia', dialCode: '+60' }, { code: 'MV', name: 'Maldives', dialCode: '+960' },
    { code: 'ML', name: 'Mali', dialCode: '+223' }, { code: 'MT', name: 'Malta', dialCode: '+356' },
    { code: 'MH', name: 'Marshall Islands', dialCode: '+692' }, { code: 'MR', name: 'Mauritania', dialCode: '+222' },
    { code: 'MU', name: 'Mauritius', dialCode: '+230' }, { code: 'YT', name: 'Mayotte', dialCode: '+262' },
    { code: 'MX', name: 'Mexico', dialCode: '+52' }, { code: 'FM', name: 'Micronesia', dialCode: '+691' },
    { code: 'MD', name: 'Moldova', dialCode: '+373' }, { code: 'MC', name: 'Monaco', dialCode: '+377' },
    { code: 'MN', name: 'Mongolia', dialCode: '+976' }, { code: 'ME', name: 'Montenegro', dialCode: '+382' },
    { code: 'MS', name: 'Montserrat', dialCode: '+1664' }, { code: 'MA', name: 'Morocco', dialCode: '+212' },
    { code: 'MZ', name: 'Mozambique', dialCode: '+258' }, { code: 'MM', name: 'Myanmar', dialCode: '+95' },
    { code: 'NA', name: 'Namibia', dialCode: '+264' }, { code: 'NR', name: 'Nauru', dialCode: '+674' },
    { code: 'NP', name: 'Nepal', dialCode: '+977' }, { code: 'NL', name: 'Netherlands', dialCode: '+31' },
    { code: 'NC', name: 'New Caledonia', dialCode: '+687' }, { code: 'NZ', name: 'New Zealand', dialCode: '+64' },
    { code: 'NI', name: 'Nicaragua', dialCode: '+505' }, { code: 'NE', name: 'Niger', dialCode: '+227' },
    { code: 'NG', name: 'Nigeria', dialCode: '+234' }, { code: 'NU', name: 'Niue', dialCode: '+683' },
    { code: 'NF', name: 'Norfolk Island', dialCode: '+672' }, { code: 'KP', name: 'North Korea', dialCode: '+850' },
    { code: 'MP', name: 'Northern Mariana Islands', dialCode: '+1670' }, { code: 'NO', name: 'Norway', dialCode: '+47' },
    { code: 'OM', name: 'Oman', dialCode: '+968' }, { code: 'PK', name: 'Pakistan', dialCode: '+92' },
    { code: 'PW', name: 'Palau', dialCode: '+680' }, { code: 'PS', name: 'Palestine', dialCode: '+970' },
    { code: 'PA', name: 'Panama', dialCode: '+507' }, { code: 'PG', name: 'Papua New Guinea', dialCode: '+675' },
    { code: 'PY', name: 'Paraguay', dialCode: '+595' }, { code: 'PE', name: 'Peru', dialCode: '+51' },
    { code: 'PH', name: 'Philippines', dialCode: '+63' }, { code: 'PN', name: 'Pitcairn', dialCode: '+64' },
    { code: 'PL', name: 'Poland', dialCode: '+48' }, { code: 'PT', name: 'Portugal', dialCode: '+351' },
    { code: 'PR', name: 'Puerto Rico', dialCode: '+1939' }, { code: 'QA', name: 'Qatar', dialCode: '+974' },
    { code: 'CG', name: 'Republic of the Congo', dialCode: '+242' }, { code: 'RE', name: 'Reunion', dialCode: '+262' },
    { code: 'RO', name: 'Romania', dialCode: '+40' }, { code: 'RU', name: 'Russia', dialCode: '+7' },
    { code: 'RW', name: 'Rwanda', dialCode: '+250' }, { code: 'BL', name: 'Saint Barthelemy', dialCode: '+590' },
    { code: 'SH', name: 'Saint Helena', dialCode: '+290' }, { code: 'KN', name: 'Saint Kitts and Nevis', dialCode: '+1869' },
    { code: 'LC', name: 'Saint Lucia', dialCode: '+1758' }, { code: 'MF', name: 'Saint Martin', dialCode: '+590' },
    { code: 'PM', name: 'Saint Pierre and Miquelon', dialCode: '+508' }, { code: 'VC', name: 'Saint Vincent and the Grenadines', dialCode: '+1784' },
    { code: 'WS', name: 'Samoa', dialCode: '+685' }, { code: 'SM', name: 'San Marino', dialCode: '+378' },
    { code: 'ST', name: 'Sao Tome and Principe', dialCode: '+239' }, { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
    { code: 'SN', name: 'Senegal', dialCode: '+221' }, { code: 'RS', name: 'Serbia', dialCode: '+381' },
    { code: 'SC', name: 'Seychelles', dialCode: '+248' }, { code: 'SL', name: 'Sierra Leone', dialCode: '+232' },
    { code: 'SG', name: 'Singapore', dialCode: '+65' }, { code: 'SX', name: 'Sint Maarten', dialCode: '+1721' },
    { code: 'SK', name: 'Slovakia', dialCode: '+421' }, { code: 'SI', name: 'Slovenia', dialCode: '+386' },
    { code: 'SB', name: 'Solomon Islands', dialCode: '+677' }, { code: 'SO', name: 'Somalia', dialCode: '+252' },
    { code: 'ZA', name: 'South Africa', dialCode: '+27' }, { code: 'KR', name: 'South Korea', dialCode: '+82' },
    { code: 'SS', name: 'South Sudan', dialCode: '+211' }, { code: 'ES', name: 'Spain', dialCode: '+34' },
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94' }, { code: 'SD', name: 'Sudan', dialCode: '+249' },
    { code: 'SR', name: 'Suriname', dialCode: '+597' }, { code: 'SJ', name: 'Svalbard and Jan Mayen', dialCode: '+47' },
    { code: 'SZ', name: 'Swaziland', dialCode: '+268' }, { code: 'SE', name: 'Sweden', dialCode: '+46' },
    { code: 'CH', name: 'Switzerland', dialCode: '+41' }, { code: 'SY', name: 'Syria', dialCode: '+963' },
    { code: 'TW', name: 'Taiwan', dialCode: '+886' }, { code: 'TJ', name: 'Tajikistan', dialCode: '+992' },
    { code: 'TZ', name: 'Tanzania', dialCode: '+255' }, { code: 'TH', name: 'Thailand', dialCode: '+66' },
    { code: 'TL', name: 'Timor-Leste', dialCode: '+670' }, { code: 'TG', name: 'Togo', dialCode: '+228' },
    { code: 'TK', name: 'Tokelau', dialCode: '+690' }, { code: 'TO', name: 'Tonga', dialCode: '+676' },
    { code: 'TT', name: 'Trinidad and Tobago', dialCode: '+1868' }, { code: 'TN', name: 'Tunisia', dialCode: '+216' },
    { code: 'TR', name: 'Turkey', dialCode: '+90' }, { code: 'TM', name: 'Turkmenistan', dialCode: '+993' },
    { code: 'TC', name: 'Turks and Caicos Islands', dialCode: '+1649' }, { code: 'TV', name: 'Tuvalu', dialCode: '+688' },
    { code: 'VI', name: 'U.S. Virgin Islands', dialCode: '+1340' }, { code: 'UG', name: 'Uganda', dialCode: '+256' },
    { code: 'UA', name: 'Ukraine', dialCode: '+380' }, { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44' }, { code: 'US', name: 'United States', dialCode: '+1' },
    { code: 'UY', name: 'Uruguay', dialCode: '+598' }, { code: 'UZ', name: 'Uzbekistan', dialCode: '+998' },
    { code: 'VU', name: 'Vanuatu', dialCode: '+678' }, { code: 'VA', name: 'Vatican', dialCode: '+379' },
    { code: 'VE', name: 'Venezuela', dialCode: '+58' }, { code: 'VN', name: 'Vietnam', dialCode: '+84' },
    { code: 'WF', name: 'Wallis and Futuna', dialCode: '+681' }, { code: 'YE', name: 'Yemen', dialCode: '+967' },
    { code: 'ZM', name: 'Zambia', dialCode: '+260' }, { code: 'ZW', name: 'Zimbabwe', dialCode: '+263' },
  ];

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return countries;
    return countries.filter(country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      country.dialCode.includes(searchQuery)
    );
  }, [searchQuery]);

  const findCountryByDialCode = (phone, currentCountry) => {
    const compactPhone = String(phone || '').replace(/[^\d+]/g, '');
    if (!compactPhone.startsWith('+')) return null;

    const matchedCountries = countries
      .filter((country) => compactPhone.startsWith(country.dialCode))
      .sort((a, b) => b.dialCode.length - a.dialCode.length);

    if (currentCountry && matchedCountries.some((country) => country.code === currentCountry.code)) {
      return currentCountry;
    }

    return matchedCountries[0] || null;
  };

  const formatPhoneForCountry = (phone, country) => {
    const trimmedPhone = String(phone || '').trimStart().replace(/\s+/g, ' ');
    if (!country || !trimmedPhone.startsWith(country.dialCode)) return trimmedPhone;

    const localNumber = trimmedPhone.slice(country.dialCode.length).trimStart();
    return localNumber ? `${country.dialCode} ${localNumber}` : `${country.dialCode} `;
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setForm(current => ({
      ...current,
      country: country.name,
      phone: formatPhoneForCountry(country.dialCode, country)
    }));
    setDropdownOpen(false);
    setSearchQuery('');
  };

  const cleanPhoneInput = (text) => String(text || '')
    .replace(/[^\d+\s().-]/g, '')
    .replace(/(?!^)\+/g, '');

  const phoneValidationError = (phone, country) => {
    const trimmedPhone = phone.trim();
    const phoneDigits = trimmedPhone.replace(/\D/g, '');
    const phonePattern = /^\+?[\d\s().-]+$/;

    if (!trimmedPhone) return 'Phone number is required.';
    if (!country) return 'Select your country code before entering a phone number.';
    if (!phonePattern.test(trimmedPhone)) return 'Enter a valid phone number.';
    if (phoneDigits.length < 7 || phoneDigits.length > 15) return 'Enter a valid phone number.';

    const countryCodeDigits = country.dialCode.replace(/\D/g, '');
    if (phoneDigits === countryCodeDigits) {
      return 'Enter your full phone number.';
    }

    let parsedPhone;
    try {
      parsedPhone = parsePhoneNumberFromString(trimmedPhone, country.code);
    } catch {
      parsedPhone = null;
    }

    if (!parsedPhone?.isValid()) {
      return `Enter a valid ${country.name} phone number.`;
    }

    if (parsedPhone.country && parsedPhone.country !== country.code) {
      return `Enter a valid ${country.name} phone number.`;
    }

    return '';
  };

  const handlePhoneChange = (text) => {
    const cleanedPhone = cleanPhoneInput(text);
    const matchedCountry = findCountryByDialCode(cleanedPhone, selectedCountry);
    const phone = formatPhoneForCountry(cleanedPhone, matchedCountry);

    setSelectedCountry(matchedCountry);
    setForm(current => ({
      ...current,
      phone,
      country: matchedCountry ? matchedCountry.name : ''
    }));
  };

  const getDynamicInputStyle = (id) => ({
    backgroundColor: '#ffffff',
    borderColor: focusedInput === id ? linkColor : 'rgba(1, 69, 33, 0.15)',
    borderWidth: focusedInput === id ? 1.5 : 1.5,
    color: '#012b15',
    outlineStyle: 'none',
  });

  const submit = async () => {
    const trimmedFirstName = form.name.split(' ')[0]?.trim() || '';
    const trimmedLastName = form.name.split(' ').slice(1).join(' ').trim();
    const trimmedEmail = form.email.trim();
    const trimmedCountry = form.country.trim();
    const trimmedPhone = form.phone.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneError = phoneValidationError(trimmedPhone, selectedCountry);

    if (!trimmedFirstName) return setError('First name is required.');
    if (!trimmedLastName) return setError('Last name is required.');
    if (!trimmedEmail) return setError('Email is required.');
    if (!emailPattern.test(trimmedEmail)) return setError('Enter a valid email address.');
    if (!trimmedCountry) return setError('Country code selection is required via phone input.');
    if (phoneError) return setError(phoneError);
    if (!form.agree) return setError('You must agree to the Terms of service and Privacy policies.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    setError('');

    try {
      await register({
        ...form,
        name: `${trimmedFirstName} ${trimmedLastName}`,
        email: trimmedEmail,
        country: trimmedCountry,
        phone: trimmedPhone,
      });
      router.replace('/trading');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
        || (requestError.code === 'ECONNABORTED'
          ? 'Registration is taking longer than expected. Please try again in a moment.'
          : 'Registration failed. Please check your connection and try again.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const password = form.password;

  const requirements = [
    { label: 'Minimum 8 characters', met: password.length >= 8 },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One special char', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const firstName = form.name.split(' ')[0] || '';
  const lastName = form.name.split(' ').slice(1).join(' ') || '';

  const handleFirstNameChange = (text) => setForm({ ...form, name: text + (lastName ? ' ' + lastName : '') });
  const handleLastNameChange = (text) => setForm({ ...form, name: firstName + (text ? ' ' + text : '') });

  const TopControls = () => (
    <View style={{ position: 'absolute', top: Platform.OS === 'web' ? 22 : 60, right: 24, zIndex: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderColor: 'rgba(1, 69, 33, 0.15)', borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, gap: 6 }}>
        <Text style={{ fontSize: 11.5, color: '#4e6b5a', fontWeight: '500' }}>EN</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#f0f5f2' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TopControls />
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={{ 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }],
            width: '100%', 
            maxWidth: 460 
          }}
        >
          <View 
            className="relative rounded-[20px] px-8 py-9 z-10 bg-white" 
            style={{ 
              borderColor: 'rgba(1, 69, 33, 0.08)', 
              borderWidth: 1,
              shadowColor: '#014521',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 10
            }}
          >

            {/* Logo */}
            <View className="mb-[32px] items-start">
              <NovaLogo dark={false} width={120} height={35} />
            </View>

            <Text className="text-[13px] mb-[32px]" style={{ color: '#4e6b5a' }}>
              Already have an account?{' '}
              <Link href="/login" asChild>
                <Text className="font-semibold" style={{ color: linkColor, textDecorationLine: 'underline' }}>Login here</Text>
              </Link>
            </Text>

            <View>
              {/* First and Last Name Row */}
              <View className="flex-row gap-[12px] mb-[12px]">
                <View className="flex-1">
                  <Text style={[labelStyle, { marginBottom: 6 }]}>First Name *</Text>
                  <View className="rounded-[9px]" style={getDynamicInputStyle('firstName')}>
                    <TextInput
                      placeholder="First Name"
                      className="w-full px-[13px] py-[11px] text-[14px]"
                      style={{ color: '#012b15' }}
                      placeholderTextColor="#9ab5a5"
                      value={firstName}
                      onChangeText={handleFirstNameChange}
                      onFocus={() => setFocusedInput('firstName')}
                      onBlur={() => setFocusedInput('')}
                    />
                  </View>
                </View>
                <View className="flex-1">
                  <Text style={[labelStyle, { marginBottom: 6 }]}>Last Name *</Text>
                  <View className="rounded-[9px]" style={getDynamicInputStyle('lastName')}>
                    <TextInput
                      placeholder="Last Name"
                      className="w-full px-[13px] py-[11px] text-[14px]"
                      style={{ color: '#012b15' }}
                      placeholderTextColor="#9ab5a5"
                      value={lastName}
                      onChangeText={handleLastNameChange}
                      onFocus={() => setFocusedInput('lastName')}
                      onBlur={() => setFocusedInput('')}
                    />
                  </View>
                </View>
              </View>

              {/* Email Field */}
              <View className="mb-[12px]">
                <Text style={[labelStyle, { marginBottom: 6 }]}>Email address *</Text>
                <View className="rounded-[9px]" style={getDynamicInputStyle('email')}>
                  <TextInput
                    className="w-full px-[13px] py-[11px] text-[14px]"
                    style={{ color: '#012b15' }}
                    placeholder="you@example.com"
                    placeholderTextColor="#9ab5a5"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={form.email}
                    onChangeText={update('email')}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput('')}
                  />
                </View>
              </View>

              {/* Referral Code Field */}
              <View className="mb-[12px]">
                <Text style={[labelStyle, { marginBottom: 6 }]}>Referral Code (if provided)</Text>
                <View className="rounded-[9px]" style={getDynamicInputStyle('referralCode')}>
                  <TextInput
                    className="w-full px-[13px] py-[11px] text-[14px]"
                    style={{ color: '#012b15' }}
                    placeholder="Enter referral code if required"
                    placeholderTextColor="#9ab5a5"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={form.referralCode}
                    onChangeText={update('referralCode')}
                    onFocus={() => setFocusedInput('referralCode')}
                    onBlur={() => setFocusedInput('')}
                  />
                </View>
              </View>

              {/* Phone with modern inline country selector */}
              <View className="mb-[12px] z-20">
                <Text style={[labelStyle, { marginBottom: 6 }]}>Phone *</Text>
                <View className="flex-row items-center rounded-[9px] relative" style={getDynamicInputStyle('phone')}>
                  
                  <TouchableOpacity
                    onPress={() => setDropdownOpen(!dropdownOpen)}
                    className="flex-row items-center justify-between px-[12px] py-[11px] border-r"
                    style={{ borderColor: 'rgba(1, 69, 33, 0.15)' }}
                  >
                    <View className="flex-row items-center mr-1">
                      {selectedCountry ? (
                        <Image
                          source={{ uri: `https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png` }}
                          style={{ width: 20, height: 15, borderRadius: 2 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ color: '#012b15', fontSize: 14 }}>🌐 Select</Text>
                      )}
                    </View>
                    <ChevronDown size={14} color="#849e8f" />
                  </TouchableOpacity>

                  <TextInput
                    keyboardType="phone-pad"
                    maxLength={20}
                    value={form.phone}
                    onChangeText={handlePhoneChange}
                    placeholder="Phone number"
                    placeholderTextColor="#9ab5a5"
                    className="flex-1 px-[13px] py-[11px] text-[14px] bg-transparent outline-none"
                    style={{ color: '#012b15' }}
                    onFocus={() => setFocusedInput('phone')}
                    onBlur={() => setFocusedInput('')}
                  />

                  {/* Absolute Country Dropdown */}
                  {dropdownOpen && (
                    <View className="absolute top-[105%] left-0 w-full border rounded-[10px] shadow-2xl z-50 overflow-hidden" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(1, 69, 33, 0.15)', maxHeight: 250 }}>
                      <View className="p-2 border-b" style={{ borderColor: 'rgba(1, 69, 33, 0.15)' }}>
                        <View className="flex-row items-center rounded-lg border px-2 bg-[#f5f9f6]" style={{ borderColor: 'rgba(1, 69, 33, 0.15)' }}>
                          <Search size={16} color="#849e8f" />
                          <TextInput
                            className="flex-1 py-2.5 px-2 text-[13px]"
                            style={{ color: '#012b15', outlineStyle: 'none' }}
                            placeholder="Search country..."
                            placeholderTextColor="#9ab5a5"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                          />
                          {searchQuery ? (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                              <X size={14} color="#849e8f" />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                      <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                        {filteredCountries.map((item) => (
                          <TouchableOpacity
                            key={item.code}
                            onPress={() => handleCountrySelect(item)}
                            className="flex-row justify-between items-center px-4 py-[12px] border-b"
                            style={{ borderColor: 'rgba(1, 69, 33, 0.08)' }}
                          >
                            <View className="flex-row items-center flex-1">
                              <Image
                                source={{ uri: `https://flagcdn.com/w40/${item.code.toLowerCase()}.png` }}
                                style={{ width: 24, height: 18, marginRight: 12, borderRadius: 2 }}
                                resizeMode="cover"
                              />
                              <Text className="text-[13.5px] font-medium" style={{ color: '#012b15' }} numberOfLines={1}>
                                {item.name}
                              </Text>
                            </View>
                            <Text className="text-[12.5px] font-semibold" style={{ color: linkColor }}>{item.dialCode}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Password Field */}
              <View className="mb-[12px] z-10">
                <Text style={[labelStyle, { marginBottom: 6 }]}>Password *</Text>
                <View className="flex-row items-center rounded-[9px]" style={getDynamicInputStyle('password')}>
                  <TextInput
                    className="flex-1 px-[13px] py-[11px] text-[14px]"
                    style={{ color: '#012b15', ...(Platform.OS === 'web' && !showPassword ? { WebkitTextSecurity: 'disc' } : {}) }}
                    placeholder="Enter password"
                    placeholderTextColor="#9ab5a5"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={form.password}
                    onChangeText={(val) => setForm((v) => ({ ...v, password: val }))}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput('')}
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
                
                {/* Password Requirements */}
                <View className="mt-[8px] flex-row flex-wrap">
                  {requirements.map((req) => (
                    <View key={req.label} className="w-1/2 flex-row items-center gap-[6px] mb-[4px]">
                      {req.met ? (
                        <CheckCircle2 size={13} color="#026331" />
                      ) : (
                        <View className="w-[12px] h-[12px] rounded-full border border-[#849e8f]" />
                      )}
                      <Text style={{ fontSize: 10.5, color: req.met ? '#014421' : '#4e6b5a', fontWeight: req.met ? '600' : '400' }}>
                        {req.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Confirm Password Field */}
              {form.password.length > 0 && (
                <View className="mb-[12px] z-10">
                  <Text style={[labelStyle, { marginBottom: 6 }]}>Confirm Password *</Text>
                  <View className="flex-row items-center rounded-[9px]" style={getDynamicInputStyle('confirmPassword')}>
                    <TextInput
                      className="flex-1 px-[13px] py-[11px] text-[14px]"
                      style={{ color: '#012b15', ...(Platform.OS === 'web' && !showConfirmPassword ? { WebkitTextSecurity: 'disc' } : {}) }}
                      placeholder="Confirm your password"
                      placeholderTextColor="#9ab5a5"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={form.confirmPassword}
                      onChangeText={(val) => setForm((v) => ({ ...v, confirmPassword: val }))}
                      onFocus={() => setFocusedInput('confirmPassword')}
                      onBlur={() => setFocusedInput('')}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((value) => !value)}
                      className="px-[13px] py-[11px]"
                      accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <Eye size={19} color="#849e8f" />
                      ) : (
                        <EyeOff size={19} color="#849e8f" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Terms Checkbox */}
              <View className="mb-[20px] flex-row items-center mt-[4px] z-10">
                <TouchableOpacity
                  onPress={() => setForm({ ...form, agree: !form.agree })}
                  className="flex-row items-center gap-[10px]"
                >
                  <View
                    className="h-[18px] w-[18px] items-center justify-center rounded-[4px] border"
                    style={{ borderColor: form.agree ? linkColor : '#9ab5a5', backgroundColor: form.agree ? linkColor : '#ffffff' }}
                  >
                    {form.agree ? (
                      <CheckCircle2 size={14} color="#fff" />
                    ) : null}
                  </View>
                  <Text className="flex-1 text-[11.5px] leading-[16px]" style={{ color: '#4e6b5a' }}>
                    I agree to the{' '}
                    <Text className="font-semibold" style={{ color: linkColor, textDecorationLine: 'underline' }}>Terms of service</Text>
                    {' '}and{' '}
                    <Text className="font-semibold" style={{ color: linkColor, textDecorationLine: 'underline' }}>Privacy policies</Text>.
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {error ? (
                <View className="mb-[16px] rounded-lg px-4 py-3" style={{ backgroundColor: '#FEF2F2' }}>
                  <Text className="text-xs font-medium text-red-600">{error}</Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                onPress={submit}
                disabled={loading}
                className="w-full flex-row justify-center items-center py-[13.5px] mt-[4px] z-10"
                style={{
                  borderRadius: 10,
                  backgroundColor: '#d4af37',
                  shadowColor: '#d4af37',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5,
                  shadowRadius: 18,
                  elevation: 6,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading && <ActivityIndicator color="#231902" size="small" style={{ marginRight: 8 }} />}
                <Text style={{ color: '#231902', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }}>
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Text>
              </TouchableOpacity>

            </View>

          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
