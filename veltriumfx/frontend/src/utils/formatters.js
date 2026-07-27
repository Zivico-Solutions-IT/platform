export const money = (value) =>
  Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const quote = (value, decimals = 5) => Number(value || 0).toFixed(decimals);

export const percent = (value) => `${Number(value || 0) >= 0 ? '+' : ''}${Number(value || 0).toFixed(2)}%`;

export const dateTime = (value) =>
  new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export const transactionTypeLabel = (type, note = '') => {
  if (note === 'Birthday Bonus') return 'Birthday Bonus';
  if (type === 'admin_add_balance') return 'Deposit';
  if (type === 'admin_deduct_balance') return 'Withdraw';
  if (type === 'deposit') return 'Deposit';
  if (type === 'withdrawal') return 'Withdraw';
  if (type === 'referral') return 'Referral Bonus';
  if (type === 'referral_reward') return 'Referral Bonus';
  return String(type || '').replace(/_/g, ' ');
};
