import { Platform, TextInput, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

const toPickerValue = (value) => String(value || '').replace(' ', 'T').slice(0, 16);
const toStoredValue = (value) => String(value || '').replace('T', ' ').slice(0, 16);

export default function DateTimePickerInput({ value, onChangeText, onFocus, placeholder = 'Select date and time' }) {
  const { darkMode, colors } = useAppTheme();
  const inputStyle = { width: '100%', height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: darkMode ? colors.surface : '#f6fff9', color: colors.text, paddingHorizontal: 14 };
  if (Platform.OS === 'web') return <View className="mb-3 md:mb-4"><input type="datetime-local" value={toPickerValue(value)} onFocus={onFocus} onChange={(event) => onChangeText?.(toStoredValue(event.target.value))} aria-label={placeholder} style={{ ...inputStyle, display: 'block', boxSizing: 'border-box', padding: '0 14px', outline: 'none', colorScheme: darkMode ? 'dark' : 'light' }} /></View>;
  return <View className="mb-3 md:mb-4"><TextInput value={value || ''} onFocus={onFocus} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={inputStyle} /></View>;
}
