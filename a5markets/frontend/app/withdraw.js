import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ClientPortalHeader from '../src/components/layout/ClientPortalHeader';
import WithdrawForm from '../src/components/wallet/WithdrawForm';
import { useWallet } from '../src/hooks/useWallet';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';
import { dashboardService } from '../src/services/dashboardService';
import { money } from '../src/utils/formatters';

function AccountSummary({ label, value, colors }) {
  return (
    <View className="flex-1 rounded-2xl border p-5" style={{ minWidth: 230, backgroundColor: colors.panel, borderColor: colors.border }}>
      <Text className="text-xs font-medium uppercase" style={{ color: colors.muted }}>{label}</Text>
      <Text className="mt-3 text-xl font-medium" style={{ color: colors.text }}>{value}</Text>
    </View>
  );
}

export default function WithdrawScreen() {
  const { user, logout } = useAuth();
  const { colors } = useAppTheme();
  const { summary, transactions, withdraw, loading } = useWallet();
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const fundingLocked = Boolean(user && user.verificationStatus !== 'approved');
  const liveAccounts = useMemo(
    () => accounts.filter((account) => String(account.type || '').toLowerCase() === 'live' && account.status !== 'frozen'),
    [accounts],
  );
  const selectedAccount = useMemo(
    () => liveAccounts.find((account) => String(account.id) === String(selectedAccountId)) || liveAccounts[0] || null,
    [liveAccounts, selectedAccountId],
  );
  const selectedSummary = useMemo(
    () => ({ ...summary, balance: Number(selectedAccount?.balance ?? summary.balance ?? 0) }),
    [selectedAccount?.balance, summary],
  );

  useEffect(() => {
    let active = true;
    dashboardService.getDashboard()
      .then((result) => {
        if (!active) return;
        const nextAccounts = result.accounts || [];
        setAccounts(nextAccounts);
        const firstLive = nextAccounts.find((account) => String(account.type || '').toLowerCase() === 'live' && account.status !== 'frozen');
        setSelectedAccountId(firstLive?.id ? String(firstLive.id) : '');
      })
      .catch(() => {
        if (active) setAccounts([]);
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });
    return () => { active = false; };
  }, []);
  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="mx-auto w-full max-w-[1180px] p-3 sm:p-6 lg:p-8">
      <ClientPortalHeader
        title="Withdraw"
        subtitle={user?.email || 'Request withdrawals from your live trading account.'}
        activeKey="withdraw"
        userRole={user?.role}
        rightContent={(
          <>
            <Pressable onPress={() => router.push('/trading')} className="h-10 items-center justify-center px-2">
              <Text className="font-medium" style={{ color: colors.primary }}>Back to Trading</Text>
            </Pressable>
            <Pressable onPress={signOut} className="h-10 items-center justify-center px-2">
              <Text className="font-medium" style={{ color: colors.danger }}>Sign Out</Text>
            </Pressable>
          </>
        )}
      />

      <View className="mb-6 flex-row flex-wrap gap-4">
        <AccountSummary label="Selected Account" value={selectedAccount?.name || (accountsLoading ? 'Loading live accounts...' : 'No live account')} colors={colors} />
        <AccountSummary label="Balance" value={`${money(selectedSummary.balance)} ${selectedAccount?.currency || 'USD'}`} colors={colors} />
      </View>

      <WithdrawForm
        onSubmit={(values) => withdraw(values, Boolean(user))}
        loading={loading}
        disabled={fundingLocked || !selectedAccount}
        disabledMessage={fundingLocked ? 'Verification approval is required before withdrawals.' : 'Create or activate a Live account before withdrawals.'}
        summary={selectedSummary}
        transactions={transactions}
        selectedAccount={selectedAccount}
      />
    </ScrollView>
  );
}
