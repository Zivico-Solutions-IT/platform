import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Calendar, ChevronDown, Eye, X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import PositionCard from './PositionCard';
import PositionInfoModal from './PositionInfoModal';
import { dateTime, money, quote } from '../../utils/formatters';

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
  ['Symbol Name', 120],
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

export default function OpenPositions({ compact = false }) {
  const { width } = useWindowDimensions();
  const { positions, closedPositions, pendingOrders, closePosition, cancelPendingOrder } = useDemoTrading();
  const { darkMode, colors } = useAppTheme();
  const { notify } = useToast();
  const [tab, setTab] = useState('open');
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
  const panelBackground = darkMode ? '#070d12' : colors.panel;
  const headerBackground = darkMode ? '#10161d' : colors.surface;
  const tableBackground = darkMode ? '#080f14' : colors.panel;
  const modalBg = darkMode ? '#12161c' : '#fafaf6';
  const overlayBg = darkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.5)';
  const borderCol = darkMode ? '#1f242d' : '#e6e6e2';
  // Drawers use the same concise card presentation as the mobile terminal,
  // even when they are opened from a desktop screen.
  const mobile = compact || width < 760;
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
      const message = requestError.response?.data?.message || requestError.message || 'Trade action failed.';
      setError(message);
      notify({ type: 'error', title: 'Trade action failed', message });
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
      const message = `${failures.length} position${failures.length === 1 ? '' : 's'} could not be closed. ${failures[0]}`;
      setError(message);
      notify({ type: 'error', title: 'Close all failed', message });
    }
  };

  return (
    <View className={`${mobile ? 'mt-2 rounded-lg' : 'mt-3 rounded-lg'} border`} style={{ backgroundColor: panelBackground, borderColor: colors.border, zIndex: 100, elevation: 100 }}>
      <View className="flex-row items-center justify-between border-b px-5" style={{ borderColor: colors.border, zIndex: 200, elevation: 200 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
          {[
            ['open', `Positions (${positions.length})`],
            ['pending', `Orders (${pendingOrders?.length || 0})`],
            ['closed', 'History'],
          ].map(([value, title]) => (
            <Pressable key={value} onPress={() => { setTab(value); setDateDropdownOpen(false); }} className="mr-8 h-11 justify-center border-b-2" style={{ borderColor: tab === value ? colors.primary : 'transparent' }}>
              <Text className="text-sm font-medium" style={{ color: tab === value ? colors.primary : colors.muted }}>{title}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {!mobile && tab === 'open' && positions.length ? (
          <Pressable onPress={() => setConfirmCloseAll(true)} disabled={closingAll} className="h-8 flex-row items-center rounded-md border px-3 my-1" style={{ backgroundColor: colors.panel, borderColor: colors.border, opacity: closingAll ? 0.6 : 1 }}>
            <X size={14} color={colors.text} />
            <Text className="ml-2 text-xs font-medium" style={{ color: colors.text }}>Close All Positions</Text>
          </Pressable>
        ) : null}
      </View>

      {tab === 'closed' ? (
        <View className="flex-row items-center justify-between border-b px-5 py-2" style={{ backgroundColor: tableBackground, borderColor: colors.border, zIndex: 300, elevation: 300 }}>
          <Text className="text-xs font-medium" style={{ color: colors.muted }}>Date Filter:</Text>
          <View className="relative" style={{ zIndex: 3000, elevation: 3000 }}>
            <Pressable
              onPress={() => setDateDropdownOpen((prev) => !prev)}
              className="h-8 flex-row items-center rounded-md border px-3"
              style={{
                backgroundColor: colors.panel,
                borderColor: dateFilter !== 'all' ? colors.primary : colors.border,
                cursor: 'pointer',
              }}
            >
              <Calendar size={13} color={dateFilter !== 'all' ? colors.primary : colors.muted} />
              <Text className="ml-1.5 text-xs font-medium" style={{ color: dateFilter !== 'all' ? colors.primary : colors.text }}>
                {DATE_FILTER_OPTIONS.find((o) => o.key === dateFilter)?.label || 'Select option'}
              </Text>
              <ChevronDown size={13} color={colors.muted} className="ml-1.5" />
            </Pressable>

            {dateDropdownOpen ? (
              <>
                {Platform.OS === 'web' ? (
                  <Pressable
                    onPress={() => setDateDropdownOpen(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 3400,
                      elevation: 3400,
                    }}
                  />
                ) : null}
                <View
                  className="absolute right-0 top-9 w-44 rounded-lg border py-1.5 shadow-2xl"
                  style={{
                    backgroundColor: headerBackground,
                    borderColor: colors.border,
                    zIndex: 3500,
                    elevation: 3500,
                  }}
                >
                  <Text className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
                    Select option
                  </Text>
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
                        <Text className="text-xs font-medium" style={{ color: selected ? colors.primary : colors.text }}>
                          {opt.label}
                        </Text>
                        {selected ? <Text className="text-xs" style={{ color: colors.primary }}>✓</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>
        </View>
      ) : null}

      {tab === 'closed' && dateFilter === 'custom' ? (
        <View className="flex-row flex-wrap items-center gap-3 border-b px-5 py-2.5" style={{ backgroundColor: tableBackground, borderColor: colors.border }}>
          <Text className="text-xs font-medium" style={{ color: colors.muted }}>From Date:</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                backgroundColor: colors.surface,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 12,
                outline: 'none',
              }}
            />
          ) : (
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              className="rounded border px-2 py-1 text-xs"
              style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
            />
          )}

          <Text className="text-xs font-medium" style={{ color: colors.muted }}>To Date:</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                backgroundColor: colors.surface,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 12,
                outline: 'none',
              }}
            />
          ) : (
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              className="rounded border px-2 py-1 text-xs"
              style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
            />
          )}

          {(startDate || endDate) ? (
            <Pressable onPress={() => { setStartDate(''); setEndDate(''); }} className="rounded px-2.5 py-1" style={{ backgroundColor: `${colors.danger}18` }}>
              <Text className="text-xs font-medium" style={{ color: colors.danger }}>Reset Dates</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {mobile ? (
        <View className="p-2">
          {error ? <Text className="mb-2 rounded-md px-3 py-2" style={{ color: colors.danger, backgroundColor: tableBackground }}>{error}</Text> : null}
          {items.length ? items.map((position) => {
            const profit = Number(position.profit || 0);
            const sideColor = position.side === 'BUY' ? colors.success : colors.danger;
            return (
              <View
                key={position.id}
                className="mb-3 rounded-xl border p-3.5"
                style={{
                  backgroundColor: darkMode ? tableBackground : colors.panel,
                  borderColor: colors.border,
                  borderLeftWidth: 3,
                  borderLeftColor: sideColor,
                  shadowColor: '#18201C',
                  shadowOpacity: darkMode ? 0 : 0.055,
                  shadowOffset: { width: 0, height: 3 },
                  shadowRadius: 10,
                  elevation: darkMode ? 0 : 1,
                }}
              >
                <View className="mb-3.5 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[15px] font-bold" style={{ color: colors.text }}>{position.symbol}</Text>
                    <Text className="mt-0.5 text-[10px]" style={{ color: colors.muted }}>#{position.id} · {dateTime(position.openedAt || position.createdAt)}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {tab !== 'closed' ? (
                      <Pressable onPress={() => requestClose(position)} className="h-9 w-9 items-center justify-center rounded-lg border" style={{ backgroundColor: colors.danger + '0d', borderColor: colors.danger + '40' }}>
                        <X size={16} color={colors.danger} />
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => handleViewPosition(position, 'all')} className="h-9 w-9 items-center justify-center rounded-lg border" style={{ backgroundColor: colors.primary + '0d', borderColor: colors.primary + '40' }}>
                      <Eye size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
                <View className="flex-row flex-wrap border-t pt-3" style={{ borderColor: colors.border }}>
                  <View className="mb-3 w-1/2">
                    <Text className="text-[10px]" style={{ color: colors.muted }}>Side / Lots</Text>
                    <Text className="mt-0.5 text-xs font-bold" style={{ color: sideColor }}>{position.side}  {Number(position.lots).toFixed(2)}</Text>
                  </View>
                  <View className="mb-3 w-1/2 items-end">
                    <Text className="text-[10px]" style={{ color: colors.muted }}>Profit / Loss</Text>
                    <Text className="mt-0.5 text-xs font-bold" style={{ color: profit >= 0 ? colors.success : colors.danger }}>{profit >= 0 ? '+' : ''}{money(profit)}</Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="text-[10px]" style={{ color: colors.muted }}>{tab === 'pending' ? 'Entry Price' : 'Open Price'}</Text>
                    <Text className="mt-0.5 text-xs font-semimedium" style={{ color: colors.text }}>{quote(position.openPrice || position.entryPrice, 5)}</Text>
                  </View>
                  <View className="w-1/2 items-end">
                    <Text className="text-[10px]" style={{ color: colors.muted }}>{tab === 'pending' ? 'Order Type' : 'Current Price'}</Text>
                    <Text className="mt-0.5 text-xs font-semimedium" style={{ color: colors.text }}>{tab === 'pending' ? position.orderType : quote(position.currentPrice || position.closePrice, 5)}</Text>
                  </View>
                </View>
              </View>
            );
          }) : (
            <Text className="rounded-lg border p-4 text-center" style={{ color: colors.muted, backgroundColor: tableBackground, borderColor: colors.border }}>No {tab} positions.</Text>
          )}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="overflow-hidden" style={{ width: tableWidth, backgroundColor: tableBackground }}>
            <View className="flex-row border-b px-2 py-2.5" style={{ backgroundColor: headerBackground, borderColor: colors.border }}>
              {columns.map(([label, columnWidth]) => (
                <Text key={label} className="text-[11px] font-medium uppercase" style={{ width: columnWidth, color: colors.muted }}>{label}</Text>
              ))}
            </View>
            {error ? <Text className="p-4" style={{ color: colors.danger }}>{error}</Text> : null}
            {items.length ? items.map((position, index) => <PositionCard key={position.id} position={position} index={index} columnWidths={columnWidths} tableWidth={tableWidth} onView={handleViewPosition} onClose={requestClose} closed={tab === 'closed'} pending={tab === 'pending'} />) : (
              <Text className="p-6" style={{ color: colors.muted }}>No {tab} positions.</Text>
            )}
          </View>
        </ScrollView>
      )}
      <PositionInfoModal
        position={selectedPosition}
        visible={Boolean(selectedPosition)}
        mode={riskMode}
        onClose={() => setSelectedPosition(null)}
        onRiskUpdated={(updated) => setSelectedPosition((current) => (current ? { ...current, ...updated } : current))}
      />
      <Modal visible={Boolean(pendingClosePosition)} transparent animationType="fade" onRequestClose={() => { if (!closingPosition) setPendingClosePosition(null); }}>
        <Pressable
          className="flex-1 items-center justify-center px-4"
          style={{ backgroundColor: overlayBg }}
          onPress={() => { if (!closingPosition) setPendingClosePosition(null); }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="w-full max-w-[380px] rounded-2xl border overflow-hidden"
            style={{ 
              backgroundColor: modalBg, 
              borderColor: borderCol,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: darkMode ? 0.5 : 0.15,
              shadowRadius: 32,
              elevation: 24,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-5 border-b" style={{ borderColor: borderCol }}>
              <View className="flex-row items-center gap-2.5">
                <View className="h-8 w-8 rounded-full items-center justify-center" style={{ backgroundColor: `${colors.danger}15` }}>
                  <X size={18} color={colors.danger} strokeWidth={2.5} />
                </View>
                <Text className="text-[15px] font-bold" style={{ color: colors.text }}>
                  {pendingClosePosition?.status === 'pending' ? 'Cancel this order?' : 'Close this position?'}
                </Text>
              </View>
              <Pressable disabled={closingPosition} onPress={() => setPendingClosePosition(null)} className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: darkMode ? '#1f242d' : '#e6e6e2' }}>
                <X size={16} color={colors.text} />
              </Pressable>
            </View>

            {/* Body */}
            <View className="p-5">
              <View className="rounded-xl p-4 border mb-6" style={{ backgroundColor: darkMode ? '#1a1f26' : '#ffffff', borderColor: borderCol }}>
                <Text className="text-[13px] font-medium leading-5" style={{ color: colors.muted }}>
                  {pendingClosePosition?.status === 'pending'
                    ? `This will cancel ${pendingClosePosition?.symbol || 'this'} pending order #${pendingClosePosition?.id || ''}.`
                    : `This will close ${pendingClosePosition?.symbol || 'this position'} #${pendingClosePosition?.id || ''} at the current market price.`}
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <Pressable
                  disabled={closingPosition}
                  onPress={() => setPendingClosePosition(null)}
                  className="h-11 flex-1 items-center justify-center rounded-xl border"
                  style={{ borderColor: borderCol, backgroundColor: darkMode ? '#1a1f26' : '#ffffff', opacity: closingPosition ? 0.6 : 1 }}
                >
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>No, keep it</Text>
                </Pressable>
                <Pressable
                  disabled={closingPosition}
                  onPress={confirmClose}
                  className="h-11 flex-1 flex-row items-center justify-center rounded-xl gap-2"
                  style={{ backgroundColor: colors.danger, shadowColor: colors.danger, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, opacity: closingPosition ? 0.8 : 1 }}
                >
                  {closingPosition ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                  <Text className="text-xs font-bold text-white">
                    {closingPosition ? (pendingClosePosition?.status === 'pending' ? 'Cancelling...' : 'Closing...') : (pendingClosePosition?.status === 'pending' ? 'Yes, cancel' : 'Yes, close')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={confirmCloseAll} transparent animationType="fade" onRequestClose={() => { if (!closingAll) setConfirmCloseAll(false); }}>
        <Pressable
          className="flex-1 items-center justify-center px-4"
          style={{ backgroundColor: overlayBg }}
          onPress={() => { if (!closingAll) setConfirmCloseAll(false); }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="w-full max-w-[380px] rounded-2xl border overflow-hidden"
            style={{ 
              backgroundColor: modalBg, 
              borderColor: borderCol,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: darkMode ? 0.5 : 0.15,
              shadowRadius: 32,
              elevation: 24,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-5 border-b" style={{ borderColor: borderCol }}>
              <View className="flex-row items-center gap-2.5">
                <View className="h-8 w-8 rounded-full items-center justify-center" style={{ backgroundColor: `${colors.danger}15` }}>
                  <X size={18} color={colors.danger} strokeWidth={2.5} />
                </View>
                <Text className="text-[15px] font-bold" style={{ color: colors.text }}>Close all positions?</Text>
              </View>
              <Pressable disabled={closingAll} onPress={() => setConfirmCloseAll(false)} className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: darkMode ? '#1f242d' : '#e6e6e2' }}>
                <X size={16} color={colors.text} />
              </Pressable>
            </View>

            {/* Body */}
            <View className="p-5">
              <View className="rounded-xl p-4 border mb-6" style={{ backgroundColor: darkMode ? '#1a1f26' : '#ffffff', borderColor: borderCol }}>
                <Text className="text-[13px] font-medium leading-5" style={{ color: colors.muted }}>
                  This will close all {positions.length} open position{positions.length === 1 ? '' : 's'} at the current market price. This action cannot be undone.
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <Pressable
                  disabled={closingAll}
                  onPress={() => setConfirmCloseAll(false)}
                  className="h-11 flex-1 items-center justify-center rounded-xl border"
                  style={{ borderColor: borderCol, backgroundColor: darkMode ? '#1a1f26' : '#ffffff', opacity: closingAll ? 0.6 : 1 }}
                >
                  <Text className="text-xs font-bold" style={{ color: colors.text }}>No, keep them</Text>
                </Pressable>
                <Pressable
                  disabled={closingAll}
                  onPress={closeAll}
                  className="h-11 flex-1 flex-row items-center justify-center rounded-xl gap-2"
                  style={{ backgroundColor: colors.danger, shadowColor: colors.danger, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, opacity: closingAll ? 0.8 : 1 }}
                >
                  {closingAll ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                  <Text className="text-xs font-bold text-white">{closingAll ? 'Closing...' : 'Yes, close all'}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
