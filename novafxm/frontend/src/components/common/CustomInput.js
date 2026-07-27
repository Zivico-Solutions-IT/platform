import { Text, TextInput, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

export default function CustomInput({ label, error, className = '', style, placeholderTextColor, labelStyle, ...props }) {
  const { darkMode, colors } = useAppTheme();
  const inputBackground = darkMode ? colors.surface : '#f6fff9';
  const inputProps = { ...props };

  if (Object.prototype.hasOwnProperty.call(inputProps, 'value') && inputProps.value == null) {
    inputProps.value = '';
  }

  return (
    <View className={`mb-3 md:mb-4 ${className}`}>
      {label ? <Text className="mb-1 md:mb-2 text-xs md:text-sm font-medium" style={[{ color: colors.muted }, labelStyle]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={placeholderTextColor || colors.muted}
        className="h-10 md:h-12 rounded-xl border px-3 md:px-4 text-sm md:text-base"
        style={[{ backgroundColor: inputBackground, borderColor: colors.border, color: colors.text }, style]}
        {...inputProps}
      />
      {error ? <Text className="mt-1 text-xs" style={{ color: colors.danger }}>{error}</Text> : null}
    </View>
  );
}
