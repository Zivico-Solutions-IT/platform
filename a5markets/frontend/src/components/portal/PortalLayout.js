import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import {
  BadgeCheck, ChevronRight, CircleDollarSign, History, Home, LogOut,
  LockKeyhole, Menu, Moon, PanelLeftClose, UserRound, WalletCards, X,
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
];

export default function PortalLayout({ children }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const { user, logout } = useAuth();
  const { colors, toggleTheme } = useAppTheme();
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
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#f4f8fc' }}>
      {open ? (
        <View style={{ width: desktop ? 270 : Math.min(width * 0.86, 310), backgroundColor: '#102a46', padding: 20, zIndex: 50 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
            <View style={{ width: 172, height: 56, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <NovaLogo width={148} height={46} />
            </View>
            {!desktop ? <Pressable onPress={() => setOpen(false)}><X color="#fff" size={23} /></Pressable> : null}
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {nav.map(([label, href, Icon]) => {
              const routePath = href.split('?')[0];
              const routeSection = href.includes('section=') ? href.split('section=')[1] : null;
              const active = pathname === routePath && (
                routeSection ? String(params.section || '') === routeSection : !(routePath === '/dashboard' && params.section)
              );
              return (
                <Pressable key={label} onPress={() => go(href)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 13, marginBottom: 7, backgroundColor: active ? '#2c79bb' : 'transparent' }}>
                  <Icon size={19} color={active ? '#fff' : '#b9d5e8'} />
                  <Text style={{ color: '#fff', fontWeight: active ? '700' : '500', fontSize: 15, marginLeft: 12, flex: 1 }}>{label}</Text>
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
        <View style={{ height: 78, paddingHorizontal: desktop ? 28 : 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dbe8f2', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => setOpen((value) => !value)} style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf4fb' }}>
              <Menu size={21} color="#163b60" />
            </Pressable>
            <View style={{ marginLeft: 13 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#102a46' }}>A5 Client Portal</Text>
              {desktop ? <Text style={{ fontSize: 12, color: '#6d8194' }}>Manage funds, accounts and your profile</Text> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Pressable onPress={() => navigateToA5App('platform', '/trading', router)} style={{ paddingHorizontal: 17, height: 44, borderRadius: 13, backgroundColor: '#2c79bb', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Platform</Text>
            </Pressable>
            {desktop ? <Pressable onPress={toggleTheme} style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: '#eaf4fb', alignItems: 'center', justifyContent: 'center' }}><Moon size={19} color="#163b60" /></Pressable> : null}
            <View style={{ position: 'relative' }}>
              <Pressable
                onPress={() => setProfileMenuOpen((value) => !value)}
                style={{ minHeight: 50, paddingLeft: desktop ? 14 : 5, paddingRight: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: profileMenuOpen ? '#f1f7fb' : '#fff' }}
              >
                {desktop ? (
                  <View style={{ marginRight: 11, maxWidth: 190 }}>
                    <Text numberOfLines={1} style={{ color: '#102a46', fontWeight: '700', textAlign: 'right' }}>{user?.name || 'A5 Trader'}</Text>
                    <Text numberOfLines={1} style={{ color: '#6d8194', fontSize: 11, textAlign: 'right' }}>{user?.email || ''}</Text>
                  </View>
                ) : null}
                <View style={{ width: 43, height: 43, borderRadius: 22, overflow: 'hidden', backgroundColor: '#dcecf7', alignItems: 'center', justifyContent: 'center' }}>
                  {user?.profileImage ? <Image source={{ uri: user.profileImage }} style={{ width: 43, height: 43 }} /> : <Text style={{ color: '#163b60', fontWeight: '800' }}>{initials}</Text>}
                </View>
              </Pressable>

              {profileMenuOpen ? (
                <View style={{ position: 'absolute', right: 0, top: 57, width: 250, borderRadius: 15, padding: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe8f2', shadowColor: '#102a46', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12, zIndex: 200 }}>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e7eff5' }}>
                    <Text numberOfLines={1} style={{ color: '#102a46', fontWeight: '700' }}>{user?.name || 'A5 Trader'}</Text>
                    <Text numberOfLines={1} style={{ color: '#6d8194', fontSize: 12, marginTop: 2 }}>{user?.email || ''}</Text>
                  </View>
                  <Pressable onPress={() => openSettings('profile')} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 }}>
                    <UserRound size={18} color="#315b7d" /><Text style={{ marginLeft: 11, color: '#102a46', fontSize: 15 }}>Profile</Text>
                  </Pressable>
                  <Pressable onPress={() => openSettings('security')} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 }}>
                    <LockKeyhole size={18} color="#315b7d" /><Text style={{ marginLeft: 11, color: '#102a46', fontSize: 15 }}>Security</Text>
                  </Pressable>
                  <Pressable onPress={signOut} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderTopWidth: 1, borderTopColor: '#e7eff5' }}>
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
