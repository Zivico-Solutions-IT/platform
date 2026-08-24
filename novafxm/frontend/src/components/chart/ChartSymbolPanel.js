import { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ChevronDown, ChevronRight, Search, Star, X } from 'lucide-react-native';
import Svg, { Polyline } from 'react-native-svg';
import { percent, quote } from '../../utils/formatters';

const MARKET_NAMES = {
  'EUR/USD': 'Euro / US Dollar', 'GBP/USD': 'British Pound / US Dollar',
  'USD/JPY': 'US Dollar / Japanese Yen', 'EUR/CHF': 'Euro / Swiss Franc',
  'EUR/JPY': 'Euro / Japanese Yen', 'XAU/USD': 'Gold / US Dollar',
  'XAG/USD': 'Silver / US Dollar', 'WTI/USD': 'Crude Oil (WTI) / US Dollar',
};

function MiniTrend({ symbol, positive, color }) {
  const points = useMemo(() => {
    let seed = [...String(symbol)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return Array.from({ length: 10 }, (_, index) => {
      seed = (seed * 9301 + 49297) % 233280;
      const noise = ((seed / 233280) - 0.5) * 11;
      const direction = positive ? -index * 1.2 : index * 1.2;
      return `${index * 6},${Math.max(3, Math.min(31, 18 + noise + direction))}`;
    }).join(' ');
  }, [positive, symbol]);
  return <Svg width={56} height={34} viewBox="0 0 56 34"><Polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export default function ChartSymbolPanel({
  currentSymbol, favoriteSymbols = [], filteredSymbols, hoveredSymbol, onClose,
  onHoverSymbol, onSearchChange, onSelectSymbol, onSelectTab, onToggleFavorite,
  search, symbolPanelTop, symbolPanelWidth, symbolTabs, symbolTab,
  symbolTabMenuOpen, setSymbolTabMenuOpen, ui, isInline = false,
}) {
  const containerRef = useRef(null);
  const favoritesActive = symbolTab === 'Favorites';
  const favoriteSymbolSet = new Set(favoriteSymbols);
  const selectedSymbol = typeof currentSymbol === 'string' ? currentSymbol : currentSymbol?.symbol;
  const selectedCategory = symbolTabs.includes(symbolTab) ? symbolTab : symbolTabs[0];

  useEffect(() => {
    if (Platform.OS !== 'web' || !symbolTabMenuOpen) return undefined;
    const outside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setSymbolTabMenuOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [setSymbolTabMenuOpen, symbolTabMenuOpen]);

  return (
    <View className={isInline ? 'flex-1 w-full overflow-hidden rounded-xl border' : 'absolute max-w-[96vw] overflow-hidden rounded-xl border shadow-2xl'} style={isInline ? {
      backgroundColor: ui.menu, borderColor: ui.menuBorder,
    } : {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      left: Platform.OS === 'web' ? 82 : 10,
      top: Platform.OS === 'web' ? 8 : symbolPanelTop,
      bottom: Platform.OS === 'web' ? 8 : 10,
      width: symbolPanelWidth,
      backgroundColor: ui.menu, borderColor: ui.menuBorder, zIndex: 3200, elevation: 3200,
    }}>
      <View className="px-3 pt-3 pb-2 border-b" style={{ borderColor: ui.border, zIndex: 3300 }}>
        <View className="flex-row items-start justify-between">
          <View>
            <View className="flex-row items-center">
              <Text className="text-sm font-bold tracking-wide" style={{ color: ui.text }}>MARKET WATCH</Text>
              <View className="flex-row items-center ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: ui.dark ? '#113d35' : '#e5faf2' }}>
                <View className="w-1.5 h-1.5 mr-1 rounded-full" style={{ backgroundColor: ui.success }} />
                <Text className="text-[9px] font-semibold" style={{ color: ui.success }}>Live Markets</Text>
              </View>
            </View>
            <Text className="mt-0.5 text-[10px]" style={{ color: ui.muted }}>Real-time market rates &amp; quotes</Text>
          </View>
          {onClose ? <Pressable onPress={onClose} className="items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: ui.control }}><X size={16} color={ui.muted} /></Pressable> : null}
        </View>
        <View className="flex-row items-center h-10 px-3 mt-3 border rounded-lg" style={{ backgroundColor: ui.control, borderColor: ui.border }}>
          <Search size={15} color={ui.muted} />
          <TextInput value={search} onChangeText={onSearchChange} placeholder="Search symbols (e.g. XAU, BTC, EUR)..." placeholderTextColor={ui.muted} className="flex-1 h-10 ml-2 text-xs" style={{ color: ui.text, outlineStyle: 'none' }} />
        </View>
        <View className="flex-row items-center mt-2">
          <Pressable onPress={() => onSelectTab(selectedCategory)} className="flex-row items-center px-2.5 h-8 rounded-lg" style={{ backgroundColor: !favoritesActive ? ui.soft : 'transparent' }}><Text className="text-xs font-semibold" style={{ color: !favoritesActive ? ui.accent : ui.muted }}>Markets</Text></Pressable>
          <Pressable onPress={() => onSelectTab('Favorites')} className="flex-row items-center px-2.5 h-8 ml-1 rounded-lg" style={{ backgroundColor: favoritesActive ? ui.soft : 'transparent' }}>
            <Star size={13} color={favoritesActive ? ui.accent : ui.muted} fill={favoritesActive ? ui.accent : 'transparent'} />
            <Text className="ml-1 text-xs font-semibold" style={{ color: favoritesActive ? ui.accent : ui.muted }}>Favorites</Text>
            <View className="ml-1.5 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center" style={{ backgroundColor: ui.control }}><Text className="text-[9px] font-bold" style={{ color: ui.muted }}>{favoriteSymbols.length}</Text></View>
          </Pressable>
        </View>
      </View>

      <View ref={containerRef} style={{ zIndex: 3400 }}>
        <Pressable onPress={() => !favoritesActive && setSymbolTabMenuOpen((open) => !open)} className="flex-row items-center h-10 px-3 border-b" style={{ borderColor: ui.border, backgroundColor: ui.dark ? ui.control : '#f8fbfc' }}>
          <Text className="mr-1 text-[11px]">ðŸ”¥</Text><Text className="flex-1 text-[11px] font-bold" style={{ color: ui.text }}>{favoritesActive ? 'Favorites' : selectedCategory}</Text>
          <View className="w-2 h-2 mr-2 rounded-full" style={{ backgroundColor: ui.accent }} />{!favoritesActive ? <ChevronDown size={14} color={ui.muted} /> : null}
        </Pressable>
        {symbolTabMenuOpen && !favoritesActive ? <View className="absolute left-2 right-2 top-10 p-1 border rounded-lg shadow-xl" style={{ backgroundColor: ui.menu, borderColor: ui.menuBorder, zIndex: 3500 }}>
          {symbolTabs.map((entry) => <Pressable key={entry} onPress={() => onSelectTab(entry)} className="justify-center h-8 px-3 rounded-md" style={{ backgroundColor: entry === symbolTab ? ui.soft : 'transparent' }}><Text className="text-xs font-medium" style={{ color: entry === symbolTab ? ui.accent : ui.text }}>{entry}</Text></Pressable>)}
        </View> : null}
      </View>

      <ScrollView className="flex-1 min-h-0" showsVerticalScrollIndicator persistentScrollbar style={Platform.OS === 'web' ? { overflowY: 'scroll', scrollbarGutter: 'stable' } : null}>
        {filteredSymbols.map((item) => {
          const active = item.symbol === selectedSymbol;
          const favorite = favoriteSymbolSet.has(item.symbol);
          const change = Number(item.change || 0);
          const positive = change >= 0;
          const tone = positive ? ui.success : ui.danger;
          return <Pressable key={item.symbol} onHoverIn={() => onHoverSymbol?.(item.symbol)} onHoverOut={() => onHoverSymbol?.(null)} onPress={() => onSelectSymbol(item.symbol)} className="h-[62px] flex-row items-center px-2 border-b" style={{ backgroundColor: active ? (ui.dark ? '#123f43' : '#e1faf6') : hoveredSymbol === item.symbol ? ui.soft : 'transparent', borderColor: ui.border, cursor: 'pointer' }}>
            <Pressable onPress={(event) => { event?.stopPropagation?.(); onToggleFavorite?.(item.symbol); }} className="items-center justify-center w-7 h-8"><Star size={14} color={favorite ? '#e8b923' : ui.muted} fill={favorite ? '#e8b923' : 'transparent'} /></Pressable>
            <View className="flex-1 min-w-0"><View className="flex-row items-center"><Text className="text-xs font-bold" numberOfLines={1} style={{ color: ui.text }}>{item.symbol}</Text><Text className="ml-1 text-[8px]" style={{ color: ui.muted }}>{Number(item.spread || 0).toFixed(1)}</Text></View><Text className="mt-1 text-[9px]" numberOfLines={1} style={{ color: ui.muted }}>{MARKET_NAMES[item.symbol] || item.group || 'Global Market'}</Text></View>
            <MiniTrend symbol={item.symbol} positive={positive} color={tone} />
            <View className="items-end ml-1" style={{ width: 72 }}><Text className="text-[10px] font-bold" style={{ color: ui.text }}>{quote(item.bid ?? item.price, item.decimals)}</Text><Text className="text-[9px]" style={{ color: ui.muted }}>{quote(item.ask ?? item.price, item.decimals)}</Text></View>
            <View className="items-center justify-center ml-1 rounded-md" style={{ width: 43, height: 22, backgroundColor: positive ? (ui.dark ? '#123d33' : '#e7f8f0') : (ui.dark ? '#4a2227' : '#fff0f1') }}><Text className="text-[8px] font-bold" style={{ color: tone }}>{percent(change)}</Text></View>
            <ChevronRight size={13} color={active ? ui.accent : ui.muted} />
          </Pressable>;
        })}
        {!filteredSymbols.length ? <View className="items-center px-6 py-10"><Star size={22} color={ui.muted} /><Text className="mt-3 text-sm font-medium" style={{ color: ui.text }}>No symbols here</Text><Text className="mt-1 text-xs text-center" style={{ color: ui.muted }}>Tap a star on any market to add it to Favorites.</Text></View> : null}
      </ScrollView>
    </View>
  );
}
