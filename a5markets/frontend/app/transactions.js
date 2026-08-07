import { ScrollView, Text } from 'react-native';
import PortalLayout from '../src/components/portal/PortalLayout';
import TransactionList from '../src/components/wallet/TransactionList';
import { useWallet } from '../src/hooks/useWallet';
import { useAppTheme } from '../src/context/ThemeContext';

export default function TransactionsScreen() {
  const { transactions } = useWallet();
  const { colors } = useAppTheme();
  return (
    <PortalLayout>
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: 18 }}>Transaction History</Text>
        <TransactionList transactions={transactions} title="All Transactions" />
      </ScrollView>
    </PortalLayout>
  );
}
