import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

const variants = {
  primary: 'bg-primary',
  success: 'bg-success',
  danger: 'bg-danger',
  secondary: '',
};

const labelColors = {
  primary: 'text-white',
  success: 'text-white',
  danger: 'text-white',
  secondary: '',
};

export default function CustomButton({ title, onPress, variant = 'primary', loading = false, className = '', disabled = false, compact = false }) {
  const { darkMode } = useAppTheme();
  const labelColor = labelColors[variant] || 'text-white';

  const secondaryStyle = variant === 'secondary'
    ? {
        backgroundColor: darkMode ? '#1e2329' : '#e8e2cc',
        borderWidth: 1,
        borderColor: darkMode ? '#2b3139' : '#c9bc8c',
      }
    : {};

  const secondaryTextColor = variant === 'secondary'
    ? (darkMode ? '#ffffff' : '#3a3520')
    : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${compact ? 'min-h-[36px] py-1.5 px-4' : 'min-h-[46px] px-5'} items-center justify-center rounded-xl ${variants[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
      style={secondaryStyle}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : (secondaryTextColor || '#fff')} size={compact ? 'small' : undefined} />
        : <Text
            className={`font-medium ${secondaryTextColor ? '' : labelColor} ${compact ? 'text-xs' : 'text-sm'}`}
            style={secondaryTextColor
              ? { color: secondaryTextColor }
              : variant === 'primary'
                ? { color: '#FFFFFF' }
                : undefined}
          >
            {title}
          </Text>
      }
    </Pressable>
  );
}
