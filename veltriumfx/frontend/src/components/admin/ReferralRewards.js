import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { dateTime, money } from '../../utils/formatters';

const filterOptions = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const rewardTableColumns = [
  { heading: 'Referrer', style: { flex: 2.2, minWidth: 160 } },
  { heading: 'Referee', style: { flex: 1.8, minWidth: 140 } },
  { heading: 'Deposit / Reward', style: { flex: 1.8, minWidth: 130 } },
  { heading: 'Status', style: { flex: 1, minWidth: 90 } },
  { heading: 'Date', style: { flex: 1.3, minWidth: 110 } },
  { heading: 'Actions', style: { width: 130 } },
];

const dateMs = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function ReferralRewards({ rewards = [], busyId, onReviewReward }) {
  const { width } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const mobile = width < 768;
  const tableHeaderBackground = darkMode ? colors.surface : '#f2eee0';
  const inputBackground = darkMode ? colors.panel : '#fffdf8';

  const rewardCounts = useMemo(() => {
    return {
      pending: rewards.filter((r) => r.status === 'pending').length,
      approved: rewards.filter((r) => r.status === 'approved').length,
      rejected: rewards.filter((r) => r.status === 'rejected').length,
    };
  }, [rewards]);

  const filteredRewards = useMemo(() => {
    return rewards
      .filter((r) => r.status === filter)
      .filter((r) => {
        const term = query.trim().toLowerCase();
        if (!term) return true;
        return [
          r.referrer?.name,
          r.referrer?.email,
          r.referrer?.referralCode,
          r.referee?.name,
          r.referee?.email,
          r.status,
        ].some((value) => String(value || '').toLowerCase().includes(term));
      })
      .sort((a, b) => dateMs(b.createdAt) - dateMs(a.createdAt));
  }, [filter, query, rewards]);

  const statusStyle = (status) => {
    if (status === 'approved') return { backgroundColor: `${colors.success}18`, color: colors.success };
    if (status === 'rejected') return { backgroundColor: `${colors.danger}18`, color: colors.danger };
    return { backgroundColor: `${colors.primary}18`, color: colors.primary };
  };

  return (
    <View className="mb-7">
      <View className="mb-4 gap-3">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by referrer code, name, email or status..."
          placeholderTextColor={colors.muted}
          className="h-11 rounded-xl border px-4 text-sm"
          style={{ backgroundColor: inputBackground, borderColor: colors.border, color: colors.text }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row', flexWrap: 'nowrap' }}>
          {filterOptions.map((option) => {
            const active = filter === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setFilter(option.id)}
                className="h-[39px] min-w-[78px] items-center justify-center rounded-xl border px-4"
                style={{
                  backgroundColor: active ? colors.primary : colors.panel,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text className="text-xs font-semibold" style={{ color: active ? '#0B0B0B' : colors.text }}>
                  {option.label} ({rewardCounts[option.id] || 0})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
        {mobile ? (
          <View className="gap-3 p-3">
            {filteredRewards.map((reward) => {
              const busy = busyId === reward.id;
              const badge = statusStyle(reward.status);
              return (
                <View key={reward.id} className="rounded-xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <View className="flex-row items-start justify-between gap-3 border-b pb-2 mb-2" style={{ borderColor: `${colors.border}40` }}>
                    <View className="min-w-0 flex-1">
                      <Text className="text-xs font-medium uppercase" style={{ color: colors.muted }}>Referrer</Text>
                      <Text className="font-semibold text-sm" numberOfLines={1} style={{ color: colors.text }}>{reward.referrer?.name || '-'}</Text>
                      <Text className="text-xs" numberOfLines={1} style={{ color: colors.muted }}>{reward.referrer?.email || '-'}</Text>
                      <Text className="text-[10px] font-bold text-primary mt-0.5">{reward.referrer?.referralCode || '-'}</Text>
                    </View>
                    <Text className="rounded-full px-3 py-1 text-xs font-medium capitalize" style={badge}>{reward.status}</Text>
                  </View>

                  <View className="gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-xs" style={{ color: colors.muted }}>Referee joined:</Text>
                      <Text className="text-xs font-medium" style={{ color: colors.text }}>{reward.referee?.name || reward.referee?.email || '-'}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs" style={{ color: colors.muted }}>Referee Deposit:</Text>
                      <Text className="text-xs font-medium" style={{ color: colors.text }}>${money(reward.deposit?.amount)} USD</Text>
                    </View>
                    <View className="flex-row justify-between pt-1 border-t" style={{ borderColor: `${colors.border}20` }}>
                      <Text className="text-xs font-semibold" style={{ color: colors.primary }}>Reward (10%):</Text>
                      <Text className="text-xs font-bold" style={{ color: colors.primary }}>${money(reward.amount)} USD</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-[10px]" style={{ color: colors.muted }}>Created:</Text>
                      <Text className="text-[10px]" style={{ color: colors.muted }}>{dateTime(reward.createdAt)}</Text>
                    </View>
                  </View>

                  {reward.status === 'pending' ? (
                    <View className="mt-4 flex-row gap-2">
                      <Pressable
                        disabled={busy}
                        onPress={() => onReviewReward(reward, 'approve')}
                        className={`flex-1 min-h-[38px] items-center justify-center rounded-xl ${busy ? 'opacity-40' : ''}`}
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: '#0B0B0B' }}>Approve</Text>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        onPress={() => onReviewReward(reward, 'reject')}
                        className={`flex-1 min-h-[38px] items-center justify-center rounded-xl border ${busy ? 'opacity-40' : ''}`}
                        style={{ backgroundColor: colors.panel, borderColor: colors.border }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: colors.danger }}>Reject</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {!filteredRewards.length ? <Text className="p-6 text-center" style={{ color: colors.muted }}>No referral rewards found.</Text> : null}
          </View>
        ) : (
          <View style={{ flexGrow: 1 }}>
            <View className="flex-row border-b px-4 py-4" style={{ backgroundColor: tableHeaderBackground, borderColor: colors.border }}>
              {rewardTableColumns.map((col) => (
                <Text
                  key={col.heading}
                  className="text-xs font-medium uppercase"
                  style={[col.style, { color: colors.muted }]}
                >
                  {col.heading}
                </Text>
              ))}
            </View>
            {filteredRewards.map((reward) => {
              const busy = busyId === reward.id;
              const badge = statusStyle(reward.status);
              return (
                <View key={reward.id} className="flex-row items-center border-b p-4" style={{ borderColor: colors.border }}>
                  <View style={rewardTableColumns[0].style}>
                    <Text className="font-semibold" style={{ color: colors.text }}>{reward.referrer?.name || '-'}</Text>
                    <Text className="text-xs" style={{ color: colors.muted }}>{reward.referrer?.email || '-'}</Text>
                    <Text className="text-[10px] font-bold text-primary mt-0.5">{reward.referrer?.referralCode || '-'}</Text>
                  </View>
                  <View style={rewardTableColumns[1].style}>
                    <Text className="font-medium" style={{ color: colors.text }}>{reward.referee?.name || '-'}</Text>
                    <Text className="text-xs" style={{ color: colors.muted }}>{reward.referee?.email || '-'}</Text>
                  </View>
                  <View style={rewardTableColumns[2].style}>
                    <Text className="text-xs" style={{ color: colors.muted }}>Deposit: ${money(reward.deposit?.amount)} USD</Text>
                    <Text className="text-xs font-bold mt-0.5" style={{ color: colors.primary }}>Reward: ${money(reward.amount)} USD</Text>
                  </View>
                  <View style={rewardTableColumns[3].style}>
                    <Text className="self-start rounded-full px-3 py-1 text-xs font-medium capitalize" style={badge}>{reward.status}</Text>
                  </View>
                  <View style={rewardTableColumns[4].style}>
                    <Text className="text-xs" style={{ color: colors.muted }}>{dateTime(reward.createdAt)}</Text>
                  </View>
                  <View style={rewardTableColumns[5].style}>
                    {reward.status === 'pending' ? (
                      <View className="flex-row gap-2">
                        <Pressable
                          disabled={busy}
                          onPress={() => onReviewReward(reward, 'approve')}
                          className={`min-h-[30px] justify-center rounded-xl px-3 ${busy ? 'opacity-40' : ''}`}
                          style={{ backgroundColor: colors.primary }}
                        >
                          <Text className="text-[11px] font-semibold" style={{ color: '#0B0B0B' }}>Approve</Text>
                        </Pressable>
                        <Pressable
                          disabled={busy}
                          onPress={() => onReviewReward(reward, 'reject')}
                          className={`min-h-[30px] justify-center rounded-xl border px-3 ${busy ? 'opacity-40' : ''}`}
                          style={{ backgroundColor: colors.panel, borderColor: colors.border }}
                        >
                          <Text className="text-[11px] font-semibold" style={{ color: colors.danger }}>Reject</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text className="text-xs font-medium" style={{ color: colors.muted }}>Reviewed</Text>
                    )}
                  </View>
                </View>
              );
            })}
            {!filteredRewards.length ? (
              <View className="min-h-[82px] items-center justify-center px-4 py-7">
                <Text className="text-sm" style={{ color: colors.muted }}>No referral rewards found.</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}
