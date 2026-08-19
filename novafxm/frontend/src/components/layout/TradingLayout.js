import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDown, ArrowUp, Briefcase, CandlestickChart, Clock3, ListFilter, Wallet } from 'lucide-react-native';
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

  const symbolTabs = ['Popular', 'Crypto CFD', 'Energies', 'Forex', 'Indices', 'Metals'];

  const ui = useMemo(() => ({
    background: darkMode ? '#0e1726' : colors.background,
    menu: darkMode ? '#121e30' : colors.surface,
    menuBorder: colors.border,
    border: colors.border,
    soft: darkMode ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.15)',
    control: colors.surface,
    accent: colors.primary,
    activeText: '#0B0B0B',
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

function MobileFundingOptions({ colors, onDeposit, onWithdraw, onHistory }) {
  const actions = [
    { label: 'Deposit', icon: ArrowUp, onPress: onDeposit },
    { label: 'Withdraw', icon: ArrowDown, onPress: onWithdraw },
    { label: 'Transactions History', icon: Clock3, onPress: onHistory },
  ];

  return (
    <View className="px-1 pt-1">
      <Text className="pb-3 pt-1 text-lg font-semibold" style={{ color: colors.text }}>Funding Options</Text>
      {actions.map(({ label, icon: Icon, onPress }) => (
        <Pressable
          key={label}
          onPress={onPress}
          className="mb-2 flex-row items-center rounded-xl border px-4 py-4"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Icon size={21} color={colors.text} strokeWidth={1.8} />
          <Text className="ml-4 text-base font-medium" style={{ color: colors.text }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function TradingLayout() {
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const { colors } = useAppTheme();
  const { user, isAdmin } = useAuth();
  const { summary, insufficientFundsVisible, setInsufficientFundsVisible, sidePanel, setSidePanel } = useDemoTrading();
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [mobileTab, setMobileTab] = useState('symbols');

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
          ) : mobileTab === 'wallet' ? (
            <View className="flex-1 p-2">
              <MobileFundingOptions
                colors={colors}
                onDeposit={() => router.push('/deposit')}
                onWithdraw={() => router.push('/withdraw')}
                onHistory={() => router.push({ pathname: '/trading', params: { panel: 'history' } })}
              />
            </View>
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
              onPress={() => setMobileTab('wallet')}
              className="items-center justify-center flex-1 py-0.5"
            >
              <View className="h-5 w-10 items-center justify-center rounded-full" style={{ backgroundColor: mobileTab === 'wallet' ? `${colors.success}22` : 'transparent' }}>
                <Wallet size={16} color={mobileTab === 'wallet' ? colors.success : colors.muted} />
              </View>
              <Text className="text-[9px] mt-0.5 font-medium" style={{ color: mobileTab === 'wallet' ? colors.success : colors.text }}>Wallet</Text>
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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
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
              <TradingChart isFullscreen={chartFullscreen} onFullscreenChange={setChartFullscreen} isAdmin={isAdmin} />
              {!chartFullscreen && (
                <OrderRail summary={summary} user={user} showSummary={false} showAvailableMargin={false} />
              )}
            </>
          ) : (
            <>
              <TradingChart isFullscreen={chartFullscreen} onFullscreenChange={setChartFullscreen} isAdmin={isAdmin} />
              {!chartFullscreen && (
                <View className={tablet ? 'flex-row gap-3' : 'gap-1.5'}>
                  {!mobile ? <OrderRail summary={summary} user={user} /> : null}
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
  );
}
