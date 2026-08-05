import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Platform, TextInput, useWindowDimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CheckSquare, Square, Search, UserRound, UserPlus, UserMinus, ChevronDown } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import api from '../../services/api';

function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select...",
  colors,
  darkMode,
  height = 40,
  backgroundColor,
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);
  const bg = backgroundColor || colors.panel;

  return (
    <View style={{ zIndex: open ? 1000 : 1, position: 'relative' }} className={className}>
      <Pressable
        onPress={() => setOpen(!open)}
        className="flex-row items-center justify-between rounded-xl border px-3"
        style={{
          backgroundColor: bg,
          borderColor: colors.border,
          height: height,
        }}
      >
        <Text
          className="text-xs font-semibold"
          numberOfLines={1}
          style={{
            color: (value === "" || !selectedOption) ? (darkMode ? '#9ca3af' : '#6b7280') : colors.text,
            flex: 1,
            textAlign: 'left'
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={14} color={colors.muted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>

      {open ? (
        <>
          <Pressable
            style={{
              position: Platform.OS === 'web' ? 'fixed' : 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998,
              ...(Platform.OS !== 'web' ? { width: 2000, height: 2000, left: -1000, top: -1000 } : {})
            }}
            onPress={() => setOpen(false)}
          />
          <View
            className="absolute left-0 right-0 rounded-xl border p-1 shadow-lg"
            style={{
              top: height + 4,
              backgroundColor: bg,
              borderColor: colors.border,
              zIndex: 999,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: darkMode ? 0.35 : 0.1,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            <ScrollView
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className="rounded-lg px-3 py-2"
                    style={({ pressed }) => ({
                      backgroundColor: active
                        ? (darkMode ? '#374151' : '#e5e7eb')
                        : pressed
                        ? (darkMode ? '#1f2937' : '#f3f4f6')
                        : 'transparent',
                    })}
                  >
                    <Text
                      className="text-xs font-semibold"
                      numberOfLines={1}
                      style={{ color: colors.text }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function AssignUsers({ users, loading, onRefresh }) {
  const { colors, darkMode } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  
  // Selection state
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [targetAgentId, setTargetAgentId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignError, setAssignError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setAgentsLoading(true);
      const res = await api.get('/admin/agents');
      setAgents(res.data.agents || []);
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setAgentsLoading(false);
    }
  };

  const assignableStaff = useMemo(
    () => agents.filter((staff) => ['agent', 'manager'].includes(staff.role)),
    [agents],
  );

  const agentOptions = useMemo(() => {
    return [
      { label: 'Select Agent or Manager...', value: '' },
      ...assignableStaff.map((staff) => ({
        label: `${staff.name} (${staff.role === 'manager' ? 'Manager' : 'Agent'})`,
        value: staff.id.toString(),
      })),
    ];
  }, [assignableStaff]);

  const statusOptions = [
    { label: 'All Users', value: 'all' },
    { label: 'New Users', value: 'new' },
    { label: 'Assigned', value: 'assigned' },
    { label: 'Unassigned', value: 'unassigned' },
  ];

  const handleAssign = async () => {
    if (selectedUserIds.size === 0) {
      setAssignError('Please select at least one user.');
      return;
    }
    if (!targetAgentId) {
      setAssignError('Please select an agent or manager to assign.');
      return;
    }

    try {
      setAssigning(true);
      setAssignError('');
      setAssignSuccess('');

      const payload = {
        userIds: Array.from(selectedUserIds),
        agentId: Number(targetAgentId)
      };

      await api.put('/admin/users/assign-agent', payload);
      
      setAssignSuccess(`Successfully assigned ${selectedUserIds.size} user(s).`);
      setSelectedUserIds(new Set());
      if (onRefresh) onRefresh({ silent: true });
      
      setTimeout(() => setAssignSuccess(''), 3000);
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Failed to assign users.');
    } finally {
      setAssigning(false);
    }
  };

  const toggleUser = (id) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedUserIds(newSet);
  };

  const toggleAll = (visibleIds) => {
    if (selectedUserIds.size === visibleIds.length && visibleIds.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(visibleIds));
    }
  };

  const handleUnassign = async () => {
    if (selectedUserIds.size === 0) {
      setAssignError('Please select at least one assigned user.');
      return;
    }

    try {
      setAssigning(true);
      setAssignError('');
      setAssignSuccess('');
      await api.put('/admin/users/assign-agent', { userIds: Array.from(selectedUserIds), agentId: null });
      setAssignSuccess(`Successfully unassigned ${selectedUserIds.size} user(s).`);
      setSelectedUserIds(new Set());
      if (onRefresh) onRefresh({ silent: true });
      setTimeout(() => setAssignSuccess(''), 3000);
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Failed to unassign users.');
    } finally {
      setAssigning(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    // Only regular users can be assigned to agents
    let filtered = users.filter(u => u.role === 'user');
    
    if (statusFilter === 'assigned') filtered = filtered.filter((user) => Boolean(user.assignedAgentId));
    if (statusFilter === 'unassigned') filtered = filtered.filter((user) => !user.assignedAgentId && user.assignmentStatus === 'unassigned');
    if (statusFilter === 'new') filtered = filtered.filter((user) => !user.assignedAgentId && (!user.assignmentStatus || user.assignmentStatus === 'new'));

    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }
    
    // Sort by newest
    filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return filtered;
  }, [users, statusFilter, searchQuery]);

  const allVisibleIds = filteredUsers.map(u => u.id);
  const allSelected = selectedUserIds.size === allVisibleIds.length && allVisibleIds.length > 0;

  return (
    <View className="flex-1">
      {/* ── Header Card ── */}
      <View
        className="mb-4 rounded-2xl border p-4"
        style={{ backgroundColor: colors.surface, borderColor: colors.border, zIndex: 20, position: 'relative' }}
      >
        {mobile && (
          <>
            <View className="flex-row items-center">
              <View
                className="mr-2 h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${colors.primary}18` }}
              >
                <UserRound size={16} color={colors.primary} />
              </View>
              <Text className="text-lg font-bold" style={{ color: colors.text }}>Assign Users to Agents</Text>
            </View>
            <Text className="mt-1 text-xs" style={{ color: colors.muted }}>
              Select users below then choose an agent to assign them to.
            </Text>
          </>
        )}

        {/* Agent picker and actions stay on one compact row on desktop. */}
        <View className={`${mobile ? 'mt-3 flex-col' : 'mt-0 flex-row items-center'} gap-2`} style={{ zIndex: 20 }}>
          <CustomDropdown
            value={targetAgentId}
            onChange={setTargetAgentId}
            options={agentOptions}
            placeholder="Select Agent or Manager..."
            colors={colors}
            darkMode={darkMode}
            height={40}
            className="w-full flex-1"
          />

          <View className={`${mobile ? 'flex-row w-full' : 'flex-row items-center'} gap-2`}>
            <Pressable
              disabled={assigning || selectedUserIds.size === 0 || !targetAgentId || statusFilter === 'assigned'}
              onPress={handleAssign}
              className={`h-10 flex-row items-center justify-center gap-1.5 rounded-xl px-3 ${mobile ? 'flex-1' : 'w-[128px]'}`}
              style={{
                backgroundColor: '#3b4c66',
                opacity: (assigning || selectedUserIds.size === 0 || !targetAgentId || statusFilter === 'assigned') ? 0.45 : 1,
              }}
            >
              {assigning ? (
                <ActivityIndicator size="small" color="#d8e2f0" />
              ) : (
                <>
                  <UserPlus size={14} color="#d8e2f0" />
                  <Text className="text-xs font-bold" style={{ color: '#d8e2f0' }}>
                    Assign{selectedUserIds.size > 0 ? ` (${selectedUserIds.size})` : ''}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              disabled={assigning || selectedUserIds.size === 0 || statusFilter !== 'assigned'}
              onPress={handleUnassign}
              className={`h-10 flex-row items-center justify-center gap-1.5 rounded-xl px-3 ${mobile ? 'flex-1' : 'w-[128px]'}`}
              style={{
                backgroundColor: '#3b4c66',
                opacity: (assigning || selectedUserIds.size === 0 || statusFilter !== 'assigned') ? 0.45 : 1,
              }}
            >
              {assigning ? (
                <ActivityIndicator size="small" color="#d8e2f0" />
              ) : (
                <>
                  <UserMinus size={14} color="#d8e2f0" />
                  <Text className="text-xs font-bold" style={{ color: '#d8e2f0' }}>
                    Unassign{selectedUserIds.size > 0 ? ` (${selectedUserIds.size})` : ''}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Messages ── */}
      {assignError ? (
        <View className="mb-3 rounded-xl bg-danger/10 p-3 border border-danger/20">
          <Text className="text-sm font-medium text-danger">{assignError}</Text>
        </View>
      ) : null}
      {assignSuccess ? (
        <View className="mb-3 rounded-xl p-3 border" style={{ backgroundColor: '#10b98115', borderColor: '#10b98130' }}>
          <Text className="text-sm font-medium" style={{ color: '#10b981' }}>{assignSuccess}</Text>
        </View>
      ) : null}

      {/* ── Search + Filter ── */}
      <View className="mb-3 gap-2" style={{ zIndex: 10, position: 'relative' }}>
        {/* Search */}
        <View className="h-11 flex-row items-center rounded-xl border px-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <Search size={15} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.muted}
            className="ml-2 flex-1 text-[13px]"
            style={{ color: colors.text, ...(Platform.OS === 'web' ? { outline: 'none' } : {}) }}
          />
        </View>

        {/* Filter + Select All Row */}
        <View className="flex-row items-center gap-2" style={{ zIndex: 15, position: 'relative' }}>
          <CustomDropdown
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setSelectedUserIds(new Set());
            }}
            options={statusOptions}
            colors={colors}
            darkMode={darkMode}
            height={42}
            backgroundColor={colors.surface}
            className="flex-1"
          />

          {/* Select All toggle */}
          <Pressable
            onPress={() => toggleAll(allVisibleIds)}
            className="h-[42px] flex-row items-center justify-center rounded-xl border px-3 gap-1.5"
            style={{ backgroundColor: colors.surface, borderColor: allSelected ? colors.primary : colors.border }}
          >
            {allSelected ? (
              <CheckSquare size={16} color={colors.primary} />
            ) : (
              <Square size={16} color={colors.muted} />
            )}
            <Text className="text-xs font-medium" style={{ color: allSelected ? colors.primary : colors.muted }}>
              {allSelected ? 'Deselect' : 'Select All'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── User List (Mobile Cards / Desktop Table) ── */}
      {mobile ? (
        /* Mobile: Card list */
        <View className="overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
          {loading || agentsLoading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : filteredUsers.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <UserRound size={32} color={colors.border} />
              <Text className="mt-3 text-sm font-medium" style={{ color: colors.muted }}>No users found matching filters.</Text>
            </View>
          ) : (
            <View className="gap-0">
              {filteredUsers.map((user, index) => {
                const isSelected = selectedUserIds.has(user.id);
                const initials = (user.name || user.email || '?').slice(0, 2).toUpperCase();
                return (
                  <Pressable
                    key={user.id}
                    onPress={() => toggleUser(user.id)}
                    className="flex-row items-center px-4 py-3"
                    style={{
                      backgroundColor: isSelected ? `${colors.primary}10` : 'transparent',
                      borderBottomWidth: index < filteredUsers.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    {/* Checkbox */}
                    <View className="mr-3">
                      {isSelected ? (
                        <CheckSquare size={20} color={colors.primary} />
                      ) : (
                        <Square size={20} color={colors.muted} />
                      )}
                    </View>

                    {/* Avatar */}
                    <View
                      className="items-center justify-center rounded-full mr-3"
                      style={{
                        width: 38, height: 38,
                        backgroundColor: isSelected ? `${colors.primary}20` : `${colors.primary}10`,
                        borderWidth: 1.5,
                        borderColor: isSelected ? `${colors.primary}50` : `${colors.primary}25`,
                      }}
                    >
                      <Text className="text-xs font-bold" style={{ color: colors.primary }}>{initials}</Text>
                    </View>

                    {/* Info */}
                    <View className="flex-1 min-w-0">
                      <Text numberOfLines={1} className="text-sm font-semibold" style={{ color: colors.text }}>{user.name}</Text>
                      <Text numberOfLines={1} className="text-[11px] mt-0.5" style={{ color: colors.muted }}>{user.email}</Text>
                      <Text numberOfLines={1} className="text-[10px] mt-0.5" style={{ color: colors.muted }}>
                        #{user.id} · {new Date(user.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    {/* Agent Badge */}
                    <View className="ml-2 items-end">
                      {user.assignedAgent ? (
                        <View
                          className="rounded-full px-2 py-0.5 border"
                          style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }}
                        >
                          <Text className="text-[10px] font-medium" numberOfLines={1} style={{ color: colors.primary, maxWidth: 80 }}>
                            {user.assignedAgent.name}
                          </Text>
                        </View>
                      ) : (
                        <View
                          className="rounded-full px-2 py-0.5 border"
                          style={{ backgroundColor: `${colors.danger}08`, borderColor: `${colors.danger}25` }}
                        >
                          <Text className="text-[10px]" style={{ color: colors.muted }}>Unassigned</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        /* Desktop: Table view */
        <View className="flex-1 overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <View>
            <View style={{ minWidth: 0 }}>
              <View className="flex-row items-center border-b px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.panel }}>
                <Pressable onPress={() => toggleAll(filteredUsers.map(u => u.id))} className="mr-4 h-6 w-6 items-center justify-center">
                  {(selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0) ? (
                    <CheckSquare size={18} color={colors.primary} />
                  ) : (
                    <Square size={18} color={colors.muted} />
                  )}
                </Pressable>
                <Text className="w-12 text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>ID</Text>
                <Text className="flex-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>User Name & Email</Text>
                <Text className="w-48 text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Current Agent</Text>
                <Text className="w-40 text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Assigned By</Text>
                <Text className="w-32 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Joined</Text>
              </View>

              {loading || agentsLoading ? (
                <View className="py-12 items-center justify-center">
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : filteredUsers.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <UserRound size={32} color={colors.border} className="mb-3" />
                  <Text className="text-sm font-medium" style={{ color: colors.muted }}>No users found matching filters.</Text>
                </View>
              ) : (
                <ScrollView>
                  {filteredUsers.map((user) => (
                    <Pressable
                      key={user.id}
                      onPress={() => toggleUser(user.id)}
                      className="flex-row items-center border-b px-4 py-3"
                      style={{ 
                        borderColor: colors.border,
                        backgroundColor: selectedUserIds.has(user.id) ? `${colors.primary}10` : 'transparent'
                      }}
                    >
                      <View className="mr-4 h-6 w-6 items-center justify-center">
                        {selectedUserIds.has(user.id) ? (
                          <CheckSquare size={18} color={colors.primary} />
                        ) : (
                          <Square size={18} color={colors.muted} />
                        )}
                      </View>
                      <Text className="w-12 text-[13px] font-medium" style={{ color: colors.muted }}>#{user.id}</Text>
                      <View className="flex-1">
                        <Text className="text-[13px] font-semibold" style={{ color: colors.text }} numberOfLines={1}>{user.name}</Text>
                        <Text className="text-[11px] mt-0.5" style={{ color: colors.muted }} numberOfLines={1}>{user.email}</Text>
                      </View>
                      <View className="w-48">
                        {user.assignedAgent ? (
                          <View className="self-start rounded-full px-2 py-0.5 border" style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }}>
                            <Text className="text-[11px] font-medium" style={{ color: colors.primary }} numberOfLines={1}>
                              {user.assignedAgent.name}
                            </Text>
                          </View>
                        ) : (
                          <Text className="text-[11px]" style={{ color: colors.muted }}>-</Text>
                        )}
                      </View>
                      <View className="w-40">
                        {user.assignedBy ? (
                          <View>
                            <Text className="text-[11px] font-medium" style={{ color: colors.text }} numberOfLines={1}>{user.assignedBy.name}</Text>
                            <Text className="mt-0.5 text-[10px] uppercase" style={{ color: colors.muted }}>{user.assignedBy.role}</Text>
                          </View>
                        ) : (
                          <Text className="text-[11px]" style={{ color: colors.muted }}>-</Text>
                        )}
                      </View>
                      <Text className="w-32 text-right text-[11px]" style={{ color: colors.muted }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </Text>
                    </Pressable>
                  ))}
                  <View style={{ height: 20 }} />
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
