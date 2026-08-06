import AsyncStorage from '@react-native-async-storage/async-storage';

const keys = {
  token: 'a5markets_token',
  user: 'a5markets_user',
  positions: 'a5markets_positions',
  closed: 'a5markets_closed_positions',
  wallet: 'a5markets_wallet',
  transactions: 'a5markets_transactions',
  selectedSymbol: 'a5markets_selected_symbol',
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
