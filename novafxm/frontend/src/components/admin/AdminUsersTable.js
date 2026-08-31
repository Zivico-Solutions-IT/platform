import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { money } from '../../utils/formatters';


function ask(message, onConfirm) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Confirm action', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: onConfirm }]);
}

function Button({ title, icon: Icon, onPress, danger, disabled }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-2xl border ${mobile ? 'mb-1 mr-1 px-2 py-1' : 'mb-2 mr-2 px-3 py-2'} ${danger ? 'border-danger/60 bg-danger/10' : ''} ${disabled ? 'opacity-40' : ''}`}
      style={danger ? null : { backgroundColor: colors.surface, borderColor: colors.border }}
    >
      {Icon ? <Icon size={mobile ? 12 : 15} color={danger ? colors.danger : colors.text} /> : <Text className={`font-semimedium ${mobile ? 'text-[10px]' : 'text-xs'}`} style={{ color: danger ? colors.danger : colors.text }}>{title}</Text>}
    </Pressable>
  );
}

function FreezeSwitch({ frozen, disabled, onPress }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center rounded-2xl border ${mobile ? 'mb-1 mr-1 h-7 px-1.5' : 'mb-2 mr-2 h-9 px-2.5'} ${disabled ? 'opacity-40' : ''}`}
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      {!frozen && (
        <Text className={`font-semimedium mr-1.5 ${mobile ? 'text-[10px]' : 'text-xs'}`} style={{ color: colors.text }}>
          Freeze
        </Text>
      )}
      <View
        className={`justify-center rounded-full ${mobile ? 'h-4 w-8 px-0.5' : 'h-6 w-12 px-1'} ${frozen ? 'items-start bg-danger' : 'items-end bg-success'}`}
      >
        <View className={mobile ? 'h-2.5 w-2.5 rounded-full bg-white' : 'h-4 w-4 rounded-full bg-white'} />
      </View>
      {frozen && (
        <Text className={`font-semimedium ml-1.5 ${mobile ? 'text-[10px]' : 'text-xs'}`} style={{ color: colors.text }}>
          Unfreeze
        </Text>
      )}
    </Pressable>
  );
}

function TextCell({ width, children, className = '' }) {
  const { darkMode, colors } = useAppTheme();
  const color = className.includes('text-success') ? colors.success : className.includes('text-danger') ? colors.danger : className.includes('text-primary') ? colors.primary : className.includes('text-muted') ? colors.muted : colors.text;

  return <Text style={{ width, color }} className="px-3 py-4 text-sm">{children}</Text>;
}

function LeverageEditor({ leverageValue, blocked, onSave }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const [value, setValue] = useState(String(leverageValue || 500));
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(String(leverageValue || 500));
    setError('');
  }, [leverageValue]);

  const save = () => {
    const leverage = Number(String(value).replace('1:', ''));
    if (!Number.isInteger(leverage) || leverage < 100 || leverage > 2000) {
      setError('100 - 2000');
      return;
    }
    setError('');
    onSave(leverage);
  };

  return (
    <View style={mobile ? undefined : { width: 160 }} className={mobile ? 'py-1' : 'px-3 py-3'}>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-xs font-medium" style={{ color: colors.muted }}>1:</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          editable={!blocked}
          keyboardType="number-pad"
          className="h-8 rounded-2xl border px-2 text-xs"
          style={{ width: 55, borderColor: error ? colors.danger : colors.border, backgroundColor: colors.surface, color: colors.text }}
        />
        <Pressable
          disabled={blocked}
          onPress={save}
          className={`h-8 justify-center rounded-2xl border px-2.5 ${blocked ? 'opacity-40' : ''}`}
          style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}16` }}
        >
          <Text className="text-[11px] font-medium" style={{ color: colors.primary }}>Save</Text>
        </Pressable>
        {error ? (
          <Text className="text-[10px] ml-1" style={{ color: colors.danger }}>{error}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Header({ width, children }) {
  const { darkMode, colors } = useAppTheme();

  return <Text style={{ width, color: colors.muted }} className="px-3 py-3 text-xs font-medium uppercase">{children}</Text>;
}

function StickyTableHeader({ children, style }) {
  const { darkMode, colors } = useAppTheme();

  return (
    <View
      className="flex-row border-b"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        elevation: 30,
        ...style,
      }}
    >
      {children}
    </View>
  );
}

function depositTotalFor(user, account) {
  if (account && !account.isSummary) {
    if (account.type === 'Demo') {
      const demoDeposits = account.accountStats?.totalDeposits ?? account.totalDeposits ?? account.depositTotal;
      return Number(demoDeposits || 0);
    }
    const accountDeposits = account.accountStats?.totalDeposits ?? account.totalDeposits ?? account.depositTotal;
    if (accountDeposits !== undefined && accountDeposits !== null) return Number(accountDeposits || 0);
    if (Array.isArray(account.deposits)) {
      return account.deposits
        .filter((deposit) => ['approved', 'completed'].includes(deposit.status))
        .reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);
    }
    return 0;
  }
  return Number(user.accountStats?.totalDeposits ?? user.wallet?.totalDeposits ?? 0);
}

function bonusTotalFor(user, account) {
  if (account && !account.isSummary) {
    const accountBonus = account.accountStats?.totalBonus ?? account.totalBonus ?? account.bonusTotal;
    if (accountBonus !== undefined && accountBonus !== null) return Number(accountBonus || 0);
    if (Array.isArray(account.deposits)) {
      return account.deposits
        .filter((deposit) => ['approved', 'completed'].includes(deposit.status))
        .reduce((sum, deposit) => sum + Number(deposit.bonus || 0), 0);
    }
    return 0;
  }
  return Number(user.accountStats?.totalBonus ?? user.wallet?.bonus ?? user.wallet?.totalBonus ?? 0);
}

function liveAccountTotalFor(user, accounts, totalFor) {
  return accounts
    .filter((account) => account.type === 'Live')
    .reduce((sum, account) => sum + totalFor(user, account), 0);
}

function accountIsFrozen(account) {
  return account?.status === 'frozen' || account?.status === 'disabled';
}

function allAccountsFrozen(accounts, user) {
  if (!accounts.length) return user.tradingStatus === 'frozen';
  return accounts.every(accountIsFrozen);
}

function sortTradingAccounts(accounts = []) {
  return [...accounts].sort((left, right) => {
    const typeRank = (account) => String(account?.type || '').toLowerCase() === 'live' ? 0 : String(account?.type || '').toLowerCase() === 'demo' ? 1 : 2;
    return typeRank(left) - typeRank(right);
  });
}

const isOnlineUser = (user) => {
  const onlineUntil = new Date(user?.onlineUntil || 0).getTime();
  return Number.isFinite(onlineUntil) && onlineUntil > Date.now();
};

function AccountsDropdown({ count, expanded, onPress }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-xl border ${mobile ? 'mt-2 px-2.5 py-1.5' : 'mt-3 px-3 py-2'} ${expanded ? 'border-primary/50 bg-primary/10' : ''}`}
      style={expanded ? null : { backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-semimedium" style={{ color: colors.text }}>{expanded ? 'Hide account details' : 'Show account details'}</Text>
          <Text className={`mt-0.5 ${mobile ? 'text-[10px]' : 'text-[11px]'}`} style={{ color: colors.muted }}>{expanded ? `${count} of ${count} shown` : 'Details hidden'}</Text>
        </View>
        <View className={`ml-3 items-center justify-center rounded-full ${mobile ? 'h-6 w-6' : 'h-7 w-7'}`} style={{ backgroundColor: colors.panel }}>
          <ChevronDown size={mobile ? 14 : 16} color="#27a8e9" style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
        </View>
      </View>
    </Pressable>
  );
}

function ReferralsDropdown({ count, expanded, onPress }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-xl border ${mobile ? 'mt-1.5 px-2.5 py-1.5' : 'mt-2 px-3 py-2'} ${expanded ? 'border-primary/50 bg-primary/10' : ''}`}
      style={expanded ? null : { backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-semimedium" style={{ color: colors.text }}>{expanded ? 'Hide referrals' : 'Show referrals'}</Text>
          <Text className={`mt-0.5 ${mobile ? 'text-[10px]' : 'text-[11px]'}`} style={{ color: colors.muted }}>{count} linked client{count === 1 ? '' : 's'}</Text>
        </View>
        <View className={`ml-3 items-center justify-center rounded-full ${mobile ? 'h-6 w-6' : 'h-7 w-7'}`} style={{ backgroundColor: colors.panel }}>
          <ChevronDown size={mobile ? 14 : 16} color="#D4AF37" style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
        </View>
      </View>
    </Pressable>
  );
}

function ReferralList({ referrals }) {
  const { darkMode, colors } = useAppTheme();

  if (!referrals?.length) {
    return <Text className="mt-2 rounded-2xl border border-dashed p-2 text-xs" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16, color: colors.muted }}>No referrals linked.</Text>;
  }

  return (
    <View className="mt-2 gap-2">
      {referrals.map((referral) => (
        <View key={referral.id} className="rounded-2xl border p-2" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
          <Text className="text-xs font-medium" numberOfLines={1} style={{ color: colors.text }}>{referral.name || 'Client'}</Text>
          <Text className="mt-1 text-[11px]" numberOfLines={1} style={{ color: colors.muted }}>{referral.email || '-'}</Text>
          <Text className="mt-1 text-[11px]" style={{ color: colors.muted }}>
            {referral.accountType || 'Demo'} | {referral.verificationStatus || 'pending'}
          </Text>
          <Text className="mt-1 text-[11px] text-primary">
            Wallet ${money(referral.wallet?.balance || 0)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function AdminUsersTable({ users, busyId, onBalance, onReset, onWallet, onTransactions, onSettings, onLeverage, onTradingAccountLeverage, onTradingStatus, onTradingAccountStatus, onDeleteTradingAccount, canDeleteTradingAccounts = false }) {
  const { width } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedReferrals, setExpandedReferrals] = useState({});
  const mobile = width < 760;

  const toggleAccounts = (userId) => {
    setExpandedUsers((current) => ({ ...current, [userId]: !current[userId] }));
  };

  const toggleReferrals = (userId) => {
    setExpandedReferrals((current) => ({ ...current, [userId]: !current[userId] }));
  };

  if (mobile) {
    return (
      <View className="gap-3">
        {users.map((user) => {
          const accounts = user.tradingAccounts?.length
            ? sortTradingAccounts(user.tradingAccounts)
            : [{ id: `user-${user.id}`, name: `${user.accountType || 'Demo'} account`, type: user.accountType || 'Demo', balance: user.wallet?.balance, status: user.tradingStatus }];
          const expanded = Boolean(expandedUsers[user.id]);
          const referralsExpanded = Boolean(expandedReferrals[user.id]);
          const referrals = user.referrals || [];
          const demoCount = accounts.filter((account) => account.type === 'Demo').length;
          const liveCount = accounts.filter((account) => account.type === 'Live').length;
          const totalBalance = accounts
            .filter((account) => account.type === 'Live')
            .reduce((sum, account) => sum + Number(account.balance || 0), 0);
          const walletOpenProfit = Number(user.wallet?.openProfit || 0);
          const totalEquity = totalBalance + walletOpenProfit;
          const totalDeposit = liveAccountTotalFor(user, accounts, depositTotalFor);
          const totalBonus = liveAccountTotalFor(user, accounts, bonusTotalFor);
          const blocked = busyId === user.id;
          const summaryFrozen = allAccountsFrozen(accounts, user);
          const summaryStatus = summaryFrozen ? 'frozen' : user.tradingStatus === 'frozen' ? 'frozen' : 'active';
          const visibleAccounts = expanded ? accounts : [{
            id: `summary-${user.id}`,
            name: 'Wallet summary',
            type: `${demoCount} Demo / ${liveCount} Live`,
            balance: totalBalance,
            deposit: totalDeposit,
            bonus: totalBonus,
            equity: totalEquity,
            status: summaryStatus,
            isSummary: true,
          }];
          const canRemoveAccount = canDeleteTradingAccounts && accounts.length > 1;

          return (
            <View key={user.id} className="rounded-2xl border p-3" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
              <View className="flex-row items-start justify-between gap-2.5">
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-1.5">
                    {isOnlineUser(user) ? (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                    ) : null}
                    <Text className="min-w-0 flex-1 font-medium" numberOfLines={1} style={{ color: colors.text }}>{user.name}</Text>
                  </View>
                  <Text className="mt-0.5 text-xs" numberOfLines={1} style={{ color: colors.muted }}>{user.email}</Text>
                  <Text className="mt-1 text-[10px]" style={{ color: colors.muted }}>Referral: {user.referralCode || '-'}</Text>
                </View>
                <Text className="rounded-full px-2 py-1 text-xs font-medium" style={{ backgroundColor: user.tradingStatus === 'frozen' ? `${colors.danger}18` : `${colors.success}18`, color: user.tradingStatus === 'frozen' ? colors.danger : colors.success }}>
                  {user.tradingStatus || 'active'}
                </Text>
              </View>

              <View className="mt-2.5 flex-row flex-wrap gap-1.5">
                <View className="flex-1 rounded-2xl border p-2" style={{ minWidth: '47%', backgroundColor: colors.surface, borderColor: colors.border }}>
                  <Text className="text-[9px] uppercase" style={{ color: colors.muted }}>Deposit</Text>
                  <Text className="mt-0.5 text-xs font-semibold text-primary">${money(totalDeposit)}</Text>
                </View>
                <View className="flex-1 rounded-2xl border p-2" style={{ minWidth: '47%', backgroundColor: colors.surface, borderColor: colors.border }}>
                  <Text className="text-[9px] uppercase" style={{ color: colors.muted }}>Bonus</Text>
                  <Text className="mt-0.5 text-xs font-semibold" style={{ color: colors.text }}>${money(totalBonus)}</Text>
                </View>
                <View className="flex-1 rounded-2xl border p-2" style={{ minWidth: '47%', backgroundColor: colors.surface, borderColor: colors.border }}>
                  <Text className="text-[9px] uppercase" style={{ color: colors.muted }}>Balance</Text>
                  <Text className="mt-0.5 text-xs font-semibold" style={{ color: colors.text }}>${money(totalBalance)}</Text>
                </View>
                <View className="flex-1 rounded-2xl border p-2" style={{ minWidth: '47%', backgroundColor: colors.surface, borderColor: colors.border }}>
                  <Text className="text-[9px] uppercase" style={{ color: colors.muted }}>Equity</Text>
                  <Text className="mt-0.5 text-xs font-semibold" style={{ color: colors.text }}>${money(totalEquity)}</Text>
                </View>
              </View>

              <AccountsDropdown count={accounts.length} expanded={expanded} onPress={() => toggleAccounts(user.id)} />
              <ReferralsDropdown count={referrals.length} expanded={referralsExpanded} onPress={() => toggleReferrals(user.id)} />
              {referralsExpanded ? <ReferralList referrals={referrals} /> : null}

              <View className="mt-2.5 gap-2">
                {visibleAccounts.map((account) => {
                  const status = account.status || user.tradingStatus;
                  const frozen = accountIsFrozen({ status });
                  const canToggleAccount = !account.isSummary && Number.isFinite(Number(account.id));
                  return (
                    <View key={account.id} className="rounded-2xl border p-2" style={{ backgroundColor: account.type === 'Live' ? `${colors.primary}10` : colors.surface, borderColor: account.type === 'Live' ? colors.primary : colors.border }}>
                      <View className="flex-row items-center justify-between">
                        <View className="min-w-0 flex-1"><Text className="text-xs font-semibold" numberOfLines={1} style={{ color: colors.text }}>{!account.isSummary && Number.isFinite(Number(account.id)) ? `#${String(account.id).padStart(6, '0')} · ${account.name}` : account.name}</Text>{account.type === 'Live' ? <Text className="mt-0.5 text-[9px] font-bold uppercase" style={{ color: colors.primary }}>Live account</Text> : null}</View>
                        <Text className="text-xs font-semibold" style={{ color: colors.primary }}>${money(account.balance)}</Text>
                      </View>
                      <View className="mt-1 flex-row items-center justify-between">
                        <Text className="text-[10px]" style={{ color: colors.muted }}>{account.isSummary ? account.type : `${account.type} Account`}</Text>
                        {!account.isSummary ? (
                          <LeverageEditor leverageValue={account.leverage || user.leverage} blocked={blocked} onSave={(leverage) => onTradingAccountLeverage(user, account, leverage)} />
                        ) : null}
                      </View>
                      <View className="mt-1.5 flex-row flex-wrap items-center">
                        {account.isSummary ? (
                          <>
                            <FreezeSwitch
                              frozen={summaryFrozen}
                              disabled={blocked}
                              onPress={() => ask(
                                `${summaryFrozen ? 'Unfreeze' : 'Freeze'} all trading accounts for ${user.name || user.email}?`,
                                () => onTradingStatus(user, summaryFrozen ? 'active' : 'frozen'),
                              )}
                            />
                            <Text className="py-1 text-[10px]" style={{ color: colors.muted }}>Expand account details to manage each account.</Text>
                          </>
                        ) : (
                          <>
                            <Button title="Deposit" disabled={blocked} onPress={() => onBalance(user, 'add_balance', account)} />
                            <Button title="Withdrawal" danger disabled={blocked} onPress={() => onBalance(user, 'deduct_balance', account)} />
                            <FreezeSwitch
                              frozen={frozen}
                              disabled={blocked || status === 'pending' || !canToggleAccount}
                              onPress={() => ask(
                                `${frozen ? 'Unfreeze' : 'Freeze'} ${account.name || account.type || 'this'} account for ${user.name || user.email}?`,
                                () => onTradingAccountStatus(user, account, frozen ? 'active' : 'disabled'),
                              )}
                            />
                            <Button
                              title={account.type === 'Live' ? 'Reset Live' : 'Reset Demo'}
                              disabled={blocked || !['Demo', 'Live'].includes(account.type)}
                              onPress={() => ask(
                                account.type === 'Live'
                                  ? `Reset ${account.name || 'this live account'} balance to $0?`
                                  : `Reset ${user.name}'s demo account to $5,000 and clear open positions?`,
                                () => onReset(user, account),
                              )}
                            />
                            <Button title="View Wallet" disabled={blocked} onPress={() => onWallet(user, account)} />
                            <Button title="Transactions" disabled={blocked} onPress={() => onTransactions(user, account)} />
                            {canRemoveAccount ? <Button title="Delete Account" danger disabled={blocked || !canToggleAccount} onPress={() => ask(`Delete ${account.name || account.type || 'this'} account for ${user.name || user.email}? Open and pending positions will be removed. This cannot be undone.`, () => onDeleteTradingAccount(user, account))} /> : null}
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
        {!users.length ? <Text className="rounded-2xl border p-6 text-center" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16, color: colors.muted }}>No user accounts found.</Text> : null}
      </View>
    );
  }

  const tableHeight = 'calc(100vh - 260px)';

  return (
    <View className="overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16, maxHeight: tableHeight }}>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={true}>
        <ScrollView
          className="deep-green-scrollbar"
          nestedScrollEnabled
          stickyHeaderIndices={[0]}
          showsVerticalScrollIndicator={true}
          style={{ maxHeight: tableHeight, ...(Platform.OS === 'web' ? { overflowY: 'scroll', scrollbarGutter: 'stable' } : {}) }}
          contentContainerStyle={{ minWidth: 1165, paddingRight: Platform.OS === 'web' ? 10 : 0 }}
        >
          <StickyTableHeader style={{ minWidth: 1165 }}>
            <Header width={220}>Client Account</Header>
            <Header width={320}>Account & Controls</Header>
            <Header width={130}>Deposit</Header>
            <Header width={130}>Bonus</Header>
            <Header width={130}>Balance</Header>
            <Header width={120}>Equity</Header>
            <Header width={115}>Status</Header>
          </StickyTableHeader>
          {users.map((user) => {
            const accounts = user.tradingAccounts?.length
              ? sortTradingAccounts(user.tradingAccounts)
              : [{ id: `user-${user.id}`, name: `${user.accountType || 'Demo'} account`, type: user.accountType || 'Demo', balance: user.wallet?.balance, status: user.tradingStatus }];
            const expanded = Boolean(expandedUsers[user.id]);
            const referralsExpanded = Boolean(expandedReferrals[user.id]);
            const referrals = user.referrals || [];
            const demoCount = accounts.filter((account) => account.type === 'Demo').length;
            const liveCount = accounts.filter((account) => account.type === 'Live').length;
            const totalBalance = accounts
              .filter((account) => account.type === 'Live')
              .reduce((sum, account) => sum + Number(account.balance || 0), 0);
            const walletOpenProfit = Number(user.wallet?.openProfit || 0);
            const totalEquity = totalBalance + walletOpenProfit;
            const totalDeposit = liveAccountTotalFor(user, accounts, depositTotalFor);
            const totalBonus = liveAccountTotalFor(user, accounts, bonusTotalFor);
            const summaryFrozen = allAccountsFrozen(accounts, user);
            const summaryStatus = summaryFrozen ? 'frozen' : user.tradingStatus === 'frozen' ? 'frozen' : 'active';
            const summaryAccount = {
              id: `summary-${user.id}`,
              name: 'Wallet summary',
              type: `${demoCount} Demo / ${liveCount} Live`,
              balance: totalBalance,
              deposit: totalDeposit,
              bonus: totalBonus,
              equity: totalEquity,
              status: summaryStatus,
              isSummary: true,
            };
            const visibleAccounts = expanded ? accounts : [summaryAccount];
            const canRemoveAccount = canDeleteTradingAccounts && accounts.length > 1;

            return (
              <View key={user.id} className="flex-row border-b" style={{ borderColor: colors.border }}>
                <View style={{ width: 220 }} className="px-3 py-4">
                  <View className="flex-row items-center gap-1.5">
                    {isOnlineUser(user) ? (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                    ) : null}
                    <Text className="min-w-0 flex-1 font-semimedium" numberOfLines={1} style={{ color: colors.text }}>{user.name}</Text>
                  </View>
                  <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{user.email}</Text>
                  <Text className="mt-2 text-[11px]" style={{ color: colors.muted }}>Referral Code: {user.referralCode || '-'}</Text>
                  <Text className="mt-1 text-[11px] text-primary">
                    Referred by: {user.referrer?.name || user.referrer?.email || 'Direct signup'}
                  </Text>
                  <AccountsDropdown count={accounts.length} expanded={expanded} onPress={() => toggleAccounts(user.id)} />
                  <ReferralsDropdown count={referrals.length} expanded={referralsExpanded} onPress={() => toggleReferrals(user.id)} />
                  {referralsExpanded ? <ReferralList referrals={referrals} /> : null}
                </View>
                <View>
                  {visibleAccounts.map((account, accountIndex) => {
                    const blocked = busyId === user.id;
                    const accountBalance = account.isSummary ? account.balance : account.balance;
                    const equity = account.isSummary ? account.equity : accountBalance;
                    const deposit = account.isSummary ? account.deposit : depositTotalFor(user, account);
                    const bonus = account.isSummary ? account.bonus : bonusTotalFor(user, account);
                    const status = account.status || user.tradingStatus;
                    const frozen = accountIsFrozen({ status });
                    const canToggleAccount = !account.isSummary && Number.isFinite(Number(account.id));

                    return (
                      <View key={account.id} className={`flex-row ${accountIndex > 0 ? 'border-t' : ''}`} style={{ borderColor: colors.border }}>
                        <View style={{ width: 320, backgroundColor: account.type === 'Live' ? `${colors.primary}0D` : 'transparent' }} className="px-3 py-4">
                          <View className="flex-row items-center justify-between"><View className="min-w-0 flex-1"><Text className="text-sm font-semimedium" style={{ color: colors.text }}>{!account.isSummary && Number.isFinite(Number(account.id)) ? `#${String(account.id).padStart(6, '0')} · ${account.name}` : account.name}</Text></View>{account.type === 'Live' ? <Text className="rounded-full px-2 py-1 text-[9px] font-bold uppercase" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>Live</Text> : null}</View>
                          <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{account.isSummary ? account.type : `${account.type} Account`}</Text>
                          <View className="mt-3 flex-row flex-wrap">
                            {account.isSummary ? <><FreezeSwitch frozen={summaryFrozen} disabled={blocked} onPress={() => ask(`${summaryFrozen ? 'Unfreeze' : 'Freeze'} all trading accounts for ${user.name || user.email}?`, () => onTradingStatus(user, summaryFrozen ? 'active' : 'frozen'))} /><Text className="py-2 text-xs" style={{ color: colors.muted }}>All accounts</Text></> : <>
                              <Button title="Deposit" disabled={blocked} onPress={() => onBalance(user, 'add_balance', account)} />
                              <Button title="Withdrawal" danger disabled={blocked} onPress={() => onBalance(user, 'deduct_balance', account)} />
                              <FreezeSwitch frozen={frozen} disabled={blocked || status === 'pending' || !canToggleAccount} onPress={() => ask(`${frozen ? 'Unfreeze' : 'Freeze'} ${account.name || account.type || 'this'} account for ${user.name || user.email}?`, () => onTradingAccountStatus(user, account, frozen ? 'active' : 'disabled'))} />
                              <Button title={account.type === 'Live' ? 'Reset Live' : 'Reset Demo'} disabled={blocked || !['Demo', 'Live'].includes(account.type)} onPress={() => ask(account.type === 'Live' ? `Reset ${account.name || 'this live account'} balance to $0?` : `Reset ${user.name}'s demo account to $5,000 and clear open positions?`, () => onReset(user, account))} />
                              <Button title="View Wallet" disabled={blocked} onPress={() => onWallet(user, account)} />
                              <Button title="Transactions" disabled={blocked} onPress={() => onTransactions(user, account)} />
                              {canRemoveAccount ? <Button title="Delete Account" danger disabled={blocked || !canToggleAccount} onPress={() => ask(`Delete ${account.name || account.type || 'this'} account for ${user.name || user.email}? Open and pending positions will be removed. This cannot be undone.`, () => onDeleteTradingAccount(user, account))} /> : null}
                            </>}
                          </View>
                        </View>
                        <TextCell width={130}>{`$${money(deposit)}`}</TextCell>
                        <TextCell width={130}>{`$${money(bonus)}`}</TextCell>
                        <TextCell width={130}>{`$${money(accountBalance)}`}</TextCell>
                        <TextCell width={120}>{`$${money(equity)}`}</TextCell>
                        <TextCell width={115} className={status === 'active' ? 'text-success' : status === 'pending' ? 'text-primary' : 'text-danger'}>{status === 'active' ? 'Active' : status === 'pending' ? 'Pending' : 'Frozen'}</TextCell>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
          {!users.length ? <Text className="p-8 text-center" style={{ color: colors.muted }}>No user accounts found.</Text> : null}
        </ScrollView>
      </ScrollView>
    </View>
  );
}
