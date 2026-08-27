import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ChevronRight, Search, Star, X } from 'lucide-react-native';
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
  ui, isInline = false,
}) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const favoriteSymbolSet = new Set(favoriteSymbols);
  const selectedSymbol = typeof currentSymbol === 'string' ? currentSymbol : currentSymbol?.symbol;

  return (
    <View className={isInline ? 'flex-1 w-full overflow-hidden rounded-xl border' : 'absolute max-w-[96vw] overflow-hidden rounded-xl border shadow-2xl'} style={isInline ? {
      backgroundColor: ui.menu, borderColor: ui.menuBorder,
    } : {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      // This panel is rendered inside the chart surface. Offset it back over
      // the surface padding so it sits flush against the navigation rail and
      // fills the same available height as the other desktop drawers.
      left: Platform.OS === 'web' ? -8 : 10,
      top: Platform.OS === 'web' ? -6 : symbolPanelTop,
      bottom: Platform.OS === 'web' ? -8 : 10,
      width: symbolPanelWidth,
      backgroundColor: ui.menu, borderColor: ui.menuBorder, zIndex: 3200, elevation: 3200,
    }}>
      <View className="px-3 pt-3 pb-2 border-b" style={{ borderColor: ui.border, zIndex: 3300 }}>
        {!mobile ? <View className="flex-row items-start justify-between">
          <View>
            <View className="flex-row items-center">
              <Text className="text-sm font-bold tracking-wide" style={{ color: ui.text }}>MARKET WATCH</Text>
              <View className="flex-row items-center ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: ui.dark ? '#113d35' : '#e5faf2' }}>
                <View className="w-1.5 h-1.5 mr-1 rounded-full" style={{ backgroundColor: ui.success }} />
                <Text className="text-[9px] font-semibold" style={{ color: ui.success }}>Live Markets</Text>
              </View>
            </View>
          </View>
          {onClose ? <Pressable onPress={onClose} className="items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: ui.control }}><X size={16} color={ui.muted} /></Pressable> : null}
        </View> : (onClose ? <View className="flex-row justify-end"><Pressable onPress={onClose} className="items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: ui.control }}><X size={16} color={ui.muted} /></Pressable></View> : null)}
        <View className="flex-row items-center h-10 px-3 border rounded-lg" style={{ marginTop: mobile ? 0 : 12, backgroundColor: ui.control, borderColor: ui.border }}>
          <Search size={15} color={ui.muted} />
          <TextInput value={search} onChangeText={onSearchChange} placeholder="Search symbols (e.g. XAU, BTC, EUR)..." placeholderTextColor={ui.muted} className="flex-1 h-10 ml-2 text-xs" style={{ color: ui.text, outlineStyle: 'none' }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2" contentContainerStyle={{ alignItems: 'center', gap: 0, minWidth: '100%', paddingHorizontal: 1 }}>
          {['Favorites', ...symbolTabs].map((entry, index) => {
            const active = entry === symbolTab;
            return (
              <View key={entry} className="flex-row items-center">
                {index > 0 ? <View className="mx-[5px] h-3 w-px" style={{ backgroundColor: ui.border }} /> : null}
                <Pressable onPress={() => onSelectTab(entry)} className="h-8 flex-row items-center justify-center" style={{ borderBottomWidth: active ? 2 : 0, borderBottomColor: active ? ui.accent : 'transparent' }}>
                  {entry === 'Favorites' ? <Star size={13} color={active ? ui.accent : ui.muted} fill={active ? ui.accent : 'transparent'} /> : null}
                  <Text className={entry === 'Favorites' ? 'ml-1 font-semibold' : 'font-semibold'} style={{ fontSize: 11, color: active ? ui.accent : ui.muted }}>{entry}</Text>
                  {entry === 'Favorites' ? <Text className="ml-1 text-[9px] font-bold" style={{ color: active ? ui.accent : ui.muted }}>{favoriteSymbols.length}</Text> : null}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
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
            <View className="items-end ml-1" style={{ width: 78 }}>
              <View className="flex-row items-center">
                <Text className="mr-1 text-[7px] font-bold uppercase" style={{ color: ui.muted }}>Bid</Text>
                <Text className="text-[10px] font-bold" style={{ color: ui.danger }}>{quote(item.bid ?? item.price, item.decimals)}</Text>
              </View>
              <View className="mt-0.5 flex-row items-center">
                <Text className="mr-1 text-[7px] font-bold uppercase" style={{ color: ui.muted }}>Ask</Text>
                <Text className="text-[9px] font-bold" style={{ color: ui.success }}>{quote(item.ask ?? item.price, item.decimals)}</Text>
              </View>
            </View>
            <View className="items-center justify-center ml-1 rounded-md" style={{ width: 43, height: 22, backgroundColor: positive ? (ui.dark ? '#123d33' : '#e7f8f0') : (ui.dark ? '#4a2227' : '#fff0f1') }}><Text className="text-[8px] font-bold" style={{ color: tone }}>{percent(change)}</Text></View>
            <ChevronRight size={13} color={active ? ui.accent : ui.muted} />
          </Pressable>;
        })}
        {!filteredSymbols.length ? <View className="items-center px-6 py-10"><Star size={22} color={ui.muted} /><Text className="mt-3 text-sm font-medium" style={{ color: ui.text }}>No symbols here</Text><Text className="mt-1 text-xs text-center" style={{ color: ui.muted }}>Tap a star on any market to add it to Favorites.</Text></View> : null}
      </ScrollView>
    </View>
  );
}
