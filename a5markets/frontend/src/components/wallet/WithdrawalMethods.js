import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Building2, Save, WalletCards } from 'lucide-react-native';
import { authService } from '../../services/authService';
import { useAppTheme } from '../../context/ThemeContext';

const emptyBank = { bankAccountHolder: '', bankName: '', bankBranch: '', bankAccountNumber: '' };
const emptyWallet = { walletHolderName: '', walletAddress: '' };

const normalize = (account) => {
  const marker = `${account.bankName || ''} ${account.bankBranch || ''}`.toLowerCase();
  return {
    ...account,
    bankAccountHolder: account.bankAccountHolder || account.accountHolderName || '',
    bankBranch: account.bankBranch || account.branchName || '',
    bankAccountNumber: account.bankAccountNumber || account.accountNumber || '',
    status: account.status || 'pending',
    payoutType: marker.includes('bep20') ? 'BEP20' : marker.includes('trc20') ? 'TRC20' : 'Bank',
  };
};

function Field({ label, value, onChangeText, placeholder, keyboardType }) {
  const { colors } = useAppTheme();
  return <View className="mb-4 flex-1">
    <Text className="mb-2 text-sm font-medium" style={{ color: colors.text }}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType={keyboardType}
      className="min-h-[50px] rounded-xl border px-4"
      style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
    />
  </View>;
}

export default function WithdrawalMethods({ user }) {
  const { colors } = useAppTheme();
  const [accounts, setAccounts] = useState([]);
  const [bankForm, setBankForm] = useState(emptyBank);
  const [trc20Form, setTrc20Form] = useState(emptyWallet);
  const [bep20Form, setBep20Form] = useState(emptyWallet);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!user) return setAccounts([]);
    try {
      const result = await authService.listBankAccounts();
      setAccounts((result.accounts || []).map(normalize));
    } catch (error) {
      setMessage(error.response?.data?.message || 'Withdrawal details could not be loaded.');
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const byType = (type) => accounts.find((item) => item.payoutType === type);
  const canEdit = (item) => !item || ['approved', 'rejected'].includes(item.status);

  const save = async (type) => {
    const form = type === 'Bank' ? bankForm : type === 'TRC20' ? trc20Form : bep20Form;
    const payload = type === 'Bank'
      ? { ...form, bankAccountHolder: form.bankAccountHolder.trim(), bankName: form.bankName.trim(), bankBranch: form.bankBranch.trim(), bankAccountNumber: form.bankAccountNumber.trim() }
      : { bankAccountHolder: form.walletHolderName.trim(), bankName: `USDT ${type}`, bankBranch: type, bankAccountNumber: form.walletAddress.trim() };
    if (!payload.bankAccountHolder || !payload.bankName || !payload.bankAccountNumber) {
      setMessage(type === 'Bank' ? 'Account holder, bank name and account number are required.' : `${type} wallet holder and wallet address are required.`);
      return;
    }
    const current = byType(type);
    if (!canEdit(current)) {
      setMessage(`${type} details are waiting for admin approval.`);
      return;
    }
    setBusy(true); setMessage('');
    try {
      const id = editing?.type === type ? editing.id : current?.id;
      const result = id ? await authService.updateBankAccount(id, payload) : await authService.createBankAccount(payload);
      setMessage(result.message || `${type} details submitted for approval.`);
      setEditing(null);
      if (type === 'Bank') setBankForm(emptyBank);
      else if (type === 'TRC20') setTrc20Form(emptyWallet);
      else setBep20Form(emptyWallet);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || `${type} details could not be saved.`);
    } finally { setBusy(false); }
  };

  const edit = (item) => {
    if (!canEdit(item)) return setMessage(`${item.payoutType} details are waiting for admin approval.`);
    setEditing({ id: item.id, type: item.payoutType });
    if (item.payoutType === 'Bank') setBankForm({ bankAccountHolder: item.bankAccountHolder, bankName: item.bankName, bankBranch: item.bankBranch, bankAccountNumber: item.bankAccountNumber });
    else {
      const value = { walletHolderName: item.bankAccountHolder, walletAddress: item.bankAccountNumber };
      item.payoutType === 'TRC20' ? setTrc20Form(value) : setBep20Form(value);
    }
    setMessage(`Edit ${item.payoutType} details below.`);
  };

  const remove = async (item) => {
    setBusy(true); setMessage('');
    try {
      const result = await authService.deleteBankAccount(item.id);
      setMessage(result.message || 'Delete request submitted for approval.');
      await load();
    } catch (error) { setMessage(error.response?.data?.message || 'Details could not be deleted.'); }
    finally { setBusy(false); }
  };

  const statusLabel = (status) => status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : status === 'delete_pending' ? 'Delete pending' : 'Pending approval';
  const show = (type) => !byType(type) || byType(type)?.status === 'rejected' || editing?.type === type;

  return <View className="mt-5 rounded-2xl border p-4 lg:p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
    <Text className="text-xl font-medium" style={{ color: colors.text }}>Withdrawal payment methods</Text>
    <Text className="mb-5 mt-1" style={{ color: colors.muted }}>Save your bank account or USDT wallet before requesting a withdrawal.</Text>

    <View className="gap-4 lg:flex-row">
      {show('Bank') ? <View className="flex-1 rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
        <View className="mb-4 flex-row items-center gap-2"><Building2 size={20} color="#174b83"/><Text className="text-lg font-medium" style={{ color: colors.text }}>Bank Account</Text></View>
        <View className="md:flex-row md:gap-3"><Field label="Account Holder" value={bankForm.bankAccountHolder} onChangeText={(v) => setBankForm((f) => ({ ...f, bankAccountHolder: v }))} placeholder="Name on bank account"/><Field label="Bank Name" value={bankForm.bankName} onChangeText={(v) => setBankForm((f) => ({ ...f, bankName: v }))} placeholder="Bank name"/></View>
        <View className="md:flex-row md:gap-3"><Field label="Branch" value={bankForm.bankBranch} onChangeText={(v) => setBankForm((f) => ({ ...f, bankBranch: v }))} placeholder="Branch name"/><Field label="Account Number" value={bankForm.bankAccountNumber} onChangeText={(v) => setBankForm((f) => ({ ...f, bankAccountNumber: v }))} placeholder="Account number" keyboardType="number-pad"/></View>
        <SaveButton busy={busy} title="Save Bank Details" onPress={() => save('Bank')} />
      </View> : null}
      <View className="flex-1 gap-4">
        {['TRC20', 'BEP20'].map((type) => show(type) ? <View key={type} className="rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
          <View className="mb-4 flex-row items-center gap-2"><WalletCards size={20} color="#11a7a2"/><Text className="text-lg font-medium" style={{ color: colors.text }}>USDT {type}</Text></View>
          <View className="md:flex-row md:gap-3"><Field label="Wallet Holder" value={(type === 'TRC20' ? trc20Form : bep20Form).walletHolderName} onChangeText={(v) => (type === 'TRC20' ? setTrc20Form : setBep20Form)((f) => ({ ...f, walletHolderName: v }))} placeholder="Wallet holder name"/><Field label="Wallet Address" value={(type === 'TRC20' ? trc20Form : bep20Form).walletAddress} onChangeText={(v) => (type === 'TRC20' ? setTrc20Form : setBep20Form)((f) => ({ ...f, walletAddress: v }))} placeholder={`${type} wallet address`}/></View>
          <SaveButton busy={busy} title={`Save ${type} Details`} onPress={() => save(type)} />
        </View> : null)}
      </View>
    </View>

    {message ? <Text className="mt-4 rounded-xl border p-3 text-sm" style={{ color: colors.text, borderColor: colors.border, backgroundColor: colors.panel }}>{message}</Text> : null}
    <View className="mt-5 gap-3">
      <Text className="text-lg font-medium" style={{ color: colors.text }}>Saved withdrawal details</Text>
      {accounts.length ? accounts.map((item) => <View key={item.id} className="flex-row flex-wrap items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: colors.border, backgroundColor: colors.panel }}>
        <View><Text className="font-medium" style={{ color: colors.text }}>{item.payoutType} · {item.bankAccountHolder || '-'}</Text><Text className="mt-1 text-sm" style={{ color: colors.muted }}>{item.payoutType === 'Bank' ? `${item.bankName} · ${item.bankAccountNumber}` : item.bankAccountNumber}</Text><Text className="mt-1 text-xs text-primary">{statusLabel(item.status)}</Text></View>
        <View className="flex-row gap-2"><Pressable disabled={busy || !canEdit(item)} onPress={() => edit(item)} className="rounded-lg border border-primary px-4 py-2"><Text className="text-primary">Edit</Text></Pressable><Pressable disabled={busy || item.status === 'delete_pending'} onPress={() => remove(item)} className="rounded-lg bg-danger/10 px-4 py-2"><Text className="text-danger">Delete</Text></Pressable></View>
      </View>) : <Text style={{ color: colors.muted }}>No payment methods saved yet.</Text>}
    </View>
  </View>;
}

function SaveButton({ busy, title, onPress }) {
  return <Pressable disabled={busy} onPress={onPress} className={`min-h-[48px] flex-row items-center justify-center rounded-xl bg-primary px-5 ${busy ? 'opacity-60' : ''}`}><Save size={16} color="#fff"/><Text className="ml-2 font-medium text-white">{busy ? 'Saving...' : title}</Text></Pressable>;
}
