import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Briefcase, CandlestickChart, ListFilter } from 'lucide-react-native';
import TopAccountBar from '../header/TopAccountBar';
import TradingChart from '../chart/TradingChart';
import OrderPanel from '../order/OrderPanel';
import SymbolPanel from '../market/SymbolPanel';
import InsufficientFundsModal from '../order/InsufficientFundsModal';
import OpenPositions from '../positions/OpenPositions';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import BirthdayModal from '../account/BirthdayModal';

import ChartSymbolPanel from '../chart/ChartSymbolPanel';

function OrderRail({ showAvailableMargin = false }) {
  const { darkMode, colors } = useAppTheme();
  return (
    <View
      className="h-full overflow-hidden rounded-2xl border"
      style={{
        width: 310,
        maxWidth: '100%',
        height: '100%',
        backgroundColor: darkMode ? 'rgba(13, 24, 24, 0.78)' : 'rgba(255,255,255,0.86)',
        borderColor: `${colors.primary}32`,
        shadowColor: '#001b16',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: darkMode ? 0.22 : 0.08,
        shadowRadius: 28,
        elevation: 8,
      }}
    >
      <OrderPanel showAvailableMargin={showAvailableMargin} />
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
    background: darkMode ? colors.background : colors.background,
    menu: darkMode ? colors.panel : colors.surface,
    menuBorder: colors.border,
    border: colors.border,
    soft: `${colors.primary}18`,
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

  const filteredSymbols = useMemo(() => {
    const query = search.trim().toLowerCase();
    const favSet = new Set(favoriteSymbols);
    return prices.filter((item) => {
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
  const { user, isAdmin } = useAuth();
  const { summary, insufficientFundsVisible, setInsufficientFundsVisible, sidePanel, setSidePanel } = useDemoTrading();
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [mobileTab, setMobileTab] = useState('trade');
  const [orderTicketOpen, setOrderTicketOpen] = useState(false);

  const desktop = width >= 1100;
  const tablet = width >= 760;
  const mobile = width < 760;
  const chartAreaHeight = desktop
    ? Math.max(560, Math.min(680, height - 150))
    : tablet
      ? Math.max(540, Math.min(640, height - 170))
      : Math.max(430, Math.min(560, height - 210));
  const workspaceBackground = darkMode
    ? `linear-gradient(135deg, ${colors.background} 0%, #081514 42%, #101815 100%)`
    : `linear-gradient(135deg, ${colors.background} 0%, #f8fbf9 46%, #edf4f0 100%)`;
  const shellStyle = {
    backgroundColor: colors.background,
    ...(typeof document !== 'undefined' ? { backgroundImage: workspaceBackground } : {}),
  };

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
      <View className="flex-1" style={shellStyle}>
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
                  orderTicketOpen={orderTicketOpen}
                  onToggleOrderTicket={() => setOrderTicketOpen((open) => !open)}
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
              backgroundColor: darkMode ? 'rgba(13, 24, 24, 0.96)' : 'rgba(255, 255, 255, 0.96)',
              borderColor: colors.border,
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: 54,
              zIndex: 4000,
              elevation: 4000,
              shadowColor: '#001b16',
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: darkMode ? 0.28 : 0.10,
              shadowRadius: 18,
            }}
          >
            <Pressable
              onPress={() => setMobileTab('symbols')}
              className="items-center justify-center flex-1 py-0.5"
            >
              <View
                className="h-6 w-12 items-center justify-center rounded-full"
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
                className="h-6 w-12 items-center justify-center rounded-full"
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
                className="h-6 w-12 items-center justify-center rounded-full"
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
    <View className="flex-1" style={shellStyle}>
      {!chartFullscreen && <TopAccountBar />}
      <ScrollView
        scrollEnabled={!chartFullscreen}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: chartFullscreen ? 0 : (mobile ? 6 : 14), paddingBottom: chartFullscreen ? 0 : (mobile ? 16 : 24) }}
      >
        <View
          className={chartFullscreen ? 'flex-1' : (desktop ? 'flex-row gap-4 overflow-hidden' : mobile ? 'gap-1.5 overflow-hidden' : 'gap-3 overflow-hidden')}
          style={{ height: chartFullscreen ? undefined : chartAreaHeight, overflow: chartFullscreen ? 'visible' : 'hidden' }}
        >
          {desktop ? (
            <>
              <TradingChart
                isFullscreen={chartFullscreen}
                onFullscreenChange={setChartFullscreen}
                isAdmin={isAdmin}
                orderTicketOpen={orderTicketOpen}
                onToggleOrderTicket={() => setOrderTicketOpen((open) => !open)}
              />
              {!chartFullscreen && orderTicketOpen && !isAdmin ? (
                <OrderRail showAvailableMargin={false} />
              ) : null}
            </>
          ) : (
            <>
              <TradingChart
                isFullscreen={chartFullscreen}
                onFullscreenChange={setChartFullscreen}
                isAdmin={isAdmin}
                orderTicketOpen={orderTicketOpen}
                onToggleOrderTicket={() => setOrderTicketOpen((open) => !open)}
              />
              {!chartFullscreen && orderTicketOpen && !isAdmin && !mobile ? (
                <View className={tablet ? 'flex-row gap-3' : 'gap-1.5'}>
                  <OrderRail showAvailableMargin />
                </View>
              ) : null}
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
