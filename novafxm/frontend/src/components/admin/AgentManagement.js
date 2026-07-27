import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ChevronDown, Edit3, Eye, EyeOff, Plus, ShieldCheck, Trash2, X } from 'lucide-react-native';
import CustomButton from '../common/CustomButton';
import CustomInput from '../common/CustomInput';
import { useAppTheme } from '../../context/ThemeContext';
import { dateTime } from '../../utils/formatters';
import api from '../../services/api';

const availablePermissions = [
  { id: 'agents', label: 'Staff & Permissions' },
  { id: 'overview', label: 'Overview' },
  { id: 'marginAlerts', label: 'Margin Alerts' },
  { id: 'users', label: 'User Wallets' },
  { 
    id: 'userManagement', 
    label: 'User Management',
    subPermissions: [
      { id: 'assignUsers', label: 'Assign Users' },
      { id: 'userManagementUsers', label: 'Users' }
    ]
  },
  { id: 'verifications', label: 'Verifications' },

  {
    id: 'deposits',
    label: 'Deposits',
    subPermissions: [
      { id: 'depositAddresses', label: 'Deposit Method Address' },
      { id: 'depositsList', label: 'Deposits' },
    ],
  },
  { id: 'referrals', label: 'Referral Rewards' },
  {
    id: 'withdrawals',
    label: 'Withdrawals',
    subPermissions: [
      { id: 'withdrawalsList', label: 'Withdrawals' },
      { id: 'withdrawalDetails', label: 'Withdrawal Details' },
    ],
  },

  { id: 'userLevels', label: 'User Levels' },
  { id: 'trades', label: 'All Trades' },
  { id: 'addTrading', label: 'Add Trading' },
  { id: 'symbols', label: 'Symbol Settings' },
];
const allPermissionIds = availablePermissions.flatMap((permission) => [
  permission.id,
  ...(permission.subPermissions || []).map((subPermission) => subPermission.id),
]);
const permissionCategories = [
  { title: 'Workspace Access', ids: ['overview', 'marginAlerts', 'agents'] },
  { title: 'Client Operations', ids: ['userManagement', 'users', 'verifications', 'userLevels'] },
  { title: 'Financial Operations', ids: ['deposits', 'referrals', 'withdrawals'] },
  { title: 'Trading Operations', ids: ['trades', 'addTrading', 'symbols'] },
];

const getPermLabel = (permId) => {
  for (const p of availablePermissions) {
    if (p.id === permId) return p.label;
    if (p.subPermissions) {
      const sub = p.subPermissions.find(s => s.id === permId);
      if (sub) return `${p.label} - ${sub.label}`;
    }
  }
  return null;
};

const normalizePermissions = (permissions) => {
  if (Array.isArray(permissions)) return permissions;
  if (typeof permissions !== 'string') return [];
  try {
    const parsed = JSON.parse(permissions);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function AgentManagement() {
  const { width } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const mobile = width < 768;
  const tableHeaderBackground = darkMode ? colors.surface : '#f2eee0';

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [expandedAgentId, setExpandedAgentId] = useState(null);
  const [companyPermissionIds, setCompanyPermissionIds] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !sortOpen) return;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [sortOpen]);

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' },
    { value: 'managers', label: 'Managers' },
    { value: 'agents', label: 'Agents' },
  ];

  const filteredAgents = agents
    .filter(Boolean)
    .filter((agent) => {
      // 1. Search Query Filter
      const term = query.trim().toLowerCase();
      const matchesSearch = !term || (
        String(agent.name || '').toLowerCase().includes(term) ||
        String(agent.email || '').toLowerCase().includes(term) ||
        String(agent.phone || '').toLowerCase().includes(term) ||
        String(agent.role || '').toLowerCase().includes(term)
      );

      // 2. Role Filter (Managers / Agents)
      let matchesRole = true;
      if (sortBy === 'managers') {
        matchesRole = agent.role === 'manager';
      } else if (sortBy === 'agents') {
        matchesRole = agent.role === 'agent';
      }

      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      // 3. Sorting logic
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      // default / 'newest': newest first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'agent',
    permissions: [],
  });

  const loadAgents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/agents');
      setAgents(res.data?.agents || []);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Failed to load agents';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    api.get('/admin/company-permissions')
      .then((res) => setCompanyPermissionIds(Array.isArray(res.data?.permissions) ? res.data.permissions : []))
      .catch(() => setCompanyPermissionIds([]));
  }, []);

  const companyPermissions = companyPermissionIds === null
    ? availablePermissions
    : availablePermissions.map((permission) => ({
      ...permission,
      subPermissions: permission.subPermissions?.filter((sub) => companyPermissionIds.includes(sub.id)),
    })).filter((permission) => companyPermissionIds.includes(permission.id) || permission.subPermissions?.length);
  const allowedPermissionIds = companyPermissionIds === null ? allPermissionIds : companyPermissionIds;

  const openCreate = () => {
    setEditingAgent(null);
    setPasswordVisible(false);
    setForm({ name: '', email: '', phone: '', password: '', role: 'agent', permissions: [] });
    setModalVisible(true);
  };

  const openEdit = (agent) => {
    setEditingAgent(agent);
    setPasswordVisible(false);
    setForm({
      name: agent.name,
      email: agent.email,
      phone: agent.phone || '',
      password: '',
      role: agent.role || 'agent',
      permissions: normalizePermissions(agent?.permissions),
    });
    setModalVisible(true);
  };

  const togglePermission = (id, parentId = null) => {
    setForm(prev => {
      const perms = new Set(prev.permissions);
      if (perms.has(id)) {
        perms.delete(id);
      } else {
        perms.add(id);
      }
      
      if (parentId) {
        const parent = availablePermissions.find(p => p.id === parentId);
        if (parent && parent.subPermissions) {
          const anySubSelected = parent.subPermissions.some(sub => perms.has(sub.id));
          if (anySubSelected) {
            perms.add(parentId);
          } else {
            perms.delete(parentId);
          }
        }
      }
      return { ...prev, permissions: Array.from(perms) };
    });
  };

  const togglePermissionCategory = (permissionIds) => {
    const ids = permissionIds.flatMap((id) => {
      const permission = availablePermissions.find((item) => item.id === id);
      return [id, ...(permission?.subPermissions || []).map((sub) => sub.id)];
    }).filter((id) => allowedPermissionIds.includes(id));
    setForm((previous) => {
      const permissions = new Set(previous.permissions);
      const selectAll = ids.some((id) => !permissions.has(id));
      ids.forEach((id) => selectAll ? permissions.add(id) : permissions.delete(id));
      return { ...previous, permissions: Array.from(permissions) };
    });
  };

  const saveAgent = async () => {
    try {
      if (editingAgent) {
        await api.put(`/admin/agents/${editingAgent.id}`, form);
        Alert.alert('Success', 'Agent updated successfully');
      } else {
        await api.post('/admin/agents', form);
        Alert.alert('Success', 'Agent created successfully');
      }
      setModalVisible(false);
      loadAgents();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Failed to save agent';
      Alert.alert('Error', msg);
    }
  };

  const deleteAgent = (id) => {
    const performDelete = async () => {
      try {
        await api.delete(`/admin/agents/${id}`);
        loadAgents();
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to delete agent';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    const confirmMsg = 'Are you sure you want to delete this staff member? This action is permanent and they will no longer be able to log in.';

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(confirmMsg)) {
        performDelete();
      }
    } else {
      Alert.alert('Delete Staff Member', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Hidden dummy inputs to absorb browser credentials autofill */}
      <TextInput
        style={{ width: 0, height: 0, opacity: 0, position: 'absolute', left: -9999, top: -9999 }}
        autoComplete="username"
        textContentType="username"
      />
      <TextInput
        style={{ width: 0, height: 0, opacity: 0, position: 'absolute', left: -9999, top: -9999 }}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />

      <View 
        className="flex-col md:flex-row md:items-center justify-between gap-3 p-4 md:px-8 md:py-4"
        style={{ zIndex: sortOpen ? 100 : 1 }}
      >
        {/* Search Bar */}
        <View className="w-full md:flex-1 md:max-w-[360px]">
          <TextInput
            placeholder="Search staff by name, email..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoComplete="new-password"
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
            autoCapitalize="none"
            className="h-10 md:h-12 rounded-xl border px-3 md:px-4 text-sm md:text-base w-full"
            style={{ 
              backgroundColor: darkMode ? colors.surface : '#f6fff9', 
              borderColor: colors.border, 
              color: colors.text 
            }}
          />
        </View>

        {/* Sort Dropdown & Action Button Container */}
        <View className="flex-row items-center gap-3 w-full md:w-auto md:flex-1 justify-between md:justify-end" style={{ zIndex: sortOpen ? 110 : 2 }}>
          {/* Sort Dropdown */}
          <View ref={dropdownRef} className="relative flex-1 md:flex-none w-auto md:w-[220px]">
            <Pressable
              onPress={() => setSortOpen((current) => !current)}
              className="h-10 md:h-12 flex-row items-center justify-between rounded-xl border px-3"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                {sortOptions.find((opt) => opt.value === sortBy)?.label || 'Sort By'}
              </Text>
              <ChevronDown size={14} color={colors.muted} style={{ transform: [{ rotate: sortOpen ? '180deg' : '0deg' }] }} />
            </Pressable>
            {sortOpen && (
              <ScrollView
                nestedScrollEnabled
                className="absolute left-0 right-0 rounded-xl border shadow-lg"
                style={{ top: mobile ? 42 : 52, maxHeight: 245, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, zIndex: 150 }}
              >
                {sortOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setSortBy(option.value);
                      setSortOpen(false);
                    }}
                    className={`border-b px-4 py-3 ${option.value === sortBy ? 'bg-primary/10' : ''}`}
                    style={{ borderColor: colors.border }}
                  >
                    <Text
                      className={option.value === sortBy ? 'font-medium text-primary' : ''}
                      style={option.value === sortBy ? null : { color: colors.text }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Action Button */}
          <CustomButton 
            title="Create Staff" 
            icon={<Plus size={18} color="#0B0B0B" />} 
            onPress={openCreate} 
            className="h-10 md:h-12 flex-1 md:flex-none" 
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 md:px-8" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="overflow-hidden rounded-2xl border" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
          {mobile ? (
            /* Mobile View: Compact list card */
            <View className="gap-3 p-3">
              {filteredAgents.map(agent => (
                <View key={agent.id} className="rounded-xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1 mr-4">
                      <View className="flex-row flex-wrap items-center gap-2 mb-1">
                        <Text className="text-base font-bold" style={{ color: colors.text }}>{agent.name}</Text>
                        <View className="px-2 py-0.5 rounded-full border" style={{ backgroundColor: agent.role === 'manager' ? `${colors.success}15` : `${colors.primary}15`, borderColor: agent.role === 'manager' ? `${colors.success}30` : `${colors.primary}30` }}>
                          <Text className="text-[9px] uppercase font-bold" style={{ color: agent.role === 'manager' ? colors.success : colors.primary }}>{agent.role}</Text>
                        </View>
                      </View>
                      <Text className="text-xs" style={{ color: colors.muted }}>{agent.email}</Text>
                      {agent.phone ? <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>{agent.phone}</Text> : null}
                    </View>
                    <View className="flex-row gap-1.5">
                      <Pressable onPress={() => openEdit(agent)} className="p-2 rounded-full" style={{ backgroundColor: `${colors.primary}15` }}>
                        <Edit3 size={14} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => deleteAgent(agent.id)} className="p-2 rounded-full bg-danger/10">
                        <Trash2 size={14} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>

                  <View className="border-t pt-3" style={{ borderColor: colors.border }}>
                    {normalizePermissions(agent?.permissions).length === 0 ? (
                      <Text className="text-xs italic" style={{ color: colors.muted }}>No permissions assigned</Text>
                    ) : (
                      <View className="items-start w-full">
                        <Pressable 
                          onPress={() => setExpandedAgentId(expandedAgentId === agent.id ? null : agent.id)}
                          className="flex-row items-center gap-1.5 py-1 px-2.5 rounded-lg border"
                          style={{ 
                            backgroundColor: colors.surface, 
                            borderColor: expandedAgentId === agent.id ? colors.primary : colors.border 
                          }}
                        >
                          <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: expandedAgentId === agent.id ? colors.primary : colors.muted }}>
                            Permissions ({normalizePermissions(agent?.permissions).length})
                          </Text>
                          <ChevronDown 
                            size={12} 
                            color={expandedAgentId === agent.id ? colors.primary : colors.muted} 
                            style={{ transform: [{ rotate: expandedAgentId === agent.id ? '180deg' : '0deg' }] }} 
                          />
                        </Pressable>
                        
                        {expandedAgentId === agent.id && (
                          <View className="flex-row flex-wrap gap-1.5 mt-2 p-2 rounded-lg border w-full" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                            {normalizePermissions(agent?.permissions).map(permId => {
                              const label = getPermLabel(permId);
                              if (!label) return null;
                              return (
                                <View key={permId} className="px-2 py-0.5 rounded border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                                  <Text className="text-[10px] font-medium" style={{ color: colors.text }}>{label}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              ))}
              {!loading && filteredAgents.length === 0 && (
                <View className="py-10 items-center justify-center">
                  <ShieldCheck size={48} color={colors.border} />
                  <Text className="mt-4 text-base" style={{ color: colors.muted }}>
                    {agents.filter(Boolean).length === 0 ? 'No agents found. Create one to get started.' : 'No matching staff members found.'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            /* Desktop View: Multi-column table */
            <View className="w-full">
              {/* Table Header */}
              <View className="flex-row border-b px-5 py-4" style={{ backgroundColor: tableHeaderBackground, borderColor: colors.border }}>
                {['Staff Member', 'Role', 'Phone Number', 'Permissions', 'Joined Date', 'Actions'].map((heading, index) => (
                  <View 
                    key={heading} 
                    style={{ 
                      flex: [2.5, 1, 1.2, 3, 1.8, 1.2][index] 
                    }}
                  >
                    <Text 
                      className="text-xs font-semibold uppercase tracking-wider" 
                      style={{ color: colors.muted }}
                    >
                      {heading}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Table Rows */}
              {filteredAgents.map(agent => (
                <View key={agent.id} className="flex-row items-center border-b px-5 py-4" style={{ borderColor: colors.border }}>
                  {/* Column 1: Staff Member */}
                  <View style={{ flex: 2.5 }}>
                    <Text className="font-semibold text-sm" style={{ color: colors.text }}>{agent.name}</Text>
                    <Text className="mt-0.5 text-xs" style={{ color: colors.muted }}>{agent.email}</Text>
                  </View>

                  {/* Column 2: Role */}
                  <View style={{ flex: 1 }}>
                    <View className="self-start px-2.5 py-1 rounded-full border" style={{ backgroundColor: agent.role === 'manager' ? `${colors.success}15` : `${colors.primary}15`, borderColor: agent.role === 'manager' ? `${colors.success}30` : `${colors.primary}30` }}>
                      <Text className="text-[10px] uppercase font-bold" style={{ color: agent.role === 'manager' ? colors.success : colors.primary }}>{agent.role}</Text>
                    </View>
                  </View>

                  {/* Column 3: Phone Number */}
                  <View style={{ flex: 1.2 }}>
                    <Text className="text-sm" style={{ color: colors.text }}>{agent.phone || '-'}</Text>
                  </View>

                  {/* Column 4: Permissions */}
                  <View style={{ flex: 3 }} className="pr-4 py-2 justify-center">
                    {normalizePermissions(agent?.permissions).length === 0 ? (
                      <Text className="text-xs italic" style={{ color: colors.muted }}>No permissions</Text>
                    ) : (
                      <View className="items-start w-full">
                        <Pressable 
                          onPress={() => setExpandedAgentId(expandedAgentId === agent.id ? null : agent.id)}
                          className="flex-row items-center gap-1.5 py-1.5 px-3 rounded-lg border"
                          style={{ 
                            backgroundColor: colors.surface, 
                            borderColor: expandedAgentId === agent.id ? colors.primary : colors.border 
                          }}
                        >
                          <Text className="text-[11px] font-semibold" style={{ color: expandedAgentId === agent.id ? colors.primary : colors.text }}>
                            {normalizePermissions(agent?.permissions).length} Permissions
                          </Text>
                          <ChevronDown 
                            size={12} 
                            color={expandedAgentId === agent.id ? colors.primary : colors.muted} 
                            style={{ transform: [{ rotate: expandedAgentId === agent.id ? '180deg' : '0deg' }] }} 
                          />
                        </Pressable>
                        
                        {expandedAgentId === agent.id && (
                          <View className="flex-row flex-wrap gap-1.5 mt-2 p-2 rounded-lg border w-full" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                            {normalizePermissions(agent?.permissions).map(permId => {
                              const label = getPermLabel(permId);
                              if (!label) return null;
                              return (
                                <View key={permId} className="px-2 py-0.5 rounded border" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                                  <Text className="text-[10px] font-medium" style={{ color: colors.text }}>{label}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Column 5: Joined Date */}
                  <View style={{ flex: 1.8 }}>
                    <Text className="text-xs" style={{ color: colors.muted }}>{dateTime(agent.createdAt)}</Text>
                  </View>

                  {/* Column 6: Actions */}
                  <View style={{ flex: 1.2 }} className="flex-row gap-2">
                    <Pressable onPress={() => openEdit(agent)} className="p-2 rounded-full" style={{ backgroundColor: `${colors.primary}15` }}>
                      <Edit3 size={15} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => deleteAgent(agent.id)} className="p-2 rounded-full bg-danger/10">
                      <Trash2 size={15} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}

              {/* Empty State */}
              {!loading && filteredAgents.length === 0 && (
                <View className="min-h-[140px] items-center justify-center p-8">
                  <ShieldCheck size={48} color={colors.border} />
                  <Text className="mt-4 text-base" style={{ color: colors.muted }}>
                    {agents.filter(Boolean).length === 0 ? 'No agents found. Create one to get started.' : 'No matching staff members found.'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 items-center justify-center p-4 md:p-8" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="w-full max-w-[500px] rounded-[24px] p-6 shadow-xl" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, maxHeight: '90%', overflow: 'hidden' }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold" style={{ color: colors.text }}>{editingAgent ? 'Edit Staff Member' : 'Create Staff Member'}</Text>
              <Pressable onPress={() => setModalVisible(false)} className="p-2 -mr-2"><X size={20} color={colors.muted} /></Pressable>
            </View>

            <ScrollView
              className="flex-shrink-1"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator
              persistentScrollbar
            >
              <View className="gap-4">
                <CustomInput label="Full Name" placeholder="e.g. John Doe" value={form.name} onChangeText={t => setForm({...form, name: t})} />
                <CustomInput label="Email Address" placeholder="agent@example.com" value={form.email} onChangeText={t => setForm({...form, email: t})} keyboardType="email-address" />
                <CustomInput label="Phone (Optional)" placeholder="+1234567890" value={form.phone} onChangeText={t => setForm({...form, phone: t})} keyboardType="phone-pad" />
                <View style={{ position: 'relative' }}>
                  <CustomInput
                    label={editingAgent ? 'New Password (Optional)' : 'Password'}
                    placeholder="Min 8 characters"
                    value={form.password}
                    onChangeText={t => setForm({...form, password: t})}
                    secureTextEntry={!passwordVisible}
                    style={{ paddingRight: 48 }}
                  />
                  <Pressable
                    onPress={() => setPasswordVisible((current) => !current)}
                    className="absolute bottom-3 right-0 h-12 w-12 items-center justify-center"
                    accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                  >
                    {passwordVisible ? <Eye size={18} color={colors.muted} /> : <EyeOff size={18} color={colors.muted} />}
                  </Pressable>
                </View>
                
                <View className="mt-2">
                  <Text className="text-sm font-bold mb-3" style={{ color: colors.text }}>Role</Text>
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => {
                        setForm({...form, role: 'agent'});
                      }}
                      className="flex-1 flex-row items-center justify-center rounded-xl border px-3 py-3"
                      style={{ borderColor: form.role === 'agent' ? colors.primary : colors.border, backgroundColor: form.role === 'agent' ? `${colors.primary}15` : colors.surface }}
                    >
                      <Text className="text-sm font-medium" style={{ color: form.role === 'agent' ? colors.primary : colors.text }}>Agent</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setForm((current) => (
                        current.role === 'manager'
                          ? current
                          : { ...current, role: 'manager', permissions: allowedPermissionIds }
                      ))}
                      className="flex-1 flex-row items-center justify-center rounded-xl border px-3 py-3"
                      style={{ borderColor: form.role === 'manager' ? colors.primary : colors.border, backgroundColor: form.role === 'manager' ? `${colors.primary}15` : colors.surface }}
                    >
                      <Text className="text-sm font-medium" style={{ color: form.role === 'manager' ? colors.primary : colors.text }}>Manager</Text>
                    </Pressable>
                  </View>
                </View>
                
                <View className="mt-2 pb-4">
                  <Text className="text-sm font-bold mb-3" style={{ color: colors.text }}>Permissions</Text>
                  {form.role === 'manager' ? <Text className="mb-3 text-xs" style={{ color: colors.muted }}>All permissions are selected by default. You can remove any permission as needed.</Text> : null}
                  <View className="gap-4">
                    {permissionCategories.map((category) => {
                      const tabs = category.ids
                        .map((id) => availablePermissions.find((permission) => permission.id === id))
                        .filter((permission) => permission && allowedPermissionIds.includes(permission.id));
                      if (!tabs.length) return null;
                      const categoryIds = tabs.flatMap((permission) => [permission.id, ...(permission.subPermissions || []).map((sub) => sub.id)]);
                      const allSelected = categoryIds.every((id) => form.permissions.includes(id));
                      return (
                        <View key={category.title} className="rounded-2xl border p-3" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                          <View className="mb-3 flex-row items-center justify-between">
                            <Text className="text-sm font-bold" style={{ color: colors.text }}>{category.title}</Text>
                            <Pressable onPress={() => togglePermissionCategory(category.ids)} className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: `${colors.primary}18` }}>
                              <Text className="text-[11px] font-bold" style={{ color: colors.primary }}>{allSelected ? 'Clear all' : 'Select all'}</Text>
                            </Pressable>
                          </View>
                          <View className="gap-2">
                            {tabs.map((permission) => {
                              const ids = [permission.id, ...(permission.subPermissions || []).map((sub) => sub.id)];
                              const selected = ids.every((id) => form.permissions.includes(id));
                              return <Pressable key={permission.id} onPress={() => togglePermissionCategory([permission.id])} className="flex-row items-center rounded-xl border px-3 py-2.5" style={{ borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}08` : colors.panel }}><View className="mr-2 h-4 w-4 items-center justify-center rounded-sm border" style={{ borderColor: selected ? colors.primary : colors.muted, backgroundColor: selected ? colors.primary : 'transparent' }}>{selected ? <View className="h-2 w-2 rounded-[2px] bg-white" /> : null}</View><Text className="text-sm font-semibold" style={{ color: selected ? colors.primary : colors.text }}>{permission.label}</Text></Pressable>;
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-3 mt-6 pt-4 border-t" style={{ borderColor: colors.border }}>
              <View className="flex-1">
                <CustomButton title="Cancel" variant="outline" onPress={() => setModalVisible(false)} />
              </View>
              <View className="flex-1">
                <CustomButton title={editingAgent ? "Save Changes" : "Create"} onPress={saveAgent} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
