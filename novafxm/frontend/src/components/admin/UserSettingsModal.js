import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import CustomButton from '../common/CustomButton';
import CustomInput from '../common/CustomInput';
import { useAppTheme } from '../../context/ThemeContext';

const defaultLeverage = 500;
const minLeverage = 100;
const maxLeverage = 2000;

function ask(message, onConfirm) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Confirm action', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: onConfirm }]);
}

export default function UserSettingsModal({ user, loading, onClose, onSave, onReset }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const [leverage, setLeverage] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLeverage(String(user?.leverage || defaultLeverage));
    setAdminNotes(user?.adminNotes || '');
    setError('');
  }, [user]);

  if (!user) return null;

  const save = () => {
    const value = Number(String(leverage).replace('1:', ''));
    if (!Number.isInteger(value) || value < minLeverage || value > maxLeverage) {
      setError(`Leverage must be between 1:${minLeverage} and 1:${maxLeverage}.`);
      return;
    }
    onSave({ leverage: value, adminNotes });
  };
  return (
    <View
      className={`absolute inset-0 z-50 items-center bg-medium/70 px-4 ${mobile ? 'justify-start pt-16' : 'justify-center'}`}
    >
      <View className="w-full max-w-xl rounded-3xl border p-6" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: darkMode ? 0.2 : 0.05, shadowRadius: 20 }}>
        <View className="mb-5 flex-row justify-between">
          <Text className="text-xl font-medium" style={{ color: colors.text }}>Account Controls</Text>
          <Pressable onPress={onClose}><Text className="text-xl" style={{ color: colors.muted }}>x</Text></Pressable>
        </View>
        <Text className="mb-5" style={{ color: colors.muted }}>{user.name} | {user.accountType} | Active</Text>
        <CustomInput label="Leverage (1:x)" value={leverage} onChangeText={setLeverage} keyboardType="number-pad" error={error} />
        <CustomInput label="Admin notes" value={adminNotes} onChangeText={setAdminNotes} placeholder="Internal note visible only to admin" multiline />
        <CustomButton title="Save Leverage and Notes" loading={loading} onPress={save} className="mb-3" />
        <View className="flex-row">
          <CustomButton
            title="Reset Demo"
            variant="secondary"
            className="flex-1"
            disabled={loading || user.accountType !== 'Demo'}
            onPress={() => ask(`Reset ${user.name}'s demo balance to $5,000?`, onReset)}
          />
        </View>
      </View>
    </View>
  );
}
