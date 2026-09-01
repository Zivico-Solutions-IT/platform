import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { dateTime } from '../../utils/formatters';

const filterOptions = [
  { id: 'pending', label: 'Pending' },
  { id: 'unverified', label: 'Unverified' },
  { id: 'approved', label: 'Verified' },
];

const dateMs = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function VerificationApprovales({ users, busyId, onOpenVerification, onReviewVerification }) {
  const { width } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const mobile = width < 760;
  const tableHeaderBackground = darkMode ? colors.surface : '#f2eee0';
  const inputBackground = darkMode ? colors.panel : '#fffdf8';
  const verificationCounts = useMemo(() => {
    const clientUsers = users.filter((user) => !['admin', 'master'].includes(user.role));
    return {
      pending: clientUsers.filter((user) => user.verificationStatus === 'pending').length,
      unverified: clientUsers.filter((user) => ['unverified', 'rejected'].includes(user.verificationStatus || 'unverified')).length,
      approved: clientUsers.filter((user) => user.verificationStatus === 'approved').length,
    };
  }, [users]);

  const clients = useMemo(() => (
    users
      .filter((user) => !['admin', 'master'].includes(user.role))
      .filter((user) => {
        const status = user.verificationStatus || 'unverified';
        if (filter === 'unverified') return status === 'unverified' || status === 'rejected';
        return status === filter;
      })
      .filter((user) => {
        const term = query.trim().toLowerCase();
        if (!term) return true;
        return [user.name, user.email, user.verificationStatus].some((value) => String(value || '').toLowerCase().includes(term));
      })
      .sort((a, b) => dateMs(b.updatedAt || b.createdAt) - dateMs(a.updatedAt || a.createdAt))
  ), [filter, query, users]);

  const sections = useMemo(() => {
    if (filter !== 'unverified') return [{ title: null, users: clients }];
    return [
      { title: 'Rejected Verification Details', users: clients.filter((user) => user.verificationStatus === 'rejected') },
      { title: 'No Verification Details Submitted', users: clients.filter((user) => (user.verificationStatus || 'unverified') === 'unverified') },
    ].filter((section) => section.users.length);
  }, [clients, filter]);

  const statusStyle = (status) => {
    if (status === 'approved') return { backgroundColor: `${colors.success}18`, color: colors.success };
    if (status === 'rejected') return { backgroundColor: `${colors.danger}18`, color: colors.danger };
    if (status === 'pending') return { backgroundColor: `${colors.primary}18`, color: colors.primary };
    return { backgroundColor: colors.surface, color: colors.muted };
  };
  const statusLabel = (status) => (status === 'approved' ? 'verified' : status);

  return (
    <View>
      <View className="mb-4 gap-3">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, email or status"
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
                  {option.label} ({verificationCounts[option.id] || 0})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View className="overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
        {mobile ? (
          <View className="gap-3 p-3">
            {sections.map((section) => (
              <View key={section.title || 'clients'} className="gap-3">
                {section.title ? (
                  <Text className="px-1 pt-1 text-xs font-medium uppercase" style={{ color: colors.muted }}>
                    {section.title}
                  </Text>
                ) : null}
                {section.users.map((user) => {
                  const status = user.verificationStatus || 'unverified';
                  const busy = busyId === user.id;
                  const badge = statusStyle(status);
                  const canOpenVerification = true;
                  const canApprove = status === 'pending';
                  return (
                    <View key={user.id} className="rounded-xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="min-w-0 flex-1">
                          <Text className="font-medium" numberOfLines={1} style={{ color: colors.text }}>{user.name || '-'}</Text>
                          <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: colors.muted }}>{user.email || '-'}</Text>
                          <Text className="mt-2 text-xs" style={{ color: colors.muted }}>{dateTime(user.updatedAt || user.createdAt)}</Text>
                        </View>
                        <Text className="rounded-full px-3 py-1 text-xs font-medium capitalize" style={badge}>{statusLabel(status)}</Text>
                      </View>
                      <View className="mt-4 flex-row gap-2">
                        {canOpenVerification ? (
                          <Pressable disabled={busy} onPress={() => onOpenVerification(user)} className={`min-h-[42px] flex-1 items-center justify-center rounded-2xl border px-4 ${busy ? 'opacity-40' : ''}`} style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1 }}>
                            <Text className="text-xs font-medium" style={{ color: colors.text }}>{status === 'unverified' ? 'Add documents' : 'View'}</Text>
                          </Pressable>
                        ) : null}
                        {canApprove ? (
                          <Pressable disabled={busy} onPress={() => onReviewVerification(user, 'approve')} className={`min-h-[42px] flex-1 items-center justify-center rounded-2xl px-4 ${busy ? 'opacity-40' : ''}`} style={{ backgroundColor: colors.success }}>
                            <Text className="text-xs font-semibold" style={{ color: '#fff' }}>Approve</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
            {!clients.length ? <Text className="p-6 text-center" style={{ color: colors.muted }}>No users found.</Text> : null}
          </View>
        ) : (
        <ScrollView horizontal contentContainerStyle={{ minWidth: '100%' }}>
          <View style={{ minWidth: 840, flexGrow: 1 }}>
            <View className="flex-row border-b px-4 py-4" style={{ backgroundColor: tableHeaderBackground, borderColor: colors.border }}>
              {['User', 'Status', 'Updated', 'Actions'].map((heading, index) => (
                <Text key={heading} className="text-xs font-medium uppercase" style={{ width: [320, 150, 190, 180][index], color: colors.muted }}>{heading}</Text>
              ))}
            </View>
            {sections.map((section) => (
              <View key={section.title || 'clients'}>
                {section.title ? (
                  <Text className="border-b px-4 py-3 text-xs font-medium uppercase" style={{ backgroundColor: tableHeaderBackground, borderColor: colors.border, color: colors.muted }}>
                    {section.title}
                  </Text>
                ) : null}
                {section.users.map((user) => {
                  const status = user.verificationStatus || 'unverified';
                  const busy = busyId === user.id;
                  const badge = statusStyle(status);
                  const canOpenVerification = true;
                  const canApprove = status === 'pending';
                  return (
                    <View key={user.id} className="flex-row items-center border-b p-4" style={{ borderColor: colors.border }}>
                      <View style={{ width: 320 }}>
                        <Text className="font-medium" style={{ color: colors.text }}>{user.name || '-'}</Text>
                        <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{user.email || '-'}</Text>
                      </View>
                      <View style={{ width: 150 }}>
                        <Text className="self-start rounded-full px-3 py-1 text-xs font-medium capitalize" style={badge}>{statusLabel(status)}</Text>
                      </View>
                      <Text className="text-sm" style={{ width: 190, color: colors.muted }}>{dateTime(user.updatedAt || user.createdAt)}</Text>
                      <View style={{ width: 180 }} className="flex-row flex-wrap gap-2">
                        {canOpenVerification ? (
                          <Pressable disabled={busy} onPress={() => onOpenVerification(user)} className={`min-h-[36px] justify-center rounded-2xl border px-4 ${busy ? 'opacity-40' : ''}`} style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                            <Text className="text-xs font-medium" style={{ color: colors.text }}>{status === 'unverified' ? 'Add documents' : 'View'}</Text>
                          </Pressable>
                        ) : null}
                        {canApprove ? (
                          <Pressable disabled={busy} onPress={() => onReviewVerification(user, 'approve')} className={`min-h-[36px] justify-center rounded-2xl px-4 ${busy ? 'opacity-40' : ''}`} style={{ backgroundColor: colors.success }}>
                            <Text className="text-xs font-semibold" style={{ color: '#fff' }}>Approve</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
            {!clients.length ? (
              <View className="min-h-[82px] items-center justify-center px-4 py-7">
                <Text className="text-sm" style={{ color: colors.muted }}>No users found.</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
        )}
      </View>
    </View>
  );
}
