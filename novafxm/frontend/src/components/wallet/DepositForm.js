import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import {
  BadgeIndianRupee,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  IndianRupee,
  Landmark,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  Wallet,
  WalletCards,
  X,
} from 'lucide-react-native';
import CustomButton from '../common/CustomButton';
import CustomInput from '../common/CustomInput';
import { useAppTheme } from '../../context/ThemeContext';
import { walletService } from '../../services/walletService';

const paymentMethods = [
  { label: 'TRC20', description: 'TRC20 network transfer', icon: WalletCards, accent: '#EF0027' },
  { label: 'BEP20', description: 'BEP20 network transfer', icon: WalletCards, accent: '#F3BA2F' },
  { label: 'ERC20', description: 'ERC20 network transfer', icon: WalletCards, accent: '#627EEA' },
  { label: 'Bank Transfer', description: 'Direct bank transfer', icon: Landmark, accent: '#6B7280' },
];

const paymentMethodGroups = [
  { title: 'Crypto', subtitle: 'Wallet and chain transfers', icon: WalletCards, accent: '#D4AF37', methods: ['TRC20', 'BEP20', 'ERC20'] },
  { title: 'Bank', subtitle: 'Direct bank rails', icon: Landmark, accent: '#38BDF8', methods: ['Bank Transfer'] },
].map((group) => ({
  ...group,
  methods: group.methods
    .map((label) => paymentMethods.find((method) => method.label === label))
    .filter(Boolean),
}));
const paymentPanelAccent = '#38BDF8';

const depositRules = {
  USD: {
    minimum: 100,
    quickAmounts: [100, 250, 500, 1000],
  },
  INR: {
    minimum: 10000,
    quickAmounts: [10000, 25000, 50000, 100000],
  },
};
const displayCurrencies = [
  { code: 'USD', symbol: '$' },
];

function fileName(file) {
  return file?.name || 'Receipt selected';
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const qrUrl = (value) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value || '')}`;

export default function DepositForm({ onSubmit, loading, disabled, disabledMessage }) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const receiptInputRef = useRef(null);
  const [form, setForm] = useState({ amount: '', paymentMethod: 'TRC20', note: '' });
  const [selectedCurrency, setSelectedCurrency] = useState(displayCurrencies[0]);
  const [step, setStep] = useState(1);
  const [depositAddresses, setDepositAddresses] = useState([]);
  const [assignedAddress, setAssignedAddress] = useState(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [focusAmount, setFocusAmount] = useState(false);
  const [selectedPaymentGroup, setSelectedPaymentGroup] = useState(paymentMethodGroups[0].title);
  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const copyAddress = async () => {
    if (!assignedAddress?.address) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(assignedAddress.address);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address', err);
    }
  };

  const copySingleField = async (text, key) => {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const parsedBankItems = useMemo(() => {
    if (!assignedAddress?.address) return [];
    const raw = assignedAddress.address;
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => {
      let key = '';
      let val = line;
      if (line.includes(':-')) {
        const parts = line.split(':-');
        key = parts[0].trim();
        val = parts.slice(1).join(':-').trim();
      } else if (line.includes(' - ')) {
        const parts = line.split(' - ');
        key = parts[0].trim();
        val = parts.slice(1).join(' - ').trim();
      } else if (line.includes('-')) {
        const parts = line.split('-');
        key = parts[0].trim();
        val = parts.slice(1).join('-').trim();
      } else if (line.includes(':')) {
        const parts = line.split(':');
        key = parts[0].trim();
        val = parts.slice(1).join(':').trim();
      }
      return { label: key, value: val };
    });
  }, [assignedAddress?.address]);
  const openReceiptPicker = () => {
    if (Platform.OS === 'web') receiptInputRef.current?.click();
  };

  const receiptPreviewUrl = useMemo(() => {
    if (!receipt) return null;
    if (typeof receipt === 'string') return receipt;
    if (receipt.uri) return receipt.uri;
    if (typeof URL !== 'undefined' && URL.createObjectURL && (receipt instanceof Blob || receipt instanceof File)) {
      try {
        return URL.createObjectURL(receipt);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [receipt]);
  const selectedMethod = paymentMethods.find((method) => method.label === form.paymentMethod) || paymentMethods[0];
  const activePaymentGroup = paymentMethodGroups.find((group) => group.title === selectedPaymentGroup) || paymentMethodGroups[0];
  const ActivePaymentGroupIcon = activePaymentGroup.icon;
  const isBankMethod = form.paymentMethod === 'Bank Transfer' || activePaymentGroup.title === 'Bank';
  const selectedDepositRule = depositRules[selectedCurrency.code] || depositRules.USD;
  const selectedMethodAddresses = depositAddresses.filter((item) => {
    if (item.isActive === false) return false;
    const a = String(item.paymentMethod || '').trim().toLowerCase();
    const b = String(form.paymentMethod || '').trim().toLowerCase();
    if (a === b) return true;
    if (['usdt', 'trc20', 'bep20', 'erc20', 'crypto'].includes(a) && ['usdt', 'trc20', 'bep20', 'erc20', 'crypto'].includes(b)) {
      return a === b || a === 'usdt' || b === 'usdt' || a === 'crypto' || b === 'crypto';
    }
    if (['bank', 'bank transfer', 'rtgs', 'neft', 'imps', 'net banking'].includes(a) && ['bank', 'bank transfer', 'rtgs', 'neft', 'imps', 'net banking'].includes(b)) {
      return true;
    }
    return false;
  });
  const mobile = width < 640;
  const activeMethodBasis = mobile ? '48.5%' : activePaymentGroup.methods.length <= 3 ? '31.5%' : '23.5%';

  const selectPaymentGroup = (group) => {
    setSelectedPaymentGroup(group.title);
    if (!group.methods.some((method) => method.label === form.paymentMethod)) {
      update('paymentMethod')(group.methods[0]?.label || form.paymentMethod);
    }
  };

  useEffect(() => {
    let mounted = true;
    setAddressesLoading(true);
    walletService.getDepositMethods()
      .then((result) => {
        if (mounted) setDepositAddresses(result.addresses || []);
      })
      .catch(() => {
        if (mounted) setDepositAddresses([]);
      })
      .finally(() => {
        if (mounted) setAddressesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const chooseAddress = () => {
    const rawVal = String(form.amount || '').trim();
    const amountVal = Number(rawVal);
    if (!rawVal || isNaN(amountVal) || amountVal <= 0) {
      setMessage('Please enter a deposit amount before proceeding.');
      setSuccess(false);
      return;
    }
    if (!form.paymentMethod) {
      setMessage('Select a payment method.');
      setSuccess(false);
      return;
    }
    if (!selectedMethodAddresses.length) {
      setMessage(`No active deposit address is configured for ${form.paymentMethod}. Please contact support.`);
      setSuccess(false);
      return;
    }
    const randomIndex = Math.floor(Math.random() * selectedMethodAddresses.length);
    setAssignedAddress(selectedMethodAddresses[randomIndex]);
    setMessage('');
    setSuccess(false);
    setStep(2);
  };

  const returnToDetails = () => {
    setStep(1);
    setAssignedAddress(null);
    setReceipt(null);
  };

  const submit = async () => {
    try {
      setSuccess(false);
      if (disabled) throw new Error(disabledMessage || 'Deposits are unavailable.');
      const rawVal = String(form.amount || '').trim();
      const amountVal = Number(rawVal);
      if (!rawVal || isNaN(amountVal) || amountVal <= 0) throw new Error('Please enter a valid deposit amount.');
      if (!receipt) throw new Error('Receipt is required.');
      if (!assignedAddress) throw new Error('Proceed first to get a deposit address.');
      const receiptImage = receipt ? await readFileDataUrl(receipt) : null;
      await onSubmit({
        ...form,
        amount: amountVal,
        currency: selectedCurrency.code,
        referenceNumber: 'N/A',
        receiptImage,
        depositAddressId: assignedAddress.id,
        depositAddress: assignedAddress.address,
      });
      setMessage('Deposit request submitted for approval.');
      setSuccess(true);
      setForm({ amount: '', paymentMethod: 'TRC20', note: '' });
      setStep(1);
      setAssignedAddress(null);
      setReceipt(null);
    } catch (error) {
      setMessage(error.message);
      setSuccess(false);
    }
  };
  return (
    <View className="flex-1 overflow-hidden rounded-3xl border shadow-lg" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
      <View className={`${mobile ? 'px-4 py-4' : 'px-5 py-4'} border-b`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1 pr-3">
            <Text className={`${mobile ? 'text-lg' : 'text-xl'} font-medium`} numberOfLines={1} style={{ color: colors.text }}>Deposit Funds</Text>
            <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Submit a funding request with receipt proof.</Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Wallet size={22} color="#D4AF37" />
          </View>
        </View>
      </View>

      <View className={`${mobile ? 'gap-3 p-4' : 'gap-5 p-5'} xl:flex-row`}>
        <View className="flex-1">
          <View className={`${mobile ? 'mb-3' : 'mb-4'} flex-row flex-wrap gap-2`}>
            {[
              [1, 'Deposit Methods'],
              [2, 'Deposit Confirmation'],
            ].map(([value, label]) => (
              <View
                key={value}
                className="flex-row items-center rounded-full border px-3 py-2"
                style={{ backgroundColor: step === value ? `${colors.primary}1a` : colors.surface, borderColor: step === value ? colors.primary : colors.border }}
              >
                <Text className="text-xs font-medium" style={{ color: step === value ? colors.primary : colors.muted }}>{value}. {label}</Text>
              </View>
            ))}
          </View>
          <View className={`${mobile ? 'mb-3' : 'mb-4'}`}>
            <Text className="text-[11px] font-medium uppercase tracking-wider" style={{ color: colors.muted }}>Deposit Amount</Text>
            <View
              className="mt-2 flex-row items-center rounded-2xl border px-3.5 py-2.5"
              style={{
                backgroundColor: colors.surface,
                borderColor: focusAmount ? colors.primary : colors.border,
                shadowColor: focusAmount ? colors.primary : '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: focusAmount ? 0.15 : 0.03,
                shadowRadius: 4,
              }}
            >
              <Text className="text-base font-normal mr-1.5" style={{ color: colors.primary }}>$</Text>
              <TextInput
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                value={form.amount}
                onChangeText={(val) => {
                  update('amount')(val);
                  if (message) setMessage('');
                }}
                onFocus={() => setFocusAmount(true)}
                onBlur={() => setFocusAmount(false)}
                editable={step === 1}
                className="flex-1 text-base font-normal"
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: '400',
                  outline: 'none',
                  padding: 0,
                  margin: 0,
                }}
              />
              <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: `${colors.primary}15` }}>
                <Text className="text-[11px] font-normal" style={{ color: colors.primary }}>USD</Text>
              </View>
            </View>
            {message && !success ? (
              <View className="mt-2.5 rounded-xl border p-3" style={{ backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}40` }}>
                <Text className="text-xs font-semibold" style={{ color: colors.danger }}>{message}</Text>
              </View>
            ) : null}
          </View>

          {step === 1 ? (
            <>
              <Text className={`${mobile ? 'mb-2' : 'mb-3'} text-[11px] font-bold uppercase tracking-wider`} style={{ color: colors.muted }}>Payment Method</Text>
              <View className={`${mobile ? 'mb-2' : 'mb-3'}`}>
                {mobile ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {paymentMethodGroups.map((group) => {
                      const GroupIcon = group.icon;
                      const active = activePaymentGroup.title === group.title;
                      return (
                        <Pressable
                          key={group.title}
                          onPress={() => selectPaymentGroup(group)}
                          className="min-h-[34px] flex-row items-center rounded-full border px-3"
                          style={{
                            backgroundColor: active ? `${colors.primary}20` : colors.surface,
                            borderColor: active ? colors.primary : colors.border,
                          }}
                        >
                          <GroupIcon size={13} color={active ? colors.primary : group.accent} />
                          <Text className="ml-1.5 text-[11px] font-medium" style={{ color: active ? colors.primary : colors.text }}>{group.title}</Text>
                          <Text className="ml-1 text-[9px]" style={{ color: active ? colors.primary : colors.muted }}>({group.methods.length})</Text>
                          {active ? <CheckCircle2 className="ml-1.5" size={13} color={colors.primary} /> : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {paymentMethodGroups.map((group) => {
                      const GroupIcon = group.icon;
                      const active = activePaymentGroup.title === group.title;
                      return (
                        <Pressable
                          key={group.title}
                          onPress={() => selectPaymentGroup(group)}
                          className="min-h-[34px] flex-row items-center rounded-full border px-3 py-1.5"
                          style={{
                            backgroundColor: active ? `${colors.primary}20` : colors.surface,
                            borderColor: active ? colors.primary : colors.border,
                          }}
                        >
                          <GroupIcon size={13} color={active ? colors.primary : group.accent} />
                          <Text className="ml-1.5 text-[11px] font-medium" numberOfLines={1} style={{ color: active ? colors.primary : colors.text }}>{group.title}</Text>
                          <Text className="ml-1 text-[9px]" style={{ color: active ? colors.primary : colors.muted }}>({group.methods.length})</Text>
                          {active ? <CheckCircle2 className="ml-1.5" size={13} color={colors.primary} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
              <View className={`${mobile ? 'mb-4' : 'mb-5'} rounded-xl border p-3`} style={{ backgroundColor: `${paymentPanelAccent}0d`, borderColor: `${paymentPanelAccent}35` }}>
                <View className="mb-3 flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1 flex-row items-center">
                    <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${paymentPanelAccent}1f` }}>
                      <ActivePaymentGroupIcon size={18} color={paymentPanelAccent} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-medium" numberOfLines={1} style={{ color: colors.text }}>{activePaymentGroup.title}</Text>
                      <Text className="mt-0.5 text-[10px]" numberOfLines={1} style={{ color: colors.muted }}>{activePaymentGroup.subtitle}</Text>
                    </View>
                  </View>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${paymentPanelAccent}20` }}>
                    <Text className="text-[10px] font-medium" style={{ color: paymentPanelAccent }}>{activePaymentGroup.methods.length} methods</Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {activePaymentGroup.methods.map(({ label, description, icon: Icon, accent: methodAccent }) => {
                    const selected = form.paymentMethod === label;
                    return (
                      <Pressable
                        key={label}
                        onPress={() => update('paymentMethod')(label)}
                        className="min-h-[68px] rounded-lg border p-2.5"
                        style={{
                          flexBasis: activeMethodBasis,
                          maxWidth: activeMethodBasis,
                          backgroundColor: selected ? `${colors.primary}24` : colors.panel,
                          borderColor: selected ? colors.primary : `${paymentPanelAccent}2b`,
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${methodAccent || activePaymentGroup.accent}16` }}>
                            <Icon size={16} color={methodAccent || activePaymentGroup.accent} />
                          </View>
                          {selected ? (
                            <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
                              <CheckCircle2 size={12} color="#0B0B0B" />
                            </View>
                          ) : null}
                        </View>
                        <Text numberOfLines={1} className="mt-2 text-[11px] font-medium" style={{ color: selected ? colors.primary : colors.text }}>{label}</Text>
                        <Text numberOfLines={1} className="mt-0.5 text-[9px]" style={{ color: colors.muted }}>{description}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <CustomButton title={addressesLoading ? 'Loading Methods...' : 'Proceed'} onPress={chooseAddress} loading={addressesLoading} disabled={disabled || addressesLoading} />
            </>
          ) : (
            <>
              <View className="mb-5 rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <View className="mb-4 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Send Payment To</Text>
                    <Text className="mt-1 text-base font-medium" style={{ color: colors.text }}>{selectedMethod.label}</Text>
                  </View>
                  <Pressable onPress={returnToDetails} className="rounded-lg border px-3 py-2" style={{ borderColor: colors.border }}>
                    <Text className="text-xs font-medium" style={{ color: colors.text }}>Back</Text>
                  </Pressable>
                </View>
                <View className="gap-4 md:flex-row">
                  {!isBankMethod ? (
                    <View className="items-center rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                      <Image source={{ uri: qrUrl(assignedAddress?.qrData || assignedAddress?.address) }} style={{ width: mobile ? 150 : 180, height: mobile ? 150 : 180, borderRadius: 12 }} resizeMode="contain" />
                    </View>
                  ) : null}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>{isBankMethod ? 'Bank Account Details' : 'Wallet ID'}</Text>
                      {isBankMethod ? (
                        <Pressable
                          onPress={copyAddress}
                          className="flex-row items-center rounded-lg border px-2.5 py-1"
                          style={{ backgroundColor: copied ? `${colors.primary}20` : colors.surface, borderColor: copied ? colors.primary : colors.border }}
                        >
                          {copied ? (
                            <>
                              <Check size={12} color={colors.primary} />
                              <Text className="ml-1 text-xs font-medium" style={{ color: colors.primary }}>Copied All!</Text>
                            </>
                          ) : (
                            <>
                              <Copy size={12} color={colors.primary} />
                              <Text className="ml-1 text-xs font-medium" style={{ color: colors.primary }}>Copy All</Text>
                            </>
                          )}
                        </Pressable>
                      ) : null}
                    </View>

                    {isBankMethod ? (
                      <View className="mt-2 rounded-xl border px-3.5 py-2" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                        {parsedBankItems.length ? parsedBankItems.map((item, index) => (
                          <View
                            key={index}
                            className="flex-row items-center py-1.5 border-b last:border-b-0 last:pb-0 first:pt-0"
                            style={{ borderColor: `${colors.border}50` }}
                          >
                            <View className="flex-row items-center justify-between pr-2" style={{ width: mobile ? 132 : 142, flexShrink: 0 }}>
                              {item.label ? (
                                <>
                                  <Text className="text-[10px] font-bold uppercase tracking-wider flex-1 mr-1" numberOfLines={1} style={{ color: colors.muted }}>
                                    {item.label}
                                  </Text>
                                  <Text className="text-[10px] font-bold" style={{ color: colors.muted }}>:-</Text>
                                </>
                              ) : null}
                            </View>
                            <View className="flex-1 flex-row items-center flex-wrap min-w-0 pr-1">
                              <Text selectable className="text-xs font-semibold mr-1.5" style={{ color: colors.text }}>
                                {item.value}
                              </Text>
                              <Pressable
                                onPress={() => copySingleField(item.value, index)}
                                className="h-5 w-5 items-center justify-center rounded border"
                                style={{
                                  backgroundColor: copiedField === index ? `${colors.primary}20` : colors.surface,
                                  borderColor: copiedField === index ? colors.primary : colors.border,
                                  cursor: 'pointer',
                                }}
                              >
                                {copiedField === index ? (
                                  <Check size={10} color={colors.primary} />
                                ) : (
                                  <Copy size={10} color={colors.primary} />
                                )}
                              </Pressable>
                            </View>
                          </View>
                        )) : (
                          <Text selectable className="text-xs font-medium" style={{ color: colors.text }}>{assignedAddress?.address}</Text>
                        )}
                      </View>
                    ) : (
                      <View className="mt-2 flex-row items-center justify-between rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                        <Text selectable className="flex-1 pr-3 text-sm font-semimedium" style={{ color: colors.text }}>{assignedAddress?.address}</Text>
                        <Pressable
                          onPress={copyAddress}
                          className="flex-row items-center rounded-lg border px-3 py-1.5"
                          style={{ backgroundColor: copied ? `${colors.primary}20` : colors.surface, borderColor: copied ? colors.primary : colors.border }}
                        >
                          {copied ? (
                            <>
                              <Check size={14} color={colors.primary} />
                              <Text className="ml-1.5 text-xs font-medium" style={{ color: colors.primary }}>Copied!</Text>
                            </>
                          ) : (
                            <>
                              <Copy size={14} color={colors.primary} />
                              <Text className="ml-1.5 text-xs font-medium" style={{ color: colors.primary }}>Copy</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    )}
                    <Text className="mt-3 text-[11px] font-bold tracking-wider" style={{ color: colors.muted }}>Amount: {selectedSymbol}{form.amount} {selectedCurrency.code}</Text>
                    <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{selectedMethod.description}. Upload the receipt after completing the transfer.</Text>
                  </View>
                </View>
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium" style={{ color: colors.muted }}>Upload Receipt</Text>
                {receipt ? (
                  <View
                    className="rounded-2xl border p-4 shadow-sm"
                    style={{
                      backgroundColor: `${colors.success}12`,
                      borderColor: colors.success,
                    }}
                  >
                    {Platform.OS === 'web' ? (
                      <input
                        ref={receiptInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        type="file"
                        onChange={(event) => setReceipt(event.target.files?.[0] || null)}
                      />
                    ) : null}
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-row items-center gap-3 flex-1 min-w-0">
                        {receiptPreviewUrl ? (
                          <Image
                            source={{ uri: receiptPreviewUrl }}
                            style={{ width: 52, height: 52, borderRadius: 10, borderWidth: 1.5, borderColor: colors.success }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${colors.success}25` }}>
                            <CheckCircle2 size={24} color={colors.success} />
                          </View>
                        )}
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-center gap-1.5">
                            <CheckCircle2 size={15} color={colors.success} />
                            <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.success }}>
                              Receipt Attached
                            </Text>
                          </View>
                          <Text className="mt-1 text-sm font-semibold" numberOfLines={1} style={{ color: colors.text }}>
                            {fileName(receipt)}
                          </Text>
                          <Text className="text-[11px]" style={{ color: colors.muted }}>
                            Ready to submit with deposit request
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <Pressable
                          onPress={openReceiptPicker}
                          className="rounded-lg border px-3 py-1.5"
                          style={{ backgroundColor: colors.surface, borderColor: colors.border, cursor: 'pointer' }}
                        >
                          <Text className="text-xs font-medium" style={{ color: colors.text }}>Change</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setReceipt(null)}
                          className="h-8 w-8 items-center justify-center rounded-lg border"
                          style={{ backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}40`, cursor: 'pointer' }}
                        >
                          <X size={15} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={openReceiptPicker}
                    className="min-h-[118px] items-center justify-center rounded-2xl border border-dashed p-5"
                    style={{ backgroundColor: colors.surface, borderColor: colors.border, cursor: 'pointer' }}
                  >
                    {Platform.OS === 'web' ? (
                      <input
                        ref={receiptInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        type="file"
                        onChange={(event) => setReceipt(event.target.files?.[0] || null)}
                      />
                    ) : null}
                    <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                      <UploadCloud size={23} color="#D4AF37" />
                    </View>
                    <Text className="text-center font-medium" style={{ color: colors.text }}>Click to upload or drag and drop</Text>
                    <Text className="mt-1 text-center text-xs" style={{ color: colors.muted }}>JPG or PNG receipt image</Text>
                  </Pressable>
                )}
              </View>
              <CustomInput label="Note (Optional)" placeholder="Optional note for admin review" value={form.note} onChangeText={update('note')} />
              <View className="mb-4 flex-row rounded-2xl border border-success/20 bg-success/10 p-4">
                <ShieldCheck size={17} color="#12cf7a" />
                <Text className="ml-2 flex-1 text-xs font-semimedium" style={{ color: colors.text }}>Funds are credited only after payment verification. Never share your account password with anyone.</Text>
              </View>
              <CustomButton title="Submit Deposit Request" onPress={submit} loading={loading} disabled={disabled} variant="success" />
            </>
          )}
        </View>

        <View className="w-full gap-4 xl:w-[280px]">
          <View className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-success/10">
              <ShieldCheck size={24} color="#12cf7a" />
            </View>
            <Text className="text-lg font-medium" style={{ color: colors.text }}>Deposit Process</Text>
            <View className="mt-5 gap-4">
              {['Request Submitted', 'Waiting for Review', 'Approved', 'Funds Credited'].map((item, index) => (
                <View key={item} className="flex-row">
                  <View className={`mr-3 h-7 w-7 items-center justify-center rounded-full border ${index === 0 ? 'border-success bg-success' : 'border-muted'}`}>
                    {index === 0 ? <CheckCircle2 size={15} color="#0B0B0B" /> : <Clock3 size={14} color="#8fa0bb" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium" style={{ color: colors.text }}>{item}</Text>
                    <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{index === 0 ? 'You submit your deposit request' : index === 1 ? 'Admin is reviewing your request' : index === 2 ? 'Your deposit has been approved' : 'Amount added to your wallet'}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Clock3 size={24} color="#12cf7a" />
            <Text className="mt-3 text-base font-medium" style={{ color: colors.text }}>Estimated Processing Time</Text>
            <Text className="mt-3 text-sm leading-5" style={{ color: colors.muted }}>Standard review: 5 - 30 Minutes</Text>
            <Text className="mt-1 text-sm leading-5" style={{ color: colors.muted }}>Weekends and holidays: up to 24 hours</Text>
          </View>
          <View className="flex-1 rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <UploadCloud size={24} color="#D4AF37" />
            <Text className="mt-3 text-base font-medium" style={{ color: colors.text }}>Receipt Checklist</Text>
            <Text className="mt-2 text-sm leading-5" style={{ color: colors.muted }}>Before submitting, make sure your receipt clearly shows:</Text>
            <View className="mt-4 gap-3">
              {['Paid amount', 'Payment date', 'Payment method', 'Sender account details'].map((item) => (
                <View key={item} className="flex-row items-center">
                  <CheckCircle2 size={15} color="#12cf7a" />
                  <Text className="ml-2 text-sm font-semimedium" style={{ color: colors.text }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View className={`${mobile ? 'px-4 pb-4' : 'px-5 pb-5'}`}>
        {disabled && disabledMessage ? <Text className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">{disabledMessage}</Text> : null}
        {message ? <Text className={`mt-3 rounded-2xl border p-4 text-sm ${success ? 'border-success/40 bg-success/10 text-success' : 'border-danger/40 bg-danger/10 text-danger'}`}>{message}</Text> : null}
      </View>
    </View>
  );
}
