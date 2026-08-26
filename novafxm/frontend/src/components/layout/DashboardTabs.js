import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

const allTabs = [
  { key: 'overview', label: 'Home', section: 'overview' },
  { key: 'accounts', label: 'Accounts', section: 'accounts' },
  { key: 'verification', label: 'Verification', route: '/verification' },
  { key: 'deposit', label: 'Deposit', section: 'deposit' },
  { key: 'withdraw', label: 'Withdraw', section: 'withdraw' },
  { key: 'rewards', label: 'Referral Programme', route: '/broker-rewards', userOnly: true },
  { key: 'settings', label: 'Settings', route: '/settings' },
];

export default function DashboardTabs({ activeKey, onSectionChange, userRole }) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const mobile = width < 640;
  const tabs = allTabs.filter((tab) => !tab.userOnly || !userRole || userRole === 'user');

  const openTab = (tab) => {
    if (tab.section) {
      if (onSectionChange) {
        onSectionChange(tab.section);
        return;
      }
      router.push(`/dashboard?section=${tab.section}`);
      return;
    }
    router.push(tab.route);
  };

  return (
    <View className={`${mobile ? 'mb-4 rounded-xl p-1.5' : 'mb-5 rounded-2xl p-2'} border`} style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
      <ScrollView horizontal={mobile} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexWrap: mobile ? 'nowrap' : 'wrap' }}>
        {tabs.map((tab) => {
          const active = activeKey === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => openTab(tab)}
              className={`${mobile ? 'rounded-lg px-3 py-2.5' : 'rounded-xl px-4 py-3'}`}
              style={{
                backgroundColor: active ? colors.primary : 'transparent',
                borderColor: active ? colors.primary : colors.border,
                borderWidth: 1,
              }}
            >
              <Text className={`${mobile ? 'text-sm' : ''} font-medium`} numberOfLines={1} style={{ color: active ? '#05130d' : colors.muted }}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
