import { ScrollView, Text } from 'react-native';
import PortalLayout from '../src/components/portal/PortalLayout';
import TransactionList from '../src/components/wallet/TransactionList';
import { useWallet } from '../src/hooks/useWallet';

export default function TransactionsScreen() {
  const { transactions } = useWallet();
  return (
    <PortalLayout>
      <ScrollView contentContainerStyle={{ padding: 28, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <Text style={{ color: '#102a46', fontSize: 32, fontWeight: '800', marginBottom: 18 }}>Transaction History</Text>
        <TransactionList transactions={transactions} title="All Transactions" />
      </ScrollView>
    </PortalLayout>
  );
}
