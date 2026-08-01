import { useState, useMemo, useEffect } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import NovaLogo from '../src/components/brand/NovaLogo';
import { Eye, EyeOff, ChevronDown, Search, X } from 'lucide-react-native';
import { useAppTheme } from '../src/context/ThemeContext';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { darkMode, colors } = useAppTheme();
  const params = useLocalSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    accountType: 'Demo',
    referralCode: String(params.ref || ''),
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

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const inputBackground = darkMode ? colors.surface : '#ffffff';
  const placeholderColor = darkMode ? colors.muted : '#9CA3AF';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const styleId = 'register-input-theme-overrides';
    const style = document.getElementById(styleId) || document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      input,
      input:hover,
      input:focus,
      input:active {
        background-color: ${inputBackground} !important;
        background-image: none !important;
        color: ${colors.text} !important;
        caret-color: ${colors.text} !important;
        color-scheme: ${darkMode ? 'dark' : 'light'};
      }
      input[type="password"]::-ms-reveal,
      input[type="password"]::-ms-clear { display: none !important; }
      input[type="password"]::-webkit-credentials-auto-fill-button,
      input[type="password"]::-webkit-contacts-auto-fill-button,
      input[type="password"]::-webkit-textfield-decoration-container {
        display: none !important; visibility: hidden !important; pointer-events: none !important;
      }
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        background-color: ${inputBackground} !important;
        background-image: none !important;
        -webkit-box-shadow: 0 0 0 1000px ${inputBackground} inset !important;
        -webkit-text-fill-color: ${colors.text} !important;
        caret-color: ${colors.text} !important;
        transition: background-color 9999s ease-out 0s;
      }
      input::placeholder,
      input:focus::placeholder {
        color: ${colors.muted} !important;
        opacity: 1 !important;
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);
  }, [colors.muted, colors.text, darkMode, inputBackground]);

  const countries = [
    { code: 'AF', name: 'Afghanistan', dialCode: '+93' },
    { code: 'AL', name: 'Albania', dialCode: '+355' },
    { code: 'DZ', name: 'Algeria', dialCode: '+213' },
    { code: 'AS', name: 'American Samoa', dialCode: '+1684' },
    { code: 'AD', name: 'Andorra', dialCode: '+376' },
    { code: 'AO', name: 'Angola', dialCode: '+244' },
    { code: 'AI', name: 'Anguilla', dialCode: '+1264' },
    { code: 'AG', name: 'Antigua and Barbuda', dialCode: '+1268' },
    { code: 'AR', name: 'Argentina', dialCode: '+54' },
    { code: 'AM', name: 'Armenia', dialCode: '+374' },
    { code: 'AW', name: 'Aruba', dialCode: '+297' },
    { code: 'AU', name: 'Australia', dialCode: '+61' },
    { code: 'AT', name: 'Austria', dialCode: '+43' },
    { code: 'AZ', name: 'Azerbaijan', dialCode: '+994' },
    { code: 'BS', name: 'Bahamas', dialCode: '+1242' },
    { code: 'BH', name: 'Bahrain', dialCode: '+973' },
    { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
    { code: 'BB', name: 'Barbados', dialCode: '+1246' },
    { code: 'BY', name: 'Belarus', dialCode: '+375' },
    { code: 'BE', name: 'Belgium', dialCode: '+32' },
    { code: 'BZ', name: 'Belize', dialCode: '+501' },
    { code: 'BJ', name: 'Benin', dialCode: '+229' },
    { code: 'BM', name: 'Bermuda', dialCode: '+1441' },
    { code: 'BT', name: 'Bhutan', dialCode: '+975' },
    { code: 'BO', name: 'Bolivia', dialCode: '+591' },
    { code: 'BA', name: 'Bosnia and Herzegovina', dialCode: '+387' },
    { code: 'BW', name: 'Botswana', dialCode: '+267' },
    { code: 'BR', name: 'Brazil', dialCode: '+55' },
    { code: 'IO', name: 'British Indian Ocean Territory', dialCode: '+246' },
    { code: 'VG', name: 'British Virgin Islands', dialCode: '+1284' },
    { code: 'BN', name: 'Brunei', dialCode: '+673' },
    { code: 'BG', name: 'Bulgaria', dialCode: '+359' },
    { code: 'BF', name: 'Burkina Faso', dialCode: '+226' },
    { code: 'BI', name: 'Burundi', dialCode: '+257' },
    { code: 'KH', name: 'Cambodia', dialCode: '+855' },
    { code: 'CM', name: 'Cameroon', dialCode: '+237' },
    { code: 'CA', name: 'Canada', dialCode: '+1' },
    { code: 'CV', name: 'Cape Verde', dialCode: '+238' },
    { code: 'KY', name: 'Cayman Islands', dialCode: '+1345' },
    { code: 'CF', name: 'Central African Republic', dialCode: '+236' },
    { code: 'TD', name: 'Chad', dialCode: '+235' },
    { code: 'CL', name: 'Chile', dialCode: '+56' },
    { code: 'CN', name: 'China', dialCode: '+86' },
    { code: 'CX', name: 'Christmas Island', dialCode: '+61' },
    { code: 'CC', name: 'Cocos Islands', dialCode: '+61' },
    { code: 'CO', name: 'Colombia', dialCode: '+57' },
    { code: 'KM', name: 'Comoros', dialCode: '+269' },
    { code: 'CK', name: 'Cook Islands', dialCode: '+682' },
    { code: 'CR', name: 'Costa Rica', dialCode: '+506' },
    { code: 'HR', name: 'Croatia', dialCode: '+385' },
    { code: 'CU', name: 'Cuba', dialCode: '+53' },
    { code: 'CW', name: 'Curacao', dialCode: '+599' },
    { code: 'CY', name: 'Cyprus', dialCode: '+357' },
    { code: 'CZ', name: 'Czech Republic', dialCode: '+420' },
    { code: 'CD', name: 'Democratic Republic of the Congo', dialCode: '+243' },
    { code: 'DK', name: 'Denmark', dialCode: '+45' },
    { code: 'DJ', name: 'Djibouti', dialCode: '+253' },
    { code: 'DM', name: 'Dominica', dialCode: '+1767' },
    { code: 'DO', name: 'Dominican Republic', dialCode: '+1849' },
    { code: 'EC', name: 'Ecuador', dialCode: '+593' },
    { code: 'EG', name: 'Egypt', dialCode: '+20' },
    { code: 'SV', name: 'El Salvador', dialCode: '+503' },
    { code: 'GQ', name: 'Equatorial Guinea', dialCode: '+240' },
    { code: 'ER', name: 'Eritrea', dialCode: '+291' },
    { code: 'EE', name: 'Estonia', dialCode: '+372' },
    { code: 'ET', name: 'Ethiopia', dialCode: '+251' },
    { code: 'FK', name: 'Falkland Islands', dialCode: '+500' },
    { code: 'FO', name: 'Faroe Islands', dialCode: '+298' },
    { code: 'FJ', name: 'Fiji', dialCode: '+679' },
    { code: 'FI', name: 'Finland', dialCode: '+358' },
    { code: 'FR', name: 'France', dialCode: '+33' },
    { code: 'PF', name: 'French Polynesia', dialCode: '+689' },
    { code: 'GA', name: 'Gabon', dialCode: '+241' },
    { code: 'GM', name: 'Gambia', dialCode: '+220' },
    { code: 'GE', name: 'Georgia', dialCode: '+995' },
    { code: 'DE', name: 'Germany', dialCode: '+49' },
    { code: 'GH', name: 'Ghana', dialCode: '+233' },
    { code: 'GI', name: 'Gibraltar', dialCode: '+350' },
    { code: 'GR', name: 'Greece', dialCode: '+30' },
    { code: 'GL', name: 'Greenland', dialCode: '+299' },
    { code: 'GD', name: 'Grenada', dialCode: '+1473' },
    { code: 'GU', name: 'Guam', dialCode: '+1671' },
    { code: 'GT', name: 'Guatemala', dialCode: '+502' },
    { code: 'GG', name: 'Guernsey', dialCode: '+44' },
    { code: 'GN', name: 'Guinea', dialCode: '+224' },
    { code: 'GW', name: 'Guinea-Bissau', dialCode: '+245' },
    { code: 'GY', name: 'Guyana', dialCode: '+592' },
    { code: 'HT', name: 'Haiti', dialCode: '+509' },
    { code: 'HN', name: 'Honduras', dialCode: '+504' },
    { code: 'HK', name: 'Hong Kong', dialCode: '+852' },
    { code: 'HU', name: 'Hungary', dialCode: '+36' },
    { code: 'IS', name: 'Iceland', dialCode: '+354' },
    { code: 'IN', name: 'India', dialCode: '+91' },
    { code: 'ID', name: 'Indonesia', dialCode: '+62' },
    { code: 'IR', name: 'Iran', dialCode: '+98' },
    { code: 'IQ', name: 'Iraq', dialCode: '+964' },
    { code: 'IE', name: 'Ireland', dialCode: '+353' },
    { code: 'IM', name: 'Isle of Man', dialCode: '+44' },
    { code: 'IL', name: 'Israel', dialCode: '+972' },
    { code: 'IT', name: 'Italy', dialCode: '+39' },
    { code: 'CI', name: 'Ivory Coast', dialCode: '+225' },
    { code: 'JM', name: 'Jamaica', dialCode: '+1876' },
    { code: 'JP', name: 'Japan', dialCode: '+81' },
    { code: 'JE', name: 'Jersey', dialCode: '+44' },
    { code: 'JO', name: 'Jordan', dialCode: '+962' },
    { code: 'KZ', name: 'Kazakhstan', dialCode: '+7' },
    { code: 'KE', name: 'Kenya', dialCode: '+254' },
    { code: 'KI', name: 'Kiribati', dialCode: '+686' },
    { code: 'XK', name: 'Kosovo', dialCode: '+383' },
    { code: 'KW', name: 'Kuwait', dialCode: '+965' },
    { code: 'KG', name: 'Kyrgyzstan', dialCode: '+996' },
    { code: 'LA', name: 'Laos', dialCode: '+856' },
    { code: 'LV', name: 'Latvia', dialCode: '+371' },
    { code: 'LB', name: 'Lebanon', dialCode: '+961' },
    { code: 'LS', name: 'Lesotho', dialCode: '+266' },
    { code: 'LR', name: 'Liberia', dialCode: '+231' },
    { code: 'LY', name: 'Libya', dialCode: '+218' },
    { code: 'LI', name: 'Liechtenstein', dialCode: '+423' },
    { code: 'LT', name: 'Lithuania', dialCode: '+370' },
    { code: 'LU', name: 'Luxembourg', dialCode: '+352' },
    { code: 'MO', name: 'Macau', dialCode: '+853' },
    { code: 'MK', name: 'Macedonia', dialCode: '+389' },
    { code: 'MG', name: 'Madagascar', dialCode: '+261' },
    { code: 'MW', name: 'Malawi', dialCode: '+265' },
    { code: 'MY', name: 'Malaysia', dialCode: '+60' },
    { code: 'MV', name: 'Maldives', dialCode: '+960' },
    { code: 'ML', name: 'Mali', dialCode: '+223' },
    { code: 'MT', name: 'Malta', dialCode: '+356' },
    { code: 'MH', name: 'Marshall Islands', dialCode: '+692' },
    { code: 'MR', name: 'Mauritania', dialCode: '+222' },
    { code: 'MU', name: 'Mauritius', dialCode: '+230' },
    { code: 'YT', name: 'Mayotte', dialCode: '+262' },
    { code: 'MX', name: 'Mexico', dialCode: '+52' },
    { code: 'FM', name: 'Micronesia', dialCode: '+691' },
    { code: 'MD', name: 'Moldova', dialCode: '+373' },
    { code: 'MC', name: 'Monaco', dialCode: '+377' },
    { code: 'MN', name: 'Mongolia', dialCode: '+976' },
    { code: 'ME', name: 'Montenegro', dialCode: '+382' },
    { code: 'MS', name: 'Montserrat', dialCode: '+1664' },
    { code: 'MA', name: 'Morocco', dialCode: '+212' },
    { code: 'MZ', name: 'Mozambique', dialCode: '+258' },
    { code: 'MM', name: 'Myanmar', dialCode: '+95' },
    { code: 'NA', name: 'Namibia', dialCode: '+264' },
    { code: 'NR', name: 'Nauru', dialCode: '+674' },
    { code: 'NP', name: 'Nepal', dialCode: '+977' },
    { code: 'NL', name: 'Netherlands', dialCode: '+31' },
    { code: 'NC', name: 'New Caledonia', dialCode: '+687' },
    { code: 'NZ', name: 'New Zealand', dialCode: '+64' },
    { code: 'NI', name: 'Nicaragua', dialCode: '+505' },
    { code: 'NE', name: 'Niger', dialCode: '+227' },
    { code: 'NG', name: 'Nigeria', dialCode: '+234' },
    { code: 'NU', name: 'Niue', dialCode: '+683' },
    { code: 'NF', name: 'Norfolk Island', dialCode: '+672' },
    { code: 'KP', name: 'North Korea', dialCode: '+850' },
    { code: 'MP', name: 'Northern Mariana Islands', dialCode: '+1670' },
    { code: 'NO', name: 'Norway', dialCode: '+47' },
    { code: 'OM', name: 'Oman', dialCode: '+968' },
    { code: 'PK', name: 'Pakistan', dialCode: '+92' },
    { code: 'PW', name: 'Palau', dialCode: '+680' },
    { code: 'PS', name: 'Palestine', dialCode: '+970' },
    { code: 'PA', name: 'Panama', dialCode: '+507' },
    { code: 'PG', name: 'Papua New Guinea', dialCode: '+675' },
    { code: 'PY', name: 'Paraguay', dialCode: '+595' },
    { code: 'PE', name: 'Peru', dialCode: '+51' },
    { code: 'PH', name: 'Philippines', dialCode: '+63' },
    { code: 'PN', name: 'Pitcairn', dialCode: '+64' },
    { code: 'PL', name: 'Poland', dialCode: '+48' },
    { code: 'PT', name: 'Portugal', dialCode: '+351' },
    { code: 'PR', name: 'Puerto Rico', dialCode: '+1939' },
    { code: 'QA', name: 'Qatar', dialCode: '+974' },
    { code: 'CG', name: 'Republic of the Congo', dialCode: '+242' },
    { code: 'RE', name: 'Reunion', dialCode: '+262' },
    { code: 'RO', name: 'Romania', dialCode: '+40' },
    { code: 'RU', name: 'Russia', dialCode: '+7' },
    { code: 'RW', name: 'Rwanda', dialCode: '+250' },
    { code: 'BL', name: 'Saint Barthelemy', dialCode: '+590' },
    { code: 'SH', name: 'Saint Helena', dialCode: '+290' },
    { code: 'KN', name: 'Saint Kitts and Nevis', dialCode: '+1869' },
    { code: 'LC', name: 'Saint Lucia', dialCode: '+1758' },
    { code: 'MF', name: 'Saint Martin', dialCode: '+590' },
    { code: 'PM', name: 'Saint Pierre and Miquelon', dialCode: '+508' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines', dialCode: '+1784' },
    { code: 'WS', name: 'Samoa', dialCode: '+685' },
    { code: 'SM', name: 'San Marino', dialCode: '+378' },
    { code: 'ST', name: 'Sao Tome and Principe', dialCode: '+239' },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
    { code: 'SN', name: 'Senegal', dialCode: '+221' },
    { code: 'RS', name: 'Serbia', dialCode: '+381' },
    { code: 'SC', name: 'Seychelles', dialCode: '+248' },
    { code: 'SL', name: 'Sierra Leone', dialCode: '+232' },
    { code: 'SG', name: 'Singapore', dialCode: '+65' },
    { code: 'SX', name: 'Sint Maarten', dialCode: '+1721' },
    { code: 'SK', name: 'Slovakia', dialCode: '+421' },
    { code: 'SI', name: 'Slovenia', dialCode: '+386' },
    { code: 'SB', name: 'Solomon Islands', dialCode: '+677' },
    { code: 'SO', name: 'Somalia', dialCode: '+252' },
    { code: 'ZA', name: 'South Africa', dialCode: '+27' },
    { code: 'KR', name: 'South Korea', dialCode: '+82' },
    { code: 'SS', name: 'South Sudan', dialCode: '+211' },
    { code: 'ES', name: 'Spain', dialCode: '+34' },
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94' },
    { code: 'SD', name: 'Sudan', dialCode: '+249' },
    { code: 'SR', name: 'Suriname', dialCode: '+597' },
    { code: 'SJ', name: 'Svalbard and Jan Mayen', dialCode: '+47' },
    { code: 'SZ', name: 'Swaziland', dialCode: '+268' },
    { code: 'SE', name: 'Sweden', dialCode: '+46' },
    { code: 'CH', name: 'Switzerland', dialCode: '+41' },
    { code: 'SY', name: 'Syria', dialCode: '+963' },
    { code: 'TW', name: 'Taiwan', dialCode: '+886' },
    { code: 'TJ', name: 'Tajikistan', dialCode: '+992' },
    { code: 'TZ', name: 'Tanzania', dialCode: '+255' },
    { code: 'TH', name: 'Thailand', dialCode: '+66' },
    { code: 'TL', name: 'Timor-Leste', dialCode: '+670' },
    { code: 'TG', name: 'Togo', dialCode: '+228' },
    { code: 'TK', name: 'Tokelau', dialCode: '+690' },
    { code: 'TO', name: 'Tonga', dialCode: '+676' },
    { code: 'TT', name: 'Trinidad and Tobago', dialCode: '+1868' },
    { code: 'TN', name: 'Tunisia', dialCode: '+216' },
    { code: 'TR', name: 'Turkey', dialCode: '+90' },
    { code: 'TM', name: 'Turkmenistan', dialCode: '+993' },
    { code: 'TC', name: 'Turks and Caicos Islands', dialCode: '+1649' },
    { code: 'TV', name: 'Tuvalu', dialCode: '+688' },
    { code: 'VI', name: 'U.S. Virgin Islands', dialCode: '+1340' },
    { code: 'UG', name: 'Uganda', dialCode: '+256' },
    { code: 'UA', name: 'Ukraine', dialCode: '+380' },
    { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
    { code: 'US', name: 'United States', dialCode: '+1' },
    { code: 'UY', name: 'Uruguay', dialCode: '+598' },
    { code: 'UZ', name: 'Uzbekistan', dialCode: '+998' },
    { code: 'VU', name: 'Vanuatu', dialCode: '+678' },
    { code: 'VA', name: 'Vatican', dialCode: '+379' },
    { code: 'VE', name: 'Venezuela', dialCode: '+58' },
    { code: 'VN', name: 'Vietnam', dialCode: '+84' },
    { code: 'WF', name: 'Wallis and Futuna', dialCode: '+681' },
    { code: 'YE', name: 'Yemen', dialCode: '+967' },
    { code: 'ZM', name: 'Zambia', dialCode: '+260' },
    { code: 'ZW', name: 'Zimbabwe', dialCode: '+263' },
  ];

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return countries;
    return countries.filter(country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase())
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
    if (!country) return 'Select your country before entering a phone number.';
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

  const inputStyle = {
    backgroundColor: inputBackground,
    borderColor: colors.border,
    color: colors.text,
    caretColor: colors.text,
    outlineStyle: 'none',
  };
  const labelStyle = { color: colors.muted };
  const linkColor = darkMode ? colors.primary : '#00674F';

  const submit = async () => {
  const trimmedFirstName = form.name.split(' ')[0]?.trim() || '';
  const trimmedLastName = form.name.split(' ').slice(1).join(' ').trim();
  const trimmedEmail = form.email.trim();
  const trimmedCountry = form.country.trim();
  const trimmedPhone = form.phone.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneError = phoneValidationError(trimmedPhone, selectedCountry);

  if (!trimmedFirstName) {
    setError('First name is required.');
    return;
  }

  if (!trimmedLastName) {
    setError('Last name is required.');
    return;
  }

  if (!trimmedEmail) {
    setError('Email is required.');
    return;
  }

  if (!emailPattern.test(trimmedEmail)) {
    setError('Enter a valid email address.');
    return;
  }

  if (!trimmedCountry) {
    setError('Country is required.');
    return;
  }

  if (phoneError) {
    setError(phoneError);
    return;
  }

  if (!form.agree) {
    setError('You must agree to the Terms of service and Privacy policies.');
    return;
  }

  if (form.password !== form.confirmPassword) {
    setError('Passwords do not match.');
    return;
  }

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
    setError(requestError.response?.data?.message || 'Registration failed. Make sure the backend is running.');
  } finally {
    setLoading(false);
  }
};

  const password = form.password;

  const requirements = [
    { label: 'Minimum 8 characters', met: password.length >= 8 },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const firstName = form.name.split(' ')[0] || '';
  const lastName = form.name.split(' ').slice(1).join(' ') || '';

  const handleFirstNameChange = (text) => {
    setForm({ ...form, name: text + (lastName ? ' ' + lastName : '') });
  };

  const handleLastNameChange = (text) => {
    setForm({ ...form, name: firstName + (text ? ' ' + text : '') });
  };

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: darkMode ? '#071B18' : '#EEF8F5' }}>
      <View className="relative min-h-full items-center justify-center overflow-hidden px-4 py-12">
        <View pointerEvents="none" className="absolute -right-24 -top-24 h-72 w-72 rounded-full" style={{ backgroundColor: darkMode ? 'rgba(0,103,79,0.22)' : 'rgba(0,103,79,0.09)' }} />
        <View pointerEvents="none" className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full" style={{ backgroundColor: darkMode ? 'rgba(211,211,211,0.05)' : 'rgba(0,103,79,0.08)' }} />
        <View className="relative w-full max-w-lg rounded-[30px] px-6 py-8" style={{ backgroundColor: darkMode ? '#0B2521' : 'rgba(255,255,255,0.97)', borderColor: darkMode ? '#315D53' : '#D3D3D3', borderWidth: 1, shadowColor: '#00674F', shadowOffset: { width: 0, height: 16 }, shadowOpacity: darkMode ? 0.4 : 0.14, shadowRadius: 36, elevation: 24 }}>
          <View pointerEvents="none" className="absolute left-0 right-0 top-0 h-1.5" style={{ backgroundColor: '#00674F' }} />

          {/* Logo Badge */}
          <View className="absolute -top-7 left-0 right-0 z-10 items-center">
            <View className="rounded-[18px] px-5 py-2.5 shadow-md" style={{ backgroundColor: darkMode ? '#102F29' : '#FFFFFF', borderColor: darkMode ? '#315D53' : '#D3D3D3', borderWidth: 1 }}>
              <NovaLogo dark={darkMode} width={130} height={38} />
            </View>
          </View>

          {/* Header */}
          <View className="mt-7 items-center">
            <View className="mb-3 rounded-full px-3 py-1.5" style={{ backgroundColor: darkMode ? 'rgba(0,103,79,0.28)' : '#E5F2EE' }}>
              <Text className="text-[9px] font-bold uppercase tracking-[2px]" style={{ color: darkMode ? '#71D8C2' : '#00674F' }}>Create your trading account</Text>
            </View>
            <Text className="text-center text-[26px] font-bold" style={{ color: colors.text }}>
              Join VeltriumFX
            </Text>
            <Text className="mt-2 max-w-sm text-center text-[13px] leading-5" style={labelStyle}>
              Complete your details below to open a secure account.
            </Text>
          </View>

          <View className="mt-7">

            {/* First and Last Name Row */}
            <View className="flex-row gap-4 mb-4">
              <View className="flex-1">
                <Text className="mb-1.5 text-xs font-medium" style={labelStyle}>First Name *</Text>
                <TextInput
                  placeholder="First Name"
                  className="rounded-lg border px-4 py-2.5 text-sm"
                  style={inputStyle}
                  placeholderTextColor={placeholderColor}
                  value={firstName}
                  onChangeText={handleFirstNameChange}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1.5 text-xs font-medium" style={labelStyle}>Last Name *</Text>
                <TextInput
                  placeholder="Last Name"
                  className="rounded-lg border px-4 py-2.5 text-sm"
                  style={inputStyle}
                  placeholderTextColor={placeholderColor}
                  value={lastName}
                  onChangeText={handleLastNameChange}
                />
              </View>
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-medium" style={labelStyle}>Email *</Text>
              <TextInput
                placeholder="example@gmail.com"
                className="rounded-lg border px-4 py-2.5 text-sm"
                style={inputStyle}
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
                keyboardType="email-address"
                value={form.email}
                onChangeText={update('email')}
              />
            </View>

            {/* Referral Code */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-medium" style={labelStyle}>Referral Code (Optional)</Text>
              <TextInput
                placeholder="Enter referral code"
                className="rounded-lg border px-4 py-2.5 text-sm"
                style={inputStyle}
                placeholderTextColor={placeholderColor}
                value={form.referralCode}
                onChangeText={update('referralCode')}
              />
            </View>

            {/* Country Selector */}
            <View className="mb-4 z-10">
              <Text className="mb-1.5 text-xs font-medium" style={labelStyle}>Country *</Text>
              <View>
                <TouchableOpacity
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  className="rounded-lg border px-4 py-2.5 flex-row justify-between items-center"
                  style={inputStyle}
                >
                  <Text className="text-sm" style={{ color: form.country ? colors.text : colors.muted }}>
                    {form.country || "Select your country"}
                  </Text>
                  <ChevronDown size={18} color={colors.muted} />
                </TouchableOpacity>

                {dropdownOpen && (
                  <View className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-xl z-50 max-h-80" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                    <View className="p-2 border-b" style={{ borderColor: colors.border }}>
                      <View className="flex-row items-center rounded-lg border px-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                        <Search size={16} color={colors.muted} />
                        <TextInput
                          className="flex-1 py-2 px-2 text-sm"
                          style={{ color: colors.text }}
                          placeholder="Search country..."
                          placeholderTextColor={placeholderColor}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          autoFocus
                        />
                        {searchQuery ? (
                          <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={14} color={colors.muted} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                    <FlatList
                      data={filteredCountries}
                      keyExtractor={(item) => item.code}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => handleCountrySelect(item)}
                          className="flex-row justify-between items-center px-3 py-2 border-b"
                          style={{ borderColor: colors.border }}
                        >
                          <Text className="text-sm" style={{ color: colors.text }}>{item.name}</Text>
                          <Text className="text-xs" style={labelStyle}>{item.dialCode}</Text>
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={true}
                      className="max-h-64"
                      keyboardShouldPersistTaps="handled"
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-medium" style={labelStyle}>Phone *</Text>
              <TextInput
                keyboardType="phone-pad"
                maxLength={20}
                value={form.phone}
                onChangeText={handlePhoneChange}
                placeholder="Enter phone number"
                placeholderTextColor={placeholderColor}
                className="rounded-lg border px-4 py-2.5 text-sm"
                style={inputStyle}
              />
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-medium" style={labelStyle}>Password</Text>
              <View className="relative">
                <TextInput
                  className="rounded-lg border px-4 py-2.5 pr-11 text-sm"
                  style={inputStyle}
                  placeholder="Enter password"
                  placeholderTextColor={placeholderColor}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  importantForAutofill="no"
                  value={form.password}
                  onChangeText={(val) => setForm((v) => ({ ...v, password: val }))}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye size={18} color={colors.muted} /> : <EyeOff size={18} color={colors.muted} />}
                </TouchableOpacity>
              </View>

              {/* Password Requirements */}
              <View className="mt-2">
                <Text className="mb-1 text-xs font-medium" style={labelStyle}>Password must contain:</Text>
                <View className="flex-row flex-wrap">
                  {requirements.map((req) => (
                    <View key={req.label} className="w-full sm:w-[48%] flex-row items-center gap-1.5 mb-1">
                      <Text className={`text-sm ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                        {req.met ? '✓' : '○'}
                      </Text>
                      <Text className="flex-1 text-xs" numberOfLines={1} style={{ color: req.met ? colors.success : colors.muted }}>
                        {req.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Confirm Password */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-medium" style={labelStyle}>Confirm Password</Text>
              <View className="relative">
                <TextInput
                  className="rounded-lg border px-4 py-2.5 pr-11 text-sm"
                  style={inputStyle}
                  placeholder="Confirm your password"
                  placeholderTextColor={placeholderColor}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  importantForAutofill="no"
                  value={form.confirmPassword}
                  onChangeText={(val) => setForm((v) => ({ ...v, confirmPassword: val }))}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <Eye size={18} color={colors.muted} /> : <EyeOff size={18} color={colors.muted} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms and Conditions */}
            <View className="flex-row items-start gap-2 mb-4">
              <TouchableOpacity onPress={() => setForm({ ...form, agree: !form.agree })} className="mt-0.5">
                <View className="w-4 h-4 rounded border items-center justify-center" style={{ borderColor: form.agree ? linkColor : colors.border, backgroundColor: form.agree ? linkColor : inputStyle.backgroundColor }}>
                  {form.agree && <Text className="text-white text-xs">✓</Text>}
                </View>
              </TouchableOpacity>
              <Text className="flex-1 text-xs leading-relaxed" style={labelStyle}>
                I agree to the{' '}
                <Text className="font-medium" style={{ color: linkColor }}>Terms of service</Text>{' '}
                and Privacy policies
              </Text>
            </View>

            {error ? <Text className="text-red-600 text-xs mb-4">{error}</Text> : null}

            {/* Submit Button */}
            <Pressable
              onPress={submit}
              disabled={loading}
              className="w-full rounded-xl py-3 items-center shadow-md"
              style={{ opacity: loading ? 0.7 : 1, backgroundColor: '#00674F', shadowColor: '#00674F', shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
            >
              <Text className="text-white font-semimedium text-sm">{loading ? 'Signing up...' : 'Sign Up'}</Text>
            </Pressable>
          </View>

          {/* Login Link */}
          <Link href="/login" asChild>
            <Pressable className="mt-6 rounded-xl border px-4 py-3" style={{ borderColor: darkMode ? '#315D53' : '#D3D3D3', backgroundColor: darkMode ? '#102F29' : '#F7FAF9' }}>
              <Text className="text-center text-sm" style={labelStyle}>
                Already have an account?{' '}
                <Text className="font-semimedium" style={{ color: linkColor }}>Login</Text>
              </Text>
            </Pressable>
          </Link>

        </View>
      </View>
    </ScrollView>
  );
}
