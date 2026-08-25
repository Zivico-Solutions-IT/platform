import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Calendar, ChevronDown, Eye, Layers, ShieldCheck, TrendingDown, TrendingUp, X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import PositionCard from './PositionCard';
import PositionInfoModal from './PositionInfoModal';
import { dateTime, money, quote } from '../../utils/formatters';
import MarketOverviewWidget from '../market/MarketOverviewWidget';
import AccountHealthGauge from '../account/AccountHealthGauge';

const DATE_FILTER_OPTIONS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: '7days', label: 'Last 7 Days' },
  { key: '1month', label: 'Last One Month' },
  { key: 'year', label: 'Current Year' },
  { key: 'custom', label: 'Custom Range' },
];

const baseColumns = [
  ['', 76],
  ['ID', 76],
  ['Symbol', 120],
  ['Profit / Loss', 115],
  ['Open Time', 165],
  ['Side', 74],
  ['Lots', 65],
  ['Open Price', 105],
  ['Current Price', 120],
  ['Swap', 70],
  ['Stop Loss', 105],
  ['Take Profit', 115],
];

export default function OpenPositions({ showOverview = true }) {
  const { width } = useWindowDimensions();
  const { positions, closedPositions, pendingOrders, closePosition, cancelPendingOrder } = useDemoTrading();
  const { darkMode, colors } = useAppTheme();
  const { notify } = useToast();

  const [tab, setTab] = useState('open'); // 'open', 'pending', 'closed', 'analytics'
  const [error, setError] = useState('');
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [riskMode, setRiskMode] = useState('all');
  const [pendingClosePosition, setPendingClosePosition] = useState(null);
  const [confirmCloseAll, setConfirmCloseAll] = useState(false);
  const [closingPosition, setClosingPosition] = useState(false);
  const [closingAll, setClosingAll] = useState(false);

  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  const mobile = width < 760;
  const desktop = width >= 1100;

  useEffect(() => {
    if (!dateDropdownOpen || Platform.OS !== 'web') return;
    const handleOutsideClick = () => {
      setDateDropdownOpen(false);
    };
    const timer = setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [dateDropdownOpen]);

  const items = useMemo(() => {
    if (tab === 'open') return positions;
    if (tab === 'pending') return pendingOrders || [];

    if (dateFilter === 'all') return closedPositions || [];

    const now = new Date();
    return (closedPositions || []).filter((item) => {
      const dateStr = item.closedAt || item.openedAt || item.createdAt || item.updatedAt;
      if (!dateStr) return true;
      const itemDate = new Date(dateStr);
      if (isNaN(itemDate.getTime())) return true;

      if (dateFilter === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return itemDate >= todayStart;
      }
      if (dateFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= sevenDaysAgo;
      }
      if (dateFilter === '1month') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return itemDate >= oneMonthAgo;
      }
      if (dateFilter === 'year') {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return itemDate >= yearStart;
      }
      if (dateFilter === 'custom') {
        let pass = true;
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (!isNaN(start.getTime())) pass = pass && itemDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (!isNaN(end.getTime())) pass = pass && itemDate <= end;
        }
        return pass;
      }
      return true;
    });
  }, [tab, positions, pendingOrders, closedPositions, dateFilter, startDate, endDate]);

  const panelBackground = colors.panel;
  const headerBackground = darkMode ? '#0a1410' : colors.surface;
  const tableBackground = colors.panel;
  const modalBg = darkMode ? '#0f1f1a' : '#fafaf6';
  const overlayBg = darkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)';
  const borderCol = colors.border;

  const baseTableWidth = baseColumns.reduce((total, [, columnWidth]) => total + columnWidth, 0);
  const tableWidth = Math.min(Math.max(width - 32, 1040), 1440);
  const scale = tableWidth / baseTableWidth;
  const columns = baseColumns.map(([label, columnWidth]) => [label, Math.floor(columnWidth * scale)]);
  const columnWidths = columns.map(([, columnWidth]) => columnWidth);

  const requestClose = (position) => setPendingClosePosition(position);

  const handleViewPosition = (position, mode = 'all') => {
    setRiskMode(mode);
    setSelectedPosition(position);
  };

  const confirmClose = async () => {
    if (!pendingClosePosition) return;
    setError('');
    setClosingPosition(true);
    try {
      if (pendingClosePosition.status === 'pending') {
        await cancelPendingOrder(pendingClosePosition.id);
        notify({ type: 'success', title: 'Order cancelled', message: `${pendingClosePosition.side} ${pendingClosePosition.symbol} pending order cancelled.` });
      } else {
        await closePosition(pendingClosePosition.id);
        notify({ type: 'success', title: 'Position closed', message: `${pendingClosePosition.side} ${pendingClosePosition.symbol} position closed.` });
      }
      setPendingClosePosition(null);
    } catch (requestError) {
      const msg = requestError.response?.data?.message || requestError.message || 'Trade action failed.';
      setError(msg);
      notify({ type: 'error', title: 'Trade action failed', message: msg });
    } finally {
      setClosingPosition(false);
    }
  };

  const closeAll = async () => {
    setError('');
    setClosingAll(true);
    const positionSnapshot = [...positions];
    const failures = [];
    for (const position of positionSnapshot) {
      try {
        await closePosition(position.id);
        notify({ type: 'success', title: 'Position closed', message: `${position.side} ${position.symbol} position closed.` });
      } catch (requestError) {
        failures.push(requestError.response?.data?.message || requestError.message);
      }
    }
    setClosingAll(false);
    setConfirmCloseAll(false);
    if (failures.length) {
      const msg = `${failures.length} position${failures.length === 1 ? '' : 's'} could not be closed. ${failures[0]}`;
      setError(msg);
      notify({ type: 'error', title: 'Close all failed', message: msg });
    }
  };

  return (
    <View className="mt-3 gap-3">
      {/* Top Overview Cards (Market Sentiment & Account Health) */}
      {showOverview ? (
        <View className={mobile ? 'gap-2.5' : 'flex-row gap-3'}>
          <View className="flex-1 min-w-0">
            <MarketOverviewWidget />
          </View>
          <View className="flex-1 min-w-0">
            <AccountHealthGauge />
          </View>
        </View>
      ) : null}

      {/* Positions / Orders / History Tabs Container */}
      <View
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: panelBackground,
          borderColor: colors.border,
        }}
      >
        {/* Tab Headers */}
        <View
          className="flex-row items-center justify-between px-3.5 py-2 border-b"
          style={{
            borderColor: colors.border,
            backgroundColor: headerBackground,
          }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 16 }}>
            {[
              ['open', `Positions (${positions.length})`],
              ['pending', `Orders (${pendingOrders?.length || 0})`],
              ['closed', `History (${closedPositions?.length || 0})`],
            ].map(([value, title]) => {
              const active = tab === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setTab(value);
                    setDateDropdownOpen(false);
                  }}
                  className="py-1 border-b-2 transition-all"
                  style={{
                    borderColor: active ? colors.primary : 'transparent',
                  }}
                >
                  <Text
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: active ? colors.primary : colors.muted }}
                  >
                    {title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Close All Button */}
          {!mobile && tab === 'open' && positions.length > 0 ? (
            <Pressable
              onPress={() => setConfirmCloseAll(true)}
              disabled={closingAll}
              className="flex-row items-center px-2.5 py-1 rounded-lg border gap-1.5"
              style={{
                backgroundColor: `${colors.danger || '#EF4444'}15`,
                borderColor: `${colors.danger || '#EF4444'}40`,
                opacity: closingAll ? 0.6 : 1,
                cursor: 'pointer',
              }}
            >
              <X size={13} color={colors.danger || '#EF4444'} />
              <Text className="text-xs font-bold" style={{ color: colors.danger || '#EF4444' }}>
                Close All Positions
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Closed History Date Filter Bar */}
        {tab === 'closed' ? (
          <View
            className="flex-row items-center justify-between px-4 py-2 border-b"
            style={{ backgroundColor: tableBackground, borderColor: colors.border }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.muted }}>
              History Filter:
            </Text>
            <View className="relative">
              <Pressable
                onPress={() => setDateDropdownOpen((prev) => !prev)}
                className="flex-row items-center h-8 px-3 rounded-lg border gap-1.5"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: dateFilter !== 'all' ? colors.primary : colors.border,
                  cursor: 'pointer',
                }}
              >
                <Calendar size={13} color={dateFilter !== 'all' ? colors.primary : colors.muted} />
                <Text
                  className="text-xs font-bold"
                  style={{ color: dateFilter !== 'all' ? colors.primary : colors.text }}
                >
                  {DATE_FILTER_OPTIONS.find((o) => o.key === dateFilter)?.label || 'Select option'}
                </Text>
                <ChevronDown size={13} color={colors.muted} />
              </Pressable>

              {dateDropdownOpen ? (
                <>
                  {Platform.OS === 'web' ? (
                    <Pressable
                      onPress={() => setDateDropdownOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 3400 }}
                    />
                  ) : null}
                  <View
                    className="absolute right-0 top-9 w-44 rounded-xl border py-1.5 shadow-2xl z-50"
                    style={{
                      backgroundColor: colors.panel,
                      borderColor: colors.border,
                      zIndex: 3500,
                    }}
                  >
                    {DATE_FILTER_OPTIONS.map((opt) => {
                      const selected = dateFilter === opt.key;
                      return (
                        <Pressable
                          key={opt.key}
                          onPress={() => {
                            setDateFilter(opt.key);
                            setDateDropdownOpen(false);
                          }}
                          className="flex-row items-center justify-between px-3 py-2"
                          style={{
                            backgroundColor: selected ? `${colors.primary}18` : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <Text className="text-xs font-semibold" style={{ color: selected ? colors.primary : colors.text }}>
                            {opt.label}
                          </Text>
                          {selected ? <Text className="text-xs font-bold" style={{ color: colors.primary }}>✓</Text> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Mobile View */}
        {mobile ? (
          <View className="p-2.5">
            {error ? (
              <Text className="mb-2 p-2.5 rounded-lg text-xs font-medium" style={{ color: colors.danger, backgroundColor: `${colors.danger}15` }}>
                {error}
              </Text>
            ) : null}
            {items.length ? (
              items.map((position) => {
                const profit = Number(position.profit || 0);
                const isBuy = position.side === 'BUY';
                const sideColor = isBuy ? (colors.success || '#10B981') : (colors.danger || '#EF4444');

                return (
                  <View
                    key={position.id}
                    className="mb-2.5 p-3 rounded-xl border"
                    style={{
                      backgroundColor: darkMode ? '#08100d' : colors.surface,
                      borderColor: colors.border,
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View>
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-sm font-bold" style={{ color: colors.text }}>
                            {position.symbol}
                          </Text>
                          <View
                            className="px-1.5 py-0.2 rounded"
                            style={{ backgroundColor: `${sideColor}20` }}
                          >
                            <Text className="text-[9.5px] font-bold" style={{ color: sideColor }}>
                              {position.side}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-[10px] mt-0.5" style={{ color: colors.muted }}>
                          #{position.id} · {dateTime(position.openedAt || position.createdAt)}
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-1.5">
                        {tab !== 'closed' ? (
                          <Pressable
                            onPress={() => requestClose(position)}
                            className="w-7 h-7 rounded-lg items-center justify-center border"
                            style={{
                              backgroundColor: `${colors.danger || '#EF4444'}15`,
                              borderColor: `${colors.danger || '#EF4444'}40`,
                            }}
                          >
                            <X size={14} color={colors.danger || '#EF4444'} />
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={() => handleViewPosition(position, 'all')}
                          className="w-7 h-7 rounded-lg items-center justify-center border"
                          style={{
                            backgroundColor: `${colors.primary}15`,
                            borderColor: `${colors.primary}40`,
                          }}
                        >
                          <Eye size={14} color={colors.primary} />
                        </Pressable>
                      </View>
                    </View>

                    <View className="flex-row flex-wrap pt-2 border-t" style={{ borderColor: colors.border }}>
                      <View className="w-1/2 mb-1.5">
                        <Text className="text-[9.5px] font-medium" style={{ color: colors.muted }}>
                          Lots / Volume
                        </Text>
                        <Text className="text-xs font-bold" style={{ color: colors.text }}>
                          {Number(position.lots).toFixed(2)}
                        </Text>
                      </View>
                      <View className="w-1/2 mb-1.5 items-end">
                        <Text className="text-[9.5px] font-medium" style={{ color: colors.muted }}>
                          Profit / Loss
                        </Text>
                        <Text className="text-xs font-bold" style={{ color: profit >= 0 ? (colors.success || '#10B981') : (colors.danger || '#EF4444') }}>
                          {profit >= 0 ? `+$${money(profit)}` : `-$${money(Math.abs(profit))}`}
                        </Text>
                      </View>
                      <View className="w-1/2">
                        <Text className="text-[9.5px] font-medium" style={{ color: colors.muted }}>
                          Open Price
                        </Text>
                        <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                          {quote(position.openPrice || position.entryPrice, 4)}
                        </Text>
                      </View>
                      <View className="w-1/2 items-end">
                        <Text className="text-[9.5px] font-medium" style={{ color: colors.muted }}>
                          Current Price
                        </Text>
                        <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                          {quote(position.currentPrice || position.closePrice || position.openPrice, 4)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View className="p-8 items-center justify-center">
                <Layers size={22} color={colors.muted} />
                <Text className="mt-2 text-xs font-semibold" style={{ color: colors.muted }}>
                  No {tab} records available.
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* Desktop Horizontal Scroll Table */
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ width: tableWidth, backgroundColor: tableBackground }}>
              <View
                className="flex-row border-b px-2 py-2"
                style={{ backgroundColor: headerBackground, borderColor: colors.border }}
              >
                {columns.map(([label, columnWidth]) => (
                  <Text
                    key={label}
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ width: columnWidth, color: colors.muted }}
                  >
                    {label}
                  </Text>
                ))}
              </View>
              {error ? (
                <Text className="p-3 text-xs" style={{ color: colors.danger }}>
                  {error}
                </Text>
              ) : null}
              {items.length ? (
                items.map((position, index) => (
                  <PositionCard
                    key={position.id}
                    position={position}
                    index={index}
                    columnWidths={columnWidths}
                    tableWidth={tableWidth}
                    onView={handleViewPosition}
                    onClose={requestClose}
                    closed={tab === 'closed'}
                    pending={tab === 'pending'}
                  />
                ))
              ) : (
                <View className="p-8 items-center justify-center">
                  <Layers size={22} color={colors.muted} />
                  <Text className="mt-2 text-xs font-semibold" style={{ color: colors.muted }}>
                    No {tab} positions currently.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Position Detail & Risk Modal */}
      <PositionInfoModal
        position={selectedPosition}
        visible={Boolean(selectedPosition)}
        mode={riskMode}
        onClose={() => setSelectedPosition(null)}
        onRiskUpdated={(updated) =>
          setSelectedPosition((current) => (current ? { ...current, ...updated } : current))
        }
      />

      {/* Confirmation Modal for Single Position Close */}
      <Modal visible={Boolean(pendingClosePosition)} transparent animationType="fade" onRequestClose={() => { if (!closingPosition) setPendingClosePosition(null); }}>
        <Pressable className="flex-1 items-center justify-center p-4" style={{ backgroundColor: overlayBg }} onPress={() => { if (!closingPosition) setPendingClosePosition(null); }}>
          <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[380px] rounded-2xl border overflow-hidden" style={{ backgroundColor: modalBg, borderColor: borderCol }}>
            <View className="flex-row items-center justify-between p-4 border-b" style={{ borderColor: borderCol }}>
              <Text className="text-sm font-bold" style={{ color: colors.text }}>
                {pendingClosePosition?.status === 'pending' ? 'Cancel Pending Order' : 'Close Position'}
              </Text>
              <Pressable onPress={() => setPendingClosePosition(null)} className="w-6 h-6 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}>
                <X size={13} color={colors.text} />
              </Pressable>
            </View>
            <View className="p-4">
              <Text className="text-xs font-medium leading-5 mb-4" style={{ color: colors.muted }}>
                {pendingClosePosition?.status === 'pending'
                  ? `Cancel pending order #${pendingClosePosition?.id} (${pendingClosePosition?.side} ${pendingClosePosition?.symbol})?`
                  : `Close ${pendingClosePosition?.side} position #${pendingClosePosition?.id} (${pendingClosePosition?.symbol}) at market price?`}
              </Text>
              <View className="flex-row gap-2.5">
                <Pressable onPress={() => setPendingClosePosition(null)} className="flex-1 h-9 rounded-xl border items-center justify-center" style={{ borderColor: borderCol }}>
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>Keep Open</Text>
                </Pressable>
                <Pressable onPress={confirmClose} disabled={closingPosition} className="flex-1 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: colors.danger || '#EF4444' }}>
                  {closingPosition ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-xs font-bold text-white">Confirm</Text>}
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmation Modal for Close All */}
      <Modal visible={confirmCloseAll} transparent animationType="fade" onRequestClose={() => { if (!closingAll) setConfirmCloseAll(false); }}>
        <Pressable className="flex-1 items-center justify-center p-4" style={{ backgroundColor: overlayBg }} onPress={() => { if (!closingAll) setConfirmCloseAll(false); }}>
          <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[380px] rounded-2xl border overflow-hidden" style={{ backgroundColor: modalBg, borderColor: borderCol }}>
            <View className="flex-row items-center justify-between p-4 border-b" style={{ borderColor: borderCol }}>
              <Text className="text-sm font-bold" style={{ color: colors.text }}>
                Close All Positions
              </Text>
              <Pressable onPress={() => setConfirmCloseAll(false)} className="w-6 h-6 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}>
                <X size={13} color={colors.text} />
              </Pressable>
            </View>
            <View className="p-4">
              <Text className="text-xs font-medium leading-5 mb-4" style={{ color: colors.muted }}>
                Are you sure you want to close all {positions.length} active positions at current market prices?
              </Text>
              <View className="flex-row gap-2.5">
                <Pressable onPress={() => setConfirmCloseAll(false)} className="flex-1 h-9 rounded-xl border items-center justify-center" style={{ borderColor: borderCol }}>
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={closeAll} disabled={closingAll} className="flex-1 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: colors.danger || '#EF4444' }}>
                  {closingAll ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-xs font-bold text-white">Close All</Text>}
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
