import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Activity, AlertTriangle, Award, BanknoteArrowDown, BanknoteArrowUp, BarChart3, Building2, Check, ChevronDown, ChevronRight, Coins, LayoutDashboard, Menu, Plus, Settings, ShieldCheck, TrendingUp, UserRound, Users, UsersRound, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../src/utils/storage';
import SymbolSettings from '../src/components/admin/SymbolSettings';
import AgentManagement from '../src/components/admin/AgentManagement';
import RequireAuth from '../src/components/auth/RequireAuth';
import LoadingSpinner from '../src/components/common/LoadingSpinner';
import { Redirect } from 'expo-router';
import AdminScreen from './admin';
import NovaLogo from '../src/components/brand/NovaLogo';

const permissionGroups = [
  { title: 'Workspace Access', items: [
    ['overview', 'Dashboard Overview', 'Open and review the main dashboard widgets.'],
    ['marginAlerts', 'Margin Alerts', 'View clients that need margin attention.'],
    ['agents', 'Staff & Permissions', 'Create and manage company agents and managers.'],
  ] },
  { title: 'Client Operations', items: [
    ['userManagement', 'User Management', 'Manage users and their staff assignments.'],
    ['users', 'User Wallets', 'Review client balances and wallet details.'],
    ['verifications', 'Verification Review', 'Review identity verification requests.'],
    ['userLevels', 'Trading Levels', 'Manage client trading levels.'],
  ] },
  { title: 'Financial Operations', items: [
    ['deposits', 'Deposits', 'Review deposit requests and payment addresses.'],
    ['withdrawals', 'Withdrawals', 'Review withdrawal requests and payout details.'],
    ['referrals', 'Referral Rewards', 'Review referral reward requests.'],
  ] },
  { title: 'Trading Operations', items: [
    ['trades', 'All Trades', 'Review all client trading activity.'],
    ['addTrading', 'Add Trading', 'Place live or historical trades for clients.'],
    ['symbols', 'Symbol Settings', 'Configure available trading symbols.'],
  ] },
];
const allPermissionIds = permissionGroups.flatMap((group) => group.items.map(([id]) => id));
const permissionName = (id) => permissionGroups.flatMap((group) => group.items).find(([itemId]) => itemId === id)?.[1] || id;
const hiddenParentPermissions = ['assignUsers', 'userManagementUsers', 'depositAddresses', 'depositsList', 'withdrawalsList', 'withdrawalDetails'];

const normalizePermissions = (permissions) => Array.isArray(permissions) ? permissions : [];

function MasterDashboard() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const mobile = width < 860;
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [tab, setTab] = useState('overview');
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedAdminId, setExpandedAdminId] = useState(null);
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ name: '', identifier: '' });

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === String(selectedProjectId)) || projects[0] || null,
    [projects, selectedProjectId],
  );
  const selectedAdmin = selectedProject?.admins?.find((admin) => String(admin.id) === String(selectedAdminId)) || selectedProject?.admins?.[0] || null;

  useEffect(() => {
    if (user?.role !== 'master') router.replace('/login');
  }, [user, router]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/master/projects');
      const nextProjects = response.data?.projects || [];
      setProjects(nextProjects);
      setSelectedProjectId((current) => current || nextProjects[0]?.id || null);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load companies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.role === 'master') loadProjects(); }, [user?.role]);
  useEffect(() => {
    if (selectedProject) {
      storage.set('x-project-id', String(selectedProject.id)).catch(() => {});
      storage.set('x-project-name', selectedProject.name).catch(() => {});
      if (typeof window !== 'undefined') {
        localStorage.setItem('x-project-id', String(selectedProject.id));
        localStorage.setItem('x-project-name', selectedProject.name);
      }
      api.defaults.headers.common['x-project-id'] = selectedProject.id;
    }
    setSelectedAdminId(selectedProject?.admins?.[0]?.id || null);
    setExpandedAdminId(null);
  }, [selectedProjectId, selectedProject]);

  const showError = (title, message) => Platform.OS === 'web' ? window.alert(`${title}: ${message}`) : Alert.alert(title, message);
  const handleCreate = async () => {
    if (!form.name.trim() || !form.identifier.trim()) return showError('Validation error', 'Company name and identifier are required.');
    try {
      const response = await api.post('/master/projects', { ...form, permissions: [] });
      setModalVisible(false);
      setForm({ name: '', identifier: '' });
      await loadProjects();
      setSelectedProjectId(response.data?.project?.id || null);
      setTab('permissions');
    } catch (error) { showError('Error', error.response?.data?.message || error.message); }
  };

  const saveCompanyPermissions = async (nextPermissions) => {
    if (!selectedProject) return;
    setSaving(true);
    try {
      const response = await api.put(`/master/projects/${selectedProject.id}`, { permissions: nextPermissions });
      setProjects((current) => current.map((project) => project.id === selectedProject.id ? { ...project, ...response.data.project, admins: project.admins } : project));
    } catch (error) { showError('Error', error.response?.data?.message || 'Unable to save company permissions.'); }
    finally { setSaving(false); }
  };

  const toggleCompanyPermission = (id) => {
    const current = normalizePermissions(selectedProject?.permissions).filter((permission) => !hiddenParentPermissions.includes(permission));
    const next = current.includes(id) ? current.filter((permission) => permission !== id) : [...current, id];
    saveCompanyPermissions(next);
  };

  const toggleCompanyPermissionGroup = (items) => {
    const ids = items.map(([id]) => id);
    const current = normalizePermissions(selectedProject?.permissions).filter((permission) => !hiddenParentPermissions.includes(permission));
    const allSelected = ids.every((id) => current.includes(id));
    saveCompanyPermissions(allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids])));
  };

  const toggleAdminPermission = async (id) => {
    if (!selectedProject || !selectedAdmin) return;
    const current = normalizePermissions(selectedAdmin.permissions).filter((permission) => !hiddenParentPermissions.includes(permission));
    const next = current.includes(id) ? current.filter((permission) => permission !== id) : [...current, id];
    setSaving(true);
    try {
      const response = await api.put(`/master/projects/${selectedProject.id}/admins/${selectedAdmin.id}/permissions`, { permissions: next });
      setProjects((currentProjects) => currentProjects.map((project) => project.id !== selectedProject.id ? project : {
        ...project,
        admins: project.admins.map((admin) => admin.id === selectedAdmin.id ? { ...admin, ...response.data.admin } : admin),
      }));
    } catch (error) { showError('Error', error.response?.data?.message || 'Unable to save administrator permissions.'); }
    finally { setSaving(false); }
  };

  const setAllAdminPermissions = async () => {
    if (!selectedProject || !selectedAdmin) return;
    const current = normalizePermissions(selectedAdmin.permissions);
    const selectAll = visibleCompanyPermissions.some((permission) => !current.includes(permission));
    const permissions = selectAll ? visibleCompanyPermissions : [];
    setSaving(true);
    try {
      const response = await api.put(`/master/projects/${selectedProject.id}/admins/${selectedAdmin.id}/permissions`, { permissions });
      setProjects((currentProjects) => currentProjects.map((project) => project.id !== selectedProject.id ? project : {
        ...project,
        admins: project.admins.map((admin) => admin.id === selectedAdmin.id ? { ...admin, ...response.data.admin } : admin),
      }));
    } catch (error) { showError('Error', error.response?.data?.message || 'Unable to save administrator permissions.'); }
    finally { setSaving(false); }
  };

  const selectProjectAndSection = async (sectionName) => {
    if (selectedProject) {
      await storage.set('x-project-id', String(selectedProject.id));
      await storage.set('x-project-name', selectedProject.name);
      if (typeof window !== 'undefined') {
        localStorage.setItem('x-project-id', String(selectedProject.id));
        localStorage.setItem('x-project-name', selectedProject.name);
      }
      api.defaults.headers.common['x-project-id'] = selectedProject.id;
    }
    setTab(sectionName);
  };

  const selectProject = async () => {
    if (!selectedProject) return;
    await storage.set('x-project-id', String(selectedProject.id));
    await storage.set('x-project-name', selectedProject.name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('x-project-id', String(selectedProject.id));
      localStorage.setItem('x-project-name', selectedProject.name);
    }
    api.defaults.headers.common['x-project-id'] = selectedProject.id;
    router.replace('/admin');
  };

  const toggleCompanyStatus = async () => {
    if (!selectedProject) return;
    const nextStatus = selectedProject.status === 'active' ? 'inactive' : 'active';
    const warning = nextStatus === 'inactive'
      ? 'Make this company inactive? Its admins, managers, agents, and users will lose access immediately.'
      : 'Make this company active again?';
    const confirmed = Platform.OS === 'web' ? window.confirm(warning) : await new Promise((resolve) => Alert.alert('Change company status', warning, [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Confirm', onPress: () => resolve(true) }]));
    if (!confirmed) return;
    setSaving(true);
    try {
      const response = await api.put(`/master/projects/${selectedProject.id}`, { status: nextStatus });
      setProjects((current) => current.map((project) => project.id === selectedProject.id ? { ...project, ...response.data.project } : project));
    } catch (error) { showError('Error', error.response?.data?.message || 'Unable to change company status.'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!user || user.role !== 'master') return <Redirect href="/login" />;
  const companyPermissions = normalizePermissions(selectedProject?.permissions);
  const adminPermissions = normalizePermissions(selectedAdmin?.permissions);
  const visibleCompanyPermissions = companyPermissions.filter((permission) => allPermissionIds.includes(permission));
  const masterNavigation = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, dashboard: true },
    { id: 'userManagement', label: 'User Management', icon: UsersRound, dashboard: true },
    { id: 'users', label: 'User Wallets', icon: UsersRound, dashboard: true },
    { id: 'verifications', label: 'Verifications', icon: ShieldCheck, dashboard: true },
    { id: 'userLevels', label: 'User Levels', icon: Award, dashboard: true },
    { id: 'deposits', label: 'Deposits', icon: BanknoteArrowDown, dashboard: true },
    { id: 'withdrawals', label: 'Withdrawals', icon: BanknoteArrowUp, dashboard: true },
    { id: 'referrals', label: 'Referral Rewards', icon: UsersRound, dashboard: true },
    { id: 'trades', label: 'All Trades', icon: BarChart3, dashboard: true },
    { id: 'addTrading', label: 'Add Trading', icon: TrendingUp, dashboard: true },
    { id: 'marginAlerts', label: 'Margin Alerts', icon: AlertTriangle, dashboard: true },
    { divider: true },
    { id: 'staff', label: 'Staff & Permissions', icon: Users },
    { id: 'symbols', label: 'Symbol Settings', icon: Coins },
    { id: 'permissions', label: 'Company Permissions', icon: ShieldCheck },
    { id: 'panel', label: 'Company Status & Admins', icon: Activity },
  ];
  const selectNavigation = (item) => {
    if (item.dashboard) selectProjectAndSection(item.id);
    else setTab(item.id);
    setMobileNavOpen(false);
  };
  const renderNavigation = (compact = false) => masterNavigation.map((item, index) => {
    if (item.divider) return <View key={`divider-${index}`} className="my-2 h-px" style={{ backgroundColor: colors.border }} />;
    const Icon = item.icon;
    const active = tab === item.id;
    return <Pressable key={item.id} onPress={() => selectNavigation(item)} className={`mb-1 flex-row items-center rounded-2xl ${compact ? 'px-4 py-3' : 'px-4 py-3'}`} style={{ backgroundColor: active ? colors.primary : 'transparent' }}>
      <Icon size={18} color={active ? '#0B0B0B' : colors.muted} />
      <Text className="ml-3 flex-1 text-sm font-semibold" style={{ color: active ? '#0B0B0B' : colors.muted }}>{item.label}</Text>
    </Pressable>;
  });

  return (
    <View className={mobile ? 'flex-1' : 'flex-1 flex-row'} style={{ backgroundColor: colors.background }}>
      {mobile ? <View className="flex-row items-center justify-between border-b px-4 py-3" style={{ backgroundColor: colors.panel, borderColor: colors.border }}><Pressable onPress={() => setMobileNavOpen(true)} className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors.surface }} accessibilityLabel="Open master navigation"><Menu size={22} color={colors.text} /></Pressable><View className="items-center"><Text className="text-base font-bold" style={{ color: colors.text }}>Master Console</Text><Text className="text-[11px]" style={{ color: colors.muted }}>{selectedProject?.name || 'Choose a company'}</Text></View><View className="h-10 w-10 items-center justify-center rounded-full border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><UserRound size={19} color={colors.muted} /></View></View> : null}
      {!mobile ? <View className="w-[360px] border-r" style={{ backgroundColor: colors.panel, borderColor: colors.border }}><View className="border-b px-7 py-6" style={{ borderColor: colors.border }}><NovaLogo width={152} height={38} /><Text className="mt-3 text-xl font-medium" style={{ color: colors.text }}>Master Console</Text><Text className="mt-1 text-xs" style={{ color: colors.muted }}>Company control center</Text></View><View className="px-5 pt-5"><Text className="mb-2 text-[11px] font-bold uppercase" style={{ color: colors.muted }}>Selected company</Text><Pressable onPress={() => setCompanyMenuOpen((open) => !open)} className="flex-row items-center justify-between rounded-xl border px-3 py-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><Building2 size={17} color={colors.primary} /><Text numberOfLines={1} className="ml-2 flex-1 text-sm font-semibold" style={{ color: colors.text }}>{selectedProject?.name || 'Choose a company'}</Text><ChevronDown size={17} color={colors.muted} /></Pressable>{companyMenuOpen ? <View className="mt-2 rounded-xl border p-1" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>{projects.map((project) => <Pressable key={project.id} onPress={() => { setSelectedProjectId(project.id); setCompanyMenuOpen(false); }} className="rounded-lg px-3 py-2.5" style={{ backgroundColor: project.id === selectedProject?.id ? `${colors.primary}18` : 'transparent' }}><Text className="text-sm font-medium" style={{ color: project.id === selectedProject?.id ? colors.primary : colors.text }}>{project.name}</Text><Text className="mt-0.5 text-[10px]" style={{ color: colors.muted }}>{project.identifier}</Text></Pressable>)}</View> : null}</View><ScrollView className="mt-5 flex-1 px-5" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator>{renderNavigation()}</ScrollView></View> : null}
      <Modal visible={mobile && mobileNavOpen} transparent animationType="fade" onRequestClose={() => setMobileNavOpen(false)}>
        <View className="flex-1 flex-row bg-black/50">
          <View className="h-full w-[86%] max-w-[340px] border-r" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
            <View className="flex-row items-center justify-between border-b px-5 py-5" style={{ borderColor: colors.border }}>
              <View><NovaLogo width={132} height={33} /><Text className="mt-2 text-lg font-medium" style={{ color: colors.text }}>Master Console</Text><Text className="text-xs" style={{ color: colors.muted }}>Company control center</Text></View>
              <Pressable onPress={() => setMobileNavOpen(false)} className="h-10 w-10 items-center justify-center rounded-xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}><X size={20} color={colors.primary} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 42 }}>
              <Text className="mb-2 text-[11px] font-bold uppercase" style={{ color: colors.muted }}>Selected company</Text>
              <View className="mb-5 rounded-xl border p-1" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>{projects.map((project) => <Pressable key={project.id} onPress={() => { setSelectedProjectId(project.id); setMobileNavOpen(false); }} className="rounded-lg px-3 py-3" style={{ backgroundColor: project.id === selectedProject?.id ? `${colors.primary}18` : 'transparent' }}><Text className="text-sm font-semibold" style={{ color: project.id === selectedProject?.id ? colors.primary : colors.text }}>{project.name}</Text><Text className="mt-0.5 text-[10px]" style={{ color: colors.muted }}>{project.identifier}</Text></Pressable>)}</View>
              {renderNavigation(true)}
            </ScrollView>
          </View>
          <Pressable className="flex-1" onPress={() => setMobileNavOpen(false)} />
        </View>
      </Modal>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: mobile ? 16 : 30 }}>
        {loading ? (
          <Text style={{ color: colors.muted }}>Loading companies...</Text>
        ) : !selectedProject ? (
          <Text style={{ color: colors.muted }}>Create a company to begin.</Text>
        ) : ['overview', 'userManagement', 'users', 'verifications', 'userLevels', 'deposits', 'withdrawals', 'referrals', 'trades', 'addTrading', 'marginAlerts'].includes(tab) ? (
          <AdminScreen key={`${selectedProject?.id}-${tab}`} initialSection={tab} hideSidebar={true} />
        ) : tab === 'staff' ? (
          <AgentManagement key={selectedProject?.id} />
        ) : tab === 'symbols' ? (
          <View className="rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
            <View className="mb-1 flex-row items-center gap-2">
              <ShieldCheck size={19} color={colors.primary} />
              <Text className="text-lg font-bold" style={{ color: colors.text }}>Currency Access</Text>
            </View>
            <Text className="mb-5 text-sm" style={{ color: colors.muted }}>
              Control the coins and trading symbols available in this company's charts. Hidden symbols are blocked only for this company.
            </Text>
            <SymbolSettings endpoint={`/master/projects/${selectedProject.id}/symbols`} embedded />
          </View>
        ) : tab === 'panel' ? (
          <>
            <View className="mb-7 flex-row flex-wrap items-start justify-between gap-4">
              <View>
                <Text className="text-3xl font-bold" style={{ color: colors.text }}>{selectedProject.name}</Text>
                <Text className="mt-1 text-sm" style={{ color: colors.muted }}>Company panel · {selectedProject.identifier}</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Pressable disabled={saving} onPress={toggleCompanyStatus} className={`rounded-xl border px-4 py-3 ${saving ? 'opacity-50' : ''}`} style={{ backgroundColor: selectedProject.status === 'active' ? `${colors.danger}12` : `${colors.success}14`, borderColor: selectedProject.status === 'active' ? colors.danger : colors.success }}>
                  <Text className="font-bold" style={{ color: selectedProject.status === 'active' ? colors.danger : colors.success }}>{selectedProject.status === 'active' ? 'Make Inactive' : 'Make Active'}</Text>
                </Pressable>
                <Pressable disabled={selectedProject.status !== 'active'} onPress={selectProject} className={`flex-row items-center gap-2 rounded-xl px-4 py-3 ${selectedProject.status !== 'active' ? 'opacity-50' : ''}`} style={{ backgroundColor: colors.primary }}>
                  <Settings size={17} color="#0B0B0B" />
                  <Text className="font-bold" style={{ color: '#0B0B0B' }}>Open Admin Dashboard</Text>
                </Pressable>
              </View>
            </View>
            <View className="mb-6 flex-row flex-wrap gap-3">
              <View className="min-w-[170px] flex-1 rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                <Text className="text-xs uppercase" style={{ color: colors.muted }}>Managers</Text>
                <Text className="mt-2 text-2xl font-bold" style={{ color: colors.text }}>{selectedProject.admins?.length || 0}</Text>
              </View>
              <View className="min-w-[170px] flex-1 rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                <Text className="text-xs uppercase" style={{ color: colors.muted }}>Company Permissions</Text>
                <Text className="mt-2 text-2xl font-bold" style={{ color: colors.text }}>{companyPermissions.length}</Text>
              </View>
              <View className="min-w-[170px] flex-1 rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
                <Text className="text-xs uppercase" style={{ color: colors.muted }}>Status</Text>
                <Text className="mt-2 text-base font-bold" style={{ color: selectedProject.status === 'active' ? colors.success : colors.danger }}>{selectedProject.status}</Text>
              </View>
            </View>
            <View className="rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
              <View className="mb-4 flex-row items-center gap-2">
                <Users size={19} color={colors.primary} />
                <Text className="text-lg font-bold" style={{ color: colors.text }}>Company Managers</Text>
              </View>
              {selectedProject.admins?.length ? selectedProject.admins.map((admin) => {
                const expanded = expandedAdminId === admin.id;
                return (
                  <View key={admin.id} className="mb-2 overflow-hidden rounded-xl border" style={{ borderColor: colors.border }}>
                    <Pressable onPress={() => setExpandedAdminId(expanded ? null : admin.id)} className="flex-row items-center justify-between p-4" style={{ backgroundColor: colors.surface }}>
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-bold" style={{ color: colors.text }}>{admin.name}</Text>
                        <Text className="mt-1 text-xs" style={{ color: colors.muted }}>{admin.email}</Text>
                      </View>
                      {expanded ? <ChevronDown size={18} color={colors.muted} /> : <ChevronRight size={18} color={colors.muted} />}
                    </Pressable>
                    {expanded ? (
                      <View className="border-t p-4" style={{ borderColor: colors.border }}>
                        <Text className="text-xs uppercase" style={{ color: colors.muted }}>Assigned permissions ({normalizePermissions(admin.permissions).length})</Text>
                        <Text className="mt-2 text-sm" style={{ color: colors.text }}>{normalizePermissions(admin.permissions).length ? normalizePermissions(admin.permissions).map(permissionName).join(' · ') : 'No permissions assigned'}</Text>
                        <Pressable onPress={() => { setSelectedAdminId(admin.id); setTab('permissions'); }} className="mt-4 self-start rounded-lg px-3 py-2" style={{ backgroundColor: `${colors.primary}18` }}>
                          <Text className="text-xs font-bold" style={{ color: colors.primary }}>Manage permissions</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              }) : <Text style={{ color: colors.muted }}>No managers are assigned to this company.</Text>}
            </View>
          </>
        ) : <>
          <Text className="text-3xl font-bold" style={{ color: colors.text }}>Permissions</Text><Text className="mb-6 mt-1 text-sm" style={{ color: colors.muted }}>Choose what this company can use, then assign only those permissions to each manager.</Text>
          <Text className="mb-3 text-lg font-bold" style={{ color: colors.text }}>Company access</Text><View className="flex-row flex-wrap gap-4">{permissionGroups.map((group) => { const groupSelected = group.items.every(([id]) => companyPermissions.includes(id)); return <View key={group.title} className="min-w-[260px] flex-1 rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border }}><View className="flex-row items-center justify-between gap-2"><Text className="text-base font-bold" style={{ color: colors.text }}>{group.title}</Text><Pressable disabled={saving} onPress={() => toggleCompanyPermissionGroup(group.items)} className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: `${colors.primary}18` }}><Text className="text-[11px] font-bold" style={{ color: colors.primary }}>{groupSelected ? 'Clear all' : 'Select all'}</Text></Pressable></View><Text className="mb-3 mt-1 text-xs" style={{ color: colors.muted }}>Enable the dashboard tabs available to this company.</Text>{group.items.map(([id, label, description]) => { const checked = companyPermissions.includes(id); return <Pressable key={id} disabled={saving} onPress={() => toggleCompanyPermission(id)} className="mb-2 flex-row rounded-xl border p-3" style={{ borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? `${colors.primary}12` : colors.surface }}><View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded border" style={{ borderColor: checked ? colors.primary : colors.muted, backgroundColor: checked ? colors.primary : 'transparent' }}>{checked ? <Check size={14} color="#fff" /> : null}</View><View className="min-w-0 flex-1"><Text className="text-sm font-bold" style={{ color: colors.text }}>{label}</Text><Text className="mt-1 text-xs" style={{ color: colors.muted }}>{description}</Text></View></Pressable>; })}</View>; })}</View>
          <View className="mt-7 rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}><View className="mb-4 flex-row flex-wrap items-center justify-between gap-3"><View><Text className="text-lg font-bold" style={{ color: colors.text }}>Manager access</Text><Text className="mt-1 text-xs" style={{ color: colors.muted }}>A manager can only receive dashboard tabs enabled for this company.</Text></View><View className="flex-row flex-wrap gap-2">{selectedProject.admins?.map((admin) => <Pressable key={admin.id} onPress={() => setSelectedAdminId(admin.id)} className="rounded-lg px-3 py-2" style={{ backgroundColor: admin.id === selectedAdmin?.id ? colors.primary : colors.surface, borderColor: colors.border, borderWidth: 1 }}><Text className="text-xs font-bold" style={{ color: admin.id === selectedAdmin?.id ? '#0B0B0B' : colors.text }}>{admin.name}</Text></Pressable>)}</View></View>{selectedAdmin ? <View className="flex-row flex-wrap gap-2">{visibleCompanyPermissions.length ? visibleCompanyPermissions.map((id) => { const checked = adminPermissions.includes(id); return <Pressable key={id} disabled={saving} onPress={() => toggleAdminPermission(id)} className="flex-row items-center rounded-lg border px-3 py-2" style={{ borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? `${colors.primary}12` : colors.surface }}><View className="mr-2 h-4 w-4 items-center justify-center rounded border" style={{ borderColor: checked ? colors.primary : colors.muted, backgroundColor: checked ? colors.primary : 'transparent' }}>{checked ? <Check size={11} color="#fff" /> : null}</View><Text className="text-xs font-semibold" style={{ color: colors.text }}>{permissionName(id)}</Text></Pressable>; }) : <Text style={{ color: colors.muted }}>Enable company permissions above first.</Text>}</View> : <Text style={{ color: colors.muted }}>No manager selected.</Text>}</View>
        </>}
      </ScrollView>
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}><View className="flex-1 items-center justify-center bg-black/50 p-5"><View className="w-full max-w-[430px] rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}><View className="mb-5 flex-row items-center justify-between"><Text className="text-xl font-bold" style={{ color: colors.text }}>Create New Company</Text><Pressable onPress={() => setModalVisible(false)}><X size={21} color={colors.muted} /></Pressable></View><Text className="mb-2 text-xs font-semibold" style={{ color: colors.muted }}>COMPANY NAME</Text><TextInput value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Enter company name" placeholderTextColor={colors.muted} className="mb-4 rounded-xl border px-3 py-3" style={{ color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }} /><Text className="mb-2 text-xs font-semibold" style={{ color: colors.muted }}>IDENTIFIER / SUBDOMAIN</Text><TextInput value={form.identifier} onChangeText={(identifier) => setForm((current) => ({ ...current, identifier: identifier.toLowerCase().replace(/[^a-z0-9]/g, '') }))} placeholder="companyname" placeholderTextColor={colors.muted} className="mb-5 rounded-xl border px-3 py-3" style={{ color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }} /><Pressable onPress={handleCreate} className="items-center rounded-xl py-3" style={{ backgroundColor: colors.primary }}><Text className="font-bold" style={{ color: '#0B0B0B' }}>Create Company</Text></Pressable></View></View></Modal>
    </View>
  );
}

export default function MasterScreen() {
  return (
    <RequireAuth>
      <MasterDashboard />
    </RequireAuth>
  );
}
