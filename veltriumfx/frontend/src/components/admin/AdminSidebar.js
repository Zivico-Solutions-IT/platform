import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Award, BanknoteArrowDown, BanknoteArrowUp, BarChart3, Bell, LayoutDashboard, LogOut, Menu, Moon, RefreshCw, Settings, ShieldCheck, Sun, TrendingUp, UserRound, UsersRound, X, Coins, Activity } from 'lucide-react-native';
import { Animated, Image, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppTheme } from '../../context/ThemeContext';
import NovaLogo from '../brand/NovaLogo';

const navigation = [
  { id: 'overview', label: 'Overview', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'userManagement', label: 'User Management', shortLabel: 'Users', icon: UsersRound },
  { id: 'users', label: 'User Wallets', shortLabel: 'Wallets', icon: UsersRound },
  { id: 'verifications', label: 'Verifications', shortLabel: 'KYC', icon: ShieldCheck },
  { id: 'userLevels', label: 'User Levels', shortLabel: 'Levels', icon: Award },
  { id: 'deposits', label: 'Deposits', shortLabel: 'Deposits', icon: BanknoteArrowDown },
  { id: 'withdrawals', label: 'Withdrawals', shortLabel: 'Withdraw', icon: BanknoteArrowUp },
  { id: 'referrals', label: 'Referral Rewards', shortLabel: 'Referral', icon: UsersRound },
  { id: 'trades', label: 'All Trades', shortLabel: 'Trades', icon: BarChart3 },
  { id: 'addTrading', label: 'Add Trading', shortLabel: 'Add', icon: TrendingUp },
  { id: 'marginAlerts', label: 'Margin Alerts', shortLabel: 'Margin', icon: AlertTriangle },
  { id: 'agents', label: 'Staff & Permissions', shortLabel: 'Staff', icon: ShieldCheck, masterOnly: true },
  { id: 'symbols', label: 'Symbol Settings', shortLabel: 'Symbols', icon: Coins, masterOnly: true },
];

const subNavigation = {
  userManagement: [
    { id: 'assignUsers', label: 'Assign Users', permission: 'assignUsers' },
    { id: 'users', label: 'Users', permission: 'userManagementUsers' },
  ],
  deposits: [
    { id: 'addresses', label: 'Deposit Method Address', permission: 'depositAddresses' },
    { id: 'deposits', label: 'Deposits', permission: 'depositsList' },
  ],
  withdrawals: [
    { id: 'withdrawals', label: 'Withdrawals', permission: 'withdrawalsList' },
    { id: 'details', label: 'Withdrawal Details', permission: 'withdrawalDetails' },
  ],
};

export default function AdminSidebar({
  section,
  onChange,
  userManagementSubpage,
  onUserManagementSubpageChange,
  depositSubpage,
  onDepositSubpageChange,
  withdrawalSubpage,
  onWithdrawalSubpageChange,
  pendingCount,
  bankPendingCount,
  newUserCount,
  verificationPendingCount,
  lowMarginCount,
  adminUser,
  onSignOut,
  onRefresh,
  refreshing,
  onOpenSettings,
  onToggleTheme,
  adminNotificationCount,
  onToggleNotifications,
  onReturnToMaster,
}) {
  const { width } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const mobile = width < 768;
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);
  const [mobileDrawerMounted, setMobileDrawerMounted] = useState(false);
  const drawerWidth = Math.min(width * 0.86, 340);
  const drawerAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const drawerPanelRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !mobileTabsOpen) return;
    const handleOutsideClick = (e) => {
      if (drawerPanelRef.current && !drawerPanelRef.current.contains(e.target)) {
        closeMobileDrawer();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [mobileTabsOpen]);

  const visibleNavigation = navigation.filter((tab) => {
    if (tab.masterOnly) return adminUser?.role === 'master';
    if (adminUser?.role === 'master') return true;
    if (tab.adminOnly) return false;
    return Array.isArray(adminUser?.permissions) && adminUser.permissions.includes(tab.id);
  });

  useEffect(() => {
    if (!mobile) {
      setMobileTabsOpen(false);
      setMobileDrawerMounted(false);
      return;
    }
    if (!mobileDrawerMounted) return;

    drawerAnim.setValue(-drawerWidth);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropAnim, drawerAnim, drawerWidth, mobile, mobileDrawerMounted]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (mobileDrawerMounted) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [mobileDrawerMounted]);

  const openMobileDrawer = () => {
    setMobileDrawerMounted(true);
    setMobileTabsOpen(true);
  };

  const closeMobileDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: -drawerWidth,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMobileTabsOpen(false);
      setMobileDrawerMounted(false);
    });
  };

  const badgeFor = (id) => {
    if (id === 'userManagement') return newUserCount;
    if (id === 'marginAlerts') return lowMarginCount;
    if (id === 'verifications') return verificationPendingCount;
    if (id === 'deposits') return pendingCount?.deposits ?? pendingCount;
    if (id === 'referrals') return pendingCount?.referrals ?? 0;
    if (id === 'withdrawals') return (pendingCount?.withdrawals ?? 0) + bankPendingCount;
    return 0;
  };
  const activeSubpageFor = (id) => {
    if (id === 'userManagement') return userManagementSubpage;
    if (id === 'deposits') return depositSubpage;
    if (id === 'withdrawals') return withdrawalSubpage;
    return null;
  };
  const changeSubpageFor = (id) => {
    if (id === 'userManagement') return onUserManagementSubpageChange;
    if (id === 'deposits') return onDepositSubpageChange;
    if (id === 'withdrawals') return onWithdrawalSubpageChange;
    return null;
  };
  const renderAdminAvatar = (size = 80, iconSize = 34) => (
    <View
      className="overflow-hidden rounded-full border"
      style={{ width: size, height: size, backgroundColor: colors.surface, borderColor: colors.border }}
    >
      {adminUser?.profileImage ? (
        <Image source={{ uri: adminUser.profileImage }} className="h-full w-full" resizeMode="cover" />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <UserRound size={iconSize} color={colors.muted} />
        </View>
      )}
    </View>
  );
  const renderConsoleHeader = (compact = false, showClose = false) => (
    <View className={`${compact ? 'px-5 pb-5 pt-5' : 'px-6 py-5'} border-b`} style={{ borderColor: colors.border }}>
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1 pr-3">
          <NovaLogo dark={darkMode} width={compact ? 132 : 136} height={34} />
          <Text className="mt-2 text-lg font-medium" style={{ color: colors.text }}>
            {isVeltrium ? 'VeltriumFX Console' : (adminUser?.role === 'master' ? 'Master Console' : adminUser?.role === 'agent' ? 'Agent Console' : adminUser?.role === 'manager' ? 'Manager Console' : 'Manager Console')}
          </Text>
          <Text className="mt-0.5 text-xs" style={{ color: colors.muted }}>
            {isVeltrium ? 'Operations control center' : (adminUser?.role === 'master' ? 'Master control center' : adminUser?.role === 'agent' ? 'Agent operations panel' : 'Manager control center')}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          {renderAdminAvatar(compact ? 72 : 80, compact ? 30 : 34)}
          {showClose && (
            <Pressable
              onPress={closeMobileDrawer}
              className="h-10 w-10 items-center justify-center rounded-xl border"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              accessibilityLabel="Close navigation"
            >
              <X size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
      {adminUser?.role === 'master' && (
        <Pressable
          onPress={onReturnToMaster}
          style={{
            flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15,
            backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: 10,
            marginTop: 20
          }}
        >
          <View style={{ width: 36, height: 36, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Activity color="#3b82f6" size={20} />
          </View>
          <Text style={{ color: '#3b82f6', fontSize: 15, fontWeight: '600' }}>Master Panel</Text>
        </Pressable>
      )}
    </View>
  );
  const renderDrawerContent = () => (
    <View style={{ flex: 1, height: '100%' }}>
      {Platform.OS === 'web' && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)', pointerEvents: 'none' }} />
      )}
      <Animated.View
        className="absolute bottom-0 left-0 right-0"
        style={{
          top: 0,
          backgroundColor: 'rgba(11, 11, 11, 0.4)',
          opacity: backdropAnim,
        }}
      >
        <Pressable className="h-full w-full" onPress={closeMobileDrawer} />
      </Animated.View>
      <Animated.View
        ref={drawerPanelRef}
        className="absolute bottom-0 left-0 overflow-hidden rounded-tr-3xl border-r shadow-2xl"
        style={{
          top: 0,
          height: '100%',
          width: drawerWidth,
          backgroundColor: colors.panel,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 24,
          shadowOffset: { width: 8, height: 0 },
          elevation: 12,
          transform: [{ translateX: drawerAnim }],
        }}
      >
        <SafeAreaView edges={['top']} style={{ flex: 1, height: '100%' }}>
          {renderConsoleHeader(true, true)}
          <ScrollView className="flex-1 deep-green-scrollbar" contentContainerStyle={{ padding: 14, paddingTop: 18, paddingBottom: 130 }} showsVerticalScrollIndicator={true}>
            {visibleNavigation.map(({ id, label, icon: Icon }) => {
              const badge = badgeFor(id);
              const active = section === id;
              return (
                <View key={id}>
                  <Pressable
                    onPress={() => {
                      onChange(id);
                      if (!subNavigation[id]) closeMobileDrawer();
                    }}
                    accessibilityLabel={label}
                    className="relative mb-1.5 min-h-[44px] flex-row items-center rounded-2xl px-4 py-3"
                    style={{
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderWidth: active ? 0 : 1,
                      borderColor: active ? colors.primary : 'transparent',
                    }}
                  >
                    <Icon size={18} color={active ? '#0B0B0B' : colors.muted} />
                    <Text className="ml-3 min-w-0 flex-1 text-sm font-medium" numberOfLines={1} style={{ color: active ? '#0B0B0B' : colors.muted }}>{label}</Text>
                    {badge ? <Text className="ml-2 min-w-[20px] rounded-full bg-danger px-1.5 py-0.5 text-center text-[10px] font-medium text-white">{badge > 9 ? '9+' : badge}</Text> : null}
                  </Pressable>
                  {renderSubItems(id, true)}
                </View>
              );
            })}
            
            {/* Utilities inside the ScrollView */}
            <View className="border-t mt-4 pt-4 gap-2" style={{ borderColor: colors.border }}>
              
              <Pressable
                onPress={() => {
                  handleLogout?.();
                  closeMobileDrawer();
                }}
                accessibilityLabel="Sign Out"
                className="min-h-[44px] flex-row items-center rounded-2xl px-4 py-3"
                style={{ backgroundColor: colors.surface }}
              >
                <LogOut size={18} color={colors.danger} />
                <Text className="ml-3 min-w-0 flex-1 text-sm font-medium" numberOfLines={1} style={{ color: colors.danger }}>Sign Out</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
  const renderSubItems = (id, closeAfterSelect = false) => {
    const rawItems = subNavigation[id] || [];
    const items = rawItems.filter(item => {
      if (adminUser?.role === 'master') return true;
      return Array.isArray(adminUser?.permissions) && adminUser.permissions.includes(item.permission);
    });
    
    if (section !== id || !items.length) return null;
    const activeSubpage = activeSubpageFor(id);
    const changeSubpage = changeSubpageFor(id);
    return (
      <View
        className={closeAfterSelect ? 'mb-2 ml-11 gap-1 rounded-xl px-1 py-1' : 'mb-3 ml-8 gap-1 rounded-xl border-l px-1 py-1 pl-3'}
        style={{
          backgroundColor: `${colors.primary}08`,
          ...(!closeAfterSelect ? { borderColor: `${colors.primary}55` } : {}),
        }}
      >
        {items.map((item) => {
          const active = activeSubpage === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                onChange(id);
                changeSubpage?.(item.id);
                if (closeAfterSelect) closeMobileDrawer();
              }}
              className="min-h-[38px] flex-row items-center rounded-2xl px-3"
              style={{ backgroundColor: active ? `${colors.primary}20` : 'transparent' }}
            >
              <View
                className="mr-2 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: active ? colors.primary : colors.border }}
              />
              <Text className="min-w-0 flex-1 text-xs font-medium" numberOfLines={1} style={{ color: active ? colors.primary : colors.muted }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  if (mobile) {
    return (
      <View style={Platform.OS === 'web' ? { position: 'sticky', top: 0, zIndex: 100, backgroundColor: colors.background } : { backgroundColor: colors.background }}>
        <View className="px-2 pb-2.5 pt-3.5">
          <View className="flex-row items-center justify-between gap-1">
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={mobileTabsOpen ? closeMobileDrawer : openMobileDrawer}
                accessibilityLabel={mobileTabsOpen ? 'Close admin navigation' : 'Open admin navigation'}
                className="h-8 w-7 items-center justify-center"
              >
                {mobileTabsOpen ? <X size={18} color={colors.primary} /> : <Menu size={20} color={colors.text} />}
              </Pressable>
              <NovaLogo dark={darkMode} width={82} height={20} />
            </View>

            <View className="flex-row items-center gap-1">
              {/* Dashboard Icon */}
              <Pressable
                onPress={() => router.push('/trading')}
                className="h-8 w-8 items-center justify-center rounded-2xl border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                accessibilityLabel="Go to platform"
              >
                <LayoutDashboard size={14} color={colors.primary} />
              </Pressable>

              {/* Refresh Icon */}
              <Pressable
                onPress={onRefresh}
                className="h-8 w-8 items-center justify-center rounded-2xl border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                accessibilityLabel="Refresh dashboard"
              >
                <RefreshCw size={14} color={refreshing ? '#27a8e9' : colors.text} />
              </Pressable>

              {/* Notification Icon */}
              <View className="relative h-8 w-8">
                <Pressable
                  onPress={onToggleNotifications}
                  className="h-8 w-8 items-center justify-center rounded-2xl border"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  accessibilityLabel="Toggle notifications"
                >
                  <Bell size={14} color={colors.text} />
                </Pressable>
                {adminNotificationCount ? (
                  <View
                    pointerEvents="none"
                    className="absolute items-center justify-center"
                    style={{
                      top: -3,
                      right: -3,
                      minWidth: 12,
                      height: 12,
                      backgroundColor: colors.danger,
                      borderRadius: 6,
                      paddingHorizontal: 1.5,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 7, fontWeight: '700', textAlign: 'center', lineHeight: 12 }}>
                      {adminNotificationCount > 9 ? '9+' : adminNotificationCount}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Theme Toggle Icon */}
              <Pressable
                onPress={onToggleTheme}
                className="h-8 w-8 items-center justify-center rounded-2xl border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                accessibilityLabel="Toggle theme"
              >
                {darkMode ? <Sun size={14} color={colors.text} /> : <Moon size={14} color={colors.text} />}
              </Pressable>

              {/* Admin Avatar (Clickable to open profile settings) */}
              <Pressable
                onPress={onOpenSettings}
                accessibilityLabel="Admin profile settings"
              >
                {renderAdminAvatar(30, 15)}
              </Pressable>
            </View>
          </View>
        </View>
        {Platform.OS === 'web' ? (
          mobileDrawerMounted ? (
            <View style={{ position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, height: '100vh', overflow: 'hidden', zIndex: 9999 }}>
              {renderDrawerContent()}
            </View>
          ) : null
        ) : (
          <Modal visible={mobileDrawerMounted} transparent animationType="none" onRequestClose={closeMobileDrawer}>
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'hidden' }}>
              {renderDrawerContent()}
            </View>
          </Modal>
        )}
      </View>
    );
  }

  return (
    <View
      className="w-full border-b md:h-screen md:max-h-screen md:w-[292px] md:border-b-0 md:border-r md:flex md:flex-col"
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
      }}
    >
      <View className="md:flex-1 md:flex md:flex-col md:overflow-hidden">
        {renderConsoleHeader()}
        {!mobile ? (
          <ScrollView className="flex-1 deep-green-scrollbar" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={true}>
            {visibleNavigation.map(({ id, label, icon: Icon }) => (
              <View key={id}>
                <Pressable
                  onPress={() => onChange(id)}
                  className="mb-1.5 flex-row items-center rounded-2xl px-4 py-3"
                  style={{ backgroundColor: section === id ? colors.primary : 'transparent', borderWidth: section === id ? 0 : 1, borderColor: section === id ? colors.primary : 'transparent' }}
                >
                  <Icon size={18} color={section === id ? '#0B0B0B' : colors.muted} />
                  <Text className="ml-3 text-sm font-medium" style={{ color: section === id ? '#0B0B0B' : colors.muted }}>{label}</Text>
                  {badgeFor(id) ? (
                    <Text className="ml-auto rounded-full bg-danger px-2 py-1 text-xs font-medium text-white">{badgeFor(id)}</Text>
                  ) : null}
                </Pressable>
                {renderSubItems(id)}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}
