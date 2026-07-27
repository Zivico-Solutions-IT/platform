import AsyncStorage from '@react-native-async-storage/async-storage';

const keys = {
  token: 'novafxm_token',
  user: 'novafxm_user',
  positions: 'novafxm_positions',
  closed: 'novafxm_closed_positions',
  wallet: 'novafxm_wallet',
  transactions: 'novafxm_transactions',
  selectedSymbol: 'novafxm_selected_symbol',
};

export const storage = {
  async get(key, fallback = null) {
    const value = await AsyncStorage.getItem(keys[key] || key);
    return value ? JSON.parse(value) : fallback;
  },
  async set(key, value) {
    await AsyncStorage.setItem(keys[key] || key, JSON.stringify(value));
  },
  async remove(key) {
    await AsyncStorage.removeItem(keys[key] || key);
  },
  async clearSession() {
    await Promise.all([AsyncStorage.removeItem(keys.token), AsyncStorage.removeItem(keys.user)]);
  },
};
