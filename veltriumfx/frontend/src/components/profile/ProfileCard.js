import { Text, View } from 'react-native';
import { money } from '../../utils/formatters';

export default function ProfileCard({ user, balance }) {
  const items = [
    ['Name', user?.name || 'Demo Trader'],
    ['Email', user?.email || 'demo@veltriumfx.com'],
    ['Phone', user?.phone || '-'],
    ['Account Type', user?.accountType || 'Demo'],
    ['Wallet Balance', `${money(balance)} USD`],
  ];
  return (
    <View className="rounded-2xl border border-border bg-panel p-5">
      <Text className="mb-5 text-xl font-medium text-white">Account Profile</Text>
      {items.map(([label, value]) => (
        <View key={label} className="mb-4">
          <Text className="text-xs text-muted">{label}</Text>
          <Text className="mt-1 text-white">{value}</Text>
        </View>
      ))}
    </View>
  );
}
