import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import {
  Award, BadgeCheck, CandlestickChart, ChevronRight, CircleDollarSign, History, Home, LogOut,
  LockKeyhole, Menu, Moon, PanelLeftClose, Sun, UserRound, WalletCards, X,
} from 'lucide-react-native';
import NovaLogo from '../brand/NovaLogo';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { navigateToA5App } from '../../utils/appHost';

const nav = [
  ['Home', '/dashboard', Home],
  ['Wallets', '/wallet', WalletCards],
  ['Deposit', '/deposit', CircleDollarSign],
  ['Withdraw', '/withdraw', PanelLeftClose],
  ['Accounts', '/dashboard?section=accounts', BadgeCheck],
  ['Transactions', '/transactions', History],
  ['Verification', '/verification', BadgeCheck],
  ['Broker Rewards', '/broker-rewards', Award],
];

export default function PortalLayout({ children }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const { user, logout } = useAuth();
  const { colors, darkMode, toggleTheme } = useAppTheme();
  const [open, setOpen] = useState(width >= 900);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const desktop = width >= 900;
  const go = (href) => { router.push(href); if (!desktop) setOpen(false); };
  const openSettings = (section) => {
    setProfileMenuOpen(false);
    router.push(`/settings?section=${section}`);
  };
  const signOut = async () => {
    setProfileMenuOpen(false);
    await logout();
    router.replace('/login');
  };
  const initials = String(user?.name || user?.email || 'A5')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <View style={{ flex: 1, flexDirection: 'row', position: 'relative', backgroundColor: colors.background }}>
      {open && !desktop ? (
        <Pressable
          onPress={() => setOpen(false)}
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(9, 27, 46, 0.28)', zIndex: 250 }}
        />
      ) : null}
      {open ? (
        <View style={{ width: desktop ? 270 : Math.min(width * 0.86, 310), position: desktop ? 'relative' : 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: darkMode ? '#091b2e' : '#eef7fc', borderRightWidth: 1, borderRightColor: colors.border, padding: 20, zIndex: 300, elevation: 30 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
            <View style={{ flex: 1, minWidth: 0, height: desktop ? 102 : 72, alignItems: 'center', justifyContent: 'center' }}>
              <NovaLogo dark={darkMode} width={desktop ? 250 : 185} height={desktop ? 100 : 70} />
            </View>
            {!desktop ? <Pressable onPress={() => setOpen(false)}><X color={colors.text} size={23} /></Pressable> : null}
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {nav.map(([label, href, Icon]) => {
              const routePath = href.split('?')[0];
              const routeSection = href.includes('section=') ? href.split('section=')[1] : null;
              const active = pathname === routePath && (
                routeSection ? String(params.section || '') === routeSection : !(routePath === '/dashboard' && params.section)
              );
              return (
                <Pressable key={label} onPress={() => go(href)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 13, marginBottom: 7, backgroundColor: active ? colors.primary : 'transparent' }}>
                  <Icon size={19} color={active ? '#fff' : colors.muted} />
                  <Text numberOfLines={1} style={{ color: active ? '#fff' : colors.text, fontWeight: active ? '700' : '500', fontSize: 15, marginLeft: 12, flex: 1, flexShrink: 1 }}>{label}</Text>
                  {active ? <ChevronRight size={16} color="#fff" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={async () => { await logout(); router.replace('/login'); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginTop: 12 }}>
            <LogOut size={19} color="#ff8791" /><Text style={{ color: '#ff8791', marginLeft: 12, fontWeight: '700' }}>Sign out</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ minHeight: 68, paddingVertical: 8, paddingHorizontal: desktop ? 28 : 14, backgroundColor: colors.panel, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => setOpen((value) => !value)} style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
              <Menu size={21} color={colors.text} />
            </Pressable>
            <View style={{ marginLeft: 13 }}>
              <Text style={{ fontSize: desktop ? 18 : 15, fontWeight: '800', color: colors.text }}>A5 Client Portal</Text>
              {desktop ? <Text style={{ fontSize: 12, color: colors.muted }}>Manage funds, accounts and your profile</Text> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Pressable onPress={() => navigateToA5App('platform', '/trading', router)} style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 17, height: 44, borderRadius: 13, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>Platform</Text>
              <CandlestickChart size={18} color="#ffffff" strokeWidth={2.4} />
            </Pressable>
            <Pressable onPress={toggleTheme} style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              {darkMode ? <Sun size={19} color={colors.text} /> : <Moon size={19} color={colors.text} />}
            </Pressable>
            <View style={{ position: 'relative' }}>
              <Pressable
                onPress={() => setProfileMenuOpen((value) => !value)}
                style={{ minHeight: 50, paddingLeft: desktop ? 14 : 5, paddingRight: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: profileMenuOpen ? colors.surface : colors.panel }}
              >
                {desktop ? (
                  <View style={{ marginRight: 11, maxWidth: 190 }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', textAlign: 'right' }}>{user?.name || 'A5 Trader'}</Text>
                    <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, textAlign: 'right' }}>{user?.email || ''}</Text>
                  </View>
                ) : null}
                <View style={{ width: 43, height: 43, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  {user?.profileImage ? <Image source={{ uri: user.profileImage }} style={{ width: 43, height: 43 }} /> : <Text style={{ color: colors.text, fontWeight: '800' }}>{initials}</Text>}
                </View>
              </Pressable>

              {profileMenuOpen ? (
                <View style={{ position: 'absolute', right: 0, top: 57, width: 250, borderRadius: 15, padding: 8, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, shadowColor: '#102a46', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12, zIndex: 200 }}>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700' }}>{user?.name || 'A5 Trader'}</Text>
                    <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{user?.email || ''}</Text>
                  </View>
                  <Pressable onPress={() => openSettings('profile')} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 }}>
                    <UserRound size={18} color={colors.muted} /><Text style={{ marginLeft: 11, color: colors.text, fontSize: 15 }}>Profile</Text>
                  </Pressable>
                  <Pressable onPress={() => openSettings('security')} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 }}>
                    <LockKeyhole size={18} color={colors.muted} /><Text style={{ marginLeft: 11, color: colors.text, fontSize: 15 }}>Security</Text>
                  </Pressable>
                  <Pressable onPress={signOut} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <LogOut size={18} color="#ef5261" /><Text style={{ marginLeft: 11, color: '#ef5261', fontSize: 15 }}>Sign out</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}
