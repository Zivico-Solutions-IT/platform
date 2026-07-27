import AsyncStorage from '@react-native-async-storage/async-storage';

const keys = {
  token: 'veltriumfx_token',
  user: 'veltriumfx_user',
  positions: 'veltriumfx_positions',
  closed: 'veltriumfx_closed_positions',
  wallet: 'veltriumfx_wallet',
  transactions: 'veltriumfx_transactions',
  selectedSymbol: 'veltriumfx_selected_symbol',
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
