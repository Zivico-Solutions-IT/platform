import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, Briefcase, CandlestickChart, FileText, Grid2X2, ListFilter, LogOut, Moon, Settings, ShieldCheck, Sun, UsersRound, WalletCards } from 'lucide-react-native';
import TopAccountBar from '../header/TopAccountBar';
import TradingChart from '../chart/TradingChart';
import OrderPanel from '../order/OrderPanel';
import SymbolPanel from '../market/SymbolPanel';
import InsufficientFundsModal from '../order/InsufficientFundsModal';
import OpenPositions from '../positions/OpenPositions';
import AccountSummary from '../account/AccountSummary';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import BirthdayWidget from '../account/BirthdayWidget';
import BirthdayModal from '../account/BirthdayModal';
import NovaLogo from '../brand/NovaLogo';

import ChartSymbolPanel from '../chart/ChartSymbolPanel';

function OrderRail({ summary, user, showSummary = true, showAvailableMargin = true }) {
  return (
    <View className="h-full overflow-hidden" style={{ width: 300, maxWidth: '100%', overflow: 'hidden', height: '100%' }}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
        style={{ flex: 1 }}
      >
        <BirthdayWidget />
        <OrderPanel showAvailableMargin={showAvailableMargin} />
        {showSummary ? <AccountSummary summary={summary} user={user} /> : null}
      </ScrollView>
    </View>
  );
}

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
  const { darkMode, colors, toggleDarkMode } = useAppTheme();
  const { user, isAdmin, logout } = useAuth();
  const { summary, insufficientFundsVisible, setInsufficientFundsVisible, sidePanel, setSidePanel, orderPanelVisible } = useDemoTrading();
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [mobileTab, setMobileTab] = useState('symbols');
  const [marketDrawerOpen, setMarketDrawerOpen] = useState(true);

  const desktop = width >= 1100;
  const tablet = width >= 760;
  const mobile = width < 760;
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
        {!chartFullscreen && <TopAccountBar />}
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
                <TradingChart
                  isFullscreen={chartFullscreen}
                  onFullscreenChange={setChartFullscreen}
                  isAdmin={isAdmin}
                  symbolMenuOpen={marketDrawerOpen}
                  onToggleSymbolMenu={setMarketDrawerOpen}
                />
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
      </View>
    );
  }

  const signOut = async () => {
    if (logout) await logout();
    router.replace('/login');
  };

  const railNavItems = [
    { key: 'dashboard', label: 'Dashboard', icon: Grid2X2, onPress: () => router.push('/dashboard?section=overview') },
    { key: 'markets', label: 'Markets', icon: CandlestickChart, active: marketDrawerOpen, onPress: () => setMarketDrawerOpen((prev) => !prev) },
    { key: 'orders', label: 'Orders', icon: ListFilter, onPress: () => router.push('/dashboard?section=accounts') },
    { key: 'portfolio', label: 'Portfolio', icon: Briefcase, onPress: () => router.push('/dashboard?section=accounts') },
    { key: 'wallet', label: 'Wallet', icon: WalletCards, onPress: () => router.push('/dashboard?section=deposit') },
    { key: 'reports', label: 'Reports', icon: ShieldCheck, onPress: () => router.push('/verification') },
    { key: 'settings', label: 'Settings', icon: Settings, onPress: () => router.push('/settings?section=profile') },
  ];

  return (
    <View className="flex-1 flex-row" style={{ backgroundColor: colors.background }}>
      {!isAdmin && !chartFullscreen ? (
        <View
          className="w-[72px] items-center border-r py-3 px-1 justify-between select-none"
          style={{ backgroundColor: colors.background, borderColor: colors.border, zIndex: 3300, elevation: 3300 }}
        >
          {/* Top Logo */}
          <View className="items-center justify-center mb-2">
            <NovaLogo dark={darkMode} width={38} height={38} />
          </View>

          {/* Vertical Rail Navigation Items */}
          <View className="flex-1 w-full items-center justify-start gap-3 mt-2">
            {railNavItems.map((item) => {
              const Icon = item.icon;
              const isMarkets = item.key === 'markets';
              const active = isMarkets ? marketDrawerOpen : false;

              return (
                <Pressable
                  key={item.key}
                  onPress={item.onPress}
                  className="w-full items-center justify-center py-1.5 px-0.5 rounded-xl relative"
                  style={{ cursor: 'pointer' }}
                >
                  <View
                    className="w-10 h-8 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: active
                        ? (darkMode ? 'rgba(16, 185, 129, 0.2)' : '#E6F4EA')
                        : 'transparent',
                      borderWidth: active ? 2 : 0,
                      borderColor: active ? '#10B981' : 'transparent',
                    }}
                  >
                    <Icon size={18} color={active ? '#10B981' : colors.muted} />
                  </View>

                  {active ? (
                    <View
                      className="absolute left-[64px] px-2 py-1 rounded shadow-md border"
                      style={{
                        backgroundColor: darkMode ? '#0F172A' : '#1E293B',
                        borderColor: colors.border,
                        zIndex: 9999,
                        elevation: 9999,
                      }}
                    >
                      <Text className="text-white text-[10px] font-bold">Markets</Text>
                    </View>
                  ) : null}

                  <Text
                    className="mt-0.5 text-[9.5px] font-semibold text-center"
                    style={{ color: active ? '#10B981' : colors.muted }}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Bottom Dark Mode / Sign Out toggle */}
          <View className="w-full items-center gap-2 mt-2">
            {toggleDarkMode ? (
              <Pressable
                onPress={toggleDarkMode}
                className="items-center justify-center py-1 w-full"
                style={{ cursor: 'pointer' }}
              >
                {darkMode ? <Sun size={17} color={colors.muted} /> : <Moon size={17} color={colors.muted} />}
                <Text className="mt-0.5 text-[9px] font-semibold text-center" style={{ color: colors.muted }}>
                  {darkMode ? 'Light' : 'Dark'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={signOut}
              className="items-center justify-center py-1 w-full"
              style={{ cursor: 'pointer' }}
            >
              <LogOut size={16} color={colors.danger} />
              <Text className="mt-0.5 text-[9px] font-semibold text-center" style={{ color: colors.danger }}>
                Out
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className="min-w-0 flex-1">
        {!chartFullscreen && <TopAccountBar />}
        <ScrollView
          scrollEnabled={!chartFullscreen}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, padding: chartFullscreen ? 0 : (mobile ? 6 : 12), paddingBottom: chartFullscreen ? 0 : (mobile ? 16 : 24) }}
        >
          <View
            className={chartFullscreen ? 'flex-1' : (desktop ? 'flex-row gap-3 overflow-hidden' : mobile ? 'gap-1.5 overflow-hidden' : 'gap-3 overflow-hidden')}
            style={{ height: chartFullscreen ? undefined : chartAreaHeight, overflow: chartFullscreen ? 'visible' : 'hidden' }}
          >
            {desktop ? (
              <>
                <TradingChart
                  isFullscreen={chartFullscreen}
                  onFullscreenChange={setChartFullscreen}
                  isAdmin={isAdmin}
                  symbolMenuOpen={marketDrawerOpen}
                  onToggleSymbolMenu={setMarketDrawerOpen}
                />
                {!chartFullscreen && orderPanelVisible && (
                  <OrderRail summary={summary} user={user} showSummary={false} showAvailableMargin={false} />
                )}
              </>
            ) : (
              <>
                <TradingChart
                  isFullscreen={chartFullscreen}
                  onFullscreenChange={setChartFullscreen}
                  isAdmin={isAdmin}
                  symbolMenuOpen={marketDrawerOpen}
                  onToggleSymbolMenu={setMarketDrawerOpen}
                />
                {!chartFullscreen && (
                  <View className={tablet ? 'flex-row gap-3' : 'gap-1.5'}>
                    {!mobile && orderPanelVisible ? <OrderRail summary={summary} user={user} /> : null}
                  </View>
                )}
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
      </View>
    </View>
  );
}
