import { Animated, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDown, ArrowUp, Briefcase, CandlestickChart, ChevronLeft, ChevronRight, Clock3, ListFilter, Wallet } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import TopAccountBar from '../header/TopAccountBar';
import TradingChart from '../chart/TradingChart';
import OrderPanel from '../order/OrderPanel';
import InsufficientFundsModal from '../order/InsufficientFundsModal';
import OpenPositions from '../positions/OpenPositions';
import AccountSummary from '../account/AccountSummary';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import BirthdayWidget from '../account/BirthdayWidget';
import BirthdayModal from '../account/BirthdayModal';
import { storage } from '../../utils/storage';

import ChartSymbolPanel from '../chart/ChartSymbolPanel';

function OrderRail({ summary, user, showSummary = true, showAvailableMargin = true, titleInset = 0 }) {
  return (
    <View className="h-full overflow-hidden" style={{ width: 300, maxWidth: '100%', overflow: 'hidden', height: '100%' }}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
        style={{ flex: 1 }}
      >
        <BirthdayWidget />
        <OrderPanel showAvailableMargin={showAvailableMargin} titleInset={titleInset} />
        {showSummary ? <AccountSummary summary={summary} user={user} /> : null}
      </ScrollView>
    </View>
  );
}

function CollapsibleOrderRail({ summary, user }) {
  const { colors } = useAppTheme();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <Pressable
        onPress={() => setCollapsed(false)}
        className="h-12 w-8 items-center justify-center self-start rounded-l-xl border shadow-lg"
        style={{ backgroundColor: colors.panel, borderColor: colors.border, cursor: 'pointer' }}
        accessibilityLabel="Show new trade panel"
      >
        <ChevronLeft size={17} color={colors.muted} />
      </Pressable>
    );
  }

  return (
    <View className="relative h-full" style={{ width: 300, maxWidth: '100%' }}>
      <OrderRail summary={summary} user={user} showSummary={false} showAvailableMargin={false} titleInset={30} />
      <Pressable
        onPress={() => setCollapsed(true)}
        className="absolute left-3 top-3 h-7 w-7 items-center justify-center rounded-md"
        style={{ backgroundColor: `${colors.text}08`, zIndex: 20, elevation: 20, cursor: 'pointer' }}
        accessibilityLabel="Hide new trade panel"
      >
        <ChevronRight size={17} color={colors.muted} />
      </Pressable>
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

  const symbolTabs = ['Popular', 'Crypto', 'Energies', 'Forex', 'Indices', 'Metals'];

  const ui = useMemo(() => ({
    background: darkMode ? '#0e1726' : colors.background,
    menu: darkMode ? '#121e30' : colors.panel,
    menuBorder: colors.border,
    border: colors.border,
    soft: darkMode ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.09)',
    selected: darkMode ? 'rgba(212, 175, 55, 0.22)' : 'rgba(212, 175, 55, 0.18)',
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
          : symbolTab === 'Crypto'
            ? itemGroup.includes('crypto')
            : itemGroup.includes(symbolTab.toLowerCase());
      return matchesSearch && matchesTab;
    });
    if (symbolTab === 'Popular') {
      return items.sort((a, b) => getPopularIndex(a.symbol) - getPopularIndex(b.symbol));
    }
    return items;
  }, [prices, search, symbolTab, favoriteSymbols]);

  const activeSymbol = useMemo(
    () => prices.find((item) => item.symbol === selectedSymbol) || { symbol: selectedSymbol },
    [prices, selectedSymbol],
  );

  const activeSymbolGroup = String(activeSymbol?.group || '');

  useEffect(() => {
    const group = activeSymbolGroup.toLowerCase();
    const matchingTab = group.includes('crypto')
      ? 'Crypto'
      : group.includes('energy')
        ? 'Energies'
        : group.includes('forex')
          ? 'Forex'
          : group.includes('indice') || group.includes('index')
            ? 'Indices'
            : group.includes('metal')
              ? 'Metals'
              : null;
    if (matchingTab) {
      setSymbolTab(matchingTab);
      setSymbolTabMenuOpen(false);
    }
  }, [activeSymbolGroup, selectedSymbol]);

  return (
    <ChartSymbolPanel
      isInline={true}
      currentSymbol={activeSymbol}
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

function MobileFundingOptions({ selectedAccount, summary = {}, onDeposit, onWithdraw, onHistory }) {
  const { darkMode, colors } = useAppTheme();
  const balance = Number.isFinite(Number(selectedAccount?.balance)) ? Number(selectedAccount.balance) : Number(summary.balance || 0);
  const accountTier = selectedAccount?.tier || 'Standard';
  const accountType = selectedAccount?.type || 'Demo';
  const realAccount = String(accountType).toLowerCase() === 'live';
  const accountNumber = String(Number(selectedAccount?.id || 0) + 4999).padStart(6, '0');
  const actions = [
    { label: 'Deposit', icon: ArrowUp, onPress: onDeposit, tone: '#2FB675', iconBackground: darkMode ? '#173326' : '#E1F5EE' },
    { label: 'Withdraw', icon: ArrowDown, onPress: onWithdraw, tone: '#DF626A', iconBackground: darkMode ? '#3A2428' : '#FAECE7' },
    { label: 'Transactions History', icon: Clock3, onPress: onHistory, tone: darkMode ? colors.muted : '#737B78', iconBackground: darkMode ? '#252B32' : '#F1F1ED' },
  ];

  return (
    <View className="px-2 pt-2">
      <View className="relative mb-5 overflow-hidden rounded-[22px] border px-5 pb-[22px] pt-5" style={{ backgroundColor: darkMode ? colors.surface : '#FFFDF9', borderColor: darkMode ? colors.border : '#ECE6D6' }}>
        <Svg width="100%" height="64" viewBox="0 0 340 64" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.62 }}>
          <Defs><LinearGradient id="mobileFundingBalanceFill" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#2FA85B" stopOpacity="0.28" /><Stop offset="1" stopColor="#2FA85B" stopOpacity="0" /></LinearGradient></Defs>
          <Path d="M0,44 L28,40 L56,46 L84,26 L112,34 L140,18 L168,24 L196,10 L224,18 L252,6 L280,14 L308,3 L340,12 L340,64 L0,64 Z" fill="url(#mobileFundingBalanceFill)" />
          <Path d="M0,44 L28,40 L56,46 L84,26 L112,34 L140,18 L168,24 L196,10 L224,18 L252,6 L280,14 L308,3 L340,12" fill="none" stroke="#2FA85B" strokeWidth="2" />
        </Svg>
        <View className="relative mb-[14px] flex-row items-center">
          <Text className="text-[13.5px] font-bold" style={{ color: darkMode ? colors.text : '#1B1F27' }}>{accountTier}</Text>
          <View className="ml-2 rounded-full border px-2 py-0.5" style={{ backgroundColor: realAccount ? '#EAF6EC' : '#FBF3E2', borderColor: realAccount ? '#BEE8CC' : '#E9CB84' }}><Text className="text-[10.5px] font-bold" style={{ color: realAccount ? '#2FA85B' : '#B8891E' }}>{realAccount ? 'Real' : 'Demo'}</Text></View>
        </View>
        <Text className="relative text-[9.5px] uppercase" style={{ letterSpacing: 0.6, color: '#A79F87' }}>Total Balance</Text>
        <Text className="relative mt-1 text-[30px] font-bold" style={{ color: darkMode ? colors.text : '#1B1F27' }}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <Text className="relative mt-0.5 text-[11.5px]" style={{ color: '#A79F87' }}>#{accountNumber}</Text>
      </View>
      <Text className="mb-[10px] text-[10.5px] uppercase" style={{ letterSpacing: 0.6, color: '#A79F87' }}>Funding Options</Text>
      <View className="flex-row gap-2">
      {actions.map(({ label, icon: Icon, onPress, tone, iconBackground }) => (
        <Pressable
          key={label}
          onPress={onPress}
          className="flex-1 items-center rounded-2xl border px-2 py-4"
          style={{ backgroundColor: darkMode ? colors.surface : '#FFFFFF', borderColor: darkMode ? colors.border : '#ECEAE3' }}
        >
          <View className="h-9 w-9 items-center justify-center rounded-[11px]" style={{ backgroundColor: iconBackground }}>
            <Icon size={17} color={tone} strokeWidth={1.9} />
          </View>
          <Text className="mt-2 text-[11.5px] font-semibold" numberOfLines={1} style={{ color: darkMode ? colors.text : '#1B1F27' }}>{label === 'Transactions History' ? 'History' : label}</Text>
        </Pressable>
      ))}
      </View>
    </View>
  );
}

export default function TradingLayout() {
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const { colors } = useAppTheme();
  const { user, isAdmin } = useAuth();
  const { summary, selectedTradingAccount, insufficientFundsVisible, setInsufficientFundsVisible, sidePanel, setSidePanel } = useDemoTrading();
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [mobileTab, setMobileTab] = useState('symbols');
  const [mobileTabRestored, setMobileTabRestored] = useState(false);
  const mobileContentAnimation = useRef(new Animated.Value(1)).current;

  const desktop = width >= 1100;
  const tablet = width >= 760;
  const mobile = width < 760;
  const chartAreaHeight = desktop
    ? Math.max(560, Math.min(680, height - 150))
    : tablet
      ? Math.max(540, Math.min(640, height - 170))
      : Math.max(430, Math.min(560, height - 210));

  useEffect(() => {
    let active = true;
    storage.get('mobileTradingTab', 'symbols').then((savedTab) => {
      if (!active) return;
      const validTabs = ['symbols', 'trade', 'position', 'wallet'];
      const restoredTab = validTabs.includes(savedTab) ? savedTab : 'symbols';
      setMobileTab(params.tab === 'wallet' ? 'wallet' : params.panel === 'history' ? 'position' : restoredTab);
      setMobileTabRestored(true);
    }).catch(() => {
      if (active) setMobileTabRestored(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!mobileTabRestored) return;
    storage.set('mobileTradingTab', mobileTab).catch(() => {});
  }, [mobileTab, mobileTabRestored]);

  const selectMobileTab = (tab) => {
    setMobileTab(tab);
    if (params.tab === 'wallet' || params.panel === 'history') {
      router.setParams({ tab: undefined, panel: undefined });
    }
  };

  useEffect(() => {
    if (mobile && params.tab === 'wallet') setMobileTab('wallet');
    if (params.panel === 'verification') setSidePanel('verification');
    if (params.panel === 'history') {
      setSidePanel('history');
      if (mobile) setMobileTab(params.tab === 'wallet' ? 'wallet' : 'position');
    }
    if (params.panel === 'settings') {
      const section = typeof params.section === 'string' && params.section ? params.section : 'profile';
      setSidePanel(`settings:${section}`);
    }
  }, [mobile, params.panel, params.section, params.tab, setSidePanel]);

  useEffect(() => {
    if (!mobile || chartFullscreen) return undefined;
    mobileContentAnimation.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(mobileContentAnimation, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [chartFullscreen, mobile, mobileContentAnimation, mobileTab]);

  if (mobile) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        {!chartFullscreen && <TopAccountBar />}
        <View className="flex-1" style={{ paddingBottom: chartFullscreen ? 0 : 52, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Animated.View
            className="flex-1"
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              opacity: mobileContentAnimation,
              transform: [{ translateY: mobileContentAnimation.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}
          >
          {mobileTab === 'symbols' ? (
            <View className="flex-1 p-2" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <MobileSymbolWatchlist onSelectSymbol={() => selectMobileTab('trade')} />
            </View>
          ) : mobileTab === 'position' ? (
            <ScrollView className="flex-1 px-2 pb-2 pt-1" contentContainerStyle={{ paddingBottom: 16 }}>
              <OpenPositions />
            </ScrollView>
          ) : mobileTab === 'wallet' ? (
            <View className="flex-1 px-2 pb-2 pt-1">
              <MobileFundingOptions
                selectedAccount={selectedTradingAccount}
                summary={summary}
                onDeposit={() => router.push('/deposit')}
                onWithdraw={() => router.push('/withdraw')}
                onHistory={() => router.push({ pathname: '/trading', params: { panel: 'history', tab: 'wallet' } })}
              />
            </View>
          ) : (
            <View className="flex-1 flex-col min-h-0">
              <View className="flex-1 min-h-[340px] min-w-0">
                <TradingChart
                  isFullscreen={chartFullscreen}
                  onFullscreenChange={setChartFullscreen}
                  isAdmin={isAdmin}
                  onOpenSymbols={() => selectMobileTab('symbols')}
                />
              </View>
              {!chartFullscreen && !sidePanel ? (
                <View className="w-full shrink-0">
                  <OrderPanel />
                </View>
              ) : null}
            </View>
          )}
          </Animated.View>
        </View>

        {!chartFullscreen ? (
          <View
            className="flex-row items-center justify-around border-t"
            style={{
              backgroundColor: colors.panel,
              borderColor: colors.border,
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: 52,
              zIndex: 4000,
              elevation: 4000,
            }}
          >
            <Pressable
              onPress={() => selectMobileTab('symbols')}
              className="items-center justify-center flex-1 py-0.5"
            >
              <View
                className="h-5 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: mobileTab === 'symbols' ? `${colors.primary}22` : 'transparent' }}
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
              onPress={() => selectMobileTab('trade')}
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
              onPress={() => selectMobileTab('position')}
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
              onPress={() => selectMobileTab('wallet')}
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
                <CollapsibleOrderRail summary={summary} user={user} />
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
