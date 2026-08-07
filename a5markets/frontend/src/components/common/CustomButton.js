import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

const variants = {
  primary: 'bg-primary',
  success: 'bg-success',
  danger: 'bg-danger',
  secondary: '',
};

const labelColors = {
  primary: 'text-medium',
  success: 'text-white',
  danger: 'text-white',
  secondary: '',
};

export default function CustomButton({ title, onPress, variant = 'primary', loading = false, className = '', disabled = false, compact = false }) {
  const { darkMode, colors } = useAppTheme();
  const labelColor = variant === 'primary' ? 'text-white' : (labelColors[variant] || 'text-white');

  const buttonStyle = variant === 'primary'
    ? { backgroundColor: colors.primary }
    : variant === 'secondary'
    ? {
        backgroundColor: darkMode ? colors.surface : '#e7f2fa',
        borderWidth: 1,
        borderColor: colors.primary,
      }
    : {};

  const secondaryTextColor = variant === 'secondary'
    ? (darkMode ? '#ffffff' : colors.primary)
    : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${compact ? 'min-h-[36px] py-1.5 px-4' : 'min-h-[46px] px-5'} items-center justify-center rounded-xl ${variants[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
      style={buttonStyle}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? '#fff' : (secondaryTextColor || '#fff')} size={compact ? 'small' : undefined} />
        : <Text
            className={`font-medium ${secondaryTextColor ? '' : labelColor} ${compact ? 'text-xs' : 'text-sm'}`}
            style={secondaryTextColor ? { color: secondaryTextColor } : undefined}
          >
            {title}
          </Text>
      }
    </Pressable>
  );
}
