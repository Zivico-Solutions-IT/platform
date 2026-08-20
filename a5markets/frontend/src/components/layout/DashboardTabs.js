import { useState } from 'react';
import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

export const dashboardTabs = [
  { key: 'overview', label: 'Overview', section: 'overview' },
  { key: 'accounts', label: 'Accounts', section: 'accounts' },
  { key: 'verification', label: 'Verification', route: '/verification' },
  { key: 'deposit', label: 'Deposit', section: 'deposit' },
  { key: 'withdraw', label: 'Withdraw', section: 'withdraw' },
  { key: 'referral', label: 'Referral Programme', route: '/broker-rewards', userOnly: true },
  { key: 'settings', label: 'Settings', route: '/settings?section=profile' },
];

export function dashboardTabLabel(key, fallback = 'Account Dashboard') {
  return dashboardTabs.find((tab) => tab.key === key)?.label || fallback;
}

export default function DashboardTabs({ activeKey, onSectionChange, userRole }) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const [hoveredKey, setHoveredKey] = useState(null);
  const [pressedKey, setPressedKey] = useState(null);
  const [open, setOpen] = useState(false);
  const mobile = width < 760;
  const tabs = dashboardTabs.filter((tab) => !tab.userOnly || !userRole || userRole === 'user');
  const activeTab = tabs.find((tab) => tab.key === activeKey) || tabs[0];

  const openTab = (tab) => {
    setOpen(false);
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

  if (mobile) {
    return (
      <View className="mb-6 rounded-xl border p-1.5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
        <Pressable
          onPress={() => setOpen((current) => !current)}
          className="h-[46px] flex-row items-center justify-between rounded-lg px-4"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-sm font-semibold text-white" numberOfLines={1}>{activeTab?.label || 'Menu'}</Text>
          <ChevronDown size={18} color="#ffffff" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
        </Pressable>
        {open ? (
          <View className="mt-1.5 gap-1">
            {tabs.map((tab) => {
              const active = activeKey === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => openTab(tab)}
                  className="h-[42px] flex-row items-center rounded-lg px-4"
                  style={{ backgroundColor: active ? `${colors.primary}14` : colors.surface, borderWidth: 1, borderColor: active ? `${colors.primary}35` : colors.border }}
                >
                  <Text className="text-sm font-semibold" numberOfLines={1} style={{ color: active ? colors.primary : colors.muted }}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View className="mb-6 flex-row gap-1.5 rounded-xl border p-1.5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
      <ScrollView
        horizontal={mobile}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'nowrap', gap: 6, flexGrow: 1 }}
      >
        {tabs.map((tab) => {
          const active = activeKey === tab.key;
          const hovered = hoveredKey === tab.key;
          const pressed = pressedKey === tab.key;
          const elevated = active || hovered;
          return (
            <Pressable
              key={tab.key}
              onPress={() => openTab(tab)}
              onHoverIn={() => setHoveredKey(tab.key)}
              onHoverOut={() => setHoveredKey((current) => (current === tab.key ? null : current))}
              onPressIn={() => setPressedKey(tab.key)}
              onPressOut={() => setPressedKey((current) => (current === tab.key ? null : current))}
              className={`${mobile ? 'min-w-[132px]' : 'flex-1'} h-[46px] items-center justify-center rounded-lg px-3`}
              style={{
                backgroundColor: active ? colors.primary : hovered ? `${colors.primary}12` : 'transparent',
                borderWidth: active ? 0 : 1,
                borderColor: hovered ? `${colors.primary}35` : 'transparent',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: elevated ? 8 : 0 },
                shadowOpacity: active ? 0.2 : hovered ? 0.1 : 0,
                shadowRadius: elevated ? 14 : 0,
                elevation: active ? 4 : hovered ? 2 : 0,
                transform: [{ scale: pressed ? 0.97 : hovered ? 1.015 : 1 }],
                transitionDuration: '180ms',
                transitionProperty: 'background-color, box-shadow, transform, border-color',
              }}
            >
              <Text
                className={`${mobile ? 'text-xs' : 'text-sm'} font-semibold text-center`}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color: active ? '#ffffff' : hovered ? colors.primary : colors.muted,
                  transitionDuration: '180ms',
                  transitionProperty: 'color',
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
