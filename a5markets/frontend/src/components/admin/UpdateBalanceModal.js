import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Text, View, Modal, useWindowDimensions } from 'react-native';
import CustomButton from '../common/CustomButton';
import CustomInput from '../common/CustomInput';
import { useAppTheme } from '../../context/ThemeContext';
import { money } from '../../utils/formatters';

function ask(message, onConfirm) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Confirm admin action', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: onConfirm }]);
}

export default function UpdateBalanceModal({ user, account, initialOperation, loading, onClose, onConfirm }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const [operation, setOperation] = useState(initialOperation || 'add_balance');
  const [amount, setAmount] = useState('');
  const [bonus, setBonus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setOperation(initialOperation || 'add_balance');
    setAmount('');
    setBonus('');
    setError('');
  }, [user, initialOperation]);

  if (!user) return null;

  const submit = () => {
    const numeric = Number(amount);
    const numericBonus = operation === 'add_balance' ? Number(bonus || 0) : 0;
    if (!(numeric > 0)) {
      setError('Amount must be positive.');
      return;
    }
    if (numericBonus < 0) {
      setError('Bonus cannot be negative.');
      return;
    }
    const availableBalance = Number(account?.balance ?? user.wallet?.balance ?? 0);
    if (operation === 'deduct_balance' && numeric > availableBalance) {
      setError('Withdrawal cannot exceed available balance.');
      return;
    }
    setError('');
    ask(
      `Confirm ${operation === 'add_balance' ? 'deposit' : 'withdraw'} $${money(numeric)}${numericBonus > 0 ? ` + bonus $${money(numericBonus)}` : ''} for ${user.name}?`,
      () => onConfirm({ operation, amount: numeric, bonus: numericBonus, note: '' }),
    );
  };

  return (
    <Modal visible={true} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View
        className={`flex-1 items-center bg-medium/70 px-4 ${mobile ? 'justify-start pt-16' : 'justify-center'}`}
        style={{ zIndex: 5000 }}
      >
        <View className={`w-full max-w-md border ${mobile ? 'rounded-xl p-4' : 'rounded-2xl p-6'}`} style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
          <View className={`flex-row items-center justify-between ${mobile ? 'mb-3' : 'mb-5'}`}>
            <Text className={`${mobile ? 'text-lg' : 'text-xl'} font-medium`} style={{ color: colors.text }}>Update Balance</Text>
            <Pressable onPress={onClose} className="p-1"><Text className="text-xl" style={{ color: colors.muted }}>×</Text></Pressable>
          </View>
          <Text className={`${mobile ? 'text-xs mb-0.5' : 'text-sm mb-1'}`} style={{ color: colors.muted }}>{user.name} | Wallet ${money(user.wallet?.balance)}</Text>
          <Text className={`text-primary ${mobile ? 'text-xs mb-3' : 'text-sm mb-5'}`}>
            Target: {account?.name || 'Wallet / primary account'} | Available ${money(account?.balance ?? user.wallet?.balance)}
          </Text>
          <View className={`flex-row ${mobile ? 'mb-3' : 'mb-5'}`}>
            {[
              ['add_balance', 'Deposit'],
              ['deduct_balance', 'Withdrawal'],
            ].map(([value, title]) => (
              <Pressable
                key={value}
                onPress={() => setOperation(value)}
                className={`rounded-2xl border ${mobile ? 'mr-2 px-3 py-1.5' : 'mr-3 px-4 py-2.5'} ${operation === value ? 'border-primary bg-primary/20' : ''}`}
                style={operation === value ? null : { backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className={`font-semibold ${mobile ? 'text-xs' : 'text-sm'} ${operation === value ? 'text-primary' : ''}`} style={operation === value ? null : { color: colors.text }}>{title}</Text>
              </Pressable>
            ))}
          </View>
          <CustomInput label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={error} />
          {operation === 'add_balance' ? (
            <CustomInput label="Bonus (USD)" value={bonus} onChangeText={setBonus} keyboardType="decimal-pad" placeholder="0.00" />
          ) : null}
          <View className="flex-row justify-end mt-2">
            <CustomButton title="Cancel" variant="secondary" className="mr-2" disabled={loading} onPress={onClose} />
            <CustomButton title="Confirm" variant={operation === 'add_balance' ? 'success' : 'danger'} loading={loading} onPress={submit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
