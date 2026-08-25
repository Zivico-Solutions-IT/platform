import React, { useMemo, useState, useEffect } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { CalendarDays, ChevronDown, ListFilter, Search, Star, TrendingDown, TrendingUp, X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { percent, quote } from '../../utils/formatters';
import { storage } from '../../utils/storage';
import SparklineChart from './SparklineChart';
import SymbolFlagIcon from './SymbolFlagIcon';

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

function MarketWatchRow({
  item,
  selected,
  onSelect,
  isFavorite,
  onToggleFavorite,
  colors,
  darkMode,
}) {
  const [hovered, setHovered] = useState(false);
  const changeNum = Number(item.change || 0);
  const isPositive = changeNum >= 0;
  const toneColor = isPositive ? colors.success || '#10B981' : colors.danger || '#EF4444';
  const priceVal = quote(item.price || item.bid || 0, item.decimals);

  // Background and border highlighting
  const rowBg = selected
    ? darkMode ? 'rgba(0, 103, 79, 0.18)' : 'rgba(0, 103, 79, 0.12)'
    : hovered
      ? darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'
      : 'transparent';

  const borderLeftColor = selected ? colors.primary : 'transparent';

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => onSelect(item.symbol)}
      className="flex-row items-center px-2.5 py-2 transition-all border-b"
      style={{
        backgroundColor: rowBg,
        borderLeftWidth: 3,
        borderLeftColor: borderLeftColor,
        borderBottomColor: darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
      }}
    >
      {/* Favorite Star */}
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          onToggleFavorite(item.symbol);
        }}
        className="items-center justify-center w-6 h-6 mr-1.5 rounded-full"
        style={{ cursor: 'pointer' }}
      >
        <Star
          size={13}
          color={isFavorite ? '#D4AF37' : colors.muted}
          fill={isFavorite ? '#D4AF37' : 'transparent'}
        />
      </Pressable>

      {/* Flag / Icon */}
      <View className="mr-2">
        <SymbolFlagIcon symbol={item.symbol} size={22} />
      </View>

      {/* Symbol Name & Category */}
      <View className="flex-1 min-w-0 pr-1">
        <View className="flex-row items-center gap-1">
          <Text
            className="text-xs font-bold tracking-tight"
            numberOfLines={1}
            style={{ color: selected ? (darkMode ? '#34D399' : colors.primary) : colors.text }}
          >
            {item.symbol}
          </Text>
        </View>
        <Text className="text-[10px] uppercase font-medium" numberOfLines={1} style={{ color: colors.muted }}>
          {item.group || 'Forex'}
        </Text>
      </View>

      {/* Sparkline Mini Trend */}
      <View className="items-center justify-center mx-1.5 opacity-90">
        <SparklineChart
          change={changeNum}
          price={Number(item.price || 100)}
          width={52}
          height={20}
          positiveColor={colors.success || '#10B981'}
          negativeColor={colors.danger || '#EF4444'}
        />
      </View>

      {/* Price and 24h Change Badge */}
      <View className="items-end justify-center min-w-[70px]">
        <Text className="text-xs font-bold" numberOfLines={1} style={{ color: colors.text }}>
          {priceVal}
        </Text>
        <View
          className="flex-row items-center px-1.5 py-0.5 rounded mt-0.5"
          style={{
            backgroundColor: isPositive ? `${colors.success || '#10B981'}18` : `${colors.danger || '#EF4444'}18`,
          }}
        >
          {isPositive ? (
            <TrendingUp size={9} color={toneColor} style={{ marginRight: 2 }} />
          ) : (
            <TrendingDown size={9} color={toneColor} style={{ marginRight: 2 }} />
          )}
          <Text className="text-[9.5px] font-bold" style={{ color: toneColor }}>
            {percent(item.change)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function SymbolPanel({ onSelectSymbol }) {
  const { width } = useWindowDimensions();
  const { prices, selectedSymbol, setSelectedSymbol } = useDemoTrading();
  const { darkMode, colors } = useAppTheme();
  const [viewMode, setViewMode] = useState('watch'); // 'watch' or 'calendar'
  const [search, setSearch] = useState('');
  const [categoryTab, setCategoryTab] = useState('Popular');
  const [favorites, setFavorites] = useState([]);

  const desktop = width >= 1100;
  const mobile = width < 760;

  // Load and save favorite symbols
  useEffect(() => {
    storage.get('market_watch_favorites', ['EUR/USD', 'GBP/USD', 'BTC/USD', 'XAU/USD'])
      .then((saved) => {
        if (Array.isArray(saved)) setFavorites(saved);
      })
      .catch(() => {});
  }, []);

  const toggleFavorite = (sym) => {
    setFavorites((prev) => {
      const next = prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym];
      storage.set('market_watch_favorites', next).catch(() => {});
      return next;
    });
  };

  const categories = [
    { key: 'Popular', label: 'Popular' },
    { key: 'Favorites', label: 'Favorites' },
    { key: 'Forex', label: 'Forex' },
    { key: 'Crypto', label: 'Crypto' },
    { key: 'Indices', label: 'Indices' },
    { key: 'Metals', label: 'Metals' },
    { key: 'Energies', label: 'Energies' },
  ];

  const POPULAR_ORDER = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/CHF', 'EUR/JPY', 'XAU/USD', 'XAG/USD', 'WTI/USD', 'BTC/USD', 'ETH/USD'];

  const filteredSymbols = useMemo(() => {
    const query = search.trim().toLowerCase();
    const favSet = new Set(favorites);

    let items = prices.filter((item) => {
      const sym = item.symbol.toLowerCase();
      const group = String(item.group || '').toLowerCase();
      const matchesSearch = !query || sym.includes(query) || group.includes(query);

      if (!matchesSearch) return false;

      if (categoryTab === 'Favorites') return favSet.has(item.symbol);
      if (categoryTab === 'Popular') return item.popular || POPULAR_ORDER.includes(item.symbol);
      if (categoryTab === 'Crypto') return group.includes('crypto');
      if (categoryTab === 'Forex') return group.includes('forex');
      if (categoryTab === 'Indices') return group.includes('indices');
      if (categoryTab === 'Metals') return group.includes('metals');
      if (categoryTab === 'Energies') return group.includes('energies');

      return true;
    });

    if (categoryTab === 'Popular') {
      items = items.sort((a, b) => {
        const idxA = POPULAR_ORDER.indexOf(a.symbol);
        const idxB = POPULAR_ORDER.indexOf(b.symbol);
        return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
      });
    }

    return items;
  }, [prices, search, categoryTab, favorites]);

  const selectedItem = prices.find((item) => item.symbol === selectedSymbol) || prices[0];

  return (
    <View
      className="flex-col h-full overflow-hidden border rounded-xl"
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
        height: '100%',
        minHeight: desktop ? undefined : 380,
      }}
    >
      {/* Top Header: Market Watch Title & View Toggle */}
      <View
        className="flex-row items-center justify-between px-3.5 py-2.5 border-b"
        style={{ borderColor: colors.border, backgroundColor: darkMode ? '#0a1410' : colors.surface }}
      >
        <View className="flex-row items-center gap-2">
          <ListFilter size={15} color={colors.primary} />
          <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.text }}>
            Market Watch
          </Text>
          <View
            className="px-1.5 py-0.2 rounded-full"
            style={{ backgroundColor: `${colors.primary}18` }}
          >
            <Text className="text-[10px] font-bold" style={{ color: colors.primary }}>
              {filteredSymbols.length}
            </Text>
          </View>
        </View>

        {/* View Switcher (List vs Calendar) */}
        <View className="flex-row items-center p-0.5 rounded-lg border" style={{ borderColor: colors.border, backgroundColor: colors.panel }}>
          <Pressable
            onPress={() => setViewMode('watch')}
            className="px-2 py-1 rounded-md"
            style={{ backgroundColor: viewMode === 'watch' ? colors.primary : 'transparent' }}
          >
            <Text
              className="text-[10px] font-bold"
              style={{ color: viewMode === 'watch' ? '#FFFFFF' : colors.muted }}
            >
              Pairs
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('calendar')}
            className="px-2 py-1 rounded-md"
            style={{ backgroundColor: viewMode === 'calendar' ? colors.primary : 'transparent' }}
          >
            <CalendarDays size={12} color={viewMode === 'calendar' ? '#FFFFFF' : colors.muted} />
          </Pressable>
        </View>
      </View>

      {viewMode === 'calendar' ? (
        <View className="flex-1 min-h-[300px] p-2">
          {Platform.OS === 'web' ? (
            <iframe
              title="Economic Calendar"
              srcDoc={calendarHtml(colors, darkMode)}
              style={{ width: '100%', height: '100%', border: 0, borderRadius: 8 }}
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              domStorageEnabled
              javaScriptEnabled
              source={{ html: calendarHtml(colors, darkMode) }}
              style={{ backgroundColor: colors.panel, borderRadius: 8 }}
            />
          )}
        </View>
      ) : (
        <>
          {/* Search Bar */}
          <View className="px-2.5 pt-2.5 pb-1.5">
            <View
              className="flex-row items-center h-8 px-2.5 border rounded-lg"
              style={{
                backgroundColor: darkMode ? '#08100d' : '#f9fbfb',
                borderColor: colors.border,
              }}
            >
              <Search size={13} color={colors.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search market pairs..."
                placeholderTextColor={colors.muted}
                className="flex-1 h-8 ml-2 text-xs"
                style={{ color: colors.text }}
              />
              {search ? (
                <Pressable onPress={() => setSearch('')}>
                  <X size={13} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Category Tabs */}
          <View className="px-2 pb-2 border-b" style={{ borderColor: colors.border }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 4 }}
            >
              {categories.map((cat) => {
                const active = categoryTab === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => setCategoryTab(cat.key)}
                    className="flex-row items-center px-2.5 py-1 rounded-full border transition-all"
                    style={{
                      backgroundColor: active ? colors.primary : 'transparent',
                      borderColor: active ? colors.primary : colors.border,
                    }}
                  >
                    {cat.key === 'Favorites' ? (
                      <Star
                        size={10}
                        color={active ? '#FFFFFF' : '#D4AF37'}
                        fill={active ? '#FFFFFF' : '#D4AF37'}
                        style={{ marginRight: 3 }}
                      />
                    ) : null}
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: active ? '#FFFFFF' : colors.muted }}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Column Header */}
          <View
            className="flex-row items-center px-3 py-1.5 border-b"
            style={{
              borderColor: colors.border,
              backgroundColor: darkMode ? '#070e0b' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <Text className="flex-1 text-[9.5px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
              Symbol
            </Text>
            <Text className="text-[9.5px] font-bold uppercase tracking-wider text-center mr-4" style={{ color: colors.muted, width: 52 }}>
              Trend
            </Text>
            <Text className="text-[9.5px] font-bold uppercase tracking-wider text-right" style={{ color: colors.muted, width: 70 }}>
              Price / 24h
            </Text>
          </View>

          {/* Market List */}
          <ScrollView
            className="flex-1 min-h-0"
            showsVerticalScrollIndicator
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {filteredSymbols.map((item) => (
              <MarketWatchRow
                key={item.symbol}
                item={item}
                selected={item.symbol === selectedSymbol}
                isFavorite={favorites.includes(item.symbol)}
                onToggleFavorite={toggleFavorite}
                onSelect={(sym) => {
                  setSelectedSymbol(sym);
                  if (onSelectSymbol) onSelectSymbol(sym);
                }}
                colors={colors}
                darkMode={darkMode}
              />
            ))}

            {!filteredSymbols.length ? (
              <View className="items-center justify-center p-6">
                <Star size={20} color={colors.muted} />
                <Text className="mt-2 text-xs font-semibold" style={{ color: colors.text }}>
                  No pairs found
                </Text>
                <Text className="mt-1 text-[10px] text-center" style={{ color: colors.muted }}>
                  {categoryTab === 'Favorites'
                    ? 'Tap the star icon on any pair to add it to your Favorites.'
                    : 'Try changing your search keywords.'}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </>
      )}
    </View>
  );
}
