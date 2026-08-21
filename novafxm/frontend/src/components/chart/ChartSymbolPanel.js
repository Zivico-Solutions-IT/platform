import { useEffect, useRef } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ChevronDown, ChevronLeft, Search, Star } from 'lucide-react-native';
import { percent, quote } from '../../utils/formatters';

export default function ChartSymbolPanel({
  currentSymbol,
  favoriteSymbols = [],
  filteredSymbols,
  hoveredSymbol,
  onClose,
  onHoverSymbol = () => {},
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
  const favoriteSymbolSet = new Set(favoriteSymbols);
  const favoritesActive = symbolTab === 'Favorites';
  const selectedCategory = symbolTabs.includes(symbolTab) ? symbolTab : symbolTabs[0];

  const containerRef = useRef(null);
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

  return (
    <View
      className={isInline ? "flex-1 w-full overflow-hidden rounded-xl border shadow-sm" : "absolute max-w-[96vw] overflow-hidden rounded-lg border shadow-2xl"}
      style={isInline ? {
        backgroundColor: ui.menu,
        borderColor: ui.menuBorder,
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
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
      <View className="px-3 py-3 border-b" style={{ borderColor: ui.border, zIndex: 3300, elevation: 3300 }}>
        <View className="flex-row items-center gap-2" style={{ zIndex: 3400, elevation: 3400 }}>
          <View ref={containerRef} className="relative flex-1" style={{ zIndex: 3400, elevation: 3400 }}>
            <Pressable
              onPress={() => setSymbolTabMenuOpen((value) => !value)}
              className="flex-row items-center justify-between px-3 border rounded-md h-9"
              style={{
                backgroundColor: symbolTabMenuOpen ? ui.soft : ui.control,
                borderColor: symbolTabMenuOpen ? ui.accent : ui.border,
                cursor: 'pointer',
              }}
            >
              <Text className="text-xs font-medium" numberOfLines={1} style={{ color: symbolTabMenuOpen ? ui.accent : ui.text }}>{selectedCategory}</Text>
              <ChevronDown size={13} color={symbolTabMenuOpen ? ui.accent : ui.muted} />
            </Pressable>
            {symbolTabMenuOpen ? (
              <View
                className="absolute left-0 right-0 p-1 border rounded-md shadow-2xl"
                style={{ top: 42, backgroundColor: ui.menu, borderColor: ui.menuBorder, zIndex: 3500, elevation: 3500 }}
              >
                {symbolTabs.map((entry) => (
                  <Pressable
                    key={entry}
                    onPress={() => onSelectTab(entry)}
                    className="justify-center h-8 px-2 rounded"
                    style={{ backgroundColor: entry === symbolTab ? ui.soft : 'transparent', cursor: 'pointer' }}
                  >
                    <Text className="text-xs font-medium" style={{ color: entry === symbolTab ? ui.accent : ui.text }}>{entry}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={() => onSelectTab('Favorites')}
            className="flex-row items-center justify-center px-3 border rounded-md h-9"
            style={{
              minWidth: 104,
              backgroundColor: favoritesActive ? ui.accent : ui.control,
              borderColor: favoritesActive ? ui.accent : ui.border,
              cursor: 'pointer',
            }}
          >
            <Star size={15} color={favoritesActive ? ui.activeText : ui.muted} fill={favoritesActive ? ui.activeText : 'transparent'} />
            <Text className="ml-1.5 text-xs font-medium" numberOfLines={1} style={{ color: favoritesActive ? ui.activeText : ui.text }}>Favorites</Text>
          </Pressable>
          {onClose ? (
            <Pressable
              onPress={onClose}
              className="items-center justify-center border rounded-md h-9 w-9"
              style={{ backgroundColor: ui.control, borderColor: ui.border }}
            >
              <ChevronLeft size={16} color={ui.muted} />
            </Pressable>
          ) : null}
        </View>
        <View className="flex-row items-center h-10 px-3 mt-2 border rounded-md" style={{ backgroundColor: ui.control, borderColor: ui.border }}>
          <Search size={16} color={ui.muted} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search"
            placeholderTextColor={ui.muted}
            className="flex-1 h-10 ml-2 text-sm"
            style={{ color: ui.text }}
          />
        </View>
      </View>

      <View className="flex-row items-center px-4 py-2 border-b" style={{ borderColor: ui.border }}>
        <Text className="flex-1 text-[11px] font-medium" numberOfLines={1} style={{ color: ui.muted }}>Symbols / Vol</Text>
        <View style={{ width: 85, alignItems: 'flex-end', paddingRight: 8 }}>
          <Text className="text-[11px] font-medium" style={{ color: ui.muted }}>Bid</Text>
        </View>
        <View style={{ width: 85, alignItems: 'flex-end' }}>
          <Text className="text-[11px] font-medium" style={{ color: ui.muted }}>Ask</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 min-h-0"
        showsVerticalScrollIndicator
        persistentScrollbar
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 0, paddingBottom: 80 }}
        style={Platform.OS === 'web'
          ? { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable', touchAction: 'pan-y' }
          : { flex: 1, minHeight: 0 }}
      >
        {filteredSymbols.map((item) => {
          const active = item.symbol === currentSymbol.symbol;
          const hovered = hoveredSymbol === item.symbol;
          const favorite = favoriteSymbolSet.has(item.symbol);

          const bidVal = Number(item.bid ?? item.price);
          const prevBid = Number(item.previousBid);
          const bidPositive = Number.isFinite(bidVal) && Number.isFinite(prevBid) && bidVal !== prevBid
            ? bidVal > prevBid
            : Number(item.change) >= 0;
          const bidTone = bidPositive ? ui.success : ui.danger;

          const askVal = Number(item.ask ?? item.price);
          const prevAsk = Number(item.previousAsk);
          const askPositive = Number.isFinite(askVal) && Number.isFinite(prevAsk) && askVal !== prevAsk
            ? askVal > prevAsk
            : Number(item.change) >= 0;
          const askTone = askPositive ? ui.success : ui.danger;

          return (
            <Pressable
              key={item.symbol}
              onHoverIn={() => onHoverSymbol(item.symbol)}
              onHoverOut={() => onHoverSymbol(null)}
              onPress={() => onSelectSymbol(item.symbol)}
              className="h-[48px] flex-row items-center px-4"
              style={{
                backgroundColor: active
                  ? 'rgba(212, 175, 55, 0.28)'
                  : hovered
                    ? ui.soft
                    : 'transparent',
                cursor: 'pointer',
              }}
            >
              <View className="flex-row items-center flex-1 min-w-0 pr-2">
                <Pressable
                  onPress={(event) => {
                    event?.stopPropagation?.();
                    onToggleFavorite?.(item.symbol);
                  }}
                  className="items-center justify-center rounded h-7 w-7 mr-1"
                  style={{ cursor: 'pointer' }}
                >
                  <Star
                    size={15}
                    color={favorite || active ? (ui.accent || '#D4AF37') : ui.muted}
                    fill={favorite || active ? (ui.accent || '#D4AF37') : 'transparent'}
                  />
                </Pressable>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center">
                    <Text className="text-sm font-semibold" numberOfLines={1} style={{ color: active ? (ui.accent || '#D4AF37') : ui.text }}>{item.symbol}</Text>
                  </View>
                  <Text className="text-[11px]" numberOfLines={1} style={{ color: active ? (ui.accent || '#D4AF37') : ui.muted }}>{item.group || 'Market'}</Text>
                </View>
              </View>
              <View style={{ width: 85, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 }}>
                <Text className="text-xs font-semibold" numberOfLines={1} style={{ color: bidTone }}>
                  {quote(item.bid ?? item.price, item.decimals)}
                </Text>
              </View>
              <View style={{ width: 85, alignItems: 'flex-end', justifyContent: 'center' }}>
                <Text className="text-xs font-semibold" numberOfLines={1} style={{ color: askTone }}>
                  {quote(item.ask ?? item.price, item.decimals)}
                </Text>
              </View>
            </Pressable>
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
    </View>
  );
}
