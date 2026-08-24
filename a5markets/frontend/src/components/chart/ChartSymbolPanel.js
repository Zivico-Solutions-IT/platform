import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Path } from 'react-native-svg';
import { CalendarDays, ChevronDown, ChevronRight, CircleDollarSign, Flame, Minus, Plus, Search, Star, X } from 'lucide-react-native';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { useToast } from '../../context/ToastContext';
import { quote } from '../../utils/formatters';

function Sparkline({ isPositive, width = 46, height = 20 }) {
  const strokeColor = isPositive ? '#10B981' : '#EF4444';
  const d = isPositive
    ? `M 2 ${height - 3} C ${width * 0.25} ${height - 1}, ${width * 0.45} ${height * 0.3}, ${width * 0.7} ${height * 0.5} T ${width - 2} 3`
    : `M 2 3 C ${width * 0.25} 5, ${width * 0.45} ${height * 0.7}, ${width * 0.7} ${height * 0.4} T ${width - 2} ${height - 3}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const SYMBOL_DESCRIPTIONS = {
  'EUR/USD': 'Euro / US Dollar',
  'GBP/USD': 'British Pound / US Dollar',
  'USD/JPY': 'US Dollar / Japanese Yen',
  'XAU/USD': 'Gold / US Dollar',
  'EUR/CHF': 'Euro / Swiss Franc',
  'EUR/JPY': 'Euro / Japanese Yen',
  'XAG/USD': 'Silver / US Dollar',
  'WTI/USD': 'Crude Oil (WTI) / US Dollar',
  'BTC/USD': 'Bitcoin / US Dollar',
  'ETH/USD': 'Ethereum / US Dollar',
  'SOL/USD': 'Solana / US Dollar',
  'XRP/USD': 'XRP / US Dollar',
  'DOGE/USD': 'Dogecoin / US Dollar',
  'BNB/USD': 'BNB / US Dollar',
  'ADA/USD': 'Cardano / US Dollar',
  'AVAX/USD': 'Avalanche / US Dollar',
  'DOT/USD': 'Polkadot / US Dollar',
  'LINK/USD': 'Chainlink / US Dollar',
  'LTC/USD': 'Litecoin / US Dollar',
  'BCH/USD': 'Bitcoin Cash / US Dollar',
  'BRN/USD': 'Brent Crude / US Dollar',
  'NGC/USD': 'Natural Gas / US Dollar',
  'AUD/USD': 'Australian Dollar / US Dollar',
  'NZD/USD': 'New Zealand Dollar / US Dollar',
  'USD/CAD': 'US Dollar / Canadian Dollar',
  'USD/CHF': 'US Dollar / Swiss Franc',
  'AUD/JPY': 'Australian Dollar / Japanese Yen',
  'GBP/JPY': 'British Pound / Japanese Yen',
  'EUR/GBP': 'Euro / British Pound',
  'EUR/AUD': 'Euro / Australian Dollar',
  'EUR/CAD': 'Euro / Canadian Dollar',
  'SPX/USD': 'S&P 500 / US Dollar',
  'NDX/USD': 'Nasdaq 100 / US Dollar',
  'DJI/USD': 'Dow Jones 30 / US Dollar',
  'DAX/EUR': 'Germany 40 / Euro',
  'FTS/GBP': 'UK 100 / British Pound',
  'NIK/JPY': 'Japan 225 / Yen',
};

const getSymbolDescription = (symbol) => {
  if (SYMBOL_DESCRIPTIONS[symbol]) return SYMBOL_DESCRIPTIONS[symbol];
  const parts = String(symbol || '').split('/');
  if (parts.length === 2) {
    const baseNames = {
      AUD: 'Australian Dollar', CAD: 'Canadian Dollar', CHF: 'Swiss Franc',
      EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen', NZD: 'New Zealand Dollar',
      USD: 'US Dollar', XAU: 'Gold', XAG: 'Silver', WTI: 'Crude Oil', BTC: 'Bitcoin', ETH: 'Ethereum'
    };
    const b = baseNames[parts[0]] || parts[0];
    const q = baseNames[parts[1]] || parts[1];
    return `${b} / ${q}`;
  }
  return symbol;
};

function calendarHtml(ui) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>html,body,.tradingview-widget-container,.tradingview-widget-container__widget{width:100%;height:100%;margin:0;background:${ui.menu};overflow:hidden}</style></head><body><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><script src="https://s3.tradingview.com/external-embedding/embed-widget-events.js" async>{"colorTheme":"${ui.dark ? 'dark' : 'light'}","isTransparent":true,"width":"100%","height":"100%","locale":"en","importanceFilter":"-1,0,1"}</script></div></body></html>`;
}

export default function ChartSymbolPanel({
  currentSymbol,
  favoriteSymbols = [],
  filteredSymbols = [],
  hoveredSymbol,
  onClose,
  onHoverSymbol,
  onSearchChange,
  onSelectSymbol,
  onSelectTab,
  onToggleFavorite,
  search,
  symbolPanelTop,
  symbolPanelWidth,
  symbolTabs = ['Popular', 'Crypto CFD', 'Energies', 'Forex', 'Indices', 'Metals'],
  symbolTab,
  symbolTabMenuOpen,
  setSymbolTabMenuOpen,
  ui,
  isInline = false,
}) {
  const categoryBlue = '#10B981';
  const selectedSymbol = typeof currentSymbol === 'string' ? currentSymbol : currentSymbol?.symbol;
  const { openPosition } = useDemoTrading();
  const { notify } = useToast();
  const [quickTradeSymbol, setQuickTradeSymbol] = useState(null);
  const [quickLots, setQuickLots] = useState('0.01');
  const [quickOrderLoading, setQuickOrderLoading] = useState(false);
  const [panelTab, setPanelTab] = useState('symbols');
  const favoriteSymbolSet = new Set(favoriteSymbols);
  const favoritesActive = symbolTab === 'Favorites';
  const selectedCategory = symbolTabs.includes(symbolTab) ? symbolTab : symbolTabs[0];
  const [expandedCategory, setExpandedCategory] = useState(selectedCategory);

  const containerRef = useRef(null);

  const changeQuickLots = (delta) => {
    const next = Math.max(0.01, Math.round(((Number(quickLots) || 0.01) + delta) * 100) / 100);
    setQuickLots(next.toFixed(2));
  };

  const submitQuickOrder = async (side, item) => {
    try {
      setQuickOrderLoading(true);
      onSelectSymbol(item.symbol);
      await openPosition(side, Number(quickLots), { symbol: item.symbol });
      notify({ type: 'success', title: 'Order placed', message: `${side} ${quickLots} lots of ${item.symbol} placed successfully.` });
    } catch (error) {
      notify({ type: 'error', title: 'Order rejected', message: error?.response?.data?.message || error?.message || 'Order failed.' });
    } finally {
      setQuickOrderLoading(false);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!symbolTabMenuOpen) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSymbolTabMenuOpen?.(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [symbolTabMenuOpen, setSymbolTabMenuOpen]);

  useEffect(() => {
    if (favoritesActive) return;
    setExpandedCategory(selectedCategory);
  }, [favoritesActive, selectedCategory]);

  const activeTabList = ['Popular', 'Favorites', ...symbolTabs.filter(t => t !== 'Popular' && t !== 'Favorites')];

  return (
    <View
      ref={containerRef}
      className={isInline ? "flex-1 w-full overflow-hidden rounded-2xl border" : "absolute max-w-[96vw] overflow-hidden rounded-2xl border"}
      style={isInline ? {
        backgroundColor: ui.menu,
        borderColor: ui.menuBorder,
      } : {
        left: 10,
        top: symbolPanelTop,
        bottom: 10,
        width: symbolPanelWidth || 360,
        backgroundColor: ui.menu,
        borderColor: ui.menuBorder,
        zIndex: 3200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: ui.dark ? 0.4 : 0.12,
        shadowRadius: 15,
        elevation: 12,
      }}
    >
      {/* Header Bar: MARKET WATCH + Live Markets Badge + Close Button */}
          <View className="px-4 pt-3 pb-2 border-b" style={{ borderColor: ui.border }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-bold tracking-wider uppercase" style={{ color: ui.text }}>
                  MARKET WATCH
                </Text>
                <View
                  className="flex-row items-center px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: ui.dark ? 'rgba(16, 185, 129, 0.2)' : '#E6F4EA' }}
                >
                  <View className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: '#10B981' }} />
                  <Text className="text-[10px] font-semibold" style={{ color: '#10B981' }}>
                    Live Markets
                  </Text>
                </View>
              </View>
              {onClose ? (
                <Pressable
                  onPress={onClose}
                  className="w-7 h-7 rounded-lg items-center justify-center border"
                  style={{
                    backgroundColor: ui.dark ? '#1E293B' : '#F1F5F9',
                    borderColor: ui.border,
                    cursor: 'pointer',
                  }}
                >
                  <X size={15} color={ui.muted} />
                </Pressable>
              ) : null}
            </View>
            <Text className="mt-0.5 text-[11px]" style={{ color: ui.muted }}>
              Real-time market rates & quotes
            </Text>
          </View>

          {/* Search Box */}
          <View className="px-3 py-2 border-b" style={{ borderColor: ui.border }}>
            <View
              className="flex-row items-center h-9 px-3 rounded-2xl border"
              style={{
                backgroundColor: ui.dark ? '#1E293B' : '#F1F5F9',
                borderColor: ui.border,
              }}
            >
              <Search size={15} color={ui.muted} />
              <TextInput
                value={search}
                onChangeText={onSearchChange}
                placeholder="Search symbols (e.g. XAU, BTC, EUR)..."
                placeholderTextColor={ui.muted}
                className="flex-1 ml-2 text-xs h-9"
                style={{ color: ui.text, outlineStyle: 'none' }}
              />
            </View>
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-3 py-2 border-b"
            style={{ borderColor: ui.border, minHeight: 44 }}
            contentContainerStyle={{ gap: 6, alignItems: 'center' }}
          >
            {activeTabList.map((tab) => {
              const active = symbolTab === tab;
              const count = tab === 'Favorites'
                ? favoriteSymbols.length
                : tab === 'Popular'
                  ? 8
                  : undefined;

              return (
                <Pressable
                  key={tab}
                  onPress={() => onSelectTab(tab)}
                  className="flex-row items-center px-2.5 py-1 rounded-full border"
                  style={{
                    backgroundColor: active
                      ? (ui.dark ? 'rgba(16, 185, 129, 0.2)' : '#E6F4EA')
                      : (ui.dark ? '#1E293B' : '#F1F5F9'),
                    borderColor: active ? '#10B981' : ui.border,
                    cursor: 'pointer',
                  }}
                >
                  {tab === 'Popular' ? (
                    <Flame size={12} color={active ? '#10B981' : '#F97316'} style={{ marginRight: 4 }} />
                  ) : tab === 'Favorites' ? (
                    <Star size={12} color={active ? '#10B981' : '#F59E0B'} fill={active ? '#10B981' : '#F59E0B'} style={{ marginRight: 4 }} />
                  ) : null}
                  <Text className="text-[11px] font-semibold" style={{ color: active ? '#10B981' : ui.text }}>
                    {tab}
                  </Text>
                  {count !== undefined ? (
                    <View
                      className="ml-1.5 px-1.5 py-0.2 rounded-full"
                      style={{ backgroundColor: active ? '#10B981' : (ui.dark ? '#334155' : '#CBD5E1') }}
                    >
                      <Text className="text-[9px] font-bold text-white">{count}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* List Column Headers */}
          <View className="flex-row items-center px-3 py-1.5 border-b" style={{ borderColor: ui.border }}>
            <Text className="flex-1 text-[10px] font-semibold tracking-wider text-left" style={{ color: ui.muted }}>
              SYMBOL
            </Text>
            <Text className="w-[50px] text-[10px] font-semibold tracking-wider text-center" style={{ color: ui.muted }}>
              TREND
            </Text>
            <View className="w-[105px] flex-row justify-between pl-1">
              <Text className="text-[10px] font-semibold tracking-wider" style={{ color: ui.muted }}>BID</Text>
              <Text className="text-[10px] font-semibold tracking-wider" style={{ color: ui.muted }}>ASK</Text>
            </View>
          </View>

          {/* Symbol List Items */}
          <ScrollView
            className="flex-1 min-h-0 deep-green-scrollbar"
            showsVerticalScrollIndicator
            persistentScrollbar
            style={Platform.OS === 'web' ? { overflowY: 'scroll', scrollbarGutter: 'stable' } : null}
          >
            {(favoritesActive ? ['Favorites'] : symbolTabs).map((category, categoryIndex) => {
              const expanded = favoritesActive || category === expandedCategory;
              return (
                <View key={category}>
                  {!favoritesActive && symbolTab !== category ? (
                    <Pressable
                      onPress={() => {
                        if (expandedCategory === category) {
                          setExpandedCategory(null);
                          setQuickTradeSymbol(null);
                          return;
                        }
                        setExpandedCategory(category);
                        setQuickTradeSymbol(null);
                        onSelectTab(category);
                      }}
                      className="flex-row items-center h-9 px-3 border-b"
                      style={{
                        backgroundColor: expanded
                          ? (ui.dark ? '#1E293B' : '#E6F4EA')
                          : categoryIndex % 2
                            ? (ui.dark ? ui.control : '#F8FAFC')
                            : ui.menu,
                        borderColor: ui.border,
                        cursor: 'pointer',
                      }}
                    >
                      {expanded ? <ChevronDown size={15} color={ui.muted} /> : <ChevronRight size={15} color={ui.muted} />}
                      <Text className="ml-1.5 text-xs font-semibold tracking-wide" style={{ color: expanded ? '#10B981' : ui.text }}>
                        {category === 'Popular' ? '🔥 POPULAR' : category === 'Favorites' ? '⭐ FAVORITES' : category.toUpperCase()}
                      </Text>
                    </Pressable>
                  ) : null}

                  {expanded ? filteredSymbols.map((item) => {
                    const active = item.symbol === selectedSymbol;
                    const hovered = hoveredSymbol === item.symbol;
                    const favorite = favoriteSymbolSet.has(item.symbol);

                    const bidVal = Number(item.bid ?? item.price);
                    const askVal = Number(item.ask ?? item.price);
                    const changeVal = Number(item.change || 0);
                    const positive = changeVal >= 0;

                    const spreadVal = Number.isFinite(askVal) && Number.isFinite(bidVal)
                      ? Math.max(0.1, ((askVal - bidVal) * (10 ** Math.max(0, Number(item.decimals || 5) - 1))))
                      : Number(item.spreadPoints ?? item.spread ?? 0.4);

                    const quickTradeOpen = quickTradeSymbol === item.symbol;

                    const activeBg = ui.dark ? '#064E3B40' : '#E6F7F5';
                    const hoverBg = ui.dark ? '#1E293B' : '#F8FAFC';
                    const normalBg = ui.dark ? ui.menu : '#FFFFFF';
                    const rowBg = active ? activeBg : (hovered ? hoverBg : normalBg);

                    const description = getSymbolDescription(item.symbol);

                    return (
                      <View key={item.symbol}>
                        <Pressable
                          onHoverIn={() => onHoverSymbol?.(item.symbol)}
                          onHoverOut={() => onHoverSymbol?.(null)}
                          onPress={() => onSelectSymbol(item.symbol)}
                          className="flex-row items-center px-3 py-2.5 border-b"
                          style={{
                            backgroundColor: rowBg,
                            borderColor: active ? 'rgba(16, 185, 129, 0.3)' : ui.border,
                            borderLeftWidth: active ? 3 : 0,
                            borderLeftColor: active ? '#10B981' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          {/* Star Favorite Button */}
                          <Pressable
                            onPress={(e) => {
                              e?.stopPropagation?.();
                              onToggleFavorite?.(item.symbol);
                            }}
                            className="mr-2 p-0.5"
                            style={{ cursor: 'pointer' }}
                          >
                            <Star
                              size={15}
                              color={favorite ? '#F59E0B' : ui.muted}
                              fill={favorite ? '#F59E0B' : 'transparent'}
                            />
                          </Pressable>

                          {/* Symbol Code + Spread Tag + Description */}
                          <View className="flex-1 min-w-0 pr-1">
                            <View className="flex-row items-center gap-1.5">
                              <Text
                                className="text-xs font-bold"
                                numberOfLines={1}
                                style={{ color: active ? '#10B981' : ui.text }}
                              >
                                {item.symbol}
                              </Text>
                              <View
                                className="px-1.5 py-0.2 rounded"
                                style={{ backgroundColor: ui.dark ? '#334155' : '#F1F5F9' }}
                              >
                                <Text className="text-[9px] font-semibold" style={{ color: ui.muted }}>
                                  {spreadVal.toFixed(1)}
                                </Text>
                              </View>
                            </View>
                            <Text
                              className="text-[10px] mt-0.5"
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              style={{ color: ui.muted }}
                            >
                              {description}
                            </Text>
                          </View>

                          {/* Sparkline Mini Chart */}
                          <View className="w-[48px] items-center justify-center">
                            <Sparkline isPositive={positive} width={44} height={18} />
                          </View>

                          {/* Right Side Prices & Change Badge */}
                          <View className="w-[105px] items-end justify-center pl-1">
                            <View className="flex-row items-center justify-between w-full">
                              <Text className="text-[11px] font-semibold" style={{ color: ui.text }}>
                                {quote(bidVal, item.decimals)}
                              </Text>
                              <Text className="text-[11px] font-semibold" style={{ color: ui.text }}>
                                {quote(askVal, item.decimals)}
                              </Text>
                            </View>
                            <View
                              className="mt-1 px-1.5 py-0.2 rounded-full"
                              style={{
                                backgroundColor: positive
                                  ? (ui.dark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5')
                                  : (ui.dark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'),
                              }}
                            >
                              <Text
                                className="text-[9.5px] font-bold"
                                style={{ color: positive ? '#10B981' : '#EF4444' }}
                              >
                                {(positive ? '+' : '') + changeVal.toFixed(2) + '%'}
                              </Text>
                            </View>
                          </View>

                          {/* Quick Trade Toggle (+ / -) */}
                          <Pressable
                            onPress={(e) => {
                              e?.stopPropagation?.();
                              onSelectSymbol(item.symbol);
                              setQuickTradeSymbol((sym) => sym === item.symbol ? null : item.symbol);
                            }}
                            className="ml-1 items-center justify-center rounded-full"
                            style={{ width: 20, height: 26, cursor: 'pointer' }}
                          >
                            {quickTradeOpen
                              ? <Minus size={15} color={ui.muted} />
                              : <Plus size={15} color={ui.muted} />}
                          </Pressable>
                        </Pressable>

                        {/* Quick Trade Sub-panel */}
                        {quickTradeOpen ? (
                          <View
                            className="flex-row items-stretch gap-2 px-3 py-3 border-b"
                            style={{ backgroundColor: ui.dark ? '#1E293B' : '#F8FAFC', borderColor: ui.border }}
                          >
                            <Pressable
                              disabled={quickOrderLoading}
                              onPress={() => submitQuickOrder('SELL', item)}
                              className="flex-1 items-center justify-center rounded-xl p-2"
                              style={{ backgroundColor: '#EF4444', opacity: quickOrderLoading ? 0.65 : 1, cursor: 'pointer' }}
                            >
                              <Text className="text-[10px] font-bold text-white">SELL</Text>
                              <Text className="mt-0.5 text-xs font-bold text-white">{quote(bidVal, item.decimals)}</Text>
                            </Pressable>

                            <View className="overflow-hidden rounded-xl border items-center justify-center px-2" style={{ width: 100, backgroundColor: ui.control, borderColor: ui.border }}>
                              <Text className="text-xs font-bold" style={{ color: ui.text }}>{quickLots}</Text>
                              <View className="flex-row border-t mt-1 w-full" style={{ borderColor: ui.border, height: 22 }}>
                                <Pressable onPress={() => changeQuickLots(-0.01)} className="items-center justify-center flex-1 border-r" style={{ borderColor: ui.border, cursor: 'pointer' }}>
                                  <Minus size={12} color={ui.muted} />
                                </Pressable>
                                <Pressable onPress={() => changeQuickLots(0.01)} className="items-center justify-center flex-1" style={{ cursor: 'pointer' }}>
                                  <Plus size={12} color={ui.muted} />
                                </Pressable>
                              </View>
                            </View>

                            <Pressable
                              disabled={quickOrderLoading}
                              onPress={() => submitQuickOrder('BUY', item)}
                              className="flex-1 items-center justify-center rounded-xl p-2"
                              style={{ backgroundColor: '#10B981', opacity: quickOrderLoading ? 0.65 : 1, cursor: 'pointer' }}
                            >
                              <Text className="text-[10px] font-bold text-white">BUY</Text>
                              <Text className="mt-0.5 text-xs font-bold text-white">{quote(askVal, item.decimals)}</Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  }) : null}
                </View>
              );
            })}

            {!filteredSymbols.length ? (
              <View className="items-center px-6 py-10">
                <Star size={22} color={ui.muted} />
                <Text className="mt-3 text-sm font-medium" style={{ color: ui.text }}>
                  No symbols found
                </Text>
                <Text className="mt-1 text-xs text-center" style={{ color: ui.muted }}>
                  Try searching for another symbol or tap a star to add symbols to Favorites.
                </Text>
              </View>
            ) : null}
          </ScrollView>
    </View>
  );
}
