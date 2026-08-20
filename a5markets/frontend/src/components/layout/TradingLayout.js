import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, Briefcase, CandlestickChart, Grid2X2, ListFilter, LogOut, Settings, ShieldCheck, UsersRound, WalletCards } from 'lucide-react-native';
import TopAccountBar from '../header/TopAccountBar';
import TradingChart from '../chart/TradingChart';
import OrderPanel from '../order/OrderPanel';
import InsufficientFundsModal from '../order/InsufficientFundsModal';
import OpenPositions from '../positions/OpenPositions';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import BirthdayModal from '../account/BirthdayModal';
import NovaLogo from '../brand/NovaLogo';

import ChartSymbolPanel from '../chart/ChartSymbolPanel';
import A5MarketOrderModal from '../order/A5MarketOrderModal';

function MobileSymbolWatchlist({ onSelectSymbol }) {
  const { prices, selectedSymbol, setSelectedSymbol } = useDemoTrading();
  const { darkMode, colors } = useAppTheme();
  const [search, setSearch] = useState('');
  const [symbolTab, setSymbolTab] = useState('Popular');
  const [symbolTabMenuOpen, setSymbolTabMenuOpen] = useState(false);
  const [favoriteSymbols, setFavoriteSymbols] = useState([]);

  const symbolTabs = ['Popular', 'Crypto CFD', 'Energies', 'Forex', 'Indices', 'Metals', 'Shares USA CFD'];

  const ui = useMemo(() => ({
    dark: darkMode,
    background: colors.chartBackground || colors.background,
    menu: colors.panel,
    menuBorder: colors.border,
    border: colors.border,
    soft: colors.primarySoft,
    control: colors.panel,
    panel: colors.panel,
    accent: colors.primary,
    activeText: darkMode ? colors.text : '#ffffff',
    text: colors.text,
    muted: colors.muted,
    success: colors.success || '#10B981',
    danger: colors.danger || '#EF4444',
  }), [darkMode, colors]);

  const toggleFavorite = (sym) => {
    setFavoriteSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const POPULAR_ORDER = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/CHF', 'EUR/JPY', 'XAU/USD', 'XAG/USD', 'WTI/USD'];
  const getPopularIndex = (sym) => {
    const s = String(sym || '').toUpperCase().trim();
    const idx = POPULAR_ORDER.findIndex((p) => p.toUpperCase() === s || p.toUpperCase().replace('/', '') === s.replace('/', '') || (s.includes('WTI') && p.includes('WTI')));
    return idx !== -1 ? idx : 999;
  };

  const filteredSymbols = useMemo(() => {
    const query = search.trim().toLowerCase();
    const favSet = new Set(favoriteSymbols);
    const items = prices.filter((item) => {
      const matchesSearch = !query || item.symbol.toLowerCase().includes(query) || item.group?.toLowerCase().includes(query);
      const itemGroup = String(item.group || '').toLowerCase();
      const matchesTab = symbolTab === 'Favorites'
        ? favSet.has(item.symbol)
        : symbolTab === 'Popular'
          ? item.popular
          : symbolTab === 'Crypto CFD'
            ? itemGroup.includes('crypto')
            : itemGroup.includes(symbolTab.toLowerCase());
      return matchesSearch && matchesTab;
    });
    if (symbolTab === 'Popular') {
      return items.sort((a, b) => getPopularIndex(a.symbol) - getPopularIndex(b.symbol));
    }
    return items;
  }, [prices, search, symbolTab, favoriteSymbols]);

  return (
    <ChartSymbolPanel
      isInline={true}
      currentSymbol={selectedSymbol}
      favoriteSymbols={favoriteSymbols}
      filteredSymbols={filteredSymbols}
      onSearchChange={setSearch}
      onSelectSymbol={(sym) => {
        setSelectedSymbol(sym);
        if (onSelectSymbol) onSelectSymbol(sym);
      }}
      onSelectTab={(tab) => {
        setSymbolTab(tab);
        setSymbolTabMenuOpen(false);
      }}
      onToggleFavorite={toggleFavorite}
      search={search}
      symbolTabs={symbolTabs}
      symbolTab={symbolTab}
      symbolTabMenuOpen={symbolTabMenuOpen}
      setSymbolTabMenuOpen={setSymbolTabMenuOpen}
      ui={ui}
    />
  );
}

export default function TradingLayout() {
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const { user, isAdmin, logout } = useAuth();
  const { summary, insufficientFundsVisible, setInsufficientFundsVisible, sidePanel, setSidePanel } = useDemoTrading();
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [mobileTab, setMobileTab] = useState('symbols');
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const newOrderModal = <A5MarketOrderModal visible={newOrderOpen} onClose={() => setNewOrderOpen(false)} />;

  const desktop = width >= 1100;
  const mobile = width < 760;
  const tablet = width >= 760 && width < 1100;
  const chartAreaHeight = desktop
    ? Math.max(560, Math.min(680, height - 150))
    : tablet
      ? Math.max(540, Math.min(640, height - 170))
      : Math.max(430, Math.min(560, height - 210));

  useEffect(() => {
    if (params.panel === 'verification') setSidePanel('verification');
    if (params.panel === 'history') {
      setSidePanel('history');
      if (mobile) setMobileTab('position');
    }
    if (params.panel === 'settings') {
      const section = typeof params.section === 'string' && params.section ? params.section : 'profile';
      setSidePanel(`settings:${section}`);
    }
  }, [mobile, params.panel, params.section, setSidePanel]);

  if (mobile) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        {!chartFullscreen && <TopAccountBar onNewOrder={() => setNewOrderOpen(true)} />}
        <View className="flex-1" style={{ paddingBottom: chartFullscreen ? 0 : 48 }}>
          {mobileTab === 'symbols' ? (
            <View className="flex-1 p-2">
              <MobileSymbolWatchlist onSelectSymbol={() => setMobileTab('trade')} />
            </View>
          ) : mobileTab === 'position' ? (
            <ScrollView className="flex-1 p-2" contentContainerStyle={{ paddingBottom: 16 }}>
              <OpenPositions />
            </ScrollView>
          ) : (
            <View className="flex-1 flex-col min-h-0">
              <View className="flex-1 min-h-[340px] min-w-0">
                <TradingChart isFullscreen={chartFullscreen} onFullscreenChange={setChartFullscreen} isAdmin={isAdmin} />
              </View>
              {!chartFullscreen && !sidePanel ? (
                <View className="w-full shrink-0">
                  <OrderPanel />
                </View>
              ) : null}
            </View>
          )}
        </View>

        {!chartFullscreen ? (
          <View
            className="flex-row items-center justify-around border-t"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: 48,
              zIndex: 4000,
              elevation: 4000,
            }}
          >
            <Pressable
              onPress={() => setMobileTab('symbols')}
              className="items-center justify-center flex-1 py-0.5"
            >
              <View
                className="h-5 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: mobileTab === 'symbols' ? `${colors.primary}25` : 'transparent' }}
              >
                <ListFilter size={16} color={mobileTab === 'symbols' ? colors.primary : colors.muted} />
              </View>
              <Text
                className="text-[9px] mt-0.5 font-medium"
                style={{ color: mobileTab === 'symbols' ? colors.primary : colors.text }}
              >
                Symbols
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMobileTab('trade')}
              className="items-center justify-center flex-1 py-0.5"
            >
              <View
                className="h-5 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: mobileTab === 'trade' ? `${colors.primary}25` : 'transparent' }}
              >
                <CandlestickChart size={16} color={mobileTab === 'trade' ? colors.primary : colors.muted} />
              </View>
              <Text
                className="text-[9px] mt-0.5 font-medium"
                style={{ color: mobileTab === 'trade' ? colors.primary : colors.text }}
              >
                Trade
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMobileTab('position')}
              className="items-center justify-center flex-1 py-0.5"
            >
              <View
                className="h-5 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: mobileTab === 'position' ? `${colors.primary}25` : 'transparent' }}
              >
                <Briefcase size={16} color={mobileTab === 'position' ? colors.primary : colors.muted} />
              </View>
              <Text
                className="text-[9px] mt-0.5 font-medium"
                style={{ color: mobileTab === 'position' ? colors.primary : colors.text }}
              >
                Position
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/dashboard?section=overview')}
              className="items-center justify-center flex-1 py-0.5"
            >
              <View
                className="h-5 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: 'transparent' }}
              >
                <Grid2X2 size={16} color={colors.muted} />
              </View>
              <Text
                className="text-[9px] mt-0.5 font-medium"
                style={{ color: colors.text }}
              >
                Dashboard
              </Text>
            </Pressable>
          </View>
        ) : null}

        <InsufficientFundsModal
          visible={insufficientFundsVisible}
          onClose={() => setInsufficientFundsVisible(false)}
        />
        <BirthdayModal />
        {newOrderModal}
      </View>
    );
  }

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  const railItems = [
    { key: 'overview', label: 'Overview', icon: Grid2X2, onPress: () => router.push('/dashboard?section=overview') },
    { key: 'accounts', label: 'Accounts', icon: Briefcase, onPress: () => router.push('/dashboard?section=accounts') },
    { key: 'verification', label: 'Verification', icon: ShieldCheck, onPress: () => router.push('/verification') },
    { key: 'deposit', label: 'Deposit', icon: ArrowDownRight, onPress: () => router.push('/dashboard?section=deposit') },
    { key: 'withdraw', label: 'Withdraw', icon: ArrowUpRight, onPress: () => router.push('/dashboard?section=withdraw') },
    { key: 'referral', label: 'Referral Programme', icon: UsersRound, onPress: () => router.push('/broker-rewards') },
    { key: 'settings', label: 'Settings', icon: Settings, onPress: () => router.push('/settings?section=profile') },
  ];

  return (
    <View className="flex-1 flex-row" style={{ backgroundColor: colors.background }}>
      {!isAdmin && !chartFullscreen ? (
        <View className="w-[168px] items-center border-r px-2.5 py-3" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
          <View
            className="h-[66px] w-full items-center justify-center rounded-xl border"
            style={{
              backgroundColor: colors.panel,
              borderColor: colors.primary + '55',
              shadowColor: colors.primary,
              shadowOpacity: 0.08,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <NovaLogo dark={darkMode} width={146} height={42} />
          </View>
          <View className="mt-4 flex-1 w-full items-stretch justify-between rounded-xl border p-1.5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
            {railItems.map((item) => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.key}
                  onPress={item.onPress}
                  className="h-[52px] w-full flex-row items-center rounded-lg px-3"
                  style={{
                    backgroundColor: item.active ? colors.primary : colors.surface,
                    borderWidth: item.active ? 0 : 1,
                    borderColor: colors.border,
                    shadowColor: item.active ? colors.primary : '#000',
                    shadowOpacity: item.active ? 0.18 : 0,
                    shadowRadius: item.active ? 14 : 0,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: item.active ? 4 : 0,
                  }}
                >
                  <Icon size={18} color={item.active ? '#ffffff' : colors.text} />
                  <Text className="ml-2 flex-1 text-[11px] font-semibold" numberOfLines={2} adjustsFontSizeToFit style={{ color: item.active ? '#ffffff' : colors.muted }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={signOut} className="mt-4 h-[52px] w-full flex-row items-center rounded-lg border px-3" style={{ backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}45` }}>
            <LogOut size={18} color={colors.danger} />
            <Text className="ml-2 text-[11px] font-semibold" style={{ color: colors.danger }}>Sign Out</Text>
          </Pressable>
        </View>
      ) : null}
      <View className="min-w-0 flex-1">
      {!chartFullscreen && <TopAccountBar onNewOrder={() => setNewOrderOpen(true)} />}
      <ScrollView
        scrollEnabled={!chartFullscreen}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: chartFullscreen ? 0 : (mobile ? 6 : 10), paddingBottom: chartFullscreen ? 0 : (mobile ? 16 : 14) }}
      >
        <View
          className={chartFullscreen ? 'flex-1' : (desktop ? 'flex-row gap-3 overflow-hidden' : mobile ? 'gap-1.5 overflow-hidden' : 'gap-3 overflow-hidden')}
          style={{ height: chartFullscreen ? undefined : chartAreaHeight, overflow: chartFullscreen ? 'visible' : 'hidden' }}
        >
          {desktop && !chartFullscreen ? (
            <>
              <View className="min-w-0 flex-1">
                <TradingChart isFullscreen={chartFullscreen} onFullscreenChange={setChartFullscreen} isAdmin={isAdmin} />
              </View>
              {!isAdmin ? <OrderPanel /> : null}
            </>
          ) : (
            <>
              <TradingChart isFullscreen={chartFullscreen} onFullscreenChange={setChartFullscreen} isAdmin={isAdmin} />
            </>
          )}
        </View>
        {!chartFullscreen ? <OpenPositions /> : null}
      </ScrollView>
      {mobile && !chartFullscreen && !sidePanel ? <OrderPanel /> : null}
      <InsufficientFundsModal
        visible={insufficientFundsVisible}
        onClose={() => setInsufficientFundsVisible(false)}
      />
      <BirthdayModal />
      {newOrderModal}
      </View>
    </View>
  );
}
