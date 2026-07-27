import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { CalendarDays, ChevronDown, CircleDollarSign, Search, Star } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { percent, quote } from '../../utils/formatters';

function calendarHtml(colors, darkMode) {
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    html,body,.tradingview-widget-container,.tradingview-widget-container__widget {
      height:100%;width:100%;margin:0;background:${colors.panel};overflow:hidden;
    }
    body { border:1px solid ${colors.border}; border-radius:12px; box-sizing:border-box; }
  </style>
</head>
<body>
  <div class="tradingview-widget-container">
    <div class="tradingview-widget-container__widget"></div>
    <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-events.js" async>
    {
      "colorTheme": "${darkMode ? 'dark' : 'light'}",
      "isTransparent": false,
      "width": "100%",
      "height": "100%",
      "locale": "en",
      "importanceFilter": "-1,0,1",
      "countryFilter": "us,eu,gb,jp,ca,au,nz,ch,cn"
    }
    </script>
  </div>
</body>
</html>`;
}

function SymbolMarketRow({ item, selected, onSelect, colors, darkMode }) {
  const [hovered, setHovered] = useState(false);
  const positive = Number(item.change) >= 0;
  const tone = positive ? colors.success : colors.danger;
  const displaySymbol = item.symbol.replace('/', '');
  const rowBackground = selected
    ? colors.primarySoft
    : hovered
      ? darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(212, 175, 55, 0.12)'
      : 'transparent';
  const fakeVolume = Number.isFinite(Number(item.volume))
    ? `${(Number(item.volume) / 1000000).toFixed(2)}M`
    : `${Math.max(Math.abs(Number(item.price) || 1) * 0.018, 1.05).toFixed(2)}M`;

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => onSelect(item.symbol)}
      className="h-[48px] flex-row items-center px-2"
      style={{ backgroundColor: rowBackground, cursor: 'pointer' }}
    >
      <View className="flex-row items-center flex-1 min-w-0">
        <Star size={14} color={selected || hovered ? colors.primary : colors.muted} />
        <View className="mx-1.5 h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: tone }}>
          <Text className="text-[8px] font-medium text-white">{displaySymbol[0] || '$'}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center">
            <Text className="text-xs font-semimedium" numberOfLines={1} style={{ color: selected || hovered ? colors.primary : colors.text }}>{displaySymbol} CM</Text>
          </View>
          <Text className="text-[10px]" style={{ color: colors.muted }}>{fakeVolume}</Text>
        </View>
      </View>
      <Text className="w-[72px] text-right text-xs font-semimedium" numberOfLines={1} style={{ color: colors.text }}>{quote(item.price, item.decimals)}</Text>
      <Text className="w-[64px] text-right text-xs font-semimedium" numberOfLines={1} style={{ color: tone }}>{percent(item.change)}</Text>
      <Text className="w-[72px] text-right text-xs font-semimedium" numberOfLines={1} style={{ color: colors.text }}>{Number(item.spreadPoints ?? item.spread ?? 0).toFixed(5)}%</Text>
    </Pressable>
  );
}

export default function SymbolPanel({ onSelectSymbol }) {
  const { width } = useWindowDimensions();
  const { prices, selectedSymbol, setSelectedSymbol } = useDemoTrading();
  const { darkMode, colors } = useAppTheme();
  const [tab, setTab] = useState('symbols');
  const [search, setSearch] = useState('');
  const [marketTab, setMarketTab] = useState('COIN-M');
  const [tag, setTag] = useState('All');
  const panelBackground = darkMode ? colors.panel : '#e8f8ee';
  const controlBackground = darkMode ? colors.surface : '#f6fff9';
  const tabBackground = darkMode ? colors.surface : '#f6fff9';
  const desktop = width >= 1100;
  const mobile = width < 760;
  const panelHeight = desktop ? undefined : 390;
  const selectedItem = prices.find((item) => item.symbol === selectedSymbol) || prices[0];
  const selectedPositive = Number(selectedItem?.change) >= 0;
  const selectedTone = selectedPositive ? colors.success : colors.danger;
  const marketTabs = ['Popular', 'Crypto CFD', 'Energies', 'Forex', 'Indices', 'Metals'];
  const tags = ['All', 'New Listing', 'AI', 'Layer-1', 'Layer-2', 'Gaming', 'Meme', 'Infrastructure'];
  const filtered = useMemo(
    () => {
      const query = search.trim().toLowerCase();
      return prices.filter((item) => {
        const matchesSearch = !query || item.symbol.toLowerCase().includes(query) || item.group?.toLowerCase().includes(query);
        const itemGroup = String(item.group || '').toLowerCase();
        const matchesTab = marketTab === 'Popular'
          ? item.popular
          : marketTab === 'Crypto CFD'
            ? itemGroup.includes('crypto')
            : itemGroup.includes(marketTab.toLowerCase());
        return matchesSearch && matchesTab;
      });
    },
    [marketTab, prices, search],
  );

  return (
    <View className="overflow-hidden rounded-2xl border p-2 lg:h-full lg:w-[350px]" style={{ height: panelHeight, backgroundColor: panelBackground, borderColor: colors.border }}>
      <View className={`${mobile ? 'mb-2 rounded-md p-0.5' : 'mb-3 rounded-xl p-1'} flex-row border`} style={{ backgroundColor: tabBackground, borderColor: colors.border }}>
        <Pressable onPress={() => setTab('symbols')} className={`${mobile ? 'rounded px-2 py-2' : 'rounded-lg px-3 py-3'} mr-1 flex-1 flex-row items-center justify-center`} style={{ backgroundColor: tab === 'symbols' ? colors.primary : 'transparent' }}>
          <CircleDollarSign size={mobile ? 14 : 18} color={tab === 'symbols' ? '#0B0B0B' : colors.muted} />
          <Text className={`${mobile ? 'ml-1.5 text-xs' : 'ml-2'} font-semimedium`} style={{ color: tab === 'symbols' ? '#0B0B0B' : colors.muted }}>Symbols</Text>
        </Pressable>
        <Pressable onPress={() => setTab('calendar')} className={`${mobile ? 'rounded px-2 py-2' : 'rounded-lg px-3 py-3'} flex-1 flex-row items-center justify-center`} style={{ backgroundColor: tab === 'calendar' ? colors.primary : 'transparent' }}>
          <CalendarDays size={mobile ? 14 : 18} color={tab === 'calendar' ? '#0B0B0B' : colors.muted} />
          <Text className={`${mobile ? 'ml-1.5 text-xs' : 'ml-2'} font-semimedium`} style={{ color: tab === 'calendar' ? '#0B0B0B' : colors.muted }}>Calendar</Text>
        </Pressable>
      </View>

      {tab === 'calendar' ? (
        <View className="h-[480px] p-2 lg:flex-1">
          {Platform.OS === 'web' ? (
            <iframe
              title="TradingView economic calendar"
              srcDoc={calendarHtml(colors, darkMode)}
              style={{ width: '100%', height: '100%', border: 0, borderRadius: 12 }}
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              domStorageEnabled
              javaScriptEnabled
              source={{ html: calendarHtml(colors, darkMode) }}
              style={{ backgroundColor: colors.panel, borderRadius: 12 }}
            />
          )}
        </View>
      ) : (
        <View className="flex-1 min-h-0">
          <View className="p-3 mb-3 border rounded-xl" style={{ backgroundColor: darkMode ? colors.surface : '#ffffff', borderColor: colors.border }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 min-w-0">
                <Star size={16} color={colors.primary} />
                <View className="items-center justify-center w-6 h-6 mx-2 rounded-full" style={{ backgroundColor: colors.primary }}>
                  <Text className="text-[11px] font-medium" style={{ color: '#0B0B0B' }}>{selectedItem?.symbol?.[0] || '$'}</Text>
                </View>
                <Text className="text-lg font-mediummedium" numberOfLines={1} style={{ color: colors.text }}>{selectedItem?.symbol?.replace('/', '') || selectedSymbol}</Text>
                <ChevronDown size={13} color={colors.muted} />
              </View>
              <View className="items-end">
                <Text className="text-lg font-medium" style={{ color: selectedTone }}>{quote(selectedItem?.price, selectedItem?.decimals)}</Text>
                <Text className="text-[11px] font-medium" style={{ color: selectedTone }}>{percent(selectedItem?.change)}</Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-[10px] font-semimedium" style={{ color: colors.muted }}>Mark {quote(selectedItem?.bid, selectedItem?.decimals)}</Text>
              <Text className="text-[10px] font-semimedium" style={{ color: colors.muted }}>Index {quote(selectedItem?.ask, selectedItem?.decimals)}</Text>
              <Text className="text-[10px] font-semimedium" style={{ color: selectedTone }}>Funding {Number(selectedItem?.spreadPoints ?? selectedItem?.spread ?? 0).toFixed(5)}%</Text>
            </View>
          </View>

          <View className="flex-row items-center px-4 mb-3 border rounded-xl" style={{ backgroundColor: controlBackground, borderColor: colors.border }}>
            <Search size={18} color={colors.muted} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search" placeholderTextColor={colors.muted} className="flex-1 ml-2 h-11" style={{ color: colors.text }} />
          </View>

          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center" style={{ gap: 16 }}>
              {marketTabs.map((item) => (
                <Pressable key={item} onPress={() => setMarketTab(item)} className="pb-1 border-b-2" style={{ borderColor: item === marketTab ? colors.primary : 'transparent' }}>
                  <Text className="text-sm font-medium" style={{ color: item === marketTab ? colors.text : colors.muted }}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable className="flex-row items-center">
              <Text className="text-xs font-medium" style={{ color: colors.muted }}>All</Text>
              <ChevronDown size={13} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2" contentContainerStyle={{ columnGap: 8 }}>
            {tags.map((item) => (
              <Pressable key={item} onPress={() => setTag(item)} className="px-2 py-1 rounded" style={{ backgroundColor: item === tag ? controlBackground : 'transparent' }}>
                <Text className="text-xs font-semimedium" style={{ color: item === tag ? colors.text : colors.muted }}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View className="flex-row px-2 py-2 border-b" style={{ borderColor: colors.border }}>
            <Text className="flex-1 text-[11px] font-medium" style={{ color: colors.muted }}>Symbols ↕ / Vol ↕</Text>
            <Text className="w-[72px] text-right text-[11px] font-medium" style={{ color: colors.muted }}>Last Price ↕</Text>
            <Text className="w-[64px] text-right text-[11px] font-medium" style={{ color: colors.muted }}>24h Chg ↕</Text>
            <Text className="w-[72px] text-right text-[11px] font-medium" style={{ color: colors.muted }}>Funding Rate</Text>
          </View>

          <ScrollView
            className="min-h-0 border-b deep-green-scrollbar rounded-b-xl lg:flex-1"
            style={{ borderColor: colors.border }}
            showsVerticalScrollIndicator
            indicatorStyle={darkMode ? 'white' : 'medium'}
            persistentScrollbar
            nestedScrollEnabled
          >
            {filtered.map((item) => (
              <SymbolMarketRow
                key={item.symbol}
                item={item}
                selected={item.symbol === selectedSymbol}
                onSelect={(sym) => {
                  setSelectedSymbol(sym);
                  if (onSelectSymbol) onSelectSymbol(sym);
                }}
                colors={colors}
                darkMode={darkMode}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
