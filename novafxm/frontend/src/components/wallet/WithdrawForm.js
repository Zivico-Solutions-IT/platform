import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import CustomButton from '../common/CustomButton';
import { dateTime, money } from '../../utils/formatters';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';

function Option({ active, label, onPress, colors }) {
  const darkMode = colors.mode === 'dark';
  return (
    <Pressable
      onPress={onPress}
      className="h-9 flex-1 items-center justify-center rounded-[10px] border px-3"
      style={{ backgroundColor: active ? (darkMode ? '#3A2F12' : '#FBF3E2') : (darkMode ? colors.surface : '#FFFFFF'), borderColor: active ? '#D9AC38' : (darkMode ? colors.border : '#E4E1D8') }}
    >
      <Text className="text-[12px]" style={{ color: active ? (darkMode ? '#E8C95A' : '#8A6A1E') : (darkMode ? colors.text : '#5C635A'), fontWeight: active ? '600' : '500' }}>{label}</Text>
    </Pressable>
  );
}

function DetailOption({ active, detail, onPress, colors }) {
  const darkMode = colors.mode === 'dark';
  const isCrypto = ['TRC20', 'BEP20'].includes(detail.payoutType);
  const isTrc20 = detail.payoutType === 'TRC20';
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-[14px] border px-3 py-2.5"
      style={{ backgroundColor: active ? (darkMode ? '#3A2F12' : '#FBF3E2') : (darkMode ? colors.surface : '#FFFFFF'), borderColor: active ? '#D9AC38' : (darkMode ? colors.border : '#E4E1D8') }}
    >
      <View className="h-8 w-8 items-center justify-center rounded-[9px]" style={{ backgroundColor: isTrc20 ? '#F5A623' : detail.payoutType === 'BEP20' ? '#F0B90B' : '#7C8592' }}>
        <Text className="text-xs font-bold text-white">{isTrc20 ? 'T' : detail.payoutType === 'BEP20' ? 'B' : 'B'}</Text>
      </View>
      <View className="ml-2.5 min-w-0 flex-1">
        <Text className="text-[12px] font-semibold" numberOfLines={1} style={{ color: colors.text }}>
          {isCrypto ? `USDT ${detail.payoutType}` : detail.bankName}
        </Text>
        <Text className="mt-0.5 text-[10px]" numberOfLines={1} selectable style={{ color: colors.muted }}>
          {isCrypto ? detail.bankAccountNumber : detail.bankAccountHolder}
        </Text>
      </View>
      <View className="h-[18px] w-[18px] items-center justify-center rounded-full" style={{ backgroundColor: active ? '#D9AC38' : (darkMode ? colors.surface : '#FFFFFF'), borderWidth: active ? 0 : 1.5, borderColor: darkMode ? colors.border : '#D6DAE0' }}>
        {active ? <Check size={11} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}

function InfoTile({ label, value, tone, colors, mobile }) {
  return (
    <View
      className={`${mobile ? 'p-2.5 rounded-[10px]' : 'p-4 rounded-2xl'} flex-1 border`}
      style={{
        minWidth: mobile ? 110 : 145,
        backgroundColor: colors.surface,
        borderColor: colors.border
      }}
    >
      <Text className="text-[9px] uppercase tracking-wider" style={{ color: colors.muted }} numberOfLines={1}>
        {label}
      </Text>
      <Text className={`${mobile ? 'mt-1 text-[12px]' : 'mt-2 text-base'} font-semibold`} style={{ color: tone || colors.text }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function WithdrawalHistory({ withdrawals, colors, mobile }) {
  return (
    <View className="mt-4 rounded-[14px] border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <Text className="mb-1 text-center text-[12px] font-semibold" style={{ color: colors.text }}>Withdrawal history</Text>
      {withdrawals.length ? (
        mobile ? (
          <View className="gap-3">
            {withdrawals.map((item) => (
              <View key={item.id} className="rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-xs" style={{ color: colors.muted }}>{dateTime(item.createdAt)}</Text>
                    <Text className="mt-1 text-sm font-medium" style={{ color: colors.text }}>{item.withdrawalMethod || (item.description?.toLowerCase().includes('crypto') ? 'Crypto' : 'Bank')}</Text>
                  </View>
                  <Text className="text-sm font-semimedium" style={{ color: colors.text }}>{money(item.amount)} USD</Text>
                </View>
                <Text className="mt-2 self-start rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ backgroundColor: colors.surface, color: ['approved', 'completed'].includes(item.status) ? colors.success : item.status === 'rejected' ? colors.danger : colors.primary }}>
                  {item.status}
                </Text>
              </View>
            ))}
          </View>
        ) : (
        <View className="overflow-hidden rounded-2xl border" style={{ borderColor: colors.border }}>
          <View className="flex-row px-4 py-3" style={{ backgroundColor: colors.panel }}>
            <Text className="flex-[1.4] text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Date</Text>
            <Text className="flex-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Method</Text>
            <Text className="flex-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Amount</Text>
            <Text className="flex-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Status</Text>
          </View>
          {withdrawals.map((item) => (
            <View key={item.id} className="flex-row border-t px-4 py-4" style={{ borderColor: colors.border }}>
              <Text className="flex-[1.4] text-xs" style={{ color: colors.muted }}>{dateTime(item.createdAt)}</Text>
              <Text className="flex-1 text-xs" style={{ color: colors.text }}>{item.withdrawalMethod || (item.description?.toLowerCase().includes('crypto') ? 'Crypto' : 'Bank')}</Text>
              <Text className="flex-1 text-xs font-semimedium" style={{ color: colors.text }}>{money(item.amount)} USD</Text>
              <Text className="flex-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: ['approved', 'completed'].includes(item.status) ? colors.success : item.status === 'rejected' ? colors.danger : colors.primary }}>
                {item.status}
              </Text>
            </View>
          ))}
        </View>
        )
      ) : <Text className="text-center text-[10px]" style={{ color: colors.muted }}>No withdrawal requests yet.</Text>}
    </View>
  );
}

export default function WithdrawForm({
  onSubmit,
  loading,
  disabled,
  disabledMessage,
  summary = {},
  transactions = [],
  onMissingDetailsPress,
  onVerificationRequired,
  selectedAccount,
}) {
  const { width } = useWindowDimensions();
  const { colors, darkMode } = useAppTheme();
  const { user } = useAuth();
  const [form, setForm] = useState({
    amount: '',
    withdrawalMethod: 'Bank',
    savedDetailId: '',
  });
  const [cryptoNetwork, setCryptoNetwork] = useState('TRC20');
  const [message, setMessage] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [savedDetails, setSavedDetails] = useState([]);
  const accountType = selectedAccount?.type || user?.accountType || 'Demo';
  const liveAccountSelected = String(accountType).toLowerCase() === 'live';
  const mobile = width < 640;
  const withdrawals = useMemo(() => transactions.filter((item) => item.type === 'withdrawal'), [transactions]);
  const pendingWithdrawals = withdrawals
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const availableBalance = Number(summary.balance || 0);
  const withdrawableBalance = Math.max(availableBalance - pendingWithdrawals, 0);
  const methodDetails = useMemo(() => (
    savedDetails.filter((item) => (
      form.withdrawalMethod === 'Crypto'
        ? item.payoutType === cryptoNetwork
        : item.payoutType === 'Bank'
    ))
  ), [cryptoNetwork, form.withdrawalMethod, savedDetails]);
  const approvedMethodDetails = useMemo(() => (
    methodDetails.filter((item) => item.status === 'approved')
  ), [methodDetails]);
  const selectedSavedDetail = useMemo(() => (
    approvedMethodDetails.find((item) => String(item.id) === String(form.savedDetailId)) || null
  ), [approvedMethodDetails, form.savedDetailId]);
  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const setMethod = (withdrawalMethod) => {
    const matching = savedDetails.filter((item) => (
      withdrawalMethod === 'Crypto'
        ? item.payoutType === cryptoNetwork
        : item.payoutType === 'Bank'
    ));
    const detail = matching.find((item) => item.status === 'approved') || null;
    setForm((current) => ({
      ...current,
      withdrawalMethod,
      savedDetailId: detail?.id || '',
    }));
  };

  useEffect(() => {
    let active = true;
    if (!user) {
      setSavedDetails([]);
      return undefined;
    }
    authService.listBankAccounts()
      .then((result) => {
        if (!active) return;
        setSavedDetails((result.accounts || []).map((account) => ({
          id: account.id,
          bankAccountHolder: account.bankAccountHolder || account.accountHolderName || '',
          bankName: account.bankName || '',
          bankBranch: account.bankBranch || account.branchName || '',
          bankAccountNumber: account.bankAccountNumber || account.accountNumber || '',
          status: account.status || 'pending',
          payoutType: String(`${account.bankName || ''} ${account.bankBranch || account.branchName || ''}`).toLowerCase().includes('bep20')
            ? 'BEP20'
            : String(`${account.bankName || ''} ${account.bankBranch || account.branchName || ''}`).toLowerCase().includes('trc20')
              ? 'TRC20'
              : 'Bank',
        })));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    setForm((current) => {
      if (approvedMethodDetails.some((item) => String(item.id) === String(current.savedDetailId))) return current;
      return { ...current, savedDetailId: approvedMethodDetails[0]?.id || '' };
    });
  }, [approvedMethodDetails]);

  const submit = async () => {
    setSubmitAttempted(true);
    try {
      if (!liveAccountSelected) throw new Error('Withdrawals are available only from Live accounts. Demo accounts cannot withdraw.');
      if (disabled) throw new Error(disabledMessage || 'Withdrawals are unavailable.');
      const amount = Number(form.amount);
      if (!amount) throw new Error('Enter a valid withdrawal amount.');
      if (amount > withdrawableBalance) throw new Error('Withdrawal amount exceeds withdrawable balance.');
      let finalSubmitData = {};
      if (form.withdrawalMethod === 'Crypto') {
        if (!selectedSavedDetail) throw new Error(`Select an approved ${cryptoNetwork} wallet from Settings.`);
        finalSubmitData = {
          amount,
          withdrawalMethod: 'Crypto',
          tradingAccountId: selectedAccount?.id,
          bankAccountId: selectedSavedDetail.id,
          bankName: selectedSavedDetail.bankName,
          accountNumber: selectedSavedDetail.bankAccountNumber,
          accountHolderName: selectedSavedDetail.bankAccountHolder,
        };
      } else {
        if (!selectedSavedDetail) throw new Error('Select an approved bank withdrawal detail from Settings.');
        finalSubmitData = {
          amount,
          withdrawalMethod: 'Bank',
          tradingAccountId: selectedAccount?.id,
          bankAccountId: selectedSavedDetail.id,
          bankName: selectedSavedDetail.bankName,
          accountNumber: selectedSavedDetail.bankAccountNumber,
          accountHolderName: selectedSavedDetail.bankAccountHolder,
        };
      }
      await onSubmit(finalSubmitData);
      setMessage('Success: withdrawal request submitted. Status is Pending until admin approval.');
      setForm((current) => ({ ...current, amount: '' }));
    } catch (error) {
      setMessage(error.message || 'Withdrawal request could not be submitted.');
    }
  };
  const openPaymentDetails = () => {
    const payoutType = form.withdrawalMethod === 'Crypto' ? cryptoNetwork : 'Bank';
    if (onMissingDetailsPress) {
      onMissingDetailsPress(payoutType);
      return;
    }
    router.push({
      pathname: '/trading',
      params: { panel: 'settings', section: 'payments', returnTo: 'withdraw', payoutType },
    });
  };

  return (
    <View className={`${mobile ? 'p-3' : 'p-6'} flex-1`} style={{ backgroundColor: 'transparent' }}>
      <Text className="mb-3 text-[17px] font-semibold" style={{ color: colors.text }}>Withdraw Funds</Text>
      {!liveAccountSelected ? (
        <Text className="mb-4 rounded-2xl border p-4 text-sm" style={{ borderColor: colors.danger, backgroundColor: `${colors.danger}12`, color: colors.danger }}>
          Withdrawals are available only from Live accounts. Demo accounts cannot withdraw.
        </Text>
      ) : null}

      <View className="mb-5 flex-row flex-wrap gap-3">
        <InfoTile label="Available Balance" value={`${money(availableBalance)} USD`} colors={colors} mobile={mobile} />
        <InfoTile label="Withdrawable Balance" value={`${money(withdrawableBalance)} USD`} colors={colors} mobile={mobile} />
      </View>

      <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Withdrawal Method</Text>
      <View className="mb-4 flex-row gap-3">
        <Option active={form.withdrawalMethod === 'Bank'} label="Bank" onPress={() => setMethod('Bank')} colors={colors} />
        <Option active={form.withdrawalMethod === 'Crypto'} label="Crypto" onPress={() => setMethod('Crypto')} colors={colors} />
      </View>

      <View className="mb-3">
        <Text className="mb-2 text-[11px] uppercase tracking-[0.5px]" style={{ color: colors.muted }}>Amount</Text>
        <View className="flex-row items-center rounded-[16px] border px-4 py-3.5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <Text className="mr-1 text-xl font-semibold" style={{ color: '#B8891E' }}>$</Text>
          <TextInput
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={form.amount}
            onChangeText={update('amount')}
            className="flex-1 text-xl font-semibold"
            style={{ color: colors.text, padding: 0, margin: 0, outline: 'none' }}
          />
          <View className="rounded-lg px-2 py-1" style={{ backgroundColor: colors.panel }}>
            <Text className="text-xs" style={{ color: colors.muted }}>USD</Text>
          </View>
        </View>
      </View>
      {form.withdrawalMethod === 'Crypto' ? (
        <View className="mb-4 mt-2">
          <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Crypto Network</Text>
          <View className="mb-4 gap-2">
            {[
              ['TRC20', 'TRON network · ~1 min confirm', 'T', '#F5A623'],
              ['BEP20', 'BNB Smart Chain', 'B', '#F0B90B'],
            ].map(([network, description, initial, accent]) => {
              const active = cryptoNetwork === network;
              return (
                <Pressable
                  key={network}
                  onPress={() => setCryptoNetwork(network)}
                  className="flex-row items-center rounded-[14px] border px-[14px] py-3"
                  style={{ backgroundColor: active ? (darkMode ? '#3A2F12' : '#FBF3E2') : colors.surface, borderColor: active ? '#D9AC38' : colors.border }}
                >
                  <View className="h-[34px] w-[34px] items-center justify-center rounded-[9px]" style={{ backgroundColor: accent }}>
                    <Text className="text-xs font-bold text-white">{initial}</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-semibold" style={{ color: colors.text }}>{network}</Text>
                    <Text className="mt-0.5 text-[11px]" style={{ color: colors.muted }}>{description}</Text>
                  </View>
                  <View className="h-[18px] w-[18px] items-center justify-center rounded-full" style={{ backgroundColor: active ? '#D9AC38' : colors.surface, borderWidth: active ? 0 : 1.5, borderColor: colors.border }}>
                    {active ? <Check size={11} color="#FFFFFF" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
        Select saved {form.withdrawalMethod === 'Crypto' ? 'crypto wallet' : 'bank'} details
      </Text>
      <View className="mb-4 gap-3">
        {approvedMethodDetails.map((detail) => (
          <DetailOption
            key={detail.id}
            active={String(form.savedDetailId) === String(detail.id)}
            detail={detail}
            onPress={() => update('savedDetailId')(detail.id)}
            colors={colors}
          />
        ))}
        {submitAttempted && !approvedMethodDetails.length ? (
          <Pressable
            onPress={openPaymentDetails}
            className="rounded-2xl border p-4"
            style={{ borderColor: colors.primary, backgroundColor: colors.surface }}
          >
            <Text className="text-sm" style={{ color: colors.text }}>
              Add and get approval for {form.withdrawalMethod === 'Crypto' ? 'crypto wallet' : 'bank account'} details in Settings before requesting a withdrawal.
            </Text>
            <Text className="mt-2 text-xs font-medium" style={{ color: colors.primary }}>Open payment details</Text>
          </Pressable>
        ) : null}
        {methodDetails.some((detail) => detail.status !== 'approved') ? (
          <Text className="text-xs" style={{ color: colors.muted }}>
            Pending or rejected details stay in Settings until admin approval.
          </Text>
        ) : null}
      </View>
      <CustomButton
        title="Request Withdrawal"
        onPress={submit}
        loading={loading}
        disabled={loading}
        variant="secondary"
        compact
        style={{ backgroundColor: '#D9AC38', borderColor: '#D9AC38' }}
      />
      {message ? (
        /verification approval is required/i.test(message) && onVerificationRequired ? (
          <Pressable
            onPress={onVerificationRequired}
            className="mt-3 rounded-xl border px-3 py-2.5"
            style={{ backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}35` }}
          >
            <Text className="text-sm" style={{ color: colors.danger }}>{message}</Text>
            <Text className="mt-1 text-xs font-semibold" style={{ color: colors.primary }}>Open verification →</Text>
          </Pressable>
        ) : <Text className={`mt-3 text-sm ${message.startsWith('Success') ? 'text-success' : 'text-danger'}`}>{message}</Text>
      ) : null}
      <WithdrawalHistory withdrawals={withdrawals} colors={colors} mobile={mobile} />
    </View>
  );
}
