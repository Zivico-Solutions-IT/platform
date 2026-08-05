export const emptyAdminNotificationData = {
  users: [],
  deposits: [],
  withdrawals: [],
  bankAccounts: [],
  birthdays: [],
};

export const loadAdminNotificationData = async (api) => {
  const [users, deposits, withdrawals, bankAccounts, birthdays] = await Promise.all([
    api.get('/admin/users'),
    api.get('/admin/deposits'),
    api.get('/admin/withdrawals'),
    api.get('/admin/bank-accounts'),
    api.get('/admin/birthdays'),
  ]);

  return {
    users: users.data?.users || [],
    deposits: deposits.data?.deposits || [],
    withdrawals: withdrawals.data?.withdrawals || [],
    bankAccounts: bankAccounts.data?.bankAccounts || [],
    birthdays: birthdays.data?.users || [],
  };
};

export const payoutTypeFor = (item) => (
  String(`${item?.bankName || ''} ${item?.branchName || ''}`).toLowerCase().includes('trc20') ? 'TRC20' : 'Bank'
);

export const adminNotificationTimestamp = (...values) => {
  for (const value of values) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

export const buildAdminNotificationItems = (data, { colors, dateTime, money, onNavigate = () => {} }) => {
  const items = [];

  (data.users || [])
    .filter((user) => (
      user.role !== 'admin'
      && user.verificationStatus === 'pending'
      && user.idProofImage
      && user.addressProofImage
    ))
    .slice(0, 8)
    .forEach((user) => {
      const at = user.updatedAt || user.createdAt;
      items.push({
        id: `admin-verification-${user.id}`,
        icon: 'verification',
        title: 'Verification Request',
        body: `${user.name || user.email || 'User'} uploaded verification documents.`,
        sortAt: adminNotificationTimestamp(at),
        time: at ? dateTime(at) : 'Verification request',
        tone: colors.primary,
        onPress: () => onNavigate('verification', user),
      });
    });

  (data.birthdays || [])
    .slice(0, 8)
    .forEach((user) => {
      const at = new Date();
      items.push({
        id: `admin-birthday-${user.id}`,
        icon: 'user',
        title: 'User Birthday',
        body: `Today is ${user.name || user.email || 'User'}'s birthday! A $200 bonus is pending.`,
        sortAt: adminNotificationTimestamp(at),
        time: 'Today',
        tone: colors.primary,
        onPress: () => onNavigate('overview', user),
      });
    });

  (data.deposits || [])
    .filter((item) => item.status === 'pending')
    .slice(0, 8)
    .forEach((item) => {
      const at = item.createdAt || item.updatedAt;
      items.push({
        id: `admin-deposit-${item.id}`,
        icon: 'deposit',
        title: 'New Deposit Request',
        body: `${item.User?.name || item.User?.email || 'User'} requested ${money(item.amount)} USD deposit approval.`,
        sortAt: adminNotificationTimestamp(at),
        time: at ? dateTime(at) : 'Deposit request',
        tone: colors.success,
        onPress: () => onNavigate('deposits', item),
      });
    });

  (data.withdrawals || [])
    .filter((item) => item.status === 'pending')
    .slice(0, 8)
    .forEach((item) => {
      const at = item.createdAt || item.updatedAt;
      items.push({
        id: `admin-withdrawal-${item.id}`,
        icon: 'withdrawal',
        title: 'New Withdrawal Request',
        body: `${item.User?.name || item.User?.email || 'User'} requested ${money(item.amount)} USD withdrawal approval.`,
        sortAt: adminNotificationTimestamp(at),
        time: at ? dateTime(at) : 'Withdrawal request',
        tone: colors.danger,
        onPress: () => onNavigate('withdrawals', item),
      });
    });

  (data.bankAccounts || [])
    .filter((item) => ['pending', 'delete_pending'].includes(item.status))
    .slice(0, 8)
    .forEach((item) => {
      const at = item.updatedAt || item.createdAt;
      items.push({
        id: `admin-bank-${item.id}-${item.status}`,
        icon: 'bank',
        title: item.status === 'delete_pending' ? 'Withdrawal Detail Delete Request' : 'Account Details Pending',
        body: `${item.User?.name || item.User?.email || 'User'} submitted ${payoutTypeFor(item)} withdrawal details.`,
        sortAt: adminNotificationTimestamp(at),
        time: at ? dateTime(at) : 'Account details',
        tone: colors.primary,
        onPress: () => onNavigate('bankAccounts', item),
      });
    });

  return items
    .filter((item) => item.id)
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 24);
};
