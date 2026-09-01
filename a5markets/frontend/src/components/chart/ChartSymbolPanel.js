import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Minus, Plus, Search, Star } from 'lucide-react-native';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { useToast } from '../../context/ToastContext';
import { quote } from '../../utils/formatters';

function calendarHtml(ui) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>html,body,.tradingview-widget-container,.tradingview-widget-container__widget{width:100%;height:100%;margin:0;background:${ui.menu};overflow:hidden}</style></head><body><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div><script src="https://s3.tradingview.com/external-embedding/embed-widget-events.js" async>{"colorTheme":"${ui.dark ? 'dark' : 'light'}","isTransparent":true,"width":"100%","height":"100%","locale":"en","importanceFilter":"-1,0,1"}</script></div></body></html>`;
}

export default function ChartSymbolPanel({
  currentSymbol,
  favoriteSymbols = [],
  filteredSymbols,
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
  symbolTabs,
  symbolTab,
  symbolTabMenuOpen,
  setSymbolTabMenuOpen,
  ui,
  isInline = false,
}) {
  const categoryBlue = ui.dark ? '#35d1c5' : '#087f8c';
  const categoryBackground = ui.dark ? '#123945' : '#e0f4f2';
  const expandedBackground = ui.dark ? '#102c35' : '#f8fcfc';
  const tableHeaderBackground = ui.dark ? '#0d2730' : '#eef5f7';
  const controlBackground = ui.dark ? '#102f39' : '#f7fbfc';
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
        setSymbolTabMenuOpen(false);
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

  return (
    <View
      className={isInline ? "flex-1 w-full overflow-hidden rounded-xl border" : "absolute max-w-[96vw] overflow-hidden rounded-lg border"}
      style={isInline ? {
        backgroundColor: ui.menu,
        borderColor: ui.menuBorder,
      } : {
        left: 10,
        top: symbolPanelTop,
        bottom: 10,
        width: symbolPanelWidth,
        backgroundColor: ui.menu,
        borderColor: ui.menuBorder,
        zIndex: 3200,
        elevation: 3200,
      }}
    >
      <View className="flex-row border-b px-1 pt-1" style={{ borderColor: ui.border, backgroundColor: ui.dark ? '#0c222a' : '#fbfdfe' }}>
        {[
          ['symbols', 'Symbols', CircleDollarSign],
          ['calendar', 'Calendar', CalendarDays],
        ].map(([key, label, Icon]) => {
          const active = panelTab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setPanelTab(key)}
              className="mb-1 h-10 flex-1 flex-row items-center justify-center rounded-lg"
              style={{ backgroundColor: active ? categoryBackground : 'transparent' }}
            >
              <Icon size={18} color={active ? categoryBlue : ui.muted} />
              <Text className="ml-2 text-sm font-medium" style={{ color: active ? categoryBlue : ui.muted }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {panelTab === 'calendar' ? (
        <View className="flex-1 p-2" style={{ minHeight: 0 }}>
          {Platform.OS === 'web' ? <iframe title="TradingView economic calendar" srcDoc={calendarHtml(ui)} style={{ width: '100%', height: '100%', border: 0 }} /> : <WebView source={{ html: calendarHtml(ui) }} style={{ flex: 1 }} />}
        </View>
      ) : <>
      <View className="px-3 py-3 border-b" style={{ borderColor: ui.border, backgroundColor: ui.dark ? '#0e2831' : '#ffffff', zIndex: 3300, elevation: 3300 }}>
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center flex-1 h-10 px-3 border rounded-xl" style={{ backgroundColor: controlBackground, borderColor: ui.dark ? '#28515d' : '#bfd6dc' }}>
            <TextInput
              value={search}
              onChangeText={onSearchChange}
              placeholder="Symbol Search"
              placeholderTextColor={ui.muted}
              className="flex-1 h-10 text-sm"
              style={{ color: ui.text }}
            />
            <Search size={17} color={ui.muted} />
          </View>
          {onClose ? (
            <Pressable
              onPress={onClose}
              className="items-center justify-center border rounded-md h-9 w-9"
              style={{ backgroundColor: controlBackground, borderColor: ui.dark ? '#28515d' : '#bfd6dc' }}
            >
              <ChevronLeft size={16} color={ui.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center px-5 py-3 border-b" style={{ borderColor: ui.border, backgroundColor: tableHeaderBackground }}>
        <Text className="flex-1 text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: ui.muted }}>Symbol</Text>
        <Text className="w-[48px] text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: ui.muted }}>Bid</Text>
        <Text className="w-[48px] text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: ui.muted }}>Spread</Text>
        <Text className="w-[48px] text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: ui.muted }}>Ask</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        className="flex-1 min-h-0 a5-blue-scrollbar"
        showsVerticalScrollIndicator
        persistentScrollbar
        style={Platform.OS === 'web' ? { overflowY: 'scroll', scrollbarGutter: 'stable' } : null}
      >
        {(favoritesActive ? ['Favorites'] : symbolTabs).map((category, categoryIndex) => {
          const expanded = favoritesActive || category === expandedCategory;
          return (
            <View key={category}>
              <Pressable
                onPress={() => {
                  if (favoritesActive) return;
                  if (expandedCategory === category) {
                    setExpandedCategory(null);
                    setQuickTradeSymbol(null);
                    return;
                  }
                  setExpandedCategory(category);
                  setQuickTradeSymbol(null);
                  onSelectTab(category);
                }}
                className="flex-row items-center h-[50px] px-4"
                style={{
                backgroundColor: expanded ? categoryBackground : categoryIndex % 2 ? (ui.dark ? ui.control : '#f2f8f9') : ui.menu,
                  cursor: 'pointer',
                }}
              >
                {expanded ? <ChevronDown size={17} color={ui.muted} /> : <ChevronRight size={17} color={ui.muted} />}
                <Text className="ml-2 text-xs font-semibold" style={{ color: expanded ? categoryBlue : ui.text }}>{category.toUpperCase()}</Text>
              </Pressable>
              {expanded ? filteredSymbols.map((item) => {
          const active = item.symbol === selectedSymbol;
          const hovered = hoveredSymbol === item.symbol;
          const favorite = favoriteSymbolSet.has(item.symbol);

          const bidVal = Number(item.bid ?? item.price);
          const prevBid = Number(item.previousBid);
          const bidPositive = Number.isFinite(bidVal) && Number.isFinite(prevBid) && bidVal !== prevBid
            ? bidVal > prevBid
            : Number(item.change) >= 0;
          const bidTone = bidPositive ? '#0aaf9a' : '#ed5b68';

          const askVal = Number(item.ask ?? item.price);
          const prevAsk = Number(item.previousAsk);
          const askPositive = Number.isFinite(askVal) && Number.isFinite(prevAsk) && askVal !== prevAsk
            ? askVal > prevAsk
            : Number(item.change) >= 0;
          const askTone = askPositive ? '#0aaf9a' : '#ed5b68';
          const spread = Number.isFinite(askVal) && Number.isFinite(bidVal)
            ? Math.max(0, (askVal - bidVal) * (10 ** Math.max(0, Number(item.decimals || 5) - 1)))
            : Number(item.spread || 0);

          const quickTradeOpen = quickTradeSymbol === item.symbol;

          return (
            <View key={item.symbol}>
            <Pressable
              onHoverIn={() => onHoverSymbol?.(item.symbol)}
              onHoverOut={() => onHoverSymbol?.(null)}
              onPress={() => onSelectSymbol(item.symbol)}
              className="h-[50px] flex-row items-center px-2.5"
              style={{
                backgroundColor: active
                  ? categoryBackground
                  : hovered
                    ? (ui.dark ? '#163b45' : '#edf8f8')
                    : expandedBackground,
                borderWidth: 1,
                borderColor: active ? categoryBlue : (ui.dark ? '#234852' : '#c8dde1'),
                borderLeftWidth: active ? 4 : 1,
                borderLeftColor: categoryBlue,
                borderRadius: 10,
                marginHorizontal: 8,
                marginTop: 6,
                shadowColor: '#062d35',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: active ? 0.12 : 0.04,
                shadowRadius: 4,
                elevation: active ? 2 : 0,
                cursor: 'pointer',
              }}
            >
              <View className="flex-row items-center pr-1.5" style={{ flex: 1, minWidth: 0 }}>
                <Pressable
                  onPress={(event) => {
                    event?.stopPropagation?.();
                    onToggleFavorite?.(item.symbol);
                  }}
                  className="items-center justify-center rounded-lg h-7 w-7 mr-1"
                  style={{ cursor: 'pointer', backgroundColor: favorite ? `${categoryBlue}1c` : 'transparent' }}
                >
                  <Star
                    size={15}
                    color={favorite ? (ui.accent || '#17B8B2') : ui.muted}
                    fill={favorite ? (ui.accent || '#17B8B2') : 'transparent'}
                  />
                </Pressable>
                <View className="ml-1 flex-row items-center" style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text className="text-xs font-medium" numberOfLines={1} ellipsizeMode="tail" style={{ color: active ? (ui.accent || '#17B8B2') : ui.text }}>{item.symbol}</Text>
                  </View>
                </View>
              </View>
              <View style={{ width: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Text className="text-[11px] font-semibold" numberOfLines={1} adjustsFontSizeToFit style={{ color: bidTone }}>
                  {quote(item.bid ?? item.price, item.decimals)}
                </Text>
              </View>
              <View style={{ width: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Text className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" numberOfLines={1} style={{ color: ui.text, backgroundColor: ui.dark ? '#17333b' : '#e8f1f3' }}>
                  {Number.isFinite(spread) ? spread.toFixed(1) : '0.0'}
                </Text>
              </View>
              <View style={{ width: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Text className="text-[11px] font-semibold" numberOfLines={1} adjustsFontSizeToFit style={{ color: askTone }}>
                  {quote(item.ask ?? item.price, item.decimals)}
                </Text>
              </View>
              <Pressable
                onPress={(event) => {
                  event?.stopPropagation?.();
                  onSelectSymbol(item.symbol);
                  setQuickTradeSymbol((symbol) => symbol === item.symbol ? null : item.symbol);
                }}
                className="items-center justify-center rounded-full"
                style={{ width: 24, height: 24, cursor: 'pointer', backgroundColor: quickTradeOpen ? `${categoryBlue}2a` : 'transparent' }}
              >
                {quickTradeOpen
                  ? <Minus size={16} color={categoryBlue} />
                  : <Plus size={16} color={categoryBlue} />}
              </Pressable>
            </Pressable>
            {quickTradeOpen ? (
              <View
                className="flex-row items-stretch gap-2 px-3 py-3 border-b"
                style={{ backgroundColor: categoryBackground, borderColor: ui.border }}
              >
                <Pressable
                  disabled={quickOrderLoading}
                  onPress={() => submitQuickOrder('SELL', item)}
                  className="flex-1 items-center justify-center rounded-xl"
                  style={{ minHeight: 66, backgroundColor: '#ff5258', opacity: quickOrderLoading ? 0.65 : 1 }}
                >
                  <Text className="text-[11px] font-semibold text-white">SELL</Text>
                  <Text className="mt-1 text-base font-bold text-white">{quote(item.bid ?? item.price, item.decimals)}</Text>
                </Pressable>

                <View className="overflow-hidden rounded-xl" style={{ width: 130, minHeight: 66, backgroundColor: ui.control }}>
                  <View className="items-center justify-center flex-1 px-2">
                    <Text className="text-sm font-medium" style={{ color: ui.text }}>{quickLots}</Text>
                  </View>
                  <View className="flex-row border-t" style={{ borderColor: ui.border, height: 28 }}>
                    <Pressable onPress={() => changeQuickLots(-0.01)} className="items-center justify-center flex-1 border-r" style={{ borderColor: ui.border }}>
                      <Minus size={16} color={ui.muted} />
                    </Pressable>
                    <Pressable onPress={() => changeQuickLots(0.01)} className="items-center justify-center flex-1">
                      <Plus size={16} color={ui.muted} />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  disabled={quickOrderLoading}
                  onPress={() => submitQuickOrder('BUY', item)}
                  className="flex-1 items-center justify-center rounded-xl"
                  style={{ minHeight: 66, backgroundColor: '#28c45a', opacity: quickOrderLoading ? 0.65 : 1 }}
                >
                  <Text className="text-[11px] font-semibold text-white">BUY</Text>
                  <Text className="mt-1 text-base font-bold text-white">{quote(item.ask ?? item.price, item.decimals)}</Text>
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
              No symbols here
            </Text>
            <Text className="mt-1 text-xs text-center" style={{ color: ui.muted }}>
              Tap a star on any market to add it to Favorites.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      </>}
    </View>
  );
}
