import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { X, TrendingUp, TrendingDown, Shield, ChevronRight, Pencil } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useDemoTrading } from '../../hooks/useDemoTrading';
import { calculateLiquidationPrice, contractSize } from '../../utils/calculations';
import { money, quote } from '../../utils/formatters';

/* ─── Stat Card (top hero section) ─── */
function StatCard({ label, value, valueColor, icon, colors, darkMode, mobile }) {
  const cardBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';
  const borderCol = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  return (
    <View
      className={mobile ? 'mb-1.5 rounded-lg p-2.5' : 'flex-1 rounded-lg p-2.5'}
      style={{
        width: mobile ? '48.5%' : undefined,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: borderCol,
      }}
    >
      <View className="mb-1 flex-row items-center">
        {icon}
        <Text className="ml-1 text-[9px] font-medium uppercase tracking-wider" style={{ color: colors.muted }}>{label}</Text>
      </View>
      <Text className={`${mobile ? 'text-xs' : 'text-sm'} font-semibold`} numberOfLines={1} style={{ color: valueColor || colors.text }}>{value}</Text>
    </View>
  );
}

/* ─── Detail Grid Item ─── */
function DetailItem({ label, value, colors, darkMode, accent = false }) {
  const itemBg = darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  return (
    <View
      className="mb-1.5 flex-1 rounded-md px-2.5 py-2"
      style={{
        backgroundColor: itemBg,
        borderLeftWidth: accent ? 2 : 0,
        borderLeftColor: accent ? colors.primary : 'transparent',
        minWidth: '48%',
      }}
    >
      <Text className="mb-0.5 text-[9px] font-medium uppercase tracking-wider" style={{ color: colors.muted }}>{label}</Text>
      <Text className="text-xs font-semibold" numberOfLines={1} style={{ color: colors.text }}>{value}</Text>
    </View>
  );
}

/* ─── Section Wrapper ─── */
function Section({ title, icon, children, colors, darkMode, mobile }) {
  const sectionBg = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)';
  const borderCol = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  return (
    <View
      className={`${mobile ? 'mt-2.5 rounded-lg p-2.5' : 'mt-3 rounded-lg p-3'}`}
      style={{ backgroundColor: sectionBg, borderWidth: 1, borderColor: borderCol }}
    >
      <View className="mb-2 flex-row items-center">
        {icon}
        <Text className={`${mobile ? 'text-[10px]' : 'text-[11px]'} ml-1.5 font-semibold uppercase tracking-wider`} style={{ color: colors.muted }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const sanitizeDecimalInput = (value) => {
  const text = String(value || '').replace(/[^0-9.]/g, '');
  const [whole, ...decimalParts] = text.split('.');
  return `${whole}${decimalParts.length ? `.${decimalParts.join('')}` : ''}`;
};

function suggestedRiskPrice(position, livePrice, type) {
  const current = Number(livePrice || position.openPrice);
  if (!Number.isFinite(current) || current <= 0) return '';
  const distance = Math.max(current * 0.0005, 0.0001);
  const isBuy = position.side === 'BUY';
  if (type === 'stopLoss') return quote(isBuy ? current - distance : current + distance, 6);
  return quote(isBuy ? current + distance : current - distance, 6);
}

/* ─── Risk Input ─── */
function RiskInput({ label, value, onChangeText, onEdit, colors, darkMode, mobile, editable, inputRef, highlighted, canEdit }) {
  const baseBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';
  const hlBg = darkMode ? 'rgba(212,175,55,0.08)' : 'rgba(212,175,55,0.1)';
  const borderCol = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const isStopLoss = label === 'Stop Loss';

  return (
    <View className={mobile ? 'mb-2' : 'flex-1'}>
      <View className="mb-1 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            className="mr-1 h-3.5 w-3.5 items-center justify-center rounded"
            style={{ backgroundColor: isStopLoss ? `${colors.danger}18` : `${colors.success}18` }}
          >
            {isStopLoss
              ? <TrendingDown size={9} color={colors.danger} />
              : <TrendingUp size={9} color={colors.success} />
            }
          </View>
          <Text className={`${mobile ? 'text-[9px]' : 'text-[10px]'} font-semibold uppercase tracking-wider`} style={{ color: highlighted ? colors.primary : colors.muted }}>
            {label}
          </Text>
        </View>
        {canEdit ? (
          <Pressable onPress={onEdit} disabled={editable} className="flex-row items-center rounded px-1.5 py-0.5" style={{ backgroundColor: `${colors.primary}14`, opacity: editable ? 0.55 : 1 }}>
            <Pencil size={10} color={colors.primary} />
            <Text className="ml-1 text-[9px] font-bold" style={{ color: colors.primary }}>Edit</Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        ref={inputRef}
        editable={editable}
        value={value}
        onChangeText={(text) => onChangeText(sanitizeDecimalInput(text))}
        keyboardType="decimal-pad"
        placeholder="0.000000"
        placeholderTextColor={`${colors.muted}80`}
        className={`${mobile ? 'h-9 rounded-md px-3 text-xs' : 'h-10 rounded-md px-3 text-sm'} font-semibold`}
        style={{
          backgroundColor: highlighted ? hlBg : baseBg,
          borderWidth: highlighted ? 1.5 : 1,
          borderColor: highlighted ? colors.primary : borderCol,
          borderLeftWidth: 3,
          borderLeftColor: isStopLoss ? colors.danger : colors.success,
          color: colors.text,
          opacity: editable ? 1 : 0.55,
        }}
      />
    </View>
  );
}

export default function PositionInfoModal({ position, visible, mode = 'all', onClose, onRiskUpdated }) {
  const { width } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const { notify } = useToast();
  const { prices, summary, updatePositionRisk } = useDemoTrading();
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [riskMessage, setRiskMessage] = useState('');
  const [savingRisk, setSavingRisk] = useState(false);
  const [editingFields, setEditingFields] = useState({ stopLoss: false, takeProfit: false });
  const initialRiskRef = useRef({ stopLoss: '', takeProfit: '' });
  const stopEditedRef = useRef(false);
  const profitEditedRef = useRef(false);
  const scrollViewRef = useRef(null);
  const riskSectionRef = useRef(null);
  const slInputRef = useRef(null);
  const tpInputRef = useRef(null);

  const mobile = width < 760;
  const profit = Number(position?.profit || 0);
  const profitColor = profit >= 0 ? colors.success : colors.danger;
  const status = position?.status || (position?.closedAt ? 'closed' : 'open');
  const closePrice = position?.closePrice || (status === 'closed' ? position?.currentPrice : null);
  const margin = Number(position?.margin ?? Number(position?.lots || 0) * 100);
  const size = contractSize(position?.symbol || '');
  const liquidationPrice = calculateLiquidationPrice(position, summary);
  const marketQuote = prices.find((item) => item.symbol === position?.symbol);
  const liveMarketPrice = marketQuote?.price || position?.currentPrice;
  const currentOrClose = liveMarketPrice || closePrice || position?.openPrice;
  const riskEditable = Boolean(position && (status === 'open' || status === 'pending'));

  // Derived colors
  const modalBg = darkMode ? '#12161c' : '#fafaf6';
  const headerBg = darkMode
    ? 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(18,207,122,0.04))'
    : 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(18,207,122,0.06))';
  const overlayBg = darkMode ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)';

  const getInitialStopLoss = (pos, livePrice) => {
    if (pos.stopLoss && Number(pos.stopLoss) > 0) {
      return quote(pos.stopLoss, 6);
    }
    return mode === 'stopLoss' ? suggestedRiskPrice(pos, livePrice, 'stopLoss') : '';
  };

  const getInitialTakeProfit = (pos, livePrice) => {
    if (pos.takeProfit && Number(pos.takeProfit) > 0) {
      return quote(pos.takeProfit, 6);
    }
    return mode === 'takeProfit' ? suggestedRiskPrice(pos, livePrice, 'takeProfit') : '';
  };

  useEffect(() => {
    if (!position || !visible) return;
    const livePrice = liveMarketPrice || position.openPrice;
    setStopLoss(getInitialStopLoss(position, livePrice));
    setTakeProfit(getInitialTakeProfit(position, livePrice));
    initialRiskRef.current = {
      stopLoss: position.stopLoss && Number(position.stopLoss) > 0 ? quote(position.stopLoss, 6) : '',
      takeProfit: position.takeProfit && Number(position.takeProfit) > 0 ? quote(position.takeProfit, 6) : '',
    };
    stopEditedRef.current = false;
    profitEditedRef.current = false;
    setRiskMessage('');
    setSavingRisk(false);
    setEditingFields({ stopLoss: mode === 'stopLoss', takeProfit: mode === 'takeProfit' });
  }, [position?.id, visible, mode]);

  useEffect(() => {
    if (!position || !visible || !riskEditable) return;
    if (!Number.isFinite(Number(liveMarketPrice)) || Number(liveMarketPrice) <= 0) return;
    if (mode === 'stopLoss' && !position.stopLoss && !stopEditedRef.current) {
      setStopLoss(suggestedRiskPrice(position, liveMarketPrice, 'stopLoss'));
    }
    if (mode === 'takeProfit' && !position.takeProfit && !profitEditedRef.current) {
      setTakeProfit(suggestedRiskPrice(position, liveMarketPrice, 'takeProfit'));
    }
  }, [liveMarketPrice, position, riskEditable, visible, mode]);

  // Auto-scroll to Risk Management section and focus input when opened via + button
  useEffect(() => {
    if (!visible || !position || mode === 'all') return;
    const timer = setTimeout(() => {
      if (riskSectionRef.current && scrollViewRef.current) {
        riskSectionRef.current.measureLayout(
          scrollViewRef.current.getInnerViewRef?.() || scrollViewRef.current,
          (_x, y) => {
            scrollViewRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
            setTimeout(() => {
              if (mode === 'stopLoss' && slInputRef.current) slInputRef.current.focus();
              else if (mode === 'takeProfit' && tpInputRef.current) tpInputRef.current.focus();
            }, 350);
          },
          () => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
            setTimeout(() => {
              if (mode === 'stopLoss' && slInputRef.current) slInputRef.current.focus();
              else if (mode === 'takeProfit' && tpInputRef.current) tpInputRef.current.focus();
            }, 350);
          }
        );
      } else {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        setTimeout(() => {
          if (mode === 'stopLoss' && slInputRef.current) slInputRef.current.focus();
          else if (mode === 'takeProfit' && tpInputRef.current) tpInputRef.current.focus();
        }, 400);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, position?.id, mode]);

  if (!position) return null;

  const isBuy = position.side === 'BUY';
  const sideColor = isBuy ? colors.success : colors.danger;

  const validateRisk = () => {
    const basePrice = position.status === 'pending' ? Number(position.openPrice || position.entryPrice) : Number(currentOrClose);
    const stop = Number(stopLoss);
    const profitTarget = Number(takeProfit);

    if (!Number.isFinite(basePrice) || basePrice <= 0) return 'Price is not available yet.';

    if (stopLoss && (!Number.isFinite(stop) || stop <= 0)) return 'Enter a valid Stop Loss price.';
    if (isBuy) {
      if (stopLoss && stop >= basePrice) return `BUY Stop Loss must be below the ${position.status === 'pending' ? 'entry' : 'live'} price.`;
    } else {
      if (stopLoss && stop <= basePrice) return `SELL Stop Loss must be above the ${position.status === 'pending' ? 'entry' : 'live'} price.`;
    }

    if (takeProfit && (!Number.isFinite(profitTarget) || profitTarget <= 0)) return 'Enter a valid Take Profit price.';
    if (isBuy) {
      if (takeProfit && profitTarget <= basePrice) return `BUY Take Profit must be above the ${position.status === 'pending' ? 'entry' : 'live'} price.`;
    } else {
      if (takeProfit && profitTarget >= basePrice) return `SELL Take Profit must be below the ${position.status === 'pending' ? 'entry' : 'live'} price.`;
    }

    return '';
  };

  const hasRiskChanges = () => (
    Number(stopLoss || 0) !== Number(initialRiskRef.current.stopLoss || 0)
    || Number(takeProfit || 0) !== Number(initialRiskRef.current.takeProfit || 0)
  );

  const startEditingField = (field) => {
    if (!riskEditable || savingRisk) return;
    setEditingFields((current) => ({ ...current, [field]: true }));
  };

  const resetRiskChanges = () => {
    setStopLoss(initialRiskRef.current.stopLoss);
    setTakeProfit(initialRiskRef.current.takeProfit);
    stopEditedRef.current = false;
    profitEditedRef.current = false;
    setEditingFields({ stopLoss: false, takeProfit: false });
    setRiskMessage('');
  };

  const saveRisk = async () => {
    setRiskMessage('');
    if (!hasRiskChanges()) return false;
    const riskError = validateRisk();
    if (riskError) {
      setRiskMessage(riskError);
      notify({ type: 'error', title: 'SL/TP rejected', message: riskError });
      return false;
    }
    setSavingRisk(true);
    try {
      const payload = {};
      if (Number(stopLoss || 0) !== Number(initialRiskRef.current.stopLoss || 0)) payload.stopLoss = stopLoss ? Number(stopLoss) : null;
      if (Number(takeProfit || 0) !== Number(initialRiskRef.current.takeProfit || 0)) payload.takeProfit = takeProfit ? Number(takeProfit) : null;
      const updated = await updatePositionRisk(position.id, payload);
      onRiskUpdated?.(updated || payload);
      setRiskMessage('SL/TP updated.');
      notify({ type: 'success', title: 'Risk updated', message: `${position.side} ${position.symbol} risk levels saved.` });
      initialRiskRef.current = { stopLoss, takeProfit };
      setEditingFields({ stopLoss: false, takeProfit: false });
      return true;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'SL/TP update failed.';
      setRiskMessage(message);
      notify({ type: 'error', title: 'SL/TP rejected', message });
      return false;
    } finally {
      setSavingRisk(false);
    }
  };

  const openTime = position.openedAt || position.createdAt;
  const openTimeFormatted = openTime
    ? new Date(openTime).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : '-';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center p-3" style={{ backgroundColor: overlayBg }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className={`${mobile ? 'max-h-[94%] rounded-xl' : 'max-h-[88%] rounded-xl'} w-full max-w-[420px] overflow-hidden`}
          style={{
            backgroundColor: modalBg,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: darkMode ? 0.5 : 0.15,
            shadowRadius: 24,
            elevation: 20,
            borderWidth: 1,
            borderColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          }}
        >
          {/* ─── Header ─── */}
          <View
            className={`${mobile ? 'px-3 pb-3 pt-3' : 'px-4 pb-3.5 pt-3.5'}`}
            style={{ borderBottomWidth: 1, borderBottomColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
          >
            {/* Top bar */}
            <View className="mb-2.5 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="mr-2 h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${sideColor}15` }}>
                  {isBuy ? <TrendingUp size={14} color={sideColor} /> : <TrendingDown size={14} color={sideColor} />}
                </View>
                <View>
                  <View className="flex-row items-center">
                    <Text className={`${mobile ? 'text-sm' : 'text-base'} mr-2 font-bold`} style={{ color: colors.text }}>{position.symbol}</Text>
                    <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: `${sideColor}18` }}>
                      <Text className="text-[9px] font-bold" style={{ color: sideColor }}>{position.side}</Text>
                    </View>
                  </View>
                  <Text className="mt-0.5 text-[9px] font-medium" style={{ color: colors.muted }}>#{position.id} · {openTimeFormatted}</Text>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                className="h-7 w-7 items-center justify-center rounded-md"
                style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
              >
                <X size={14} color={colors.muted} />
              </Pressable>
            </View>

            {/* Stat cards row */}
            <View className={mobile ? 'flex-row flex-wrap justify-between' : 'flex-row gap-2'}>
              <StatCard
                label="Lots"
                value={`${Number(position.lots).toFixed(2)}`}
                icon={<View className="h-3 w-3 rounded-full" style={{ backgroundColor: sideColor }} />}
                colors={colors}
                darkMode={darkMode}
                mobile={mobile}
              />
              <StatCard
                label="Entry"
                value={quote(position.openPrice, 6)}
                icon={<ChevronRight size={10} color={colors.muted} />}
                colors={colors}
                darkMode={darkMode}
                mobile={mobile}
              />
              <StatCard
                label="P&L"
                value={`${profit >= 0 ? '+' : ''}${money(profit)}`}
                valueColor={profitColor}
                icon={profit >= 0 ? <TrendingUp size={10} color={profitColor} /> : <TrendingDown size={10} color={profitColor} />}
                colors={colors}
                darkMode={darkMode}
                mobile={mobile}
                wide
              />
            </View>
          </View>

          {/* ─── Body ─── */}
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            className={mobile ? 'px-3' : 'px-4'}
            contentContainerStyle={{ paddingBottom: mobile ? 12 : 16 }}
          >
            {/* Position Details */}
            <Section
              title="Position Details"
              icon={<View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />}
              colors={colors}
              darkMode={darkMode}
              mobile={mobile}
            >
              <View className="flex-row flex-wrap gap-2">
                <DetailItem label="Size" value={`${Number(position.lots).toFixed(2)} Lots`} colors={colors} darkMode={darkMode} />
                <DetailItem label="Direction" value={position.side} colors={colors} darkMode={darkMode} />
                <DetailItem label="Margin" value={quote(margin, 5)} colors={colors} darkMode={darkMode} />
                <DetailItem label="Contract" value={String(size)} colors={colors} darkMode={darkMode} />
              </View>
            </Section>

            {/* Price Information */}
            <Section
              title="Price Information"
              icon={<View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />}
              colors={colors}
              darkMode={darkMode}
              mobile={mobile}
            >
              <View className="flex-row flex-wrap gap-2">
                <DetailItem label="Entry Price" value={quote(position.openPrice, 6)} colors={colors} darkMode={darkMode} />
                <DetailItem label="Market Price" value={quote(currentOrClose, 6)} colors={colors} darkMode={darkMode} />
                <DetailItem label="Close Price" value={closePrice ? quote(closePrice, 6) : '-'} colors={colors} darkMode={darkMode} />
                <DetailItem label="Spread" value={quote(position.spread || 0, 0)} colors={colors} darkMode={darkMode} />
                <DetailItem label="Liquidation" value={liquidationPrice === null ? '-' : quote(liquidationPrice, 6)} colors={colors} darkMode={darkMode} accent />
              </View>
            </Section>

            {/* Risk Management */}
            <View ref={riskSectionRef} collapsable={false}>
              <Section
                title="Risk Management"
                icon={<Shield size={12} color={colors.primary} />}
                colors={colors}
                darkMode={darkMode}
                mobile={mobile}
              >
                <View className={mobile ? '' : 'flex-row gap-3'}>
                  <RiskInput
                    inputRef={slInputRef}
                    label="Stop Loss"
                    value={stopLoss}
                    onChangeText={(v) => { stopEditedRef.current = true; setStopLoss(v); }}
                    onEdit={() => startEditingField('stopLoss')}
                    colors={colors}
                    darkMode={darkMode}
                    mobile={mobile}
                    editable={editingFields.stopLoss && !savingRisk}
                    canEdit={riskEditable}
                    highlighted={editingFields.stopLoss}
                  />
                  <RiskInput
                    inputRef={tpInputRef}
                    label="Take Profit"
                    value={takeProfit}
                    onChangeText={(v) => { profitEditedRef.current = true; setTakeProfit(v); }}
                    onEdit={() => startEditingField('takeProfit')}
                    colors={colors}
                    darkMode={darkMode}
                    mobile={mobile}
                    editable={editingFields.takeProfit && !savingRisk}
                    canEdit={riskEditable}
                    highlighted={editingFields.takeProfit}
                  />
                </View>

                {riskMessage ? (
                  <View
                    className="mt-2 rounded-md px-2.5 py-1.5"
                    style={{
                      backgroundColor: (riskMessage.includes('updated') || riskMessage.includes('saved'))
                        ? `${colors.success}12`
                        : `${colors.danger}12`,
                    }}
                  >
                    <Text className="text-xs font-medium" style={{ color: (riskMessage.includes('updated') || riskMessage.includes('saved')) ? colors.success : colors.danger }}>
                      {riskMessage}
                    </Text>
                  </View>
                ) : null}

                {riskEditable && !mobile ? (
                  <Pressable
                    disabled={!hasRiskChanges() || savingRisk}
                    onPress={saveRisk}
                    className="mt-3 h-10 flex-row items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: colors.primary,
                      opacity: (!hasRiskChanges() || savingRisk) ? 0.5 : 1,
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                  >
                    {savingRisk ? (
                      <ActivityIndicator size="small" color="#0B0B0B" />
                    ) : (
                      <>
                        <Shield size={12} color="#0B0B0B" />
                        <Text className="ml-1.5 text-xs font-bold" style={{ color: '#0B0B0B' }}>Save</Text>
                      </>
                    )}
                  </Pressable>
                ) : null}

                {mobile && riskEditable ? (
                  <View className="mt-3 flex-row gap-2">
                    <Pressable
                      disabled={!hasRiskChanges() || savingRisk}
                      onPress={resetRiskChanges}
                      className="h-9 flex-1 flex-row items-center justify-center rounded-lg border"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: colors.control,
                        opacity: (!hasRiskChanges() || savingRisk) ? 0.5 : 1,
                      }}
                    >
                      <Text className="text-xs font-bold" style={{ color: colors.text }}>
                        Cancel changes
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={!hasRiskChanges() || savingRisk}
                      onPress={async () => {
                        const success = await saveRisk();
                        if (success) setEditingFields({ stopLoss: false, takeProfit: false });
                      }}
                      className="h-9 flex-1 flex-row items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: colors.primary,
                        opacity: (!hasRiskChanges() || savingRisk) ? 0.5 : 1,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        elevation: 3,
                      }}
                    >
                      {savingRisk ? (
                        <ActivityIndicator size="small" color="#0B0B0B" />
                      ) : (
                        <>
                          <Shield size={12} color="#0B0B0B" />
                          <Text className="ml-1.5 text-xs font-bold" style={{ color: '#0B0B0B' }}>Save</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : null}
              </Section>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
